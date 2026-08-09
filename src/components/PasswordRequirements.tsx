import { PASSWORD_RULES } from '../lib/passwordRules'

// Checklist debajo del campo de contraseña: cada regla se pone en verde con
// un ✓ en cuanto se cumple, en gris con un círculo vacío mientras no. No se
// oculta al completarse -- deja claro que ya está todo bien sin que el
// usuario tenga que adivinarlo.
export default function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li key={rule.id} className={`flex items-center gap-1.5 ${met ? 'text-green-600' : 'text-gray-400'}`}>
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                met ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {met ? '✓' : ''}
            </span>
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
