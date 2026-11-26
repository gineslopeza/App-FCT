# Notas para Claude

- App independiente del Gestor docente. Vite 7 + React 19 + Tailwind 4 + lucide-react; escritorio con Tauri 2 (`src-tauri`, plugins fs, dialog, updater, process, window-state).
- **El Excel compartido (OneDrive) es la base de datos.** Se edita a nivel de XML (`src/datos/xlsx.ts`, con fflate) para conservar casillas de Excel 365, comentarios encadenados, validaciones x14 y matrices dinámicas: no usar librerías que reescriban el libro (exceljs, SheetJS, openpyxl).
- `src/datos/modelo.ts`: lee por texto de cabecera (`CAB_ALUMNO`, `CAB_EMPRESA`); las operaciones (`Operacion`) se traducen a celdas con `aCambios` sobre el libro recién leído, buscando por clave (NIA o nombre + apellido; empresa por nombre).
- `src/datos/estado.tsx`: guardado optimista con espera de 600 ms; si el fichero cambió (`FicheroCambiado`), se relee y se reaplica. Mira el Excel cada 10 s.
- `src/datos/almacen.ts`: escritorio (plugin-fs, escribe a temporal y renombra), navegador (File System Access API) y demo.
- Reparto (`reparto.ts`): horas del horario por curso SIN la tutoría de grupo (nunca cuenta); método del resto mayor; debe dar lo mismo que la hoja «ALUMNOS POR PERSONA». Cualquier cambio de cálculo necesita test.
- Avisos (`avisos.ts`): normativa FE 2026-27 (confirmación por las cuatro partes 10 días naturales antes del inicio).
- SAO es solo de lectura salvo que Ginés diga lo contrario.
- Repositorio PÚBLICO: nunca subir Excel reales ni datos del alumnado; `public/demo/FCT_demo.xlsx` (de `scripts/demo.py`) es inventado. Capturas solo con la demo.
- Interfaz en español, tono profesional y neutro, sin exclamaciones ni emojis (también en el CHANGELOG). `PageHeader` en cada pantalla; `blue` es el acento y `slate` los neutros; el tema oscuro remapea variables en `.dark` (index.css).
- Accesible (WCAG 2.1 AA): etiquetas en los campos, `Modal`/`PanelLateral` atrapan el foco. Comprobar con axe al tocar la interfaz.
- Antes de terminar: `pnpm comprobar`, apuntar en CHANGELOG «Sin publicar», Conventional Commits. Publicar: `pnpm release` + `git push --follow-tags`.
- Responder a Ginés en español, ordenado, terminando con «Lo que te toca».
