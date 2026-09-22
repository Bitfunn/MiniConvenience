import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Auto-close the drawer on route change (mobile)
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const roleLabel =
    profile?.role === 'superadmin' ? 'Superadmin'
    : profile?.gender === 'female' ? 'Tindera'
    : 'Tindero'

  const isAdmin = profile?.role === 'superadmin'

  const links = (
    <>
      <NavLink to="/" end>Dashboard</NavLink>
      <NavLink to="/sell">Sell</NavLink>
      <NavLink to="/inventory">Inventory</NavLink>
      <NavLink to="/utang">UTANG</NavLink>
      <NavLink to="/logs">Logs</NavLink>
      {isAdmin && <NavLink to="/reports">Reports</NavLink>}
      {isAdmin && <NavLink to="/users">Users</NavLink>}
    </>
  )

  return (
    <div className="app">
      {/* Mobile top bar */}
      <header className="topbar">
        <button className="hamburger" aria-label="Open menu"
                onClick={() => setOpen(true)}>
          <span /><span /><span />
        </button>
        <div className="topbar-brand">ORBITA STORE</div>
        <button className="topbar-logout" onClick={signOut}>Logout</button>
      </header>

      {/* Overlay behind the mobile drawer */}
      <div className={`drawer-backdrop ${open ? 'show' : ''}`}
           onClick={() => setOpen(false)} />

      {/* Sidebar / drawer */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <button className="drawer-close" aria-label="Close menu"
                onClick={() => setOpen(false)}>×</button>

        <div className="brand">
          <span className="dot" />
          <h1>ORBITA<br />STORE</h1>
        </div>

        <nav className="nav">{links}</nav>

        <div className="side-foot">
          <div className="who">
            <strong>{profile?.full_name}</strong>
            <span>{roleLabel}</span>
          </div>
          <button className="btn ghost" onClick={signOut}>Logout</button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}