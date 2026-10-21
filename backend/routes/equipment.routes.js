const { z } = require('zod');
const makeResource = require('../utils/crudFactory');
const { date, STATUS } = require('../utils/fields');

const schema = z.object({
  lab_id: z.number().int().positive(),
  asset_number: z.string().trim().min(1).max(30),
  equipment_name: z.string().trim().min(1).max(80),
  equipment_type: z.enum(['Projector', 'Printer', 'Router', 'Switch', 'Oscilloscope', 'UPS', 'Other']),
  status: z.enum(STATUS).optional(),
  purchase_date: date.optional(),
  warranty_expiry: date.optional(),
}).refine((d) => !d.purchase_date || !d.warranty_expiry || d.warranty_expiry >= d.purchase_date, {
  message: 'warranty_expiry cannot be before purchase_date', path: ['warranty_expiry'],
});

module.exports = makeResource({
  name: 'Equipment', table: 'equipment', alias: 'e', keys: ['equipment_id'],
  columns: 'e.*, l.lab_name',
  from: 'equipment e JOIN lab l ON l.lab_id = e.lab_id',
  orderBy: 'e.equipment_id',
  search: ['e.asset_number', 'e.equipment_name', 'l.lab_name'],
  filters: { lab_id: 'e.lab_id', status: 'e.status', equipment_type: 'e.equipment_type' },
  fields: ['lab_id', 'asset_number', 'equipment_name', 'equipment_type', 'status', 'purchase_date', 'warranty_expiry'],
  nullable: ['purchase_date', 'warranty_expiry'],
  write: ['Admin', 'Technician'],
  schema,
});
