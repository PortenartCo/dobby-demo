/* Serve a generated launch demonstration from its own loopback origin. */
'use strict';
const { createReadStream, realpathSync, readFileSync, statSync } = require('node:fs');
const { createServer } = require('node:http');
const { extname, join, resolve, sep } = require('node:path');
const { parseArgs } = require('node:util');

const { values } = parseArgs({ options: { bundle: { type: 'string' }, port: { type: 'string', default: '0' } } });
if (!values.bundle) throw Error('Indiquez le dossier du scénario launch avec --bundle.');
const port = Number(values.port);
if (!/^\d+$/.test(values.port) || !Number.isInteger(port) || port > 65535) throw Error('Port loopback invalide.');
const root = realpathSync(resolve(values.bundle));

function resolveFile(name) {
  if (!name || name.includes('\\') || name.includes('\0') || name.split('/').some(part => !part || part === '.' || part === '..')) return null;
  const expected = join(root, name);
  if (!expected.startsWith(root + sep)) return null;
  try {
    if (realpathSync(expected) === expected && statSync(expected).isFile()) return expected;
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
  }
  return null;
}

const manifestFile = resolveFile('review-manifest.json');
if (!manifestFile) throw Error('Manifeste du bundle absent.');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
if (manifest.scenario !== 'launch' || manifest.realBackend !== false || manifest.publication !== 'local-only') {
  throw Error('Ce serveur attend un bundle local généré avec --scenario launch.');
}
const served = new Set(['review-manifest.json', ...manifest.files.map(file => file.path)]);

const csp = [
  "default-src 'self' data: blob:", "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self' data:",
  "connect-src 'self'", "frame-src 'self' blob:", "frame-ancestors 'self'", "object-src 'none'",
  "form-action 'none'", "base-uri 'none'", "manifest-src 'none'", "worker-src 'self' blob:",
].join('; ');
const types = {
  '.css': 'text/css; charset=utf-8', '.gif': 'image/gif', '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg', '.pdf': 'application/pdf', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

const server = createServer((request, response) => {
  response.setHeader('Content-Security-Policy', csp);
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'microphone=()');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (request.headers.host !== `127.0.0.1:${server.address().port}`) return finish(421);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return finish(405);
  }
  if (request.headers['service-worker'] === 'script') return finish(403);

  let pathname;
  try {
    pathname = decodeURIComponent(request.url.split('?')[0]);
  } catch {
    return finish(400);
  }
  if (!pathname.startsWith('/')) return finish(400);
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = served.has(name) && resolveFile(name);
  if (!file) return finish(404);

  response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  if (request.method === 'HEAD') return finish(200);
  const stream = createReadStream(file);
  stream.once('error', () => {
    if (!response.headersSent) finish(404);
    else response.destroy();
  });
  stream.pipe(response);

  function finish(status) {
    response.statusCode = status;
    response.end();
  }
});

server.listen(port, '127.0.0.1', () => console.log(`GLOBAL_DEMO_LOCAL http://127.0.0.1:${server.address().port}/`));
