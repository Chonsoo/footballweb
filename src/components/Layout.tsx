import { useState, type ReactNode } from 'react'
import Navbar from './Navbar'
import OnboardingWizard from './OnboardingWizard'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  if (profile && !profile.onboarding_completed && !dismissed) {
    return <OnboardingWizard onDone={() => setDismissed(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}
