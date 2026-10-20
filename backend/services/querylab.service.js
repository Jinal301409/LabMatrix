// Query Lab: runs the assignment's SQL queries (Q1-Q8) on behalf of the frontend.
//
// SAFETY RULE (important): the "?" placeholder protects VALUES, but SQL does not
// allow "?" for table names, column names, operators or join types. Those come
// from dropdowns on the page, but anyone can call this API by hand, so we never
// paste a dropdown value into SQL directly. Instead every name is checked against
// a list we build ourselves (the real tables and columns of the database, plus
// small fixed lists of functions / operators / join types). Anything not on the
// list is rejected with a 400 error.
const mysql = require('mysql2');
const pool = require('../config/db');
const AppError = require('../utils/AppError');

// The 16 project tables. Nothing outside this list can be touched.
const TABLES = [
  'app_user', 'student', 'faculty', 'technician', 'batch', 'course', 'lab', 'computer',
  'equipment', 'software', 'software_installation', 'lab_session', 'attendance',
  'lab_booking', 'maintenance_request', 'maintenance',
];
const HIDDEN = new Set(['password_hash']); // never shown, never editable
const FNS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
const NUMERIC = ['int', 'tinyint', 'smallint', 'mediumint', 'bigint', 'decimal', 'float', 'double'];
const OPS = {
  '=': '=', '!=': '<>', '>': '>', '>=': '>=', '<': '<', '<=': '<=',
  'LIKE': 'LIKE', 'NOT LIKE': 'NOT LIKE', 'IS NULL': 'IS NULL', 'IS NOT NULL': 'IS NOT NULL',
};
const JOINS = ['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'];

const esc = (name) => '`' + name + '`'; // only ever called with a validated name
const clamp = (v, min, max, dflt) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? dflt : Math.min(Math.max(n, min), max);
};
const show = (sql, params) => mysql.format(sql, params).replace(/\s+/g, ' ').trim(); // SQL text for the page

// ---------- schema (read once from information_schema, then cached) ----------
let cache = null;
async function schema() {
  if (cache) return cache;
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, DATA_TYPE AS d, COLUMN_TYPE AS ct,
            COLUMN_KEY AS k, EXTRA AS x, IS_NULLABLE AS n, COLUMN_DEFAULT AS dv
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [TABLES]
  );
  const out = {};
  TABLES.forEach((t) => (out[t] = { name: t, columns: [] }));
  for (const r of rows) {
    const table = String(r.t).toLowerCase();
    if (HIDDEN.has(r.c) || !out[table]) continue;
    const options = r.d === 'enum'
      ? [...r.ct.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"))
      : null;
    out[table].columns.push({
      name: r.c,
      type: r.d,
      key: r.k,
      auto: String(r.x).includes('auto_increment'),
      nullable: r.n === 'YES',
      hasDefault: r.dv !== null || String(r.x).includes('DEFAULT_GENERATED'),
      options,
    });
  }
  cache = out;
  return out;
}

async function tbl(name) {
  const s = await schema();
  const key = String(name || '').toLowerCase();
  if (!TABLES.includes(key)) throw new AppError('Unknown table', 400);
  return s[key];
}
function col(table, name) {
  const c = table.columns.find((x) => x.name === name);
  if (!c) throw new AppError(`Unknown column "${name}" for table ${table.name}`, 400);
  return c;
}
const colList = (table, alias) =>
  table.columns.map((c) => (alias ? `${alias}.${esc(c.name)}` : esc(c.name))).join(', ');

// ---------- list of tables and columns (feeds every dropdown) ----------
exports.tables = async () => Object.values(await schema());

