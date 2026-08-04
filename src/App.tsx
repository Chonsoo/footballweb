import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Ranking from './pages/Ranking'
import Home from './pages/Home'
import SeasonBets from './pages/SeasonBets'
import WeeklyBets from './pages/WeeklyBets'
import Matchdays from './pages/Matchdays'
import MatchdayDetail from './pages/MatchdayDetail'
import Admin from './pages/Admin'
import Oraculo from './pages/Oraculo'
import MisApuestas from './pages/MisApuestas'
import ApuestasDetalladas from './pages/ApuestasDetalladas'
import Informacion from './pages/Informacion'
import Reglamento from './pages/Reglamento'
import FantasyPreview from './pages/FantasyPreview'

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
                <Home />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clasificacion"
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
          path="/oraculo"
          element={
            <ProtectedRoute>
              <Layout>
                <Oraculo />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-apuestas"
          element={
            <ProtectedRoute>
              <Layout>
                <MisApuestas />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/apuestas-detalladas"
          element={
            <ProtectedRoute>
              <Layout>
                <ApuestasDetalladas />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/informacion"
          element={
            <ProtectedRoute>
              <Layout>
                <Informacion />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reglamento"
          element={
            <ProtectedRoute>
              <Layout>
                <Reglamento />
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
          path="/fantasy-preview"
          element={
            <ProtectedRoute>
              <Layout>
                <FantasyPreview />
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
