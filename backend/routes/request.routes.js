const { z } = require('zod');
const makeResource = require('../utils/crudFactory');
const pool = require('../config/db');

const schema = z.object({
  computer_id: z.number().int().positive().optional(),
  equipment_id: z.number().int().positive().optional(),
  description: z.string().trim().min(1).max(500),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.enum(['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed']).optional(),
}).refine((d) => (d.computer_id ? 1 : 0) + (d.equipment_id ? 1 : 0) === 1, {
  message: 'choose a computer OR an equipment item, not both and not neither', path: ['computer_id'],
});

const isStaff = (req) => ['Admin', 'Technician'].includes(req.user.role);

module.exports = makeResource({
  name: 'Fault report', table: 'maintenance_request', alias: 'r', keys: ['request_id'],
  columns: `r.*, c.asset_number AS computer_asset, e.asset_number AS equipment_asset, u.full_name AS reported_by_name`,
  from: `maintenance_request r
         LEFT JOIN computer c ON c.computer_id = r.computer_id
         LEFT JOIN equipment e ON e.equipment_id = r.equipment_id
         JOIN app_user u ON u.user_id = r.reported_by`,
  orderBy: 'r.request_id DESC',
  search: ['r.description', 'c.asset_number', 'e.asset_number', 'u.full_name'],
  filters: { status: 'r.status', priority: 'r.priority' },
  fields: ['computer_id', 'equipment_id', 'reported_by', 'description', 'priority', 'status'],
  nullable: ['computer_id', 'equipment_id'],
  write: ['Admin', 'Faculty', 'Student', 'Technician'],

  // everyone can report a fault, but sees only their own reports. Admin and Technician see all.
  scope: (req) => isStaff(req) ? null : { sql: 'r.reported_by = ?', params: [req.user.user_id] },

  // staff change anything; a reporter may only fix their own report while it is still Open
  canModify: (req, row) => isStaff(req) || (row.reported_by === req.user.user_id && row.status === 'Open'),

  beforeCreate: (req, body) => {
    body.reported_by = req.user.user_id;
    if (!isStaff(req)) body.status = 'Open';
    return body;
  },
  beforeUpdate: (req, body, row) => {
    body.reported_by = row.reported_by;
    if (!isStaff(req)) body.status = row.status;
    return body;
  },

  // deleting an open report must put the computer / equipment back to Working
  // (the database triggers only react to inserts and updates)
  afterDelete: async (req, row) => {
    for (const [table, idCol, id] of [['computer', 'computer_id', row.computer_id], ['equipment', 'equipment_id', row.equipment_id]]) {
      if (!id) continue;
      const [[{ n }]] = await pool.query(
        `SELECT COUNT(*) AS n FROM maintenance_request WHERE ${idCol} = ? AND status NOT IN ('Resolved', 'Closed')`, [id]);
      if (!n) await pool.query(`UPDATE ${table} SET status = 'Working' WHERE ${idCol} = ? AND status = 'Under Maintenance'`, [id]);
    }
  },
  schema,
});
