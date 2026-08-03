import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import FantasyLineupPicker from './FantasyLineupPicker'
import {
  DEFAULT_FANTASY_FORMATION,
  buildFantasySlots,
  type FantasyFormation,
  type FantasyLineup,
  type FantasyPlayer,
} from '../lib/fantasyTypes'

// Bloque 5 de "Apuestas iniciales": el 11 de Abuelonchos. A diferencia de los
// bloques 1-4 (que leen/escriben season_questions/season_answers), este lee y
// escribe directamente en las tablas fantasy_lineups/fantasy_lineup_players,
// porque la puntuación se acumula jornada a jornada en vez de calificarse una
// sola vez como el resto de preguntas.

interface LineupPlayerRow {
  lineup_id: string
  slot_position: string
  slot_index: number
  player_id: number
}

export default function FantasyLineupBlock() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<FantasyPlayer[]>([])
  const [lineup, setLineup] = useState<FantasyLineup | null>(null)
  const [value, setValue] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)

      const { data: ps } = await supabase
        .from('fantasy_players')
        .select('*')
        .eq('eligible_abuelonchos', true)
        .eq('active', true)
        .order('name')

      let lineupRow: FantasyLineup | null = null
      const { data: existingLineup } = await supabase
        .from('fantasy_lineups')
        .select('*')
        .eq('user_id', user.id)
        .eq('mode', 'abuelonchos')
        .maybeSingle()

      if (existingLineup) {
        lineupRow = existingLineup as FantasyLineup
      } else {
        const { data: created } = await supabase
          .from('fantasy_lineups')
          .insert({ user_id: user.id, mode: 'abuelonchos', formation: DEFAULT_FANTASY_FORMATION })
          .select('*')
          .single()
        lineupRow = created as FantasyLineup | null
      }

      let v: Record<string, string> = {}
      if (lineupRow) {
        const { data: slotsData } = await supabase
          .from('fantasy_lineup_players')
          .select('*')
          .eq('lineup_id', lineupRow.id)
        for (const row of (slotsData as LineupPlayerRow[] | null) ?? []) {
          v[String(row.player_id)] = `${row.slot_position}-${row.slot_index}`
        }
      }

      setPlayers((ps as FantasyPlayer[]) ?? [])
      setLineup(lineupRow)
      setValue(v)
      setLoading(false)
    }
    load()
  }, [user])

  async function handleChange(next: Record<string, string>) {
    setValue(next) // optimista, no esperamos a guardarse para reflejarlo
    if (!lineup) return
    await supabase.from('fantasy_lineup_players').delete().eq('lineup_id', lineup.id)
    const rows = Object.entries(next).map(([playerId, key]) => {
      const [slot_position, slot_index] = key.split('-')
      return {
        lineup_id: lineup.id,
        slot_position,
        slot_index: Number(slot_index),
        player_id: Number(playerId),
      }
    })
    if (rows.length > 0) {
      await supabase.from('fantasy_lineup_players').insert(rows)
    }
  }

  const formation: FantasyFormation = lineup?.formation ?? DEFAULT_FANTASY_FORMATION
  const slots = buildFantasySlots(formation)
  const filled = Object.keys(value).length
  const complete = filled === slots.length

  return (
    <div className="rounded border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-medium ${
          open ? 'rounded-t' : 'rounded'
        } ${complete ? 'bg-green-50' : 'bg-white'}`}
      >
        <span className="flex items-center gap-2">
          Bloque 5 · El 11 de Abuelonchos
          {complete && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
        <span className="flex items-center gap-2 text-sm font-normal text-gray-400">
          {loading ? '…' : `${filled}/${slots.length}`}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 rounded-b border-t border-gray-100 p-3">
          <p className="text-xs text-gray-500">
            Elige tu 11 solo con jugadores veteranos (nacidos antes de 1994). Cada jugador suma puntos jornada a
            jornada según su rendimiento real. Se guarda automáticamente al colocar cada jugador.
          </p>
          {loading ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : players.length === 0 ? (
            <p className="text-sm text-gray-400">
              Todavía no hay jugadores cargados. El admin puede añadirlos desde el panel (pestaña "Jugadores
              fantasy").
            </p>
          ) : (
            <FantasyLineupPicker players={players} formation={formation} value={value} onChange={handleChange} />
          )}
        </div>
      )}
    </div>
  )
}
