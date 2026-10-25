const pool = require('../config/db');

exports.findAll = async () => {
  const [rows] = await pool.query('SELECT * FROM batch ORDER BY semester, batch_name');
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM batch WHERE batch_id = ?', [id]);
  return rows[0];
};

exports.create = async ({ batch_name, branch, semester }) => {
  const [r] = await pool.execute(
    'INSERT INTO batch (batch_name, branch, semester) VALUES (?, ?, ?)',
    [batch_name, branch, semester]
  );
  return r.insertId;
};

exports.update = async (id, { batch_name, branch, semester }) => {
  await pool.execute(
    'UPDATE batch SET batch_name = ?, branch = ?, semester = ? WHERE batch_id = ?',
    [batch_name, branch, semester, id]
  );
};

exports.remove = async (id) => {
  await pool.execute('DELETE FROM batch WHERE batch_id = ?', [id]);
};