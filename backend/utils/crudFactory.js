// A reusable "list / get / create / update / delete" router, so each module
// (labs, computers, bookings ...) only has to describe itself instead of
// repeating the same model + controller + routes code ten times.
//
// How a request flows:  route -> auth -> role -> stripEmpty -> validate -> handler -> SQL
//
// Safety: every value goes through "?" placeholders. Table and column names
// only ever come from the config objects written in the module files, never
// from the request, so nothing typed by a user can change the SQL.
const { Router } = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');
const stripEmpty = require('../middleware/stripEmpty');
const asyncHandler = require('./asyncHandler');
const AppError = require('./AppError');

const clamp = (v, min, max, dflt) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? dflt : Math.min(Math.max(n, min), max);
};

module.exports = function makeResource(cfg) {
  const keys = cfg.keys; // primary key column(s), e.g. ['lab_id'] or ['computer_id', 'software_id']
  const q = (name) => '`' + name + '`';
  const router = Router();

  // ---- helpers ----
  const parseId = (id) => {
    const parts = String(id).split('-');
    if (parts.length !== keys.length || parts.some((p) => !/^\d+$/.test(p))) {
      throw new AppError(`${cfg.name} not found`, 404);
    }
    return parts.map(Number);
  };

  // one row, with the same joins as the list, respecting the row-level scope
  const getRow = async (req, id) => {
    const parts = parseId(id);
    const where = keys.map((k) => `${cfg.alias}.${q(k)} = ?`);
    const params = [...parts];
    const scope = cfg.scope ? cfg.scope(req) : null;
    if (scope) { where.push(scope.sql); params.push(...scope.params); }
    const [rows] = await pool.query(`SELECT ${cfg.columns} FROM ${cfg.from} WHERE ${where.join(' AND ')} LIMIT 1`, params);
    return rows[0];
  };
  const mustGet = async (req, id) => {
    const row = await getRow(req, id);
    if (!row) throw new AppError(`${cfg.name} not found`, 404);
    return row;
  };
  const mayChange = async (req, row, action) => {
    if (cfg.canModify && !(await cfg.canModify(req, row, action))) {
      throw new AppError('You cannot change this record', 403);
    }
  };

  // Some modules (bookings, sessions) must not save two clashing rows when two people
  // press Save at the same moment. cfg.lock(body) lists the rows to lock first, always in
  // the same order, e.g. [['lab', 'lab_id', 3]]. The database trigger then does the overlap
  // check while nobody else can save for that lab. Modules without cfg.lock are unaffected.
  const write = async (sql, params, body) => {
    const locks = cfg.lock ? cfg.lock(body).filter(([, , id]) => id) : [];
    if (!locks.length) return pool.query(sql, params);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const [table, col, id] of locks) {
        await conn.query(`SELECT ${q(col)} FROM ${q(table)} WHERE ${q(col)} = ? FOR UPDATE`, [id]);
      }
      const result = await conn.query(sql, params);
      await conn.commit();
      return result;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  };

  // ---- handlers ----
  const list = asyncHandler(async (req, res) => {
    const page = clamp(req.query.page, 1, 1000000, 1);
    const limit = clamp(req.query.limit, 1, 200, 50);
    const where = [];
    const params = [];

    const scope = cfg.scope ? cfg.scope(req) : null;
    if (scope) { where.push(scope.sql); params.push(...scope.params); }

    for (const [param, column] of Object.entries(cfg.filters || {})) {
      const v = req.query[param];
      if (v !== undefined && v !== '') { where.push(`${column} = ?`); params.push(v); }
    }
    const text = String(req.query.q || '').trim();
    if (text && cfg.search && cfg.search.length) {
      where.push('(' + cfg.search.map((c) => `${c} LIKE ?`).join(' OR ') + ')');
      params.push(...cfg.search.map(() => `%${text}%`));
    }
    const w = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const [rows] = await pool.query(
      `SELECT ${cfg.columns} FROM ${cfg.from}${w} ORDER BY ${cfg.orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${cfg.from}${w}`, params);
    res.json({ success: true, data: rows, meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } });
  });

  const get = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await mustGet(req, req.params.id) });
  });

  const create = asyncHandler(async (req, res) => {
    let body = { ...req.body };
    if (cfg.beforeCreate) body = (await cfg.beforeCreate(req, body)) || body;
    const cols = cfg.fields.filter((f) => body[f] !== undefined && body[f] !== null);
    if (!cols.length) throw new AppError('Nothing to save', 400);
    const [r] = await write(
      `INSERT INTO ${q(cfg.table)} (${cols.map(q).join(', ')}) VALUES (?)`,
      [cols.map((c) => body[c])],
      body
    );
    const id = keys.length === 1 ? r.insertId : keys.map((k) => body[k]).join('-');
    if (cfg.afterCreate) await cfg.afterCreate(req, id, body);
    res.status(201).json({ success: true, data: (await getRow(req, id)) || { id } });
  });

  const update = asyncHandler(async (req, res) => {
    const parts = parseId(req.params.id);
    const row = await mustGet(req, req.params.id);
    await mayChange(req, row, 'update');
    let body = { ...req.body };
    if (cfg.beforeUpdate) body = (await cfg.beforeUpdate(req, body, row)) || body;

    const sets = [];
    const params = [];
    for (const f of cfg.fields) {
      if (body[f] !== undefined && body[f] !== null) { sets.push(`${q(f)} = ?`); params.push(body[f]); }
      else if ((cfg.nullable || []).includes(f)) sets.push(`${q(f)} = NULL`); // a cleared optional field
    }
    if (!sets.length) throw new AppError('Nothing to change', 400);
    await write(
      `UPDATE ${q(cfg.table)} SET ${sets.join(', ')} WHERE ${keys.map((k) => `${q(k)} = ?`).join(' AND ')}`,
      [...params, ...parts],
      body
    );
    const newId = keys.length === 1 ? req.params.id : keys.map((k, i) => body[k] ?? parts[i]).join('-');
    if (cfg.afterUpdate) await cfg.afterUpdate(req, newId, body, row);
    res.json({ success: true, data: await getRow(req, newId) });
  });

  const remove = asyncHandler(async (req, res) => {
    const parts = parseId(req.params.id);
    const row = await mustGet(req, req.params.id);
    await mayChange(req, row, 'delete');
    await pool.query(`DELETE FROM ${q(cfg.table)} WHERE ${keys.map((k) => `${q(k)} = ?`).join(' AND ')}`, parts);
    if (cfg.afterDelete) await cfg.afterDelete(req, row);
    res.json({ success: true, message: `${cfg.name} deleted` });
  });

  // ---- routes (order matters: custom routes first, then the generic ones) ----
  router.use(auth);
  if (cfg.extraRoutes) cfg.extraRoutes(router, { getRow, mustGet, pool, asyncHandler, AppError, role, stripEmpty, validate });

  const readGuard = cfg.read ? [role(...cfg.read)] : [];
  const writeGuard = role(...cfg.write);
  router.get('/', ...readGuard, list);
  router.get('/:id', ...readGuard, get);
  router.post('/', writeGuard, stripEmpty, validate(cfg.schema), create);
  router.put('/:id', writeGuard, stripEmpty, validate(cfg.updateSchema || cfg.schema), update);
  router.delete('/:id', writeGuard, remove);

  return router;
};
