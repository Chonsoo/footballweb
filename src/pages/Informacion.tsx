export default function Informacion() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ℹ️ Información</h1>
        <p className="text-sm text-gray-500">Cómo funciona la porra.</p>
      </div>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <span className="text-3xl">🚧</span>
        <p className="font-medium text-gray-600">En construcción</p>
        <p className="max-w-sm text-sm text-gray-400">
          Aquí irán subpáginas con el detalle de las apuestas cerradas y el estado de cada una.
        </p>
      </div>
    </div>
  )
}
