import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { abrirLibro, aplicarCambios, type Libro } from './xlsx';
import { aCambios, leerDatos, type Datos, type Operacion } from './modelo';
import { FicheroCambiado, mismaVersion, type Almacen, type EstadoFichero, type Version } from './almacen';

/**
 * Estado compartido de la app y sincronización con el Excel.
 *
 * - Cada cambio se ve al instante (se aplica a la copia en memoria) y se guarda en el Excel a los pocos
 *   milisegundos, junto con los que lleguen mientras tanto.
 * - Antes de guardar se comprueba si el fichero ha cambiado (otro profesor, OneDrive). Si ha cambiado,
 *   se relee y los cambios se vuelven a aplicar sobre la versión nueva, buscando cada alumno o empresa por su clave.
 * - Cada 10 s se mira si hay una versión nueva y, si no hay nada pendiente, se recarga sola.
 */

export type EstadoGuardado =
  | { fase: 'guardado'; cuando: number }
  | { fase: 'pendiente' }
  | { fase: 'guardando' }
  | { fase: 'error'; mensaje: string };

type Ctx = {
  almacen: Almacen;
  datos: Datos;
  guardado: EstadoGuardado;
  fichero: EstadoFichero;
  aviso: string | null;
  cerrarAviso: () => void;
  cambiar: (ops: Operacion | Operacion[]) => void;
  recargar: () => Promise<void>;
  reintentar: () => void;
};

const Contexto = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(Contexto); if (!c) throw new Error('Sin datos'); return c; };

const ESPERA_GUARDADO = 600;
const CADA_CUANTO_MIRAR = 10_000;

export function ProveedorDatos({ almacen, inicial, children }: { almacen: Almacen; inicial: { libro: Libro; version: Version }; children: ReactNode }) {
  const base = useRef(inicial);                     // lo último leído o guardado en el fichero
  const pendientes = useRef<Operacion[]>([]);
  const ocupado = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [vista, setVista] = useState<{ libro: Libro; datos: Datos }>(() => ({ libro: inicial.libro, datos: leerDatos(inicial.libro) }));
  const [guardado, setGuardado] = useState<EstadoGuardado>({ fase: 'guardado', cuando: Date.now() });
  const [fichero, setFichero] = useState<EstadoFichero>({ abiertoPor: null, copiasConflicto: [] });
  const [aviso, setAviso] = useState<string | null>(null);

  /** Vista = fichero + cambios pendientes (para que la pantalla responda al momento). */
  const recalcularVista = useCallback(() => {
    const { libro } = base.current;
    if (!pendientes.current.length) { setVista({ libro, datos: leerDatos(libro) }); return; }
    const d0 = leerDatos(libro);
    const { cambios } = aCambios(d0, libro, pendientes.current);
    const l2 = abrirLibro(aplicarCambios(libro, cambios));
    setVista({ libro: l2, datos: leerDatos(l2) });
  }, []);

  const guardar = useCallback(async () => {
    if (ocupado.current || !pendientes.current.length) return;
    ocupado.current = true;
    const ops = pendientes.current;
    pendientes.current = [];
    setGuardado({ fase: 'guardando' });
    try {
      for (let intento = 0; ; intento++) {
        let { libro, version } = base.current;
        const actual = await almacen.version();
        let releido = false;
        if (!mismaVersion(actual, version)) {
          const r = await almacen.leer();
          libro = abrirLibro(r.bytes); version = r.version; base.current = { libro, version }; releido = true;
        }
        const d = leerDatos(libro);
        const { cambios, conflictos } = aCambios(d, libro, ops);
        if (conflictos.length) setAviso(`No se ha podido guardar todo: ${conflictos.join(' ')}`);
        else if (releido) setAviso('Otro profesor había guardado cambios: se han unido con los tuyos.');
        if (!cambios.length) break;
        const bytes = aplicarCambios(libro, cambios);
        try {
          const v = await almacen.escribir(bytes, version);
          base.current = { libro: abrirLibro(bytes), version: v };
          break;
        } catch (e) {
          if (e instanceof FicheroCambiado && intento < 3) continue; // alguien ha guardado justo ahora: otra vuelta
          throw e;
        }
      }
      setGuardado(pendientes.current.length ? { fase: 'pendiente' } : { fase: 'guardado', cuando: Date.now() });
    } catch (e) {
      pendientes.current = [...ops, ...pendientes.current]; // no se pierde nada: se reintenta
      setGuardado({ fase: 'error', mensaje: (e as Error).message });
    } finally {
      ocupado.current = false;
      recalcularVista();
      if (pendientes.current.length) programar();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [almacen, recalcularVista]);

  const programar = useCallback(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => { void guardar(); }, ESPERA_GUARDADO);
  }, [guardar]);

  const cambiar = useCallback((o: Operacion | Operacion[]) => {
    pendientes.current.push(...(Array.isArray(o) ? o : [o]));
    setGuardado({ fase: 'pendiente' });
    try { recalcularVista(); } catch (e) { setAviso((e as Error).message); }
    programar();
  }, [programar, recalcularVista]);

  const recargar = useCallback(async () => {
    const r = await almacen.leer();
    base.current = { libro: abrirLibro(r.bytes), version: r.version };
    recalcularVista();
  }, [almacen, recalcularVista]);

  // Vigilar cambios de otros profesores y el estado del fichero (abierto por alguien, copias en conflicto)
  useEffect(() => {
    let vivo = true;
    const mirar = async () => {
      try {
        setFichero(await almacen.estado());
        if (ocupado.current || pendientes.current.length) return;
        const v = await almacen.version();
        if (!mismaVersion(v, base.current.version)) {
          await recargar();
          if (vivo) setAviso('El Excel ha cambiado (otro profesor o Excel): datos actualizados.');
        }
      } catch { /* sin conexión con el fichero: se reintenta en la siguiente vuelta */ }
    };
    void mirar();
    const t = setInterval(mirar, CADA_CUANTO_MIRAR);
    const alVolver = () => { if (document.visibilityState === 'visible') void mirar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { vivo = false; clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [almacen, recargar]);

  // Avisar antes de cerrar con cambios sin guardar
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (pendientes.current.length || ocupado.current) { e.preventDefault(); } };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, []);

  const valor = useMemo<Ctx>(() => ({
    almacen, datos: vista.datos, guardado, fichero, aviso, cerrarAviso: () => setAviso(null), cambiar, recargar,
    reintentar: () => { void guardar(); },
  }), [almacen, vista, guardado, fichero, aviso, cambiar, recargar, guardar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

// ------------------------------------------------------------------ preferencias del profesor (en este equipo)

const PREF = 'app-fct:preferencias';
export type Preferencias = { yo: string | null; tema: 'claro' | 'oscuro' | 'sistema' };
export function leerPreferencias(): Preferencias {
  try { return { yo: null, tema: 'sistema', ...JSON.parse(localStorage.getItem(PREF) ?? '{}') }; } catch { return { yo: null, tema: 'sistema' }; }
}
export function guardarPreferencias(p: Partial<Preferencias>) {
  const n = { ...leerPreferencias(), ...p };
  try { localStorage.setItem(PREF, JSON.stringify(n)); } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new Event('app-fct:preferencias'));
  return n;
}
export function usePreferencias(): [Preferencias, (p: Partial<Preferencias>) => void] {
  const [p, setP] = useState(leerPreferencias);
  useEffect(() => { const f = () => setP(leerPreferencias()); window.addEventListener('app-fct:preferencias', f); return () => window.removeEventListener('app-fct:preferencias', f); }, []);
  return [p, (x) => setP(guardarPreferencias(x))];
}
