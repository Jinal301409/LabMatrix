import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import useTables from './useTables'
import { Card, Field, RowsTable, Result, RunButton, Select, inputCls, useRun } from './ui'

const tableNames = (tables) => tables.map((t) => t.name)
const colsOf = (tables, name) => tables.find((t) => t.name === name)?.columns || []

// ---------- Q1: display a table ----------
export function DisplayTab() {
  const { tables } = useTables()
  const [table, setTable] = useState('computer')
  const [page, setPage] = useState(1)
  const [state, run] = useRun()

  useEffect(() => { run(() => api.ql.display(table, page, 50)) }, [table, page]) // eslint-disable-line

  const d = state.data
  const pages = d ? Math.max(1, Math.ceil(d.total / d.limit)) : 1
  return (
    <Card title="Display all data from a table" hint="Query 1: SELECT * FROM table. Shown 50 rows at a time.">
      <div className="max-w-xs">
        <Field label="Table">
          <Select value={table} onChange={(v) => { setTable(v); setPage(1) }} options={tableNames(tables)} />
        </Field>
      </div>
      <Result state={state}>
        {d && (
          <>
            <RowsTable rows={d.rows} />
            <div className="mt-3 flex items-center gap-3 text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40">Previous</button>
              <span>Page {page} of {pages} ({d.total.toLocaleString()} rows)</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40">Next</button>
            </div>
          </>
        )}
      </Result>
    </Card>
  )
}

// ---------- Q2: insert a row ----------
const inputType = (c) =>
  ({ date: 'date', datetime: 'datetime-local', timestamp: 'datetime-local', time: 'time' }[c.type] ||
    (['int', 'tinyint', 'smallint', 'bigint', 'decimal'].includes(c.type) ? 'number' : 'text'))

export function InsertTab() {
  const { tables } = useTables()
  const [table, setTable] = useState('batch')
  const [formKey, setFormKey] = useState(0)
  const [state, run] = useRun()
  const cols = colsOf(tables, table).filter((c) => !c.auto)

  const submit = (e) => {
    e.preventDefault()
    const values = Object.fromEntries(new FormData(e.target))
    run(async () => {
      const r = await api.ql.insert(table, values)
      setFormKey((k) => k + 1)
      return r
    })
  }

  return (
    <Card title="Insert a new row" hint="Query 2: INSERT INTO table. The database checks every rule: foreign keys, unique values and CHECK constraints. Users are added from the Users page.">
      <div className="max-w-xs">
        <Field label="Table">
          <Select value={table} onChange={(v) => { setTable(v); setFormKey((k) => k + 1) }}
            options={tableNames(tables).filter((t) => t !== 'app_user')} />
        </Field>
      </div>
      <form key={formKey} onSubmit={submit} className="mt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {cols.map((c) => {
            const required = !c.nullable && !c.hasDefault
            return (
              <Field key={c.name} label={`${c.name}${required ? ' *' : ''}`}>
                {c.options ? (
                  <select name={c.name} defaultValue="" className={inputCls}>
                    <option value="">{c.hasDefault ? '(default)' : 'Choose...'}</option>
                    {c.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input name={c.name} type={inputType(c)} required={required} className={inputCls} />
                )}
              </Field>
            )
          })}
        </div>
        <div className="mt-4"><RunButton loading={state.loading}>Insert row</RunButton></div>
      </form>
      <Result state={state}>
        {state.data && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Inserted {state.data.affectedRows} row{state.data.insertId ? ` (new id ${state.data.insertId})` : ''}.
          </p>
        )}
      </Result>
    </Card>
  )
}

