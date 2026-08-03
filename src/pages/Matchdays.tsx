import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Matchday } from '../lib/database.types'

export default function Matchdays() {
  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('matchdays')
      .select('*')
      .order('deadline', { ascending: false })
      .then(({ data }) => {
        setMatchdays((data as Matchday[]) ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-gray-500">Cargando jornadas…</p>

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Jornadas</h1>
      {matchdays.length === 0 && (
        <p className="text-gray-400">Todavía no hay jornadas creadas. El admin puede añadirlas.</p>
      )}
      {matchdays.map((m) => (
        <Link
          key={m.id}
          to={`/jornadas/${m.id}`}
          className="flex items-center justify-between rounded border border-gray-200 bg-white px-4 py-3 hover:border-blue-400"
        >
          <span className="font-medium">
            {m.competition} — Jornada {m.number}
          </span>
          <span className="text-sm text-gray-500">
            Cierra: {new Date(m.deadline).toLocaleString('es-ES')}
          </span>
        </Link>
      ))}
    </div>
  )
}
