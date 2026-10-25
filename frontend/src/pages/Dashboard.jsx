import { useEffect, useState } from 'react'
import { api } from '../api/client'
import DataTable from '../components/DataTable'

const sum = (rows, k) => rows.reduce((a, r) => a + Number(r[k] || 0), 0)
const TONE = {
  ok: 'border-emerald-500',
  warn: 'border-amber-500',
  empty: 'border-slate-300 bg-slate-50',
}

function Kpi({ value, label, tone = 'border-teal-600' }) {
  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 ${tone}`}>
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [views, setViews] = useState(null)
  const [viewsError, setViewsError] = useState('')

  // loaded separately, so one failing does not hide the other
  useEffect(() => {
    api.ql.stats().then(setStats).catch((e) => setStatsError(e.message))
    Promise.all([api.view('lab_health'), api.view('expiring_licenses'), api.view('lab_usage')])
      .then(([health, licenses, usage]) => setViews({ health, licenses, usage }))
      .catch((e) => setViewsError(e.message))
  }, [])

  const cols = (rows) => Object.keys(rows[0] || {})
  const attention = stats ? stats.filter((s) => s.level !== 'ok').length : 0

  return (
    <>
      <h1 className="mb-5 text-2xl font-semibold">Dashboard</h1>

      <h2 className="mb-2 text-lg font-semibold">Database overview</h2>
      {statsError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-red-700">{statsError}</p>}
      {!stats && !statsError && <p className="mb-4 text-slate-500">Loading...</p>}
      {stats && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Kpi value={stats.length} label="Tables" />
            <Kpi value={stats.reduce((a, s) => a + s.count, 0).toLocaleString()} label="Total records" />
            <Kpi value={attention} label="Tables that need attention" tone={attention ? 'border-amber-500' : 'border-emerald-500'} />
          </div>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.table} className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 ${TONE[s.level]}`}>
                <div className="text-sm text-slate-500">{s.label}</div>
                <div className="text-2xl font-semibold">{s.count.toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-600">{s.message}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-2 text-lg font-semibold">Labs and licences</h2>
      {viewsError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-red-700">{viewsError}</p>}
      {views && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi value={views.health.length} label="Labs" />
            <Kpi value={sum(views.health, 'total_computers')} label="Computers" />
            <Kpi value={sum(views.health, 'under_maintenance')} label="Under maintenance" tone="border-amber-500" />
            <Kpi value={views.licenses.length} label="Licences expiring in 60 days" tone="border-red-500" />
          </div>
          {[['Lab health', views.health], ['Licences expiring soon', views.licenses], ['Most-used labs', views.usage]].map(([title, rows]) => (
            <section key={title} className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <DataTable rows={rows} columns={cols(rows)} />
            </section>
          ))}
        </>
      )}
    </>
  )
}