// ---------- Q3: aggregate ----------
export function AggregateTab() {
  const { tables } = useTables()
  const [table, setTable] = useState('computer')
  const [fn, setFn] = useState('AVG')
  const [column, setColumn] = useState('ram_gb')
  const [state, run] = useRun()
  const cols = colsOf(tables, table)

  return (
    <Card title="Aggregate function" hint="Query 3: pick a function, a table and a column.">
      <form onSubmit={(e) => { e.preventDefault(); run(() => api.ql.aggregate({ table, column, fn })) }}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Function"><Select value={fn} onChange={setFn} options={['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']} /></Field>
          <Field label="Table"><Select value={table} onChange={(v) => { setTable(v); setColumn('') }} options={tableNames(tables)} /></Field>
          <Field label="Column">
            <Select value={column} onChange={setColumn} placeholder="Choose a column"
              options={[...(fn === 'COUNT' ? [{ value: '*', label: '* (all rows)' }] : []), ...cols.map((c) => c.name)]} />
          </Field>
        </div>
        <div className="mt-4"><RunButton disabled={!column} loading={state.loading} /></div>
      </form>
      <Result state={state}>
        {state.data && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <div className="text-4xl font-semibold">{String(state.data.result)}</div>
            <div className="mt-1 text-sm text-slate-500">{fn} result</div>
          </div>
        )}
      </Result>
    </Card>
  )
}

// ---------- Q4: condition ----------
const OPS = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL']

export function FilterTab() {
  const { tables } = useTables()
  const [table, setTable] = useState('computer')
  const [column, setColumn] = useState('ram_gb')
  const [op, setOp] = useState('>=')
  const [value, setValue] = useState('16')
  const [state, run] = useRun()
  const needsValue = !op.startsWith('IS')

  return (
    <Card title="Rows that match a condition" hint="Query 4: SELECT ... WHERE column operator value. LIKE means contains.">
      <form onSubmit={(e) => { e.preventDefault(); run(() => api.ql.filter({ table, column, op, value: needsValue ? value : '' })) }}>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Table"><Select value={table} onChange={(v) => { setTable(v); setColumn('') }} options={tableNames(tables)} /></Field>
          <Field label="Column"><Select value={column} onChange={setColumn} placeholder="Choose a column" options={colsOf(tables, table).map((c) => c.name)} /></Field>
          <Field label="Operator"><Select value={op} onChange={setOp} options={OPS} /></Field>
          {needsValue && (
            <Field label="Value"><input value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} /></Field>
          )}
        </div>
        <div className="mt-4"><RunButton disabled={!column} loading={state.loading} /></div>
      </form>
      <Result state={state}>
        {state.data && (
          <>
            <p className="mb-2 text-sm text-slate-600">{state.data.total.toLocaleString()} matching row(s){state.data.total > 500 ? ', showing the first 500' : ''}.</p>
            <RowsTable rows={state.data.rows} />
          </>
        )}
      </Result>
    </Card>
  )
}