// ---------- Q1: display a whole table (paged) ----------
exports.display = async (name, page, limit) => {
  const t = await tbl(name);
  const lim = clamp(limit, 1, 500, 50);
  const pg = clamp(page, 1, 1000000, 1);
  const off = (pg - 1) * lim;
  const [rows] = await pool.query(`SELECT ${colList(t)} FROM ${esc(t.name)} LIMIT ? OFFSET ?`, [lim, off]);
  const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM ${esc(t.name)}`);
  return { sql: `SELECT * FROM ${t.name} LIMIT ${lim} OFFSET ${off}`, total: n, page: pg, limit: lim, rows };
};

// ---------- Q2: insert one row ----------
exports.insert = async (name, values) => {
  if (String(name).toLowerCase() === 'app_user') {
    throw new AppError('Add users from the Users page, because passwords must be hashed', 400);
  }
  const t = await tbl(name);
  for (const k of Object.keys(values)) col(t, k); // reject unknown keys
  const cols = [];
  const params = [];
  for (const c of t.columns) {
    const v = values[c.name];
    if (c.auto || v === undefined || v === null || v === '') continue; // leave to the DB default
    cols.push(esc(c.name));
    params.push(v);
  }
  if (!cols.length) throw new AppError('Enter at least one value', 400);
  const sql = `INSERT INTO ${esc(t.name)} (${cols.join(', ')}) VALUES (?)`;
  const [r] = await pool.query(sql, [params]);
  return { sql: show(sql, [params]), insertId: r.insertId, affectedRows: r.affectedRows };
};

// ---------- Q3: one aggregate result ----------
exports.aggregate = async ({ table, column, fn }) => {
  const f = String(fn || '').toUpperCase();
  if (!FNS.includes(f)) throw new AppError('Choose COUNT, SUM, AVG, MIN or MAX', 400);
  const t = await tbl(table);
  let expr;
  if (f === 'COUNT' && (!column || column === '*')) {
    expr = 'COUNT(*)';
  } else {
    const c = col(t, column);
    if ((f === 'SUM' || f === 'AVG') && !NUMERIC.includes(c.type)) {
      throw new AppError(`${f} needs a number column, and ${c.name} is ${c.type}`, 400);
    }
    expr = `${f}(${esc(c.name)})`;
  }
  const sql = `SELECT ${expr} AS result FROM ${esc(t.name)}`;
  const [[row]] = await pool.query(sql);
  let result = row.result;
  if (typeof result === 'string' && result !== '' && !Number.isNaN(Number(result))) {
    result = Number(Number(result).toFixed(4));
  }
  return { sql, result };
};

// ---------- Q4: rows that match one condition ----------
exports.filter = async ({ table, column, op, value }) => {
  const t = await tbl(table);
  const c = col(t, column);
  const o = OPS[op];
  if (!o) throw new AppError('Unknown operator', 400);
  const nullOp = o.startsWith('IS');
  if (!nullOp && (value === undefined || value === '')) throw new AppError('Enter a value to compare with', 400);
  let where = `${esc(c.name)} ${o}`;
  const params = [];
  if (!nullOp) {
    where += ' ?';
    params.push(o.includes('LIKE') ? `%${value}%` : value); // LIKE means "contains"
  }
  const base = `FROM ${esc(t.name)} WHERE ${where}`;
  const [rows] = await pool.query(`SELECT ${colList(t)} ${base} LIMIT 500`, params);
  const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n ${base}`, params);
  return { sql: show(`SELECT * ${base}`, params), total: n, rows };
};

