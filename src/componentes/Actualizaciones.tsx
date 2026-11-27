import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { enEscritorio } from '../datos/almacen';

/**
 * Actualizaciones automáticas (solo escritorio): al abrir la app se busca una versión nueva en GitHub Releases.
 * Si la hay, se descarga e instala sola (el paquete va firmado) y la app se reinicia.
 */
type EstadoAct = { fase: 'nada' } | { fase: 'buscando' } | { fase: 'descargando'; version: string; pct: number | null } | { fase: 'lista'; version: string } | { fase: 'error'; mensaje: string } | { fase: 'al_dia' };
let estado: EstadoAct = { fase: 'nada' };
const oyentes = new Set<(e: EstadoAct) => void>();
const poner = (e: EstadoAct) => { estado = e; oyentes.forEach((f) => f(e)); };

export async function buscarActualizacion(automatica = false) {
  if (!enEscritorio() || estado.fase === 'buscando' || estado.fase === 'descargando') return;
  poner({ fase: 'buscando' });
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const u = await check();
    if (!u) { poner({ fase: 'al_dia' }); return; }
    let total = 0, hecho = 0;
    poner({ fase: 'descargando', version: u.version, pct: null });
    await u.downloadAndInstall((ev) => {
      if (ev.event === 'Started') total = ev.data.contentLength ?? 0;
      if (ev.event === 'Progress') { hecho += ev.data.chunkLength; poner({ fase: 'descargando', version: u.version, pct: total ? Math.round((hecho / total) * 100) : null }); }
    });
    poner({ fase: 'lista', version: u.version });
    if (automatica) { const { relaunch } = await import('@tauri-apps/plugin-process'); await relaunch(); }
  } catch (e) {
    poner(automatica ? { fase: 'nada' } : { fase: 'error', mensaje: `No se ha podido buscar actualizaciones: ${String(e)}` });
  }
}

export function useActualizacion() {
  const [e, setE] = useState(estado);
  useEffect(() => { oyentes.add(setE); return () => { oyentes.delete(setE); }; }, []);
  return e;
}

export function Actualizaciones() {
  const e = useActualizacion();
  if (e.fase === 'descargando') return <div className="flex items-center gap-1.5 text-amber-200" role="status"><Loader2 size={13} className="animate-spin" aria-hidden /> Actualizando a v{e.version}{e.pct !== null ? ` (${e.pct} %)` : ''}…</div>;
  if (e.fase === 'lista') return (
    <button className="flex items-center gap-1.5 text-emerald-300 underline" onClick={async () => { const { relaunch } = await import('@tauri-apps/plugin-process'); await relaunch(); }}>
      <Download size={13} aria-hidden /> v{e.version} instalada: reiniciar
    </button>
  );
  return null;
}
