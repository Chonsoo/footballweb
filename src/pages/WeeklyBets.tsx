import PhaseBetsList from '../components/PhaseBetsList'

export default function WeeklyBets() {
  return (
    <PhaseBetsList
      phase="weekly"
      title="Apuestas de la semana"
      emptyText="Todavía no hay apuestas de esta semana. El admin las va añadiendo jornada a jornada."
    />
  )
}
