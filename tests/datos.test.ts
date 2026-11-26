import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { abrirLibro, aplicarCambios, moverFormula, ponerCelda, valor, hoja } from '../src/datos/xlsx';
import { aCambios, claveAlumno, leerDatos } from '../src/datos/modelo';
import { calcularReparto, repartoJusto } from '../src/datos/reparto';
import { avisosAlumno, hayQueHablar } from '../src/datos/avisos';
import { duenoDeBloqueo, esCopiaConflicto } from '../src/datos/almacen';

const demo = () => abrirLibro(new Uint8Array(readFileSync(new URL('../public/demo/FCT_demo.xlsx', import.meta.url))));

describe('reparto', () => {
  it('reparte exactamente N con el resto mayor (como el Excel)', () => {
    // 1TSMR del Excel real: 24 alumnos y horas 11, 7, 7, 3, 2 → 9, 6, 6, 2, 1
    expect(repartoJusto([11, 7, 7, 3, 2], 24)).toEqual([9, 6, 6, 2, 1]);
    // 2TSMR: 24 alumnos y horas 8, 7, 5, 3, 3, 3, 1 → 7, 6, 4, 2, 2, 2, 1
    expect(repartoJusto([8, 7, 5, 3, 3, 3, 1], 24)).toEqual([7, 6, 4, 2, 2, 2, 1]);
    expect(repartoJusto([5, 5], 0)).toEqual([0, 0]);
    expect(repartoJusto([3, 1, 1], 7).reduce((a, b) => a + b)).toBe(7);
  });
});

describe('xlsx', () => {
  it('cambia una celda conservando el estilo y sin tocar el resto', () => {
    const xml = '<worksheet><sheetData><row r="4" spans="1:3"><c r="A4" s="7" t="s"><v>0</v></c><c r="C4" s="9" t="b"><v>0</v></c></row></sheetData></worksheet>';
    const x1 = ponerCelda(xml, { hoja: 'H', celda: 'C4', valor: true });
    expect(x1).toContain('<c r="C4" s="9" t="b"><v>1</v></c>');
    expect(x1).toContain('<c r="A4" s="7" t="s"><v>0</v></c>');
    const x2 = ponerCelda(x1, { hoja: 'H', celda: 'B4', valor: 'Hola & <adiós>' });
    expect(x2).toMatch(/<c r="A4"[^>]*>.*<\/c><c r="B4" t="inlineStr"><is><t xml:space="preserve">Hola &amp; &lt;adiós&gt;<\/t><\/is><\/c><c r="C4"/);
    const x3 = ponerCelda(x2, { hoja: 'H', celda: 'A9', valor: 5 });
    expect(x3).toMatch(/<\/row><row r="9"><c r="A9"><v>5<\/v><\/c><\/row><\/sheetData>/);
  });
  it('no pisa fórmulas', () => {
    const xml = '<worksheet><sheetData><row r="2"><c r="A2"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>';
    expect(() => ponerCelda(xml, { hoja: 'H', celda: 'A2', valor: 3 })).toThrow(/fórmula/);
  });
  it('mueve fórmulas de tabla a otra fila', () => {
    expect(moverFormula('IF($A4="","",SUM(M4:Q4))', 4, 15)).toBe('IF($A15="","",SUM(M15:Q15))');
    expect(moverFormula("COUNTIF(INDIRECT(INDEX('X Y'!$R$5:$R$9,MATCH(M$3,'X Y'!$A$5:$A$9,0))),$A4)", 4, 7)).toBe("COUNTIF(INDIRECT(INDEX('X Y'!$R$5:$R$9,MATCH(M$3,'X Y'!$A$5:$A$9,0))),$A7)");
  });
  it('escribe y vuelve a leer el libro conservando las demás partes', () => {
    const libro = demo();
    const nuevo = aplicarCambios(libro, [{ hoja: 'EMPRESAS', celda: 'T4', valor: 'Asignada' }, { hoja: '2DAM 26_27', celda: 'AT4', valor: '2026-12-21', fecha: true }]);
    const otro = abrirLibro(nuevo);
    expect(valor(hoja(otro, 'EMPRESAS'), 'T4')).toBe('Asignada');
    expect(valor(hoja(otro, '2DAM 26_27'), 'AT4')).toBe(46377);
    const a = unzipSync(nuevo), b = libro.partes;
    for (const p of Object.keys(b)) if (!/sheet\d+\.xml$|workbook\.xml$/.test(p)) expect(strFromU8(a[p])).toBe(strFromU8(b[p]));
    expect(strFromU8(a['xl/workbook.xml'])).toContain('fullCalcOnLoad="1"');
  });
});

