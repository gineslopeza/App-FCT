import { colLetra, colNum, formulasDeTabla, hoja, moverFormula, serieAFecha, valor, type Cambio, type Hoja, type Libro, type Valor } from './xlsx';

/**
 * Del Excel al modelo de la app y vuelta. Todo se localiza por el TEXTO de las cabeceras, no por la posición:
 * si alguien mueve o añade una columna en el Excel, la app sigue funcionando.
 */

export const norm = (x: unknown) =>
  String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

// ------------------------------------------------------------------ tipos

export type Paso = { clave: string; label: string; corto: string; fase: 'datos' | 'empresa' | 'formacion' | 'cierre' };
export type Alumno = {
  id: string; hoja: string; curso: string; fila: number;
  nombre: string; apellido1: string; apellido2: string; grupo: string; nia: string; nif: string; nuss: string;
  sexo: string; fechaNacimiento: string | null; nacionalidad: string; email: string;
  empresa: string; tutor: string; fechaInicio: string | null; fechaFin: string | null; horas: number | null; observaciones: string;
  pasos: Record<string, boolean>;
  cols: Record<string, string>; // campo → letra de columna (para escribir)
};
export type Empresa = {
  id: string; fila: number; nombre: string; cif: string; sector: string; localidad: string; direccion: string;
  contacto: string; cargo: string; telefono: string; email: string; ciclos: string; cursosColaborados: string;
  plazas: number | null; estado: string; observaciones: string;
  ultimoContacto: string | null; responsable: string; proximaAccion: string; fechaProxima: string | null;
  cols: Record<string, string>;
};
export type FilaReparto = { fila: number; curso: string; profesor: string; codigo: string; horas: number; peso: number; ajuste: number; cols: Record<string, string> };
export type Curso = { codigo: string; hoja: string; previstos: number | null; fila: number | null };
export type Historico = { curso: string; grupo: string; empresa: string; alumnos: number };
export type Datos = {
  cursos: Curso[]; alumnos: Alumno[]; empresas: Empresa[]; reparto: FilaReparto[]; historico: Historico[];
  hojaReparto: string | null; hojaEmpresas: string | null; colsEmpresas: Record<string, string>; filaCabEmpresas: number;
  cursoEscolar: string; avisosLectura: string[];
};

/** Pasos de la tramitación (columnas de casillas de la hoja de 2TSMR). */
export const PASOS: Paso[] = [
  { clave: 'nuss_ok', label: 'NUSS del alumno', corto: 'NUSS', fase: 'datos' },
  { clave: 'empresa_asignada', label: 'Empresa asignada', corto: 'Empresa', fase: 'empresa' },
  { clave: 'empresa_sao', label: 'Empresa en SAO', corto: 'En SAO', fase: 'empresa' },
  { clave: 'convenio_vigor', label: 'Convenio en vigor', corto: 'Convenio', fase: 'empresa' },
  { clave: 'conv_direccion', label: 'Convenio firmado por dirección', corto: 'Conv. dirección', fase: 'empresa' },
  { clave: 'conv_empresa', label: 'Convenio firmado por la empresa', corto: 'Conv. empresa', fase: 'empresa' },
  { clave: 'conv_sao', label: 'Convenio subido a SAO', corto: 'Conv. en SAO', fase: 'empresa' },
  { clave: 'form_creada', label: 'Formación creada en SAO', corto: 'Creada', fase: 'formacion' },
  { clave: 'form_tutor', label: 'Formación firmada por el tutor', corto: 'Firma tutor', fase: 'formacion' },
  { clave: 'form_direccion', label: 'Formación firmada por dirección', corto: 'Firma dirección', fase: 'formacion' },
  { clave: 'form_autorizada', label: 'Formación autorizada', corto: 'Autorizada', fase: 'formacion' },
  { clave: 'form_alumno', label: 'Formación firmada por el alumno', corto: 'Firma alumno', fase: 'formacion' },
  { clave: 'form_empresa', label: 'Formación firmada por la empresa', corto: 'Firma empresa', fase: 'formacion' },
  { clave: 'ra', label: 'Resultados de aprendizaje asignados', corto: 'RA', fase: 'cierre' },
  { clave: 'gestion_completa', label: 'Gestión completa', corto: 'Completa', fase: 'cierre' },
  { clave: 'laboral', label: 'Comunicado a departamento de prácticas / laboral', corto: 'Laboral', fase: 'cierre' },
];

