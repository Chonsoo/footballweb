import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import OnboardingWizard from './OnboardingWizard'
import ProfileSetupModal from './ProfileSetupModal'
import { useAuth } from '../context/AuthContext'
import { getNavTabs, activeTabIndex } from '../lib/navTabs'

// Umbral mínimo (px) para considerar el gesto un swipe de navegación, y
// cuánto más horizontal que vertical debe ser para no confundirlo con un
// scroll normal de la página.
const SWIPE_THRESHOLD = 60

// Año de creación de la app -- el © del footer se calcula solo a partir de
// aquí (2026 mientras estemos en 2026, "2026–2027" en cuanto cambie el año,
// etc.), así nunca se queda desactualizado por olvido de tocarlo a mano cada
// temporada.
const FIRST_YEAR = 2026
const CURRENT_YEAR = new Date().getFullYear()
const COPYRIGHT_YEAR = CURRENT_YEAR > FIRST_YEAR ? `${FIRST_YEAR}–${CURRENT_YEAR}` : `${FIRST_YEAR}`

export default function Layout({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return

    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y

    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return

    const tabs = getNavTabs()
    const currentIndex = activeTabIndex(location.pathname)
    if (currentIndex === -1) return

    // Deslizar a la izquierda (dx negativo) = avanzar a la siguiente pestaña.
    // Deslizar a la derecha (dx positivo) = volver a la anterior.
    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1
    if (nextIndex < 0 || nextIndex >= tabs.length) return

    navigate(tabs[nextIndex].path)
  }

  if (profile && !profile.favorite_team) {
    return <ProfileSetupModal />
  }

  if (profile && !profile.onboarding_completed && !dismissed) {
    return <OnboardingWizard onDone={() => setDismissed(true)} />
  }

  return (
    // Mismo lenguaje visual que el login/onboarding (AuthShell): degradado
    // verde de marca de fondo en TODA la app, no solo en las pantallas de
    // bienvenida -- para que no "parezcan dos apps diferentes". El escudo
    // del equipo favorito se ve grande y difuminado (antes casi invisible a
    // opacity 0.06 sobre gris) porque ahora contrasta con el verde en vez de
    // perderse sobre un fondo casi del mismo tono.
    // "min-h-dvh" (no "min-h-screen"/100vh) a propósito: en móvil, 100vh
    // mide el alto de la pantalla con la barra de dirección Y la barra de
    // botones del navegador COLAPSADAS (el "viewport grande"), que es más
    // alto que lo que realmente se ve con esas barras visibles. Con
    // contenido corto, esa diferencia se notaba como un hueco vacío enorme
    // antes de llegar al footer, que encima quedaba fuera de pantalla y
    // había que hacer scroll para verlo aunque "cupiera" de sobra. 100dvh
    // (dynamic viewport height) se ajusta al alto que de verdad se ve en
    // cada momento.
    <div className="relative min-h-dvh bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
      {profile?.favorite_team && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-center bg-no-repeat opacity-[0.12]"
          style={{ backgroundImage: `url(/badges/${profile.favorite_team}.png)`, backgroundSize: '60vh' }}
        />
      )}
      <div className="relative z-10 flex min-h-dvh flex-col">
        <Navbar />
        <main
          key={location.pathname}
          className="page-enter mx-auto w-full max-w-4xl flex-1 px-4 py-6"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {children}
        </main>
        <footer className="mt-auto bg-brand-950 px-4 py-4 text-center text-xs text-brand-300">
          © {COPYRIGHT_YEAR} Porra Abueloncha LaLiga. Que gane el mejor abueloncho.
        </footer>
      </div>
    </div>
  )
}
