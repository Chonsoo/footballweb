// Requisitos de la contraseña al registrarse: 8+ caracteres, mayúscula,
// número y símbolo. Un solo sitio con la lista de reglas -- tanto el
// checklist visual como la validación antes de enviar el formulario leen de
// aquí, así nunca pueden desincronizarse entre sí.
export interface PasswordRule {
  id: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'Un número', test: (p) => /[0-9]/.test(p) },
  { id: 'symbol', label: 'Un símbolo (!·@·#·%...)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}
