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
    <div className="relative min-h-screen bg-gray-50">
      {profile?.favorite_team && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-center bg-no-repeat opacity-[0.06]"
          style={{ backgroundImage: `url(/badges/${profile.favorite_team}.png)`, backgroundSize: '60vh' }}
        />
      )}
      <div className="relative z-10 flex min-h-screen flex-col">
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
          © 2026 Porra Abueloncha LaLiga. Que gane el mejor abueloncho.
        </footer>
      </div>
    </div>
  )
}
