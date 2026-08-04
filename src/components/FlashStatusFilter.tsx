import { FLASH_STATUS_LABELS, type FlashStatus } from '../lib/flashStatus'

const ALL_STATUSES: FlashStatus[] = ['open', 'closed', 'resolved']

const ACTIVE_CLASSES: Record<FlashStatus, string> = {
  open: 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-400',
  closed: 'bg-amber-100 text-amber-700 ring-2 ring-offset-1 ring-amber-400',
  resolved: 'bg-green-100 text-green-700 ring-2 ring-offset-1 ring-green-400',
}

interface Props {
  value: Set<FlashStatus>
  onChange: (next: Set<FlashStatus>) => void
}

// Mismo patrón que el filtro de posiciones del 11 de Abuelonchos: cada
// botón se activa/desactiva de forma independiente. Sin nada pulsado, o con
// los tres pulsados a la vez, se ve todo — pulsar uno o dos deja solo esas
// preguntas.
export default function FlashStatusFilter({ value, onChange }: Props) {
  function toggle(status: FlashStatus) {
    const next = new Set(value)
    if (next.has(status)) next.delete(status)
    else next.add(status)
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_STATUSES.map((status) => {
        const active = value.has(status)
        return (
          <button
            key={status}
            type="button"
            onClick={() => toggle(status)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              active ? ACTIVE_CLASSES[status] : 'bg-gray-100 text-gray-500'
            }`}
          >
            {FLASH_STATUS_LABELS[status]}
          </button>
        )
      })}
    </div>
  )
}
