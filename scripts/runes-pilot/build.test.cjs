const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {build, transformMissions, transformMissionActions} = require('../build-dobby-runes-pilot.cjs');

const repo = path.resolve(__dirname, '../..');
const sourceSha = '0a8e1ed674bc4abdbfaca29435fa495b19b32df4';
const testedSha = '3ceb14bbf76c7534f6862a7cb1921c894ea3f325';
const project = 'https://pqcdkrwljgvgagzwrcmg.supabase.co';
const nativeModules = 'essai-stitch-v5-famille/family-modules.js';
const nativeActions = 'essai-stitch-v5-famille/family-missions.js';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = (root, file) => fs.readFileSync(path.join(root, file));
const text = (root, file) => read(root, file).toString();

function filesUnder(root) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      if (['node_modules', 'tests', '.git'].includes(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else files.push(path.relative(root, file).split(path.sep).join('/'));
    }
  }
  walk(root);
  return files.sort();
}

test('pilot packaging preserves native sources and exports a reproducible, guarded real-backend bundle', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dobby-runes-pilot-build-'));
  t.after(() => fs.rmSync(temp, {recursive:true, force:true}));
  const output = path.join(temp, 'first'), secondOutput = path.join(temp, 'second');
  const nativeFiles = ['essai-stitch-v7', 'essai-stitch-v5-famille', 'essai-v6-preview/assets']
    .flatMap(dir => filesUnder(path.join(repo, dir)).map(file => dir + '/' + file)).sort();
  const originalHashes = new Map(nativeFiles.map(file => [file, sha(read(repo, file))]));
  const manifest = build({output, sourceSha});

  await t.test('every source and output hash matches its actual bytes; only HTML and two copied guards transform', () => {
    assert.equal(manifest.sourceSha, sourceSha);
    assert.equal(manifest.clientSourceSha, sourceSha);
    assert.equal(manifest.previouslyTestedCode, testedSha);
    assert.equal(manifest.realBackendEnabled, true);
    assert.equal(manifest.realBackendVerified, false);
    assert.equal(manifest.storage, 'native-existing-keys-no-reset-no-seed');
    assert.deepEqual(manifest.files.map(row => row.path).sort(), nativeFiles);
    for (const row of manifest.files) {
      const source = read(repo, row.path), result = read(output, row.path);
      assert.equal(sha(source), originalHashes.get(row.path), row.path + ': native source was modified by build');
      assert.equal(row.sourceSha256, originalHashes.get(row.path), row.path + ': source provenance');
      assert.equal(row.sha256, sha(result), row.path + ': output provenance');
      assert.equal(row.transformed, !source.equals(result), row.path + ': actual transformation flag');
      if (!row.path.endsWith('.html') && ![nativeModules, nativeActions].includes(row.path)) {
        assert.deepEqual(result, source, row.path + ': native module or asset must remain byte-identical');
      }
    }
    assert.equal(text(output, nativeModules), transformMissions(text(repo, nativeModules)));
    assert.equal(text(output, nativeActions), transformMissionActions(text(repo, nativeActions)));
    new vm.Script(text(output, nativeModules), {filename:nativeModules});
    new vm.Script(text(output, nativeActions), {filename:nativeActions});
    for (const file of [nativeModules, nativeActions, 'essai-stitch-v5-famille/family-v2.js', 'essai-stitch-v5-famille/family-runes-core.mjs', 'essai-stitch-v5-famille/family-missions-core.mjs', 'essai-stitch-v7/data/onboarding-scoring-v1.json']) {
      const committed = execFileSync('git', ['show', sourceSha + ':' + file], {cwd:repo});
      assert.deepEqual(read(repo, file), committed, file + ': canonical input remains at the approved source commit');
    }
  });

  await t.test('every complete HTML document loads the pilot guard first and permits only the intended Supabase connection', () => {
    for (const row of manifest.files.filter(row => row.path.endsWith('.html'))) {
      const source = text(repo, row.path), html = text(output, row.path);
      assert.doesNotMatch(html, /<link\b[^>]*href=["']https?:/i, row.path + ': external styles are removed');
      if (!/<head\b/i.test(source)) continue;
      const policies = [...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/g)];
      assert.equal(policies.length, 1, row.path + ': one explicit CSP');
      const directives = policies[0][1].split(';').map(value => value.trim());
      assert.equal(directives.find(value => value.startsWith('connect-src ')), "connect-src 'self' " + project);
      assert.ok(directives.includes("object-src 'none'"));
      const scripts = [...html.matchAll(/<script\b[^>]*(?:src=["']([^"']+)["'])?[^>]*>/gi)];
      assert.ok(scripts.length > 0, row.path + ': guard loaded');
      const firstTag = scripts[0][0], runtime = /\bsrc=["']([^"']+)["']/.exec(firstTag)?.[1];
      assert.ok(runtime, row.path + ': first script is external pilot guard');
      assert.equal(path.resolve(path.dirname(path.join(output, row.path)), runtime), path.join(output, 'pilot-runtime.js'));
      assert.equal(html.match(/src=["'][^"']*pilot-runtime\.js["']/g)?.length, 1, row.path + ': guard included once');
      assert.doesNotMatch(html, /src=["'][^"']*review-(?:runtime|config)\.js["']/i, row.path + ': no demo runtime');
    }
    assert.equal(manifest.entry, 'essai-stitch-v7/traverse.html');
    assert.match(text(output, 'index.html'), /url=\.\/essai-stitch-v7\/traverse\.html/);
    assert.ok(fs.existsSync(path.join(output, manifest.entry)));
    assert.equal(read(output, '.nojekyll').length, 0);
  });

  await t.test('the runtime retains native storage, has no demo/reset transport, and adds no embedded credentials', () => {
    const runtime = read(output, 'pilot-runtime.js');
    assert.deepEqual(runtime, read(repo, 'scripts/runes-pilot/pilot-runtime.js'));
    assert.equal(sha(runtime), manifest.runtimeSha256);
    assert.match(runtime.toString(), /requireMissionsV2:true/);
    assert.doesNotMatch(runtime.toString(), /localStorage|sessionStorage|indexedDB|DobbyReview|window\.fetch\s*=|XMLHttpRequest|deleteDatabase|\.reset\s*\(/);
    assert.match(text(output, 'essai-stitch-v5-famille/family-v2.js'), /const PROJECT = 'https:\/\/pqcdkrwljgvgagzwrcmg\.supabase\.co'/);
    assert.match(text(output, 'essai-stitch-v5-famille/family-v2.js'), /const DB_NAME = 'dobby-v5-household-preview-v2'/);
    assert.match(text(output, 'essai-stitch-v5-famille/index.html'), /const key='dobby-v5-familial-preview-20261108'/);
    for (const file of filesUnder(output)) {
      assert.ok(!/(?:^|\/)review-(?:runtime|config)\.js$/.test(file), file + ': no demo support file');
      if (!/\.(?:html|js|mjs|cjs|json|css|txt|md|webmanifest)$/.test(file)) continue;
      // Only report the filename if a credential-shaped value is ever found.
      const embeddedCredential = /sb_(?:secret|publishable)_[A-Za-z0-9_-]{15,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text(output, file));
      assert.equal(embeddedCredential, false, file + ': unexpected embedded credential-shaped value');
    }
  });

  await t.test('repeated packaging differs only in declared source metadata and never overwrites an existing output', () => {
    const second = build({output:secondOutput, sourceSha:testedSha});
    const {sourceSha:ignoredFirstSha, sourceDirty:ignoredFirstDirty, ...stableFirst} = manifest;
    const {sourceSha:ignoredSecondSha, sourceDirty:ignoredSecondDirty, ...stableSecond} = second;
    assert.deepEqual(stableSecond, stableFirst);
    assert.deepEqual(filesUnder(secondOutput), filesUnder(output));
    for (const file of filesUnder(output)) {
      if (file !== 'pilot-manifest.json') assert.equal(sha(read(secondOutput, file)), sha(read(output, file)), file + ': deterministic bytes');
    }
    const before = sha(read(output, 'pilot-manifest.json'));
    assert.throws(() => build({output, sourceSha}), /Output must be a new directory/);
    assert.equal(sha(read(output, 'pilot-manifest.json')), before);
    for (const file of nativeFiles) assert.equal(sha(read(repo, file)), originalHashes.get(file), file + ': original native bytes preserved after both builds');
  });
});

test('source anchor changes stop packaging transforms instead of silently omitting protection', () => {
  const modules = text(repo, nativeModules), actions = text(repo, nativeActions);
  assert.throws(() => transformMissions(modules.replace('function assertLocalRewardSharing(){', 'function changedRewardGuard(){')), /Native pilot anchor changed/);
  assert.throws(() => transformMissions(modules + '\nfunction assertLocalRewardSharing(){if(runesV2Available())return;'), /Native pilot anchor changed/);
  assert.throws(() => transformMissionActions(actions.replace('function requiresSync(){', 'function changedSyncRequirement(){')), /Native pilot anchor changed/);
});
