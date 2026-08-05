import { QuestionInput } from './QuestionInput'
import Countdown from './Countdown'
import { formatAnswer } from '../lib/answerFormat'
import { isAnswerComplete } from '../lib/isAnswerComplete'
import { formatPoints } from '../lib/formatPoints'
import type { AnswerValue, Profile, SeasonAnswer, SeasonQuestion, SeasonResult } from '../lib/database.types'

interface Props {
  question: SeasonQuestion
  myAnswer?: SeasonAnswer
  closed: boolean
  saving: boolean
  onSave: (value: AnswerValue) => void
  otherAnswers?: (SeasonAnswer & { profile?: Profile })[]
  result?: SeasonResult
  // Contador de cuenta atrás junto al plazo — lo activa Apuestas flash,
  // donde cada pregunta puede tener su propia fecha límite. En Apuestas
  // iniciales no hace falta repetirlo en cada tarjeta porque ya hay un
  // contador único arriba de la página (todas comparten la misma fecha).
  showCountdown?: boolean
  // Oculta la fila de "LIGA" + puntos de arriba -- en Apuestas iniciales y el
  // asistente de bienvenida esa fila sobra: la competición es siempre Liga
  // (no aporta nada) y los puntos ya se explican con detalle en el modal
  // "Cómo puntúa" de cada bloque, así que repetirlos aquí es ruido.
  hideMeta?: boolean
}

export default function QuestionCard({
  question,
  myAnswer,
  closed,
  saving,
  onSave,
  otherAnswers = [],
  result,
  showCountdown,
  hideMeta,
}: Props) {
  const complete = isAnswerComplete(question, myAnswer?.answer)
  const checkmark = complete && (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-green-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-label="Respondida"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      {/* En apuestas flash no mostramos la competición (de momento todas son
          Liga) — en su lugar, el contador de esta pregunta arriba a la
          derecha, y los puntos que vale abajo a la derecha (mismo sitio que
          en Mis apuestas / Apuestas detalladas). En apuestas iniciales se
          mantiene el formato de siempre (competición + puntos arriba), ya
          que ahí el contador único va arriba de toda la página. */}
      {showCountdown ? (
        !closed &&
        question.closes_at && (
          <div className="mb-1 flex items-center justify-end">
            <Countdown deadline={new Date(question.closes_at)} />
          </div>
        )
      ) : hideMeta ? (
        checkmark && <div className="mb-1 flex justify-end">{checkmark}</div>
      ) : (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs uppercase text-gray-400">{question.competition}</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            {formatPoints(question.points)}
            {checkmark}
          </span>
        </div>
      )}
      <p className="mb-3 font-medium">{question.question}</p>

      {!closed ? (
        <QuestionInput question={question} value={myAnswer?.answer} saving={saving} onSave={onSave} />
      ) : (
        <div className="text-sm">
          <p className="mb-2 text-gray-500">
            Cerrado {result ? `· resultado: ${formatAnswer(question, result.result)}` : '· sin resolver todavía'}
          </p>
          <ul className="flex flex-col gap-1">
            {otherAnswers.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 text-gray-700">
                <span className="shrink-0">{a.profile?.username ?? '—'}</span>
                <span className="text-right">
                  {formatAnswer(question, a.answer)}
                  {a.points != null && <span className="ml-2 font-semibold text-green-600">+{formatPoints(a.points)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {showCountdown && (
        <p className="mt-2 text-right text-[11px] font-medium text-gray-400">Vale {formatPoints(question.points)}</p>
      )}
    </div>
  )
}
