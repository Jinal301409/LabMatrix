const router = require('express').Router();
const { z } = require('zod');
const c = require('../controllers/course.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');

const schema = z.object({
  course_code: z.string().trim().min(1).max(15),
  course_name: z.string().trim().min(1).max(100),
  semester: z.number().int().min(1).max(8),
  credits: z.number().int().min(1).default(3),
});

router.get('/', auth, c.list);
router.get('/:id', auth, c.get);
router.post('/', auth, role('Admin'), validate(schema), c.create);
router.put('/:id', auth, role('Admin'), validate(schema), c.update);
router.delete('/:id', auth, role('Admin'), c.remove);

module.exports = router;