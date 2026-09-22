import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const LS_KEY = 'orbita:lastBorrowerId'

export default function SellModal({ product, borrowers, onClose, onDone }) {
  const [qty, setQty] = useState(1)
  const [payment, setPayment] = useState('cash')
  const [borrowerId, setBorrowerId] = useState(
    () => localStorage.getItem(LS_KEY) || ''
  )
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Drop the remembered id if that borrower no longer exists
  useEffect(() => {
    if (borrowerId && !borrowers.some(b => String(b.id) === String(borrowerId))) {
      setBorrowerId('')
      localStorage.removeItem(LS_KEY)
    }
  }, [borrowers, borrowerId])

  // Newest debtors float up, but everyone (paid or not) is shown
  const sortedBorrowers = useMemo(() => {
    return [...borrowers].sort((a, b) => {
      const aDebt = Number(a.total_debt) || 0
      const bDebt = Number(b.total_debt) || 0
      if (aDebt !== bDebt) return bDebt - aDebt
      return a.name.localeCompare(b.name)
    })
  }, [borrowers])

  const total = (Number(product.price) * qty).toFixed(2)

  function pick(id) {
    setBorrowerId(id)
    if (id) localStorage.setItem(LS_KEY, id)
    else     localStorage.removeItem(LS_KEY)
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      let bid = borrowerId ? Number(borrowerId) : null

      if (payment === 'utang' && !bid) {
        if (!newName.trim()) throw new Error('Enter a borrower name')
        const { data, error } = await supabase
          .from('borrowers')
          .insert({ name: newName.trim() })
          .select().single()
        if (error) throw error
        bid = data.id
        localStorage.setItem(LS_KEY, String(bid))
      }

      const { error } = await supabase.rpc('record_sale', {
        p_product_id:   product.id,
        p_quantity:     qty,
        p_payment_type: payment,
        p_borrower_id:  payment === 'utang' ? bid : null,
      })
      if (error) throw error
      onDone()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>Sell — {product.name}</h3>
        <p className="muted">
          ₱{Number(product.price).toFixed(2)} each · {product.quantity} in stock
        </p>

        <label>Quantity
          <input type="number" min="1" max={product.quantity}
                 value={qty} onChange={e => setQty(Math.max(1, +e.target.value))} />
        </label>

        <div className="row">
          <label className="radio">
            <input type="radio" checked={payment === 'cash'}
                   onChange={() => setPayment('cash')} /> Cash
          </label>
          <label className="radio">
            <input type="radio" checked={payment === 'utang'}
                   onChange={() => setPayment('utang')} /> Utang
          </label>
        </div>

        {payment === 'utang' && (
          <>
            <label>Borrower
              <select value={borrowerId} onChange={e => pick(e.target.value)}>
                <option value="">— New borrower —</option>
                {sortedBorrowers.map(b => {
                  const debt = Number(b.total_debt) || 0
                  const tag = debt > 0 ? `owes ₱${debt.toFixed(2)}` : 'fully paid'
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} ({tag})
                    </option>
                  )
                })}
              </select>
            </label>

            {borrowerId && (
              <p className="muted small">
                Tip: the borrower is remembered next time you sell on utang.
              </p>
            )}

            {!borrowerId && (
              <label>New borrower name
                <input value={newName} onChange={e => setNewName(e.target.value)}
                       placeholder="e.g. Aling Nena" />
              </label>
            )}
          </>
        )}

        <div className="total">Total: <strong>₱{total}</strong></div>
        {err && <div className="error">{err}</div>}

        <div className="row end">
          <button type="button" className="btn light" onClick={onClose}>Cancel</button>
          <button className="btn dark" disabled={busy}>
            {busy ? 'Saving…' : 'Confirm sale'}
          </button>
        </div>
      </form>
    </div>
  )
}