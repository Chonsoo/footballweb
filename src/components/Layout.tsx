import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import OnboardingWizard from './OnboardingWizard'
import ProfileSetupModal from './ProfileSetupModal'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const location = useLocation()

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
      <div className="relative z-10">
        <Navbar />
        <main key={location.pathname} className="page-enter mx-auto max-w-4xl px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
