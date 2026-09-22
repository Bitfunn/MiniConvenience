import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly']

function rangeStart(period) {
  const n = new Date()
  const d = new Date(n)
  if (period === 'daily')   d.setHours(0, 0, 0, 0)
  if (period === 'weekly')  { d.setDate(n.getDate() - n.getDay()); d.setHours(0, 0, 0, 0) }
  if (period === 'monthly') { d.setDate(1); d.setHours(0, 0, 0, 0) }
  if (period === 'yearly')  { d.setMonth(0, 1); d.setHours(0, 0, 0, 0) }
  return d.toISOString()
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState('daily')
  const [sales, setSales] = useState([])
  const [borrowers, setBorrowers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase.from('sales')
        .select(`
          id, total, quantity, payment_type, created_at,
          products(name),
          borrowers(name)
        `)
        .gte('created_at', rangeStart(period))
        .order('created_at', { ascending: false }),
      supabase.from('borrowers').select('id, name, total_debt, is_paid'),
    ])
    setSales(s || []); setBorrowers(b || [])
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
  let cash = 0, utang = 0, items = 0
  const counts = {}

  sales.forEach(s => {
    const amt = Number(s.total)
    if (s.payment_type === 'cash') cash += amt
    else utang += amt
    items += s.quantity

    const name = s.products?.name || 'Deleted product'
    if (!counts[name]) counts[name] = { name, qty: 0, revenue: 0 }
    counts[name].qty     += s.quantity
    counts[name].revenue += amt
  })

  const top10 = Object.values(counts)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)

  const revenue = cash + utang
  const unpaid = borrowers
    .filter(b => !b.is_paid && Number(b.total_debt) > 0)
    .reduce((a, b) => a + Number(b.total_debt), 0)

  return { revenue, cash, utang, items, top10, unpaid, txns: sales.length }
}, [sales, borrowers])

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">
            Welcome back, <strong>{profile?.full_name}</strong>
            {' · '}
            {profile?.role === 'superadmin' ? 'Superadmin'
              : profile?.gender === 'female' ? 'Tindera' : 'Tindero'}
          </p>
        </div>
        <div className="segmented">
          {PERIODS.map(p => (
            <button key={p}
              className={p === period ? 'seg active' : 'seg'}
              onClick={() => setPeriod(p)}>
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <section className="kpis">
        <div className="kpi dark">
          <span>Total sales ({period})</span>
          <strong>₱{stats.revenue.toFixed(2)}</strong>
        </div>
        <div className="kpi">
          <span>Cash sales</span>
          <strong>₱{stats.cash.toFixed(2)}</strong>
        </div>
        <div className="kpi">
          <span>Utang sales</span>
          <strong>₱{stats.utang.toFixed(2)}</strong>
        </div>
        <div className="kpi">
          <span>Items sold</span>
          <strong>{stats.items}</strong>
        </div>
        <div className="kpi">
          <span>Transactions</span>
          <strong>{stats.txns}</strong>
        </div>
        <div className="kpi">
          <span>Outstanding utang</span>
          <strong>₱{stats.unpaid.toFixed(2)}</strong>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
  <h3>Top 10 most-purchased products</h3>
  {stats.top10.length ? (
    <div className="scroll">
      <table className="table compact">
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Product</th>
            <th className="right">Qty</th>
            <th className="right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {stats.top10.map((p, i) => (
            <tr key={p.name}>
              <td className="muted">{i + 1}</td>
              <td><strong>{p.name}</strong></td>
              <td className="right">{p.qty}</td>
              <td className="right muted">₱{p.revenue.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="muted">No sales yet for this period.</p>
  )}
</div>

        <div className="card">
          <h3>Recent sales</h3>
          <div className="scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Type</th>
                  <th>Borrower</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 20).map(s => (
                  <tr key={s.id}>
                    <td>{s.products?.name || '—'}</td>
                    <td>{s.quantity}</td>
                    <td>
                      <span className={`pill ${s.payment_type}`}>
                        {s.payment_type}
                      </span>
                    </td>
                    <td className="muted">
                      {s.borrowers?.name || '—'}
                    </td>
                    <td className="right">₱{Number(s.total).toFixed(2)}</td>
                  </tr>
                ))}
                {!sales.length && !loading && (
                  <tr><td colSpan="5" className="muted center">No sales in range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}