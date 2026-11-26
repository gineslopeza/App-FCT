import { PASOS, nombreCompleto, type Alumno, type Datos, type Empresa } from './modelo';

/**
 * Avisos según la normativa de FE 2026-27 (correos de la DGFP y de Dirección):
 * - La FE tiene que estar creada y confirmada por las cuatro partes (tutor, dirección, alumno y empresa)
 *   al menos 10 días naturales antes del inicio; si no, SAO la bloquea (sin alta en la SS ni diario).
 * - Sin NUSS no hay alta en la Seguridad Social.
 * - El alumnado menor de edad necesita la autorización firmada.
 */
export type Aviso = { nivel: 'urgente' | 'atencion' | 'info'; texto: string; alumno?: Alumno; empresa?: Empresa; fecha?: string };

export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const dias = (desde: string, hasta: string) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 864e5);
export const sumarDias = (iso: string, n: number) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
export const FIRMAS = ['form_tutor', 'form_direccion', 'form_alumno', 'form_empresa'];

export function progreso(a: Alumno) {
  const hechos = PASOS.filter((p) => a.pasos[p.clave]).length;
  return { hechos, total: PASOS.length, siguiente: PASOS.find((p) => !a.pasos[p.clave]) ?? null };
}

export function avisosAlumno(a: Alumno, hoy = hoyISO()): Aviso[] {
  const out: Aviso[] = [];
  const nombre = nombreCompleto(a);
  if (a.fechaInicio) {
    const limite = sumarDias(a.fechaInicio, -10);
    const faltan = dias(hoy, limite);
    const confirmada = FIRMAS.every((f) => a.pasos[f]);
    if (!confirmada) {
      if (dias(hoy, a.fechaInicio) < 0) out.push({ nivel: 'urgente', texto: `${nombre} ha empezado sin la FE confirmada por las cuatro partes.`, alumno: a, fecha: a.fechaInicio });
      else if (faltan < 0) out.push({ nivel: 'urgente', texto: `${nombre}: ha pasado el plazo de 10 días (era el ${fechaLarga(limite)}). SAO bloquea la FE.`, alumno: a, fecha: limite });
      else if (faltan <= 21) out.push({ nivel: faltan <= 7 ? 'urgente' : 'atencion', texto: `${nombre}: la FE debe estar confirmada antes del ${fechaLarga(limite)} (quedan ${faltan} días).`, alumno: a, fecha: limite });
    }
    if (!a.nuss && dias(hoy, a.fechaInicio) <= 45) out.push({ nivel: 'atencion', texto: `${nombre}: falta el NUSS (sin él no hay alta en la Seguridad Social).`, alumno: a, fecha: a.fechaInicio });
    if (a.fechaNacimiento && edadEn(a.fechaNacimiento, a.fechaInicio) < 18) out.push({ nivel: 'info', texto: `${nombre} será menor de edad al empezar: hace falta la autorización firmada.`, alumno: a, fecha: a.fechaInicio });
  }
  if (!a.empresa) out.push({ nivel: 'info', texto: `${nombre} no tiene empresa asignada.`, alumno: a });
  return out;
}

export function edadEn(nacimiento: string, fecha: string) {
  const [y, m, d] = nacimiento.split('-').map(Number);
  const [Y, M, D] = fecha.split('-').map(Number);
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
}

/** ¿Hay que hablar con la empresa? Mismo criterio que la columna «HAY QUE HABLAR» del Excel. */
export function hayQueHablar(e: Empresa, asignados: number, hoy = hoyISO()): string | null {
  if (e.estado === 'Contactar') return 'Pendiente de contactar';
  if (e.estado === 'Pendiente respuesta') return 'Esperando su respuesta';
  if (e.fechaProxima && e.fechaProxima <= hoy) return e.proximaAccion ? `${e.proximaAccion} (${fechaLarga(e.fechaProxima)})` : `Acción pendiente desde el ${fechaLarga(e.fechaProxima)}`;
  if (e.plazas !== null && asignados > e.plazas) return `Tiene ${asignados} alumnos y ${e.plazas} plazas`;
  return null;
}

export function todosLosAvisos(d: Datos, hoy = hoyISO()): Aviso[] {
  const orden = { urgente: 0, atencion: 1, info: 2 };
  return d.alumnos.flatMap((a) => avisosAlumno(a, hoy)).sort((a, b) => orden[a.nivel] - orden[b.nivel] || (a.fecha ?? '9').localeCompare(b.fecha ?? '9'));
}

export const fechaLarga = (iso: string | null | undefined) =>
  iso ? new Date(iso + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: iso.slice(0, 4) === String(new Date().getFullYear()) ? undefined : 'numeric' }) : '';
