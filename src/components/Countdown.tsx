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

export default function Countdown({ deadline, className }: { deadline: Date; className?: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const msLeft = deadline.getTime() - now
  if (msLeft <= 0) return null

  return (
    <span className={className}>
      Quedan <span className="tabular-nums">{formatTimeLeft(msLeft)}</span>
    </span>
  )
}
