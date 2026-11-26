import { useMemo, useState } from 'react';
import { Check, Search, UserRound } from 'lucide-react';
import { useApp, usePreferencias } from '../datos/estado';
import { fechaCorta, opAlumno, useDerivados } from '../datos/derivados';
import { PASOS, nombreCompleto, nombreLista, type Alumno, type Paso } from '../datos/modelo';
import { avisosAlumno, edadEn, fechaLarga, FIRMAS, hoyISO, progreso, sumarDias } from '../datos/avisos';
import { Empty, Field, PageHeader, PanelLateral, Progreso, Seccion } from '../componentes/ui';
import { ir } from '../App';

type Filtro = 'todos' | 'sinEmpresa' | 'sinTutor' | 'avisos' | 'pendientes';
const FASES: { id: Paso['fase']; titulo: string }[] = [
  { id: 'datos', titulo: 'Datos del alumno' },
  { id: 'empresa', titulo: 'Empresa y convenio' },
  { id: 'formacion', titulo: 'Formación en SAO' },
  { id: 'cierre', titulo: 'Cierre' },
];

export default function Alumnado({ abrir }: { abrir: string | null }) {
  const { datos, cambiar } = useApp();
  const [prefs] = usePreferencias();
  const cursoInicial = abrir?.startsWith('curso:') ? abrir.slice(6) : '';
  const [curso, setCurso] = useState<string>(cursoInicial || (prefs.yo ? 'mios' : ''));
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [q, setQ] = useState('');
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [pasoMasivo, setPasoMasivo] = useState(PASOS[0].clave);
  const [cursoVisto, setCursoVisto] = useState(cursoInicial);
  if (cursoInicial && cursoInicial !== cursoVisto) { setCursoVisto(cursoInicial); setCurso(cursoInicial); }

  const ficha = abrir && !abrir.startsWith('curso:') ? datos.alumnos.find((a) => a.id === abrir) ?? null : null;
  const hoy = hoyISO();
  const esMio = (a: Alumno) => !!prefs.yo && a.tutor.toUpperCase() === prefs.yo.toUpperCase();

  const delCurso = datos.alumnos.filter((a) => (curso === 'mios' ? esMio(a) : !curso || a.curso === curso));
  const cuenta = {
    todos: delCurso.length,
    sinEmpresa: delCurso.filter((a) => !a.empresa).length,
    sinTutor: delCurso.filter((a) => !a.tutor).length,
    avisos: delCurso.filter((a) => avisosAlumno(a, hoy).some((x) => x.nivel !== 'info')).length,
    pendientes: delCurso.filter((a) => !FIRMAS.every((f) => a.pasos[f])).length,
  };
  const lista = useMemo(() => delCurso
    .filter((a) => filtro === 'todos' || (filtro === 'sinEmpresa' && !a.empresa) || (filtro === 'sinTutor' && !a.tutor)
      || (filtro === 'avisos' && avisosAlumno(a, hoy).some((x) => x.nivel !== 'info')) || (filtro === 'pendientes' && !FIRMAS.every((f) => a.pasos[f])))
    .filter((a) => !q || [nombreCompleto(a), a.empresa, a.tutor, a.nia].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.curso.localeCompare(b.curso) || nombreLista(a).localeCompare(nombreLista(b), 'es')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [datos, curso, filtro, q, prefs.yo]);

  const todosMarcados = lista.length > 0 && lista.every((a) => marcados.has(a.id));
  const alternar = (id: string) => setMarcados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const seleccion = datos.alumnos.filter((a) => marcados.has(a.id));
  const marcarMasivo = (v: boolean) => { cambiar(seleccion.filter((a) => a.cols['p:' + pasoMasivo]).map((a) => opAlumno(a, 'p:' + pasoMasivo, v))); setMarcados(new Set()); };

  const pestanas = [...(prefs.yo ? [{ id: 'mios', texto: 'Mi alumnado' }] : []), { id: '', texto: 'Todos' }, ...datos.cursos.map((c) => ({ id: c.codigo, texto: c.codigo }))];

  return (
    <>
      <PageHeader title="Alumnado">Tramitación de la formación en empresa de cada alumno: empresa, tutor, fechas y los pasos en SAO.</PageHeader>

      <div className="tabs mb-4" role="tablist" aria-label="Curso">
        {pestanas.map((p) => (
          <button key={p.id || 'todos'} role="tab" aria-selected={curso === p.id} className={`tab ${curso === p.id ? 'tab-activa' : ''}`}
            onClick={() => { setCurso(p.id); setMarcados(new Set()); if (abrir?.startsWith('curso:')) ir('alumnado'); }}>{p.texto}</button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtro">
        {([['todos', 'Todos'], ['avisos', 'Con avisos'], ['pendientes', 'Sin confirmar por las 4 partes'], ['sinEmpresa', 'Sin empresa'], ['sinTutor', 'Sin tutor']] as [Filtro, string][]).map(([id, t]) => (
          <button key={id} aria-pressed={filtro === id} onClick={() => setFiltro(id)}
            className={`chip px-3 py-1 text-sm ${filtro === id ? 'border-blue-600 bg-blue-50 text-blue-800' : 'hover:border-slate-300'}`}>
            {t} <span className="text-slate-500 tabular-nums">{cuenta[id]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <label className="relative min-w-56 flex-1">
            <span className="sr-only">Buscar alumno</span>
            <Search size={16} className="pointer-events-none absolute top-2 left-2.5 text-slate-400" aria-hidden />
            <input className="input pl-8" placeholder="Buscar por nombre, empresa, tutor o NIA…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {seleccion.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-blue-50 px-2 py-1 text-sm text-blue-900" role="group" aria-label="Acción para los seleccionados">
              <span className="font-semibold">{seleccion.length} seleccionados:</span>
              <label className="sr-only" htmlFor="paso-masivo">Paso</label>
              <select id="paso-masivo" className="input w-auto py-1" value={pasoMasivo} onChange={(e) => setPasoMasivo(e.target.value)}>
                {PASOS.map((p) => <option key={p.clave} value={p.clave}>{p.label}</option>)}
              </select>
              <button className="btn btn-sm btn-primary" onClick={() => marcarMasivo(true)}><Check size={14} aria-hidden /> Marcar</button>
              <button className="btn btn-sm" onClick={() => marcarMasivo(false)}>Desmarcar</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setMarcados(new Set())}>Cancelar</button>
            </div>
          )}
        </div>
        {lista.length ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th className="w-8"><input type="checkbox" aria-label="Seleccionar todos" checked={todosMarcados} onChange={() => setMarcados(todosMarcados ? new Set() : new Set(lista.map((a) => a.id)))} /></th>
                <th>Alumno</th><th className="hidden sm:table-cell">Empresa</th><th className="hidden md:table-cell">Tutor</th>
                <th className="hidden lg:table-cell">Inicio</th><th className="min-w-44">Tramitación</th>
              </tr></thead>
              <tbody>
                {lista.map((a) => {
                  const av = avisosAlumno(a, hoy).filter((x) => x.nivel !== 'info');
                  const urg = av.some((x) => x.nivel === 'urgente');
                  return (
                    <tr key={a.id} className="fila-click" onClick={() => ir('alumnado', a.id)}>
                      <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Seleccionar a ${nombreCompleto(a)}`} checked={marcados.has(a.id)} onChange={() => alternar(a.id)} /></td>
                      <td>
                        <a href={`#/alumnado/${encodeURIComponent(a.id)}`} className="font-semibold text-slate-900 hover:underline" onClick={(e) => e.stopPropagation()}>{nombreLista(a)}</a>
                        <span className="chip ml-2">{a.curso}</span>
                        {av.length > 0 && <div className={`mt-0.5 text-xs font-semibold ${urg ? 'text-red-700' : 'text-amber-800'}`}>{av[0].texto.replace(nombreCompleto(a) + ': ', '').replace(nombreCompleto(a) + ' ', '')}</div>}
                      </td>
                      <td className="hidden sm:table-cell">{a.empresa || <span className="text-amber-800">Sin empresa</span>}</td>
                      <td className="hidden md:table-cell">{a.tutor || <span className="text-amber-800">Sin tutor</span>}</td>
                      <td className="hidden lg:table-cell whitespace-nowrap">{fechaCorta(a.fechaInicio) || '—'}</td>
                      <td><Puntos a={a} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="p-4"><Empty>{curso === 'mios' && !delCurso.length ? 'No tienes alumnado asignado como tutor.' : 'No hay alumnado con este filtro.'}</Empty></div>}
      </div>

      {ficha && <FichaAlumno a={ficha} onClose={() => ir('alumnado')} />}
    </>
  );
}

/** Los 16 pasos como puntos, agrupados por fase. */
function Puntos({ a }: { a: Alumno }) {
  const p = progreso(a);
  return (
    <div className="flex items-center gap-2" aria-label={`${p.hechos} de ${p.total} pasos hechos${p.siguiente ? `; siguiente: ${p.siguiente.label}` : ''}`} role="img">
      <div className="flex gap-1.5">
        {FASES.map((f) => (
          <span key={f.id} className="flex gap-0.5">
            {PASOS.filter((x) => x.fase === f.id).map((x) => (
              <span key={x.clave} title={`${x.label}: ${a.pasos[x.clave] ? 'hecho' : 'pendiente'}`}
                className={`inline-block size-2.5 rounded-full border ${a.pasos[x.clave] ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'}`} />
            ))}
          </span>
        ))}
      </div>
      <span className="text-xs text-slate-600 tabular-nums">{p.hechos}/{p.total}</span>
    </div>
  );
}

function FichaAlumno({ a, onClose }: { a: Alumno; onClose: () => void }) {
  const { datos, cambiar } = useApp();
  const { empresas } = useDerivados();
  const hoy = hoyISO();
  const set = (campo: string, v: string | number | boolean | null) => { if (a.cols[campo]) cambiar(opAlumno(a, campo, v)); };
  const p = progreso(a);
  const avisos = avisosAlumno(a, hoy);
  const tutores = [...new Set([...datos.reparto.filter((r) => r.curso === a.curso).map((r) => r.profesor), a.tutor].filter(Boolean))];
  const otrosTutores = [...new Set(datos.reparto.map((r) => r.profesor))].filter((t) => !tutores.includes(t)).sort((x, y) => x.localeCompare(y, 'es'));
  const emp = empresas.find((e) => e.id === a.empresa.trim().toLowerCase());
  const limite = a.fechaInicio ? sumarDias(a.fechaInicio, -10) : null;
  const edad = a.fechaNacimiento ? edadEn(a.fechaNacimiento, a.fechaInicio ?? hoy) : null;

  return (
    <PanelLateral titulo={nombreCompleto(a)} subtitulo={<span className="flex flex-wrap items-center gap-2"><span className="chip">{a.curso}</span>{a.nia && <span>NIA {a.nia}</span>}{edad !== null && <span>{edad} años{a.fechaInicio ? ' al empezar' : ''}</span>}</span>} onClose={onClose}>
      {avisos.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {avisos.map((x, i) => (
            <li key={i} className={`rounded-md border px-3 py-2 text-sm ${x.nivel === 'urgente' ? 'border-red-200 bg-red-50 text-red-900' : x.nivel === 'atencion' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              {x.texto.replace(nombreCompleto(a) + ': ', '')}
            </li>
          ))}
        </ul>
      )}

      <Seccion titulo="Formación en empresa">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Empresa" className="col-span-2">
            <input className="input" list="lista-empresas" defaultValue={a.empresa} key={a.empresa}
              onBlur={(e) => e.target.value.trim() !== a.empresa && set('empresa', e.target.value.trim() || null)} />
            <datalist id="lista-empresas">{empresas.filter((e) => e.estado !== 'No disponible').map((e) => <option key={e.id} value={e.nombre}>{e.libres !== null ? `${e.libres} plazas libres` : ''}</option>)}</datalist>
          </Field>
          {a.empresa && (
            <p className="col-span-2 -mt-1 text-xs text-slate-600">
              {emp ? <>Ficha: <a className="font-semibold text-blue-700 underline" href={`#/empresas/${encodeURIComponent(emp.id)}`}>{emp.nombre}</a> · {emp.asignados} alumnos / {emp.plazas ?? '—'} plazas</>
                : <span className="text-amber-800">Esta empresa no está en la hoja EMPRESAS.</span>}
            </p>
          )}
          <Field label="Tutor de FE">
            <select className="input" value={a.tutor} onChange={(e) => set('tutor', e.target.value || null)}>
              <option value="">Sin tutor</option>
              <optgroup label={`Profesorado de ${a.curso}`}>{tutores.map((t) => <option key={t}>{t}</option>)}</optgroup>
              {otrosTutores.length > 0 && <optgroup label="Otros">{otrosTutores.map((t) => <option key={t}>{t}</option>)}</optgroup>}
            </select>
          </Field>
          <Field label="Horas">
            <input className="input" type="number" min={0} max={1000} defaultValue={a.horas ?? ''} key={`h${a.horas}`}
              onBlur={(e) => e.target.value !== String(a.horas ?? '') && set('horas', e.target.value === '' ? null : Number(e.target.value))} />
          </Field>
          <Field label="Fecha de inicio">
            <input className="input" type="date" defaultValue={a.fechaInicio ?? ''} key={`i${a.fechaInicio}`} onBlur={(e) => e.target.value !== (a.fechaInicio ?? '') && set('fechaInicio', e.target.value || null)} />
          </Field>
          <Field label="Fecha de fin">
            <input className="input" type="date" defaultValue={a.fechaFin ?? ''} key={`f${a.fechaFin}`} onBlur={(e) => e.target.value !== (a.fechaFin ?? '') && set('fechaFin', e.target.value || null)} />
          </Field>
          {limite && <p className="col-span-2 -mt-1 text-xs text-slate-600">Debe estar confirmada por las cuatro partes antes del <strong>{fechaLarga(limite)}</strong>.</p>}
        </div>
      </Seccion>

      <Seccion titulo={`Tramitación (${p.hechos} de ${p.total})`}>
        <Progreso valor={p.hechos} total={p.total} etiqueta="Tramitación" className="mb-3" />
        <div className="space-y-3">
          {FASES.map((f) => (
            <fieldset key={f.id}>
              <legend className="mb-1 text-xs font-semibold text-slate-600">{f.titulo}</legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {PASOS.filter((x) => x.fase === f.id).map((x) => {
                  const hay = !!a.cols['p:' + x.clave];
                  return (
                    <label key={x.clave} className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-sm ${hay ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60'}`} title={hay ? undefined : 'La hoja no tiene esta columna'}>
                      <input type="checkbox" className="size-4 accent-blue-600" checked={!!a.pasos[x.clave]} disabled={!hay} onChange={(e) => set('p:' + x.clave, e.target.checked)} />
                      <span className={a.pasos[x.clave] ? 'text-slate-900' : 'text-slate-700'}>{x.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Observaciones">
        <label className="sr-only" htmlFor="obs-alumno">Observaciones</label>
        <textarea id="obs-alumno" className="input min-h-24" defaultValue={a.observaciones} key={a.observaciones}
          onBlur={(e) => e.target.value !== a.observaciones && set('observaciones', e.target.value || null)} />
      </Seccion>

      <Seccion titulo="Datos personales">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-600">NUSS</dt>
          <dd>
            <label className="sr-only" htmlFor="nuss">NUSS</label>
            <input id="nuss" className="input py-1" defaultValue={a.nuss} key={a.nuss} placeholder="Sin NUSS" onBlur={(e) => e.target.value.trim() !== a.nuss && set('nuss', e.target.value.trim() || null)} />
          </dd>
          {a.nif && <><dt className="text-slate-600">NIF/NIE</dt><dd>{a.nif}</dd></>}
          {a.fechaNacimiento && <><dt className="text-slate-600">Nacimiento</dt><dd>{fechaLarga(a.fechaNacimiento)}</dd></>}
          {a.email && <><dt className="text-slate-600">Correo</dt><dd><a className="text-blue-700 underline" href={`mailto:${a.email}`}>{a.email}</a></dd></>}
          {a.grupo && <><dt className="text-slate-600">Grupo</dt><dd>{a.grupo}</dd></>}
          <dt className="text-slate-600">Hoja</dt><dd className="flex items-center gap-1"><UserRound size={13} aria-hidden /> {a.hoja}, fila {a.fila}</dd>
        </dl>
      </Seccion>
    </PanelLateral>
  );
}
