import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import TeamSelect from './TeamSelect'

export default function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { profile, refreshProfile } = useAuth()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Mis datos</h2>

        <label className="mb-1 block text-xs font-medium text-gray-500">Nombre de usuario</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-xs font-medium text-gray-500">Equipo favorito de La Liga</label>
        <div className="mb-3">
          <TeamSelect teams={LALIGA_TEAMS_2026_27} value={favoriteTeam} onChange={setFavoriteTeam} />
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !username.trim() || !favoriteTeam}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
