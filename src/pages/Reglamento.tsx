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

export default function Reglamento() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">📜 Reglamento oficial</h1>
        <p className="text-sm text-gray-500">Las normas, letra pequeña incluida.</p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-base font-bold text-gray-900">⚽ Fantasy: cómo cuenta para la clasificación general</h2>
        <p className="text-sm text-gray-600">
          El Fantasy (tu 11 de Abuelonchos) tiene su propia liga aparte, jornada a jornada — se ve en la pestaña
          Fantasy › Clasificación. No se suman los puntos de esa liga directamente a la clasificación general:
          en vez de eso, tu <strong>puesto final</strong> en la liga Fantasy se convierte en un bonus de puntos que sí
          entra en la clasificación general, junto a los puntos del resto de bloques.
        </p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-500">Puesto en la liga Fantasy</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Bonus a la general</th>
              </tr>
            </thead>
            <tbody>
              {FANTASY_BONUS_TABLE.map(([place, bonus]) => (
                <tr key={place} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-3 py-2 text-gray-700">{place}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">{bonus > 0 ? `+${bonus}` : '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400">
          Si hay empate en la liga Fantasy, se reparte el mismo bonus a quienes empatan. La fórmula de puntos de cada
          jugador (minutos, goles, asistencias...) está en Fantasy › Cómo puntúa.
        </p>
      </section>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <span className="text-3xl">🚧</span>
        <p className="font-medium text-gray-600">El resto está en construcción</p>
        <p className="max-w-sm text-sm text-gray-400">
          Aquí irán las normas y la puntuación del resto de bloques (Clasificación de Liga, Premios individuales,
          Duelos Big Three, Over/Under y Apuestas flash).
        </p>
      </div>
    </div>
  )
}
