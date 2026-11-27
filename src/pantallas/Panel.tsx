import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, Building2, CalendarClock, Info } from 'lucide-react';
import { useApp, usePreferencias } from '../datos/estado';
import { useDerivados } from '../datos/derivados';
import { FIRMAS, progreso, todosLosAvisos, type Aviso } from '../datos/avisos';
import { calcularReparto } from '../datos/reparto';
import { nombreCompleto } from '../datos/modelo';
import { Kpi, PageHeader, Progreso, ChipEstado, Empty } from '../componentes/ui';
import { ir } from '../App';

export default function Panel() {
  const { datos } = useApp();
  const [prefs] = usePreferencias();
  const { empresas } = useDerivados();
  const avisos = useMemo(() => todosLosAvisos(datos), [datos]);
  const reparto = useMemo(() => calcularReparto(datos.cursos, datos.reparto, datos.alumnos), [datos]);
  const total = datos.alumnos.length;
  const conEmpresa = datos.alumnos.filter((a) => a.empresa).length;
  const confirmadas = datos.alumnos.filter((a) => FIRMAS.every((f) => a.pasos[f])).length;
  const urgentes = avisos.filter((a) => a.nivel === 'urgente').length;
  const hablar = empresas.filter((e) => e.hablar);
  const mios = prefs.yo ? datos.alumnos.filter((a) => a.tutor.toUpperCase() === prefs.yo!.toUpperCase()) : [];
  const misEmpresas = prefs.yo ? hablar.filter((e) => e.responsable.toUpperCase() === prefs.yo!.toUpperCase()) : [];

  return (
    <>
      <PageHeader title={prefs.yo ? `Hola, ${capital(prefs.yo)}` : 'Panel'}>
        Formación en empresa del curso {datos.cursoEscolar}: lo urgente, con quién hay que hablar y cómo va cada grupo.
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi valor={total} texto="alumnos en FE" onClick={() => ir('alumnado')} />
        <Kpi valor={`${conEmpresa}/${total}`} texto="con empresa asignada" tono={conEmpresa < total ? 'aviso' : 'ok'} onClick={() => ir('alumnado')} />
        <Kpi valor={`${confirmadas}/${total}`} texto="FE confirmadas por las 4 partes" tono={confirmadas === total ? 'ok' : undefined} />
        <Kpi valor={urgentes} texto="avisos urgentes" tono={urgentes ? 'peligro' : 'ok'} />
        <Kpi valor={hablar.length} texto="empresas con las que hablar" tono={hablar.length ? 'aviso' : 'ok'} onClick={() => ir('empresas', 'hablar')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5" aria-labelledby="t-avisos">
          <h2 id="t-avisos" className="h2 mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-700" aria-hidden /> Avisos de la tramitación</h2>
          <p className="muted mb-3">La FE tiene que estar confirmada por tutor, dirección, alumno y empresa 10 días naturales antes de empezar; si no, SAO la bloquea.</p>
          {avisos.length ? (
            <ul className="divide-y divide-slate-100">
              {avisos.filter((a) => a.nivel !== 'info').slice(0, 10).map((a, i) => <FilaAviso key={i} a={a} />)}
              {avisos.filter((a) => a.nivel !== 'info').length === 0 && <li className="py-2 text-sm text-slate-600">Nada urgente.</li>}
            </ul>
          ) : <Empty>Sin avisos.</Empty>}
          {avisos.some((a) => a.nivel === 'info') && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold text-slate-600">Otros avisos ({avisos.filter((a) => a.nivel === 'info').length})</summary>
              <ul className="mt-2 divide-y divide-slate-100">{avisos.filter((a) => a.nivel === 'info').slice(0, 40).map((a, i) => <FilaAviso key={i} a={a} />)}</ul>
            </details>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="t-hablar">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="t-hablar" className="h2 flex items-center gap-2"><Building2 size={18} className="text-blue-700" aria-hidden /> Hay que hablar con…</h2>
              <a className="text-sm font-semibold text-blue-700 hover:underline" href="#/empresas/hablar">Ver todas <ArrowRight size={14} className="inline" aria-hidden /></a>
            </div>
            {hablar.length ? (
              <ul className="divide-y divide-slate-100">
                {(misEmpresas.length ? [...misEmpresas, ...hablar.filter((e) => !misEmpresas.includes(e))] : hablar).slice(0, 6).map((e) => (
                  <li key={e.id}>
                    <a href={`#/empresas/${encodeURIComponent(e.id)}`} className="flex items-center justify-between gap-3 rounded-md px-1 py-2 hover:bg-slate-50">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{e.nombre}</span>
                        <span className="block truncate text-xs text-slate-600">{e.hablar}{e.responsable && ` · ${e.responsable}`}</span>
                      </span>
                      <ChipEstado estado={e.estado} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : <Empty>No hay empresas pendientes.</Empty>}
          </section>

          {prefs.yo && (
            <section className="card p-5" aria-labelledby="t-mios">
              <h2 id="t-mios" className="h2 mb-3">Tu alumnado ({mios.length})</h2>
              {mios.length ? (
                <ul className="space-y-2">
                  {mios.slice(0, 8).map((a) => { const p = progreso(a); return (
                    <li key={a.id}><a href={`#/alumnado/${encodeURIComponent(a.id)}`} className="flex items-center gap-3 rounded-md px-1 py-1 hover:bg-slate-50">
                      <span className="w-48 truncate text-sm font-semibold">{nombreCompleto(a)}</span>
                      <span className="chip">{a.curso}</span>
                      <Progreso valor={p.hechos} total={p.total} etiqueta={`Tramitación de ${nombreCompleto(a)}`} className="flex-1" />
                    </a></li>
                  ); })}
                </ul>
              ) : <p className="muted">Aún no tienes alumnado asignado. Mira el <a className="font-semibold text-blue-700 underline" href="#/reparto">reparto de tutorías</a>.</p>}
            </section>
          )}
        </div>
      </div>

      <section className="mt-6" aria-labelledby="t-grupos">
        <h2 id="t-grupos" className="h2 mb-3">Grupos</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {reparto.grupos.map((g) => {
            const als = datos.alumnos.filter((a) => a.curso === g.curso);
            const hechos = als.reduce((n, a) => n + progreso(a).hechos, 0);
            const inicio = als.map((a) => a.fechaInicio).filter(Boolean).sort()[0];
            return (
              <a key={g.curso} href={`#/alumnado/curso:${g.curso}`} className="card block p-4 transition-colors hover:border-slate-300">
                <div className="mb-2 flex items-baseline justify-between"><span className="text-lg font-bold">{g.curso}</span><span className="text-sm text-slate-600">{als.length} alumnos</span></div>
                <Progreso valor={hechos} total={als.length * 16} etiqueta={`Tramitación de ${g.curso}`} />
                <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-slate-600">
                  <dt>Con empresa</dt><dd className="text-right font-semibold text-slate-800">{als.filter((a) => a.empresa).length}</dd>
                  <dt>Sin tutor</dt><dd className={`text-right font-semibold ${g.sinTutor ? 'text-amber-700' : 'text-slate-800'}`}>{g.sinTutor}</dd>
                  <dt>Empieza</dt><dd className="text-right font-semibold text-slate-800">{inicio ? new Date(inicio + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'}</dd>
                </dl>
              </a>
            );
          })}
        </div>
      </section>
    </>
  );
}

function FilaAviso({ a }: { a: Aviso }) {
  const I = a.nivel === 'urgente' ? AlertTriangle : a.nivel === 'atencion' ? CalendarClock : Info;
  const c = a.nivel === 'urgente' ? 'text-red-700' : a.nivel === 'atencion' ? 'text-amber-700' : 'text-slate-500';
  return (
    <li>
      <a href={a.alumno ? `#/alumnado/${encodeURIComponent(a.alumno.id)}` : '#/panel'} className="flex items-start gap-2.5 rounded-md px-1 py-2 text-sm hover:bg-slate-50">
        <I size={16} className={`mt-0.5 shrink-0 ${c}`} aria-label={a.nivel === 'urgente' ? 'Urgente' : a.nivel === 'atencion' ? 'Atención' : 'Información'} />
        <span className="flex-1 text-slate-800">{a.texto}</span>
        {a.alumno && <span className="chip shrink-0">{a.alumno.curso}</span>}
      </a>
    </li>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
