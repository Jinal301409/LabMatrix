const router = require('express').Router();
const { z } = require('zod');
const c = require('../controllers/batch.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');

const schema = z.object({
  batch_name: z.string().trim().min(1).max(30),
  branch: z.string().trim().min(1).max(50),
  semester: z.number().int().min(1).max(8),
});

router.get('/', auth, c.list);
router.get('/:id', auth, c.get);
router.post('/', auth, role('Admin'), validate(schema), c.create);
router.put('/:id', auth, role('Admin'), validate(schema), c.update);
router.delete('/:id', auth, role('Admin'), c.remove);

module.exports = router;