const CAB_ALUMNO: Record<string, string> = {
  'NOMBRE': 'nombre', 'APELLIDO 1': 'apellido1', 'APE1': 'apellido1', 'PRIMER APELLIDO': 'apellido1', 'APELLIDO 2': 'apellido2', 'APE2': 'apellido2',
  'GRUPO': 'grupo', 'NIA': 'nia', 'NIF NIE': 'nif', 'NIF': 'nif', 'NUSS': 'nuss', 'SEXO': 'sexo', 'FECHA NACIMIENTO': 'fechaNacimiento',
  'NACIONALIDAD': 'nacionalidad', 'EMAIL': 'email', 'NOMBRE EMPRESA': 'empresa', 'EMPRESA': 'empresa',
  'TUTOR FE': 'tutor', 'TUTOR': 'tutor', 'FECHA INICIO': 'fechaInicio', 'FECHA FIN': 'fechaFin', 'HORAS': 'horas', 'OBSERVACIONES': 'observaciones',
  'NUSS ALUMNO': 'p:nuss_ok', 'EMPRESA ASIGNADA': 'p:empresa_asignada', 'EMPRESA EN SAO': 'p:empresa_sao', 'CONVENIO EN VIGOR': 'p:convenio_vigor',
  'CONVENIO FIRMADO POR DIRECCION': 'p:conv_direccion', 'CONVENIO FIRMADO POR EMPRESA': 'p:conv_empresa', 'CONVENIO SUBIDO A SAO': 'p:conv_sao',
  'FORMACION CREADA EN SAO': 'p:form_creada', 'FORMACION FIRMADA POR TUTOR': 'p:form_tutor', 'FORMACION FIRMADA POR DIRECCION': 'p:form_direccion',
  'FORMACION FIRMADA POR DIRECCIO': 'p:form_direccion', 'FORMACION AUTORIZADA': 'p:form_autorizada', 'FORMACION FIRMADA POR ALUMNO': 'p:form_alumno',
  'FORMACION FIRMADA POR EMPRESA': 'p:form_empresa', 'ASIGNADOS RA': 'p:ra', 'GESTION COMPLETA': 'p:gestion_completa',
  'DEPARTAMENTO PRACTICAS': 'p:laboral', 'ENVIADO A LABORAL': 'p:laboral',
};
const CAB_EMPRESA: Record<string, string> = {
  'EMPRESA': 'nombre', 'CIF': 'cif', 'SECTOR ACTIVIDAD': 'sector', 'LOCALIDAD': 'localidad', 'DIRECCION': 'direccion',
  'PERSONA CONTACTO': 'contacto', 'CARGO': 'cargo', 'TELEFONO': 'telefono', 'EMAIL': 'email', 'CICLOS QUE ACEPTA': 'ciclos',
  'CURSOS QUE HA COLABORADO': 'cursosColaborados', 'ESTADO': 'estado', 'OBSERVACIONES': 'observaciones',
  'ULTIMO CONTACTO': 'ultimoContacto', 'RESPONSABLE': 'responsable', 'PROXIMA ACCION': 'proximaAccion', 'FECHA PROXIMA ACCION': 'fechaProxima',
};
export const ESTADOS_EMPRESA = ['Contactar', 'Pendiente respuesta', 'Disponible', 'Asignada', 'No disponible'] as const;

// ------------------------------------------------------------------ utilidades

const txt = (v: Valor) => (v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'Sí' : '') : String(v).trim());
const num = (v: Valor) => (typeof v === 'number' ? v : v !== null && v !== '' && !isNaN(Number(v)) ? Number(v) : null);
export const aFecha = (v: Valor): string | null => {
  if (typeof v === 'number' && v > 20000 && v < 80000) return serieAFecha(v);
  const s = txt(v);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s); if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
};
const verdad = (v: Valor) => v === true || /^(true|verdadero|s[ií]|x|1)$/i.test(txt(v));

/** Busca la fila de cabeceras (entre la 1 y la 8) que contenga todas las claves; devuelve fila y columnas. */
function cabeceras(h: Hoja, requeridas: string[], mapa: Record<string, string>, desde = 1, hasta = 8) {
  for (let f = desde; f <= hasta; f++) {
    const cols: Record<string, string> = {};
    const textos = new Set<string>();
    for (const [ref, c] of h.celdas) {
      const m = /^([A-Z]+)(\d+)$/.exec(ref)!;
      if (+m[2] !== f || typeof c.v !== 'string') continue;
      const k = norm(c.v); textos.add(k);
      const campo = mapa[k];
      if (campo && !cols[campo]) cols[campo] = m[1];
    }
    if (requeridas.every((r) => textos.has(r))) return { fila: f, cols };
  }
  return null;
}

