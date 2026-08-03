import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { LeaderboardRow } from '../lib/database.types'

export default function Ranking() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('leaderboard')
      .select('*')
      .then(({ data }) => {
        setRows((data as LeaderboardRow[]) ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-gray-500">Cargando ranking…</p>

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Ranking</h1>
      <table className="w-full overflow-hidden rounded border border-gray-200 bg-white text-left">
        <thead className="bg-gray-100 text-sm text-gray-600">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Jugador</th>
            <th className="px-4 py-2 text-right">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.user_id} className="border-t border-gray-100">
              <td className="px-4 py-2 text-gray-500">{i + 1}</td>
              <td className="px-4 py-2 font-medium">{row.username}</td>
              <td className="px-4 py-2 text-right">{row.total_points}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                Todavía no hay puntos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
