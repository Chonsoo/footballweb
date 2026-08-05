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
export default function PlayerAvatarMarquee({
  photos,
  direction = 'left',
}: {
  photos: string[]
  direction?: 'left' | 'right'
}) {
  if (photos.length === 0) return null

  const copies = Math.max(4, Math.ceil(40 / photos.length))
  const travelPercent = 100 / copies
  const animName = direction === 'left' ? 'player-marquee-left' : 'player-marquee-right'

  const repeated: string[] = []
  for (let c = 0; c < copies; c++) repeated.push(...photos)

  return (
    <div className="flex h-16 w-full items-center overflow-hidden sm:h-20">
      <div
        className="flex w-max shrink-0 items-center"
        style={{ animation: `${animName} ${copies * 9}s linear infinite` }}
      >
        {repeated.map((photo, i) => (
          <img
            key={i}
            src={photo}
            alt=""
            className="mr-3 h-14 w-14 shrink-0 rounded-full object-cover opacity-85 shadow-[0_1px_4px_rgba(0,0,0,0.4)] ring-2 ring-white/70 sm:mr-4 sm:h-[4.5rem] sm:w-[4.5rem]"
          />
        ))}
      </div>
      <style>{`
        @keyframes player-marquee-left { from { transform: translateX(0); } to { transform: translateX(-${travelPercent}%); } }
        @keyframes player-marquee-right { from { transform: translateX(-${travelPercent}%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  )
}
