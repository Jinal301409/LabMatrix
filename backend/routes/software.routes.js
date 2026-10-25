const { z } = require('zod');
const makeResource = require('../utils/crudFactory');
const { date } = require('../utils/fields');

const schema = z.object({
  software_name: z.string().trim().min(1).max(80),
  version: z.string().trim().min(1).max(30),
  vendor: z.string().trim().max(80).optional(),
  license_type: z.enum(['Open Source', 'Educational', 'Commercial', 'Site License']),
  total_licenses: z.number().int().positive().optional(), // blank = unlimited
  license_expiry: date.optional(),                          // blank = perpetual
});

module.exports = makeResource({
  name: 'Software', table: 'software', alias: 's', keys: ['software_id'],
  columns: 's.*, (SELECT COUNT(*) FROM software_installation si WHERE si.software_id = s.software_id) AS seats_used',
  from: 'software s',
  orderBy: 's.software_name, s.version',
  search: ['s.software_name', 's.vendor'],
  filters: { license_type: 's.license_type' },
  fields: ['software_name', 'version', 'vendor', 'license_type', 'total_licenses', 'license_expiry'],
  nullable: ['vendor', 'total_licenses', 'license_expiry'],
  write: ['Admin'],
  schema,
});
