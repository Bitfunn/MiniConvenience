import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Logs() {
  const [tab, setTab] = useState('sales')
  const [sales, setSales] = useState([])
  const [utang, setUtang] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: u }] = await Promise.all([
      supabase.from('sales')
        .select(`
          id, total, quantity, unit_price, payment_type, created_at, group_id,
          products(name),
          borrowers(name),
          profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('utang_transactions')
        .select(`
          id, type, amount, note, created_at,
          borrowers(name),
          products(name),
          profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500),
    ])
    setSales(s || []); setUtang(u || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sales
    return sales.filter(s =>
      (s.products?.name || '').toLowerCase().includes(q) ||
      (s.borrowers?.name || '').toLowerCase().includes(q) ||
      (s.profiles?.full_name || '').toLowerCase().includes(q)
    )
  }, [sales, search])

  const filteredUtang = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return utang
    return utang.filter(t =>
      (t.borrowers?.name || '').toLowerCase().includes(q) ||
      (t.products?.name || '').toLowerCase().includes(q) ||
      (t.profiles?.full_name || '').toLowerCase().includes(q)
    )
  }, [utang, search])

  const fmtTime = ts => new Date(ts).toLocaleString()

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h2>Transaction Logs</h2>
          <p className="muted">Latest 500 entries per log.</p>
        </div>
        <div className="segmented">
          <button className={tab === 'sales' ? 'seg active' : 'seg'}
                  onClick={() => setTab('sales')}>
            Sales ({sales.length})
          </button>
          <button className={tab === 'utang' ? 'seg active' : 'seg'}
                  onClick={() => setTab('utang')}>
            Utang ({utang.length})
          </button>
        </div>
      </header>

      <div className="card">
        <div className="search-bar">
          <input
            type="search"
            placeholder={`🔍  Search ${tab === 'sales' ? 'sales' : 'utang'} by product, borrower, or staff…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="btn light" onClick={() => setSearch('')}>Clear</button>
          )}
          <button className="btn light" onClick={load} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {tab === 'sales' ? (
        <div className="card">
          <div className="scroll tall">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th className="right">Qty</th>
                  <th className="right">Unit</th>
                  <th>Type</th>
                  <th>Borrower</th>
                  <th>Staff</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(s => (
                  <tr key={s.id}>
                    <td className="muted nowrap">{fmtTime(s.created_at)}</td>
                    <td><strong>{s.products?.name || '—'}</strong></td>
                    <td className="right">{s.quantity}</td>
                    <td className="right">₱{Number(s.unit_price).toFixed(2)}</td>
                    <td><span className={`pill ${s.payment_type}`}>{s.payment_type}</span></td>
                    <td className="muted">{s.borrowers?.name || '—'}</td>
                    <td className="muted">{s.profiles?.full_name || '—'}</td>
                    <td className="right"><strong>₱{Number(s.total).toFixed(2)}</strong></td>
                  </tr>
                ))}
                {!filteredSales.length && !loading && (
                  <tr><td colSpan="8" className="muted center">No sales logs.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="scroll tall">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Borrower</th>
                  <th>Product</th>
                  <th className="right">Amount</th>
                  <th>Staff</th>
                  <th>Basket</th>
                </tr>
              </thead>
              <tbody>
                {filteredUtang.map(t => (
                  <tr key={t.id}>
                    <td className="muted nowrap">{fmtTime(t.created_at)}</td>
                    <td>
                      <span className={`pill ${t.type === 'credit' ? 'utang' : 'cash'}`}>
                        {t.type === 'credit' ? 'utang' : 'payment'}
                      </span>
                    </td>
                    <td><strong>{t.borrowers?.name || '—'}</strong></td>
                    <td className="muted">{t.products?.name || '—'}</td>
                    <td className="right">
                      <strong className={t.type === 'credit' ? 'debt' : ''}>
                        ₱{Number(t.amount).toFixed(2)}
                      </strong>
                    </td>
                    <td className="muted">{t.profiles?.full_name || '—'}</td>
                    <td className="muted small nowrap">
                      {s.group_id ? s.group_id.slice(0, 6) : '—'}
                    </td>
                  </tr>
                ))}
                {!filteredUtang.length && !loading && (
                  <tr><td colSpan="7" className="muted center">No utang logs.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}