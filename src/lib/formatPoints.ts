export function formatPoints(n: number): string {
  return `${n} ${n === 1 ? 'pt' : 'pts'}`
}
