const { z } = require('zod');
const makeResource = require('../utils/crudFactory');
const { date } = require('../utils/fields');

const schema = z.object({
  computer_id: z.number().int().positive(),
  software_id: z.number().int().positive(),
  install_date: date.optional(),
});

// An installation is identified by BOTH ids, so its URL id looks like "12-3"
// (computer 12, software 3). The seat-limit trigger in the database stops
// installs beyond the licensed number, and its message is shown to the user.
module.exports = makeResource({
  name: 'Installation', table: 'software_installation', alias: 'si', keys: ['computer_id', 'software_id'],
  columns: `CONCAT(si.computer_id, '-', si.software_id) AS install_id, si.computer_id, si.software_id,
            si.install_date, c.asset_number, sw.software_name, sw.version`,
  from: `software_installation si
         JOIN computer c ON c.computer_id = si.computer_id
         JOIN software sw ON sw.software_id = si.software_id`,
  orderBy: 'si.install_date DESC, si.computer_id',
  search: ['c.asset_number', 'sw.software_name'],
  filters: { computer_id: 'si.computer_id', software_id: 'si.software_id' },
  fields: ['computer_id', 'software_id', 'install_date'],
  write: ['Admin', 'Technician'],
  schema,
});
