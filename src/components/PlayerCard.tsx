import { useState } from 'react'
import type { FantasyPlayer } from '../lib/fantasyTypes'
import { FANTASY_POSITION_LABELS } from '../lib/fantasyTypes'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { getNationalityInfo } from '../lib/nationalityFlags'

const ABUELONCHOS_RING = '/badges/abueluchos-ring-640.png'
const SILHOUETTE = '/badges/player-silhouette.png'

// Hueco circular transparente del escudo, medido sobre abueluchos-ring-640.png
// (640x637): centro ~50% / ~49.9%, radio ~27.7% del ancho. Estos valores
// posicionan la foto del jugador exactamente donde estaban los abuelos.
const HOLE_CENTER_X = 50
const HOLE_CENTER_Y = 49.9
const HOLE_DIAMETER = 55.4

// Carta al estilo "Abueluchos FC": el propio escudo del grupo hace de marco
// circular, con la foto del jugador (o silueta genérica) rellenando el
// hueco central donde antes estaban los abuelos.
export default function PlayerCard({
  player,
  size = 'lg',
  selected,
  onClick,
}: {
  player: FantasyPlayer
  size?: 'sm' | 'lg'
  selected?: boolean
  onClick?: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const team = LALIGA_TEAMS_2026_27.find((t) => t.id === player.team_id)
  const nat = getNationalityInfo(player.nationality)
  const dims = size === 'lg' ? 'w-36' : 'w-24'
  const nameSize = size === 'lg' ? 'text-xs' : 'text-[10px]'
  const sideIconSize = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex ${dims} shrink-0 flex-col items-center rounded-xl text-center transition-transform ${
        onClick ? 'cursor-pointer hover:scale-[1.03]' : ''
      } ${selected ? 'ring-2 ring-brand-500' : ''}`}
    >
      {/* Escudo Abueluchos FC con la foto del jugador en el hueco central */}
      <div className="relative aspect-square w-full">
        <div
          className="absolute overflow-hidden rounded-full bg-white"
          style={{
            left: `${HOLE_CENTER_X - HOLE_DIAMETER / 2}%`,
            top: `${HOLE_CENTER_Y - HOLE_DIAMETER / 2}%`,
            width: `${HOLE_DIAMETER}%`,
            height: `${HOLE_DIAMETER}%`,
          }}
        >
          {player.photo_url && !imgError ? (
            <img
              src={player.photo_url}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <img src={SILHOUETTE} alt="" className="h-full w-full scale-110 object-cover" />
          )}
        </div>
        <img src={ABUELONCHOS_RING} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
      </div>

      <p className={`mt-1.5 max-w-full truncate px-1 font-bold text-gray-900 ${nameSize}`} title={player.name}>
        {player.name}
      </p>
      <p className="text-[9px] font-medium uppercase tracking-wide text-gray-500">
        {FANTASY_POSITION_LABELS[player.player_position]}
      </p>

      {/* Fila inferior: escudo del equipo real a un lado, bandera al otro */}
      <div className="mt-1.5 flex w-full items-center justify-center gap-3 border-t border-gray-200 pt-1.5">
        {team?.badge ? (
          <img src={team.badge} alt="" title={team.name} className={`${sideIconSize} object-contain`} />
        ) : (
          <span className={sideIconSize} />
        )}
        {nat ? (
          <span title={nat.label} className={size === 'lg' ? 'text-lg leading-none' : 'text-sm leading-none'}>
            {nat.flag}
          </span>
        ) : (
          <span className={sideIconSize} />
        )}
      </div>
    </Wrapper>
  )
}
