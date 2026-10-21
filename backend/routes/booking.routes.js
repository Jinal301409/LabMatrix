const { z } = require('zod');
const makeResource = require('../utils/crudFactory');
const AppError = require('../utils/AppError');
const { datetime } = require('../utils/fields');

const schema = z.object({
  lab_id: z.number().int().positive(),
  faculty_id: z.number().int().positive().optional(), // Faculty: always themselves. Admin: must choose.
  start_datetime: datetime,
  end_datetime: datetime,
  purpose: z.string().trim().min(1).max(200),
}).refine((d) => d.end_datetime.replace('T', ' ') > d.start_datetime.replace('T', ' '), {
  message: 'end_datetime must be after start_datetime', path: ['end_datetime'],
});

module.exports = makeResource({
  name: 'Booking', table: 'lab_booking', alias: 'b', keys: ['booking_id'],
  columns: 'b.*, l.lab_name, u.full_name AS faculty_name',
  from: 'lab_booking b JOIN lab l ON l.lab_id = b.lab_id JOIN app_user u ON u.user_id = b.faculty_id',
  orderBy: 'b.start_datetime DESC',
  search: ['b.purpose', 'l.lab_name', 'u.full_name'],
  filters: { status: 'b.status', lab_id: 'b.lab_id' },
  fields: ['lab_id', 'faculty_id', 'start_datetime', 'end_datetime', 'purpose'],
  read: ['Admin', 'Faculty'],
  write: ['Admin', 'Faculty'],

  // a faculty member only sees their own bookings
  scope: (req) => req.user.role === 'Faculty' ? { sql: 'b.faculty_id = ?', params: [req.user.user_id] } : null,

  // owner may edit a Pending booking, or delete one that is not approved. Admin may do both.
  canModify: (req, row, action) => {
    if (req.user.role === 'Admin') return true;
    if (row.faculty_id !== req.user.user_id) return false;
    return action === 'update' ? row.status === 'Pending' : row.status !== 'Approved';
  },

  // a new booking always starts as Pending: nobody can approve their own request
  beforeCreate: (req, body) => {
    if (req.user.role === 'Faculty') body.faculty_id = req.user.user_id;
    else if (!body.faculty_id) throw new AppError('faculty_id: choose the faculty member', 400);
    return body;
  },
  beforeUpdate: (req, body, row) => {
    body.faculty_id = req.user.role === 'Faculty' ? row.faculty_id : (body.faculty_id || row.faculty_id);
    return body;
  },

  extraRoutes: (router, h) => {
    const { pool, asyncHandler, role, stripEmpty } = h;

    // Approve: the database procedure checks "admin, pending, no overlap" inside one locked transaction.
    router.post('/:id/approve', role('Admin'), asyncHandler(async (req, res) => {
      const row = await h.mustGet(req, req.params.id);
      await pool.query('CALL approve_booking(?, ?)', [row.booking_id, req.user.user_id]);
      res.json({ success: true, data: await h.getRow(req, req.params.id) });
    }));

    // Reject / Cancel send only { status }. Anything else falls through to the normal update.
    router.put('/:id', role('Admin', 'Faculty'), stripEmpty, asyncHandler(async (req, res, next) => {
      const keys = Object.keys(req.body || {});
      if (!(keys.length === 1 && keys[0] === 'status')) return next();

      const row = await h.mustGet(req, req.params.id);
      const to = req.body.status;
      const isAdmin = req.user.role === 'Admin';
      if (to === 'Rejected') {
        if (!isAdmin) throw new AppError('Only an Admin can reject a booking', 403);
        if (row.status !== 'Pending') throw new AppError('Only a Pending booking can be rejected', 400);
      } else if (to === 'Cancelled') {
        if (!isAdmin && row.faculty_id !== req.user.user_id) throw new AppError('You cannot cancel this booking', 403);
        if (!['Pending', 'Approved'].includes(row.status)) throw new AppError('This booking is already closed', 400);
      } else {
        throw new AppError('Use the Approve button to approve a booking', 400);
      }
      await pool.query(
        'UPDATE lab_booking SET status = ?, approved_by = IF(? = \'Rejected\', ?, approved_by) WHERE booking_id = ?',
        [to, to, req.user.user_id, row.booking_id]
      );
      res.json({ success: true, data: await h.getRow(req, req.params.id) });
    }));
  },
  schema,
});
