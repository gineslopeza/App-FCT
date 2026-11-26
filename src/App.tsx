import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Building2, CheckCircle2, CircleAlert, FileSpreadsheet, FolderOpen, GraduationCap, LayoutDashboard, Loader2, RefreshCw, Scale, Settings, X } from 'lucide-react';
import { abrirLibro, type Libro } from './datos/xlsx';
import { almacenDemo, almacenEscritorio, almacenNavegador, enEscritorio, navegadorCompatible, pedirPermiso, recordarManejador, ultimoManejador, type Almacen, type Version } from './datos/almacen';
import { ProveedorDatos, useApp, usePreferencias } from './datos/estado';
import { Actualizaciones, buscarActualizacion } from './componentes/Actualizaciones';
import Panel from './pantallas/Panel';
import Empresas from './pantallas/Empresas';
import Alumnado from './pantallas/Alumnado';
import Reparto from './pantallas/Reparto';
import Ajustes from './pantallas/Ajustes';

export const VERSION = __APP_VERSION__;
const RUTA_GUARDADA = 'app-fct:ruta';

type Abierto = { almacen: Almacen; libro: Libro; version: Version };

export default function App() {
  const [abierto, setAbierto] = useState<Abierto | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefs] = usePreferencias();

  useEffect(() => {
    const oscuro = prefs.tema === 'oscuro' || (prefs.tema === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', oscuro);
  }, [prefs.tema]);

  const abrir = useCallback(async (crear: () => Promise<Almacen>, etiqueta: string) => {
    setCargando(etiqueta); setError(null);
    try {
      const almacen = await crear();
      const { bytes, version } = await almacen.leer();
      setAbierto({ almacen, libro: abrirLibro(bytes), version });
      if (almacen.ruta) localStorage.setItem(RUTA_GUARDADA, almacen.ruta);
    } catch (e) { setError((e as Error).message); }
    finally { setCargando(null); }
  }, []);

  // En el escritorio se abre solo el último Excel usado; y se busca una versión nueva de la app.
  useEffect(() => {
    if (!enEscritorio()) return;
    const ruta = localStorage.getItem(RUTA_GUARDADA);
    if (ruta) void abrir(() => almacenEscritorio(ruta), `Abriendo ${ruta.split(/[\\/]/).pop()}…`);
    void buscarActualizacion(true);
  }, [abrir]);

  if (abierto) {
    return (
      <ProveedorDatos almacen={abierto.almacen} inicial={{ libro: abierto.libro, version: abierto.version }} key={abierto.almacen.nombre + abierto.version.mtime}>
        <Marco onCerrar={() => { setAbierto(null); localStorage.removeItem(RUTA_GUARDADA); }} />
      </ProveedorDatos>
    );
  }
  return <Bienvenida abrir={abrir} cargando={cargando} error={error} />;
}

// ------------------------------------------------------------------ elegir el Excel

