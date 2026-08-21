/**
 * En producción la web y la API salen por el mismo host (Traefik enruta todo al
 * contenedor de la app), así que las rutas van relativas. En desarrollo el
 * frontend corre en Vite y la API en el 3001: sin el host explícito las
 * peticiones irían al puerto del frontend y darían 404.
 */
export const getApiBase = (): string =>
  typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? ''
    : 'http://localhost:3001';

/** Una noche de la gallera, tal como la devuelve GET /api/historial. */
export interface ParteJornada {
  filename: string;
  startedAt: string;
  durationSeconds: number;
  sizeBytes: number;
}

export interface Jornada {
  /** "2026-08-16" */
  fecha: string;
  durationSeconds: number;
  sizeBytes: number;
  /** Más de una si al celular se le cayó la señal y volvió a publicar. */
  partes: ParteJornada[];
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Parte "2026-08-16" en sus números SIN pasar por Date.
 *
 * No es remilgo: `new Date("2026-08-16")` se interpreta como medianoche UTC, y
 * en República Dominicana (UTC-4) eso cae a las 8 de la noche del día 15. La
 * jornada del domingo aparecería fechada el sábado.
 */
function partesFecha(fecha: string): { anio: number; mes: number; dia: number } | null {
  const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { anio: Number(match[1]), mes: Number(match[2]), dia: Number(match[3]) };
}

/** "2026-08-16" → { dia: "16", mes: "Ago", anio: "2026" } para el bloque de fecha. */
export function fechaCorta(fecha: string): { dia: string; mes: string; anio: string } {
  const p = partesFecha(fecha);
  if (!p) return { dia: '--', mes: '---', anio: '----' };
  return {
    dia: String(p.dia).padStart(2, '0'),
    mes: MESES_CORTOS[p.mes - 1] ?? '---',
    anio: String(p.anio),
  };
}

/** "2026-08-16" → "16 de agosto 2026". */
export function fechaLarga(fecha: string): string {
  const p = partesFecha(fecha);
  if (!p) return fecha;
  return `${p.dia} de ${MESES_LARGOS[p.mes - 1] ?? ''} ${p.anio}`;
}

/**
 * 16335 → "4:32:15". Siempre con horas: una jornada dura toda la noche, y
 * "32:15" a secas se leería como treinta y dos minutos.
 */
export function formatDuracion(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return '--:--:--';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 5153960755 → "4.8 GB".
 *
 * Se enseña siempre junto al botón de descargar. Una jornada entera pesa varios
 * gigas, y en la gallera mucha gente entra con datos del celular: pulsar sin
 * saberlo se les come el paquete del mes.
 */
export function formatTamano(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '--';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Días que le quedan a una jornada antes de que la retención la borre. */
export function diasRestantes(fecha: string, maxAgeDays: number): number {
  const p = partesFecha(fecha);
  if (!p) return 0;
  // Fecha construida en horario local a propósito, por lo mismo que arriba.
  const grabada = new Date(p.anio, p.mes - 1, p.dia);
  const transcurridos = Math.floor((Date.now() - grabada.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, maxAgeDays - transcurridos);
}
