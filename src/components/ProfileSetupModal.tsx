import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import TeamSelect from './TeamSelect'
import AuthShell from './AuthShell'

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
    <AuthShell>
      <h2 className="mb-1 text-xl font-bold text-gray-900">¡Ya casi estás dentro!</h2>
      <p className="mb-5 text-sm text-gray-500">Dinos cómo te llamamos y de qué equipo sufres, y arrancamos la temporada.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Nombre de usuario</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tu nombre de usuario"
            // text-base (16px): por debajo de 16px, iOS Safari hace zoom
            // automático de toda la página al enfocar el campo.
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
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
          className="mt-1 rounded-lg bg-brand-700 px-3 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Continuar'}
        </button>
      </form>
    </AuthShell>
  )
}
