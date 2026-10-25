const pool = require('../config/db');

exports.findAll = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM course ORDER BY semester, course_code'
  );
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT * FROM course WHERE course_id = ?',
    [id]
  );
  return rows[0];
};

exports.create = async ({ course_code, course_name, semester, credits }) => {
  const [r] = await pool.execute(
    'INSERT INTO course (course_code, course_name, semester, credits) VALUES (?, ?, ?, ?)',
    [course_code, course_name, semester, credits]
  );
  return r.insertId;
};

exports.update = async (id, { course_code, course_name, semester, credits }) => {
  await pool.execute(
    'UPDATE course SET course_code = ?, course_name = ?, semester = ?, credits = ? WHERE course_id = ?',
    [course_code, course_name, semester, credits, id]
  );
};

exports.remove = async (id) => {
  await pool.execute('DELETE FROM course WHERE course_id = ?', [id]);
};