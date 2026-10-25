const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const model = require('../models/batch.model');

exports.list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await model.findAll() });
});

exports.get = asyncHandler(async (req, res) => {
  const row = await model.findById(req.params.id);
  if (!row) throw new AppError('Batch not found', 404);
  res.json({ success: true, data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const id = await model.create(req.body);
  res.status(201).json({ success: true, data: await model.findById(id) });
});

exports.update = asyncHandler(async (req, res) => {
  if (!(await model.findById(req.params.id))) throw new AppError('Batch not found', 404);
  await model.update(req.params.id, req.body);
  res.json({ success: true, data: await model.findById(req.params.id) });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!(await model.findById(req.params.id))) throw new AppError('Batch not found', 404);
  await model.remove(req.params.id);   // FK RESTRICT error is turned into a 409 by errorHandler
  res.json({ success: true, message: 'Batch deleted' });
});