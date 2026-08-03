import type { TierItem } from './database.types'

// Escudos servidos vía Wikimedia (Special:FilePath = URL estable independiente de dónde
// esté alojado el fichero real). Si algún escudo no carga, la UI cae a mostrar solo el nombre.
function wiki(file: string) {
  return `https://en.wikipedia.org/wiki/Special:FilePath/${file}`
}

// La Liga 2026/27 — 20 equipos confirmados (verificado ago-2026: suben Racing de Santander,
// Deportivo de La Coruña y Málaga CF; bajan Real Oviedo, Girona FC y RCD Mallorca).
export const LALIGA_TEAMS_2026_27: TierItem[] = [
  { id: 'real-madrid', name: 'Real Madrid', badge: wiki('Real_Madrid_CF.svg') },
  { id: 'barcelona', name: 'Barcelona', badge: wiki('FC_Barcelona_(crest).svg') },
  { id: 'atletico-madrid', name: 'Atlético de Madrid', badge: wiki('Atletico_Madrid_Logo_2024.svg') },
  { id: 'athletic-club', name: 'Athletic Club', badge: wiki('Club_Athletic_Bilbao_logo.svg') },
  { id: 'villarreal', name: 'Villarreal', badge: wiki('Villarreal_CF_logo-en.svg') },
  { id: 'real-betis', name: 'Real Betis', badge: wiki('Real_betis_logo.svg') },
  { id: 'real-sociedad', name: 'Real Sociedad', badge: wiki('Real_Sociedad_logo.svg') },
  { id: 'rayo-vallecano', name: 'Rayo Vallecano', badge: wiki('Rayo_Vallecano_logo.svg') },
  { id: 'celta-vigo', name: 'Celta de Vigo', badge: wiki('RC_Celta_de_Vigo_logo.svg') },
  { id: 'osasuna', name: 'Osasuna', badge: wiki('CA_Osasuna_logo.svg') },
  { id: 'getafe', name: 'Getafe', badge: wiki('Getafe_CF_logo.svg') },
  { id: 'alaves', name: 'Alavés', badge: wiki('Deportivo_Alaves_logo_2020.svg') },
  { id: 'espanyol', name: 'Espanyol', badge: wiki('RCD_Espanyol_crest.svg') },
  { id: 'valencia', name: 'Valencia', badge: wiki('Valenciacf.svg') },
  { id: 'sevilla', name: 'Sevilla', badge: wiki('Sevilla_FC_logo.svg') },
  { id: 'levante', name: 'Levante', badge: wiki('Levante_Union_Deportiva,_S_A_D_logo.svg') },
  { id: 'elche', name: 'Elche', badge: wiki('Elche_CF.svg') },
  { id: 'racing-santander', name: 'Racing de Santander', badge: wiki('Racing_de_Santander_logo.svg') },
  { id: 'deportivo-coruna', name: 'Deportivo de La Coruña', badge: wiki('RC_Deportivo_La_Coruna_logo.svg') },
  { id: 'malaga', name: 'Málaga', badge: wiki('Málaga_CF.svg') },
]

// La Champions League 2026/27 (fase liga) todavía no tiene los 36 equipos cerrados —
// quedan eliminatorias de clasificación por jugar en agosto. Se añadirá en cuanto
// se confirme el cuadro completo.
export const CHAMPIONS_TEAMS_2026_27: TierItem[] = []
