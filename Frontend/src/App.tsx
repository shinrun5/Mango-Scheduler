import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EmployeeLayout } from './components/EmployeeLayout'
import { ManagerLayout } from './components/ManagerLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './lib/auth'
import { homePathForRole } from './lib/roles'
import { Availability } from './pages/Availability'
import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'
import { Login } from './pages/Login'
import { Marketplace } from './pages/Marketplace'
import { MyAvailability } from './pages/MyAvailability'
import { Overview } from './pages/Overview'
import { MyShifts } from './pages/MyShifts'
import { Profile } from './pages/Profile'
import { Register } from './pages/Register'
import { Requests } from './pages/Requests'
import { Setup } from './pages/Setup'
import { Stores } from './pages/Stores'
import { Workers } from './pages/Workers'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-body text-muted-ink">Loading…</div>
    )
  }
  return <Navigate to={user ? homePathForRole(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/setup" element={<Setup />} />

        <Route element={<ProtectedRoute role={['MANAGER', 'OWNER']} />}>
          <Route element={<ManagerLayout />}>
            <Route path="/overview" element={<Overview />} />
            <Route path="/schedule" element={<Dashboard />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/my-availability" element={<MyAvailability />} />
            <Route path="/history" element={<History />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="EMPLOYEE" />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/my-shifts" element={<MyShifts />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/availability" element={<Availability />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
