// Small reusable validation pieces (zod) shared by the module files.
const { z } = require('zod');

exports.date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use the format YYYY-MM-DD');
exports.time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'use the format HH:MM');
exports.datetime = z.string().regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/, 'use a date and time');
exports.STATUS = ['Working', 'Under Maintenance', 'Retired'];

// "09:00" and "09:00:00" -> seconds, so times can be compared
exports.toSeconds = (t) => {
  const [h, m, s] = String(t).split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
};
// today as YYYY-MM-DD in the server's own time zone
exports.today = () => new Date().toLocaleDateString('en-CA');
