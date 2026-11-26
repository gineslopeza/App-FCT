import { useMemo, useState } from 'react';
import { AlertTriangle, Info, Wand2 } from 'lucide-react';
import { useApp } from '../datos/estado';
import { opAlumno } from '../datos/derivados';
import { calcularReparto, proponerTutores, type GrupoReparto, type ProfesorCurso } from '../datos/reparto';
import { nombreLista } from '../datos/modelo';
import { Empty, Modal, PageHeader } from '../componentes/ui';

const pct = (x: number) => `${(x * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
const dec = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export default function Reparto() {
  const { datos } = useApp();
  const r = useMemo(() => calcularReparto(datos.cursos, datos.reparto, datos.alumnos), [datos]);
  const [curso, setCurso] = useState(r.grupos[0]?.curso ?? '');
  const [proponer, setProponer] = useState<GrupoReparto | null>(null);
  const g = r.grupos.find((x) => x.curso === curso) ?? r.grupos[0];

  if (!datos.hojaReparto) return (
    <>
      <PageHeader title="Reparto de tutorías" />
      <Empty>El Excel no tiene la hoja «ALUMNOS POR PERSONA» con las tablas CURSOS y REPARTO.</Empty>
    </>
  );

  return (
    <>
      <PageHeader title="Reparto de tutorías">
        Cuántos alumnos de FE tutoriza cada profesor según las horas que da en cada curso. Los cambios se guardan en la hoja «{datos.hojaReparto}».
      </PageHeader>

      <details className="card mb-5 p-4 text-sm text-slate-700">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800"><Info size={16} className="text-blue-700" aria-hidden /> Cómo se calcula</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li><strong>Horas ponderadas</strong> = horas a la semana en el curso × peso. El peso vale 1 por defecto; súbelo o bájalo si un módulo debe contar más o menos.</li>
          <li><strong>Cuota exacta</strong> = alumnos a repartir × horas ponderadas ÷ total de horas ponderadas del curso.</li>
          <li>Cada profesor recibe la parte entera de su cuota; los alumnos que sobran van a quien tiene el resto más grande (si empatan, a quien tiene más horas). Así la suma coincide siempre con el total.</li>
          <li>El <strong>ajuste</strong> suma o resta alumnos a mano (por ejemplo, +1 a uno y −1 a otro). Si la suma deja de cuadrar, aparece un aviso.</li>
          <li>Se reparten los alumnos <strong>previstos</strong> de la tabla CURSOS; si no hay previstos, los que hay en la hoja del curso.</li>
        </ol>
      </details>

      <div className="tabs mb-4" role="tablist" aria-label="Curso">
        {r.grupos.map((x) => (
          <button key={x.curso} role="tab" aria-selected={x.curso === g?.curso} className={`tab ${x.curso === g?.curso ? 'tab-activa' : ''}`} onClick={() => setCurso(x.curso)}>
            {x.curso}{x.avisos.length > 0 && <AlertTriangle size={13} className="ml-1 inline text-amber-700" aria-label="con avisos" />}
          </button>
        ))}
      </div>

      {g ? <TablaCurso g={g} onProponer={() => setProponer(g)} /> : <Empty>No hay cursos en la tabla CURSOS.</Empty>}

      <section className="mt-8" aria-labelledby="t-resumen">
        <h2 id="t-resumen" className="h2 mb-3">Resumen por profesor</h2>
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Profesor</th><th className="text-right">Horas/semana</th><th className="text-right">Le tocan</th><th className="text-right">Asignados</th><th className="text-right">Pendientes</th><th className="hidden md:table-cell">Por curso</th></tr></thead>
            <tbody>
              {r.profesores.map((p) => (
                <tr key={p.profesor}>
                  <td className="font-semibold">{p.profesor}</td>
                  <td className="text-right">{dec(p.horas)}</td>
                  <td className="text-right font-semibold">{p.total}</td>
                  <td className="text-right">{p.asignados}</td>
                  <td className={`text-right font-semibold ${p.total - p.asignados > 0 ? 'text-amber-700' : p.total - p.asignados < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{p.total - p.asignados}</td>
                  <td className="hidden md:table-cell"><span className="flex flex-wrap gap-1">{p.cursos.filter((c) => c.total || c.asignados).map((c) => <span key={c.curso} className="chip">{c.curso}: {c.asignados}/{c.total}</span>)}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-bold"><td className="px-2 py-2">Total</td><td className="px-2 text-right">{dec(r.profesores.reduce((a, p) => a + p.horas, 0))}</td><td className="px-2 text-right">{r.profesores.reduce((a, p) => a + p.total, 0)}</td><td className="px-2 text-right">{r.profesores.reduce((a, p) => a + p.asignados, 0)}</td><td /><td className="hidden md:table-cell" /></tr></tfoot>
          </table>
        </div>
      </section>

      {proponer && <Propuesta g={proponer} onClose={() => setProponer(null)} />}
    </>
  );
}

