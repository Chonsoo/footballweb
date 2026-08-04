import { isInitialPhaseClosed } from './deadlines'

// Secciones principales de la app, en el orden en que aparecen en la tira de
// pestañas del móvil y en el que se navega al deslizar con el dedo (swipe).
// Admin y las páginas de jornadas se quedan fuera a propósito — son
// secundarias, se llega a ellas desde el menú de perfil / las tarjetas.
export interface NavTab {
  path: string
  label: string
  icon: string
}

const ALL_TABS: NavTab[] = [
  { path: '/', label: 'Inicio', icon: '🏠' },
  { path: '/clasificacion', label: 'Clasificación', icon: '🏆' },
  { path: '/apuestas-iniciales', label: 'Apuestas iniciales', icon: '📝' },
  { path: '/apuestas-semana', label: 'Apuestas flash', icon: '⚡' },
  { path: '/oraculo', label: 'El oráculo', icon: '🔮' },
  { path: '/mis-apuestas', label: 'Mis apuestas', icon: '✅' },
  { path: '/apuestas-detalladas', label: 'Apuestas detalladas', icon: '🔍' },
  { path: '/fantasy', label: 'Fantasy', icon: '⚽' },
  { path: '/informacion', label: 'Información', icon: 'ℹ️' },
  { path: '/reglamento', label: 'Reglamento oficial', icon: '📜' },
]

// Una vez pasado el plazo de "Apuestas iniciales" esa pestaña se quita de la
// navegación — a partir de ahí vive en "Mis apuestas" (resumen) y "Apuestas
// detalladas" (el detalle de cada uno), así que mantenerla aparte sería
// repetir lo mismo dos veces. La página en sí sigue existiendo (en modo
// solo lectura) por si alguien llega por un enlace directo.
export function getNavTabs(): NavTab[] {
  if (isInitialPhaseClosed()) {
    return ALL_TABS.filter((t) => t.path !== '/apuestas-iniciales')
  }
  return ALL_TABS
}

// Índice de la pestaña activa para una ruta dada, o -1 si la ruta actual no
// es una de las secciones principales (p.ej. /admin, /jornadas/:id) — en ese
// caso no hay pestaña que resaltar ni swipe que hacer.
export function activeTabIndex(pathname: string): number {
  const tabs = getNavTabs()
  return tabs.findIndex((t) => (t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)))
}
