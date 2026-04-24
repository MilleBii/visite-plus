import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function PrivateRoute({ children, rolesAutorises }) {
  const { session, role, loading } = useAuth()

  if (loading) return null

  if (!session) return <Navigate to="/bo/login" replace />

  if (rolesAutorises && role && !rolesAutorises.includes(role)) {
    return <Navigate to="/bo" replace />
  }

  return children
}