// ---------- Q6 and Q7: subquery / correlated query with dropdown options ----------
export function PresetTab({ kind }) {
  const [presets, setPresets] = useState([])
  const [id, setId] = useState('')
  const [param, setParam] = useState('')
  const [loadError, setLoadError] = useState('')
  const [state, run] = useRun()

  useEffect(() => {
    api.ql.presets().then((all) => {
      const mine = all.filter((p) => p.kind === kind)
      setPresets(mine)
      if (mine[0]) { setId(mine[0].id); setParam(mine[0].param?.options?.[0]?.value ?? '') }
    }).catch((e) => setLoadError(e.message))
  }, [kind])

  const p = presets.find((x) => x.id === id)
  const pick = (v) => {
    setId(v)
    const next = presets.find((x) => x.id === v)
    setParam(next?.param?.options?.[0]?.value ?? '')
  }

  return (
    <Card
      title={kind === 'subquery' ? 'Subquery over several tables' : 'Correlated query over several tables'}
      hint={kind === 'subquery'
        ? 'Query 6: an inner SELECT runs once and its result feeds the outer query.'
        : 'Query 7: the inner SELECT is re-run for every row of the outer query.'}
    >
      {loadError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      <form onSubmit={(e) => { e.preventDefault(); run(() => api.ql.runPreset(id, param)) }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Query"><Select value={id} onChange={pick} options={presets.map((x) => ({ value: x.id, label: x.title }))} /></Field>
          {p?.param && (
            <Field label={p.param.label}>
              <Select value={String(param)} onChange={setParam} options={p.param.options} />
            </Field>
          )}
        </div>
        {p && <p className="mt-3 text-sm text-slate-500">{p.description}</p>}
        <div className="mt-4"><RunButton disabled={!p} loading={state.loading} /></div>
      </form>
      <Result state={state}>
        {state.data && (
          <>
            <p className="mb-2 text-sm text-slate-600">{state.data.rows.length} row(s).</p>
            <RowsTable rows={state.data.rows} />
          </>
        )}
      </Result>
    </Card>
  )
}

// ---------- Q8: update ----------
export function UpdateTab() {
  const { tables } = useTables()
  const [table, setTable] = useState('computer')
  const [setCol, setSetCol] = useState('ram_gb')
  const [setVal, setSetVal] = useState('')
  const [whereCol, setWhereCol] = useState('asset_number')
  const [whereVal, setWhereVal] = useState('')
  const [state, run] = useRun()
  const cols = colsOf(tables, table)

  const submit = (e) => {
    e.preventDefault()
    if (!confirm(`Set ${setCol} to "${setVal}" in every ${table} row where ${whereCol} = "${whereVal}"?`)) return
    run(() => api.ql.update({ table, set_column: setCol, set_value: setVal, where_column: whereCol, where_value: whereVal }))
  }

  return (
    <Card title="Update data" hint="Query 8: UPDATE table SET column = value WHERE column = value. A WHERE value is always required.">
      <form onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Table"><Select value={table} onChange={(v) => { setTable(v); setSetCol(''); setWhereCol('') }} options={tableNames(tables)} /></Field>
          <div />
          <Field label="Column to change"><Select value={setCol} onChange={setSetCol} placeholder="Choose a column" options={cols.filter((c) => c.key !== 'PRI').map((c) => c.name)} /></Field>
          <Field label="New value (blank = NULL)"><input value={setVal} onChange={(e) => setSetVal(e.target.value)} className={inputCls} /></Field>
          <Field label="Where this column"><Select value={whereCol} onChange={setWhereCol} placeholder="Choose a column" options={cols.map((c) => c.name)} /></Field>
          <Field label="equals"><input required value={whereVal} onChange={(e) => setWhereVal(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="mt-4"><RunButton disabled={!setCol || !whereCol} loading={state.loading}>Update</RunButton></div>
      </form>
      <Result state={state}>
        {state.data && (
          <>
            <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.data.affectedRows} row(s) changed.</p>
            <h3 className="mb-1 text-sm font-semibold">Before</h3>
            <RowsTable rows={state.data.before} />
            <h3 className="mb-1 mt-4 text-sm font-semibold">After</h3>
            <RowsTable rows={state.data.after} />
          </>
        )}
      </Result>
    </Card>
  )
}

// ---------- Q5: join ----------
export function JoinTab() {
  const { tables } = useTables()
  const [pairs, setPairs] = useState([])
  const [left, setLeft] = useState('lab')
  const [right, setRight] = useState('computer')
  const [type, setType] = useState('INNER')
  const [state, run] = useRun()

  useEffect(() => { api.ql.joinPairs().then(setPairs).catch(() => {}) }, [])

  const names = tableNames(tables)
  const related = pairs.filter((p) => p.left === left).map((p) => p.right)
  const rightOptions = type === 'CROSS' ? names.filter((n) => n !== left) : related

  const changeLeft = (v) => {
    setLeft(v)
    const next = type === 'CROSS' ? names.find((n) => n !== v) : pairs.find((p) => p.left === v)?.right
    setRight(next || '')
  }

  return (
    <Card title="Join two tables" hint="Query 5: choose two tables and a join type. The join condition comes from the database's foreign keys. MySQL has no FULL JOIN, so FULL is built from LEFT + RIGHT with UNION.">
      <form onSubmit={(e) => { e.preventDefault(); run(() => api.ql.join({ left, right, type, limit: 100 })) }}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="First table"><Select value={left} onChange={changeLeft} options={names} /></Field>
          <Field label="Join type"><Select value={type} onChange={setType} options={['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS']} /></Field>
          <Field label={type === 'CROSS' ? 'Second table (any)' : 'Second table (related to the first)'}>
            <Select value={right} onChange={setRight} placeholder="Choose a table" options={rightOptions} />
          </Field>
        </div>
        <div className="mt-4"><RunButton disabled={!right} loading={state.loading} /></div>
      </form>
      <Result state={state}>
        {state.data && (
          <>
            <p className="mb-2 text-sm text-slate-600">Showing up to 100 rows ({state.data.rows.length} returned).</p>
            <RowsTable rows={state.data.rows} />
          </>
        )}
      </Result>
    </Card>
  )
}
