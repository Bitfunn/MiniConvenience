import { useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { name: '', phone: '', address: '', notes: '' }

export default function AddBorrowerModal({ onClose, onDone }) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { data, error } = await supabase
      .from('borrowers')
      .insert({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single()
    setBusy(false)
    if (error) { setErr(error.message); return }
    onDone(data)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card modal form" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>New Borrower</h3>

        <label>Full name *
          <input required autoFocus value={form.name}
                 onChange={e => setForm({ ...form, name: e.target.value })}
                 placeholder="e.g. Aling Nena" />
        </label>

        <label>Phone
          <input value={form.phone}
                 onChange={e => setForm({ ...form, phone: e.target.value })}
                 placeholder="09xx xxx xxxx" />
        </label>

        <label>Address
          <input value={form.address}
                 onChange={e => setForm({ ...form, address: e.target.value })}
                 placeholder="Purok / Street / Barangay" />
        </label>

        <label>Notes
          <textarea rows="2" value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional — e.g. friend of Mang Tonyo" />
        </label>

        {err && <div className="error">{err}</div>}

        <div className="row end">
          <button type="button" className="btn light" onClick={onClose}>Cancel</button>
          <button className="btn dark" disabled={busy}>
            {busy ? 'Saving…' : 'Save borrower'}
          </button>
        </div>
      </form>
    </div>
  )
}