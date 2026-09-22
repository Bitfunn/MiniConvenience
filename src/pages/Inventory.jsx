import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AddProductModal from '../components/AddProductModal'

export default function Inventory() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'superadmin'

  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState({})     // { [id]: { price, quantity } }
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, quantity, price, category_id, categories(name)')
      .order('name')
    setProducts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.categories?.name || '').toLowerCase().includes(q)
    )
  }, [products, search])

  function edit(id, key, val) {
    setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } }))
  }

  async function saveRow(p) {
    const patch = editing[p.id] || {}
    const { error } = await supabase.from('products').update({
      price:    patch.price    != null ? Number(patch.price)    : p.price,
      quantity: patch.quantity != null ? Number(patch.quantity) : p.quantity,
    }).eq('id', p.id)

    setMsg(error
      ? { type: 'error', text: error.message }
      : { type: 'ok', text: `Updated ${p.name}` })
    setEditing(e => ({ ...e, [p.id]: {} }))
    load()
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h2>Inventory</h2>
          <p className="muted">
            {products.length} product{products.length !== 1 ? 's' : ''} in stock.
            {isAdmin && ' You can edit prices and quantities.'}
          </p>
        </div>
        <button className="btn dark" onClick={() => setShowAdd(true)}>
          + Add Product
        </button>
      </header>

      {msg && (
        <div className={msg.type === 'ok' ? 'ok' : 'error'} onClick={() => setMsg(null)}>
          {msg.text}
        </div>
      )}

      <div className="card">
        <div className="search-bar">
          <input
            type="search"
            placeholder="🔍  Search by name or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="btn light" onClick={() => setSearch('')}>Clear</button>
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
                {isAdmin && <th className="right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const d = editing[p.id] || {}
                const dirty = d.price != null || d.quantity != null

                return (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td className="muted">{p.categories?.name || '—'}</td>

                    <td className="right">
                      {isAdmin ? (
                        <input
                          type="number" min="0" className="inline num"
                          value={d.quantity ?? p.quantity}
                          onChange={e => edit(p.id, 'quantity', e.target.value)}
                        />
                      ) : (
                        <span className={p.quantity <= 5 ? 'low' : ''}>{p.quantity}</span>
                      )}
                    </td>

                    <td className="right">
                      {isAdmin ? (
                        <input
                          type="number" min="0" step="0.01" className="inline num"
                          value={d.price ?? p.price}
                          onChange={e => edit(p.id, 'price', e.target.value)}
                        />
                      ) : (
                        `₱${Number(p.price).toFixed(2)}`
                      )}
                    </td>

                    {isAdmin && (
                      <td className="right">
                        <button
                          className="btn small dark"
                          disabled={!dirty}
                          onClick={() => saveRow(p)}
                        >
                          Save
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
              {!filtered.length && !loading && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="muted center">
                    {products.length ? 'No matches.' : 'No products yet — click + Add Product.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onDone={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}