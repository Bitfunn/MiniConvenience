import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Sell from './pages/Sell'
import Inventory from './pages/Inventory'
import Utang from './pages/Utang'
import Users from './pages/Users'
import Reports from './pages/Reports'
import Logs from './pages/Logs'   
import BorrowerDetail from './pages/BorrowerDetail'

export default function App() {
  const { session, profile, loading } = useAuth()

  if (loading) return <div className="splash">Loading ORBITA STORE…</div>
  if (!session) return <Login />

  const isAdmin = profile?.role === 'superadmin'

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/sell"      element={<Sell />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/utang"              element={<Utang />} />
        <Route path="/utang/borrower/:id" element={<BorrowerDetail />} /> 
        <Route path="/logs"      element={<Logs />} />
        {isAdmin && <Route path="/reports" element={<Reports />} />}
        {isAdmin && <Route path="/users"   element={<Users />} />}
         <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}