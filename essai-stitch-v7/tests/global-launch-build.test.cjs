'use strict';

const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repo = path.resolve(__dirname, '../..');
const builder = path.join(repo, 'scripts/build-dobby-global-review.cjs');
const server = path.join(repo, 'scripts/serve-dobby-global-demo.cjs');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function build(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dobby-global-launch-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const bundle = path.join(temp, 'bundle');
  const result = spawnSync(process.execPath, [builder, '--scenario', 'launch', '--output', bundle, '--allow-dirty'], { cwd: repo, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return { temp, bundle };
}

test('le scénario launch ajoute ses ressources à un bundle tracé et neutralise les accès réels et PWA', t => {
  const { bundle } = build(t);
  const manifest = JSON.parse(fs.readFileSync(path.join(bundle, 'review-manifest.json'), 'utf8'));
  assert.equal(manifest.scenario, 'launch');
  assert.equal(manifest.realBackend, false);
  const files = new Map(manifest.files.map(entry => [entry.path, entry]));
  for (const file of ['global-roles.js', 'global-lifecycle.js', 'launch-scenario.js', 'global-controls.js', 'global-controls.css', 'demo-data-manifest.json']) {
    assert.equal(files.get(file)?.sha256, sha256(fs.readFileSync(path.join(bundle, file))), file);
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(bundle, 'demo-data-manifest.json'), 'utf8')),
    require(path.join(repo, 'scripts/review/global-scenario.js')));
  assert.match(fs.readFileSync(path.join(bundle, 'launch-scenario.js'), 'utf8'), /window\.DobbyGlobalLaunch = true/);
  const liveConfig = fs.readFileSync(path.join(repo, 'essai-stitch-v7/access-config.js'), 'utf8');
  const demoConfig = fs.readFileSync(path.join(bundle, 'essai-stitch-v7/access-config.js'), 'utf8');
  for (const liveValue of liveConfig.matchAll(/(?:projectRef|publicKey): '([^']+)'/g)) {
    assert.ok(!demoConfig.includes(liveValue[1]));
  }
  assert.equal(files.get('essai-stitch-v7/access-config.js').sourceSha256, sha256(liveConfig));
  const engine = fs.readFileSync(path.join(bundle, 'essai-stitch-v5-famille/index.html'), 'utf8');
  assert.ok(engine.includes('if(window.DobbyReview&&!window.DobbyGlobalLaunch)return{demo:true,actorId:'),
    'Le scénario launch doit utiliser le contexte membre natif.');
  const transport = fs.readFileSync(path.join(bundle, 'essai-stitch-v5-famille/family-v2.js'), 'utf8');
  const liveProject = liveConfig.match(/projectRef: '([^']+)'/)?.[1];
  assert.ok(liveProject && !transport.includes(liveProject), 'Le projet réel est absent du transport launch.');
  assert.ok(transport.includes('repaintQueued = false;\n    if(window.DobbyGlobalDemo.resetPending())return;'),
    'Une peinture différée du moteur ne doit pas reprendre une écriture pendant la réinitialisation.');
  assert.ok(![...files.keys()].some(file => /(?:manifest\.webmanifest|(?:^|\/)pwa-[^/]+|\/assets\/pwa\/)/.test(file)));
  for (const file of ['index.html', 'traverse.html', 'missions.html', 'famille.html']) {
    const html = fs.readFileSync(path.join(bundle, 'essai-stitch-v7', file), 'utf8');
    const scripts = ['launch-scenario.js', 'review-config.js', 'review-runtime.js', 'global-roles.js', 'global-lifecycle.js', 'global-demo.js', 'global-controls.js'];
    const positions = scripts.map(script => html.indexOf(script));
    assert.ok(positions.every((position, index) => position !== -1 && (index === 0 || position > positions[index - 1])), file);
    assert.match(html, /data-global-engine-src=/);
    assert.doesNotMatch(html, /webmanifest|pwa-install|apple-touch-icon|apple-mobile-web-app/);
  }
  const repeated = spawnSync(process.execPath, [builder, '--scenario', 'launch', '--output', bundle, '--allow-dirty'], { cwd: repo, encoding: 'utf8' });
  assert.notEqual(repeated.status, 0);
  assert.match(repeated.stderr, /Output must be a new directory/);
});

test('le serveur loopback ne sert que le bundle launch et applique les barrières HTTP', async t => {
  const { temp, bundle } = build(t);
  fs.writeFileSync(path.join(bundle, 'unlisted.txt'), 'test fixture');
  const outside = path.join(temp, 'outside.txt');
  fs.writeFileSync(outside, 'test fixture outside');
  fs.unlinkSync(path.join(bundle, 'global-controls.css'));
  fs.symlinkSync(outside, path.join(bundle, 'global-controls.css'));
  assert.ok(fs.existsSync(server), 'Le serveur local isolé du scénario launch doit exister.');
  const child = spawn(process.execPath, [server, '--bundle', bundle, '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', bytes => { stderr += bytes; });
  const base = await new Promise((resolve, reject) => {
    child.stdout.setEncoding('utf8').on('data', bytes => {
      const match = bytes.match(/GLOBAL_DEMO_LOCAL (http:\/\/127\.0\.0\.1:\d+\/)/);
      if (match) resolve(new URL(match[1]));
    });
    child.once('error', reject);
    child.once('exit', code => reject(Error(`Serveur launch arrêté (${code}) ${stderr}`)));
  });
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.equal(response.headers.get('permissions-policy'), 'microphone=()');
  const csp = response.headers.get('content-security-policy');
  for (const directive of ["connect-src 'self'", "form-action 'none'", "base-uri 'none'", "object-src 'none'", "manifest-src 'none'", "frame-ancestors 'self'"]) {
    assert.ok(csp.includes(directive), directive);
  }
  for (const file of ['outside.txt', 'unlisted.txt', 'essai-stitch-v7/', 'pwa-sw.js', 'global-controls.css']) {
    assert.equal((await fetch(new URL(file, base))).status, 404, file);
  }
  const headerOnly = await fetch(base, { method: 'HEAD' });
  assert.equal(headerOnly.status, 200);
  assert.equal(await headerOnly.text(), '');
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.ok((await fetch(new URL('global-demo.js', base), { headers: { 'Service-Worker': 'script' } })).status >= 400);
});
