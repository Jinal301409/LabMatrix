const bcrypt = require('bcrypt');
const pool = require('../config/db');
const userModel = require('../models/user.model');
const authService = require('./auth.service');
const AppError = require('../utils/AppError');

exports.create = async (data) => {
  const created = await authService.register(data);   // app_user + subtype in one transaction
  return userModel.findById(created.user_id);
};

// only the fields that were sent are changed (COALESCE keeps the old value)
exports.update = async (id, d) => {
  const current = await userModel.findById(id);
  if (!current) throw new AppError('User not found', 404);
  if (d.role && d.role !== current.role) throw new AppError("A user's role cannot be changed", 400);

  const hash = d.password ? await bcrypt.hash(d.password, 10) : null;
  const n = (v) => (v === undefined ? null : v);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE app_user SET
         full_name     = COALESCE(?, full_name),
         email         = COALESCE(?, email),
         phone         = COALESCE(?, phone),
         password_hash = COALESCE(?, password_hash),
         is_active     = COALESCE(?, is_active)
       WHERE user_id = ?`,
      [n(d.full_name), n(d.email), n(d.phone), hash,
       d.is_active === undefined ? null : (d.is_active ? 1 : 0), id]
    );

    if (current.role === 'Student') {
      await conn.execute(
        `UPDATE student SET enrollment_no = COALESCE(?, enrollment_no), batch_id = COALESCE(?, batch_id)
         WHERE user_id = ?`,
        [n(d.enrollment_no), n(d.batch_id), id]
      );
    } else if (current.role === 'Faculty') {
      await conn.execute(
        `UPDATE faculty SET employee_id = COALESCE(?, employee_id),
                            department  = COALESCE(?, department),
                            designation = COALESCE(?, designation)
         WHERE user_id = ?`,
        [n(d.employee_id), n(d.department), n(d.designation), id]
      );
    } else if (current.role === 'Technician') {
      await conn.execute(
        `UPDATE technician SET employee_id    = COALESCE(?, employee_id),
                               specialization = COALESCE(?, specialization)
         WHERE user_id = ?`,
        [n(d.employee_id), n(d.specialization), id]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return userModel.findById(id);
};