// Prepara una versión: sube la versión (patch | minor | major), pasa «Sin publicar» del CHANGELOG
// a la versión nueva, hace el commit y la etiqueta. Después: git push --follow-tags
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const tipo = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(tipo) && !/^\d+\.\d+\.\d+$/.test(tipo)) { console.error('Uso: pnpm release [patch|minor|major|X.Y.Z]'); process.exit(1); }
if (execSync('git status --porcelain').toString().trim()) { console.error('Hay cambios sin guardar en git. Haz commit antes de publicar.'); process.exit(1); }

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const [M, m, p] = pkg.version.split('.').map(Number);
// Una versión exacta (p. ej. la primera, 0.1.0) se usa tal cual
const nueva = /^\d/.test(tipo) ? tipo : tipo === 'major' ? `${M + 1}.0.0` : tipo === 'minor' ? `${M}.${m + 1}.0` : `${M}.${m}.${p + 1}`;
if (execSync(`git tag -l v${nueva}`).toString().trim()) { console.error(`La versión v${nueva} ya existe.`); process.exit(1); }
pkg.version = nueva;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8').replace(/^version = ".*"$/m, `version = "${nueva}"`);
writeFileSync('src-tauri/Cargo.toml', cargo);

const hoy = new Date().toISOString().slice(0, 10);
const log = readFileSync('CHANGELOG.md', 'utf8');
if (!/## \[Sin publicar\]/.test(log)) { console.error('El CHANGELOG no tiene la sección «## [Sin publicar]».'); process.exit(1); }
writeFileSync('CHANGELOG.md', log.replace('## [Sin publicar]', `## [Sin publicar]\n\n## [${nueva}] - ${hoy}`));

execSync('git add package.json src-tauri/Cargo.toml CHANGELOG.md', { stdio: 'inherit' });
// (si la versión no cambia, el commit solo lleva el CHANGELOG)
execSync(`git commit -m "chore(release): v${nueva}"`, { stdio: 'inherit' });
execSync(`git tag v${nueva}`, { stdio: 'inherit' });
console.log(`\nVersión v${nueva} preparada. Para publicarla: git push --follow-tags`);
