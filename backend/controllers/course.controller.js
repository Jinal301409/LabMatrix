const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const model = require('../models/course.model');

exports.list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await model.findAll() });
});

exports.get = asyncHandler(async (req, res) => {
  const row = await model.findById(req.params.id);
  if (!row) throw new AppError('Course not found', 404);
  res.json({ success: true, data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const id = await model.create(req.body);
  res.status(201).json({ success: true, data: await model.findById(id) });
});

exports.update = asyncHandler(async (req, res) => {
  if (!(await model.findById(req.params.id)))
    throw new AppError('Course not found', 404);
  await model.update(req.params.id, req.body);
  res.json({ success: true, data: await model.findById(req.params.id) });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!(await model.findById(req.params.id)))
    throw new AppError('Course not found', 404);
  await model.remove(req.params.id); // FK RESTRICT error becomes 409 via errorHandler
  res.json({ success: true, message: 'Course deleted' });
});