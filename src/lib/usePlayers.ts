import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { FantasyPlayer } from './fantasyTypes'

// Carga todos los jugadores activos (no solo los elegibles para el 11 de
// Abuelonchos) — los usan los selectores de jugador en preguntas tipo
// "Pichichi", "Trofeo Zarra", etc. Cacheado a nivel de módulo para que varias
// preguntas de jugador en la misma pantalla (p.ej. todo el Bloque 2) no
// disparen una consulta cada una.
let cache: Promise<FantasyPlayer[]> | null = null

async function loadPlayers(): Promise<FantasyPlayer[]> {
  const { data } = await supabase.from('fantasy_players').select('*').eq('active', true).order('name')
  return (data as FantasyPlayer[]) ?? []
}

function fetchPlayers(): Promise<FantasyPlayer[]> {
  if (!cache) {
    cache = loadPlayers()
    // Solo se reutiliza para las llamadas simultáneas del mismo montaje de
    // pantalla (varios PlayerSelect a la vez no disparan N consultas). Se
    // limpia justo después de resolver para que la siguiente vez que se
    // entre a una pantalla con buscador de jugador se traigan datos
    // frescos — si no, tras importar jugadores nuevos desde el Admin (foto,
    // nombre completo…) el resto de la app seguiría viendo la foto vieja
    // hasta recargar la página entera.
    cache.finally(() => {
      setTimeout(() => {
        cache = null
      }, 0)
    })
  }
  return cache
}

export function usePlayers() {
  const [players, setPlayers] = useState<FantasyPlayer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchPlayers().then((ps) => {
      if (!cancelled) {
        setPlayers(ps)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { players, loading }
}
