// Gráficos pequeños para El Oráculo, en SVG/CSS puro y sin ninguna librería
// externa (no hace falta meter algo como recharts para un puñado de mini
// visualizaciones). Donut para preguntas con pocas respuestas distintas,
// barras clasificadas para las que tienen muchas (texto libre, jugadores...),
// y una barra segmentada para las distribuciones de zona (Clasificación).

export interface ChartSlice {
  label: string
  pct: number
  color: string
}

export const CHART_PALETTE = ['#2f8f4e', '#d9ad4a', '#3b82f6', '#f97316', '#a855f7', '#ef4444', '#06b6d4', '#ec4899']

// Truco clásico para un donut sin librería: un <circle> con stroke-dasharray
// recorta el trazo a la longitud proporcional de cada porción, y
// stroke-dashoffset lo desplaza para que empiecen donde acaba la anterior.
export function DonutChart({ slices, size = 88 }: { slices: ChartSlice[]; size?: number }) {
  const strokeWidth = size * 0.26
  const radius = size / 2
  const innerRadius = radius - strokeWidth / 2
  const circumference = 2 * Math.PI * innerRadius
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={radius} cy={radius} r={innerRadius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      {slices.map((s) => {
        const len = (s.pct / 100) * circumference
        const el = (
          <circle
            key={s.label}
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-offset}
          />
        )
        offset += len
        return el
      })}
    </svg>
  )
}

export function ChartLegend({ slices }: { slices: ChartSlice[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {slices.map((s) => (
        <li key={s.label} className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="min-w-0 flex-1 truncate text-gray-600">{s.label}</span>
          <span className="shrink-0 font-semibold text-gray-800">{Math.round(s.pct)}%</span>
        </li>
      ))}
    </ul>
  )
}

export function RankedBars({ slices }: { slices: ChartSlice[] }) {
  return (
    <div className="flex flex-col gap-2">
      {slices.map((s) => (
        <div key={s.label} className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate font-medium text-gray-700">{s.label}</span>
            <span className="shrink-0 font-semibold" style={{ color: s.color }}>
              {Math.round(s.pct)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${Math.round(s.pct)}%`, backgroundColor: s.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Barra "apilada": un solo trazo con un tramo de color por porción, en vez de
// una barra fina de un único color con solo el valor más votado.
export function SegmentedBar({ slices }: { slices: ChartSlice[] }) {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
      {slices
        .filter((s) => s.pct > 0)
        .map((s) => (
          <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${s.label}: ${Math.round(s.pct)}%`} />
        ))}
    </div>
  )
}
