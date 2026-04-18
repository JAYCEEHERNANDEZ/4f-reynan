import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'
import Analytics from './pages/Analytics'
import SMS from './pages/SMS'
import Settings from './pages/Settings'
import Staff from './pages/Staff'
import StaffDashboard from './pages/StaffDashboard'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" />
  return children
}

function AdminRoute({ children }) {
  const { role, loading } = useAuth()
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>
  if (role !== 'admin') return <Navigate to="/dashboard" />
  return children
}

function DashboardSwitch() {
  const { role } = useAuth()
  return role === 'staff' ? <StaffDashboard /> : <Dashboard />
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardSwitch />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
        <Route path="sms" element={<AdminRoute><SMS /></AdminRoute>} />
        <Route path="staff" element={<AdminRoute><Staff /></AdminRoute>} />
        <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            fontSize: '14px',
          },
        }}
      />
      <AppRoutes />
    </AuthProvider>
  )
}
