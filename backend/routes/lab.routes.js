const { z } = require('zod');
const makeResource = require('../utils/crudFactory');

const schema = z.object({
  lab_name: z.string().trim().min(1).max(80),
  building: z.string().trim().min(1).max(60),
  floor: z.number().int().optional(), // blank on create = 0 (database default); an edit that omits it keeps the old floor
  capacity: z.number().int().min(1),
  lab_type: z.enum(['Computer', 'Electronics', 'Network', 'Research', 'General']),
  in_charge_faculty_id: z.number().int().optional(),
});

module.exports = makeResource({
  name: 'Lab', table: 'lab', alias: 'l', keys: ['lab_id'],
  columns: 'l.*, u.full_name AS in_charge_name',
  from: 'lab l LEFT JOIN app_user u ON u.user_id = l.in_charge_faculty_id',
  orderBy: 'l.lab_name',
  search: ['l.lab_name', 'l.building'],
  filters: { lab_type: 'l.lab_type', building: 'l.building' },
  fields: ['lab_name', 'building', 'floor', 'capacity', 'lab_type', 'in_charge_faculty_id'],
  nullable: ['in_charge_faculty_id'],
  write: ['Admin'],
  schema,
});
