import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AddUtangModal from '../components/AddUtangModal'
import PayModal from '../components/PayModal'

export default function BorrowerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [borrower, setBorrower] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [products, setProducts] = useState([])
  const [allBorrowers, setAllBorrowers] = useState([])
  const [modal, setModal] = useState(null)   // 'utang' | 'pay'
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: t }, { data: p }, { data: all }] = await Promise.all([
      supabase.from('borrowers').select('*').eq('id', id).single(),
      supabase.from('utang_transactions')
        .select('id, type, amount, note, created_at, products(name)')
        .eq('borrower_id', id)
        .order('created_at', { ascending: true }),
      supabase.from('products').select('id, name, price, quantity').order('name'),
      supabase.from('borrowers').select('id, name, total_debt, is_paid').order('name'),
    ])
    setBorrower(b)
    setTransactions(t || [])
    setProducts(p || [])
    setAllBorrowers(all || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // Running balance (oldest → newest) then reversed for display
  const ledger = useMemo(() => {
    let bal = 0
    const withBalance = transactions.map(tx => {
      if (tx.type === 'credit') bal += Number(tx.amount)
      else bal -= Number(tx.amount)
      return { ...tx, balance_after: bal }
    })
    return [...withBalance].reverse()
  }, [transactions])

  const totals = useMemo(() => {
    let credit = 0, paid = 0
    transactions.forEach(tx => {
      if (tx.type === 'credit') credit += Number(tx.amount)
      else paid += Number(tx.amount)
    })
    return { credit, paid, balance: credit - paid }
  }, [transactions])

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>
  if (!borrower) return <div className="page"><p className="muted">Borrower not found.</p></div>

  const fmt = ts => new Date(ts).toLocaleString()

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <button className="btn small light" onClick={() => navigate('/utang')}>
            ← Back to UTANG
          </button>
          <h2 style={{ marginTop: 12 }}>{borrower.name}</h2>
          <p className="muted">
            {borrower.is_paid || Number(borrower.total_debt) <= 0
              ? <span className="pill cash">fully paid</span>
              : <span className="pill utang">owes ₱{Number(borrower.total_debt).toFixed(2)}</span>}
            {' '}
            {borrower.phone && <>· {borrower.phone} </>}
            {borrower.address && <>· {borrower.address}</>}
          </p>
        </div>
        <div className="row">
          <button className="btn light" onClick={() => setModal('utang')}>
            + Add Utang
          </button>
          <button className="btn dark"
                  disabled={totals.balance <= 0}
                  onClick={() => setModal('pay')}>
            Bayad Utang
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="kpis">
        <div className="kpi dark">
          <span>Outstanding balance</span>
          <strong>₱{totals.balance.toFixed(2)}</strong>
        </div>
        <div className="kpi">
          <span>Total Utang</span>
          <strong>₱{totals.credit.toFixed(2)}</strong>
        </div>
        <div className="kpi">
          <span>Total paid</span>
          <strong>₱{totals.paid.toFixed(2)}</strong>
        </div>
        <div className="kpi">
          <span>Transactions</span>
          <strong>{transactions.length}</strong>
        </div>
      </section>

      {/* Borrower info card */}
      {(borrower.phone || borrower.address || borrower.notes) && (
        <div className="card">
          <h3>Borrower details</h3>
          <div className="info-grid">
            {borrower.phone   && <><span className="muted">Phone</span><strong>{borrower.phone}</strong></>}
            {borrower.address && <><span className="muted">Address</span><strong>{borrower.address}</strong></>}
            {borrower.notes   && <><span className="muted">Notes</span><strong>{borrower.notes}</strong></>}
          </div>
        </div>
      )}

      {/* Ledger */}
      <div className="card">
        <h3>Utang history</h3>
        <div className="scroll tall">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Item / Note</th>
                <th className="right">Amount</th>
                <th className="right">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(tx => (
                <tr key={tx.id}>
                  <td className="muted nowrap">{fmt(tx.created_at)}</td>
                  <td>
                    <span className={`pill ${tx.type === 'credit' ? 'utang' : 'cash'}`}>
                      {tx.type === 'credit' ? 'utang' : 'payment'}
                    </span>
                  </td>
                  <td>
                    {tx.type === 'credit'
                      ? (tx.products?.name || '—')
                      : (tx.note || 'Payment')}
                  </td>
                  <td className="right">
                    <strong className={tx.type === 'credit' ? 'debt' : ''}>
                      {tx.type === 'credit' ? '+' : '−'}₱{Number(tx.amount).toFixed(2)}
                    </strong>
                  </td>
                  <td className="right muted">₱{tx.balance_after.toFixed(2)}</td>
                </tr>
              ))}
              {!ledger.length && (
                <tr><td colSpan="5" className="muted center">
                  No transactions yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'utang' && (
        <AddUtangModal
          borrowers={allBorrowers}
          products={products}
          presetBorrowerId={borrower.id}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load() }}
        />
      )}

      {modal === 'pay' && (
        <PayModal
          borrower={borrower}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}