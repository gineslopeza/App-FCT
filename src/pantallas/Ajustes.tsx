import { useState } from 'react';
import { FileSpreadsheet, FolderOpen, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp, usePreferencias, type Preferencias } from '../datos/estado';
import { useDerivados } from '../datos/derivados';
import { enEscritorio } from '../datos/almacen';
import { buscarActualizacion, useActualizacion } from '../componentes/Actualizaciones';
import { Field, PageHeader, Seccion } from '../componentes/ui';
import { VERSION } from '../App';

export default function Ajustes({ onCerrar }: { onCerrar: () => void }) {
  const { almacen, datos, recargar } = useApp();
  const { profesores } = useDerivados();
  const [prefs, setPrefs] = usePreferencias();
  const [recargando, setRecargando] = useState(false);
  const act = useActualizacion();

  return (
    <>
      <PageHeader title="Ajustes">Preferencias de este equipo y el Excel que usa la app.</PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <Seccion titulo="Quién eres">
            <Field label="Profesor/a">
              <select className="input" value={prefs.yo ?? ''} onChange={(e) => setPrefs({ yo: e.target.value || null })}>
                <option value="">Sin elegir</option>{profesores.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <p className="mt-1 text-xs text-slate-600">Sirve para ver primero tu alumnado y tus empresas, y para firmar los contactos que registres. Se guarda solo en este equipo.</p>
          </Seccion>
          <Seccion titulo="Apariencia">
            <div className="flex gap-2" role="radiogroup" aria-label="Tema">
              {([['claro', 'Claro'], ['oscuro', 'Oscuro'], ['sistema', 'Como el sistema']] as [Preferencias['tema'], string][]).map(([v, t]) => (
                <button key={v} role="radio" aria-checked={prefs.tema === v} className={`btn ${prefs.tema === v ? 'btn-primary' : ''}`} onClick={() => setPrefs({ tema: v })}>{t}</button>
              ))}
            </div>
          </Seccion>
        </div>

        <div className="card p-5">
          <Seccion titulo="Excel">
            <p className="flex items-start gap-2 text-sm"><FileSpreadsheet size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden /><span className="break-all"><strong>{almacen.nombre}</strong>{almacen.ruta && <span className="block text-xs text-slate-600">{almacen.ruta}</span>}</span></p>
            <p className="mt-1 text-xs text-slate-600">Curso {datos.cursoEscolar} · {datos.alumnos.length} alumnos · {datos.empresas.length} empresas · {datos.cursos.length} cursos</p>
            {datos.avisosLectura.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-800">{datos.avisosLectura.map((a) => <li key={a}>{a}</li>)}</ul>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn" disabled={recargando} onClick={async () => { setRecargando(true); try { await recargar(); } finally { setRecargando(false); } }}>
                {recargando ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />} Volver a leer
              </button>
              <button className="btn" onClick={onCerrar}><FolderOpen size={15} aria-hidden /> Abrir otro Excel</button>
            </div>
          </Seccion>
          <Seccion titulo="Versión">
            <p className="text-sm">App FCT v{VERSION}</p>
            {enEscritorio() ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <button className="btn" disabled={act.fase === 'buscando' || act.fase === 'descargando'} onClick={() => void buscarActualizacion(false)}>
                  {act.fase === 'buscando' ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />} Buscar actualizaciones
                </button>
                <span role="status" className="text-slate-600">
                  {act.fase === 'buscando' && 'Buscando…'}
                  {act.fase === 'al_dia' && 'Tienes la última versión.'}
                  {act.fase === 'descargando' && `Descargando v${act.version}${act.pct !== null ? ` (${act.pct} %)` : ''}…`}
                  {act.fase === 'lista' && `v${act.version} instalada. Se usará al reiniciar.`}
                  {act.fase === 'error' && <span className="text-red-700">{act.mensaje}</span>}
                </span>
              </div>
            ) : <p className="mt-1 text-xs text-slate-600">En el navegador siempre se usa la última versión publicada. La app de escritorio se actualiza sola al abrirla.</p>}
          </Seccion>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="h2 mb-2 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-700" aria-hidden /> Protección de datos</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Los datos solo están en el Excel del centro (OneDrive / SharePoint). La app lo lee y lo escribe en tu equipo y no envía nada a ningún servidor.</li>
            <li>Lo único que se guarda en este equipo es la ruta del Excel y tus preferencias.</li>
            <li>Si otro profesor guarda a la vez, la app vuelve a leer el Excel y aplica tus cambios encima, sin perder los suyos.</li>
            <li>SAO no se toca desde la app: los pasos se marcan aquí a mano cuando estén hechos allí.</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">App FCT · © Ginés López Arribas. Todos los derechos reservados.</p>
        </div>
      </div>
    </>
  );
}
