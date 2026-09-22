import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import SellModal from '../components/SellModal'

export default function Sell() {
  const [products, setProducts] = useState([])
  const [borrowers, setBorrowers] = useState([])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selling, setSelling] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: b }] = await Promise.all([
      supabase.from('products')
        .select('id, name, quantity, price, category_id, categories(id, name)')
        .order('name'),
      supabase.from('borrowers')
        .select('id, name, total_debt, is_paid')
        .order('name'),
    ])
    setProducts(p || []); setBorrowers(b || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const categories = useMemo(() => {
    const map = new Map()
    products.forEach(p => {
      if (p.categories) map.set(p.categories.id, p.categories.name)
    })
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p => {
      if (categoryId && String(p.category_id) !== categoryId) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.categories?.name || '').toLowerCase().includes(q)
      )
    })
  }, [products, search, categoryId])

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h2>Sell</h2>
          <p className="muted">Search a product and hit Sell to record the transaction.</p>
        </div>
      </header>

      <div className="card">
        <div className="search-bar">
          <input
            type="search"
            placeholder="🔍  Search products by name or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {(search || categoryId) && (
            <button className="btn light"
                    onClick={() => { setSearch(''); setCategoryId('') }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="scroll tall">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="right">Stock</th>
                <th className="right">Price</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td className="muted">{p.categories?.name || '—'}</td>
                  <td className="right">
                    <span className={p.quantity <= 5 ? 'low' : ''}>{p.quantity}</span>
                  </td>
                  <td className="right">₱{Number(p.price).toFixed(2)}</td>
                  <td className="right">
                    <button
                      className="btn small dark"
                      disabled={p.quantity <= 0}
                      onClick={() => setSelling(p)}
                    >
                      {p.quantity <= 0 ? 'Out of stock' : 'Sell'}
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading && (
                <tr>
                  <td colSpan="5" className="muted center">
                    {products.length
                      ? 'No products match your search.'
                      : 'No products yet. Add one in Inventory.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selling && (
        <SellModal
          product={selling}
          borrowers={borrowers}
          onClose={() => setSelling(null)}
          onDone={() => { setSelling(null); load() }}
        />
      )}
    </div>
  )
}