// ---------- Q6 / Q7: ready-made subquery and correlated queries with dropdown options ----------
const LAB_TYPES = ['Computer', 'Electronics', 'Network', 'Research', 'General'];
const PRESETS = [
  {
    id: 'sq_absent_recent', kind: 'subquery',
    title: 'Students absent in recent sessions',
    description: 'student, attendance and lab_session: students marked Absent in a session of the last N days.',
    param: { label: 'Last how many days?', type: 'int', options: [7, 30, 90, 365] },
    sql: `SELECT s.enrollment_no, s.batch_id FROM student s
          WHERE s.user_id IN (SELECT a.student_id FROM attendance a
                              WHERE a.status = 'Absent'
                                AND a.session_id IN (SELECT ls.session_id FROM lab_session ls
                                                     WHERE ls.session_date >= CURDATE() - INTERVAL ? DAY))
          LIMIT 200`,
  },
  {
    id: 'sq_pcs_in_labtype', kind: 'subquery',
    title: 'Computers in labs of a type',
    description: 'computer and lab: computers whose lab has the chosen type.',
    param: { label: 'Lab type', type: 'text', options: LAB_TYPES },
    sql: `SELECT c.asset_number, c.ram_gb, c.operating_system, c.status FROM computer c
          WHERE c.lab_id IN (SELECT l.lab_id FROM lab l WHERE l.lab_type = ?) LIMIT 200`,
  },
  {
    id: 'sq_students_by_branch', kind: 'subquery',
    title: 'Students of a branch',
    description: 'student and batch: students whose batch belongs to the chosen branch.',
    param: { label: 'Branch', type: 'text', optionsSql: 'SELECT DISTINCT branch AS value FROM batch ORDER BY branch' },
    sql: `SELECT s.enrollment_no, s.batch_id FROM student s
          WHERE s.batch_id IN (SELECT b.batch_id FROM batch b WHERE b.branch = ?) LIMIT 200`,
  },
  {
    id: 'sq_software_in_lab', kind: 'subquery',
    title: 'Software installed in a lab',
    description: 'software, software_installation and computer: titles installed on any computer of the chosen lab.',
    param: { label: 'Lab', type: 'int', optionsSql: 'SELECT l.lab_id AS value, l.lab_name AS label FROM lab l WHERE EXISTS (SELECT 1 FROM computer c WHERE c.lab_id = l.lab_id) ORDER BY l.lab_name' },
    sql: `SELECT sw.software_name, sw.version, sw.license_type FROM software sw
          WHERE sw.software_id IN (SELECT si.software_id FROM software_installation si
                                   WHERE si.computer_id IN (SELECT c.computer_id FROM computer c WHERE c.lab_id = ?))`,
  },
  {
    id: 'co_labs_without_computers', kind: 'correlated',
    title: 'Labs that have no computer',
    description: 'lab and computer: the inner query is re-run for every lab (NOT EXISTS).',
    param: null,
    sql: `SELECT l.lab_name, l.building, l.lab_type FROM lab l
          WHERE NOT EXISTS (SELECT 1 FROM computer c WHERE c.lab_id = l.lab_id)`,
  },
  {
    id: 'co_labs_many_working', kind: 'correlated',
    title: 'Labs with more than N working computers',
    description: 'lab and computer: counts the working computers of each lab separately.',
    param: { label: 'More than how many?', type: 'int', options: [0, 10, 50, 100, 500, 900] },
    sql: `SELECT l.lab_name, l.building,
                 (SELECT COUNT(*) FROM computer c WHERE c.lab_id = l.lab_id AND c.status = 'Working') AS working_computers
          FROM lab l
          WHERE (SELECT COUNT(*) FROM computer c WHERE c.lab_id = l.lab_id AND c.status = 'Working') > ?`,
  },
  {
    id: 'co_students_many_absences', kind: 'correlated',
    title: 'Students with more than N absences',
    description: 'student and attendance: counts the absences of each student separately.',
    param: { label: 'More than how many absences?', type: 'int', options: [0, 1, 2, 5, 10, 15, 20] },
    sql: `SELECT s.enrollment_no,
                 (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.user_id AND a.status = 'Absent') AS absences
          FROM student s
          WHERE (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.user_id AND a.status = 'Absent') > ?
          ORDER BY absences DESC LIMIT 200`,
  },
  {
    id: 'co_faculty_recent_sessions', kind: 'correlated',
    title: 'Faculty who took a session recently',
    description: 'faculty, app_user and lab_session: EXISTS checks each faculty member separately.',
    param: { label: 'Within how many days?', type: 'int', options: [7, 30, 90, 365] },
    sql: `SELECT u.full_name, f.department FROM faculty f JOIN app_user u ON u.user_id = f.user_id
          WHERE EXISTS (SELECT 1 FROM lab_session ls WHERE ls.faculty_id = f.user_id
                        AND ls.session_date >= CURDATE() - INTERVAL ? DAY)`,
  },
];

async function paramOptions(p) {
  if (!p) return null;
  if (p.options) return p.options.map((v) => ({ value: v, label: String(v) }));
  const [rows] = await pool.query(p.optionsSql); // our own fixed SQL, not user input
  return rows.map((r) => ({ value: r.value, label: String(r.label ?? r.value) }));
}

exports.presets = async () =>
  Promise.all(
    PRESETS.map(async (p) => ({
      id: p.id, kind: p.kind, title: p.title, description: p.description,
      sql: p.sql.replace(/\s+/g, ' ').trim(),
      param: p.param ? { label: p.param.label, options: await paramOptions(p.param) } : null,
    }))
  );

