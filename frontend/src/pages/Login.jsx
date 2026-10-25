import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notice = location.state?.notice
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    setBusy(true)
    setError('')
    try {
      await login(form.get('email'), form.get('password'))
      navigate('/')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-center bg-slate-900 p-12 text-white md:flex">
        <h1 className="text-4xl font-semibold">Lab<span className="text-teal-300">Matrix</span></h1>
        <p className="mt-4 max-w-md text-slate-300">
          Book labs, track computers and software licences, mark attendance, and get faults fixed, all in one place.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-semibold">Sign in</h2>
          {notice && <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">{notice}</p>}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-600">Email</label>
            <input id="email" name="email" type="email" required autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-600">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600" />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-teal-700 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-slate-600">
            New student?{' '}
            <Link to="/signup" className="font-medium text-teal-700 hover:underline">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  )
}