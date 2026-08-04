import { QuestionInput } from './QuestionInput'
import Countdown from './Countdown'
import { formatAnswer } from '../lib/answerFormat'
import { isAnswerComplete } from '../lib/isAnswerComplete'
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
}: Props) {
  const complete = isAnswerComplete(question, myAnswer?.answer)
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs uppercase text-gray-400">{question.competition}</span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          {question.points} pts
          {complete && (
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
          )}
        </span>
      </div>
      <p className={showCountdown && !closed && question.closes_at ? 'mb-1 font-medium' : 'mb-3 font-medium'}>
        {question.question}
      </p>
      {showCountdown && !closed && question.closes_at && (
        <Countdown
          deadline={new Date(question.closes_at)}
          className="mb-3 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700"
        />
      )}

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
                  {a.points != null && <span className="ml-2 font-semibold text-green-600">+{a.points}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
