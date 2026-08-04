import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BLOCK_LABELS } from '../lib/blocks'
import { computeRanks } from '../lib/ranking'
import { fantasyRankBonus } from '../lib/fantasyRankBonus'
import type { SeasonAnswer, SeasonQuestion } from '../lib/database.types'

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
}

// Popup de desglose de puntos de Clasificación: de dónde salen los puntos de
// un participante, por bloque de "Apuestas iniciales" + Apuestas flash, más
// el bonus por puesto en la Liga fantasy (no son los puntos fantasy en sí,
// sino puntos de premio según el puesto: 1º 25, 2º 21, 3º 17... -- ver
// fantasyRankBonus). Estos son los únicos orígenes que suman al total de
// esta clasificación general (vista public.leaderboard, migración 031).
export default function RankingPointsPopup({ userId, username, totalPoints, onClose }: Props) {
  const [items, setItems] = useState<CategoryRow[] | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data: qs } = await supabase.from('season_questions').select('id, block, phase')
      const { data: answers } = await supabase.from('season_answers').select('question_id, points').eq('user_id', userId)
      const { data: fl } = await supabase
        .from('fantasy_leaderboard')
        .select('user_id, total_points')
        .eq('mode', 'abuelonchos')
        .order('total_points', { ascending: false })

      const blockByQuestion = new Map<string, Pick<SeasonQuestion, 'block' | 'phase'>>()
      for (const q of (qs as Pick<SeasonQuestion, 'id' | 'block' | 'phase'>[]) ?? []) {
        blockByQuestion.set(q.id, { block: q.block, phase: q.phase })
      }

      const sums: Record<string, number> = { block1: 0, block2: 0, block3: 0, block4: 0, flash: 0 }
      for (const a of (answers as Pick<SeasonAnswer, 'question_id' | 'points'>[]) ?? []) {
        if (a.points == null) continue
        const q = blockByQuestion.get(a.question_id)
        if (!q) continue
        if (q.phase === 'weekly') {
          sums.flash += a.points
        } else if (q.block != null && `block${q.block}` in sums) {
          sums[`block${q.block}`] += a.points
        }
      }

      // Puesto en la Liga fantasy (empates comparten puesto, "1224") y su
      // bonus correspondiente -- 0 si el usuario no tiene 11 puesto todavía.
      const flRows = (fl as { user_id: string; total_points: number }[]) ?? []
      const ranks = computeRanks(flRows.map((r) => ({ total_points: r.total_points })))
      const myIndex = flRows.findIndex((r) => r.user_id === userId)
      const myRank = myIndex >= 0 ? ranks[myIndex] : null
      const fantasyLabel = myRank != null ? `Fantasy · ${myRank}º en la Liga` : 'Fantasy (sin 11 puesto)'
      const fantasyPoints = myRank != null ? fantasyRankBonus(myRank) : 0

      const rows: CategoryRow[] = [
        { key: 'block1', label: BLOCK_LABELS[1], points: sums.block1 },
        { key: 'block2', label: BLOCK_LABELS[2], points: sums.block2 },
        { key: 'block3', label: BLOCK_LABELS[3], points: sums.block3 },
        { key: 'block4', label: BLOCK_LABELS[4], points: sums.block4 },
        { key: 'flash', label: 'Apuestas flash', points: sums.flash },
        { key: 'fantasy', label: fantasyLabel, points: fantasyPoints },
      ]
      if (active) setItems(rows)
    }
    load()
    return () => {
      active = false
    }
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 shadow-xl"
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
              items.map((it) => (
                <div
                  key={it.key}
                  className="grid grid-cols-[1fr_60px] items-center gap-2 border-t border-white/10 px-4 py-2.5 text-sm first:border-t-0"
                >
                  <span className="text-brand-50">{it.label}</span>
                  <span
                    className={`text-right font-semibold ${
                      it.points < 0 ? 'text-red-400' : it.points > 0 ? 'text-green-400' : 'text-brand-300'
                    }`}
                  >
                    {it.points > 0 ? '+' : ''}
                    {it.points}
                  </span>
                </div>
              ))
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
