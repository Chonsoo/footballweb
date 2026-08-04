import { useEffect, useState } from 'react'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// "3d 04:12:37" o, si queda menos de un día, "04:12:37" — con los segundos
// bajando en vivo (se nota que corre de verdad, no solo un número que
// cambia de vez en cuando).
function formatTimeLeft(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return days > 0 ? `${days}d ${clock}` : clock
}

// Siempre en rojo — es una cuenta atrás contra un cierre, no un dato neutro,
// así que el color va integrado aquí por defecto en vez de dejarlo a
// merced de que cada sitio que lo usa se acuerde de pasar clases rojas.
const BASE_CLASSES =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700'

export default function Countdown({ deadline, className }: { deadline: Date; className?: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const msLeft = deadline.getTime() - now
  if (msLeft <= 0) return null

  return (
    <span className={className ?? BASE_CLASSES}>
      <span aria-hidden>⏳</span>
      <span className="tabular-nums">{formatTimeLeft(msLeft)}</span>
    </span>
  )
}
