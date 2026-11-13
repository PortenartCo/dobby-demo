/* A fresh register build must preserve the Menu revision and every other template. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const repo = path.resolve(__dirname, '../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('a fresh register generation keeps the six-card canonical Menu and all other sources', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'dobby-menu-build-'));
  const root = path.join(temporary, 'essai-stitch-v7');
  const routes = require('../register-routes.json');
  function copy(relative) {
    const destination = path.join(temporary, relative);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(path.join(repo, relative), destination);
  }
  try {
    for (const file of ['build-register.cjs', 'register-routes.json', 'menu-layout.html', 'route-manifest.json', 'assets/remaining/provenance.json']) copy('essai-stitch-v7/' + file);
    for (const route of routes) copy(`design/stitch-53/${route.id}/code.html`);
    execFileSync(process.execPath, [path.join(root, 'build-register.cjs')]);
    const layout = fs.readFileSync(path.join(root, 'menu-layout.html'));
    assert.deepEqual(fs.readFileSync(path.join(root, 'templates/remaining/menu.html')), layout, 'Rebuilding must retain the reviewed Menu');
    assert.equal((layout.toString().match(/class="module-item /g) || []).length, 6);
    for (const route of routes.filter(route => route.view !== 'menu')) {
      const relative = `essai-stitch-v7/templates/remaining/${route.view}.html`;
      assert.equal(sha(fs.readFileSync(path.join(temporary, relative))), sha(fs.readFileSync(path.join(repo, relative))), route.view + ' remains byte-identical');
    }
    const provenance = JSON.parse(fs.readFileSync(path.join(root, 'templates/remaining/provenance.json')));
    const menu = provenance.find(row => row.view === 'menu');
    assert.equal(menu.layout?.source, 'essai-stitch-v7/menu-layout.html', 'The canonical override must be discoverable in provenance');
    assert.equal(menu.layout.sha256, sha(layout));
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'route-manifest.json')));
    assert.equal(manifest.screens.length, 53, 'No invented original screen');
    assert.equal(provenance.length, routes.length, 'Settings reuses the Menu source');
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
});
