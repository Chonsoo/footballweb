// Marca de LaLiga (el "velero" rojo de su logo), sacada del SVG de su propia
// navbar -- la pega el propio Alejandro directamente desde su web, así que
// usamos exactamente ese path. Puramente decorativo (fondo de Login/
// Registro), sin texto ni marca añadida, solo el símbolo.
// fill="currentColor" para poder controlar el color desde fuera con
// clases de texto de Tailwind (text-white, text-gold-400, etc.) según
// convenga en cada fondo, en vez de quedar fijo al rojo oficial.
export default function LaLigaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="18 14 90 84" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        d="M23.492 47.807L44.4 17.6h20.224L38.597 54.634h16.895L29.21 68.032l-5.292-6.742c-1.876-2.475-2.73-4.352-2.73-6.912 0-2.305.854-4.524 2.304-6.57zM40.644 79.04c0-2.133.854-4.437 2.388-6.656L81.517 17.6h22.271L60.61 79.04h19.456L49.86 94.4l-6.486-8.277c-1.793-2.304-2.731-4.607-2.731-7.082l.002-.002z"
        fill="currentColor"
      />
    </svg>
  )
}
