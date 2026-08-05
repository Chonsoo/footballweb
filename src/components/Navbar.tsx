import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EditProfileModal from './EditProfileModal'
import ConfirmDialog from './ConfirmDialog'
import TabStrip from './TabStrip'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { isInitialPhaseClosed } from '../lib/deadlines'

// Activo en dorado sólido (mismo acento que el resto de la app para "esto es
// lo seleccionado" -- chips de jornada en Fantasy, pestañas de Admin) en vez
// de un blanco al 20% de opacidad, que sobre la barra ya translúcida casi no
// se distinguía del resto de pestañas.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-semibold rounded whitespace-nowrap ${
    isActive ? 'bg-gold-500 text-brand-950 shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 text-base font-medium rounded ${
    isActive ? 'bg-gold-500 text-brand-950 shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [betsOpen, setBetsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  const betsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const betsActive = location.pathname.startsWith('/apuestas-')
  const favoriteTeam = LALIGA_TEAMS_2026_27.find((t) => t.id === profile?.favorite_team)
  const initialClosed = isInitialPhaseClosed()
  // Dentro del admin no tiene sentido mostrar las pestañas normales de la
  // app (Inicio, Clasificación, Apuestas...) -- no corresponden a nada de lo
  // que se ve ahí, y el panel ya tiene su propia barra de pestañas debajo
  // del título. Se sustituye por un enlace simple para volver.
  const isAdminRoute = location.pathname.startsWith('/admin')

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
    <>
    {/* Mismo lenguaje que el resto de la app ya: barra translúcida "de
        cristal" sobre el verde de marca (Layout), no una barra blanca sólida
        -- así el navbar no rompe la cohesión con el fondo de cada página. */}
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-brand-900/70 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        {isAdminRoute ? (
          <NavLink to="/" className="hidden items-center gap-1.5 px-3 py-2 text-sm font-medium text-white/80 hover:text-white md:flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la app
          </NavLink>
        ) : (
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
                className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded whitespace-nowrap ${
                  betsActive ? 'bg-gold-500 text-brand-950 shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'
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
        )}

        <NavLink to="/" end className="flex min-w-0 items-center gap-2 md:hidden">
          {favoriteTeam?.badge && <img src={favoriteTeam.badge} alt="" className="h-7 w-7 shrink-0 object-contain" />}
          <span className="truncate text-sm font-semibold text-white">🏆 Porra Abueloncha 2026 LaLiga</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center justify-center rounded p-2 text-white/90 hover:bg-white/10 md:hidden"
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
            className="flex items-center justify-center rounded-full p-1.5 text-white/90 hover:bg-white/10"
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
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded border border-gray-200 bg-white py-2 shadow-lg">
              <p className="truncate px-3 pb-2 text-xs text-gray-400">{profile?.username}</p>
              {/* Fila de 3 iconos en vez de botones apilados con texto --
                  mis datos a la izquierda y cerrar sesión a la derecha, que
                  siempre están; admin en medio, que es el que falta para un
                  usuario normal (así el hueco vacío queda en medio, no en un
                  extremo). */}
              <div className="flex items-center justify-around border-t border-gray-100 pt-2">
                <button
                  onClick={() => {
                    setProfileMenuOpen(false)
                    setEditOpen(true)
                  }}
                  title="Mis datos"
                  aria-label="Mis datos"
                  className="rounded-full p-2 text-lg hover:bg-gray-100"
                >
                  👤
                </button>
                {profile?.is_admin ? (
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false)
                      navigate('/admin')
                    }}
                    title="Admin"
                    aria-label="Admin"
                    className="rounded-full p-2 text-lg hover:bg-gray-100"
                  >
                    🛠️
                  </button>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => {
                    setProfileMenuOpen(false)
                    setConfirmSignOut(true)
                  }}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="rounded-full p-2 text-lg hover:bg-red-50"
                >
                  🚪
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isAdminRoute && <TabStrip />}

      {open && (
        <div className="space-y-1 border-t border-white/10 px-4 py-3 md:hidden">
          <NavLink to="/" end onClick={closeAll} className={mobileLinkClass}>
            Inicio
          </NavLink>
          <NavLink to="/clasificacion" onClick={closeAll} className={mobileLinkClass}>
            Clasificación
          </NavLink>

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

          {/* Fila de 3 iconos (mis datos / admin / cerrar sesión) en vez de
              botones de texto apilados -- mis datos y cerrar sesión en los
              extremos, que siempre están; admin en medio, que es el que le
              falta a un usuario normal (hueco vacío en medio, no a un lado). */}
          <div className="mt-2 flex items-center justify-around border-t border-white/10 pt-3">
            <button
              onClick={() => {
                closeAll()
                setEditOpen(true)
              }}
              title="Mis datos"
              aria-label="Mis datos"
              className="rounded-full p-2 text-xl hover:bg-white/10"
            >
              👤
            </button>
            {profile?.is_admin ? (
              <NavLink to="/admin" onClick={closeAll} title="Admin" aria-label="Admin" className="rounded-full p-2 text-xl hover:bg-white/10">
                🛠️
              </NavLink>
            ) : (
              <span />
            )}
            <button
              onClick={() => {
                closeAll()
                setConfirmSignOut(true)
              }}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="rounded-full p-2 text-xl hover:bg-red-500/20"
            >
              🚪
            </button>
          </div>
        </div>
      )}
    </nav>

    {/* Los modales van FUERA de <nav>, no dentro -- <nav> lleva
        backdrop-blur (el "cristal" del navbar) y cualquier elemento con
        backdrop-filter (igual que con transform/filter) pasa a ser el
        "containing block" de sus descendientes position:fixed. Con los
        modales dentro, su "fixed inset-0" quedaba encajado al tamaño y
        posición de la barra de navegación en vez de la pantalla entera --
        de ahí que se vieran como una cajita pequeña pegada arriba en vez de
        un modal centrado a pantalla completa. */}
    {editOpen && <EditProfileModal onClose={() => setEditOpen(false)} />}

    {confirmSignOut && (
      <ConfirmDialog
        title="Cerrar sesión"
        message="¿Seguro que quieres cerrar sesión?"
        confirmLabel="Cerrar sesión"
        danger
        onConfirm={() => {
          setConfirmSignOut(false)
          signOut()
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    )}
    </>
  )
}
