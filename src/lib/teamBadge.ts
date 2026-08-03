import { LALIGA_TEAMS_2026_27 } from './teamData'

// Busca el escudo de un equipo por su nombre exacto (usado en las preguntas de
// predicción de resultado, donde el equipo se guarda como texto libre en vez
// de por id). Si no se encuentra, no pasa nada: simplemente no se muestra escudo.
export function findTeamBadge(name: string | undefined): string | undefined {
  if (!name) return undefined
  const normalized = name.trim().toLowerCase()
  return LALIGA_TEAMS_2026_27.find((t) => t.name.toLowerCase() === normalized)?.badge
}
