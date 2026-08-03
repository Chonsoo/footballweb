import type { TierItem } from './database.types'

// Escudos servidos en local desde /public/badges/<id>.png (assets propios del repo,
// sin depender de URLs externas). Si falta el fichero, la UI cae a mostrar solo el nombre.
function badge(id: string) {
  return `/badges/${id}.png`
}

// La Liga 2026/27 — 20 equipos confirmados (verificado ago-2026: suben Racing de Santander,
// Deportivo de La Coruña y Málaga CF; bajan Real Oviedo, Girona FC y RCD Mallorca).
export const LALIGA_TEAMS_2026_27: TierItem[] = [
  { id: 'real-madrid', name: 'Real Madrid', badge: badge('real-madrid') },
  { id: 'barcelona', name: 'Barcelona', badge: badge('barcelona') },
  { id: 'atletico-madrid', name: 'Atlético de Madrid', badge: badge('atletico-madrid') },
  { id: 'athletic-club', name: 'Athletic Club', badge: badge('athletic-club') },
  { id: 'villarreal', name: 'Villarreal', badge: badge('villarreal') },
  { id: 'real-betis', name: 'Real Betis', badge: badge('real-betis') },
  { id: 'real-sociedad', name: 'Real Sociedad', badge: badge('real-sociedad') },
  { id: 'rayo-vallecano', name: 'Rayo Vallecano', badge: badge('rayo-vallecano') },
  { id: 'celta-vigo', name: 'Celta de Vigo', badge: badge('celta-vigo') },
  { id: 'osasuna', name: 'Osasuna', badge: badge('osasuna') },
  { id: 'getafe', name: 'Getafe', badge: badge('getafe') },
  { id: 'alaves', name: 'Alavés', badge: badge('alaves') },
  { id: 'espanyol', name: 'Espanyol', badge: badge('espanyol') },
  { id: 'valencia', name: 'Valencia', badge: badge('valencia') },
  { id: 'sevilla', name: 'Sevilla', badge: badge('sevilla') },
  { id: 'levante', name: 'Levante', badge: badge('levante') },
  { id: 'elche', name: 'Elche', badge: badge('elche') },
  { id: 'racing-santander', name: 'Racing de Santander', badge: badge('racing-santander') },
  { id: 'deportivo-coruna', name: 'Deportivo de La Coruña', badge: badge('deportivo-coruna') },
  { id: 'malaga', name: 'Málaga', badge: badge('malaga') },
]

// La Champions League 2026/27 (fase liga) todavía no tiene los 36 equipos cerrados —
// quedan eliminatorias de clasificación por jugar en agosto. Se añadirá en cuanto
// se confirme el cuadro completo.
export const CHAMPIONS_TEAMS_2026_27: TierItem[] = []
