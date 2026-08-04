// Nacionalidad → bandera (emoji) + nombre en español. La base de datos guarda
// el valor tal cual lo da laliga.com (en inglés, p.ej. "Spain", "GB-ENG" para
// Inglaterra) para que el re-sync del importador no tenga que traducir nada;
// aquí solo se traduce para pintar en pantalla. Cubre las nacionalidades que
// han aparecido en las 20 plantillas — si en el futuro sale alguna nueva que
// falte aquí, se muestra el texto tal cual sin bandera (fallback seguro).
const NATIONALITY_INFO: Record<string, { flag: string; label: string }> = {
  Belgium: { flag: '🇧🇪', label: 'Bélgica' },
  Ukraine: { flag: '🇺🇦', label: 'Ucrania' },
  Spain: { flag: '🇪🇸', label: 'España' },
  France: { flag: '🇫🇷', label: 'Francia' },
  Brazil: { flag: '🇧🇷', label: 'Brasil' },
  Germany: { flag: '🇩🇪', label: 'Alemania' },
  Netherlands: { flag: '🇳🇱', label: 'Países Bajos' },
  Portugal: { flag: '🇵🇹', label: 'Portugal' },
  Uruguay: { flag: '🇺🇾', label: 'Uruguay' },
  Morocco: { flag: '🇲🇦', label: 'Marruecos' },
  Turkey: { flag: '🇹🇷', label: 'Turquía' },
  Poland: { flag: '🇵🇱', label: 'Polonia' },
  Sweden: { flag: '🇸🇪', label: 'Suecia' },
  Slovenia: { flag: '🇸🇮', label: 'Eslovenia' },
  Argentina: { flag: '🇦🇷', label: 'Argentina' },
  Romania: { flag: '🇷🇴', label: 'Rumanía' },
  Slovakia: { flag: '🇸🇰', label: 'Eslovaquia' },
  Denmark: { flag: '🇩🇰', label: 'Dinamarca' },
  'United States': { flag: '🇺🇸', label: 'Estados Unidos' },
  Italy: { flag: '🇮🇹', label: 'Italia' },
  Mexico: { flag: '🇲🇽', label: 'México' },
  Nigeria: { flag: '🇳🇬', label: 'Nigeria' },
  'Guinea-Bissau': { flag: '🇬🇼', label: 'Guinea-Bisáu' },
  Ghana: { flag: '🇬🇭', label: 'Ghana' },
  'Cape Verde': { flag: '🇨🇻', label: 'Cabo Verde' },
  Senegal: { flag: '🇸🇳', label: 'Senegal' },
  'Ivory Coast': { flag: '🇨🇮', label: 'Costa de Marfil' },
  Canada: { flag: '🇨🇦', label: 'Canadá' },
  Georgia: { flag: '🇬🇪', label: 'Georgia' },
  'Dominican Republic': { flag: '🇩🇴', label: 'República Dominicana' },
  Colombia: { flag: '🇨🇴', label: 'Colombia' },
  Venezuela: { flag: '🇻🇪', label: 'Venezuela' },
  Japan: { flag: '🇯🇵', label: 'Japón' },
  'Russian Federation': { flag: '🇷🇺', label: 'Rusia' },
  Croatia: { flag: '🇭🇷', label: 'Croacia' },
  Iceland: { flag: '🇮🇸', label: 'Islandia' },
  Albania: { flag: '🇦🇱', label: 'Albania' },
  Angola: { flag: '🇦🇴', label: 'Angola' },
  Guinea: { flag: '🇬🇳', label: 'Guinea' },
  Cameroon: { flag: '🇨🇲', label: 'Camerún' },
  'Czech Republic': { flag: '🇨🇿', label: 'Chequia' },
  Malaysia: { flag: '🇲🇾', label: 'Malasia' },
  Algeria: { flag: '🇩🇿', label: 'Argelia' },
  Serbia: { flag: '🇷🇸', label: 'Serbia' },
  Macedonia: { flag: '🇲🇰', label: 'Macedonia del Norte' },
  Switzerland: { flag: '🇨🇭', label: 'Suiza' },
  Chile: { flag: '🇨🇱', label: 'Chile' },
  Greece: { flag: '🇬🇷', label: 'Grecia' },
  Honduras: { flag: '🇭🇳', label: 'Honduras' },
  Austria: { flag: '🇦🇹', label: 'Austria' },
  'Congo, Democratic Republic': { flag: '🇨🇩', label: 'RD del Congo' },
  Gambia: { flag: '🇬🇲', label: 'Gambia' },
  Gabon: { flag: '🇬🇦', label: 'Gabón' },
}

// Reino Unido no tiene un único código ISO por selección deportiva — cada
// nación juega por separado y laliga.com lo marca con estos sub-códigos.
const GB_NATIONS: Record<string, { flag: string; label: string }> = {
  'GB-ENG': { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', label: 'Inglaterra' },
  'GB-SCT': { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', label: 'Escocia' },
  'GB-WLS': { flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', label: 'Gales' },
  'GB-NIR': { flag: '🇬🇧', label: 'Irlanda del Norte' },
}

// El emoji de bandera de un país ISO-2 (p.ej. "BR" → 🇧🇷) se construye
// combinando dos "regional indicator symbols" — no hace falta mapear cada
// país a mano, funciona para cualquier código de 2 letras válido.
function flagFromISO2(code: string): string {
  const cc = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return '🌍'
  const points = [...cc].map((c) => 127397 + c.charCodeAt(0))
  return String.fromCodePoint(...points)
}

// El nombre en español de un código ISO-2 lo da el propio navegador/Node
// (Intl.DisplayNames), así que no hace falta mantener un mapa de 200 países
// a mano — solo se necesita para las nacionalidades "legacy" en inglés que
// ya había en la base de datos de antes de conectar la API de laliga.com.
let regionNames: Intl.DisplayNames | null = null
try {
  regionNames = new Intl.DisplayNames(['es'], { type: 'region' })
} catch {
  regionNames = null
}

export function getNationalityInfo(nationality: string | null | undefined): { flag: string; label: string } | null {
  if (!nationality) return null
  if (GB_NATIONS[nationality]) return GB_NATIONS[nationality]
  if (/^[A-Za-z]{2}$/.test(nationality)) {
    const code = nationality.toUpperCase()
    const label = regionNames?.of(code) ?? code
    return { flag: flagFromISO2(code), label }
  }
  // Legacy: nombres en inglés guardados por el importador manual anterior
  // a tener la API de laliga.com (p.ej. "Spain", "Congo, Democratic Republic").
  return NATIONALITY_INFO[nationality] ?? { flag: '🌍', label: nationality }
}