const CURSO_RE = /^(\S+)\s+(\d{2})_(\d{2})$/;

// ------------------------------------------------------------------ lectura

export function leerDatos(libro: Libro): Datos {
  const avisos: string[] = [];
  // Curso escolar: el más reciente de los nombres de hoja «XXX 26_27»
  const anios = libro.hojas.map((h) => CURSO_RE.exec(h.nombre)).filter(Boolean).map((m) => m![2]).sort();
  const actual = anios.at(-1) ?? '26';
  const cursoEscolar = `20${actual}-20${+actual + 1}`;

  // Hojas de alumnado (las del curso actual) e histórico (las de otros años)
  const alumnos: Alumno[] = [];
  const historico: Historico[] = [];
  for (const h of libro.hojas) {
    const m = CURSO_RE.exec(h.nombre);
    if (!m) continue;
    const cab = cabeceras(h, ['NOMBRE'], CAB_ALUMNO);
    if (!cab) { avisos.push(`La hoja «${h.nombre}» no tiene la fila de cabeceras esperada (NOMBRE, APELLIDO 1…).`); continue; }
    const deEsteCurso = m[2] === actual;
    for (let f = cab.fila + 1; f <= h.maxFila; f++) {
      const get = (campo: string) => (cab.cols[campo] ? valor(h, cab.cols[campo] + f) : null);
      const nombre = txt(get('nombre'));
      if (!nombre) continue;
      if (!deEsteCurso) {
        const e = txt(get('empresa'));
        if (e) {
          const x = historico.find((y) => y.grupo === m[1] && y.empresa.toLowerCase() === e.toLowerCase() && y.curso === `20${m[2]}-20${m[3]}`);
          if (x) x.alumnos++; else historico.push({ curso: `20${m[2]}-20${m[3]}`, grupo: m[1], empresa: e, alumnos: 1 });
        }
        continue;
      }
      const pasos: Record<string, boolean> = {};
      for (const p of PASOS) pasos[p.clave] = cab.cols['p:' + p.clave] ? verdad(get('p:' + p.clave)) : false;
      alumnos.push({
        id: `${h.nombre}#${txt(get('nia')) || nombre + ' ' + txt(get('apellido1'))}`, hoja: h.nombre, curso: m[1], fila: f,
        nombre, apellido1: txt(get('apellido1')), apellido2: txt(get('apellido2')), grupo: txt(get('grupo')), nia: txt(get('nia')),
        nif: txt(get('nif')), nuss: txt(get('nuss')), sexo: txt(get('sexo')), fechaNacimiento: aFecha(get('fechaNacimiento')),
        nacionalidad: txt(get('nacionalidad')), email: txt(get('email')), empresa: txt(get('empresa')), tutor: txt(get('tutor')),
        fechaInicio: aFecha(get('fechaInicio')), fechaFin: aFecha(get('fechaFin')), horas: num(get('horas')), observaciones: txt(get('observaciones')),
        pasos, cols: cab.cols,
      });
    }
  }

  // Empresas
  const he = libro.hojas.find((h) => norm(h.nombre) === 'EMPRESAS');
  const empresas: Empresa[] = [];
  let colsEmpresas: Record<string, string> = {};
  let filaCabEmpresas = 3;
  if (he) {
    const cab = cabeceras(he, ['EMPRESA'], CAB_EMPRESA);
    if (cab) {
      colsEmpresas = cab.cols; filaCabEmpresas = cab.fila;
      // «PLAZAS 26/27» (o el curso que toque)
      for (const [ref, c] of he.celdas) { const mm = /^([A-Z]+)(\d+)$/.exec(ref)!; if (+mm[2] === cab.fila && /^PLAZAS/.test(norm(c.v)) && !/LIBRES/.test(norm(c.v))) colsEmpresas.plazas = mm[1]; }
      for (let f = cab.fila + 1; f <= he.maxFila; f++) {
        const get = (campo: string) => (cab.cols[campo] ? valor(he, cab.cols[campo] + f) : null);
        const nombre = txt(get('nombre'));
        if (!nombre) continue;
        empresas.push({
          id: nombre.toLowerCase(), fila: f, nombre, cif: txt(get('cif')), sector: txt(get('sector')), localidad: txt(get('localidad')),
          direccion: txt(get('direccion')), contacto: txt(get('contacto')), cargo: txt(get('cargo')), telefono: txt(get('telefono')),
          email: txt(get('email')), ciclos: txt(get('ciclos')), cursosColaborados: txt(get('cursosColaborados')), plazas: num(get('plazas')),
          estado: txt(get('estado')), observaciones: txt(get('observaciones')), ultimoContacto: aFecha(get('ultimoContacto')),
          responsable: txt(get('responsable')), proximaAccion: txt(get('proximaAccion')), fechaProxima: aFecha(get('fechaProxima')), cols: cab.cols,
        });
      }
    } else avisos.push('La hoja EMPRESAS no tiene la fila de cabeceras esperada.');
  } else avisos.push('No se encuentra la hoja EMPRESAS.');

  // Reparto y cursos (hoja «ALUMNOS POR PERSONA»)
  const hr = libro.hojas.find((h) => /ALUMNOS POR PERSONA|REPARTO/.test(norm(h.nombre)));
  const reparto: FilaReparto[] = [];
  const cursos: Curso[] = [];
  if (hr) {
    const cabC = cabeceras(hr, ['CURSO', 'HOJA'], { 'CURSO': 'curso', 'HOJA': 'hoja', 'PREVISTOS': 'previstos' }, 1, 20);
    if (cabC) for (let f = cabC.fila + 1; f <= hr.maxFila; f++) {
      const c = txt(valor(hr, cabC.cols.curso + f));
      if (!c || !txt(valor(hr, cabC.cols.hoja + f)) || /\s/.test(c)) break;
      cursos.push({ codigo: c, hoja: txt(valor(hr, cabC.cols.hoja + f)), previstos: cabC.cols.previstos ? num(valor(hr, cabC.cols.previstos + f)) : null, fila: f });
    }
    const cabR = cabeceras(hr, ['CURSO', 'PROFESOR', 'HORAS SEMANA'], { 'CURSO': 'curso', 'PROFESOR': 'profesor', 'CODIGO HORARIO': 'codigo', 'HORAS SEMANA': 'horas', 'PESO': 'peso', 'AJUSTE': 'ajuste' }, 1, 40);
    if (cabR) for (let f = cabR.fila + 1; f <= hr.maxFila; f++) {
      const c = txt(valor(hr, cabR.cols.curso + f)), p = txt(valor(hr, cabR.cols.profesor + f));
      if (!c || !p) { if (!c && !p) break; continue; }
      reparto.push({
        fila: f, curso: c, profesor: p, codigo: cabR.cols.codigo ? txt(valor(hr, cabR.cols.codigo + f)) : '',
        horas: num(valor(hr, cabR.cols.horas + f)) ?? 0, peso: cabR.cols.peso ? num(valor(hr, cabR.cols.peso + f)) ?? 1 : 1,
        ajuste: cabR.cols.ajuste ? num(valor(hr, cabR.cols.ajuste + f)) ?? 0 : 0, cols: cabR.cols,
      });
    }
    else avisos.push('No se encuentra la tabla de reparto (CURSO, PROFESOR, HORAS/SEMANA) en «ALUMNOS POR PERSONA».');
  }
  // Cursos que no estén en la tabla: los de las hojas
  for (const a of alumnos) if (!cursos.some((c) => c.codigo === a.curso)) cursos.push({ codigo: a.curso, hoja: a.hoja, previstos: null, fila: null });
  for (const h of libro.hojas) {
    const m = CURSO_RE.exec(h.nombre);
    if (m && m[2] === actual && !cursos.some((c) => c.codigo === m[1])) cursos.push({ codigo: m[1], hoja: h.nombre, previstos: null, fila: null });
  }
  return { cursos, alumnos, empresas, reparto, historico, hojaReparto: hr?.nombre ?? null, hojaEmpresas: he?.nombre ?? null, colsEmpresas, filaCabEmpresas, cursoEscolar, avisosLectura: avisos };
}

