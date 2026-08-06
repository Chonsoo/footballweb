import type { ReactNode } from 'react'

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
]

const B3_TABLE: [string, string][] = [
  ['Acertar el 1x2 (quién gana o si es empate)', '5 pts'],
  ['Además, marcador exacto', '+7 pts extra'],
  ['Total si aciertas el marcador exacto', '12 pts'],
]

const B4_TABLE: [string, string][] = [
  ['¿El Pichichi marcará más de 26.5 goles?', '5 pts'],
  ['¿El campeón superará los 88.5 puntos?', '5 pts'],
  ['¿Habrá más de 4.5 destituciones de entrenadores?', '5 pts'],
]

const FANTASY_BONUS_TABLE: [string, number][] = [
  ['1º', 25],
  ['2º', 21],
  ['3º', 17],
  ['4º', 12],
  ['5º', 7],
  ['6º', 5],
  ['7º', 3],
  ['8º', 2],
  ['9º', 1],
  ['10º en adelante', 0],
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-white/[0.67] p-4 shadow-md shadow-black/10 backdrop-blur-sm">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}

export default function Reglamento() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-white">📜 Reglamento oficial</h1>
        <p className="text-sm text-white/80">Las normas, letra pequeña incluida.</p>
      </div>

      <Section title="🎯 Cómo funciona la porra">
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
          Si dos o más participantes empatan a puntos en la clasificación general, comparten posición — no hay
          ningún criterio de desempate adicional.
        </p>
      </Section>

      <Section title="📋 Bloque 1 · Clasificación de Liga">
        <p className="text-sm text-gray-600">
          Predices la posición (1º a 20º) de los 20 equipos de LaLiga. Cuanto más cerca quedes de la posición real
          de cada equipo, más puntos ganas — no hace falta clavar toda la tabla exacta. Los puntos dependen de en
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

      <Section title="🏅 Bloque 2 · Premios individuales y narrativos">
        <p className="text-sm text-gray-600">Todo o nada (aciertas exacto o no sumas nada), salvo el Podio Underdog, que reparte puntos por posición.</p>
        <Table3 head={['Pregunta', 'Qué predices', 'Puntos']} rows={B2_TABLE} />
        <p className="text-sm text-gray-600">
          El Podio Underdog es una única pregunta (eliges un equipo). Al resolverla, se comparan los equipos
          elegidos por todos los participantes contra la clasificación real: quien eligió el que mejor quedó (de
          entre los elegidos) se lleva 15 pts, el siguiente mejor 8 pts, el siguiente 3 pts, y el resto 0.
        </p>
        <p className="text-xs text-gray-500">Máximo teórico del bloque: 5 × 10 (premios fijos) + 10 (Fiasco) + 15 (oro del Underdog) = 75 pts.</p>
      </Section>

      <Section title="⚔️ Bloque 3 · Duelos Big Three">
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

      <Section title="📈 Bloque 4 · Over/Under">
        <p className="text-sm text-gray-600">Todo o nada: aciertas si el resultado real queda por encima o por debajo de la línea marcada.</p>
        <Table2 head={['Pregunta', 'Puntos']} rows={B4_TABLE} />
        <p className="text-xs text-gray-500">Máximo teórico del bloque: 3 × 5 pts = 15 pts.</p>
      </Section>

      <Section title="⚽ Fantasy: cómo cuenta para la clasificación general">
        <p className="text-sm text-gray-600">
          El Fantasy (tu 11 de Abuelonchos) tiene su propia liga aparte, jornada a jornada — se ve en la pestaña
          Fantasy › Clasificación. No se suman los puntos de esa liga directamente a la clasificación general:
          en vez de eso, tu <strong>puesto final</strong> en la liga Fantasy se convierte en un bonus de puntos que sí
          entra en la clasificación general, junto a los puntos del resto de bloques.
        </p>
        <Table2 head={['Puesto en la liga Fantasy', 'Bonus a la general']} rows={FANTASY_BONUS_TABLE.map(([p, b]) => [p, b > 0 ? `+${b}` : '0'])} />
        <p className="text-xs text-gray-400">
          Si hay empate en la liga Fantasy, se reparte el mismo bonus a quienes empatan. La fórmula de puntos de cada
          jugador (minutos, goles, asistencias...) está en Fantasy › Cómo puntúa.
        </p>
      </Section>

      <Section title="⚡ Apuestas flash">
        <p className="text-sm text-gray-600">
          Preguntas que el admin va creando jornada a jornada, fuera de los 4 bloques de Apuestas iniciales, con el
          mismo motor de puntuación por debajo: cada pregunta lleva su propio valor de puntos, decidido por el admin
          al crearla, así que no hay un valor ni un máximo fijos — depende de cuántas cree y cuántos puntos le ponga
          a cada una.
        </p>
        <Table2
          head={['Tipo de pregunta', 'Cómo puntúa']}
          rows={[
            ['Texto / opción (Sí-No, elegir equipo o jugador...)', 'Todo o nada: los puntos de la pregunta si aciertas exacto, 0 si no'],
            ['Marcador (predicción de resultado)', 'Igual que los Duelos Big Three: 5 pts por el 1x2 + 7 extra si el marcador es exacto (12 en total)'],
          ]}
        />
      </Section>

      <Section title="🛠️ Dudas, reclamaciones y funcionamiento técnico">
        <p className="text-sm text-gray-600">
          Cualquier discrepancia sobre un resultado o una puntuación debe comunicarse a la organización antes del
          cierre de la siguiente jornada; pasado ese plazo, la puntuación se considera definitiva y no se revisa.
          Los empates a puntos en la clasificación general no se desempatan: se comparte la posición.
        </p>
        <p className="text-sm text-gray-600">
          El buscador de Apuestas detalladas conserva, por motivos históricos de compatibilidad con versiones
          antiguas de la porra, una entrada que no aparece listada en ningún filtro. No admite mayúsculas, tildes
          ni espacios: si el texto introducido coincide exactamente con el nombre en clave con el que se bautizó
          este proyecto, la búsqueda puede devolver algo que no está en ninguna otra parte de este reglamento.
        </p>
        <p className="text-sm text-gray-600">
          Este comportamiento no afecta a la puntuación de ningún bloque ni requiere ninguna acción por parte de
          los participantes que no quieran indagar en él.
        </p>
      </Section>
    </div>
  )
}
