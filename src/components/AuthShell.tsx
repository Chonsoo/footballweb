import type { ReactNode } from 'react'
import TeamMarquee from './TeamMarquee'
import LaLigaMark from './LaLigaMark'

const DEFAULT_MARK = (
  // Marca de LaLiga de fondo, centrada detrás del título y la tarjeta.
  // En rojo real a bastante opacidad se veía como una mancha marrón
  // (rojo + verde mezclados) y, a ese tamaño tan grande, se perdían
  // los huecos afilados del símbolo y parecía un bloque sólido. Con
  // blanco (currentColor + text-white) se mantiene nítido sobre el
  // degradado oscuro aunque baje la opacidad, y algo más pequeño para
  // que se distinga mejor la silueta en vez de un rombo grande.
  // Tamaño de referencia en rem (el mismo de siempre) con un tope de
  // vw/vh solo para que NO se recorte en pantallas realmente
  // pequeñas -- los topes van holgados (95vw/80vh) para no encoger
  // el tamaño en un móvil normal, donde el rem ya entraba bien.
  <LaLigaMark className="pointer-events-none absolute left-1/2 top-0 z-0 h-[min(32rem,98vw,85vh)] w-[min(32rem,98vw,85vh)] -translate-x-1/2 text-[#FF4B44] opacity-40 sm:h-[min(40rem,90vw,85vh)] sm:w-[min(40rem,90vw,85vh)] sm:-translate-y-2" />
)

const DEFAULT_HEADER = (
  <div className="relative z-10 flex flex-col items-center gap-1 text-center">
    <span className="text-4xl">🏆</span>
    <h1 className="text-2xl font-bold text-white">Porra Abueloncha</h1>
    <p className="text-sm font-medium text-gold-400">2026 · LaLiga</p>
  </div>
)

// Envoltorio compartido de Login/Registro (y reutilizado en otras pantallas
// de "primera vez", como el aviso de completar el perfil o el intro del
// asistente de apuestas iniciales): fondo con degradado de marca + dos
// cintas de escudos (arriba/abajo, en direcciones opuestas) + tarjeta
// translúcida, para que estos momentos "de bienvenida" vayan en
// consonancia con el resto de la app.
//
// `backgroundMark` y `header` son personalizables por si la pantalla quiere
// otra cosa detrás (p.ej. el escudo del equipo favorito en vez del de
// LaLiga) o no quiere repetir el título "Porra Abueloncha" porque ya trae
// su propia cabecera dentro de children.
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
//
// El `gap-3` es la red de seguridad: si el contenido del medio es tan alto
// que llena toda la pantalla (p.ej. el intro del asistente, con párrafos
// largos), `justify-between` se queda sin espacio sobrante que repartir y
// la cinta acaba pegada a la tarjeta sin ningún hueco. `gap` en un flex
// container es un mínimo que se respeta SIEMPRE, incluso sin espacio
// sobrante, así que garantiza un hueco mínimo entre cinta y tarjeta pase lo
// que pase, y sigue siendo igual arriba que abajo.
export default function AuthShell({
  children,
  backgroundMark = DEFAULT_MARK,
  header = DEFAULT_HEADER,
  maxWidth = 'max-w-sm',
  marqueeTop = <TeamMarquee direction="left" />,
  marqueeBottom = <TeamMarquee direction="right" />,
}: {
  children: ReactNode
  backgroundMark?: ReactNode
  header?: ReactNode
  maxWidth?: string
  marqueeTop?: ReactNode
  marqueeBottom?: ReactNode
}) {
  return (
    <div className="relative flex min-h-dvh flex-col justify-between gap-3 overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 py-3">
      {marqueeTop}

      <div className="relative flex flex-col items-center gap-6 px-4">
        {backgroundMark}

        {header}

        <div
          className={`relative z-10 w-full ${maxWidth} rounded-2xl bg-white/[0.67] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm`}
        >
          {children}
        </div>
      </div>

      {marqueeBottom}
    </div>
  )
}
