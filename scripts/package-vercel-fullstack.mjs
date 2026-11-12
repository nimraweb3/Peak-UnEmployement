import fs from 'node:fs';
import { build } from 'esbuild';
import './package-vercel-frontend.mjs';
const files = JSON.parse(fs.readFileSync('.vercel/frontend-upload.json', 'utf8'))
  .filter(f => f.file !== 'api-unavailable.json');
const configFile = files.find(f => f.file === 'vercel.json');
const config = JSON.parse(configFile.data);
for (const file of files) if (file.file !== 'vercel.json') file.file = 'public/' + file.file;
config.outputDirectory = 'public';
config.installCommand = 'npm ci';
config.regions = ['icn1'];
config.functions = { 'api/index.mjs': { maxDuration: 60 } };
config.routes = config.routes.map(r => r.src === '/api(?:/.*)?'
  ? { src: '/api/(.*)', dest: '/api/index' } : r);
configFile.data = JSON.stringify(config);
function add(file) {
  files.push({ file: file.replaceAll('\\', '/'), data: fs.readFileSync(file, 'utf8') });
}
const bundled = await build({ entryPoints: ['api/index.ts'], bundle: true, write: false,
  platform: 'node', format: 'esm', target: 'node24', packages: 'external', jsx: 'automatic' });
files.push({file:'api/index.mjs',data:bundled.outputFiles[0].text});
for (const file of ['package.json', 'package-lock.json']) add(file);
const data = JSON.stringify(files);
if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(data)) throw new Error('Secret in upload');
fs.writeFileSync('.vercel/fullstack-upload.json', data);
console.log(JSON.stringify({ files: files.length, characters: data.length, chunks: Math.ceil(data.length / 24000) }));
