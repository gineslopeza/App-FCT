import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

/**
 * Lectura y escritura del Excel compartido SIN rehacerlo.
 *
 * El libro usa funciones de Excel 365 (casillas de verificación, comentarios encadenados, validaciones x14,
 * matrices dinámicas) que se pierden si se abre y se vuelve a guardar con una biblioteca normal.
 * Por eso aquí solo se cambian las celdas tocadas, directamente en el XML, y el resto del fichero
 * se copia tal cual.
 */

export type Valor = string | number | boolean | null;
export type Celda = { v: Valor; formula: boolean; s?: string };
export type Hoja = { nombre: string; ruta: string; celdas: Map<string, Celda>; maxFila: number };
export type Libro = { partes: Record<string, Uint8Array>; hojas: Hoja[]; compartidas: string[] };

export type Cambio = {
  hoja: string;
  celda: string;            // «AE12»
  valor: Valor;
  fecha?: boolean;          // el número es una fecha (serie de Excel)
  formula?: string;         // escribir una fórmula en lugar de un valor
};

// ------------------------------------------------------------------ utilidades

const ENT: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
export const desescapar = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|apos);|&#(\d+);|&#x([0-9a-f]+);/gi, (m, _n, d, h) => (d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : ENT[m]));
export const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const colNum = (col: string) => [...col].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
export const colLetra = (n: number) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
export const partir = (ref: string) => { const m = /^([A-Z]+)(\d+)$/.exec(ref); if (!m) throw new Error(`Celda no válida: ${ref}`); return { col: m[1], fila: +m[2] }; };

/** Serie de Excel (días desde 30/12/1899) ↔ fecha ISO. */
export const serieAFecha = (n: number) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 864e5).toISOString().slice(0, 10);
export const fechaASerie = (iso: string) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 864e5);

const attr = (tag: string, nombre: string) => new RegExp(`\\s${nombre}="([^"]*)"`).exec(tag)?.[1];
const textoDe = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => desescapar(m[1])).join('');

// ------------------------------------------------------------------ lectura

