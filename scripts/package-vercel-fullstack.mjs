import fs from 'node:fs';
import path from 'node:path';
import './package-vercel-frontend.mjs';
const files = JSON.parse(fs.readFileSync('.vercel/frontend-upload.json', 'utf8'))
  .filter(f => f.file !== 'api-unavailable.json');
const configFile = files.find(f => f.file === 'vercel.json');
const config = JSON.parse(configFile.data);
config.installCommand = 'npm ci';
config.regions = ['icn1'];
config.functions = { 'api/index.ts': { maxDuration: 60 } };
config.routes = config.routes.map(r => r.src === '/api(?:/.*)?'
  ? { src: '/api/(.*)', dest: '/api/index' } : r);
configFile.data = JSON.stringify(config);
function add(file) {
  files.push({ file: file.replaceAll('\\', '/'), data: fs.readFileSync(file, 'utf8') });
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx|json)$/.test(file)) add(file);
  }
}
for (const dir of ['api', 'src/worker', 'src/shared']) walk(dir);
for (const file of ['package.json', 'package-lock.json', 'tsconfig.json']) add(file);
const data = JSON.stringify(files);
if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(data)) throw new Error('Secret in upload');
fs.writeFileSync('.vercel/fullstack-upload.json', data);
console.log(JSON.stringify({ files: files.length, characters: data.length, chunks: Math.ceil(data.length / 24000) }));
