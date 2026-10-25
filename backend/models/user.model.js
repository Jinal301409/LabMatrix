const pool = require('../config/db');

const SELECT = `
  SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active, u.created_at,
         s.enrollment_no, s.batch_id,
         COALESCE(f.employee_id, t.employee_id) AS employee_id,
         f.department, f.designation, t.specialization
  FROM app_user u
  LEFT JOIN student    s ON s.user_id = u.user_id
  LEFT JOIN faculty    f ON f.user_id = u.user_id
  LEFT JOIN technician t ON t.user_id = u.user_id`;

exports.findByEmail = async (email) => {
  const [rows] = await pool.execute('SELECT * FROM app_user WHERE email = ?', [email]);
  return rows[0];
};

exports.findById = async (id) => {
  const [rows] = await pool.execute(SELECT + ' WHERE u.user_id = ?', [id]);
  return rows[0];
};

exports.findAll = async ({ role, is_active } = {}) => {
  const where = [];
  const params = [];
  if (role) { where.push('u.role = ?'); params.push(role); }
  if (is_active !== undefined) { where.push('u.is_active = ?'); params.push(is_active ? 1 : 0); }
  const sql = SELECT + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY u.role, u.full_name';
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// id + name only, for dropdowns
exports.options = async (role) => {
  const [rows] = await pool.execute(
    'SELECT user_id, full_name FROM app_user WHERE role = ? AND is_active = TRUE ORDER BY full_name',
    [role]
  );
  return rows;
};

exports.setActive = async (id, active) => {
  await pool.execute('UPDATE app_user SET is_active = ? WHERE user_id = ?', [active ? 1 : 0, id]);
};