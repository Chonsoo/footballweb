// Color principal aproximado de cada equipo (para dar un toque personalizado
// con el color del equipo favorito en el inicio). No son los códigos exactos
// de marca de cada club, son una aproximación fiel a simple vista — esto es
// solo decoración, no necesita precisión de manual de estilo.
export const TEAM_COLORS: Record<string, string> = {
  'real-madrid': '#3b82c4',
  barcelona: '#a50044',
  'atletico-madrid': '#d3121a',
  'athletic-club': '#ee2523',
  villarreal: '#ffe667',
  'real-betis': '#00954c',
  'real-sociedad': '#0067b1',
  'rayo-vallecano': '#d2202b',
  'celta-vigo': '#8ac3ee',
  osasuna: '#d2122e',
  getafe: '#1c2d5a',
  alaves: '#0a3b7c',
  espanyol: '#0a4c94',
  valencia: '#ee7a1f',
  sevilla: '#d0021b',
  levante: '#b02033',
  elche: '#056839',
  'racing-santander': '#058542',
  'deportivo-coruna': '#0a3f8c',
  malaga: '#1560aa',
}

export function getTeamColor(teamId: string | null | undefined): string | null {
  if (!teamId) return null
  return TEAM_COLORS[teamId] ?? null
}
