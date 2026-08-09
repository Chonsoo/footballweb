import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase } from '../lib/supabase'
import AuthShell from '../components/AuthShell'
import GoogleButton from '../components/GoogleButton'
import PasswordRequirements from '../components/PasswordRequirements'
import { isPasswordValid } from '../lib/passwordRules'

// Sin site key configurada (falta VITE_HCAPTCHA_SITE_KEY en .env), el widget
// simplemente no se pinta -- así en local, sin la clave a mano, el registro
// sigue funcionando igual que antes en vez de romperse.
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined

export default function Signup() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)

  const passwordOk = isPasswordValid(password)
  // Si no hay site key (local sin configurar), no bloqueamos por el captcha
  // -- si SÍ hay site key, hace falta haberlo resuelto para poder enviar.
  const captchaOk = !HCAPTCHA_SITE_KEY || !!captchaToken

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!passwordOk) {
      setError('La contraseña no cumple todos los requisitos de abajo.')
      return
    }
    if (!captchaOk) {
      setError('Resuelve el captcha antes de crear la cuenta.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    setLoading(false)
    // Los tokens de hCaptcha son de un solo uso -- si el registro falla (p.ej.
    // el email ya existe), hay que resetear el widget para poder reintentar.
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
    if (error) {
      setError(error.message)
      return
    }
    if (data.session) {
      navigate('/')
    } else {
      setInfo('Revisa tu email para confirmar la cuenta antes de entrar.')
    }
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
      <h2 className="mb-1 text-xl font-bold text-gray-900">Crear cuenta</h2>
      <p className="mb-5 text-sm text-gray-500">Únete a la porra de este año.</p>

      <GoogleButton onClick={handleGoogle} label="Registrarse con Google" />

      <div className="my-5 flex items-center gap-3 text-xs font-medium text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />o<div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          required
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
        />
        <PasswordRequirements password={password} />

        {HCAPTCHA_SITE_KEY && (
          <div className="flex justify-center">
            <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY} onVerify={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken(null)} />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-600">{info}</p>}
        <button
          type="submit"
          disabled={loading || !passwordOk || !captchaOk}
          className="rounded-lg bg-brand-700 px-3 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  )
}
