import { useRef, useState, type ReactNode } from 'react'

// Datos de puntuación reflejados aquí tal y como están programados hoy en la
// app (ver src/lib/rankingScoring.ts, src/lib/scorePrediction.ts,
// src/lib/underdogScoring.ts, src/lib/blocks.ts y
// src/components/FantasyScoringRules.tsx) -- si algún día se cambia algún
// valor de puntos, hay que actualizarlo también aquí.

const B1_EXACT_TABLE: [string, string][] = [
  ['1º (campeón)', '25 pts'],
  ['2º y 3º', '15 pts cada uno'],
  ['4º al 7º', '10 pts cada uno'],
  ['8º al 17º', '7 pts exacto · 4 pts a 1 puesto · 2 pts a 2 puestos · 0 pts a 3+ puestos'],
  ['18º al 20º (descenso)', '15 pts cada uno'],
]

const B1_ZONE_TABLE: [string, string, string][] = [
  ['Champions', '1º - 4º', '+3 pts'],
  ['Europa League', '5º - 6º', '+3 pts'],
  ['Descenso', '18º - 20º', '+5 pts'],
]

const B2_TABLE: [string, string, string][] = [
  ['Pichichi Absoluto', 'Máximo goleador de LaLiga', '10 pts'],
  ['Trofeo Zamora', 'Portero menos goleado', '10 pts'],
  ['Trofeo Zarra', 'Máximo goleador español', '10 pts'],
  ['Máximo Asistente', 'Quién da más asistencias', '10 pts'],
  ['Pichichi "Clase Media"', 'Máx. goleador sin Real Madrid / Barça / Atleti', '10 pts'],
  ['El Fiasco Europeo', 'Peor colocado de los equipos con Europa la temporada pasada', '10 pts'],
  ['Podio Underdog', 'Equipo revelación (sin Europa previa) que acabará más arriba', '15 / 8 / 3 pts'],
  ['Equipo Más Carnicero', 'Equipo con más puntos de tarjetas (amarilla = 1 pto, roja = 2 ptos)', '15 / 8 / 3 pts'],
]

const B3_TABLE: [string, string][] = [
  ['Acertar el 1x2 (quién gana o si es empate)', '5 pts'],
  ['Además, marcador exacto', '+7 pts extra'],
  ['Total si aciertas el marcador exacto', '12 pts'],
]

const B4_TABLE: [string, string][] = [
  ['¿El máximo goleador de LaLiga marcará más de 26.5 goles?', '3 pts'],
  ['¿El equipo campeón superará los 89.5 puntos?', '3 pts'],
  ['¿Habrá más de 8.5 destituciones de entrenadores durante la temporada?', '3 pts'],
  ['¿Habrá más de 10.5 tarjetas sumando los dos Clásicos de liga?', '3 pts'],
  ['¿El portero Zamora logrará más de 18.5 porterías a cero?', '3 pts'],
  ['¿Habrá algún equipo con una racha de más de 7.5 victorias consecutivas?', '3 pts'],
  ['¿El último clasificado de LaLiga sumará más de 23.5 puntos?', '3 pts'],
  ['¿El mejor recién ascendido logrará más de 44.5 puntos?', '3 pts'],
  ['¿Habrá algún partido en la liga con más de 8.5 goles entre los dos equipos?', '3 pts'],
  ['¿Habrá más de 3.5 jugadores españoles entre los 10 máximos goleadores?', '3 pts'],
]

const FANTASY_BONUS_TABLE: [string, number][] = [
  ['1º', 45],
  ['2º', 40],
  ['3º', 35],
  ['4º', 30],
  ['5º', 25],
  ['6º', 20],
  ['7º', 15],
  ['8º', 10],
  ['9º', 5],
  ['10º', 2],
  ['11º en adelante', 0],
]

