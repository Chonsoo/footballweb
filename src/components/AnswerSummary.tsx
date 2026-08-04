import { useState } from 'react'
import { usePlayers } from '../lib/usePlayers'
import { findTeamBadge } from '../lib/teamBadge'
import { zoneForPosition } from '../lib/rankingZones'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { MEDIA_TIER_ID, MEDIA_TIER_LABEL } from '../lib/database.types'
import type { AnswerValue, QuestionConfig, SeasonQuestion, TierItem } from '../lib/database.types'

const SILHOUETTE = '/badges/player-silhouette.png'

// Contenido "rico" y compacto de una respuesta, pensado para reutilizarse
// tanto en "Mis apuestas" como en "Apuestas detalladas": en vez del texto
// plano de formatAnswer(), muestra escudos/caras y, en las de tipo ranking,
// el orden real (1º..20º) con color de zona en vez de un párrafo de texto.
export default function AnswerSummary({
  question,
  value,
  currentResult,
  emptyLabel = 'Sin responder',
}: {
  question: SeasonQuestion
  value: AnswerValue | undefined | null
  // Clasificación actual (Bloque 1, ver Información › Clasificación actual):
  // si se pasa, cada equipo del grid lleva un ✓ cuando la posición predicha
  // coincide con la posición actual de ese equipo. Opcional para no afectar a
  // otros usos de AnswerSummary (Oráculo, asistente...).
  currentResult?: Record<string, number>
  // Texto cuando no hay valor -- "Sin responder" tiene sentido para la
  // respuesta de un usuario, pero en Información (resultado oficial) es más
  // claro "Aún sin resolver".
  emptyLabel?: string
}) {
  if (value == null) return <p className="text-sm text-gray-400">{emptyLabel}</p>

  if (question.answer_type === 'ranking') {
    return <RankingSummary config={question.config} value={value as Record<string, number>} currentResult={currentResult} />
  }

  if (question.answer_type === 'tier_list') {
    return <TierListSummary config={question.config} value={value as Record<string, string>} />
  }

  if (question.answer_type === 'score_prediction') {
    const v = value as { home: number; away: number }
    return (
      <div className="flex items-center gap-2 text-sm">
        <TeamBadgeLabel name={question.config.home_team} />
        <span className="font-bold text-gray-800">
          {v.home} - {v.away}
        </span>
        <TeamBadgeLabel name={question.config.away_team} />
      </div>
    )
  }

  if (question.answer_type === 'choice') {
    if (question.config.player_choice) return <PlayerAnswer name={value as string} />
    if (question.config.team_ids) {
      return (
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
          <TeamBadgeImg name={value as string} />
          {value as string}
        </div>
      )
    }
    return (
      <span className="inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
        {String(value)}
      </span>
    )
  }

  return <p className="text-sm text-gray-700">{String(value)}</p>
}

function TeamBadgeImg({ name }: { name: string | undefined }) {
  const badge = findTeamBadge(name)
  const [err, setErr] = useState(false)
  if (!badge || err) return null
  return <img src={badge} alt="" className="h-5 w-5 shrink-0 object-contain" onError={() => setErr(true)} />
}

// Exportado: lo reutiliza "Mis apuestas" para juntar los 3 duelos Big Three
// (ida y vuelta) en una sola fila compacta por emparejamiento.
export function TeamBadgeLabel({ name }: { name: string | undefined }) {
  const badge = findTeamBadge(name)
  const [err, setErr] = useState(false)
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      {badge && !err && <img src={badge} alt="" className="h-4 w-4 object-contain" onError={() => setErr(true)} />}
      {name}
    </span>
  )
}

function PlayerAnswer({ name }: { name: string }) {
  const { players } = usePlayers()
  const [imgError, setImgError] = useState(false)
  const player = players.find((p) => p.name === name)
  const team = player ? LALIGA_TEAMS_2026_27.find((t) => t.id === player.team_id) : undefined

  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
        {player?.photo_url && !imgError ? (
          <img src={player.photo_url} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <img src={SILHOUETTE} alt="" className="h-full w-full scale-110 object-cover" />
        )}
      </div>
      <span className="text-sm font-semibold text-gray-800">{name}</span>
      {team?.badge && <img src={team.badge} alt="" className="h-4 w-4 shrink-0 object-contain" />}
    </div>
  )
}

const ZONE_BG: Record<string, string> = {
  campeon: 'bg-gold-100',
  champions: 'bg-brand-100',
  europa: 'bg-yellow-100',
  descenso: 'bg-red-100',
  [MEDIA_TIER_ID]: 'bg-gray-50',
}

function RankingSummary({
  config,
  value,
  currentResult,
}: {
  config: QuestionConfig
  value: Record<string, number>
  currentResult?: Record<string, number>
}) {
  const items = config.items ?? []
  const tiers = config.tiers ?? []
  const total = items.length

  const ordered = items
    .map((it) => ({ item: it, pos: value[it.id] }))
    .filter((e): e is { item: TierItem; pos: number } => e.pos != null)
    .sort((a, b) => a.pos - b.pos)

  if (ordered.length === 0) return <p className="text-sm text-gray-400">Sin colocar</p>

  return (
    <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
      {ordered.map(({ item, pos }) => {
        const zone = zoneForPosition(pos, tiers, total)
        // undefined = todavía no hay clasificación actual con la que comparar
        // (o ese equipo no está en ella); null se descarta a propósito de
        // "coincide"/"no coincide" cuando sí hay datos.
        const matches = currentResult && item.id in currentResult ? currentResult[item.id] === pos : null
        return (
          <div
            key={item.id}
            title={`${pos}º ${item.name}`}
            className={`relative flex flex-col items-center gap-0.5 rounded-md py-1 ${ZONE_BG[zone.id] ?? 'bg-gray-50'}`}
          >
            {matches === true && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-600 text-[8px] font-bold text-white">
                ✓
              </span>
            )}
            {item.badge ? (
              <img src={item.badge} alt="" className="h-5 w-5 object-contain" />
            ) : (
              <span className="h-5 w-5" />
            )}
            <span className="text-[9px] font-semibold text-gray-500">{pos}º</span>
          </div>
        )
      })}
    </div>
  )
}

function TierListSummary({ config, value }: { config: QuestionConfig; value: Record<string, string> }) {
  const items = config.items ?? []
  const tiers = [...(config.tiers ?? []), { id: MEDIA_TIER_ID, label: MEDIA_TIER_LABEL, max: null }]

  const rows = tiers
    .map((tier) => ({
      tier,
      inTier: items.filter((it) => (value[it.id] ?? MEDIA_TIER_ID) === tier.id),
    }))
    .filter((r) => r.tier.id !== MEDIA_TIER_ID && r.inTier.length > 0)

  if (rows.length === 0) return <p className="text-sm text-gray-400">Sin colocar</p>

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(({ tier, inTier }) => (
        <div key={tier.id} className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 font-semibold text-brand-700">{tier.label}</span>
          {inTier.map((it) => (
            <span key={it.id} className="flex items-center gap-1 text-gray-600">
              {it.badge && <img src={it.badge} alt="" className="h-4 w-4 object-contain" />}
              {it.name}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
