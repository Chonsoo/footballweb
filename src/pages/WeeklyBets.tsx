import PhaseBetsList from '../components/PhaseBetsList'

export default function WeeklyBets() {
  return (
    <PhaseBetsList
      phase="weekly"
      title="Apuestas flash"
      emptyText="Ahora mismo no hay apuestas flash abiertas. El admin las va añadiendo jornada a jornada."
    />
  )
}
