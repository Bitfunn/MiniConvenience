import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddProductModal({ onClose, onDone }) {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ name: '', quantity: '', category_id: '', price: '' })
  const [newCat, setNewCat] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function loadCats() {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
  }
  useEffect(() => { loadCats() }, [])

  async function createCategory() {
    const name = newCat.trim()
    if (!name) return
    const { data, error } = await supabase
      .from('categories').insert({ name }).select().single()
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setCategories(c => [...c, data].sort((a, b) => a.name.localeCompare(b.name)))
    setForm(f => ({ ...f, category_id: String(data.id) }))
    setNewCat(''); setAddingCat(false)
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('products').insert({
      name: form.name.trim(),
      quantity: Number(form.quantity) || 0,
      category_id: form.category_id ? Number(form.category_id) : null,
      price: Number(form.price) || 0,
    })
    if (error) {
      setMsg({ type: 'error', text: error.message })
      setBusy(false)
    } else {
      onDone()
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="card modal form"
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3>Add Product</h3>

        <label>Product Name
          <input value={form.name} required autoFocus
                 onChange={e => setForm({ ...form, name: e.target.value })}
                 placeholder="e.g. Lucky Me Pancit Canton" />
        </label>

        <label>Quantity
          <input type="number" min="0" required value={form.quantity}
                 onChange={e => setForm({ ...form, quantity: e.target.value })} />
        </label>

        <label>Category
          <div className="row">
            <select value={form.category_id}
                    onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">— None —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="button" className="btn light"
                    onClick={() => setAddingCat(v => !v)}>
              {addingCat ? 'Cancel' : '+ New'}
            </button>
          </div>
        </label>

        {addingCat && (
          <div className="row">
            <input value={newCat} placeholder="New category name"
                   onChange={e => setNewCat(e.target.value)} />
            <button type="button" className="btn dark" onClick={createCategory}>
              Save
            </button>
          </div>
        )}

        <label>Price (₱)
          <input type="number" min="0" step="0.01" required value={form.price}
                 onChange={e => setForm({ ...form, price: e.target.value })} />
        </label>

        {msg && <div className={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</div>}

        <div className="row end">
          <button type="button" className="btn light" onClick={onClose}>Cancel</button>
          <button className="btn dark" disabled={busy}>
            {busy ? 'Saving…' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  )
}