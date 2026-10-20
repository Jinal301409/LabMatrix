const router = require('express').Router();

// ---- Teammate A ----
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/batches', require('./batch.routes'));
router.use('/courses', require('./course.routes'));
router.use('/views', require('./views.routes'));

// ---- Query Lab (lab assignment parts D and E) ----
router.use('/querylab', require('./querylab.routes'));

// ---- Teammate B: add ONE line per module below ----
// router.use('/labs', require('./lab.routes'));

module.exports = router;