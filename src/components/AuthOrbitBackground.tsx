import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'

// Fondo decorativo de Login/Registro: los 20 escudos de LaLiga repartidos en
// círculo, orbitando despacio alrededor del centro (estilo rueda de
// Pasapalabra). Puramente visual (pointer-events-none, detrás de la
// tarjeta), no afecta a nada de la lógica de autenticación.
//
// Posición de cada escudo calculada con trigonometría en JS (coseno/seno del
// ángulo) en vez de la típica composición `rotate() translate() rotate()`:
// así evitamos depender del transform-origin del elemento (por defecto es el
// CENTRO de su propia caja, no la esquina, lo que descuadraba el radio) y de
// mezclar transforms estáticos con la animación en el mismo nodo.
//
// Cada escudo usa 3 nodos con una única responsabilidad cada uno:
//  1. Posicionador (estático, left/top en vmin vía calc): lo manda a su
//     punto del círculo. left/top no depende del transform-origin.
//  2. .auth-orbit-counter (animado): cancela el giro de .auth-orbit-ring
//     para que el escudo no dé vueltas sobre sí mismo mientras orbita.
//  3. Imagen (estático): translate(-50%,-50%) para centrar el escudo sobre
//     su punto (este nodo no tiene animación, así que el transform estático
//     no se pierde).
export default function AuthOrbitBackground() {
  const teams = LALIGA_TEAMS_2026_27
  const radius = 40 // vmin

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="auth-orbit-ring absolute left-1/2 top-1/2 h-0 w-0">
        {teams.map((team, i) => {
          const angle = (360 / teams.length) * i
          const rad = (angle * Math.PI) / 180
          const x = Math.cos(rad) * radius
          const y = Math.sin(rad) * radius
          return (
            <div key={team.id} className="absolute" style={{ left: `${x}vmin`, top: `${y}vmin` }}>
              <div className="auth-orbit-counter">
                <img
                  src={team.badge}
                  alt=""
                  className="h-11 w-11 -translate-x-1/2 -translate-y-1/2 object-contain opacity-70 drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)] sm:h-14 sm:w-14"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
