import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PayModal({ borrower, onClose, onDone }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const balance = Number(borrower.total_debt)
  const remaining = Math.max(balance - Number(amount || 0), 0)

  async function submit(e) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) { setErr('Enter a valid amount'); return }
    setBusy(true); setErr('')

    const { error: payErr } = await supabase.rpc('record_payment', {
      p_borrower_id: borrower.id,
      p_amount:      amt,
    })
    if (payErr) { setBusy(false); setErr(payErr.message); return }

    // Attach the note to the most recent utang_transaction row if provided
    if (note.trim()) {
      await supabase.from('utang_transactions')
        .update({ note: note.trim() })
        .eq('borrower_id', borrower.id)
        .eq('type', 'payment')
        .order('created_at', { ascending: false })
        .limit(1)
    }

    setBusy(false)
    onDone()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card modal form" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>Record Payment</h3>
        <p className="muted">
          Borrower: <strong>{borrower.name}</strong> · owes{' '}
          <strong>₱{balance.toFixed(2)}</strong>
        </p>

        <label>Amount to pay (₱)
          <input type="number" min="0" step="0.01" required autoFocus
                 value={amount}
                 onChange={e => setAmount(e.target.value)} />
        </label>

        <div className="row">
          <button type="button" className="btn light"
                  onClick={() => setAmount(String(balance))}>
            Pay full (₱{balance.toFixed(2)})
          </button>
          <button type="button" className="btn light"
                  onClick={() => setAmount((balance / 2).toFixed(2))}>
            Half
          </button>
        </div>

        <label>Note (optional)
          <input value={note} onChange={e => setNote(e.target.value)}
                 placeholder="e.g. partial payment" />
        </label>

        {amount && (
          <div className="total">
            Remaining after payment: <strong>₱{remaining.toFixed(2)}</strong>
          </div>
        )}

        {err && <div className="error">{err}</div>}

        <div className="row end">
          <button type="button" className="btn light" onClick={onClose}>Cancel</button>
          <button className="btn dark" disabled={busy}>
            {busy ? 'Saving…' : 'Confirm payment'}
          </button>
        </div>
      </form>
    </div>
  )
}