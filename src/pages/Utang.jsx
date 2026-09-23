import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AddUtangModal from '../components/AddUtangModal'
import AddBorrowerModal from '../components/AddBorrowerModal'
import PayModal from '../components/PayModal'

export default function Utang() {
  const navigate = useNavigate()

  const [borrowers, setBorrowers] = useState([])
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(null)
  // modal: { type: 'utang' } | { type: 'pay', borrower } | { type: 'borrower' }
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('borrowers').select('*').order('total_debt', { ascending: false }),
      supabase.from('products').select('id, name, price, quantity').order('name'),
    ])
    setBorrowers(b || []); setProducts(p || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const active = useMemo(
    () => borrowers.filter(b => !b.is_paid && Number(b.total_debt) > 0),
    [borrowers]
  )
  const paid = useMemo(
    () => borrowers.filter(b => b.is_paid || Number(b.total_debt) <= 0),
    [borrowers]
  )
  const grandTotal = active.reduce((a, b) => a + Number(b.total_debt), 0)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h2>UTANG</h2>
          <p className="muted">Borrowers, balances, and credit history.</p>
        </div>
        <div className="row">
          <button className="btn dark" onClick={() => setModal({ type: 'borrower' })}>
            + New Borrower
          </button>
        </div>
      </header>

      <section className="kpis">
        <div className="kpi dark">
          <span>Total debt</span>
          <strong>₱{grandTotal.toFixed(2)}</strong>
        </div>
        <div className="kpi">
          <span>Active borrowers</span>
          <strong>{active.length}</strong>
        </div>
        <div className="kpi">
          <span>Fully paid</span>
          <strong>{paid.length}</strong>
        </div>
      </section>

      {/* Active borrowers */}
      <section className="card">
        <h3>Active borrowers</h3>
        <div className="scroll tall">
          <table className="table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Contact</th>
                <th className="right">Total debt</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map(b => (
                <tr key={b.id}>
                  <td>
                    <Link className="link-strong" to={`/utang/borrower/${b.id}`}>
                      {b.name}
                    </Link>
                  </td>
                  <td className="muted">
                    {b.phone || '—'}
                    {b.address && <div className="small">{b.address}</div>}
                  </td>
                  <td className="right debt">₱{Number(b.total_debt).toFixed(2)}</td>
                  <td className="right nowrap">
                    <button className="btn small dark"
                            onClick={() => setModal({ type: 'pay', borrower: b })}>
                      Update
                    </button>
                    <button className="btn small light"
                            onClick={() => setModal({ type: 'utang', presetId: b.id })}>
                      + Utang
                    </button>
                  </td>
                </tr>
              ))}
              {!active.length && !loading && (
                <tr><td colSpan="4" className="muted center">
                  No active utang. Everyone's settled. 🎉
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fully paid */}
      <section className="card">
        <h3>Fully paid</h3>
        <div className="scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Contact</th>
                <th className="right">Status</th>
              </tr>
            </thead>
            <tbody>
              {paid.map(b => (
                <tr key={b.id}>
                  <td>
                    <Link className="link-strong" to={`/utang/borrower/${b.id}`}>
                      {b.name}
                    </Link>
                  </td>
                  <td className="muted">{b.phone || '—'}</td>
                  <td className="right">
                    <span className="pill cash">paid</span>
                  </td>
                </tr>
              ))}
              {!paid.length && (
                <tr><td colSpan="3" className="muted center">Nobody here yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      {modal?.type === 'utang' && (
        <AddUtangModal
          borrowers={active}                          // for the "Existing" dropdown
          products={products}
          presetBorrowerId={modal.presetId}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load() }}
        />
      )}

      {modal?.type === 'borrower' && (
        <AddBorrowerModal
          onClose={() => setModal(null)}
          onDone={b => { setModal(null); load(); navigate(`/utang/borrower/${b.id}`) }}
        />
      )}

      {modal?.type === 'pay' && (
        <PayModal
          borrower={modal.borrower}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}