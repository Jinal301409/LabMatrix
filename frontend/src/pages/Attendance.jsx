import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Attendance() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [rows, setRows] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const own = user.role === 'Faculty' ? { faculty_id: user.user_id } : {}
    api.page('sessions', { limit: 200, ...own }).then((r) => setSessions(r.data)).catch((e) => setMessage(e.message))
  }, []) // eslint-disable-line

  const pick = async (id) => {
    setSessionId(id)
    setMessage('')
    if (!id) return setRows([])
    try { setRows(await api.getAttendance(id)) } catch (e) { setMessage(e.message) }
  }

  const setStatus = (studentId, status) =>
    setRows(rows.map((r) => (r.student_id === studentId ? { ...r, status } : r)))

  const save = async () => {
    try {
      await api.saveAttendance(sessionId, rows.map((r) => ({ student_id: r.student_id, status: r.status })))
      setMessage('Attendance saved')
    } catch (e) { setMessage(e.message) }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Attendance</h1>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-sm font-medium text-slate-600">Session</label>
        <select value={sessionId} onChange={(e) => pick(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Select a session</option>
          {sessions.map((s) => (
            <option key={s.session_id} value={s.session_id}>
              {String(s.session_date).slice(0, 10)} | {s.course_code} | {s.batch_name} | {s.topic || `Session ${s.session_id}`}
            </option>
          ))}
        </select>
      </div>
      {message && <p className="mb-4 rounded-lg bg-slate-200 px-3 py-2 text-sm">{message}</p>}
      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500">
              <th className="px-3 py-2">Enrollment</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Status</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{r.enrollment_no}</td>
                  <td className="px-3 py-2">{r.full_name}</td>
                  <td className="px-3 py-2">
                    <select value={r.status} onChange={(e) => setStatus(r.student_id, e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1">
                      {['Present', 'Absent', 'Late'].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={save} className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Save attendance</button>
        </div>
      )}
    </>
  )
}
