import type { ReactNode } from 'react'
import TeamMarquee from './TeamMarquee'

// Envoltorio compartido de Login/Registro: fondo con degradado de marca +
// dos cintas de escudos (arriba/abajo, en direcciones opuestas) + nombre de
// la porra, para que estas dos pantallas dejen de sentirse un formulario
// genérico aparte y vayan en consonancia con el resto de la app (que ya usa
// este verde+dorado en el Navbar, Fantasy, etc.).
//
// Las cintas van en su PROPIA fila de la columna (flex-col), no "detrás" de
// la tarjeta -- así siempre son visibles desde el primer render, sin
// importar cuánto ocupe la tarjeta ni dónde caiga encima.
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
      <TeamMarquee direction="left" />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-4xl">🏆</span>
          <h1 className="text-2xl font-bold text-white">Porra Abueloncha</h1>
          <p className="text-sm font-medium text-gold-400">2026 · LaLiga</p>
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl shadow-black/30">{children}</div>
      </div>

      <TeamMarquee direction="right" />
    </div>
  )
}