exports.runPreset = async (id, param) => {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new AppError('Unknown query', 404);
  let params = [];
  if (p.param) {
    const options = await paramOptions(p.param);
    const hit = options.find((o) => String(o.value) === String(param)); // only values we offered
    if (!hit) throw new AppError('Choose one of the offered options', 400);
    params = [p.param.type === 'int' ? Number(hit.value) : String(hit.value)];
  }
  const [rows] = await pool.query(p.sql, params);
  return { sql: show(p.sql, params), rows };
};

// ---------- Q8: update one column ----------
exports.update = async ({ table, set_column, set_value, where_column, where_value }) => {
  const t = await tbl(table);
  const sc = col(t, set_column);
  const wc = col(t, where_column);
  if (sc.key === 'PRI') throw new AppError('A primary key column cannot be updated', 400);
  if (where_value === undefined || where_value === null || where_value === '') {
    throw new AppError('A WHERE value is required, so one update cannot change the whole table', 400);
  }
  const newValue = set_value === '' || set_value === undefined ? null : set_value;
  const pick = (v) => pool.query(`SELECT ${colList(t)} FROM ${esc(t.name)} WHERE ${esc(wc.name)} = ? LIMIT 50`, [v]);

  const [before] = await pick(where_value);
  const sql = `UPDATE ${esc(t.name)} SET ${esc(sc.name)} = ? WHERE ${esc(wc.name)} = ?`;
  const [r] = await pool.query(sql, [newValue, where_value]);
  const [after] = await pick(sc.name === wc.name ? newValue : where_value);
  return { sql: show(sql, [newValue, where_value]), affectedRows: r.affectedRows, before, after };
};

