import { useState } from 'react'

const ABUELONCHOS_RING = '/badges/abueluchos-ring-640.png'
const SILHOUETTE = '/badges/player-silhouette.png'

// Hueco circular transparente del escudo, medido sobre abueluchos-ring-640.png
// (640x637): centro ~50% / ~49.9%, radio ~27.7% del ancho. Estos valores
// posicionan la foto del jugador exactamente donde estaban los abuelos.
const HOLE_CENTER_X = 50
const HOLE_CENTER_Y = 49.9
const HOLE_DIAMETER = 55.4

// Marco circular "Abueluchos FC" con la foto del jugador (o silueta genérica)
// rellenando el hueco central -- extraído de PlayerCard para poder
// reutilizarlo también en el campo (PitchAvatar), donde antes el jugador
// colocado solo llevaba un círculo simple con borde blanco.
export default function PlayerRingAvatar({
  photoUrl,
  className = '',
}: {
  photoUrl?: string | null
  className?: string
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className={`relative aspect-square ${className}`}>
      <div
        className="absolute overflow-hidden rounded-full bg-white"
        style={{
          left: `${HOLE_CENTER_X - HOLE_DIAMETER / 2}%`,
          top: `${HOLE_CENTER_Y - HOLE_DIAMETER / 2}%`,
          width: `${HOLE_DIAMETER}%`,
          height: `${HOLE_DIAMETER}%`,
        }}
      >
        {photoUrl && !imgError ? (
          <img src={photoUrl} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <img src={SILHOUETTE} alt="" className="h-full w-full scale-110 object-cover" />
        )}
      </div>
      <img src={ABUELONCHOS_RING} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
    </div>
  )
}
