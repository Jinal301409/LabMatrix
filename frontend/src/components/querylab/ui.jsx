import { useState } from 'react'
import DataTable from '../DataTable'

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'

export function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

export function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o
        const l = typeof o === 'object' ? o.label : o
        return <option key={v} value={v}>{l}</option>
      })}
    </select>
  )
}

export function RunButton({ children = 'Run query', disabled, loading }) {
  return (
    <button
      disabled={disabled || loading}
      className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
    >
      {loading ? 'Running...' : children}
    </button>
  )
}

// Runs an API call and keeps { loading, error, data } for the result panel.
export function useRun() {
  const [state, setState] = useState({ loading: false, error: '', data: null })
  const run = async (fn) => {
    setState({ loading: true, error: '', data: null })
    try {
      setState({ loading: false, error: '', data: await fn() })
    } catch (e) {
      setState({ loading: false, error: e.message, data: null })
    }
  }
  return [state, run]
}

// Shows the SQL that was executed (useful in the viva), then whatever result was returned.
export function Result({ state, children }) {
  const { loading, error, data } = state
  if (loading) return <p className="mt-4 text-slate-500">Running...</p>
  if (error) return <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
  if (!data) return null
  return (
    <div className="mt-4">
      {data.sql && (
        <pre className="mb-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-teal-200 whitespace-pre-wrap">{data.sql}</pre>
      )}
      {children}
    </div>
  )
}

export const RowsTable = ({ rows }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <DataTable rows={rows} columns={Object.keys(rows[0] || {})} />
  </div>
)

export function Card({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mb-4 mt-1 text-sm text-slate-500">{hint}</p>}
      {children}
    </section>
  )
}
