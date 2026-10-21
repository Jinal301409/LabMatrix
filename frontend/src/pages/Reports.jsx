import { useEffect, useState } from 'react'
import { api } from '../api/client'
import DataTable from '../components/DataTable'
import { useAuth } from '../context/AuthContext'

const REPORTS = {
  lab_usage: 'Most-used labs',
  student_attendance: 'Student attendance',
  frequent_maintenance: 'Repeated maintenance',
  expiring_licenses: 'Licence expiry',
  lab_health: 'Lab health',
}

// reports that the server only gives to some roles
const ONLY = {
  student_attendance: ['Admin', 'Faculty'],
  frequent_maintenance: ['Admin', 'Technician'],
}

export default function Reports() {
  const { user } = useAuth()
  const [name, setName] = useState('lab_usage')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api.view(name).then(setRows).catch((e) => { setRows([]); setError(e.message) })
  }, [name])

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Reports</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(REPORTS).filter(([k]) => !ONLY[k] || ONLY[k].includes(user.role)).map(([k, v]) => (
          <button key={k} onClick={() => setName(k)}
            className={`rounded-lg px-3 py-1.5 text-sm ${k === name ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white'}`}>{v}</button>
        ))}
      </div>
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <DataTable rows={rows} columns={Object.keys(rows[0] || {})} />
      </div>
    </>
  )
}
