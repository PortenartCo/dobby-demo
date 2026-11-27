/* Stamp the worker with the content fingerprint of its exact offline inventory. */
'use strict';
const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const shell = require('../essai-stitch-v7/pwa-shell.js');

const root = resolve(__dirname, '..');
const workerPath = resolve(root, 'pwa-sw.js');
const versionLine = /^const VERSION = '[a-z0-9-]+';$/m;
const worker = readFileSync(workerPath, 'utf8');
if (!versionLine.test(worker)) throw Error('Version déclarative introuvable dans pwa-sw.js');

const hash = createHash('sha256');
function include(name, content) {
  hash.update(`${name}\0${content.length}\0`);
  hash.update(content);
}
include('pwa-sw.js', Buffer.from(worker.replace(versionLine, "const VERSION = '';")));
const assets = [...new Set(shell.map(url => url.split('?')[0]))].sort();
for (const asset of ['essai-stitch-v7/pwa-shell.js', ...assets]) {
  include(asset, readFileSync(resolve(root, asset)));
}
const version = hash.digest('hex').slice(0, 24);
const updated = worker.replace(versionLine, `const VERSION = '${version}';`);

if (process.argv.includes('--check')) {
  if (updated !== worker) {
    console.error('Le cache DOBBY V7 est à régénérer via node scripts/build-dobby-v7-pwa.cjs');
    process.exitCode = 1;
  }
} else if (updated !== worker) {
  writeFileSync(workerPath, updated);
}
