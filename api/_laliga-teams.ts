// Nuestro id interno de equipo (el que usa toda la app, ver src/lib/teamData.ts)
// -> slug real que espera la API de laliga.com. No siempre coinciden: p.ej.
// "barcelona" en nuestro sistema es "fc-barcelona" en la suya, y varios slugs
// "obvios" (villarreal, valencia, sevilla, alaves, espanyol, osasuna, getafe,
// levante, malaga) están ocupados por un equipo distinto (el filial de LaLiga
// Promises), así que hay que usar el slug largo real.
//
// Vive en un fichero aparte (con guion bajo delante, para que Vercel no lo
// publique como endpoint) porque lo usan varias funciones: la que importa
// plantillas y la que importa estadísticas por jornada.
export const TEAM_SLUGS: Record<string, string> = {
  'real-madrid': 'real-madrid',
  barcelona: 'fc-barcelona',
  'atletico-madrid': 'atletico-de-madrid',
  'athletic-club': 'athletic-club',
  villarreal: 'villarreal-cf',
  'real-betis': 'real-betis',
  'real-sociedad': 'real-sociedad',
  'rayo-vallecano': 'rayo-vallecano',
  'celta-vigo': 'rc-celta',
  osasuna: 'c-a-osasuna',
  getafe: 'getafe-cf',
  alaves: 'd-alaves',
  espanyol: 'rcd-espanyol',
  valencia: 'valencia-cf',
  sevilla: 'sevilla-fc',
  levante: 'levante-ud',
  elche: 'elche-c-f',
  'racing-santander': 'r-racing-club',
  'deportivo-coruna': 'rc-deportivo',
  malaga: 'malaga-cf',
}

// slug de laliga.com -> nuestro id interno. El slug que aparece en la ficha de
// un partido no siempre es idéntico al de la plantilla (p.ej. el Espanyol sale
// como "rcd-espanyol-de-barcelona" en algunos sitios), así que se añaden aquí
// los alias conocidos en vez de fallar el emparejamiento.
const EXTRA_ALIASES: Record<string, string> = {
  'rcd-espanyol-de-barcelona': 'espanyol',
  'elche-cf': 'elche',
  'ca-osasuna': 'osasuna',
}

export const OUR_TEAM_BY_SLUG: Record<string, string> = {
  ...Object.fromEntries(Object.entries(TEAM_SLUGS).map(([ourId, slug]) => [slug, ourId])),
  ...EXTRA_ALIASES,
}
