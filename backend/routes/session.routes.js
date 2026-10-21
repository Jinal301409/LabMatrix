const { z } = require('zod');
const makeResource = require('../utils/crudFactory');
const { date, time, toSeconds } = require('../utils/fields');

const schema = z.object({
  lab_id: z.number().int().positive(),
  faculty_id: z.number().int().positive().optional(), // Faculty: always themselves. Admin: must choose.
  course_id: z.number().int().positive(),
  batch_id: z.number().int().positive(),
  session_date: date,
  start_time: time,
  end_time: time,
  topic: z.string().trim().max(150).optional(),
}).refine((d) => toSeconds(d.end_time) > toSeconds(d.start_time), {
  message: 'end_time must be after start_time', path: ['end_time'],
});

const STATUSES = ['Present', 'Absent', 'Late'];

module.exports = makeResource({
  name: 'Session', table: 'lab_session', alias: 'ls', keys: ['session_id'],
  columns: `ls.*, l.lab_name, co.course_code, b.batch_name, u.full_name AS faculty_name`,
  from: `lab_session ls
         JOIN lab l ON l.lab_id = ls.lab_id
         JOIN course co ON co.course_id = ls.course_id
         JOIN batch b ON b.batch_id = ls.batch_id
         JOIN app_user u ON u.user_id = ls.faculty_id`,
  orderBy: 'ls.session_date DESC, ls.start_time',
  search: ['ls.topic', 'co.course_code', 'l.lab_name', 'b.batch_name'],
  filters: { lab_id: 'ls.lab_id', batch_id: 'ls.batch_id', course_id: 'ls.course_id', faculty_id: 'ls.faculty_id' },
  fields: ['lab_id', 'faculty_id', 'course_id', 'batch_id', 'session_date', 'start_time', 'end_time', 'topic'],
  nullable: ['topic'],
  write: ['Admin', 'Faculty'],

  // a student only sees the sessions of their own batch
  scope: (req) => req.user.role === 'Student'
    ? { sql: 'ls.batch_id = (SELECT batch_id FROM student WHERE user_id = ?)', params: [req.user.user_id] }
    : null,

  // faculty can only change their own sessions
  canModify: (req, row) => req.user.role === 'Admin' || row.faculty_id === req.user.user_id,

  beforeCreate: (req, body) => {
    if (req.user.role === 'Faculty') body.faculty_id = req.user.user_id;
    else if (!body.faculty_id) throw new (require('../utils/AppError'))('faculty_id: choose the faculty member', 400);
    return body;
  },
  beforeUpdate: (req, body, row) => {
    body.faculty_id = req.user.role === 'Faculty' ? row.faculty_id : (body.faculty_id || row.faculty_id);
    return body;
  },

  // ---- attendance for one session ----
  extraRoutes: (router, h) => {
    const { pool, asyncHandler, AppError, role } = h;

    // the session must exist, and a faculty member may only open their own
    const sessionFor = async (req) => {
      const s = await h.getRow(req, req.params.id);
      if (!s) throw new AppError('Session not found', 404);
      if (req.user.role === 'Faculty' && s.faculty_id !== req.user.user_id) {
        throw new AppError('This is not your session', 403);
      }
      return s;
    };

    // everyone in the session's batch, with the status already saved (or Present by default)
    router.get('/:id/attendance', role('Admin', 'Faculty'), asyncHandler(async (req, res) => {
      const s = await sessionFor(req);
      const [rows] = await pool.query(
        `SELECT st.user_id AS student_id, st.enrollment_no, u.full_name,
                COALESCE(a.status, 'Present') AS status, (a.student_id IS NOT NULL) AS marked
         FROM student st
         JOIN app_user u ON u.user_id = st.user_id
         LEFT JOIN attendance a ON a.student_id = st.user_id AND a.session_id = ?
         WHERE st.batch_id = ?
         ORDER BY st.enrollment_no`,
        [s.session_id, s.batch_id]
      );
      res.json({ success: true, data: rows });
    }));

    // save the whole list in one go: all students saved, or none
    router.put('/:id/attendance', role('Admin', 'Faculty'), asyncHandler(async (req, res) => {
      const s = await sessionFor(req);
      const rows = req.body && req.body.rows;
      if (!Array.isArray(rows) || !rows.length) throw new AppError('rows: send the list of students', 400);

      const [roster] = await pool.query('SELECT user_id FROM student WHERE batch_id = ?', [s.batch_id]);
      const allowed = new Set(roster.map((r) => r.user_id));
      for (const r of rows) {
        if (!allowed.has(Number(r.student_id))) throw new AppError(`Student ${r.student_id} is not in this batch`, 400);
        if (!STATUSES.includes(r.status)) throw new AppError('status must be Present, Absent or Late', 400);
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(
          `INSERT INTO attendance (student_id, session_id, status) VALUES ?
           ON DUPLICATE KEY UPDATE status = VALUES(status), marked_at = CURRENT_TIMESTAMP`,
          [rows.map((r) => [Number(r.student_id), s.session_id, r.status])]
        );
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
      res.json({ success: true, message: `Attendance saved for ${rows.length} students` });
    }));
  },
  schema,
});
