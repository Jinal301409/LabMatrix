import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ACCESS, ENTITIES } from '../config/entities'

const link = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const groups = {}
  ACCESS[user.role].forEach((k) => (groups[ENTITIES[k].group] ??= []).push(k))

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className={`${open ? 'block' : 'hidden'} bg-slate-900 p-4 md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto`}>
        <div className="px-3 pb-4 text-xl font-semibold text-white">Lab<span className="text-teal-300">Matrix</span></div>
        <nav onClick={() => setOpen(false)}>
          <NavLink to="/" end className={link}>Dashboard</NavLink>
          {['Admin', 'Faculty'].includes(user.role) && <NavLink to="/attendance" className={link}>Attendance</NavLink>}
          <NavLink to="/reports" className={link}>Reports</NavLink>
          {user.role === 'Admin' && <NavLink to="/query-lab" className={link}>Query Lab</NavLink>}
          {Object.entries(groups).map(([g, keys]) => (
            <div key={g}>
              <div className="px-3 pb-1 pt-4 text-xs uppercase tracking-wide text-slate-500">{g}</div>
              {keys.map((k) => <NavLink key={k} to={`/e/${k}`} className={link}>{ENTITIES[k].title}</NavLink>)}
            </div>
          ))}
        </nav>
        <div className="mt-6 border-t border-slate-700 px-3 pt-4 text-xs text-slate-400">
          {user.full_name || user.email} ({user.role})
        </div>
        <button onClick={logout} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700">Sign out</button>
      </aside>
      <main className="w-full max-w-6xl p-4 md:p-8">
        <button onClick={() => setOpen(!open)} className="mb-4 rounded-lg border border-slate-300 px-3 py-1.5 text-sm md:hidden">Menu</button>
        <Outlet />
      </main>
    </div>
  )
}
