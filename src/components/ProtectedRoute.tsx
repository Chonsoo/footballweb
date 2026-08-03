import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando…</div>
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando…</div>
  if (!profile?.is_admin) return <Navigate to="/" replace />

  return <>{children}</>
}
