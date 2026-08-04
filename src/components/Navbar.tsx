import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EditProfileModal from './EditProfileModal'
import TabStrip from './TabStrip'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { isInitialPhaseClosed } from '../lib/deadlines'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded whitespace-nowrap ${
    isActive ? 'bg-brand-700 text-white' : 'text-gray-700 hover:bg-brand-50'
  }`

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 text-base font-medium rounded ${isActive ? 'bg-brand-700 text-white' : 'text-gray-700 hover:bg-brand-50'}`

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [betsOpen, setBetsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const betsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const betsActive = location.pathname.startsWith('/apuestas-')
  const favoriteTeam = LALIGA_TEAMS_2026_27.find((t) => t.id === profile?.favorite_team)
  const initialClosed = isInitialPhaseClosed()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (betsRef.current && !betsRef.current.contains(e.target as Node)) setBetsOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function closeAll() {
    setOpen(false)
    setBetsOpen(false)
    setProfileMenuOpen(false)
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-brand-100 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={linkClass}>
            Inicio
          </NavLink>
          <NavLink to="/clasificacion" className={linkClass}>
            Clasificación
          </NavLink>

          <div ref={betsRef} className="relative">
            <button
              type="button"
              onClick={() => setBetsOpen((v) => !v)}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded whitespace-nowrap ${
                betsActive ? 'bg-brand-700 text-white' : 'text-gray-700 hover:bg-brand-50'
              }`}
            >
              Apuestas
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {betsOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded border border-gray-200 bg-white py-1 shadow-lg">
                {!initialClosed && (
                  <NavLink
                    to="/apuestas-iniciales"
                    onClick={() => setBetsOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-700 hover:bg-gray-50'}`
                    }
                  >
                    Apuestas iniciales
                  </NavLink>
                )}
                <NavLink
                  to="/apuestas-semana"
                  onClick={() => setBetsOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-700 hover:bg-gray-50'}`
                  }
                >
                  Apuestas flash
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/oraculo" className={linkClass}>
            El oráculo
          </NavLink>
          <NavLink to="/mis-apuestas" className={linkClass}>
            Mis apuestas
          </NavLink>
          <NavLink to="/apuestas-detalladas" className={linkClass}>
            Apuestas detalladas
          </NavLink>
          <NavLink to="/informacion" className={linkClass}>
            Información
          </NavLink>
          <NavLink to="/reglamento" className={linkClass}>
            Reglamento oficial
          </NavLink>
        </div>

        <NavLink to="/" end className="flex min-w-0 items-center gap-2 md:hidden">
          {favoriteTeam?.badge && <img src={favoriteTeam.badge} alt="" className="h-7 w-7 shrink-0 object-contain" />}
          <span className="truncate text-sm font-semibold text-brand-800">🏆 Porra Abueloncha 2026 LaLiga</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center justify-center rounded p-2 text-gray-700 hover:bg-gray-100 md:hidden"
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

        <div ref={profileRef} className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            className="flex items-center justify-center rounded-full p-1.5 text-gray-600 hover:bg-gray-100"
            aria-label="Perfil"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </button>
          {profileMenuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded border border-gray-200 bg-white py-1 shadow-lg">
              <p className="truncate border-b border-gray-100 px-3 py-2 text-xs text-gray-400">{profile?.username}</p>
              <button
                onClick={() => {
                  setProfileMenuOpen(false)
                  setEditOpen(true)
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Mis datos
              </button>
              {profile?.is_admin && (
                <button
                  onClick={() => {
                    setProfileMenuOpen(false)
                    navigate('/admin')
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Admin
                </button>
              )}
              <button
                onClick={() => {
                  setProfileMenuOpen(false)
                  signOut()
                }}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      <TabStrip />

      {open && (
        <div className="space-y-1 border-t border-gray-200 px-4 py-3 md:hidden">
          <NavLink to="/" end onClick={closeAll} className={mobileLinkClass}>
            Inicio
          </NavLink>
          <NavLink to="/clasificacion" onClick={closeAll} className={mobileLinkClass}>
            Clasificación
          </NavLink>

          <p className="px-3 pt-2 text-xs font-semibold uppercase text-gray-400">Apuestas</p>
          {!initialClosed && (
            <NavLink to="/apuestas-iniciales" onClick={closeAll} className={mobileLinkClass}>
              Apuestas iniciales
            </NavLink>
          )}
          <NavLink to="/apuestas-semana" onClick={closeAll} className={mobileLinkClass}>
            Apuestas flash
          </NavLink>

          <NavLink to="/oraculo" onClick={closeAll} className={mobileLinkClass}>
            El oráculo
          </NavLink>
          <NavLink to="/mis-apuestas" onClick={closeAll} className={mobileLinkClass}>
            Mis apuestas
          </NavLink>
          <NavLink to="/apuestas-detalladas" onClick={closeAll} className={mobileLinkClass}>
            Apuestas detalladas
          </NavLink>
          <NavLink to="/informacion" onClick={closeAll} className={mobileLinkClass}>
            Información
          </NavLink>
          <NavLink to="/reglamento" onClick={closeAll} className={mobileLinkClass}>
            Reglamento oficial
          </NavLink>

          <div className="mt-2 flex flex-col gap-1 border-t border-gray-200 pt-3">
            <p className="px-3 text-xs text-gray-400">{profile?.username}</p>
            <button
              onClick={() => {
                closeAll()
                setEditOpen(true)
              }}
              className="block px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Mis datos
            </button>
            {profile?.is_admin && (
              <NavLink to="/admin" onClick={closeAll} className={mobileLinkClass}>
                Admin
              </NavLink>
            )}
            <button
              onClick={() => {
                closeAll()
                signOut()
              }}
              className="block px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {editOpen && <EditProfileModal onClose={() => setEditOpen(false)} />}
    </nav>
  )
}
