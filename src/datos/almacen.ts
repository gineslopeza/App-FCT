/**
 * Dónde está el Excel. La app no guarda datos propios: lee y escribe el fichero que elige el profesor.
 *  - Escritorio (Tauri): fichero de la carpeta que sincroniza OneDrive/SharePoint.
 *  - Navegador (Edge o Chrome): el mismo fichero, con el permiso del navegador para leerlo y guardarlo.
 *  - Demostración: un Excel con datos inventados, solo en memoria.
 */

export type Version = { mtime: number; size: number };
export type EstadoFichero = { abiertoPor: string | null; copiasConflicto: string[] };
export interface Almacen {
  tipo: 'escritorio' | 'navegador' | 'demo';
  nombre: string;
  ruta: string | null;
  leer(): Promise<{ bytes: Uint8Array; version: Version }>;
  version(): Promise<Version>;
  /** Guarda si el fichero sigue en la versión esperada; si no, lanza `FicheroCambiado`. */
  escribir(bytes: Uint8Array, esperada: Version): Promise<Version>;
  estado(): Promise<EstadoFichero>;
}

export class FicheroCambiado extends Error { constructor() { super('Otro profesor ha guardado el Excel mientras tanto.'); } }
export const mismaVersion = (a: Version, b: Version) => a.mtime === b.mtime && a.size === b.size;
export const enEscritorio = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const separar = (ruta: string) => {
  const i = Math.max(ruta.lastIndexOf('\\'), ruta.lastIndexOf('/'));
  return { dir: ruta.slice(0, i), base: ruta.slice(i + 1), sep: ruta.includes('\\') ? '\\' : '/' };
};

/** Nombre de quien tiene abierto el Excel: Excel crea «~$fichero.xlsx» con el usuario en los primeros bytes. */
export function duenoDeBloqueo(b: Uint8Array): string | null {
  if (!b.length) return null;
  const n = b[0];
  const nombre = new TextDecoder('latin1').decode(b.slice(1, 1 + n)).trim();
  return nombre || null;
}
/** Copias que crea OneDrive cuando dos equipos guardan a la vez: «FCT_26_27-PORTATIL.xlsx», «FCT_26_27 (1).xlsx». */
export function esCopiaConflicto(base: string, otro: string) {
  const raiz = base.replace(/\.xlsx$/i, '');
  return otro !== base && /\.xlsx$/i.test(otro) && !otro.startsWith('~$') && (otro.startsWith(raiz + '-') || otro.startsWith(raiz + ' ('));
}

// ------------------------------------------------------------------ escritorio

export async function almacenEscritorio(ruta: string): Promise<Almacen> {
  const fs = await import('@tauri-apps/plugin-fs');
  const { dir, base, sep } = separar(ruta);
  const version = async (): Promise<Version> => { const s = await fs.stat(ruta); return { mtime: s.mtime ? new Date(s.mtime).getTime() : 0, size: s.size }; };
  return {
    tipo: 'escritorio', nombre: base, ruta,
    async leer() { const v = await version(); return { bytes: await fs.readFile(ruta), version: v }; },
    version,
    async escribir(bytes, esperada) {
      if (!mismaVersion(await version(), esperada)) throw new FicheroCambiado();
      const tmp = `${dir}${sep}.~appfct-${base}`;
      await fs.writeFile(tmp, bytes);
      try { await fs.rename(tmp, ruta); }
      catch (e) {
        await fs.remove(tmp).catch(() => {});
        throw new Error(`No se ha podido guardar: el Excel está abierto y bloqueado en este equipo, o OneDrive lo está sincronizando. Ciérralo y vuelve a intentarlo. (${String(e)})`);
      }
      return version();
    },
    async estado() {
      let abiertoPor: string | null = null;
      const lock = `${dir}${sep}~$${base.slice(2)}`; // Excel recorta los 2 primeros caracteres si el nombre es largo
      for (const l of [`${dir}${sep}~$${base}`, lock]) {
        if (await fs.exists(l).catch(() => false)) { abiertoPor = duenoDeBloqueo(await fs.readFile(l).catch(() => new Uint8Array())) ?? 'alguien'; break; }
      }
      const copias = (await fs.readDir(dir).catch(() => [])).map((e) => e.name).filter((n) => esCopiaConflicto(base, n));
      return { abiertoPor, copiasConflicto: copias };
    },
  };
}

// ------------------------------------------------------------------ navegador (File System Access API: Edge, Chrome)

type Manejador = FileSystemFileHandle & { requestPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState>; queryPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState> };
export const navegadorCompatible = () => typeof window !== 'undefined' && 'showOpenFilePicker' in window;

export async function almacenNavegador(h: Manejador): Promise<Almacen> {
  const version = async (): Promise<Version> => { const f = await h.getFile(); return { mtime: f.lastModified, size: f.size }; };
  return {
    tipo: 'navegador', nombre: h.name, ruta: null,
    async leer() { const f = await h.getFile(); return { bytes: new Uint8Array(await f.arrayBuffer()), version: { mtime: f.lastModified, size: f.size } }; },
    version,
    async escribir(bytes, esperada) {
      if (!mismaVersion(await version(), esperada)) throw new FicheroCambiado();
      const w = await h.createWritable();
      await w.write(bytes as unknown as ArrayBuffer); await w.close();
      return version();
    },
    async estado() { return { abiertoPor: null, copiasConflicto: [] }; },
  };
}

// Recordar el fichero elegido en el navegador (IndexedDB; el navegador vuelve a pedir permiso)
const BD = 'app-fct', TIENDA = 'ficheros';
function bd() { return new Promise<IDBDatabase>((ok, ko) => { const r = indexedDB.open(BD, 1); r.onupgradeneeded = () => r.result.createObjectStore(TIENDA); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
export async function recordarManejador(h: FileSystemFileHandle | null) {
  const db = await bd(); const t = db.transaction(TIENDA, 'readwrite');
  if (h) t.objectStore(TIENDA).put(h, 'ultimo'); else t.objectStore(TIENDA).delete('ultimo');
  return new Promise<void>((ok) => { t.oncomplete = () => ok(); });
}
export async function ultimoManejador(): Promise<Manejador | null> {
  try { const db = await bd(); return await new Promise((ok) => { const r = db.transaction(TIENDA).objectStore(TIENDA).get('ultimo'); r.onsuccess = () => ok(r.result ?? null); r.onerror = () => ok(null); }); }
  catch { return null; }
}
export async function pedirPermiso(h: Manejador) {
  if ((await h.queryPermission?.({ mode: 'readwrite' })) === 'granted') return true;
  return (await h.requestPermission?.({ mode: 'readwrite' })) === 'granted';
}

// ------------------------------------------------------------------ demostración

export async function almacenDemo(): Promise<Almacen> {
  const r = await fetch(`${import.meta.env.BASE_URL}demo/FCT_demo.xlsx`);
  if (!r.ok) throw new Error('No se encuentra el Excel de demostración.');
  let bytes: Uint8Array = new Uint8Array(await r.arrayBuffer());
  let v: Version = { mtime: Date.now(), size: bytes.length };
  return {
    tipo: 'demo', nombre: 'FCT_demo.xlsx (datos inventados)', ruta: null,
    async leer() { return { bytes, version: v }; },
    async version() { return v; },
    async escribir(b, esperada) { if (!mismaVersion(v, esperada)) throw new FicheroCambiado(); bytes = b; v = { mtime: Date.now(), size: b.length }; return v; },
    async estado() { return { abiertoPor: null, copiasConflicto: [] }; },
  };
}
