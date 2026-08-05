import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'

// Fondo decorativo de Login/Registro: los 20 escudos de LaLiga repartidos en
// círculo, orbitando despacio alrededor del centro (estilo rueda de
// Pasapalabra). Puramente visual (pointer-events-none, detrás de la
// tarjeta), no afecta a nada de la lógica de autenticación.
//
// Cada escudo pasa por 3 transforms EN ELEMENTOS DISTINTOS -- no se pueden
// mezclar en el mismo nodo porque la animación de CSS (transform: rotate)
// sobreescribe cualquier transform estático puesto ahí (p.ej. un
// translate(-50%,-50%) en el mismo elemento desaparecería en cuanto arranca
// la animación):
//  1. Posicionador (estático, inline): rotate(ángulo) translate(radio)
//     rotate(-ángulo) -- lo manda a su punto del círculo sin inclinarlo.
//     El radio va en vmin (no %) porque este nodo no tiene tamaño propio
//     (es solo un punto), y translate(%) se calcula sobre el tamaño del
//     propio elemento -- con w-0/h-0 eso siempre sería 0.
//  2. .auth-orbit-counter (animado): cancela el giro de .auth-orbit-ring
//     para que el escudo no dé vueltas sobre sí mismo mientras orbita.
//  3. Imagen (estático): translate(-50%,-50%) para centrarla sobre su punto.
export default function AuthOrbitBackground() {
  const teams = LALIGA_TEAMS_2026_27
  const radius = '38vmin'

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="auth-orbit-ring absolute left-1/2 top-1/2 h-0 w-0">
        {teams.map((team, i) => {
          const angle = (360 / teams.length) * i
          return (
            <div key={team.id} className="absolute left-0 top-0" style={{ transform: `rotate(${angle}deg) translate(${radius}) rotate(${-angle}deg)` }}>
              <div className="auth-orbit-counter">
                <img
                  src={team.badge}
                  alt=""
                  className="h-10 w-10 -translate-x-1/2 -translate-y-1/2 object-contain opacity-40 drop-shadow-[0_0_6px_rgba(0,0,0,0.4)] sm:h-12 sm:w-12"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
