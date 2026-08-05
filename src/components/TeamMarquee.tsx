import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'

// Franja de escudos de LaLiga desplazándose en bucle infinito (estilo cinta),
// pensada para Login/Registro. A diferencia del anillo giratorio anterior,
// esta franja vive en su propia banda de la pantalla (arriba/abajo de la
// tarjeta, ver AuthShell) en vez de "detrás de todo" -- así los escudos son
// visibles desde el primer render, sin depender de dónde caiga la tarjeta
// blanca encima.
//
// Truco del bucle continuo: la lista de equipos se pinta CUATRO veces
// seguidas dentro de una fila (ancho automático, w-max), y esa fila se anima
// de 0% a -25% (el ancho de UNA copia, ya que hay cuatro iguales). Al llegar
// ahí la copia siguiente ocupa el sitio exacto donde empezaba la primera, así
// que el salto de vuelta al inicio es invisible.
//
// ¿Por qué 4 copias y no 2? Con solo 2, en pantallas anchas (donde la cinta
// mide más que el ancho de una copia de 20 escudos) se llega a ver un hueco
// en blanco justo antes de reiniciar el bucle -- porque el contenido
// duplicado se "acaba" antes de que la ventana visible termine de
// desplazarse. Con 4 copias hay siempre de sobra por delante, así que nunca
// se queda sin escudos que mostrar (aguanta pantallas de hasta ~3 copias de
// ancho, de sobra para cualquier monitor).
export default function TeamMarquee({ direction = 'left' }: { direction?: 'left' | 'right' }) {
  const teams = LALIGA_TEAMS_2026_27

  // Truco del espejo para el sentido "right" (igual que en
  // PlayerAvatarMarquee): usar la animación "auth-marquee-right" (que
  // arranca ya desplazada un -25% desde el primer frame) dejaba el primer
  // escudo visible cortado nada más cargar la página, porque ese desplazamiento
  // inicial no coincide con el borde de ningún escudo. Reutilizando SIEMPRE
  // "auth-marquee-left" (arranca en translateX(0), primer escudo entero) y
  // volteando el carril entero con scale-x(-1) se consigue el mismo efecto
  // visual de "moverse hacia la derecha" sin ese corte inicial -- cada
  // escudo lleva un scale-x(-1) de vuelta para no salir espejado.
  const mirror = direction === 'right'

  return (
    <div className="relative z-20 flex h-16 w-full items-center overflow-hidden sm:h-20">
      {/* Ojo: el espaciado entre escudos va en mr-* de cada imagen, NO en un
          gap del contenedor. Con `gap` el hueco entre la última imagen de
          una copia y la primera de la siguiente solo se cuenta una vez en
          el ancho total, así que la fracción exacta del ancho (donde apunta
          la animación) no coincide con el ancho real de una copia -- eso es
          lo que causaba el pequeño salto/parpadeo al reiniciar el bucle. Con
          mr-* en cada imagen (incluida la última de cada copia) el hueco
          queda "dentro" de cada copia, así que las copias iguales miden
          justo el múltiplo exacto y el punto de bucle cae siempre bien. */}
      {/* Dos nodos separados a propósito: el de fuera lleva el volteo
          ESTÁTICO (scale-x) y el de dentro la animación (translateX). Un
          transform animado y uno estático NUNCA pueden ir en el MISMO nodo
          -- el de la animación pisaría/borraría al estático en cuanto
          arrancase (ya nos pasó antes con el anillo giratorio del login). */}
      <div className={mirror ? '[transform:scaleX(-1)]' : ''}>
        <div className="flex w-max shrink-0 items-center auth-marquee-left">
          {[...teams, ...teams, ...teams, ...teams].map((team, i) => (
            <img
              key={`${team.id}-${i}`}
              src={team.badge}
              alt=""
              className={`mr-3 h-14 w-14 shrink-0 object-contain opacity-80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] sm:mr-4 sm:h-[4.5rem] sm:w-[4.5rem] ${
                mirror ? '[transform:scaleX(-1)]' : ''
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
