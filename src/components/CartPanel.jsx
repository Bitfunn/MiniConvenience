import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const LS_KEY = 'orbita:lastBorrowerId'

export default function CartPanel({
  cart, borrowers,
  onUpdateQty, onRemove, onClear, onCheckout,
}) {
  const [paymentType, setPaymentType] = useState('cash')
  const [borrowerId, setBorrowerId] = useState(
    () => localStorage.getItem(LS_KEY) || ''
  )
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  // Drop remembered borrower if they no longer exist
  useEffect(() => {
    if (borrowerId && !borrowers.some(b => String(b.id) === String(borrowerId))) {
      setBorrowerId('')
      localStorage.removeItem(LS_KEY)
    }
  }, [borrowers, borrowerId])

  const total = useMemo(
    () => cart.reduce((s, x) => s + x.price * x.quantity, 0),
    [cart]
  )
  const itemCount = cart.reduce((s, x) => s + x.quantity, 0)

  function pickBorrower(id) {
    setBorrowerId(id)
    if (id) localStorage.setItem(LS_KEY, id)
    else     localStorage.removeItem(LS_KEY)
  }

  async function resolveBorrowerId() {
    if (borrowerId) return Number(borrowerId)
    if (!newName.trim()) throw new Error('Select or enter a borrower')
    const { data, error } = await supabase
      .from('borrowers')
      .insert({ name: newName.trim() })
      .select().single()
    if (error) throw error
    localStorage.setItem(LS_KEY, String(data.id))
    return data.id
  }

  async function checkout() {
    if (!cart.length) return
    setBusy(true); setErr('')
    try {
      let bid = null
      if (paymentType === 'utang') bid = await resolveBorrowerId()

      await onCheckout({ payment_type: paymentType, borrower_id: bid })

      // Reset local state on success
      setNewName('')
      setPaymentType('cash')
      setMobileOpen(false)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Floating summary on mobile */}
      <button
        className="cart-fab"
        onClick={() => setMobileOpen(true)}
        disabled={!cart.length}
      >
        🛒 {itemCount} item{itemCount === 1 ? '' : 's'} · ₱{total.toFixed(2)}
      </button>

      {/* Overlay for mobile drawer */}
      {mobileOpen && (
        <div className="cart-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`cart-panel ${mobileOpen ? 'open' : ''}`}>
        <div className="cart-head">
          <h3>Cart ({itemCount})</h3>
          <div className="row">
            {cart.length > 0 && (
              <button className="btn small light" onClick={onClear}>
                Clear
              </button>
            )}
            <button
              className="btn small light cart-close"
              onClick={() => setMobileOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="cart-items">
          {cart.map(item => (
            <div key={item.product_id} className="cart-item">
              <div className="cart-item-main">
                <strong>{item.name}</strong>
                <span className="muted small">
                  ₱{item.price.toFixed(2)} each
                </span>
              </div>

              <div className="cart-item-qty">
                <button
                  className="qty-btn"
                  onClick={() => onUpdateQty(item.product_id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={item.stock}
                  value={item.quantity}
                  onChange={e =>
                    onUpdateQty(item.product_id, Number(e.target.value) || 1)
                  }
                />
                <button
                  className="qty-btn"
                  onClick={() => onUpdateQty(item.product_id, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                >
                  +
                </button>
              </div>

              <div className="cart-item-total">
                ₱{(item.price * item.quantity).toFixed(2)}
              </div>

              <button
                className="cart-item-remove"
                onClick={() => onRemove(item.product_id)}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}

          {!cart.length && (
            <p className="muted center" style={{ padding: '24px 0' }}>
              Cart is empty. Add products from the list.
            </p>
          )}
        </div>

        {/* Payment */}
        <div className="cart-pay">
          <div className="segmented wide">
            <button
              type="button"
              className={paymentType === 'cash' ? 'seg active' : 'seg'}
              onClick={() => setPaymentType('cash')}
            >
              Cash
            </button>
            <button
              type="button"
              className={paymentType === 'utang' ? 'seg active' : 'seg'}
              onClick={() => setPaymentType('utang')}
            >
              Utang
            </button>
          </div>

          {paymentType === 'utang' && (
            <>
              <select
                value={borrowerId}
                onChange={e => pickBorrower(e.target.value)}
              >
                <option value="">— New borrower —</option>
                {borrowers.map(b => {
                  const debt = Number(b.total_debt) || 0
                  const tag  = debt > 0 ? `owes ₱${debt.toFixed(2)}` : 'no debt'
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} ({tag})
                    </option>
                  )
                })}
              </select>

              {!borrowerId && (
                <input
                  placeholder="New borrower name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              )}
            </>
          )}

          <div className="cart-total">
            <span>Total</span>
            <strong>₱{total.toFixed(2)}</strong>
          </div>

          {err && <div className="error">{err}</div>}

          <button
            className="btn dark cart-checkout"
            disabled={!cart.length || busy}
            onClick={checkout}
          >
            {busy ? 'Saving…' : `Complete Sale · ₱${total.toFixed(2)}`}
          </button>
        </div>
      </aside>
    </>
  )
}