import { useEffect, useState } from 'react'
import { api } from '../api/client'

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'

function toInputValue(field, v) {
  if (v === null || v === undefined) return ''
  if (field.t === 'date') return String(v).slice(0, 10)
  if (field.t === 'datetime-local') return String(v).slice(0, 16).replace(' ', 'T')
  return v
}

export default function FormModal({ title, fields, row, onSave, onClose }) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [refs, setRefs] = useState({}) // dropdown lists, e.g. { labs: [{ value, label }] }

  // load the list behind every dropdown field (labs, faculty, courses ...)
  useEffect(() => {
    for (const name of new Set(fields.filter((f) => f.t === 'ref').map((f) => f.ref))) {
      api.options(name).then((list) => setRefs((r) => ({ ...r, [name]: list }))).catch(() => {})
    }
  }, []) // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault()
    const body = {}
    for (const [k, v] of new FormData(e.target)) body[k] = v === '' ? null : v
    // number and dropdown (id) fields must be sent as numbers
    for (const f of fields) {
      if ((f.t === 'number' || f.t === 'ref') && body[f.k] !== null && body[f.k] !== undefined) body[f.k] = Number(body[f.k])
    }
    setSaving(true)
    setError('')
    try {
      await onSave(body)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const v = toInputValue(f, row?.[f.k])
            const span = f.full || f.t === 'textarea' ? 'sm:col-span-2' : ''
            let control
            if (f.t === 'select') {
              control = (
                <select name={f.k} defaultValue={v || f.opts[0]} className={input}>
                  {f.opts.map((o) => <option key={o}>{o}</option>)}
                </select>
              )
            } else if (f.t === 'ref') {
              // keep the saved value selectable even if it is not in the list (e.g. a finished job's report)
              const list = refs[f.ref] || []
              const options = v && !list.some((o) => String(o.value) === String(v)) ? [...list, { value: v, label: `#${v}` }] : list
              control = (
                <select name={f.k} defaultValue={v} required={!f.optional} className={input}>
                  <option value="">{f.optional ? '(none)' : 'Choose...'}</option>
                  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )
            } else if (f.t === 'textarea') {
              control = <textarea name={f.k} rows={3} defaultValue={v} required={!f.optional} className={input} />
            } else {
              control = <input name={f.k} type={f.t} defaultValue={v} required={!f.optional} className={input} />
            }
            return (
              <div key={f.k} className={span}>
                <label className="mb-1 block text-sm font-medium text-slate-600">{f.l}</label>
                {control}
              </div>
            )
          })}
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
          <button disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
