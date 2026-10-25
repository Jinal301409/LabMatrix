// Dropdown data for the forms: GET /api/options/labs -> [{ value, label }]
// Only small lists live here. Computers (thousands) are typed by id or asset number instead.
const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const OPTIONS = {
  labs: { sql: 'SELECT lab_id AS value, lab_name AS label FROM lab ORDER BY lab_name' },
  faculty: {
    sql: `SELECT f.user_id AS value, u.full_name AS label FROM faculty f
          JOIN app_user u ON u.user_id = f.user_id WHERE u.is_active = TRUE ORDER BY u.full_name`,
  },
  technicians: {
    sql: `SELECT t.user_id AS value, u.full_name AS label FROM technician t
          JOIN app_user u ON u.user_id = t.user_id WHERE u.is_active = TRUE ORDER BY u.full_name`,
  },
  courses: { sql: "SELECT course_id AS value, CONCAT(course_code, ' - ', course_name) AS label FROM course ORDER BY course_code" },
  batches: { sql: 'SELECT batch_id AS value, batch_name AS label FROM batch ORDER BY batch_name' },
  software: { sql: "SELECT software_id AS value, CONCAT(software_name, ' ', version) AS label FROM software ORDER BY software_name, version" },
  // open fault reports, for assigning a repair job (staff only)
  requests: {
    roles: ['Admin', 'Technician'],
    sql: `SELECT r.request_id AS value,
                 CONCAT('#', r.request_id, ' ', COALESCE(c.asset_number, e.asset_number), ': ', LEFT(r.description, 40)) AS label
          FROM maintenance_request r
          LEFT JOIN computer c ON c.computer_id = r.computer_id
          LEFT JOIN equipment e ON e.equipment_id = r.equipment_id
          WHERE r.status IN ('Open', 'Assigned', 'In Progress')
          ORDER BY r.request_id DESC LIMIT 300`,
  },
};

router.get('/:name', auth, asyncHandler(async (req, res) => {
  const opt = OPTIONS[req.params.name];
  if (!opt) throw new AppError('Unknown list', 404);
  if (opt.roles && !opt.roles.includes(req.user.role)) throw new AppError('You do not have permission', 403);
  const [rows] = await pool.query(opt.sql);
  res.json({ success: true, data: rows });
}));

module.exports = router;
