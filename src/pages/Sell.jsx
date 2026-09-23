import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import CartPanel from '../components/CartPanel'

export default function Sell() {
  const [products, setProducts]   = useState([])
  const [borrowers, setBorrowers] = useState([])
  const [search, setSearch]       = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [cart, setCart]           = useState([])
  const [msg, setMsg]             = useState(null)
  const [loading, setLoading]     = useState(true)

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
    setProducts(p || [])
    setBorrowers(b || [])
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

  // In-cart quantity map, so the table can show "2 in cart"
  const inCart = useMemo(() => {
    const m = {}
    cart.forEach(x => { m[x.product_id] = x.quantity })
    return m
  }, [cart])

  function addToCart(product) {
    setMsg(null)
    setCart(c => {
      const existing = c.find(x => x.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.quantity) {
          setMsg({ type: 'error', text: `Only ${product.quantity} in stock for ${product.name}` })
          return c
        }
        return c.map(x =>
          x.product_id === product.id
            ? { ...x, quantity: x.quantity + 1 }
            : x
        )
      }
      if (product.quantity <= 0) {
        setMsg({ type: 'error', text: `${product.name} is out of stock` })
        return c
      }
      return [...c, {
        product_id: product.id,
        name:       product.name,
        price:      Number(product.price),
        quantity:   1,
        stock:      product.quantity,
      }]
    })
  }

  function updateQty(productId, qty) {
    setCart(c => c.map(x => {
      if (x.product_id !== productId) return x
      const q = Math.max(1, Math.min(qty, x.stock))
      return { ...x, quantity: q }
    }))
  }

  function removeItem(productId) {
    setCart(c => c.filter(x => x.product_id !== productId))
  }

  async function checkout({ payment_type, borrower_id }) {
    const items = cart.map(x => ({
      product_id: x.product_id,
      quantity:   x.quantity,
    }))
    const { error } = await supabase.rpc('record_sale_batch', {
      p_items:        items,
      p_payment_type: payment_type,
      p_borrower_id:  borrower_id,
    })
    if (error) throw error

    await load()               // refresh stock counts
    setCart([])
    setMsg({ type: 'ok', text: `Sale recorded (${items.length} item${items.length === 1 ? '' : 's'}).` })
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h2>Sell</h2>
          <p className="muted">Search a product, add it to the cart, then checkout once.</p>
        </div>
      </header>

      {msg && (
        <div className={msg.type === 'ok' ? 'ok' : 'error'} onClick={() => setMsg(null)}>
          {msg.text}
        </div>
      )}

      <div className="sell-layout">
        {/* Left: product picker */}
        <div className="sell-products">
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
                  {filtered.map(p => {
                    const cartQty = inCart[p.id] || 0
                    const left    = p.quantity - cartQty

                    return (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          {cartQty > 0 && (
                            <span className="pill cash" style={{ marginLeft: 8 }}>
                              {cartQty} in cart
                            </span>
                          )}
                        </td>
                        <td className="muted">{p.categories?.name || '—'}</td>
                        <td className="right">
                          <span className={left <= 5 ? 'low' : ''}>{left}</span>
                        </td>
                        <td className="right">₱{Number(p.price).toFixed(2)}</td>
                        <td className="right">
                          <button
                            className="btn small dark"
                            disabled={left <= 0}
                            onClick={() => addToCart(p)}
                          >
                            {left <= 0 ? 'No stock' : '+ Add'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
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
        </div>

        {/* Right: cart */}
        <CartPanel
          cart={cart}
          borrowers={borrowers}
          onUpdateQty={updateQty}
          onRemove={removeItem}
          onClear={() => setCart([])}
          onCheckout={checkout}
        />
      </div>
    </div>
  )
}