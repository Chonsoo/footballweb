import { FANTASY_POSITIONS, FANTASY_POSITION_LABELS, type FantasyPosition } from '../lib/fantasyTypes'

// Explica la fórmula de public.fantasy_calculate_points() (ver
// supabase/migrations/015_fantasy_schema.sql) de forma legible -- lo que
// varía según la posición del jugador va en una tabla (para comparar de un
// vistazo), lo que es igual para todos va como lista aparte debajo.

const POSITION_COLORS: Record<FantasyPosition, string> = {
  POR: 'bg-orange-100 text-orange-800',
  DEF: 'bg-blue-100 text-blue-800',
  MED: 'bg-green-100 text-green-800',
  DEL: 'bg-red-100 text-red-800',
}

interface StatRow {
  icon: string
  label: string
  values: Record<FantasyPosition, string>
}

const STAT_ROWS: StatRow[] = [
  {
    icon: '⚽',
    label: 'Gol',
    values: { POR: '+8', DEF: '+6', MED: '+5', DEL: '+4' },
  },
  {
    icon: '🎯',
    label: 'Asistencia',
    values: { POR: '+6', DEF: '+5', MED: '+4', DEL: '+3' },
  },
  {
    icon: '🧤',
    label: 'Portería a cero',
    values: { POR: '+5', DEF: '+4', MED: '+1', DEL: '—' },
  },
]

export default function FantasyScoringRules() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-white/80">
        Cada jugador de tu 11 suma o resta puntos jornada a jornada según lo que haga en el partido real. Cuanto más
        atrás juega, más vale un gol o una asistencia suya (es más raro), y menos vale una portería a cero cuanto más
        arriba juega.
      </p>

      {/* Lo que varía según la posición: tabla, para comparar de un vistazo. */}
      <div className="overflow-hidden rounded-lg bg-white/[0.8] shadow-md shadow-black/10 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-3 py-2 text-left font-medium text-gray-500">Según posición</th>
              {FANTASY_POSITIONS.map((pos) => (
                <th key={pos} className="px-2 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${POSITION_COLORS[pos]}`}>{pos}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAT_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-gray-50 last:border-b-0">
                <td className="px-3 py-2 text-gray-700">
                  <span className="mr-1.5">{row.icon}</span>
                  {row.label}
                </td>
                {FANTASY_POSITIONS.map((pos) => (
                  <td key={pos} className="px-2 py-2 text-center font-semibold text-gray-800">
                    {row.values[pos]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-400">
          {FANTASY_POSITIONS.map((pos) => `${pos} = ${FANTASY_POSITION_LABELS[pos]}`).join(' · ')}. La portería a cero
          solo cuenta si el jugador estuvo 60 minutos o más en el campo.
        </p>
      </div>

      {/* Lo que es igual para cualquier jugador, sea cual sea su posición. */}
      <div className="rounded-lg bg-white/[0.8] p-3 shadow-md shadow-black/10 backdrop-blur-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Igual para todas las posiciones</p>
        <ul className="flex flex-col gap-1.5 text-sm text-gray-700">
          <li className="flex items-center justify-between">
            <span>⏱️ Jugó 60 minutos o más</span>
            <span className="font-semibold text-green-700">+2</span>
          </li>
          <li className="flex items-center justify-between">
            <span>⏱️ Jugó entre 1 y 59 minutos</span>
            <span className="font-semibold text-green-700">+1</span>
          </li>
          <li className="flex items-center justify-between">
            <span>⏱️ No llegó a jugar</span>
            <span className="font-semibold text-gray-400">0</span>
          </li>
          <li className="flex items-center justify-between">
            <span>🟨 Tarjeta amarilla</span>
            <span className="font-semibold text-red-700">−1</span>
          </li>
          <li className="flex items-center justify-between">
            <span>🟥 Tarjeta roja</span>
            <span className="font-semibold text-red-700">−3</span>
          </li>
          <li className="flex items-center justify-between">
            <span>🥅 Gol en propia puerta</span>
            <span className="font-semibold text-red-700">−2</span>
          </li>
        </ul>
      </div>

      <p className="rounded-lg bg-white/[0.67] px-3 py-2 text-xs text-gray-600 backdrop-blur-sm">
        Los puntos de cada jugador se suman y ese es el total de tu 11 esa jornada. Cómo se traduce tu puesto en la
        liga Fantasy a puntos en la clasificación general está en el Reglamento oficial.
      </p>
    </div>
  )
}
