// Franja en bucle infinito con fotos de jugadores en círculo (igual que en el
// 11 de Abuelonchos / Fantasy), pensada para el intro del asistente de
// apuestas iniciales: en vez de los 20 escudos de LaLiga (que no dicen nada
// del equipo favorito elegido), aquí van solo los jugadores REALES de ese
// equipo con foto de verdad (se filtran fuera los que no tienen photo_url,
// para no mostrar la silueta genérica en bucle).
//
// Mismo truco de bucle continuo que TeamMarquee: se repite la lista N veces
// y se anima de 0% a -(100/N)%. Aquí N es dinámico (no siempre 4 fijo como
// en TeamMarquee) porque la plantilla de un equipo puede tener pocos
// jugadores con foto -- si solo hubiera, digamos, 6, con 4 copias (24
// fotos) la cinta podría no llegar a cubrir pantallas anchas. Se calculan
// las copias necesarias para tener siempre de sobra (al menos ~40 fotos en
// total), con un mínimo de 4 copias por seguridad.
//
// Ojo con la duración: lo que importa para que el movimiento se "sienta"
// igual que la cinta de escudos (TeamMarquee, 90s por cada ancho de UNA
// copia) es el tiempo que tarda en recorrer el ancho de UNA copia, no el
// número de copias -- el número de copias solo decide cuánto contenido de
// sobra hay pintado, no la velocidad. Por eso la duración es fija (90s,
// igual que auth-marquee-left/right en index.css) y NO se multiplica por
// `copies` como antes (eso hacía que fuese más rápido cuantas más copias
// hacían falta, dando una sensación de movimiento distinta a la esperada).
const COPY_TRANSIT_SECONDS = 90

// Tamaño de las fotos y de la franja: 'lg' (grande) para el intro con el
// botón "Comenzar", 'sm' (pequeño) para las pantallas de cada bloque, donde
// interesa que ocupe lo mínimo posible para que quepa todo en pantalla.
const SIZES = {
  lg: { band: 'h-16 w-full sm:h-20', img: 'mr-6 h-14 w-14 sm:mr-8 sm:h-[4.5rem] sm:w-[4.5rem]' },
  sm: { band: 'h-11 w-full sm:h-14', img: 'mr-4 h-9 w-9 sm:mr-5 sm:h-11 sm:w-11' },
}

export default function PlayerAvatarMarquee({
  photos,
  direction = 'left',
  size = 'lg',
}: {
  photos: string[]
  direction?: 'left' | 'right'
  size?: 'lg' | 'sm'
}) {
  if (photos.length === 0) return null

  // Objetivo de imágenes totales pintadas (repetidas): con avatares 'sm'
  // (más pequeños) hace falta MÁS cantidad para cubrir el mismo ancho de
  // pantalla que con 'lg', si no, en plantillas con pocos jugadores con
  // foto la cinta se queda corta y se nota un corte/hueco al llegar al
  // final del contenido repetido antes de que el bucle encaje. Mínimo de
  // copias también subido (8, antes 4) como margen de seguridad extra.
  const target = size === 'sm' ? 70 : 40
  const copies = Math.max(8, Math.ceil(target / photos.length))
  const travelPercent = 100 / copies
  const { band, img } = SIZES[size]

  const repeated: string[] = []
  for (let c = 0; c < copies; c++) repeated.push(...photos)

  // Truco del espejo para el sentido "right": en vez de una segunda animación
  // que arranca YA desplazada (translateX(-travelPercent%) desde el primer
  // frame), lo que dejaba la primera foto visible cortada nada más cargar
  // -- aquí se reutiliza EXACTAMENTE la misma animación "left" (que siempre
  // arranca en translateX(0), con la primera foto entera y bien encajada) y
  // simplemente se voltea todo el carril con scale-x(-1). Visualmente eso
  // invierte el sentido del movimiento (lo que se ve moverse a la izquierda
  // pasa a verse moverse a la derecha), y cada foto lleva un scale-x(-1) de
  // vuelta para no salir espejada.
  //
  // Dos nodos separados a propósito: el volteo estático (scale-x) va en un
  // nodo, y la animación (translateX) en OTRO nodo dentro -- un transform
  // animado y uno estático nunca pueden convivir en el mismo nodo, la
  // animación se comería al estático en cuanto arrancase.
  const mirror = direction === 'right'

  return (
    <div className={`flex items-center overflow-hidden ${band}`}>
      {/* will-change + backface-visibility: iOS Safari a veces "atasca" una
          animación cuando va anidada dentro de otro elemento con transform
          estático (como este espejo) si no se le da una pista explícita de
          que va a animarse -- sin esto, en algunos móviles la cinta puede
          quedarse congelada o dejar de repintarse pasado un rato. */}
      <div className={mirror ? '[transform:scaleX(-1)] [will-change:transform]' : ''}>
        <div
          className="flex w-max shrink-0 items-center [-webkit-backface-visibility:hidden] [will-change:transform]"
          style={{ animation: `player-marquee-left ${COPY_TRANSIT_SECONDS}s linear infinite` }}
        >
          {repeated.map((photo, i) => (
            <img
              key={i}
              src={photo}
              alt=""
              className={`shrink-0 rounded-full object-cover opacity-85 shadow-[0_1px_4px_rgba(0,0,0,0.4)] ring-2 ring-white/70 ${
                mirror ? '[transform:scaleX(-1)]' : ''
              } ${img}`}
            />
          ))}
        </div>
      </div>
      {/* translateZ(0) va DENTRO de la propia animación (no como transform
          estático aparte) para forzar que el navegador promocione la cinta a
          su propia capa GPU durante TODO el recorrido -- en iOS Safari, sin
          esto, una animación de larga duración (90s) anidada dentro de un
          nodo con transform estático (el espejo) a veces deja de repintarse
          o "se pierde" pasado un rato. */}
      <style>{`
        @keyframes player-marquee-left { from { transform: translateX(0) translateZ(0); } to { transform: translateX(-${travelPercent}%) translateZ(0); } }
      `}</style>
    </div>
  )
}
