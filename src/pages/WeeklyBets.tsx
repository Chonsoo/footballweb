import { useState } from 'react'
import PhaseBetsList from '../components/PhaseBetsList'
import EasterEggFlashCard from '../components/EasterEggFlashCard'
import EasterEggRewardModal from '../components/EasterEggRewardModal'
import { useEasterEgg } from '../lib/easterEgg'

export default function WeeklyBets() {
  // Abueloncho Dorado, paso 5: la tarjeta especial solo aparece tras
  // completar el paso 4 (activada también en Información › Reglas), y
  // desaparece en cuanto se completa (progress.step pasa a 5).
  const { progress: eggProgress, advance: eggAdvance } = useEasterEgg()
  const [showReward, setShowReward] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {eggProgress?.step === 4 && (
        <EasterEggFlashCard
          onCorrect={async () => {
            const ok = await eggAdvance(5)
            if (ok) setShowReward(true)
          }}
        />
      )}

      <PhaseBetsList
        phase="weekly"
        title="Apuestas flash"
        emptyText="Ahora mismo no hay apuestas flash abiertas. El admin las va añadiendo jornada a jornada."
      />

      {showReward && <EasterEggRewardModal onClose={() => setShowReward(false)} />}
    </div>
  )
}
