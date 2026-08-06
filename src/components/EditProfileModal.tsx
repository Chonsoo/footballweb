import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import TeamSelect from './TeamSelect'
import { EASTER_EGG_HINTS, EASTER_EGG_TOTAL_STEPS, useEasterEgg } from '../lib/easterEgg'

export default function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { profile, refreshProfile } = useAuth()
  const { progress: eggProgress } = useEasterEgg()
  const [username, setUsername] = useState(profile?.username ?? '')
  const [favoriteTeam, setFavoriteTeam] = useState(profile?.favorite_team ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!username.trim() || !favoriteTeam) return
    setSaving(true)
    setError(null)
    const { error } = await supabase.rpc('complete_profile', {
      p_username: username.trim(),
      p_favorite_team: favoriteTeam,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    await refreshProfile()
    onClose()
  }

  return createPortal(
    // Portal a document.body -- el botón "Mis datos" que abre esto vive
    // dentro del navbar (backdrop-blur), y un ancestro con backdrop-filter
    // pasa a ser el "containing block" de sus descendientes position:fixed,
    // rompiendo el modal (encajado al tamaño del navbar en vez de a pantalla
    // completa). Con el portal, esto no depende de dónde se abra el modal.
    //
    // overflow-y-auto en el fondo + max-h/overflow en la tarjeta: antes, con
    // el teclado táctil abierto o el visualViewport más bajo que el layout
    // viewport (típico en móvil), "items-center" sin scroll dejaba la parte
    // de arriba de la tarjeta (el título "Mis datos") por encima del área
    // visible y sin forma de llegar a ella. Con esto la tarjeta nunca mide
    // más que la pantalla, y si aun así hiciera falta, el fondo permite
    // hacer scroll para verla entera.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      {/* Sin overflow-y-auto propio: así el desplegable de "Equipo favorito"
          (posicionado absolute dentro de la tarjeta) puede salirse del
          recuadro sin que se corte -- si hiciera falta scroll, ya lo da el
          fondo (arriba), no la tarjeta. */}
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Mis datos</h2>

        <label className="mb-1 block text-xs font-medium text-gray-500">Nombre de usuario</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-xs font-medium text-gray-500">Equipo favorito de La Liga</label>
        <div className="mb-3">
          <TeamSelect teams={LALIGA_TEAMS_2026_27} value={favoriteTeam} onChange={setFavoriteTeam} />
        </div>

        {/* Solo visible tras encontrar el huevo (paso 1) -- antes de eso no se
            muestra nada, para no delatar a nadie que ni siquiera ha
            empezado que existe un huevo de pascua en la app. */}
        {eggProgress && eggProgress.step >= 1 && (
          <div className="mb-3 rounded-lg border border-gold-300 bg-gold-50 px-3 py-2 text-xs text-gray-700">
            {eggProgress.step >= 5 ? (
              <p className="font-semibold text-gold-700">🏆 ¡Abueloncho Dorado conseguido!</p>
            ) : (
              <>
                <p className="font-semibold text-gold-700">
                  🥚 Abueloncho Dorado · Paso {eggProgress.step} de {EASTER_EGG_TOTAL_STEPS}
                </p>
                <p className="mt-1">{EASTER_EGG_HINTS[eggProgress.step]}</p>
              </>
            )}
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !username.trim() || !favoriteTeam}
            className="rounded bg-brand-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