export function abrirLibro(bytes: Uint8Array): Libro {
  let partes: Record<string, Uint8Array>;
  try { partes = unzipSync(bytes); } catch { throw new Error('El fichero no es un Excel (.xlsx) válido o está dañado.'); }
  const txt = (p: string) => (partes[p] ? strFromU8(partes[p]) : '');
  if (!partes['xl/workbook.xml']) throw new Error('El fichero no es un libro de Excel (.xlsx).');

  const compartidas = [...txt('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoDe(m[1].replace(/<rPh[\s\S]*?<\/rPh>/g, '')));
  const rels = txt('xl/_rels/workbook.xml.rels');
  const hojas: Hoja[] = [];
  for (const m of txt('xl/workbook.xml').matchAll(/<sheet\s[^>]*>/g)) {
    const nombre = desescapar(attr(m[0], 'name') ?? '');
    const rid = attr(m[0], 'r:id');
    const destino = new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*>`).exec(rels)?.[0];
    const t = destino && attr(destino, 'Target');
    if (!t) continue;
    const ruta = t.startsWith('/') ? t.slice(1) : 'xl/' + t;
    hojas.push({ nombre, ruta, ...leerCeldas(txt(ruta), compartidas) });
  }
  return { partes, hojas, compartidas };
}

function leerCeldas(xml: string, compartidas: string[]) {
  const celdas = new Map<string, Celda>();
  let maxFila = 0;
  const datos = /<sheetData>([\s\S]*)<\/sheetData>/.exec(xml)?.[1] ?? '';
  for (const m of datos.matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const a = ' ' + m[1];
    const ref = attr(a, 'r');
    if (!ref) continue;
    const cuerpo = m[2] ?? '';
    const t = attr(a, 't');
    const s = attr(a, 's');
    const v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1];
    let valor: Valor = null;
    if (t === 's') valor = v !== undefined ? compartidas[+v] ?? null : null;
    else if (t === 'inlineStr') valor = textoDe(cuerpo);
    else if (t === 'b') valor = v === '1';
    else if (t === 'str' || t === 'e') valor = v !== undefined ? desescapar(v) : null;
    else if (v !== undefined && v !== '') valor = Number(v);
    const fila = partir(ref).fila;
    if (fila > maxFila && (valor !== null && valor !== '')) maxFila = fila;
    celdas.set(ref, { v: valor, formula: /<f[\s>/]/.test(cuerpo), s });
  }
  return { celdas, maxFila };
}

export const hoja = (libro: Libro, nombre: string) => libro.hojas.find((h) => h.nombre === nombre);
export const valor = (h: Hoja | undefined, ref: string): Valor => h?.celdas.get(ref)?.v ?? null;

// ------------------------------------------------------------------ escritura

function celdaXml(ref: string, c: Cambio, s?: string) {
  const sa = s !== undefined ? ` s="${s}"` : '';
  if (c.formula) return `<c r="${ref}"${sa}><f>${escapar(c.formula)}</f></c>`;
  const v = c.valor;
  if (v === null || v === '') return `<c r="${ref}"${sa}/>`;
  if (typeof v === 'boolean') return `<c r="${ref}"${sa} t="b"><v>${v ? 1 : 0}</v></c>`;
  if (typeof v === 'number') return `<c r="${ref}"${sa}><v>${v}</v></c>`;
  return `<c r="${ref}"${sa} t="inlineStr"><is><t xml:space="preserve">${escapar(v)}</t></is></c>`;
}

/** Cambia (o crea) una celda en el XML de la hoja conservando su estilo. No pisa fórmulas salvo que el cambio sea otra fórmula. */
export function ponerCelda(xml: string, c: Cambio): string {
  const { col, fila } = partir(c.celda);
  const ini = xml.indexOf('<sheetData');
  if (ini < 0) throw new Error('Hoja sin datos');
  // sheetData vacío como <sheetData/>
  if (/<sheetData\s*\/>/.test(xml)) xml = xml.replace(/<sheetData\s*\/>/, '<sheetData></sheetData>');
  const filaRe = new RegExp(`<row\\s[^>]*?r="${fila}"[^>]*?(?:/>|>[\\s\\S]*?</row>)`);
  const mf = filaRe.exec(xml);
  if (!mf) {
    // fila nueva, en su sitio
    const nueva = `<row r="${fila}">${celdaXml(c.celda, c)}</row>`;
    const cuerpo = /<sheetData>([\s\S]*?)<\/sheetData>/.exec(xml)!;
    const inicioCuerpo = cuerpo.index + '<sheetData>'.length;
    let pos = inicioCuerpo + cuerpo[1].length;
    for (const r of cuerpo[1].matchAll(/<row\s[^>]*?r="(\d+)"/g)) if (+r[1] > fila) { pos = inicioCuerpo + r.index!; break; }
    return xml.slice(0, pos) + nueva + xml.slice(pos);
  }
  let filaXml = mf[0];
  if (filaXml.endsWith('/>')) filaXml = filaXml.slice(0, -2) + '></row>';
  const celdaRe = new RegExp(`<c\\s[^>]*?r="${c.celda}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`);
  const mc = celdaRe.exec(filaXml);
  let nuevaFila: string;
  if (mc) {
    if (/<f[\s>/]/.test(mc[0]) && !c.formula) throw new Error(`La celda ${c.hoja}!${c.celda} tiene una fórmula: no se sobrescribe.`);
    const s = attr(' ' + mc[0].slice(2), 's');
    nuevaFila = filaXml.replace(mc[0], celdaXml(c.celda, c, s));
  } else {
    // insertar en orden de columna; si la fila tiene estilo de celda por defecto, se respeta
    const n = colNum(col);
    const cuerpoIni = filaXml.indexOf('>') + 1;
    let pos = filaXml.length - '</row>'.length;
    for (const m of filaXml.slice(cuerpoIni).matchAll(/<c\s[^>]*?r="([A-Z]+)\d+"/g)) if (colNum(m[1]) > n) { pos = cuerpoIni + m.index!; break; }
    const s = attr(filaXml.slice(0, cuerpoIni), 's');
    nuevaFila = filaXml.slice(0, pos) + celdaXml(c.celda, c, s) + filaXml.slice(pos);
    nuevaFila = nuevaFila.replace(/\sspans="[^"]*"/, '');
  }
  return xml.slice(0, mf.index) + nuevaFila + xml.slice(mf.index + mf[0].length);
}

/** Aplica los cambios y devuelve el fichero nuevo. Las tablas de Excel crecen si se escribe justo debajo de ellas. */
export function aplicarCambios(libro: Libro, cambios: Cambio[]): Uint8Array {
  const partes = { ...libro.partes };
  const porHoja = new Map<string, Cambio[]>();
  for (const c of cambios) porHoja.set(c.hoja, [...(porHoja.get(c.hoja) ?? []), c]);
  for (const [nombre, cs] of porHoja) {
    const h = hoja(libro, nombre);
    if (!h) throw new Error(`No existe la hoja «${nombre}» en el Excel.`);
    let xml = strFromU8(partes[h.ruta]);
    for (const c of cs) xml = ponerCelda(xml, { ...c, valor: c.fecha && typeof c.valor === 'string' ? fechaASerie(c.valor) : c.valor });
    // dimensión: que abarque lo escrito
    const maxFila = Math.max(...cs.map((c) => partir(c.celda).fila));
    xml = xml.replace(/<dimension ref="([A-Z]+\d+):([A-Z]+)(\d+)"\/>/, (m, a, b, f) => (maxFila > +f ? `<dimension ref="${a}:${b}${maxFila}"/>` : m));
    partes[h.ruta] = strToU8(xml);
    crecerTablas(partes, h.ruta, maxFila);
  }
  // Excel recalcula al abrir (las fórmulas del libro dependen de lo escrito)
  const wb = strFromU8(partes['xl/workbook.xml']);
  if (!/fullCalcOnLoad="1"/.test(wb)) partes['xl/workbook.xml'] = strToU8(wb.replace(/<calcPr([^>]*?)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>'));
  return zipSync(partes, { level: 6 });
}

/** Si se ha escrito en la fila siguiente a una tabla de Excel, la tabla se alarga (como hace Excel al escribir debajo). */
function crecerTablas(partes: Record<string, Uint8Array>, rutaHoja: string, maxFila: number) {
  const relsRuta = rutaHoja.replace(/worksheets\/(sheet\d+\.xml)$/, 'worksheets/_rels/$1.rels');
  if (!partes[relsRuta]) return;
  for (const m of strFromU8(partes[relsRuta]).matchAll(/Target="(?:\.\.|\/xl)\/tables\/([^"]+)"/g)) {
    const ruta = 'xl/tables/' + m[1];
    if (!partes[ruta]) continue;
    const t = strFromU8(partes[ruta]);
    const r = /<table\s[^>]*?ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/.exec(t);
    if (!r || +r[4] >= maxFila || maxFila - +r[4] > 1 || /totalsRowCount="[1-9]/.test(t)) continue;
    const nuevo = `${r[1]}${r[2]}:${r[3]}${maxFila}`;
    partes[ruta] = strToU8(t.replaceAll(`ref="${r[1]}${r[2]}:${r[3]}${r[4]}"`, `ref="${nuevo}"`));
  }
}

/** Fórmulas «calculadas» de una tabla (las que Excel copia solas en cada fila nueva), por nombre de columna. */
export function formulasDeTabla(libro: Libro, nombreHoja: string): { desde: number; formulas: Record<string, string>; columnas: string[]; ref: string } | null {
  const h = hoja(libro, nombreHoja);
  if (!h) return null;
  const relsRuta = h.ruta.replace(/worksheets\/(sheet\d+\.xml)$/, 'worksheets/_rels/$1.rels');
  const rels = libro.partes[relsRuta] ? strFromU8(libro.partes[relsRuta]) : '';
  const tabla = /Target="(?:\.\.|\/xl)\/tables\/([^"]+)"/.exec(rels)?.[1];
  if (!tabla || !libro.partes['xl/tables/' + tabla]) return null;
  const t = strFromU8(libro.partes['xl/tables/' + tabla]);
  const ref = /<table\s[^>]*?ref="([^"]+)"/.exec(t)![1];
  const desde = partir(ref.split(':')[0]).fila + 1;
  const columnas: string[] = [];
  const formulas: Record<string, string> = {};
  for (const m of t.matchAll(/<tableColumn\s[^>]*?name="([^"]*)"[^>]*?(?:\/>|>([\s\S]*?)<\/tableColumn>)/g)) {
    const nombre = desescapar(m[1]);
    columnas.push(nombre);
    const f = /<calculatedColumnFormula>([\s\S]*?)<\/calculatedColumnFormula>/.exec(m[2] ?? '')?.[1];
    if (f) formulas[nombre] = desescapar(f);
  }
  return { desde, formulas, columnas, ref };
}

/** Lleva una fórmula escrita para la fila `de` a la fila `a` (solo las referencias relativas de fila). */
export const moverFormula = (f: string, de: number, a: number) =>
  f.replace(/('[^']*'!|[A-Za-z_][\w.]*!)?(\$?)([A-Z]{1,3})(\d+)(?![\d(])/g, (m, hojaRef, d1, col, fila) => (+fila === de && !m.includes('$' + fila) ? `${hojaRef ?? ''}${d1}${col}${a}` : m));
