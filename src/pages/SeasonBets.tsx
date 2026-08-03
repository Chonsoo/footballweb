import PhaseBetsList from '../components/PhaseBetsList'

export default function SeasonBets() {
  return (
    <PhaseBetsList
      phase="initial"
      title="Apuestas iniciales"
      emptyText="Todavía no hay preguntas. El admin puede crearlas desde el panel."
    />
  )
}
