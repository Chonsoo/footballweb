import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'

// Franja de escudos de LaLiga desplazándose en bucle infinito (estilo cinta),
// pensada para Login/Registro. A diferencia del anillo giratorio anterior,
// esta franja vive en su propia banda de la pantalla (arriba/abajo de la
// tarjeta, ver AuthShell) en vez de "detrás de todo" -- así los escudos son
// visibles desde el primer render, sin depender de dónde caiga la tarjeta
// blanca encima.
//
// Truco del bucle continuo: la lista de equipos se pinta DOS veces seguidas
// dentro de una fila (ancho automático, w-max), y esa fila se anima de 0% a
// -50% (justo el ancho de UNA copia, ya que hay dos). Al llegar al final la
// segunda copia ocupa el sitio exacto donde empezaba la primera, así que el
// salto de vuelta al inicio es invisible y el bucle no se nota.
export default function TeamMarquee({ direction = 'left' }: { direction?: 'left' | 'right' }) {
  const teams = LALIGA_TEAMS_2026_27
  const animClass = direction === 'left' ? 'auth-marquee-left' : 'auth-marquee-right'

  return (
    <div className="flex h-14 w-full items-center overflow-hidden sm:h-16">
      <div className={`flex w-max shrink-0 items-center gap-7 ${animClass}`}>
        {[...teams, ...teams].map((team, i) => (
          <img
            key={`${team.id}-${i}`}
            src={team.badge}
            alt=""
            className="h-9 w-9 shrink-0 object-contain opacity-80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] sm:h-11 sm:w-11"
          />
        ))}
      </div>
    </div>
  )
}
