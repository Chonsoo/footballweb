import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 text-base font-medium rounded ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const links = (
    <>
      <NavLink to="/" end onClick={() => setOpen(false)} className={linkClass}>
        Ranking
      </NavLink>
      <NavLink to="/apuestas-iniciales" onClick={() => setOpen(false)} className={linkClass}>
        Apuestas iniciales
      </NavLink>
      <NavLink to="/apuestas-semana" onClick={() => setOpen(false)} className={linkClass}>
        Apuestas de la semana
      </NavLink>
      <NavLink to="/jornadas" onClick={() => setOpen(false)} className={linkClass}>
        Jornadas
      </NavLink>
      {profile?.is_admin && (
        <NavLink to="/admin" onClick={() => setOpen(false)} className={linkClass}>
          Admin
        </NavLink>
      )}
    </>
  )

  const mobileLinks = (
    <>
      <NavLink to="/" end onClick={() => setOpen(false)} className={mobileLinkClass}>
        Ranking
      </NavLink>
      <NavLink to="/apuestas-iniciales" onClick={() => setOpen(false)} className={mobileLinkClass}>
        Apuestas iniciales
      </NavLink>
      <NavLink to="/apuestas-semana" onClick={() => setOpen(false)} className={mobileLinkClass}>
        Apuestas de la semana
      </NavLink>
      <NavLink to="/jornadas" onClick={() => setOpen(false)} className={mobileLinkClass}>
        Jornadas
      </NavLink>
      {profile?.is_admin && (
        <NavLink to="/admin" onClick={() => setOpen(false)} className={mobileLinkClass}>
          Admin
        </NavLink>
      )}
    </>
  )

  return (
    <nav className="border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="hidden items-center gap-1 md:flex">{links}</div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center rounded p-2 text-gray-700 hover:bg-gray-100 md:hidden"
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div className="hidden items-center gap-3 text-sm text-gray-600 md:flex">
          <span>{profile?.username}</span>
          <button onClick={signOut} className="text-red-600 hover:underline">
            Salir
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-1 border-t border-gray-200 px-4 py-3 md:hidden">
          {mobileLinks}
          <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3 text-sm text-gray-600">
            <span>{profile?.username}</span>
            <button
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="text-red-600 hover:underline"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
