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
router.use('/labs', require('./lab.routes'));
router.use('/computers', require('./computer.routes'));
router.use('/equipment', require('./equipment.routes'));
router.use('/software', require('./software.routes'));
router.use('/installs', require('./install.routes'));
router.use('/sessions', require('./session.routes'));
router.use('/bookings', require('./booking.routes'));
router.use('/requests', require('./request.routes'));
router.use('/maintenance', require('./maintenance.routes'));
router.use('/options', require('./options.routes'));

module.exports = router;