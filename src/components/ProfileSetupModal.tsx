import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import TeamSelect from './TeamSelect'

export default function ProfileSetupModal() {
  const { profile, refreshProfile } = useAuth()
  const [username, setUsername] = useState(profile?.username ?? '')
  const [favoriteTeam, setFavoriteTeam] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold">¡Bienvenido!</h1>
        <p className="mt-1 text-sm text-gray-500">Antes de nada, cuéntanos un poco de ti.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-gray-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Nombre de usuario</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tu nombre de usuario"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Equipo favorito de La Liga</label>
          <TeamSelect teams={LALIGA_TEAMS_2026_27} value={favoriteTeam} onChange={setFavoriteTeam} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || !username.trim() || !favoriteTeam}
          className="mt-1 rounded bg-brand-700 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
