import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Ranking from './pages/Ranking'
import SeasonBets from './pages/SeasonBets'
import WeeklyBets from './pages/WeeklyBets'
import Matchdays from './pages/Matchdays'
import MatchdayDetail from './pages/MatchdayDetail'
import Admin from './pages/Admin'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Ranking />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/apuestas-iniciales"
          element={
            <ProtectedRoute>
              <Layout>
                <SeasonBets />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/apuestas-semana"
          element={
            <ProtectedRoute>
              <Layout>
                <WeeklyBets />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/jornadas"
          element={
            <ProtectedRoute>
              <Layout>
                <Matchdays />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/jornadas/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <MatchdayDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout>
                  <Admin />
                </Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
