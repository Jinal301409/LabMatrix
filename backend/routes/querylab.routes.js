const router = require('express').Router();
const c = require('../controllers/querylab.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.use(auth);

// dashboard numbers are safe for every logged-in user
router.get('/stats', c.stats);

// the rest is a database tool, so Admin only
router.use(role('Admin'));
router.get('/tables', c.tables);
router.get('/table/:name', c.display);              // Q1
router.post('/insert/:name', c.insert);             // Q2
router.get('/aggregate', c.aggregate);              // Q3
router.get('/filter', c.filter);                    // Q4
router.get('/join-pairs', c.joinPairs);             // Q5 (dropdown data)
router.get('/join', c.join);                        // Q5
router.get('/presets', c.presets);                  // Q6 and Q7 (dropdown data)
router.get('/presets/:id/run', c.runPreset);        // Q6 and Q7
router.put('/update', c.update);                    // Q8

module.exports = router;
