import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '..');

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const version = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

function bumpFile(relPath, regex) {
  const fullPath = path.join(REPO_DIR, relPath);
  if (!fs.existsSync(fullPath)) return 0;
  const before = fs.readFileSync(fullPath, 'utf8');
  let count = 0;
  const after = before.replace(regex, (_, base, quote) => {
    count++;
    return `${base}?v=${version}${quote}`;
  });
  if (count > 0) fs.writeFileSync(fullPath, after, 'utf8');
  return count;
}

const cssJsCount = bumpFile(
  'index.html',
  /((?:href|src)="\/assets\/(?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?(")/g
);
const brandJsonCount = bumpFile(
  'assets/js/brand.js',
  /(\/assets\/data\/[^"'`?]+\.json)(?:\?v=[^"'`]*)?(["'`])/g
);
const searchJsonCount = bumpFile(
  'assets/js/search.js',
  /(\/assets\/data\/[^"'`?]+\.json)(?:\?v=[^"'`]*)?(["'`])/g
);

console.log(`✓ Caché invalidado -> ?v=${version} (${cssJsCount} CSS/JS en index.html, ${brandJsonCount + searchJsonCount} JSON en brand.js/search.js)`);

if (!process.argv.includes('--no-reload')) {
  try {
    execSync('pm2 reload tecnografic-web', { stdio: 'inherit' });
    console.log('✓ PM2 recargado: tecnografic-web');
  } catch (_) {
    console.log('ℹ PM2 no detectado o proceso no activo en esta máquina.');
  }
}