// ------------------------------------------------------------------ escritura (cambios → celdas)

export type Operacion =
  | { tipo: 'alumno'; id: string; hoja: string; fila: number; clave: string; campo: string; valor: Valor }
  | { tipo: 'empresa'; id: string; fila: number; campo: string; valor: Valor }
  | { tipo: 'empresa_nueva'; nombre: string; datos: Partial<Record<string, Valor>> }
  | { tipo: 'reparto'; curso: string; profesor: string; campo: 'horas' | 'peso' | 'ajuste'; valor: Valor };

const CAMPOS_FECHA = new Set(['fechaInicio', 'fechaFin', 'fechaNacimiento', 'ultimoContacto', 'fechaProxima']);
export const claveAlumno = (a: Pick<Alumno, 'nia' | 'nombre' | 'apellido1'>) => (a.nia || `${a.nombre} ${a.apellido1}`).toLowerCase();

/**
 * Traduce las operaciones a celdas SOBRE EL LIBRO ACTUAL (recién leído): si alguien ha movido filas,
 * se busca al alumno o la empresa por su clave. Lo que no se encuentra se devuelve como conflicto.
 */
export function aCambios(datos: Datos, libro: Libro, ops: Operacion[]): { cambios: Cambio[]; conflictos: string[] } {
  const cambios: Cambio[] = [];
  const conflictos: string[] = [];
  let siguienteFilaEmpresa = Math.max(datos.filaCabEmpresas, ...datos.empresas.map((e) => e.fila)) + 1;
  for (const op of ops) {
    if (op.tipo === 'alumno') {
      const a = datos.alumnos.find((x) => x.hoja === op.hoja && claveAlumno(x) === op.clave);
      if (!a) { conflictos.push(`No se encuentra a ${op.clave} en «${op.hoja}» (¿se ha borrado o cambiado el nombre?).`); continue; }
      const col = a.cols[op.campo];
      if (!col) { conflictos.push(`La hoja «${op.hoja}» no tiene la columna para «${op.campo}».`); continue; }
      cambios.push({ hoja: a.hoja, celda: col + a.fila, valor: op.valor, fecha: CAMPOS_FECHA.has(op.campo) });
    } else if (op.tipo === 'empresa') {
      const e = datos.empresas.find((x) => x.id === op.id);
      const col = datos.colsEmpresas[op.campo];
      if (!e || !col || !datos.hojaEmpresas) { conflictos.push(`No se puede guardar «${op.campo}» de la empresa ${op.id}.`); continue; }
      cambios.push({ hoja: datos.hojaEmpresas, celda: col + e.fila, valor: op.valor, fecha: CAMPOS_FECHA.has(op.campo) });
    } else if (op.tipo === 'empresa_nueva') {
      if (!datos.hojaEmpresas) { conflictos.push('No hay hoja EMPRESAS.'); continue; }
      if (datos.empresas.some((e) => e.id === op.nombre.toLowerCase())) { conflictos.push(`Ya existe la empresa «${op.nombre}».`); continue; }
      const f = siguienteFilaEmpresa++;
      const todos: Record<string, Valor> = { nombre: op.nombre, ...op.datos } as Record<string, Valor>;
      for (const [campo, v] of Object.entries(todos)) {
        const col = datos.colsEmpresas[campo];
        if (col && v !== undefined && v !== null && v !== '') cambios.push({ hoja: datos.hojaEmpresas, celda: col + f, valor: v, fecha: CAMPOS_FECHA.has(campo) });
      }
      cambios.push(...formulasFilaNueva(libro, datos.hojaEmpresas, f));
    } else if (op.tipo === 'reparto') {
      const r = datos.reparto.find((x) => x.curso === op.curso && x.profesor === op.profesor);
      const col = r?.cols[op.campo];
      if (!r || !col || !datos.hojaReparto) { conflictos.push(`No se encuentra a ${op.profesor} en el reparto de ${op.curso}.`); continue; }
      cambios.push({ hoja: datos.hojaReparto, celda: col + r.fila, valor: op.valor });
    }
  }
  return { cambios, conflictos };
}

/** En una fila nueva de una tabla, las columnas calculadas llevan su fórmula (como haría Excel). */
function formulasFilaNueva(libro: Libro, nombreHoja: string, fila: number): Cambio[] {
  const t = formulasDeTabla(libro, nombreHoja);
  if (!t) return [];
  const ini = colNum(/^([A-Z]+)/.exec(t.ref)![1]);
  return t.columnas.flatMap((nombre, i) => (t.formulas[nombre] ? [{ hoja: nombreHoja, celda: colLetra(ini + i) + fila, valor: null, formula: moverFormula(t.formulas[nombre], t.desde, fila) }] : []));
}

export const nombreCompleto = (a: Pick<Alumno, 'nombre' | 'apellido1' | 'apellido2'>) => [a.nombre, a.apellido1, a.apellido2].filter(Boolean).join(' ');
export const nombreLista = (a: Pick<Alumno, 'nombre' | 'apellido1' | 'apellido2'>) => [a.apellido1, a.apellido2].filter(Boolean).join(' ') + (a.apellido1 ? ', ' : '') + a.nombre;
export { hoja };
