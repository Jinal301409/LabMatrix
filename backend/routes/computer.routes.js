const { z } = require('zod');
const makeResource = require('../utils/crudFactory');
const { date, STATUS } = require('../utils/fields');

const schema = z.object({
  lab_id: z.number().int().positive(),
  asset_number: z.string().trim().min(1).max(30),
  processor: z.string().trim().max(60).optional(),
  ram_gb: z.number().int().positive().optional(),
  storage_gb: z.number().int().positive().optional(),
  operating_system: z.string().trim().max(50).optional(),
  status: z.enum(STATUS).optional(),
  purchase_date: date.optional(),
  warranty_expiry: date.optional(),
}).refine((d) => !d.purchase_date || !d.warranty_expiry || d.warranty_expiry >= d.purchase_date, {
  message: 'warranty_expiry cannot be before purchase_date', path: ['warranty_expiry'],
});

module.exports = makeResource({
  name: 'Computer', table: 'computer', alias: 'c', keys: ['computer_id'],
  columns: 'c.*, l.lab_name',
  from: 'computer c JOIN lab l ON l.lab_id = c.lab_id',
  orderBy: 'c.computer_id',
  search: ['c.asset_number', 'c.processor', 'c.operating_system', 'l.lab_name'],
  filters: { lab_id: 'c.lab_id', status: 'c.status', operating_system: 'c.operating_system' },
  fields: ['lab_id', 'asset_number', 'processor', 'ram_gb', 'storage_gb', 'operating_system', 'status', 'purchase_date', 'warranty_expiry'],
  nullable: ['processor', 'ram_gb', 'storage_gb', 'operating_system', 'purchase_date', 'warranty_expiry'],
  write: ['Admin', 'Technician'],
  schema,
});
