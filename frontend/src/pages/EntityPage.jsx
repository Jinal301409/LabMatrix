import { useEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ACCESS, ENTITIES } from '../config/entities'
import DataTable from '../components/DataTable'
import FormModal from '../components/FormModal'

const btn = 'rounded-lg px-2.5 py-1 text-xs font-medium'
const PAGE_SIZE = 50

// One generic list + add/edit/delete page, driven by config/entities.js.
// Big tables (computers, bookings...) are searched, filtered and paged on the server.
export default function EntityPage() {
  const { entity } = useParams()
  const { user } = useAuth()
  const cfg = ENTITIES[entity]

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null) // null for the older modules that return everything at once
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('') // the search text after a short pause, so we do not query on every key
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | row
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const reload = () => setTick((t) => t + 1)
  const lastTick = useRef(0)

  useEffect(() => { setPage(1); setSearch(''); setQ(''); setStatus(''); setEditing(null); setMessage('') }, [entity])
  useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!cfg) return undefined
    let stale = false
    // a reload after Save / Delete / Approve keeps its success message; a new search or page clears it
    if (lastTick.current === tick) setMessage('')
    lastTick.current = tick
    setLoading(true)
    api.page(entity, { page, limit: PAGE_SIZE, q, status })
      .then((res) => { if (!stale) { setRows(res.data); setMeta(res.meta || null) } })
      .catch((err) => { if (!stale) { setRows([]); setMeta(null); setMessage(err.message) } })
      .finally(() => { if (!stale) setLoading(false) })
    return () => { stale = true }
  }, [entity, page, q, status, tick]) // eslint-disable-line

  if (!cfg || !ACCESS[user.role].includes(entity)) return <Navigate to="/" replace />

  const canEdit = cfg.roles.includes(user.role)
  const canAdd = canEdit
  const rowEdit = (r) => canEdit && (cfg.canEditRow ? cfg.canEditRow(r, user) : true)
  const rowDelete = (r) => canEdit && (cfg.canDeleteRow ? cfg.canDeleteRow(r, user) : true)
  const fields = cfg.fields.filter((f) => !f.hideFor?.includes(user.role))
  const statusField = cfg.fields.find((f) => f.k === 'status')
  const statusOptions = cfg.statusOptions || statusField?.opts

  // older modules (users, batches, courses) return every row, so search and filter in the browser
  const visible = meta
    ? rows
    : rows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()) && (!status || r.status === status))

  const run = async (fn, okMsg) => {
    try { await fn(); setMessage(okMsg); reload() } catch (err) { setMessage(err.message) }
  }

  const save = async (body) => {
    if (editing === 'new') await api.create(entity, body)
    else await api.update(entity, editing[cfg.id], body)
    setEditing(null)
    setMessage('Saved')
    reload()
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{cfg.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${cfg.title.toLowerCase()}`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          {statusOptions && (
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {statusOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          )}
          {canAdd && (
            <button onClick={() => setEditing('new')} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Add new</button>
          )}
        </div>
      </div>

      {message && <p className="mb-4 rounded-lg bg-slate-200 px-3 py-2 text-sm">{message}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading...</div>
        ) : (
          <DataTable rows={visible} columns={cfg.cols} renderActions={(r) => {
            const id = r[cfg.id]
            return (
              <>
                {cfg.approve && user.role === 'Admin' && r.status === 'Pending' && (
                  <>
                    <button onClick={() => run(() => api.approveBooking(id), 'Booking approved')} className={`${btn} bg-teal-700 text-white`}>Approve</button>
                    <button onClick={() => run(() => api.rejectBooking(id), 'Booking rejected')} className={`${btn} bg-red-600 text-white`}>Reject</button>
                  </>
                )}
                {cfg.approve && ['Pending', 'Approved'].includes(r.status) && (user.role === 'Faculty' || (user.role === 'Admin' && r.status === 'Approved')) && (
                  <button onClick={() => confirm('Cancel this booking?') && run(() => api.cancelBooking(id), 'Booking cancelled')} className={`${btn} border border-slate-300`}>Cancel</button>
                )}
                {rowEdit(r) && <button onClick={() => setEditing(r)} className={`${btn} border border-slate-300`}>Edit</button>}
                {rowDelete(r) && (
                  <button
                    onClick={() => confirm('Delete this record? This cannot be undone.') && run(() => api.remove(entity, id), 'Deleted')}
                    className={`${btn} bg-red-600 text-white`}>Delete</button>
                )}
              </>
            )
          }} />
        )}
      </div>

      {meta && meta.total > 0 && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1 disabled:opacity-40">Previous</button>
          <span>Page {meta.page} of {meta.pages} ({meta.total.toLocaleString()} records)</span>
          <button disabled={page >= meta.pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      )}

      {editing && (
        <FormModal
          title={`${editing === 'new' ? 'Add' : 'Edit'} ${cfg.title.toLowerCase()}`}
          fields={fields}
          row={editing === 'new' ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
