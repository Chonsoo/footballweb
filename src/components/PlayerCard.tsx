import type { FantasyPlayer } from '../lib/fantasyTypes'
import { FANTASY_POSITION_LABELS } from '../lib/fantasyTypes'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { getNationalityInfo } from '../lib/nationalityFlags'
import PlayerRingAvatar from './PlayerRingAvatar'

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

      {/* Escudo del equipo real y bandera a cada lado del nombre/posición, en
          vez de debajo en una fila aparte -- así se leen de un vistazo junto
          al jugador en vez de ir sueltos más abajo. */}
      <div className="mt-1.5 flex w-full items-center justify-center gap-1.5">
        {team?.badge ? (
          <img src={team.badge} alt="" title={team.name} className={`${sideIconSize} shrink-0 object-contain`} />
        ) : (
          <span className={`${sideIconSize} shrink-0`} />
        )}
        <span className="min-w-0 flex-1">
          <p className={`max-w-full truncate px-1 font-bold text-gray-900 ${nameSize}`} title={player.name}>
            {player.name}
          </p>
          <p className="text-[9px] font-medium uppercase tracking-wide text-gray-500">
            {FANTASY_POSITION_LABELS[player.player_position]}
          </p>
        </span>
        {nat ? (
          <span title={nat.label} className={`shrink-0 ${size === 'lg' ? 'text-lg leading-none' : 'text-sm leading-none'}`}>
            {nat.flag}
          </span>
        ) : (
          <span className={`${sideIconSize} shrink-0`} />
        )}
      </div>
    </Wrapper>
  )
}
