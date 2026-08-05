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
    <div className="flex h-16 w-full items-center overflow-hidden sm:h-20">
      {/* Ojo: el espaciado entre escudos va en mr-* de cada imagen, NO en un
          gap del contenedor. Con `gap` el hueco entre la última imagen de la
          1ª copia y la primera de la 2ª solo se cuenta una vez en el ancho
          total, así que la mitad del ancho (donde apunta translateX(-50%))
          no coincide exactamente con el ancho de una copia -- eso es lo que
          causaba el pequeño salto/parpadeo al reiniciar el bucle. Con mr-*
          en cada imagen (incluida la última de cada copia) el hueco queda
          "dentro" de cada copia, así que dos copias iguales miden el doble
          exacto y el -50% cae siempre justo en el sitio correcto. */}
      <div className={`flex w-max shrink-0 items-center ${animClass}`}>
        {[...teams, ...teams].map((team, i) => (
          <img
            key={`${team.id}-${i}`}
            src={team.badge}
            alt=""
            className="mr-5 h-14 w-14 shrink-0 object-contain opacity-80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] sm:mr-6 sm:h-[4.5rem] sm:w-[4.5rem]"
          />
        ))}
      </div>
    </div>
  )
}
