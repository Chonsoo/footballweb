import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BlockAnswers from './BlockAnswers'
import { BLOCK_LABELS } from '../lib/blocks'
import { computeRanks } from '../lib/ranking'
import { fantasyRankBonus } from '../lib/fantasyRankBonus'
import type { AnswerValue, SeasonAnswer, SeasonQuestion, SeasonResult } from '../lib/database.types'

interface Props {
  userId: string
  username: string
  totalPoints: number
  onClose: () => void
}

interface CategoryRow {
  key: string
  label: string
  points: number
  expandable?: boolean
}

// Popup de desglose de puntos de Clasificación: de dónde salen los puntos de
// un participante, por bloque de "Apuestas iniciales" (desplegables, con lo
// que puso en cada uno) + Apuestas flash, más el bonus por puesto en la Liga
// fantasy (no son los puntos fantasy en sí, sino puntos de premio según el
// puesto: 1º 25, 2º 21, 3º 17... -- ver fantasyRankBonus). Estos son los
// únicos orígenes que suman al total de esta clasificación general (vista
// public.leaderboard, migración 031).
export default function RankingPointsPopup({ userId, username, totalPoints, onClose }: Props) {
  const [items, setItems] = useState<CategoryRow[] | null>(null)
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [pointsByQuestion, setPointsByQuestion] = useState<Record<string, number | null>>({})
  const [currentResults, setCurrentResults] = useState<Record<string, AnswerValue>>({})
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data: qs } = await supabase.from('season_questions').select('*')
      const { data: sa } = await supabase.from('season_answers').select('*').eq('user_id', userId)
      const { data: res } = await supabase.from('season_results').select('*')
      const { data: fl } = await supabase
        .from('fantasy_leaderboard')
        .select('user_id, total_points')
        .eq('mode', 'abuelonchos')
        .order('total_points', { ascending: false })

      const allQuestions = (qs as SeasonQuestion[]) ?? []
      const myAnswers = (sa as SeasonAnswer[]) ?? []
      const results = (res as SeasonResult[]) ?? []

      const answerMap: Record<string, AnswerValue> = {}
      const pointsMap: Record<string, number | null> = {}
      for (const a of myAnswers) {
        answerMap[a.question_id] = a.answer
        pointsMap[a.question_id] = a.points
      }

      const sums: Record<string, number> = { block1: 0, block2: 0, block3: 0, block4: 0, flash: 0 }
      const blockByQuestion = new Map(allQuestions.map((q) => [q.id, q]))
      for (const a of myAnswers) {
        if (a.points == null) continue
        const q = blockByQuestion.get(a.question_id)
        if (!q) continue
        if (q.phase === 'weekly') {
          sums.flash += a.points
        } else if (q.block != null && `block${q.block}` in sums) {
          sums[`block${q.block}`] += a.points
        }
      }

      // Clasificación real (season_results) -- se pasa a BlockAnswers para que
      // el Bloque 1 muestre el resumen de aciertos y los ✓ por equipo, igual
      // que en Mis apuestas y Apuestas detalladas.
      const resultsMap: Record<string, AnswerValue> = {}
      for (const r of results) resultsMap[r.question_id] = r.result

      // Puesto en la Liga fantasy (empates comparten puesto, "1224") y su
      // bonus correspondiente -- 0 si el usuario no tiene 11 puesto todavía.
      const flRows = (fl as { user_id: string; total_points: number }[]) ?? []
      const ranks = computeRanks(flRows.map((r) => ({ total_points: r.total_points })))
      const myIndex = flRows.findIndex((r) => r.user_id === userId)
      const myRank = myIndex >= 0 ? ranks[myIndex] : null
      const fantasyLabel = myRank != null ? `Fantasy · ${myRank}º en la Liga` : 'Fantasy (sin 11 puesto)'
      const fantasyPoints = myRank != null ? fantasyRankBonus(myRank) : 0

      const rows: CategoryRow[] = [
        { key: 'block1', label: BLOCK_LABELS[1], points: sums.block1, expandable: true },
        { key: 'block2', label: BLOCK_LABELS[2], points: sums.block2, expandable: true },
        { key: 'block3', label: BLOCK_LABELS[3], points: sums.block3, expandable: true },
        { key: 'block4', label: BLOCK_LABELS[4], points: sums.block4, expandable: true },
        { key: 'flash', label: 'Apuestas flash', points: sums.flash },
        { key: 'fantasy', label: fantasyLabel, points: fantasyPoints },
      ]

      if (active) {
        setQuestions(allQuestions)
        setAnswers(answerMap)
        setPointsByQuestion(pointsMap)
        setCurrentResults(resultsMap)
        setItems(rows)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-brand-200">Desglose de puntos</p>
            <p className="truncate font-semibold text-white">{username}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded p-1 text-brand-200 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="border-y border-white/10 bg-black/10">
          <div className="grid grid-cols-[1fr_60px] gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-200">
            <span>Bloque</span>
            <span className="text-right">Puntos</span>
          </div>
          <div className="min-h-[228px]">
            {items == null ? (
              <p className="px-4 py-8 text-center text-sm text-brand-200">Cargando…</p>
            ) : (
              items.map((it) => {
                const blockNum = it.key.startsWith('block') ? Number(it.key.replace('block', '')) : null
                const isOpen = blockNum != null && expandedBlock === blockNum
                const blockQuestions = blockNum != null ? questions.filter((q) => q.block === blockNum) : []
                return (
                  <div key={it.key} className="border-t border-white/10 first:border-t-0">
                    <button
                      type="button"
                      disabled={!it.expandable}
                      onClick={() => blockNum != null && setExpandedBlock((cur) => (cur === blockNum ? null : blockNum))}
                      className={`grid w-full grid-cols-[1fr_60px] items-center gap-2 px-4 py-2.5 text-left text-sm ${
                        it.expandable ? 'hover:bg-white/5' : ''
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-brand-50">
                        {it.label}
                        {it.expandable && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-3 w-3 shrink-0 text-brand-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`text-right font-semibold ${
                          it.points < 0 ? 'text-red-400' : it.points > 0 ? 'text-green-400' : 'text-brand-300'
                        }`}
                      >
                        {it.points > 0 ? '+' : ''}
                        {it.points}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="bg-white/95 px-3 py-3">
                        <BlockAnswers questions={blockQuestions} answers={answers} points={pointsByQuestion} currentResults={currentResults} />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-between bg-gold-500 px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-950">Total</span>
          <span className="text-lg font-bold text-brand-950">{totalPoints} pts</span>
        </div>
      </div>
    </div>
  )
}