describe('modelo', () => {
  it('lee cursos, alumnado, empresas, reparto e histórico por las cabeceras', () => {
    const d = leerDatos(demo());
    expect(d.cursoEscolar).toBe('2026-2027');
    expect(d.cursos.map((c) => c.codigo)).toEqual(['1DAM', '1TSMR', '2DAM', '2FPB', '2TSMR']);
    expect(d.alumnos).toHaveLength(18 + 20 + 12 + 10 + 16);
    expect(d.empresas).toHaveLength(10);
    expect(d.reparto.length).toBeGreaterThan(20);
    expect(d.historico.length).toBeGreaterThan(0);
    expect(d.avisosLectura).toEqual([]);
    const r = calcularReparto(d.cursos, d.reparto, d.alumnos);
    const dam1 = r.grupos.find((g) => g.curso === '1DAM')!;
    // se reparten los nombres que hay en la hoja; «previstos» (20) solo informa
    expect(dam1.aRepartir).toBe(dam1.enHoja);
    expect(dam1.previstos).toBe(20);
    expect(dam1.avisos.join(' ')).toContain('previstos 20');
    expect(dam1.profesores.reduce((a, p) => a + p.total, 0)).toBe(dam1.enHoja);
  });
  it('guarda por clave aunque alguien haya movido las filas', () => {
    const libro = demo();
    const d = leerDatos(libro);
    const a = d.alumnos.find((x) => x.curso === '2DAM')!;
    const op = { tipo: 'alumno' as const, id: a.id, hoja: a.hoja, fila: a.fila, clave: claveAlumno(a), campo: 'tutor', valor: 'SONIA' };
    const movido = { ...d, alumnos: d.alumnos.map((x) => (x.id === a.id ? { ...x, fila: 99 } : x)) };
    const { cambios, conflictos } = aCambios(movido, libro, [op]);
    expect(conflictos).toEqual([]);
    expect(cambios[0].celda).toBe(a.cols.tutor + '99');
  });
  it('crea una empresa nueva al final de la tabla', () => {
    const libro = demo();
    const d = leerDatos(libro);
    const { cambios } = aCambios(d, libro, [{ tipo: 'empresa_nueva', nombre: 'Empresa Nueva SL', datos: { localidad: 'Alzira', estado: 'Contactar', plazas: 2 } }]);
    const nuevo = abrirLibro(aplicarCambios(libro, cambios));
    const d2 = leerDatos(nuevo);
    expect(d2.empresas.at(-1)!.nombre).toBe('Empresa Nueva SL');
    expect(d2.empresas.at(-1)!.estado).toBe('Contactar');
    // «PLAZAS 26/27», no «PLAZAS LIBRES» (que es una fórmula)
    expect(d2.colsEmpresas.plazas).toBe('L');
    expect(d2.empresas.at(-1)!.plazas).toBe(2);
    const tabla = Object.entries(nuevo.partes).find(([k, v]) => k.startsWith('xl/tables/') && strFromU8(v).includes('Tabla5'))!;
    expect(strFromU8(tabla[1])).toContain(`ref="A3:Z${d2.empresas.at(-1)!.fila}"`);
  });
});

describe('avisos', () => {
  const base = { nombre: 'Ana', apellido1: 'Prueba', apellido2: '', nuss: '46/1', empresa: 'X', fechaNacimiento: '2005-01-01', pasos: {} } as any;
  it('regla de los 10 días', () => {
    const a = { ...base, fechaInicio: '2026-12-14' };
    expect(avisosAlumno(a, '2026-11-26')[0]).toMatchObject({ nivel: 'atencion' });
    expect(avisosAlumno(a, '2026-11-26')[0].texto).toMatch(/antes del 4 dic/);
    expect(avisosAlumno(a, '2026-11-30')[0]).toMatchObject({ nivel: 'urgente' });
    const ok = { ...a, pasos: { form_tutor: true, form_direccion: true, form_alumno: true, form_empresa: true } };
    expect(avisosAlumno(ok, '2026-11-26')).toEqual([]);
    expect(avisosAlumno(a, '2026-12-08')[0].texto).toMatch(/ha pasado el plazo/);
  });
  it('menores y NUSS', () => {
    const a = { ...base, nuss: '', fechaNacimiento: '2009-06-01', fechaInicio: '2027-03-01', pasos: { form_tutor: true, form_direccion: true, form_alumno: true, form_empresa: true } };
    const t = avisosAlumno(a, '2027-02-01').map((x) => x.texto).join(' ');
    expect(t).toMatch(/NUSS/); expect(t).toMatch(/menor de edad/);
  });
  it('hay que hablar', () => {
    const e = { estado: 'Asignada', fechaProxima: null, plazas: 2, proximaAccion: '' } as any;
    expect(hayQueHablar(e, 1, '2026-11-26')).toBeNull();
    expect(hayQueHablar({ ...e, estado: 'Contactar' }, 0)).toMatch(/contactar/);
    expect(hayQueHablar({ ...e, fechaProxima: '2026-11-20', proximaAccion: 'Llamar' }, 0, '2026-11-26')).toMatch(/Llamar/);
    expect(hayQueHablar(e, 3)).toMatch(/3 alumnos y 2 plazas/);
  });
});

describe('almacén', () => {
  it('lee quién tiene abierto el Excel y detecta copias en conflicto', () => {
    const b = new Uint8Array([5, ...new TextEncoder().encode('Gines'), 0, 0]);
    expect(duenoDeBloqueo(b)).toBe('Gines');
    expect(esCopiaConflicto('FCT_26_27.xlsx', 'FCT_26_27-PORTATIL.xlsx')).toBe(true);
    expect(esCopiaConflicto('FCT_26_27.xlsx', 'FCT_26_27 (1).xlsx')).toBe(true);
    expect(esCopiaConflicto('FCT_26_27.xlsx', 'Otro.xlsx')).toBe(false);
    expect(esCopiaConflicto('FCT_26_27.xlsx', '~$FCT_26_27.xlsx')).toBe(false);
  });
});