function Bienvenida({ abrir, cargando, error }: { abrir: (c: () => Promise<Almacen>, e: string) => Promise<void>; cargando: string | null; error: string | null }) {
  const [ultimo, setUltimo] = useState<string | null>(null);
  useEffect(() => { if (!enEscritorio() && navegadorCompatible()) void ultimoManejador().then((h) => setUltimo(h?.name ?? null)); }, []);

  const elegir = async () => {
    if (enEscritorio()) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const ruta = await open({ title: 'Elige el Excel de FCT (en tu carpeta de OneDrive)', filters: [{ name: 'Excel', extensions: ['xlsx'] }], multiple: false, directory: false });
      if (typeof ruta === 'string') await abrir(() => almacenEscritorio(ruta), 'Abriendo el Excel…');
      return;
    }
    const [h] = await (window as any).showOpenFilePicker({ types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }], excludeAcceptAllOption: true });
    if (!(await pedirPermiso(h))) throw new Error('Sin permiso para guardar en el fichero.');
    await recordarManejador(h);
    await abrir(() => almacenNavegador(h), 'Abriendo el Excel…');
  };
  const reabrir = async () => {
    const h = await ultimoManejador();
    if (h && (await pedirPermiso(h))) await abrir(() => almacenNavegador(h), `Abriendo ${h.name}…`);
  };
  const puedeElegir = enEscritorio() || navegadorCompatible();

  return (
    <main className="flex min-h-screen items-center justify-center bg-papel p-4">
      <div className="card w-full max-w-xl p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white"><GraduationCap size={24} aria-hidden /></span>
          <div>
            <h1 className="h1">App FCT</h1>
            <p className="text-sm text-slate-600">Seguimiento de la formación en empresa · Florida Alzira</p>
          </div>
        </div>
        <p className="mb-5 text-[15px] text-slate-700">
          Elige el Excel compartido de FCT. Si lo tienes en <strong>OneDrive o SharePoint sincronizado</strong>, ábrelo desde esa carpeta:
          los cambios llegan a los demás profesores y los suyos a ti. La app no guarda datos en ningún otro sitio.
        </p>
        <div className="flex flex-col gap-2">
          {ultimo && <button className="btn btn-primary justify-start py-2.5" onClick={() => void reabrir()} disabled={!!cargando}><FileSpreadsheet size={18} aria-hidden /> Volver a abrir {ultimo}</button>}
          {puedeElegir
            ? <button className={`btn ${ultimo ? '' : 'btn-primary'} justify-start py-2.5`} onClick={() => void elegir().catch(() => {})} disabled={!!cargando}><FolderOpen size={18} aria-hidden /> Abrir el Excel de FCT…</button>
            : <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Este navegador no puede guardar en ficheros. Usa la app de escritorio, Microsoft Edge o Google Chrome.</p>}
          <button className="btn btn-ghost justify-start py-2.5" onClick={() => void abrir(almacenDemo, 'Preparando la demostración…')} disabled={!!cargando}>
            <LayoutDashboard size={18} aria-hidden /> Probar con datos inventados
          </button>
        </div>
        <div className="mt-4 min-h-6" aria-live="polite">
          {cargando && <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" aria-hidden /> {cargando}</p>}
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">v{VERSION} · © 2026 Ginés López Arribas</p>
      </div>
    </main>
  );
}

// ------------------------------------------------------------------ marco: barra lateral, avisos y pantallas

const PANTALLAS = [
  { id: 'panel', label: 'Panel', icono: LayoutDashboard },
  { id: 'empresas', label: 'Empresas', icono: Building2 },
  { id: 'alumnado', label: 'Alumnado', icono: GraduationCap },
  { id: 'reparto', label: 'Reparto de tutorías', icono: Scale },
  { id: 'ajustes', label: 'Ajustes', icono: Settings },
] as const;
export type IdPantalla = (typeof PANTALLAS)[number]['id'];

