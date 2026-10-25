const router = require('express').Router();
const c = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');
const stripEmpty = require('../middleware/stripEmpty');
const { registerSchema, updateSchema } = require('../validators/user.schema');

router.get('/options/:role', auth, c.options);       // keep ABOVE '/:id'

router.get('/', auth, role('Admin'), c.list);
router.get('/:id', auth, role('Admin'), c.get);
router.post('/', auth, role('Admin'), stripEmpty, validate(registerSchema), c.create);
router.put('/:id', auth, role('Admin'), stripEmpty, validate(updateSchema), c.update);
router.delete('/:id', auth, role('Admin'), c.deactivate);

module.exports = router;