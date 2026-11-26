# App FCT

Seguimiento de la formación en empresa (FE/FCT) del centro: qué empresas hay y con cuáles hay que hablar, la tramitación de cada alumno en SAO, el reparto de tutorías por horas y el histórico de otros cursos.

La **base de datos es el Excel compartido** del departamento (OneDrive / SharePoint). La app no tiene servidor ni guarda datos en ningún otro sitio: lee y escribe ese Excel en el equipo de cada profesor, conservando sus fórmulas, casillas, comentarios y validaciones.

## Cómo se usa

- **Escritorio (Windows)**: instala `App FCT_x.y.z_x64-setup.exe` de la [última versión](https://github.com/gineslopeza/App-FCT/releases/latest) y elige el Excel en tu carpeta de OneDrive sincronizada (en SharePoint: «Sincronizar» o «Agregar acceso directo a Mis archivos»). Se actualiza sola al abrirla.
- **Web**: en Edge o Chrome, desde GitHub Pages. El Excel se elige del propio equipo y no sale del navegador.
- **Demostración**: «Probar con datos inventados» en la pantalla inicial.

## Trabajo compartido

- Cada cambio se ve al momento y se guarda en el Excel en menos de un segundo.
- Antes de guardar se comprueba si otro profesor (u OneDrive) ha cambiado el fichero. Si es así, se vuelve a leer y los cambios se aplican encima, buscando a cada alumno por su NIA (o nombre) y a cada empresa por su nombre: no se pisa el trabajo de nadie.
- Cada 10 segundos se mira si hay una versión nueva del Excel.
- Avisa si alguien tiene el Excel abierto en Excel de escritorio y si OneDrive ha creado copias en conflicto (`FCT-PC.xlsx`, `FCT (1).xlsx`).

## Lo que espera del Excel

Las hojas se localizan por el **texto de las cabeceras**, no por la posición:

- Hojas de alumnado con nombre `CURSO AA_BB` (por ejemplo, `2TSMR 26_27`) y el formato de la hoja de 2TSMR. Las del último curso escolar son las de este año; las anteriores forman el histórico.
- `EMPRESAS`, con las columnas de seguimiento (ÚLTIMO CONTACTO, RESPONSABLE, PRÓXIMA ACCIÓN, FECHA PRÓXIMA ACCIÓN).
- `ALUMNOS POR PERSONA`, con las tablas CURSOS y REPARTO (horas, peso y ajuste de cada profesor por curso).

## Desarrollo

```bash
pnpm install
pnpm dev            # web en http://localhost:5174
pnpm tauri dev      # escritorio
pnpm comprobar      # tipos, tests y compilación
pnpm demo           # regenera public/demo/FCT_demo.xlsx (datos inventados)
FCT_REAL=/ruta/al/excel.xlsx pnpm test   # prueba de lectura con un Excel real (no se sube nunca)
```

## Publicar una versión

1. Una sola vez: genera las claves del actualizador con `pnpm tauri signer generate -w ~/.tauri/app-fct.key` y crea en GitHub (Settings → Secrets and variables → Actions) los secretos `TAURI_SIGNING_PRIVATE_KEY` (contenido del `.key`), `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (la contraseña elegida) y `TAURI_UPDATER_PUBKEY` (contenido del `.key.pub`). En Settings → Pages, elige «GitHub Actions» como origen. Guarda la clave privada: sin ella las apps instaladas no aceptan versiones nuevas.
2. Apunta los cambios en `CHANGELOG.md`, en «Sin publicar».
3. `pnpm release` (o `pnpm release minor`) y `git push --follow-tags`. GitHub Actions compila el instalador, publica la release con `latest.json` y actualiza la web.

## Autoría

© 2026 Ginés López Arribas. Licencia propietaria: ver [LICENSE](LICENSE).
