import type { ReactNode } from 'react'
import AuthOrbitBackground from './AuthOrbitBackground'

// Envoltorio compartido de Login/Registro: mismo fondo con degradado de
// marca + escudos orbitando + nombre de la porra, para que estas dos
// pantallas dejen de sentirse un formulario genérico aparte y vayan en
// consonancia con el resto de la app (que ya usa este verde+dorado en el
// Navbar, Fantasy, etc.).
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4 py-10">
      <AuthOrbitBackground />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-4xl">🏆</span>
          <h1 className="text-2xl font-bold text-white">Porra Abueloncha</h1>
          <p className="text-sm font-medium text-gold-400">2026 · LaLiga</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-black/30">{children}</div>
      </div>
    </div>
  )
}
