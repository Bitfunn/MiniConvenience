import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddUtangModal({ borrowers, products, presetBorrowerId, onClose, onDone }) {
  const [mode, setMode] = useState(presetBorrowerId ? 'existing' : 'new')

  // Existing-borrower mode
  const [borrowerId, setBorrowerId] = useState(presetBorrowerId ? String(presetBorrowerId) : '')

  // New-borrower mode
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [savedBorrower, setSavedBorrower] = useState(null)   // { id, name, ... } after save
  const [savingBorrower, setSavingBorrower] = useState(false)

  // Product + qty
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const product = useMemo(
    () => products.find(p => String(p.id) === productId),
    [products, productId]
  )
  const total = product ? (Number(product.price) * qty).toFixed(2) : '0.00'

  const resolvedBorrowerId =
    mode === 'existing' ? borrowerId
    : savedBorrower     ? String(savedBorrower.id)
    : null

  const canRecord = !!resolvedBorrowerId && !!productId && qty > 0 && !busy

  async function saveNewBorrower() {
    if (!form.name.trim()) { setErr('Name is required'); return }
    setSavingBorrower(true); setErr('')
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
    setSavingBorrower(false)
    if (error) { setErr(error.message); return }
    setSavedBorrower(data)
  }

  async function submit(e) {
    e.preventDefault()
    if (!canRecord) return
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('record_sale', {
      p_product_id:   Number(productId),
      p_quantity:     qty,
      p_payment_type: 'utang',
      p_borrower_id:  Number(resolvedBorrowerId),
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onDone()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card modal form" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>Add Utang</h3>

        {/* ---------- Step 1: Who ---------- */}
        <div className="segmented wide">
          <button type="button"
                  className={mode === 'new' ? 'seg active' : 'seg'}
                  onClick={() => { setMode('new'); setErr('') }}>
            New borrower
          </button>
          <button type="button"
                  className={mode === 'existing' ? 'seg active' : 'seg'}
                  onClick={() => { setMode('existing'); setErr('') }}>
            Existing borrower
          </button>
        </div>

        {mode === 'new' && !savedBorrower && (
          <>
            <label>Full name *
              <input required value={form.name}
                     onChange={e => setForm({ ...form, name: e.target.value })}
                     placeholder="e.g. Mang Tonyo" />
            </label>
            <label>Phone
              <input value={form.phone}
                     onChange={e => setForm({ ...form, phone: e.target.value })}
                     placeholder="09xx xxx xxxx" />
            </label>
            <label>Address
              <input value={form.address}
                     onChange={e => setForm({ ...form, address: e.target.value })}
                     placeholder="Purok / Street" />
            </label>
            <label>Notes
              <input value={form.notes}
                     onChange={e => setForm({ ...form, notes: e.target.value })}
                     placeholder="Optional" />
            </label>
            <button type="button" className="btn light"
                    onClick={saveNewBorrower} disabled={savingBorrower}>
              {savingBorrower ? 'Saving…' : '+ Save borrower'}
            </button>
          </>
        )}

        {mode === 'new' && savedBorrower && (
          <div className="ok">
            ✓ Borrower saved: <strong>{savedBorrower.name}</strong>
            <button type="button" className="btn small light"
                    onClick={() => { setSavedBorrower(null); setForm({ name: '', phone: '', address: '', notes: '' }) }}
                    style={{ marginLeft: 10 }}>
              Change
            </button>
          </div>
        )}

        {mode === 'existing' && (
          <label>Borrower
            <select value={borrowerId}
                    onChange={e => setBorrowerId(e.target.value)}>
              <option value="">— Select borrower —</option>
              {borrowers.map(b => {
                const debt = Number(b.total_debt) || 0
                const tag = debt > 0 ? `owes ₱${debt.toFixed(2)}` : 'no debt'
                return (
                  <option key={b.id} value={b.id}>
                    {b.name} ({tag})
                  </option>
                )
              })}
            </select>
          </label>
        )}

        {/* ---------- Step 2: What ---------- */}
        <hr className="divider" />
        <p className="muted small">Select product and quantity</p>

        <label>Product
          <select value={productId} onChange={e => setProductId(e.target.value)}>
            <option value="">— Select —</option>
            {products.map(p => (
              <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                {p.name} · ₱{Number(p.price).toFixed(2)} ({p.quantity} left)
              </option>
            ))}
          </select>
        </label>

        <label>Quantity
          <input type="number" min="1" value={qty}
                 onChange={e => setQty(Math.max(1, +e.target.value))} />
        </label>

        <div className="total">Credit total: <strong>₱{total}</strong></div>

        {err && <div className="error">{err}</div>}

        <div className="row end">
          <button type="button" className="btn light" onClick={onClose}>Cancel</button>
          <button className="btn dark" disabled={!canRecord}>
            {busy ? 'Saving…' : 'Record utang'}
          </button>
        </div>
      </form>
    </div>
  )
}