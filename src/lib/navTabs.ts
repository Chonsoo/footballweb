// Secciones principales de la app, en el orden en que aparecen en la tira de
// pestañas del móvil y en el que se navega al deslizar con el dedo (swipe).
// Admin y las páginas de jornadas se quedan fuera a propósito — son
// secundarias, se llega a ellas desde el menú de perfil / las tarjetas.
export interface NavTab {
  path: string
  label: string
  icon: string
}

export const NAV_TABS: NavTab[] = [
  { path: '/', label: 'Inicio', icon: '🏠' },
  { path: '/clasificacion', label: 'Clasificación', icon: '🏆' },
  { path: '/apuestas-iniciales', label: 'Apuestas iniciales', icon: '📝' },
  { path: '/apuestas-semana', label: 'Apuestas de la semana', icon: '📅' },
  { path: '/oraculo', label: 'El oráculo', icon: '🔮' },
  { path: '/mis-apuestas', label: 'Mis apuestas', icon: '✅' },
  { path: '/apuestas-detalladas', label: 'Apuestas detalladas', icon: '🔍' },
  { path: '/informacion', label: 'Información', icon: 'ℹ️' },
  { path: '/reglamento', label: 'Reglamento oficial', icon: '📜' },
]

// Índice de la pestaña activa para una ruta dada, o -1 si la ruta actual no
// es una de las secciones principales (p.ej. /admin, /jornadas/:id) — en ese
// caso no hay pestaña que resaltar ni swipe que hacer.
export function activeTabIndex(pathname: string): number {
  return NAV_TABS.findIndex((t) => (t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)))
}
