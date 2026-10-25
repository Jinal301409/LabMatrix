import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import EntityPage from './pages/EntityPage'
import Attendance from './pages/Attendance'
import Reports from './pages/Reports'
import QueryLab from './pages/QueryLab'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="e/:entity" element={<EntityPage />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="query-lab" element={<QueryLab />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}