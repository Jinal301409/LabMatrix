// React forms send "" or null for blank optional fields; Zod .optional() rejects null.
// Use BEFORE validate():  router.post('/', stripEmpty, validate(schema), ...)
module.exports = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = Object.fromEntries(
      Object.entries(req.body).filter(([, v]) => v !== null && v !== '')
    );
  }
  next();
};