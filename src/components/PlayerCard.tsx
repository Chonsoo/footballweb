import type { FantasyPlayer } from '../lib/fantasyTypes'
import { POSITION_COLORS } from '../lib/fantasyTypes'
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
  const team = LALIGA_TEAMS_2026_27.find((t) => t.id === player.team_id)
  const nat = getNationalityInfo(player.nationality)
  const dims = size === 'lg' ? 'w-36' : 'w-24'
  const nameSize = size === 'lg' ? 'text-xs' : 'text-[10px]'
  const sideIconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      // border-0 explícito: al ser a veces un <button>, sin esto el navegador
      // le pone su propio borde por defecto, que es lo que se veía como una
      // rejilla entre carta y carta. El fondo ahora sí es a propósito: el
      // color de la posición (igual que en la lista), para identificarla de
      // un vistazo sin tener que leer la etiqueta.
      className={`flex ${dims} shrink-0 flex-col items-center gap-1 rounded-xl border-0 p-1.5 text-center transition-transform ${
        POSITION_COLORS[player.player_position]
      } ${onClick ? 'cursor-pointer hover:scale-[1.03]' : ''} ${selected ? 'ring-2 ring-brand-500' : ''}`}
    >
      <PlayerRingAvatar photoUrl={player.photo_url} className="w-full" />

      <p className={`max-w-full truncate px-1 font-bold ${nameSize}`} title={player.name}>
        {player.name}
      </p>

      {/* Donde antes iba el texto de la posición (ya sobra: el color de
          fondo de la carta ya la indica) ahora va el escudo del equipo real
          y la bandera, uno a cada lado. */}
      <div className="flex w-full items-center justify-center gap-1.5">
        {team?.badge ? (
          <img src={team.badge} alt="" title={team.name} className={`${sideIconSize} shrink-0 object-contain`} />
        ) : (
          <span className={`${sideIconSize} shrink-0`} />
        )}
        {nat && (
          <span title={nat.label} className={`shrink-0 ${size === 'lg' ? 'text-base leading-none' : 'text-xs leading-none'}`}>
            {nat.flag}
          </span>
        )}
      </div>
    </Wrapper>
  )
}
