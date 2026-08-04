import { useState } from 'react'
import FantasyLineupPicker from '../components/FantasyLineupPicker'
import { DEFAULT_FANTASY_FORMATION, buildFantasySlots, type FantasyPlayer, type FantasyPosition } from '../lib/fantasyTypes'

// Jugadores ficticios, solo para probar la interacción del selector mientras
// no hay clave de API-Football ni jugadores reales cargados en fantasy_players.
// Los nombres son inventados a propósito (no son jugadores reales).
const POSITIONS_PER_TEAM: FantasyPosition[] = [
  'POR', 'POR',
  'DEF', 'DEF', 'DEF', 'DEF', 'DEF',
  'MED', 'MED', 'MED', 'MED', 'MED',
  'DEL', 'DEL', 'DEL',
]

const MOCK_TEAMS = ['real-madrid', 'barcelona', 'atletico-madrid', 'athletic-club', 'villarreal']

// El modo Abuelonchos solo permite elegir jugadores "veteranos" (nacidos antes
// de 1996) — 1 de cada 3 jugadores ficticios es veterano, el resto son
// jóvenes y por tanto NO deberían poder elegirse (se filtran más abajo,
// igual que hará la página real contra fantasy_players).
const MOCK_PLAYERS_ALL: FantasyPlayer[] = (() => {
  const list: FantasyPlayer[] = []
  let id = 1
  for (const teamId of MOCK_TEAMS) {
    for (const pos of POSITIONS_PER_TEAM) {
      const veteran = id % 3 === 0
      list.push({
        api_player_id: id,
        name: `Jugador de prueba ${id} (${pos})${veteran ? ' 👴' : ''}`,
        team_id: teamId,
        api_team_id: null,
        player_position: pos,
        birth_date: veteran ? '1990-06-15' : '1999-06-15',
        photo_url: null,
        nationality: 'Spain',
        full_name: null,
        eligible_abuelonchos: veteran,
        active: true,
      })
      id++
    }
  }
  return list
})()

const MOCK_PLAYERS = MOCK_PLAYERS_ALL.filter((p) => p.eligible_abuelonchos)

export default function FantasyPreview() {
  const [value, setValue] = useState<Record<string, string>>({})
  const [formation, setFormation] = useState(DEFAULT_FANTASY_FORMATION)
  const slots = buildFantasySlots(formation)
  const complete = Object.keys(value).length === slots.length

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Página de prueba temporal — jugadores ficticios, no reales. Sirve para probar el selector del 11 mientras no
        hay conexión con API-Football. No está enlazada en el menú.
      </div>

      <h1 className="text-xl font-semibold">Prueba: selector del 11 ideal</h1>
      <p className="text-sm text-gray-500">
        Huecos rellenados: {Object.keys(value).length}/{slots.length} {complete && '✅'}
      </p>

      <FantasyLineupPicker
        players={MOCK_PLAYERS}
        formation={formation}
        value={value}
        onChange={setValue}
        onFormationChange={(next) => {
          const validKeys = new Set(buildFantasySlots(next).map((s) => `${s.position}-${s.index}`))
          setValue((v) => Object.fromEntries(Object.entries(v).filter(([, key]) => validKeys.has(key))))
          setFormation(next)
        }}
      />
    </div>
  )
}
