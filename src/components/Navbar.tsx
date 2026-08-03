import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`

export default function Navbar() {
  const { profile, signOut } = useAuth()

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-1">
        <NavLink to="/" className={linkClass} end>
          Ranking
        </NavLink>
        <NavLink to="/apuestas-iniciales" className={linkClass}>
          Apuestas iniciales
        </NavLink>
        <NavLink to="/jornadas" className={linkClass}>
          Jornadas
        </NavLink>
        {profile?.is_admin && (
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>{profile?.username}</span>
        <button onClick={signOut} className="text-red-600 hover:underline">
          Salir
        </button>
      </div>
    </nav>
  )
}
