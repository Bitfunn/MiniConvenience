import { useState } from 'react'
import { supabase } from '../lib/supabase'

const today = new Date().toISOString().slice(0, 10)
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().slice(0, 10)

export default function Reports() {
  const [from, setFrom] = useState(monthStart)
  const [to, setTo]     = useState(today)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    const { data } = await supabase
      .from('sales')
      .select('total, quantity, payment_type, created_at, products(name)')
      .gte('created_at', new Date(from).toISOString())
      .lte('created_at', new Date(to + 'T23:59:59').toISOString())
      .order('created_at')

    const map = {}
    ;(data || []).forEach(s => {
      const name = s.products?.name || 'Deleted'
      if (!map[name]) map[name] = { name, qty: 0, revenue: 0, cash: 0, utang: 0 }
      map[name].qty     += s.quantity
      map[name].revenue += Number(s.total)
      map[name][s.payment_type] += Number(s.total)
    })
    setRows(Object.values(map).sort((a, b) => b.revenue - a.revenue))
    setBusy(false)
  }

  function exportCsv() {
    const head = 'Product,Qty Sold,Revenue,Cash,Utang\n'
    const body = rows.map(r =>
      `"${r.name}",${r.qty},${r.revenue.toFixed(2)},${r.cash.toFixed(2)},${r.utang.toFixed(2)}`
    ).join('\n')
    const blob = new Blob([head + body], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `orbita-report-${from}_to_${to}.csv`
    a.click()
  }

  const total = rows.reduce((a, r) => a + r.revenue, 0)

  return (
    <div className="page">
      <header className="page-head">
        <div><h2>Reports</h2><p className="muted">Sales summary by product.</p></div>
      </header>

      <div className="card">
        <div className="row">
          <label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
          <button className="btn dark" onClick={run} disabled={busy}>
            {busy ? 'Generating…' : 'Generate'}
          </button>
          <button className="btn light" onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </button>
        </div>
      </div>

      {!!rows.length && (
        <div className="card">
          <h3>Total: ₱{total.toFixed(2)}</h3>
          <div className="scroll tall">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th><th className="right">Qty</th>
                  <th className="right">Revenue</th><th className="right">Cash</th>
                  <th className="right">Utang</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.name}>
                    <td><strong>{r.name}</strong></td>
                    <td className="right">{r.qty}</td>
                    <td className="right">₱{r.revenue.toFixed(2)}</td>
                    <td className="right">₱{r.cash.toFixed(2)}</td>
                    <td className="right">₱{r.utang.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}