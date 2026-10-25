const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// whitelist, so the URL can never inject SQL
const VIEWS = {
  lab_health: 'v_lab_health',
  expiring_licenses: 'v_expiring_licenses',
  lab_usage: 'v_lab_usage',
  student_attendance: 'v_student_attendance',
  frequent_maintenance: 'v_frequent_maintenance',
};

// reports that need a staff role (the others are open to every logged-in user)
const RESTRICTED = {
  student_attendance: ['Admin', 'Faculty'],
  frequent_maintenance: ['Admin', 'Technician'],
};

router.get('/:name', auth, asyncHandler(async (req, res) => {
  const view = VIEWS[req.params.name];
  if (!view) throw new AppError('Unknown report', 404);
  const allowed = RESTRICTED[req.params.name];
  if (allowed && !allowed.includes(req.user.role)) throw new AppError('You do not have permission', 403);
  const [rows] = await pool.query(`SELECT * FROM ${view}`);
  res.json({ success: true, data: rows });
}));

module.exports = router;