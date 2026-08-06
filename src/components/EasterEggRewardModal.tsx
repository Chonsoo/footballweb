import { useMemo } from 'react'
import { createPortal } from 'react-dom'

const CONFETTI_COLORS = ['#d9ad4a', '#f4d888', '#fbf1d9', '#b8862c', '#ffffff']

// Pantalla completa de premio al terminar el paso 5 -- no es un modal de
// "paso completado" normal como los otros, es el cierre del huevo de
// pascua entero, así que se trata distinto (confeti + mensaje grande).
// El confeti es un puñado de divs con una animación CSS de caída/giro,
// sin depender de ninguna librería externa.
export default function EasterEggRewardModal({ onClose }: { onClose: () => void }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.6 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 6,
      })),
    []
  )

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-gradient-to-br from-noir-950 via-noir-900 to-noir-800 px-4">
      <style>{`
        @keyframes egg-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0.9; }
        }
        @keyframes egg-reward-pop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {pieces.map((p) => (
        <span
          key={p.id}
          className="pointer-events-none absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `egg-confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}

      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-black/30 p-8 text-center shadow-2xl backdrop-blur-sm"
        style={{ animation: 'egg-reward-pop 0.5s ease-out' }}
      >
        <span className="text-6xl">🏆</span>
        <h2 className="mt-4 text-xl font-bold text-gold-400">¡Abueloncho Dorado conseguido!</h2>
        <p className="mt-2 text-sm text-white/80">Has completado los 5 pasos del huevo de pascua.</p>
        <p className="mt-1 text-lg font-semibold text-gold-400">🥚 +10 puntos</p>
        <p className="mt-3 text-xs text-white/50">Tu nombre brillará en dorado en la Clasificación a partir de ahora.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-full bg-gold-500 px-6 py-2 text-sm font-semibold text-noir-950 shadow-sm transition-transform hover:scale-105"
        >
          ¡Genial!
        </button>
      </div>
    </div>,
    document.body
  )
}
