// Normaliza texto para comparar respuestas libres sin que mayúsculas, tildes
// o espacios de más las hagan parecer "distintas" (p.ej. "Mbappé", "mbappe ",
// "MBAPPE" deberían agruparse igual a la hora de calificar).
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}
