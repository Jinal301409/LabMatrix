const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const model = require('../models/user.model');
const service = require('../services/user.service');

const ROLES = ['Admin', 'Faculty', 'Student', 'Technician'];

exports.list = asyncHandler(async (req, res) => {
  const { role, is_active } = req.query;
  if (role && !ROLES.includes(role)) throw new AppError('Unknown role', 400);
  const data = await model.findAll({
    role,
    is_active: is_active === undefined ? undefined : is_active === 'true',
  });
  res.json({ success: true, data });
});

exports.get = asyncHandler(async (req, res) => {
  const row = await model.findById(req.params.id);
  if (!row) throw new AppError('User not found', 404);
  res.json({ success: true, data: row });
});

// dropdown helper: GET /api/users/options/Faculty -> [{ user_id, full_name }]
exports.options = asyncHandler(async (req, res) => {
  const wanted = req.params.role;
  if (!ROLES.includes(wanted)) throw new AppError('Unknown role', 400);
  const open = ['Faculty', 'Technician'];
  if (!open.includes(wanted) && !['Admin', 'Faculty'].includes(req.user.role))
    throw new AppError('You do not have permission', 403);
  res.json({ success: true, data: await model.options(wanted) });
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.create(req.body) });
});

exports.update = asyncHandler(async (req, res) => {
  if (Number(req.params.id) === req.user.user_id && req.body.is_active === false)
    throw new AppError('You cannot deactivate your own account', 400);
  res.json({ success: true, data: await service.update(req.params.id, req.body) });
});

// "Delete" = deactivate (users are referenced by sessions, bookings, fault reports)
exports.deactivate = asyncHandler(async (req, res) => {
  if (Number(req.params.id) === req.user.user_id)
    throw new AppError('You cannot deactivate your own account', 400);
  if (!(await model.findById(req.params.id))) throw new AppError('User not found', 404);
  await model.setActive(req.params.id, false);
  res.json({ success: true, message: 'User deactivated' });
});