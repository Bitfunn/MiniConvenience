import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await signIn(email.trim(), password)
    if (error) setErr(error.message)
    setBusy(false)
  }

  return (
    <div className="login">
      <div className="login-left">
        <h1>ORBITA<br />STORE</h1>
        <p>Inventory &amp; Utang Tracker</p>
        <span className="tag">Sari-sari, simplified.</span>
      </div>

      <div className="login-right">
        <form className="card form" onSubmit={submit}>
          <h2>Sign in</h2>

          <label>Email
            <input type="email" value={email}
                   onChange={e => setEmail(e.target.value)} required />
          </label>

          <label>Password
            <input type="password" value={password}
                   onChange={e => setPassword(e.target.value)} required />
          </label>

          {err && <div className="error">{err}</div>}

          <button className="btn dark" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}