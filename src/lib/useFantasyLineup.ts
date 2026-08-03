import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'
import {
  DEFAULT_FANTASY_FORMATION,
  buildFantasySlots,
  slotKey,
  type FantasyFormation,
  type FantasyLineup,
  type FantasyPlayer,
} from './fantasyTypes'

// Hook compartido para el 11 de Abuelonchos: lo usan tanto el Bloque 5 de
// "Apuestas iniciales" (accordion) como el paso 5 del asistente de
// bienvenida (pantalla completa), para no duplicar la lógica de
// carga/guardado contra fantasy_lineups/fantasy_lineup_players.

interface LineupPlayerRow {
  lineup_id: string
  slot_position: string
  slot_index: number
  player_id: number
}

export function useFantasyLineup() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<FantasyPlayer[]>([])
  const [lineup, setLineup] = useState<FantasyLineup | null>(null)
  const [value, setValue] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

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

  async function handleFormationChange(nextFormation: FantasyFormation) {
    if (!lineup) return
    // Al cambiar de formación algunos huecos pueden desaparecer (p.ej. de
    // 4-4-2 a 3-4-3 se pierde un DEF): a quien estuviera ahí lo devolvemos
    // al banquillo sin colocar en vez de dejar datos huérfanos.
    const validKeys = new Set(buildFantasySlots(nextFormation).map(slotKey))
    const nextValue: Record<string, string> = {}
    for (const [playerId, key] of Object.entries(value)) {
      if (validKeys.has(key)) nextValue[playerId] = key
    }

    setLineup({ ...lineup, formation: nextFormation })
    setValue(nextValue)

    await supabase.from('fantasy_lineups').update({ formation: nextFormation }).eq('id', lineup.id)
    await supabase.from('fantasy_lineup_players').delete().eq('lineup_id', lineup.id)
    const rows = Object.entries(nextValue).map(([playerId, key]) => {
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

  return {
    players,
    value,
    formation,
    slots,
    filled,
    complete,
    loading,
    handleChange,
    handleFormationChange,
  }
}
