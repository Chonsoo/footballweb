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
  playerIds,
  onPhotoClick,
  direction = 'left',
  size = 'lg',
}: {
  photos: string[]
  // Ids paralelos a `photos` (mismo índice = misma foto), opcional y solo
  // necesario si se pasa onPhotoClick -- lo usa el paso 3 del Abueloncho
  // Dorado para detectar el clic en el capitán elegido, sin tocar el resto
  // de usos de este componente (Onboarding, etc.) que no lo necesitan.
  playerIds?: number[]
  onPhotoClick?: (playerId: number) => void
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
  const repeatedIds: (number | undefined)[] = []
  for (let c = 0; c < copies; c++) {
    repeated.push(...photos)
    if (playerIds) repeatedIds.push(...playerIds)
  }

  // El truco del espejo (scale-x en un nodo aparte + contra-espejo en cada
  // foto) daba problemas serios en móvil (la cinta fallaba/desaparecía a
  // media reproducción) -- probablemente por Safari perdiendo la capa
  // compuesta con dos transforms anidados (uno estático, uno animado) más
  // ~70 imágenes dentro. Se vuelve a un enfoque más simple y robusto: MISMO
  // carril, MISMA animación, MISMO nodo -- para el sentido "right" solo se
  // añade `animation-direction: reverse`.
  //
  // ¿Por qué no deja un salto ni una foto cortada? travelPercent (=100/copies)
  // es EXACTAMENTE el ancho de una copia de `photos`, y el carril son
  // `copies` copias idénticas seguidas -- así que la posición "-travelPercent%"
  // es visualmente IDÉNTICA a "0%" (una copia entera más a la izquierda del
  // mismo patrón que se repite). Por eso reproducir la animación al revés
  // (empezando en -travelPercent%, terminando en 0%, y saltando otra vez a
  // -travelPercent% en cada vuelta) no se nota: tanto el punto de partida
  // como el salto de vuelta caen justo en un borde de copia, nunca a medio
  // jugador.
  const reverse = direction === 'right'

  return (
    <div className={`flex items-center overflow-hidden ${band}`}>
      <div
        className="flex w-max shrink-0 items-center"
        style={{
          animation: `player-marquee-left ${COPY_TRANSIT_SECONDS}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {repeated.map((photo, i) => {
          const id = repeatedIds[i]
          return (
            <img
              key={i}
              src={photo}
              alt=""
              onClick={onPhotoClick && id != null ? () => onPhotoClick(id) : undefined}
              className={`shrink-0 rounded-full object-cover opacity-85 shadow-[0_1px_4px_rgba(0,0,0,0.4)] ring-2 ring-white/70 ${img}`}
            />
          )
        })}
      </div>
      <style>{`
        @keyframes player-marquee-left { from { transform: translateX(0); } to { transform: translateX(-${travelPercent}%); } }
      `}</style>
    </div>
  )
}