function Table2({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-3 py-2 text-left font-medium text-gray-500">{head[0]}</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a} className="border-b border-gray-50 last:border-b-0">
              <td className="px-3 py-2 text-gray-700">{a}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-800">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Table3({ head, rows }: { head: [string, string, string]; rows: [string, string, string][] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-3 py-2 text-left font-medium text-gray-500">{head[0]}</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">{head[1]}</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">{head[2]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b, c]) => (
            <tr key={a} className="border-b border-gray-50 last:border-b-0">
              <td className="px-3 py-2 text-gray-700">{a}</td>
              <td className="px-3 py-2 text-gray-700">{b}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-800">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// Cada bloque con su propio color de insignia (en vez de todas las tarjetas
// iguales en blanco/gris) + plegable, para que la página no sea un muro de
// tablas idéntico de arriba a abajo: se abre lo que interesa, el resto queda
// resumido en el título.
function Section({
  id,
  icon,
  title,
  accent,
  open,
  onToggle,
  buttonRef,
  children,
}: {
  id: string
  icon: string
  title: string
  accent: string
  open: boolean
  onToggle: (id: string) => void
  buttonRef?: (el: HTMLButtonElement | null) => void
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-white/[0.67] shadow-md shadow-black/10 backdrop-blur-sm">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${accent}`}>{icon}</span>
        <span className="flex-1 text-base font-bold text-gray-900">{title}</span>
        <Chevron open={open} />
      </button>
      {open && <div className="flex flex-col gap-3 border-t border-gray-100 px-4 pb-4 pt-3">{children}</div>}
    </section>
  )
}

// Variante con la identidad propia de Fantasy (negro con toque verde +
// dorado, igual que la pestaña Fantasy), para que destaque como su propio
// bloque en vez de fundirse con el resto de tarjetas claras.
function FantasySection({
  open,
  onToggle,
  buttonRef,
  children,
}: {
  open: boolean
  onToggle: (id: string) => void
  buttonRef?: (el: HTMLButtonElement | null) => void
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-gradient-to-br from-noir-950 via-noir-900 to-noir-800 shadow-sm ring-1 ring-white/5">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onToggle('fantasy')}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-500/20 text-lg text-gold-400">⚽</span>
        <span className="flex-1 text-base font-bold text-white">Fantasy: cómo cuenta para la clasificación general</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="flex flex-col gap-3 border-t border-white/10 bg-white/95 px-4 pb-4 pt-3">{children}</div>}
    </section>
  )
}

export default function Reglamento() {
  // Todo colapsado al entrar -- nada desplegado por defecto.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Al plegar/desplegar una sección, todo lo que hay DEBAJO cambia de
  // altura de golpe -- si la sección tenía varias tablas, eso puede dejar
  // la página entera más corta que la posición de scroll en la que
  // estabas, y el navegador la recorta de golpe hasta arriba. Se corrige
  // "ancladando" el botón que se ha tocado: se mide su posición en pantalla
  // antes y después del cambio, y se compensa el scroll con la diferencia,
  // así el botón (y lo que estabas mirando) se queda donde estaba.
  function toggle(id: string) {
    const btn = buttonRefs.current[id]
    const beforeTop = btn?.getBoundingClientRect().top

    setOpenSections((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

    if (beforeTop != null) {
      requestAnimationFrame(() => {
        const afterTop = buttonRefs.current[id]?.getBoundingClientRect().top
        if (afterTop != null && afterTop !== beforeTop) {
          window.scrollBy(0, afterTop - beforeTop)
        }
      })
    }
  }

  const isOpen = (id: string) => openSections.has(id)
  const refFor = (id: string) => (el: HTMLButtonElement | null) => {
    buttonRefs.current[id] = el
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-white">📜 Reglamento oficial</h1>
        <p className="text-sm text-white/80">Las normas, letra pequeña incluida.</p>
      </div>

      <Section
        id="intro"
        icon="🎯"
        title="Cómo funciona la porra"
        accent="bg-brand-100 text-brand-700"
        open={isOpen('intro')}
        onToggle={toggle}
        buttonRef={refFor('intro')}
      >
        <p className="text-sm text-gray-600">
          Antes de que empiece la temporada se rellenan las <strong>Apuestas iniciales</strong>, repartidas en 4
          bloques (Clasificación de Liga, Premios individuales, Duelos Big Three y Over/Under) y el once del{' '}
          <strong>Fantasy</strong> ("El 11 de Abuelonchos"). Ya con la temporada en marcha, cada jornada se pueden
          ir abriendo <strong>Apuestas flash</strong> nuevas.
        </p>
        <p className="text-sm text-gray-600">
          Tu <strong>clasificación general</strong> es la suma de los puntos de los Bloques 1-4, más los puntos de
          todas las Apuestas flash que hayas acertado, más el bonus por tu puesto final en la liga Fantasy (ver más
          abajo). Cada apuesta se puntúa en cuanto el admin fija el resultado real; hasta entonces no suma nada.
        </p>
        <p className="text-sm text-gray-600">
          Si dos o más participantes empatan a puntos en la clasificación general, desempata quien tenga más puntos
          en el Bloque 1 (Clasificación de Liga); si también empatan ahí, desempata quien tenga más puntos en la
          liga Fantasy. Si coinciden en los tres, ahí sí comparten posición.
        </p>
      </Section>

      <Section
        id="b1"
        icon="📋"
        title="Bloque 1 · Clasificación de Liga"
        accent="bg-gold-100 text-gold-600"
        open={isOpen('b1')}
        onToggle={toggle}
        buttonRef={refFor('b1')}
      >
        <p className="text-sm text-gray-600">
          Predices la posición (1º a 20º) de los 20 equipos de LaLiga. Cuanto más cerca quedes de la posición real
          de cada equipo, más puntos ganas: no hace falta clavar toda la tabla exacta. Los puntos dependen de en
          qué zona cae la posición REAL del equipo:
        </p>
        <Table2 head={['Posición real', 'Si aciertas exacto']} rows={B1_EXACT_TABLE} />
        <h3 className="text-sm font-semibold text-gray-800">Bonus de "pleno de zona"</h3>
        <p className="text-sm text-gray-600">
          Si aciertas TODOS los equipos de una zona (da igual el orden interno dentro de la zona), sumas un bonus
          fijo aparte de los puntos por posición:
        </p>
        <Table3 head={['Zona', 'Posiciones', 'Bonus']} rows={B1_ZONE_TABLE} />
        <p className="text-xs text-gray-500">Máximo teórico del bloque: 210 pts por posiciones exactas + 11 pts de bonus de zona = 221 pts.</p>
      </Section>

      <Section
        id="b2"
        icon="🏅"
        title="Bloque 2 · Premios individuales y narrativos"
        accent="bg-purple-100 text-purple-700"
        open={isOpen('b2')}
        onToggle={toggle}
        buttonRef={refFor('b2')}
      >
        <p className="text-sm text-gray-600">
          Todo o nada (aciertas exacto o no sumas nada), salvo el Podio Underdog, que reparte puntos por posición.
        </p>
        <Table3 head={['Pregunta', 'Qué predices', 'Puntos']} rows={B2_TABLE} />
        <p className="text-sm text-gray-600">
          El Podio Underdog es una única pregunta (eliges un equipo). Al resolverla, se comparan los equipos
          elegidos por todos los participantes contra la clasificación real: quien eligió el que mejor quedó (de
          entre los elegidos) se lleva 15 pts, el siguiente mejor 8 pts, el siguiente 3 pts, y el resto 0.
        </p>
        <p className="text-sm text-gray-600">
          Equipo Más Carnicero funciona igual que el Podio Underdog: es una única pregunta (eliges un equipo). Al
          final de temporada se suman las tarjetas de cada equipo (amarilla = 1 punto, roja = 2 puntos) para saber
          quién quedó 1º, 2º y 3º en esa cuenta, y quien eligió el equipo que resultó 1º se lleva 15 pts, el que
          eligió el 2º 8 pts, el que eligió el 3º 3 pts, y el resto 0.
        </p>
        <p className="text-xs text-gray-500">
          Máximo teórico del bloque: 5 × 10 (premios fijos) + 10 (Fiasco) + 15 (oro del Underdog) + 15 (oro del
          Carnicero) = 90 pts.
        </p>
      </Section>

      <Section
        id="b3"
        icon="⚔️"
        title="Bloque 3 · Duelos Big Three"
        accent="bg-red-100 text-red-700"
        open={isOpen('b3')}
        onToggle={toggle}
        buttonRef={refFor('b3')}
      >
        <p className="text-sm text-gray-600">
          Los 6 enfrentamientos directos entre Real Madrid, Barcelona y Atlético de Madrid (ida y vuelta de cada
          emparejamiento). Predices el marcador exacto de cada partido.
        </p>
        <Table2 head={['Acierto', 'Puntos']} rows={B3_TABLE} />
        <p className="text-xs text-gray-500">
          Ida y vuelta puntúan cada una por su cuenta (2 partidos independientes). Máximo teórico del bloque: 6
          duelos × 12 pts = 72 pts.
        </p>
      </Section>

      <Section
        id="b4"
        icon="📈"
        title="Bloque 4 · Over/Under"
        accent="bg-blue-100 text-blue-700"
        open={isOpen('b4')}
        onToggle={toggle}
        buttonRef={refFor('b4')}
      >
        <p className="text-sm text-gray-600">Todo o nada: aciertas si el resultado real queda por encima o por debajo de la línea marcada.</p>
        <Table2 head={['Pregunta', 'Puntos']} rows={B4_TABLE} />
        <p className="text-xs text-gray-500">Máximo teórico del bloque: 10 × 3 pts = 30 pts.</p>
      </Section>

      <FantasySection open={isOpen('fantasy')} onToggle={toggle} buttonRef={refFor('fantasy')}>
        <p className="text-sm text-gray-600">
          El Fantasy (tu 11 de Abuelonchos) tiene su propia liga aparte, jornada a jornada (se ve en la pestaña
          Fantasy › Clasificación). No se suman los puntos de esa liga directamente a la clasificación general:
          en vez de eso, tu <strong>puesto final</strong> en la liga Fantasy se convierte en un bonus de puntos que sí
          entra en la clasificación general, junto a los puntos del resto de bloques.
        </p>
        <Table2 head={['Puesto en la liga Fantasy', 'Bonus a la general']} rows={FANTASY_BONUS_TABLE.map(([p, b]) => [p, b > 0 ? `+${b}` : '0'])} />
        <p className="text-xs text-gray-400">
          Si hay empate en la liga Fantasy, se reparte el mismo bonus a quienes empatan. La fórmula de puntos de cada
          jugador (minutos, goles, asistencias...) está en Fantasy › Cómo puntúa.
        </p>
      </FantasySection>

      <Section
        id="flash"
        icon="⚡"
        title="Apuestas flash"
        accent="bg-amber-100 text-amber-700"
        open={isOpen('flash')}
        onToggle={toggle}
        buttonRef={refFor('flash')}
      >
        <p className="text-sm text-gray-600">
          Preguntas de Sí/No sobre la actualidad de LaLiga, fuera de los 4 bloques de Apuestas iniciales: 5 pts cada
          acierto, 10 preguntas en total repartidas en 8 tandas a lo largo de la temporada (50 pts máximos en juego,
          un ~10% del total de la porra).
        </p>
        <Table2
          head={['Tanda', 'Preguntas']}
          rows={[
            ['Jornadas 5, 10, 15, 25, 30 y 35', '1 pregunta (5 pts)'],
            ['Jornada 20 · Especial Mercado de Invierno', '2 preguntas (10 pts)'],
            ['Jornada 38 · Especial Traca Final', '2 preguntas (10 pts)'],
          ]}
        />
        <p className="text-sm text-gray-600">
          El admin publica las preguntas de cada tanda el martes o miércoles previo a esa jornada. El plazo para
          responder cierra en el minuto 1 del primer partido de la jornada correspondiente.
        </p>
      </Section>

      <Section
        id="dudas"
        icon="🛠️"
        title="Dudas y agradecimientos"
        accent="bg-gray-100 text-gray-600"
        open={isOpen('dudas')}
        onToggle={toggle}
        buttonRef={refFor('dudas')}
      >
        <p className="text-sm text-gray-600">
          Cualquier discrepancia sobre un resultado o una puntuación debe comunicarse a la organización antes del
          cierre de la siguiente jornada; pasado ese plazo, la puntuación se considera definitiva y no se revisa.
          Los empates a puntos en la clasificación general se desempatan primero por puntos en el Bloque 1 y luego
          por puntos en la liga Fantasy (ver "Cómo se juega" al principio).
        </p>
        <h3 className="text-sm font-semibold text-gray-800">Agradecimientos</h3>
        <p className="text-sm text-gray-600">
          Gracias por leer el reglamento hasta el final: no todo el mundo llega hasta aquí. Esta porra está hecha
          con cariño, tardes robadas al sofá y algún que otro exceso de detalle en preguntas que, seamos sinceros,
          nadie más iba a leerse con esta atención. Si has llegado hasta aquí te mereces un premio: ¿qué tal si
          buscas «abuelonchodorado» en el buscador donde se ve lo que ha puesto cada participante? Dicho esto, que
          disfrutéis la temporada y que gane el mejor abueloncho (o el que más suerte tenga).
        </p>
      </Section>
    </div>
  )
}
