const { z } = require('zod');
const makeResource = require('../utils/crudFactory');
const AppError = require('../utils/AppError');
const pool = require('../config/db');
const { date, today } = require('../utils/fields');

const schema = z.object({
  request_id: z.number().int().positive(),
  technician_id: z.number().int().positive().optional(), // Technician: always themselves. Admin: must choose.
  start_date: date,
  end_date: date.optional(),
  cost: z.number().min(0).optional(),
  status: z.enum(['Assigned', 'In Progress', 'Completed']).optional(),
  remarks: z.string().trim().max(300).optional(),
}).refine((d) => !d.end_date || d.end_date >= d.start_date, {
  message: 'end_date cannot be before start_date', path: ['end_date'],
});

// Keep the fault report's status in step with its repair job:
//   job Assigned -> report Assigned, job In Progress -> report In Progress, job Completed -> report Resolved.
// When a report becomes Resolved, the database trigger puts the computer back to Working.
const syncRequest = async (requestId, jobStatus) => {
  if (jobStatus === 'Completed') {
    await pool.query("UPDATE maintenance_request SET status = 'Resolved' WHERE request_id = ? AND status NOT IN ('Resolved', 'Closed')", [requestId]);
  } else if (jobStatus === 'In Progress') {
    await pool.query("UPDATE maintenance_request SET status = 'In Progress' WHERE request_id = ? AND status IN ('Open', 'Assigned')", [requestId]);
  } else {
    await pool.query("UPDATE maintenance_request SET status = 'Assigned' WHERE request_id = ? AND status = 'Open'", [requestId]);
  }
};

// a finished job needs an end date: use today when none was given
const finish = (body, startDate) => {
  if (body.status === 'Completed' && !body.end_date) {
    const t = today();
    body.end_date = t >= startDate ? t : startDate;
  }
  return body;
};

module.exports = makeResource({
  name: 'Repair job', table: 'maintenance', alias: 'm', keys: ['maintenance_id'],
  columns: `m.*, r.description AS request_description, u.full_name AS technician_name,
            COALESCE(c.asset_number, e.asset_number) AS asset`,
  from: `maintenance m
         JOIN maintenance_request r ON r.request_id = m.request_id
         JOIN app_user u ON u.user_id = m.technician_id
         LEFT JOIN computer c ON c.computer_id = r.computer_id
         LEFT JOIN equipment e ON e.equipment_id = r.equipment_id`,
  orderBy: 'm.maintenance_id DESC',
  search: ['r.description', 'u.full_name', 'c.asset_number', 'e.asset_number'],
  filters: { status: 'm.status', request_id: 'm.request_id', technician_id: 'm.technician_id' },
  fields: ['request_id', 'technician_id', 'start_date', 'end_date', 'cost', 'status', 'remarks'],
  nullable: ['end_date', 'remarks'],
  read: ['Admin', 'Technician'],
  write: ['Admin', 'Technician'],

  // a technician sees and edits only their own jobs
  scope: (req) => req.user.role === 'Technician' ? { sql: 'm.technician_id = ?', params: [req.user.user_id] } : null,
  canModify: (req, row, action) =>
    req.user.role === 'Admin' || (action === 'update' && row.technician_id === req.user.user_id),

  beforeCreate: (req, body) => {
    if (req.user.role === 'Technician') body.technician_id = req.user.user_id;
    else if (!body.technician_id) throw new AppError('technician_id: choose the technician', 400);
    return finish(body, body.start_date);
  },
  beforeUpdate: (req, body, row) => {
    body.request_id = row.request_id; // a job stays attached to its report
    body.technician_id = req.user.role === 'Technician' ? row.technician_id : (body.technician_id || row.technician_id);
    return finish(body, body.start_date);
  },
  afterCreate: (req, id, body) => syncRequest(body.request_id, body.status || 'Assigned'),
  afterUpdate: (req, id, body) => syncRequest(body.request_id, body.status),
  schema,
});