// ---------- Q5: join two tables ----------
// The join condition comes from the real foreign keys in the database, so the
// user never has to type one and cannot get it wrong.
let fkCache = null;
async function foreignKeys() {
  if (fkCache) return fkCache;
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS child, COLUMN_NAME AS child_col,
            REFERENCED_TABLE_NAME AS parent, REFERENCED_COLUMN_NAME AS parent_col
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`
  );
  fkCache = rows
    .map((r) => ({
      child: String(r.child).toLowerCase(), child_col: r.child_col,
      parent: String(r.parent).toLowerCase(), parent_col: r.parent_col,
    }))
    .filter((r) => TABLES.includes(r.child) && TABLES.includes(r.parent));
  return fkCache;
}

exports.joinPairs = async () => {
  const seen = new Set();
  const pairs = [];
  for (const f of await foreignKeys()) {
    for (const [l, r] of [[f.child, f.parent], [f.parent, f.child]]) {
      if (!seen.has(`${l}|${r}`)) { seen.add(`${l}|${r}`); pairs.push({ left: l, right: r }); }
    }
  }
  return pairs;
};

exports.join = async ({ left, right, type, limit }) => {
  const jt = String(type || '').toUpperCase();
  if (!JOINS.includes(jt)) throw new AppError('Choose a join type', 400);
  const a = await tbl(left);
  const b = await tbl(right);
  if (a.name === b.name) throw new AppError('Pick two different tables', 400);
  const lim = clamp(limit, 1, 500, 100);

  // columns present in both tables get the table name in front so they stay distinct
  const both = new Set(a.columns.map((c) => c.name).filter((n) => b.columns.some((c) => c.name === n)));
  const sel = (t, alias) =>
    t.columns.map((c) => `${alias}.${esc(c.name)} AS ${esc(both.has(c.name) ? `${t.name}_${c.name}` : c.name)}`);
  const list = [...sel(a, 'a'), ...sel(b, 'b')].join(', ');

  let on = '';
  if (jt !== 'CROSS') {
    const f = (await foreignKeys()).find(
      (k) => (k.child === a.name && k.parent === b.name) || (k.child === b.name && k.parent === a.name)
    );
    if (!f) {
      throw new AppError(`${a.name} and ${b.name} are not directly related. Pick related tables, or use CROSS JOIN`, 400);
    }
    on = f.child === a.name
      ? ` ON a.${esc(f.child_col)} = b.${esc(f.parent_col)}`
      : ` ON b.${esc(f.child_col)} = a.${esc(f.parent_col)}`;
  }
  const from = (kind) => `FROM ${esc(a.name)} a ${kind} JOIN ${esc(b.name)} b${on}`;

  // MySQL has no FULL JOIN, so it is built as LEFT JOIN + RIGHT JOIN combined with UNION
  const sql = jt === 'FULL'
    ? `(SELECT ${list} ${from('LEFT')}) UNION (SELECT ${list} ${from('RIGHT')}) LIMIT ${lim}`
    : `SELECT ${list} ${from(jt)} LIMIT ${lim}`;
  const [rows] = await pool.query(sql);
  return { sql: sql.replace(list, '*').replace(list, '*'), rows };
};

// ---------- E: dashboard statistics for every table ----------
const LABELS = {
  app_user: 'Users', student: 'Students', faculty: 'Faculty', technician: 'Technicians',
  batch: 'Batches', course: 'Courses', lab: 'Labs', computer: 'Computers', equipment: 'Equipment',
  software: 'Software', software_installation: 'Installations', lab_session: 'Lab sessions',
  attendance: 'Attendance records', lab_booking: 'Lab bookings', maintenance_request: 'Fault reports',
  maintenance: 'Repair jobs',
};
const groupCount = async (table, column) => {
  const [rows] = await pool.query(`SELECT ${esc(column)} AS k, COUNT(*) AS n FROM ${esc(table)} GROUP BY ${esc(column)}`);
  return Object.fromEntries(rows.map((r) => [r.k, r.n]));
};

exports.stats = async () => {
  const union = TABLES.map((t) => `SELECT '${t}' AS t, COUNT(*) AS n FROM ${esc(t)}`).join(' UNION ALL ');
  const [countRows] = await pool.query(union);
  const counts = Object.fromEntries(countRows.map((r) => [r.t, r.n]));

  const [users, pcs, equip, bookings, requests, jobs] = await Promise.all([
    groupCount('app_user', 'role'), groupCount('computer', 'status'), groupCount('equipment', 'status'),
    groupCount('lab_booking', 'status'), groupCount('maintenance_request', 'status'),
    groupCount('maintenance', 'status'),
  ]);
  const [[{ n: expiring }]] = await pool.query('SELECT COUNT(*) AS n FROM v_expiring_licenses');
  const [[att]] = await pool.query(
    "SELECT ROUND(100 * SUM(status IN ('Present','Late')) / NULLIF(COUNT(*), 0), 1) AS pct FROM attendance"
  );
  const g = (o, k) => o[k] || 0;
  const openFaults = g(requests, 'Open') + g(requests, 'Assigned') + g(requests, 'In Progress');

  const extra = {
    app_user: [`${g(users, 'Admin')} admin, ${g(users, 'Faculty')} faculty, ${g(users, 'Student')} students, ${g(users, 'Technician')} technicians`, 'ok'],
    computer: [`${g(pcs, 'Working')} working, ${g(pcs, 'Under Maintenance')} under maintenance, ${g(pcs, 'Retired')} retired`, g(pcs, 'Under Maintenance') ? 'warn' : 'ok'],
    equipment: [`${g(equip, 'Working')} working, ${g(equip, 'Under Maintenance')} under maintenance`, g(equip, 'Under Maintenance') ? 'warn' : 'ok'],
    lab_booking: [`${g(bookings, 'Pending')} request(s) waiting for approval, ${g(bookings, 'Approved')} approved`, g(bookings, 'Pending') ? 'warn' : 'ok'],
    maintenance_request: [`${openFaults} fault report(s) still open`, openFaults ? 'warn' : 'ok'],
    maintenance: [`${g(jobs, 'Completed')} completed, ${g(jobs, 'In Progress') + g(jobs, 'Assigned')} in progress`, 'ok'],
    software: [`${expiring} licence(s) expiring within 60 days`, expiring ? 'warn' : 'ok'],
    attendance: att.pct === null ? [null, 'ok'] : [`Overall attendance is ${att.pct}%`, Number(att.pct) < 75 ? 'warn' : 'ok'],
  };

  return TABLES.map((t) => {
    const n = counts[t];
    const label = LABELS[t];
    if (n === 0) return { table: t, label, count: 0, level: 'empty', message: `No records yet. Add some from the ${label} page.` };
    const [msg, level] = extra[t] || [null, 'ok'];
    return { table: t, label, count: n, level, message: msg || `${n} record(s) stored` };
  });
};
