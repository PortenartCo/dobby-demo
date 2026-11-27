'use strict';

const { createServer } = require('node:http');
const { mkdir, readFile, stat } = require('node:fs/promises');
const { extname, resolve, sep } = require('node:path');

const repo = resolve(__dirname, '../../..');
const mount = '/dobby-fixture/';
const workerPath = mount + 'pwa-sw.js';
const shellProbe = 'essai-stitch-v7/stitch-tailwind.css';
const privateBody = 'PWA_PRIVATE_FIXTURE_CONTENT';
const privatePaths = [
  'auth/v1/token',
  'rest/v1/dobby_fixture_memberships',
  'storage/v1/object/sign/documents/fixture-private.pdf',
  'essai-stitch-v7/documents/fixture-private.pdf',
  'essai-stitch-v7/exports/fixture-backup.json',
];

const contentTypes = {
  '.avif': 'image/avif', '.css': 'text/css', '.gif': 'image/gif', '.html': 'text/html',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.json': 'application/json',
  '.mjs': 'text/javascript', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
  '.wav': 'audio/wav', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

async function startServer() {
  const requests = [];
  let version, broken;
  const setRelease = (next, options = {}) => {
    version = String(next);
    broken = options.broken === true;
    requests.length = 0;
  };
  setRelease(1);

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const entry = { method: request.method, path: url.pathname, search: url.search,
      authenticated: !!request.headers.authorization, range: !!request.headers.range, status: null };
    requests.push(entry);
    const send = (status, body, type = 'text/plain', headers = {}) => {
      entry.status = status;
      response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...headers });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (url.pathname === '/outside-pwa-fixture/') return send(200, privateBody);
    if (!url.pathname.startsWith(mount)) return send(404, 'Outside fixture mount');
    try {
      const relativePath = decodeURIComponent(url.pathname.slice(mount.length));
      if (privatePaths.includes(relativePath) || (relativePath === shellProbe &&
        (url.searchParams.has('token') || request.headers.authorization || request.headers.range))) {
        return send(200, privateBody);
      }
      if (relativePath === shellProbe && broken) return send(503, 'PWA fixture interrupted precache');
      const file = resolve(repo, relativePath);
      if (file !== repo && !file.startsWith(repo + sep)) return send(404, 'Outside fixture mount');
      const target = (await stat(file)).isDirectory() ? resolve(file, 'index.html') : file;
      let body = await readFile(target);
      if (url.pathname === workerPath) {
        const pattern = /const VERSION = '[^']+';/;
        const source = body.toString();
        if (!pattern.test(source)) throw Error('The fixture could not identify the production worker version');
        body = source.replace(pattern, `const VERSION = '${version}';`);
      }
      if (relativePath === shellProbe) body = `${body}\n/* PWA_BROWSER_FIXTURE_BUILD_${version} */\n`;
      send(200, body, contentTypes[extname(target)]);
    } catch (error) {
      send(error.code === 'ENOENT' ? 404 : 500, error.code || error.message);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, base: new URL(mount, origin), setRelease, requests,
    close: () => new Promise(resolve => server.close(resolve)) };
}

async function writeEvidence(folder, callback) {
  if (!folder) return;
  await mkdir(folder, { recursive: true });
  await callback(folder);
}

module.exports = { startServer, writeEvidence, workerPath, shellProbe, privatePaths, privateBody };
