import type { Alumno, Curso, FilaReparto } from './modelo';

/**
 * Reparto justo de N alumnos según las horas (ponderadas) de cada profesor: método del resto mayor.
 * Cada uno recibe la parte entera de su cuota y los que sobran van a los restos más grandes;
 * si empatan, a quien tiene más horas y después por orden. Así la suma es exactamente N.
 * Es el mismo cálculo que hace la hoja «ALUMNOS POR PERSONA».
 */
export function repartoJusto(horas: number[], n: number): number[] {
  const total = horas.reduce((a, b) => a + b, 0);
  if (!total || !n) return horas.map(() => 0);
  const cuotas = horas.map((h) => (h * n) / total);
  const base = cuotas.map((c) => Math.floor(c + 1e-6));
  let quedan = n - base.reduce((a, b) => a + b, 0);
  const orden = cuotas.map((c, i) => ({ i, r: c - base[i] }))
    .sort((a, b) => (Math.abs(b.r - a.r) > 1e-6 ? b.r - a.r : horas[b.i] - horas[a.i] || a.i - b.i));
  for (const { i } of orden) { if (quedan <= 0) break; base[i]++; quedan--; }
  return base;
}

export type ProfesorCurso = FilaReparto & { ponderadas: number; porcentaje: number; cuota: number; leTocan: number; total: number; asignados: number; pendientes: number };
export type GrupoReparto = { curso: string; hoja: string; enHoja: number; previstos: number | null; aRepartir: number; sinTutor: number; profesores: ProfesorCurso[]; avisos: string[] };

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function calcularReparto(cursos: Curso[], filas: FilaReparto[], alumnos: Alumno[]): { grupos: GrupoReparto[]; profesores: { profesor: string; horas: number; total: number; asignados: number; cursos: { curso: string; total: number; asignados: number }[] }[] } {
  const grupos = cursos.map((c) => {
    const fs = filas.filter((f) => f.curso === c.codigo);
    const als = alumnos.filter((a) => a.curso === c.codigo);
    const aRepartir = als.length; // se reparten los nombres que hay en la hoja; «previstos» solo informa
    const pond = fs.map((f) => f.horas * f.peso);
    const totalPond = pond.reduce((a, b) => a + b, 0);
    const tocan = repartoJusto(pond, aRepartir);
    const profesores = fs.map((f, i) => {
      const total = Math.max(0, tocan[i] + (f.ajuste || 0));
      const asignados = als.filter((a) => a.tutor && (igual(a.tutor, f.profesor) || (f.codigo && igual(a.tutor, f.codigo)))).length;
      return { ...f, ponderadas: pond[i], porcentaje: totalPond ? pond[i] / totalPond : 0, cuota: totalPond ? (pond[i] * aRepartir) / totalPond : 0, leTocan: tocan[i], total, asignados, pendientes: total - asignados };
    });
    const avisos: string[] = [];
    if (c.previstos !== null && als.length && als.length !== c.previstos) avisos.push(`En la hoja hay ${als.length} alumnos y están previstos ${c.previstos}.`);
    const suma = profesores.reduce((a, p) => a + p.total, 0);
    if (fs.length && suma !== aRepartir) avisos.push(`Con los ajustes se reparten ${suma} de ${aRepartir}.`);
    if (!fs.length) avisos.push('No hay profesores con horas en este curso.');
    if (!als.length) avisos.push('Aún no hay alumnos en la hoja del curso.');
    return { curso: c.codigo, hoja: c.hoja, enHoja: als.length, previstos: c.previstos, aRepartir, sinTutor: als.filter((a) => !a.tutor).length, profesores, avisos };
  });
  const porProf = new Map<string, { profesor: string; horas: number; total: number; asignados: number; cursos: { curso: string; total: number; asignados: number }[] }>();
  for (const g of grupos) for (const p of g.profesores) {
    const k = p.profesor.toUpperCase();
    const x = porProf.get(k) ?? { profesor: p.profesor, horas: 0, total: 0, asignados: 0, cursos: [] };
    x.horas += p.horas; x.total += p.total; x.asignados += p.asignados; x.cursos.push({ curso: g.curso, total: p.total, asignados: p.asignados });
    porProf.set(k, x);
  }
  return { grupos, profesores: [...porProf.values()].sort((a, b) => b.total - a.total || a.profesor.localeCompare(b.profesor, 'es')) };
}

/** Propuesta de tutor para el alumnado sin tutor: a quien le queden más plazas en su curso. */
export function proponerTutores(g: GrupoReparto, alumnos: Alumno[]): { alumno: Alumno; tutor: string }[] {
  const huecos = g.profesores.map((p) => ({ profesor: p.profesor, quedan: p.pendientes }));
  const out: { alumno: Alumno; tutor: string }[] = [];
  for (const a of alumnos.filter((x) => x.curso === g.curso && !x.tutor)) {
    const p = huecos.filter((h) => h.quedan > 0).sort((x, y) => y.quedan - x.quedan)[0];
    if (!p) break;
    out.push({ alumno: a, tutor: p.profesor }); p.quedan--;
  }
  return out;
}
