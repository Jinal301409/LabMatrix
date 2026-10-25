import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'
const label = 'mb-1 block text-sm font-medium text-slate-600'

export default function Signup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [batches, setBatches] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.signupBatches().then(setBatches).catch(() => setError('Could not load batches'))
  }, [])

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    const f = new FormData(e.target)
    const password = f.get('password')

    if (password !== f.get('confirm')) return setError('Passwords do not match')

    setBusy(true)
    setError('')
    try {
      await api.signup({
        full_name: f.get('full_name'),
        email: f.get('email'),
        password,
        enrollment_no: f.get('enrollment_no'),
        batch_id: Number(f.get('batch_id')),
      })
      navigate('/login', { state: { notice: 'Account created. Please sign in.' }, replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-semibold">Create your account</h2>

        <div>
          <label htmlFor="full_name" className={label}>Full name</label>
          <input id="full_name" name="full_name" required minLength={2} maxLength={100} autoComplete="name" className={input} />
        </div>
        <div>
          <label htmlFor="email" className={label}>College email</label>
          <input id="email" name="email" type="email" required autoComplete="username" className={input} />
        </div>
        <div>
          <label htmlFor="enrollment_no" className={label}>Enrollment number</label>
          <input id="enrollment_no" name="enrollment_no" required maxLength={20} className={input} />
        </div>
        <div>
          <label htmlFor="batch_id" className={label}>Batch</label>
          <select id="batch_id" name="batch_id" required defaultValue="" className={input}>
            <option value="" disabled>Select your batch</option>
            {batches.map((b) => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.batch_name} ({b.branch}, Sem {b.semester})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="password" className={label}>Password</label>
          <input id="password" name="password" type="password" required minLength={8} maxLength={72}
            autoComplete="new-password" className={input} />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>
        </div>
        <div>
          <label htmlFor="confirm" className={label}>Confirm password</label>
          <input id="confirm" name="confirm" type="password" required autoComplete="new-password" className={input} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button disabled={busy} className="w-full rounded-lg bg-teal-700 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
          {busy ? 'Creating account...' : 'Sign up'}
        </button>
        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-teal-700 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}