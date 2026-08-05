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
//
// `justify-between` en el contenedor exterior (en vez de flex-1 + padding en
// el bloque central) es lo que garantiza que el hueco entre la cinta de
// arriba y el título sea EXACTAMENTE igual al hueco entre la tarjeta y la
// cinta de abajo: con solo 3 hijos (cinta, contenido, cinta), justify-between
// reparte el espacio sobrante en dos huecos iguales alrededor del del medio,
// sin depender de paddings sumados aparte que puedan desequilibrarlo.
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 py-3">
      <TeamMarquee direction="left" />

      <div className="flex flex-col items-center gap-6 px-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-4xl">🏆</span>
          <h1 className="text-2xl font-bold text-white">Porra Abueloncha</h1>
          <p className="text-sm font-medium text-gold-400">2026 · LaLiga</p>
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl shadow-black/30">{children}</div>

        {/* Logo de Abueloncha FC muy difuminado, de fondo, bajo la tarjeta --
            puro detalle decorativo, no interactivo. */}
        <img
          src="/badges/abueluchos-fc-badge.png"
          alt=""
          className="h-36 w-36 object-contain opacity-25 blur-[0.5px] sm:h-44 sm:w-44"
        />
      </div>

      <TeamMarquee direction="right" />
    </div>
  )
}
