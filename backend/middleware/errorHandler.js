module.exports = (err, req, res, next) => {
  let status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  let message = err.message || 'Internal server error';

  if (err.sqlState === '45000') {               // trigger / procedure messages
    status = 400; message = err.sqlMessage;
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409; message = 'A record with this value already exists';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400; message = 'A referenced record does not exist';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409; message = 'Cannot delete: this record is in use';
  } else if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    status = 400; message = 'A value violates a data rule';
  } else if (err.type === 'entity.parse.failed') {
    status = 400; message = 'Request body is not valid JSON';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message });
};