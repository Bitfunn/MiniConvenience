import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { email: '', password: '', full_name: '', gender: 'male', role: 'user' }

export default function Users() {
  const [users, setUsers]     = useState([])
  const [draft, setDraft]     = useState({})
  const [msg, setMsg]         = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [busy, setBusy]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setRefreshing(true)
    const { data, error } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false })
    if (error) setMsg({ type: 'error', text: error.message })
    setUsers(data || [])
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  function edit(id, key, val) {
    setDraft(d => ({ ...d, [id]: { ...d[id], [key]: val } }))
  }

  async function save(u) {
    const patch = draft[u.id] || {}
    const { error } = await supabase.from('profiles')
      .update({
        full_name: patch.full_name ?? u.full_name,
        gender:    patch.gender    ?? u.gender,
        role:      patch.role      ?? u.role,
      })
      .eq('id', u.id)
    setMsg(error
      ? { type: 'error', text: error.message }
      : { type: 'ok', text: `Saved ${patch.full_name ?? u.full_name}` })
    setDraft(d => ({ ...d, [u.id]: {} }))
    load()
  }

  async function addUser(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      }
    )
    const json = await res.json()

    if (!res.ok) {
      setMsg({ type: 'error', text: json.error || 'Failed to create user' })
    } else {
      setMsg({ type: 'ok', text: `Created ${form.full_name} (${form.email})` })
      setForm(EMPTY)
      setShowAdd(false)
      load()
    }
    setBusy(false)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h2>Users</h2>
          <p className="muted">
            Manage Tindero / Tindera and other Superadmins.
          </p>
        </div>
        <div className="row">
          <button className="btn light" onClick={load} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button className="btn dark" onClick={() => setShowAdd(v => !v)}>
            {showAdd ? 'Cancel' : '+ Add User'}
          </button>
        </div>
      </header>

      {msg && <div className={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</div>}

      {showAdd && (
        <form className="card form" onSubmit={addUser}>
          <h3>New User</h3>
          <div className="grid-2">
            <label>Full name
              <input required value={form.full_name}
                     onChange={e => setForm({ ...form, full_name: e.target.value })}
                     placeholder="e.g. Maria Santos" />
            </label>
            <label>Email
              <input type="email" required value={form.email}
                     onChange={e => setForm({ ...form, email: e.target.value })}
                     placeholder="maria@orbitastore.com" />
            </label>
            <label>Password
              <input type="text" required minLength={6} value={form.password}
                     onChange={e => setForm({ ...form, password: e.target.value })}
                     placeholder="Min. 6 characters" />
            </label>
            <label>Gender
              <select value={form.gender}
                      onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="male">male (→ Tindero)</option>
                <option value="female">female (→ Tindera)</option>
              </select>
            </label>
            <label>Role
              <select value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="user">user (Tindero / Tindera)</option>
                <option value="superadmin">superadmin</option>
              </select>
            </label>
          </div>
          <div className="row end">
            <button type="button" className="btn light" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
            <button className="btn dark" disabled={busy}>
              {busy ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="scroll tall">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Gender</th><th>Role</th><th /></tr>
            </thead>
            <tbody>
              {users.map(u => {
                const d = draft[u.id] || {}
                return (
                  <tr key={u.id}>
                    <td>
                      <input className="inline" value={d.full_name ?? u.full_name}
                             onChange={e => edit(u.id, 'full_name', e.target.value)} />
                    </td>
                    <td>
                      <select value={d.gender ?? u.gender}
                              onChange={e => edit(u.id, 'gender', e.target.value)}>
                        <option value="male">male</option>
                        <option value="female">female</option>
                      </select>
                    </td>
                    <td>
                      <select value={d.role ?? u.role}
                              onChange={e => edit(u.id, 'role', e.target.value)}>
                        <option value="user">user</option>
                        <option value="superadmin">superadmin</option>
                      </select>
                    </td>
                    <td className="right">
                      <button className="btn small dark" onClick={() => save(u)}>
                        Save
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!users.length && !refreshing && (
                <tr><td colSpan="4" className="muted center">
                  No profiles found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}