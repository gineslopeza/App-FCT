import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onClose);
  cerrar.current = onClose;
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    const enfocables = () => [...(caja.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
    // Primer campo del cuerpo (no el botón de cerrar); si no hay, el propio diálogo
    (enfocables().find((e) => !e.dataset.cerrar) ?? caja.current)?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar.current();
      if (e.key !== 'Tab') return;
      const f = enfocables(); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1)!.focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); antes?.focus?.(); };
  }, []);
  const id = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-2 pt-6 sm:p-4 sm:pt-16" onMouseDown={onClose}>
      <div ref={caja} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className={`card w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} shadow-2xl outline-none`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 id={id} className="h2">{title}</h2>
          <button data-cerrar="1" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/** Cabecera común de cada pantalla: título, para qué sirve en una línea y las acciones a la derecha. */
export function PageHeader({ title, children, actions }: { title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-3xl">
        <h1 className="h1">{title}</h1>
        {children && <p className="mt-1 text-[15px] text-slate-600">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Barra de progreso fina; el color dice si está completo. */
export function Progreso({ valor, total, className = '', etiqueta = 'Progreso' }: { valor: number; total: number; className?: string; etiqueta?: string }) {
  const p = total ? Math.round((valor / total) * 100) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-200 ${className}`} role="progressbar" aria-label={etiqueta} aria-valuetext={`${p} %`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${p >= 100 ? 'bg-blue-600' : 'bg-tiza'}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="label">{label}</span>{children}</label>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{(error as Error).message}</div>;
}

/** «Cargando…» con los segundos que lleva; si tarda mucho, lo dice. */
export function Loading() {
  const [s, setS] = useState(0);
  useEffect(() => { const t = setInterval(() => setS((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="p-6 text-sm text-slate-500" role="status" aria-live="polite">
      Cargando…{s >= 3 && ` (${s} s)`}
      {s >= 15 && <div className="mt-1 text-amber-700">Está tardando más de lo normal. Si no avanza, comprueba la conexión o recarga la página.</div>}
    </div>
  );
}


/** Panel lateral (ficha de empresa o alumno): atrapa el foco, se cierra con Escape y devuelve el foco al salir. */
export function PanelLateral({ titulo, subtitulo, onClose, children, acciones }: { titulo: ReactNode; subtitulo?: ReactNode; onClose: () => void; children: ReactNode; acciones?: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onClose);
  cerrar.current = onClose;
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    caja.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar.current(); };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); antes?.focus?.(); };
  }, []);
  const id = useId();
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onMouseDown={onClose}>
      <aside ref={caja} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} onMouseDown={(e) => e.stopPropagation()}
        className="panel-lateral entrar-derecha flex h-full w-full max-w-xl flex-col bg-white outline-none">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={id} className="truncate text-lg font-bold text-slate-900">{titulo}</h2>
            {subtitulo && <div className="mt-0.5 text-sm text-slate-600">{subtitulo}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {acciones}
            <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}

export function Kpi({ valor, texto, tono, onClick, activo }: { valor: ReactNode; texto: ReactNode; tono?: 'aviso' | 'ok' | 'peligro'; onClick?: () => void; activo?: boolean }) {
  const color = tono === 'peligro' ? 'text-red-700' : tono === 'aviso' ? 'text-amber-700' : tono === 'ok' ? 'text-emerald-700' : '';
  const C = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick} aria-pressed={onClick ? !!activo : undefined}
      className={`kpi text-left ${onClick ? 'transition-colors hover:border-slate-300' : ''} ${activo ? 'border-blue-600 ring-2 ring-blue-100' : ''}`}>
      <span className={`kpi-valor ${color}`}>{valor}</span>
      <span className="kpi-texto">{texto}</span>
    </C>
  );
}

const TONOS_ESTADO: Record<string, string> = {
  'Contactar': 'border-amber-300 bg-amber-50 text-amber-800',
  'Pendiente respuesta': 'border-amber-200 bg-amber-50 text-amber-800',
  'Disponible': 'border-blue-200 bg-blue-50 text-blue-800',
  'Asignada': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'No disponible': 'border-slate-300 bg-slate-100 text-slate-600',
};
export function ChipEstado({ estado }: { estado: string }) {
  if (!estado) return <span className="chip text-slate-500">Sin estado</span>;
  return <span className={`chip ${TONOS_ESTADO[estado] ?? ''}`}>{estado}</span>;
}

export function Seccion({ titulo, children, accion }: { titulo: string; children: ReactNode; accion?: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-xs font-bold tracking-wide text-slate-500 uppercase">{titulo}</h3>{accion}</div>
      {children}
    </section>
  );
}
