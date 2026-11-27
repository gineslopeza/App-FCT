import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { abrirLibro, aplicarCambios } from '../src/datos/xlsx';
import { aCambios, claveAlumno, leerDatos } from '../src/datos/modelo';
import { calcularReparto } from '../src/datos/reparto';

/** Prueba con el Excel real (no está en el repositorio): FCT_REAL=/ruta/FCT_26_27.xlsx pnpm test */
const ruta = process.env.FCT_REAL;
describe.skipIf(!ruta || !existsSync(ruta))('Excel real', () => {
  it('se lee y se escribe sin perder nada', () => {
    const bytes = new Uint8Array(readFileSync(ruta!));
    const libro = abrirLibro(bytes);
    const d = leerDatos(libro);
    expect(d.avisosLectura).toEqual([]);
    expect(d.cursos.length).toBeGreaterThanOrEqual(5);
    const r = calcularReparto(d.cursos, d.reparto, d.alumnos);
    for (const g of r.grupos) if (g.profesores.length) expect(g.profesores.reduce((a, p) => a + p.total, 0)).toBe(g.aRepartir);
    const a = d.alumnos[0];
    const ops = [
      { tipo: 'alumno' as const, id: a.id, hoja: a.hoja, fila: a.fila, clave: claveAlumno(a), campo: 'p:form_creada', valor: true },
      { tipo: 'empresa' as const, id: d.empresas[0].id, fila: d.empresas[0].fila, campo: 'proximaAccion', valor: 'Prueba' },
      { tipo: 'empresa_nueva' as const, nombre: 'ZZ Prueba', datos: { estado: 'Contactar' } },
    ];
    const { cambios, conflictos } = aCambios(d, libro, ops);
    expect(conflictos).toEqual([]);
    const nuevo = aplicarCambios(libro, cambios);
    const p1 = unzipSync(bytes), p2 = unzipSync(nuevo);
    expect(Object.keys(p2)).toEqual(Object.keys(p1));
    const tocadas = Object.keys(p1).filter((k) => strFromU8(p1[k]) !== strFromU8(p2[k]));
    expect(tocadas.every((k) => /worksheets\/sheet\d+\.xml$|workbook\.xml$|tables\/table\d+\.xml$/.test(k))).toBe(true);
    const d2 = leerDatos(abrirLibro(nuevo));
    expect(d2.alumnos[0].pasos.form_creada).toBe(true);
    expect(d2.empresas.at(-1)!.nombre).toBe('ZZ Prueba');
    console.log('cursos', r.grupos.map((g) => `${g.curso}:${g.aRepartir}`).join(' '), '| alumnos', d.alumnos.length, '| empresas', d.empresas.length, '| histórico', d.historico.length, '| tocadas', tocadas.join(','));
  });
});
