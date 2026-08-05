import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'

// Fondo decorativo de Login/Registro: los 20 escudos de LaLiga repartidos en
// círculo, orbitando lentamente alrededor del centro. Puramente visual
// (pointer-events-none, detrás de la tarjeta con z-index), no afecta a nada
// de la lógica de autenticación.
//
// Cada escudo lleva DOS transforms:
//  1. Uno estático (rotate(ángulo) translate(radio) rotate(-ángulo)) que lo
//     reparte en su punto del círculo sin inclinar la imagen.
//  2. Uno animado (.auth-orbit-counter, en index.css) que cancela el giro
//     del anillo exterior (.auth-orbit-ring) para que el escudo no gire
//     sobre sí mismo mientras da vueltas.
export default function AuthOrbitBackground() {
  const teams = LALIGA_TEAMS_2026_27
  const radius = 42 // % del contenedor cuadrado

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 aspect-square w-[140vw] max-w-none -translate-x-1/2 -translate-y-1/2 sm:w-[110vh]">
        <div className="auth-orbit-ring relative h-full w-full">
          {teams.map((team, i) => {
            const angle = (360 / teams.length) * i
            return (
              <div
                key={team.id}
                className="absolute left-1/2 top-1/2 h-0 w-0"
                style={{ transform: `rotate(${angle}deg) translate(${radius}%) rotate(${-angle}deg)` }}
              >
                <div className="auth-orbit-counter -translate-x-1/2 -translate-y-1/2">
                  <img src={team.badge} alt="" className="h-8 w-8 object-contain opacity-15 grayscale sm:h-10 sm:w-10" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