function TablaCurso({ g, onProponer }: { g: GrupoReparto; onProponer: () => void }) {
  return (
    <section className="card" aria-label={`Reparto de ${g.curso}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div><dt className="inline text-slate-600">En la hoja: </dt><dd className="inline font-semibold">{g.enHoja}</dd></div>
          <div><dt className="inline text-slate-600">Previstos: </dt><dd className="inline font-semibold">{g.previstos ?? '—'}</dd></div>
          <div><dt className="inline text-slate-600">A repartir: </dt><dd className="inline font-semibold">{g.aRepartir}</dd></div>
          <div><dt className="inline text-slate-600">Sin tutor: </dt><dd className={`inline font-semibold ${g.sinTutor ? 'text-amber-700' : ''}`}>{g.sinTutor}</dd></div>
        </dl>
        <button className="btn" onClick={onProponer} disabled={!g.sinTutor}><Wand2 size={15} aria-hidden /> Proponer tutores para los {g.sinTutor} sin tutor</button>
      </div>
      {g.avisos.length > 0 && (
        <ul className="space-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{g.avisos.map((a) => <li key={a}><AlertTriangle size={14} className="mr-1 inline" aria-hidden />{a}</li>)}</ul>
      )}
      {g.profesores.length ? (
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr>
              <th>Profesor</th><th className="text-right">Horas/semana</th><th className="text-right">Peso</th><th className="hidden text-right md:table-cell">Ponderadas</th>
              <th className="text-right">% del curso</th><th className="hidden text-right lg:table-cell">Cuota exacta</th><th className="text-right">Le tocan</th>
              <th className="text-right">Ajuste</th><th className="text-right">Total</th><th className="text-right">Asignados</th><th className="text-right">Pendientes</th>
            </tr></thead>
            <tbody>{g.profesores.map((p) => <FilaProfesor key={p.profesor} g={g} p={p} />)}</tbody>
          </table>
        </div>
      ) : <div className="p-4"><Empty>No hay profesores con horas en {g.curso}. Añádelos en la tabla REPARTO del Excel.</Empty></div>}
    </section>
  );
}

function FilaProfesor({ g, p }: { g: GrupoReparto; p: ProfesorCurso }) {
  const { cambiar } = useApp();
  const editar = (campo: 'horas' | 'peso' | 'ajuste', v: string, actual: number) => {
    const n = v.trim() === '' ? (campo === 'peso' ? 1 : 0) : Number(v.replace(',', '.'));
    if (Number.isFinite(n) && n !== actual) cambiar({ tipo: 'reparto', curso: g.curso, profesor: p.profesor, campo, valor: n });
  };
  const num = (campo: 'horas' | 'peso' | 'ajuste', actual: number, paso: number) => (
    <input type="number" step={paso} className="input w-20 py-1 text-right" aria-label={`${campo === 'horas' ? 'Horas' : campo === 'peso' ? 'Peso' : 'Ajuste'} de ${p.profesor} en ${g.curso}`}
      defaultValue={actual} key={`${campo}${actual}`} disabled={!p.cols[campo]}
      onBlur={(e) => editar(campo, e.target.value, actual)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
  return (
    <tr>
      <td><span className="font-semibold">{p.profesor}</span>{p.codigo && p.codigo.toUpperCase() !== p.profesor.toUpperCase() && <span className="ml-1 text-xs text-slate-500">{p.codigo}</span>}</td>
      <td className="text-right">{num('horas', p.horas, 1)}</td>
      <td className="text-right">{num('peso', p.peso, 0.1)}</td>
      <td className="hidden text-right md:table-cell">{dec(p.ponderadas)}</td>
      <td className="text-right">{pct(p.porcentaje)}</td>
      <td className="hidden text-right lg:table-cell">{dec(p.cuota)}</td>
      <td className="text-right">{p.leTocan}</td>
      <td className="text-right">{num('ajuste', p.ajuste, 1)}</td>
      <td className="text-right font-bold">{p.total}</td>
      <td className="text-right">{p.asignados}</td>
      <td className={`text-right font-semibold ${p.pendientes > 0 ? 'text-amber-700' : p.pendientes < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{p.pendientes}</td>
    </tr>
  );
}

function Propuesta({ g, onClose }: { g: GrupoReparto; onClose: () => void }) {
  const { datos, cambiar } = useApp();
  const propuesta = useMemo(() => proponerTutores(g, datos.alumnos), [g, datos.alumnos]);
  const [elegidos, setElegidos] = useState<Record<string, string>>(() => Object.fromEntries(propuesta.map((x) => [x.alumno.id, x.tutor])));
  const aplicar = () => {
    cambiar(propuesta.filter((x) => elegidos[x.alumno.id]).map((x) => opAlumno(x.alumno, 'tutor', elegidos[x.alumno.id])));
    onClose();
  };
  return (
    <Modal title={`Proponer tutores en ${g.curso}`} onClose={onClose} wide>
      <p className="mb-3 text-sm text-slate-600">Cada alumno sin tutor va al profesor al que le quedan más plazas en este curso. Puedes cambiar cualquier propuesta antes de aplicarla; el Excel se actualiza al pulsar «Asignar».</p>
      {propuesta.length ? (
        <table className="tbl mb-4">
          <thead><tr><th>Alumno</th><th>Tutor propuesto</th></tr></thead>
          <tbody>
            {propuesta.map((x) => (
              <tr key={x.alumno.id}>
                <td>{nombreLista(x.alumno)}</td>
                <td>
                  <select className="input py-1" aria-label={`Tutor de ${nombreLista(x.alumno)}`} value={elegidos[x.alumno.id] ?? ''} onChange={(e) => setElegidos({ ...elegidos, [x.alumno.id]: e.target.value })}>
                    <option value="">No asignar</option>{g.profesores.map((p) => <option key={p.profesor}>{p.profesor}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <Empty>No quedan plazas libres en el reparto de {g.curso}. Revisa los ajustes.</Empty>}
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={aplicar} disabled={!Object.values(elegidos).some(Boolean)}>Asignar {Object.values(elegidos).filter(Boolean).length}</button>
      </div>
    </Modal>
  );
}
