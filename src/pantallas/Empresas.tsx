import { useEffect, useMemo, useState } from 'react';
import { Mail, MapPin, MessageSquarePlus, Phone, Plus, Search } from 'lucide-react';
import { useApp, usePreferencias } from '../datos/estado';
import { fechaCorta, fechaNum, opEmpresa, useDerivados, type EmpresaVista } from '../datos/derivados';
import { ESTADOS_EMPRESA, nombreLista } from '../datos/modelo';
import { hoyISO } from '../datos/avisos';
import { ChipEstado, Empty, Field, Kpi, Modal, PageHeader, PanelLateral, Seccion } from '../componentes/ui';
import { ir } from '../App';

type Filtro = 'todas' | 'hablar' | 'libres' | 'asignadas' | 'nuevas';

export default function Empresas({ abrir }: { abrir: string | null }) {
  const { datos } = useApp();
  const { empresas, sinFicha } = useDerivados();
  const [filtro, setFiltro] = useState<Filtro>(abrir === 'hablar' ? 'hablar' : 'todas');
  const [q, setQ] = useState('');
  const [ciclo, setCiclo] = useState('');
  const [nueva, setNueva] = useState<string | null>(null);
  const ficha = abrir && abrir !== 'hablar' ? empresas.find((e) => e.id === abrir) ?? null : null;
  useEffect(() => { if (abrir === 'hablar') setFiltro('hablar'); }, [abrir]);

  const ciclos = useMemo(() => [...new Set(empresas.flatMap((e) => e.ciclos.split(/[,;/]/).map((c) => c.trim().toUpperCase()).filter(Boolean)))].sort(), [empresas]);
  const n = {
    todas: empresas.length,
    hablar: empresas.filter((e) => e.hablar).length,
    libres: empresas.filter((e) => (e.libres ?? 0) > 0 && e.estado !== 'No disponible').length,
    asignadas: empresas.filter((e) => e.asignados > 0).length,
    nuevas: empresas.filter((e) => !e.cursosColaborados).length,
  };
  const lista = empresas
    .filter((e) => filtro === 'todas' || (filtro === 'hablar' && e.hablar) || (filtro === 'libres' && (e.libres ?? 0) > 0 && e.estado !== 'No disponible') || (filtro === 'asignadas' && e.asignados > 0) || (filtro === 'nuevas' && !e.cursosColaborados))
    .filter((e) => !ciclo || e.ciclos.toUpperCase().includes(ciclo))
    .filter((e) => !q || [e.nombre, e.localidad, e.sector, e.contacto, e.responsable].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (filtro === 'hablar' ? (a.fechaProxima ?? '9').localeCompare(b.fechaProxima ?? '9') : 0) || a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <>
      <PageHeader title="Empresas" actions={<button className="btn btn-primary" onClick={() => setNueva('')}><Plus size={16} aria-hidden /> Nueva empresa</button>}>
        Cartera de empresas del centro: plazas de este curso, con cuáles hay que hablar y con quién han colaborado otros años.
      </PageHeader>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi valor={n.todas} texto="empresas" onClick={() => setFiltro('todas')} activo={filtro === 'todas'} />
        <Kpi valor={n.hablar} texto="hay que hablar con ellas" tono={n.hablar ? 'aviso' : 'ok'} onClick={() => setFiltro('hablar')} activo={filtro === 'hablar'} />
        <Kpi valor={n.libres} texto="con plazas libres" onClick={() => setFiltro('libres')} activo={filtro === 'libres'} />
        <Kpi valor={n.asignadas} texto="con alumnado este curso" onClick={() => setFiltro('asignadas')} activo={filtro === 'asignadas'} />
        <Kpi valor={n.nuevas} texto="sin colaboraciones anteriores" onClick={() => setFiltro('nuevas')} activo={filtro === 'nuevas'} />
      </div>

      {sinFicha.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Hay alumnado con empresas que no están en la hoja EMPRESAS: {sinFicha.map((s, i) => (
            <span key={s}>{i > 0 && ', '}<button className="font-semibold underline" onClick={() => setNueva(s)}>{s}</button></span>
          ))}. Pulsa en una para darla de alta.
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <label className="relative min-w-56 flex-1">
            <span className="sr-only">Buscar empresa</span>
            <Search size={16} className="pointer-events-none absolute top-2 left-2.5 text-slate-400" aria-hidden />
            <input className="input pl-8" placeholder="Buscar por nombre, localidad, sector, contacto…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm"><span className="font-semibold text-slate-600">Ciclo</span>
            <select className="input w-auto" value={ciclo} onChange={(e) => setCiclo(e.target.value)}><option value="">Todos</option>{ciclos.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
        </div>
        {lista.length ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Empresa</th><th>Estado</th><th className="text-right">Alumnos / plazas</th><th className="hidden md:table-cell">Ciclos</th><th className="hidden lg:table-cell">Próxima acción</th><th className="hidden lg:table-cell">Responsable</th><th className="hidden xl:table-cell">Colaboró</th></tr></thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.id} className="fila-click" onClick={() => ir('empresas', e.id)}>
                    <td>
                      <a href={`#/empresas/${encodeURIComponent(e.id)}`} className="font-semibold text-slate-900 hover:underline" onClick={(ev) => ev.stopPropagation()}>{e.nombre}</a>
                      <div className="text-xs text-slate-600">{[e.localidad, e.sector].filter(Boolean).join(' · ')}</div>
                      {e.hablar && <div className="mt-0.5 text-xs font-semibold text-amber-800">{e.hablar}</div>}
                    </td>
                    <td><ChipEstado estado={e.estado} /></td>
                    <td className="text-right whitespace-nowrap">
                      <span className={e.libres !== null && e.libres < 0 ? 'font-bold text-red-700' : 'font-semibold'}>{e.asignados}</span>
                      <span className="text-slate-500"> / {e.plazas ?? '—'}</span>
                    </td>
                    <td className="hidden md:table-cell">{e.ciclos || <span className="text-slate-400">—</span>}</td>
                    <td className="hidden lg:table-cell">{e.proximaAccion ? <span>{e.proximaAccion}{e.fechaProxima && <span className={`ml-1 text-xs ${e.fechaProxima <= hoyISO() ? 'font-bold text-red-700' : 'text-slate-500'}`}>{fechaCorta(e.fechaProxima)}</span>}</span> : <span className="text-slate-400">—</span>}</td>
                    <td className="hidden lg:table-cell">{e.responsable || <span className="text-slate-400">—</span>}</td>
                    <td className="hidden xl:table-cell text-slate-600">{e.cursosColaborados || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-4"><Empty>No hay empresas con este filtro.</Empty></div>}
      </div>
      {ficha && <FichaEmpresa e={ficha} onClose={() => ir('empresas', filtro === 'hablar' ? 'hablar' : undefined)} historico={datos.historico.filter((h) => h.empresa.toLowerCase() === ficha.id)} />}
      {nueva !== null && <NuevaEmpresa nombre={nueva} onClose={() => setNueva(null)} />}
    </>
  );
}

function FichaEmpresa({ e, onClose, historico }: { e: EmpresaVista; onClose: () => void; historico: { curso: string; grupo: string; alumnos: number }[] }) {
  const { cambiar } = useApp();
  const { profesores } = useDerivados();
  const [prefs] = usePreferencias();
  const [nota, setNota] = useState('');
  const [medio, setMedio] = useState('teléfono');
  const set = (campo: string, v: string | number | null) => cambiar(opEmpresa(e, campo, v === '' ? null : v));

  const registrar = () => {
    const hoy = hoyISO();
    const linea = `${fechaNum(hoy)} ${prefs.yo ?? 'Profesor/a'} (${medio}): ${nota.trim()}`;
    cambiar([opEmpresa(e, 'ultimoContacto', hoy), opEmpresa(e, 'observaciones', e.observaciones ? `${e.observaciones}\n${linea}` : linea)]);
    setNota('');
  };
  const historial = e.observaciones.split(/\n|\s\|\s/).map((s) => s.trim()).filter(Boolean).reverse();

  return (
    <PanelLateral titulo={e.nombre} subtitulo={<span className="flex flex-wrap items-center gap-2"><ChipEstado estado={e.estado} />{[e.sector, e.localidad].filter(Boolean).join(' · ')}</span>} onClose={onClose}>
      {e.hablar && <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">Hay que hablar con ella: {e.hablar}</p>}

      <Seccion titulo="Seguimiento">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estado">
            <select className="input" value={e.estado} onChange={(ev) => set('estado', ev.target.value)}>
              <option value="">Sin estado</option>{ESTADOS_EMPRESA.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Plazas este curso">
            <input className="input" type="number" min={0} max={50} defaultValue={e.plazas ?? ''} onBlur={(ev) => ev.target.value !== String(e.plazas ?? '') && set('plazas', ev.target.value === '' ? null : Number(ev.target.value))} />
          </Field>
          <Field label="Responsable">
            <select className="input" value={e.responsable} onChange={(ev) => set('responsable', ev.target.value)}>
              <option value="">Nadie</option>{[...new Set([...profesores, e.responsable].filter(Boolean))].map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Fecha de la próxima acción">
            <input className="input" type="date" defaultValue={e.fechaProxima ?? ''} onBlur={(ev) => ev.target.value !== (e.fechaProxima ?? '') && set('fechaProxima', ev.target.value || null)} />
          </Field>
          <Field label="Próxima acción" className="col-span-2">
            <input className="input" defaultValue={e.proximaAccion} placeholder="Llamar para confirmar plazas, enviar convenio…" onBlur={(ev) => ev.target.value !== e.proximaAccion && set('proximaAccion', ev.target.value)} />
          </Field>
        </div>
      </Seccion>

      <Seccion titulo="Registrar un contacto">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sm:w-36"><span className="sr-only">Medio</span>
            <select className="input" value={medio} onChange={(ev) => setMedio(ev.target.value)}>{['teléfono', 'correo', 'visita', 'Teams', 'alumno'].map((m) => <option key={m}>{m}</option>)}</select>
          </label>
          <label className="flex-1"><span className="sr-only">Qué se ha hablado</span>
            <input className="input" value={nota} onChange={(ev) => setNota(ev.target.value)} placeholder="Qué se ha hablado" onKeyDown={(ev) => { if (ev.key === 'Enter' && nota.trim()) registrar(); }} />
          </label>
          <button className="btn btn-primary" disabled={!nota.trim()} onClick={registrar}><MessageSquarePlus size={16} aria-hidden /> Anotar</button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Se añade a OBSERVACIONES con la fecha y tu nombre, y se actualiza «último contacto»{e.ultimoContacto && ` (ahora: ${fechaCorta(e.ultimoContacto)})`}.</p>
        {historial.length > 0 && (
          <ol className="mt-3 space-y-1.5 border-l-2 border-slate-200 pl-3 text-sm">{historial.slice(0, 12).map((h, i) => <li key={i} className="text-slate-700">{h}</li>)}</ol>
        )}
      </Seccion>

      <Seccion titulo={`Alumnado este curso (${e.asignados}${e.plazas !== null ? ` de ${e.plazas} plazas` : ''})`}>
        {e.alumnos.length ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {e.alumnos.map((a) => <li key={a.id}><a className="flex justify-between gap-2 py-1.5 hover:underline" href={`#/alumnado/${encodeURIComponent(a.id)}`}><span>{nombreLista(a)}</span><span className="text-slate-500">{a.curso}{a.tutor && ` · ${a.tutor}`}</span></a></li>)}
          </ul>
        ) : <p className="muted">Nadie todavía.</p>}
      </Seccion>

      <Seccion titulo="Otros cursos">
        <p className="text-sm text-slate-700">{e.cursosColaborados ? <>Ha colaborado en: <strong>{e.cursosColaborados}</strong></> : 'No consta que haya colaborado antes.'}</p>
        {historico.length > 0 && <ul className="mt-2 text-sm text-slate-700">{historico.map((h, i) => <li key={i}>{h.curso} · {h.grupo}: {h.alumnos} alumno{h.alumnos === 1 ? '' : 's'}</li>)}</ul>}
        {e.ciclos && <p className="mt-1 text-sm text-slate-700">Acepta: {e.ciclos}</p>}
      </Seccion>

      <Seccion titulo="Contacto">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {e.contacto && <><dt className="text-slate-500">Persona</dt><dd>{e.contacto}{e.cargo && ` (${e.cargo})`}</dd></>}
          {e.telefono && <><dt className="text-slate-500">Teléfono</dt><dd><a className="text-blue-700 hover:underline" href={`tel:${e.telefono.replace(/\s/g, '')}`}><Phone size={13} className="mr-1 inline" aria-hidden />{e.telefono}</a></dd></>}
          {e.email && <><dt className="text-slate-500">Correo</dt><dd><a className="text-blue-700 hover:underline" href={`mailto:${e.email}`}><Mail size={13} className="mr-1 inline" aria-hidden />{e.email}</a></dd></>}
          {e.direccion && <><dt className="text-slate-500">Dirección</dt><dd><MapPin size={13} className="mr-1 inline" aria-hidden />{e.direccion}</dd></>}
          {e.cif && <><dt className="text-slate-500">CIF</dt><dd>{e.cif}</dd></>}
        </dl>
        {!e.contacto && !e.telefono && !e.email && <p className="muted">Sin datos de contacto en el Excel.</p>}
      </Seccion>
    </PanelLateral>
  );
}

function NuevaEmpresa({ nombre, onClose }: { nombre: string; onClose: () => void }) {
  const { cambiar } = useApp();
  const [prefs] = usePreferencias();
  const [error, setError] = useState<string | null>(null);
  const { empresas } = useDerivados();
  return (
    <Modal title="Nueva empresa" onClose={onClose}>
      <form className="grid grid-cols-2 gap-3" onSubmit={(ev) => {
        ev.preventDefault();
        const f = new FormData(ev.currentTarget);
        const n = String(f.get('nombre') ?? '').trim();
        if (!n) return setError('Falta el nombre.');
        if (empresas.some((e) => e.id === n.toLowerCase())) return setError(`Ya existe «${n}».`);
        const datos: Record<string, string | number> = {};
        for (const k of ['localidad', 'sector', 'contacto', 'telefono', 'email', 'ciclos', 'estado']) { const v = String(f.get(k) ?? '').trim(); if (v) datos[k] = v; }
        const p = String(f.get('plazas') ?? ''); if (p) datos.plazas = Number(p);
        if (prefs.yo) datos.responsable = prefs.yo;
        cambiar({ tipo: 'empresa_nueva', nombre: n, datos });
        onClose();
      }}>
        <Field label="Nombre" className="col-span-2"><input name="nombre" className="input" defaultValue={nombre} required /></Field>
        <Field label="Localidad"><input name="localidad" className="input" /></Field>
        <Field label="Sector / actividad"><input name="sector" className="input" /></Field>
        <Field label="Persona de contacto"><input name="contacto" className="input" /></Field>
        <Field label="Teléfono"><input name="telefono" className="input" /></Field>
        <Field label="Correo"><input name="email" type="email" className="input" /></Field>
        <Field label="Ciclos que acepta"><input name="ciclos" className="input" placeholder="SMR, DAM" /></Field>
        <Field label="Plazas este curso"><input name="plazas" type="number" min={0} className="input" /></Field>
        <Field label="Estado"><select name="estado" className="input" defaultValue="Contactar">{ESTADOS_EMPRESA.map((s) => <option key={s}>{s}</option>)}</select></Field>
        {error && <p role="alert" className="col-span-2 text-sm text-red-700">{error}</p>}
        <div className="col-span-2 flex justify-end gap-2 pt-2"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary">Añadir al Excel</button></div>
      </form>
    </Modal>
  );
}