export function ir(p: IdPantalla, param?: string) { location.hash = `#/${p}${param ? '/' + encodeURIComponent(param) : ''}`; }
function useRuta(): [IdPantalla, string | null] {
  const leer = (): [IdPantalla, string | null] => {
    const [, p, x] = location.hash.split('/');
    return [(PANTALLAS.some((s) => s.id === p) ? p : 'panel') as IdPantalla, x ? decodeURIComponent(x) : null];
  };
  const [r, setR] = useState(leer);
  useEffect(() => { const f = () => setR(leer()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return r;
}

function Marco({ onCerrar }: { onCerrar: () => void }) {
  const [pantalla, param] = useRuta();
  const { almacen, datos } = useApp();
  let contenido: ReactNode;
  switch (pantalla) {
    case 'empresas': contenido = <Empresas abrir={param} />; break;
    case 'alumnado': contenido = <Alumnado abrir={param} />; break;
    case 'reparto': contenido = <Reparto />; break;
    case 'ajustes': contenido = <Ajustes onCerrar={onCerrar} />; break;
    default: contenido = <Panel />;
  }
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav aria-label="Secciones" className="pizarra flex shrink-0 flex-col md:sticky md:top-0 md:h-screen md:w-60">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white"><GraduationCap size={18} aria-hidden /></span>
          <div className="leading-tight"><div className="font-bold text-white">App FCT</div><div className="seccion text-xs">Curso {datos.cursoEscolar}</div></div>
        </div>
        <ul className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {PANTALLAS.map(({ id, label, icono: I }) => (
            <li key={id}>
              <a href={`#/${id}`} aria-current={pantalla === id ? 'page' : undefined}
                className={`nav-item flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${pantalla === id ? 'activo' : ''}`}>
                <I size={17} aria-hidden /> {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-auto hidden space-y-2 px-4 py-4 text-xs md:block">
          <div className="seccion truncate" title={almacen.ruta ?? almacen.nombre}><FileSpreadsheet size={13} className="mr-1 inline" aria-hidden />{almacen.nombre}</div>
          <EstadoGuardado />
          <Actualizaciones />
          <div className="seccion">v{VERSION} · © Ginés López Arribas</div>
        </div>
      </nav>
      <div className="min-w-0 flex-1">
        <Avisos />
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8">{contenido}</main>
      </div>
    </div>
  );
}

function EstadoGuardado() {
  const { guardado, reintentar } = useApp();
  const [, tic] = useState(0);
  useEffect(() => { const t = setInterval(() => tic((n) => n + 1), 15_000); return () => clearInterval(t); }, []);
  if (guardado.fase === 'guardando' || guardado.fase === 'pendiente')
    return <div className="flex items-center gap-1.5 text-amber-200" role="status"><Loader2 size={13} className="animate-spin" aria-hidden /> Guardando en el Excel…</div>;
  if (guardado.fase === 'error')
    return <div className="text-red-300" role="alert"><CircleAlert size={13} className="mr-1 inline" aria-hidden />Sin guardar. <button className="underline" onClick={reintentar}>Reintentar</button></div>;
  const s = Math.round((Date.now() - guardado.cuando) / 1000);
  return <div className="flex items-center gap-1.5 text-emerald-300" role="status"><CheckCircle2 size={13} aria-hidden /> Guardado {s < 60 ? 'hace un momento' : `hace ${Math.round(s / 60)} min`}</div>;
}

/** Franja superior: errores al guardar, quién tiene el Excel abierto, copias en conflicto y avisos de sincronización. */
function Avisos() {
  const { guardado, fichero, aviso, cerrarAviso, reintentar, recargar, almacen } = useApp();
  useEffect(() => { if (aviso) { const t = setTimeout(cerrarAviso, 8000); return () => clearTimeout(t); } }, [aviso, cerrarAviso]);
  return (
    <div className="sticky top-0 z-30 space-y-px" aria-live="polite">
      {guardado.fase === 'error' && (
        <Franja tono="peligro">
          <span><strong>No se ha guardado.</strong> {guardado.mensaje} Tus cambios siguen aquí y se guardarán al reintentar.</span>
          <button className="btn btn-sm" onClick={reintentar}><RefreshCw size={14} aria-hidden /> Reintentar</button>
        </Franja>
      )}
      {fichero.abiertoPor && (
        <Franja tono="aviso"><span><strong>{fichero.abiertoPor}</strong> tiene el Excel abierto. Puedes seguir trabajando: si guardáis a la vez, la app une los cambios al volver a leerlo.</span></Franja>
      )}
      {fichero.copiasConflicto.length > 0 && (
        <Franja tono="aviso"><span><AlertTriangle size={15} className="mr-1 inline" aria-hidden />OneDrive ha creado una copia en conflicto: <strong>{fichero.copiasConflicto.join(', ')}</strong>. Revisa qué cambios tiene y bórrala cuando estén en el Excel principal.</span></Franja>
      )}
      {almacen.tipo === 'demo' && <Franja tono="info"><span>Estás viendo <strong>datos inventados</strong>. Los cambios no se guardan en ningún fichero.</span></Franja>}
      {aviso && (
        <Franja tono="info">
          <span>{aviso}</span>
          <span className="flex gap-1"><button className="btn btn-sm" onClick={() => void recargar()}>Recargar</button><button className="btn btn-ghost btn-sm" onClick={cerrarAviso} aria-label="Cerrar aviso"><X size={14} /></button></span>
        </Franja>
      )}
    </div>
  );
}

function Franja({ tono, children }: { tono: 'peligro' | 'aviso' | 'info'; children: ReactNode }) {
  const c = tono === 'peligro' ? 'border-red-200 bg-red-50 text-red-800' : tono === 'aviso' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900';
  return <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm md:px-8 ${c}`}>{children}</div>;
}
