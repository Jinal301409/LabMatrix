const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/querylab.service');

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });

exports.tables = asyncHandler(async (req, res) => send(res, await svc.tables()));
exports.display = asyncHandler(async (req, res) =>
  send(res, await svc.display(req.params.name, req.query.page, req.query.limit)));
exports.insert = asyncHandler(async (req, res) =>
  send(res, await svc.insert(req.params.name, req.body.values || {}), 201));
exports.aggregate = asyncHandler(async (req, res) => send(res, await svc.aggregate(req.query)));
exports.filter = asyncHandler(async (req, res) => send(res, await svc.filter(req.query)));
exports.presets = asyncHandler(async (req, res) => send(res, await svc.presets()));
exports.runPreset = asyncHandler(async (req, res) =>
  send(res, await svc.runPreset(req.params.id, req.query.param)));
exports.update = asyncHandler(async (req, res) => send(res, await svc.update(req.body)));
exports.joinPairs = asyncHandler(async (req, res) => send(res, await svc.joinPairs()));
exports.join = asyncHandler(async (req, res) => send(res, await svc.join(req.query)));
exports.stats = asyncHandler(async (req, res) => send(res, await svc.stats()));
