import { useMemo } from 'react';
import { useApp } from './estado';
import { claveAlumno, type Alumno, type Empresa, type Operacion } from './modelo';
import { hayQueHablar, hoyISO } from './avisos';

/** Datos calculados que usan varias pantallas. */
export function useDerivados() {
  const { datos } = useApp();
  return useMemo(() => {
    const profesores = [...new Set(datos.reparto.map((r) => r.profesor))].sort((a, b) => a.localeCompare(b, 'es'));
    const porEmpresa = new Map<string, Alumno[]>();
    for (const a of datos.alumnos) if (a.empresa) {
      const k = a.empresa.trim().toLowerCase();
      porEmpresa.set(k, [...(porEmpresa.get(k) ?? []), a]);
    }
    const hoy = hoyISO();
    const empresas = datos.empresas.map((e) => {
      const alumnos = porEmpresa.get(e.id) ?? [];
      return { ...e, alumnos, asignados: alumnos.length, libres: e.plazas === null ? null : e.plazas - alumnos.length, hablar: hayQueHablar(e, alumnos.length, hoy) };
    });
    // Empresas que aparecen en las hojas de alumnado pero no en EMPRESAS
    const sinFicha = [...porEmpresa.keys()].filter((k) => !datos.empresas.some((e) => e.id === k)).map((k) => porEmpresa.get(k)![0].empresa);
    return { profesores, empresas, sinFicha, porEmpresa };
  }, [datos]);
}
export type EmpresaVista = ReturnType<typeof useDerivados>['empresas'][number];

export const opAlumno = (a: Alumno, campo: string, valor: string | number | boolean | null): Operacion =>
  ({ tipo: 'alumno', id: a.id, hoja: a.hoja, fila: a.fila, clave: claveAlumno(a), campo, valor });
export const opEmpresa = (e: Empresa, campo: string, valor: string | number | boolean | null): Operacion =>
  ({ tipo: 'empresa', id: e.id, fila: e.fila, campo, valor });

export const fechaCorta = (iso: string | null | undefined) =>
  iso ? new Date(iso + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';
export const fechaNum = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
