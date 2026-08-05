import type { ReactNode } from 'react'
import TeamMarquee from './TeamMarquee'
import LaLigaMark from './LaLigaMark'

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

      <div className="relative flex flex-col items-center gap-6 px-4">
        {/* Marca de LaLiga de fondo, centrada detrás del título y la tarjeta.
            En rojo real a bastante opacidad se veía como una mancha marrón
            (rojo + verde mezclados) y, a ese tamaño tan grande, se perdían
            los huecos afilados del símbolo y parecía un bloque sólido. Con
            blanco (currentColor + text-white) se mantiene nítido sobre el
            degradado oscuro aunque baje la opacidad, y algo más pequeño para
            que se distinga mejor la silueta en vez de un rombo grande.
            Tamaño de referencia en rem (el mismo de siempre) con un tope de
            vw/vh solo para que NO se recorte en pantallas realmente
            pequeñas -- los topes van holgados (95vw/80vh) para no encoger
            el tamaño en un móvil normal, donde el rem ya entraba bien. */}
        <LaLigaMark className="pointer-events-none absolute left-1/2 top-0 z-0 h-[min(32rem,98vw,85vh)] w-[min(32rem,98vw,85vh)] -translate-x-1/2 text-[#FF4B44] opacity-40 sm:h-[min(40rem,90vw,85vh)] sm:w-[min(40rem,90vw,85vh)] sm:-translate-y-2" />

        <div className="relative z-10 flex flex-col items-center gap-1 text-center">
          <span className="text-4xl">🏆</span>
          <h1 className="text-2xl font-bold text-white">Porra Abueloncha</h1>
          <p className="text-sm font-medium text-gold-400">2026 · LaLiga</p>
        </div>

        <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white/[0.67] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
          {children}
        </div>
      </div>

      <TeamMarquee direction="right" />
    </div>
  )
}
