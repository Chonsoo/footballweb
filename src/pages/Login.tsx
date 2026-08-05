import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'
import GoogleButton from '../components/GoogleButton'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <AuthShell>
      <h2 className="mb-1 text-xl font-bold text-gray-900">Iniciar sesión</h2>
      <p className="mb-5 text-sm text-gray-500">Bienvenido de vuelta, abueloncho.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          // text-base (16px): por debajo de 16px, iOS Safari hace zoom
          // automático de toda la página al enfocar el campo.
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
        />
        <input
          type="password"
          required
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-700 px-3 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-medium text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />o<div className="h-px flex-1 bg-gray-200" />
      </div>

      <GoogleButton onClick={handleGoogle} />

      <p className="mt-5 text-center text-sm text-gray-500">
        ¿No tienes cuenta?{' '}
        <Link to="/signup" className="font-semibold text-brand-700 hover:underline">
          Regístrate
        </Link>
      </p>
    </AuthShell>
  )
}
