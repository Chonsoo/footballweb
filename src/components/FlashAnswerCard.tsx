import AnswerSummary from './AnswerSummary'
import ScorePredictionBadge from './ScorePredictionBadge'
import { shortQuestionLabel } from '../lib/questionLabel'
import { getFlashStatus, FLASH_STATUS_LABELS, FLASH_STATUS_COLORS } from '../lib/flashStatus'
import { formatPoints } from '../lib/formatPoints'
import type { AnswerValue, SeasonQuestion } from '../lib/database.types'

interface Props {
  question: SeasonQuestion
  value?: AnswerValue
  points?: number | null
  resolved: boolean
}

// Tarjeta compacta para una pregunta flash en Mis apuestas / Apuestas
// detalladas: estado (abierta/cerrada/resuelta) arriba a la izquierda —
// en el mismo sitio donde en la tarjeta de la propia pregunta van los
// puntos — y los puntos ganados abajo a la derecha, una vez resuelta.
export default function FlashAnswerCard({ question, value, points, resolved }: Props) {
  const status = getFlashStatus(question, resolved)
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/[0.67] p-2 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between gap-1">
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${FLASH_STATUS_COLORS[status]}`}>
          {FLASH_STATUS_LABELS[status]}
        </span>
      </div>
      {/* Antes era una sola línea con truncate (cortaba la pregunta a media
          palabra, tipo "¿COMO CREA EL PARTIDO DE LA JO…") -- con line-clamp-2
          se ve el enunciado completo (o casi) en dos líneas en vez de
          ilegible. */}
      <p className="line-clamp-2 text-[11px] font-semibold uppercase leading-tight tracking-wide text-gray-500" title={question.question}>
        {shortQuestionLabel(question)}
      </p>
      {value != null ? (
        <AnswerSummary question={question} value={value} />
      ) : (
        <p className="text-sm text-gray-400">Sin responder / aún no visible</p>
      )}
      {resolved ? (
        question.answer_type === 'score_prediction' && points != null ? (
          <span className="self-end">
            <ScorePredictionBadge points={points} />
          </span>
        ) : (
          <p className="self-end text-[11px] font-semibold text-green-600">
            {points != null ? `+${formatPoints(points)}` : 'Sin puntos'}
          </p>
        )
      ) : (
        <p className="self-end text-[11px] font-medium text-gray-400">Vale {formatPoints(question.points)}</p>
      )}
    </div>
  )
}
