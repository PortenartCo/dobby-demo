/* Native Stitch19/20 additions. Historical and PREP-01 campaigns run separately. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync, execFileSync} = require('node:child_process');

const repo = path.resolve(__dirname, '../..');
const plan = [
  ['access-routing', ['--test', 'essai-stitch-v7/tests/access-flow.test.mjs']],
  ['canonical-root-entry', ['essai-stitch-v7/tests/stitch-root-entry.cjs']],
  ['access-ui', ['essai-stitch-v7/tests/stitch-access-ui.cjs']],
  ['access-account-races', ['essai-stitch-v7/tests/stitch-access-races.cjs']],
  ['native-ceremony-dialogs', ['essai-stitch-v7/tests/e06-ceremonies-ui.cjs']],
  ['portrait-assets-and-renderers', ['essai-stitch-v7/tests/stitch19-20-portraits.cjs']],
  ['responsive-wheel-touch-and-keyboard', ['essai-stitch-v7/tests/stitch-responsive.cjs']],
  ['entry-ritual', ['essai-stitch-v7/tests/stitch-entry-ritual.cjs']]
];
const sourceFiles = [
  'index.html',
  'essai-stitch-v5-famille/family-access.mjs',
  'essai-stitch-v5-famille/family-v2.js',
  'essai-stitch-v5-famille/family-modules.js',
  'essai-stitch-v5-famille/family-profile.js',
  'essai-stitch-v7/access-config.js',
  'essai-stitch-v7/access-entry.js',
  'essai-stitch-v7/access-flow.mjs',
  'essai-stitch-v7/access.js',
  'essai-stitch-v7/access.css',
  'essai-stitch-v7/family-engine.js',
  'essai-stitch-v7/family.js',
  'essai-stitch-v7/ceremonies.js',
  'essai-stitch-v7/ceremonies.css',
  'essai-stitch-v7/responsive.css',
  'essai-stitch-v7/ritual.js',
  'essai-stitch-v7/ritual.css',
  'essai-stitch-v7/famille.html',
  'essai-stitch-v7/traverse.html',
  'essai-stitch-v7/assets/magic/portraits-09-24.png'
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fingerprint = () => Object.fromEntries(sourceFiles.map(file => [file, hash(fs.readFileSync(path.join(repo, file)))]));

async function run() {
  const origin = new URL(process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765');
  if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.pathname !== '/' || origin.search || origin.hash) {
    throw Error('DOBBY_TEST_ORIGIN must be a localhost HTTP origin serving this checkout.');
  }
  const evidence = path.resolve(process.env.DOBBY_STITCH1920_EVIDENCE || path.join(repo, 'docs/dobby-v7/evidence/stitch19-20/ci-current'));
  fs.mkdirSync(path.join(evidence, 'logs'), {recursive: true});
  const before = fingerprint();
  const summary = {
    version: 1,
    campaign: 'stitch19-20-native',
    startedAt: new Date().toISOString(),
    sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repo, encoding: 'utf8'}).trim(),
    dirtyCheckout: Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {cwd: repo, encoding: 'utf8'}).trim()),
    origin: origin.origin,
    sourceSha256: before,
    liveBackendVerified: false,
    realAccountsVerified: false,
    authOutcomes: 'Declared local fixtures; no remote signup, session mutation or invitation certification.',
    separateRequiredCampaigns: ['Native/offline unit contracts', 'E06 scoring and identity units', 'Full historical source/browser campaign', 'PREP-01 native writers and browser journeys'],
    results: []
  };
  const write = () => fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify(summary, null, 2) + '\n');
  const env = {
    ...process.env,
    DOBBY_TEST_ORIGIN: origin.origin,
    DOBBY_ACCESS_EVIDENCE: path.join(evidence, 'access'),
    DOBBY_ACCESS_WIDTHS: '320,390,768,1024,1440,1920',
    DOBBY_CEREMONY_EVIDENCE: path.join(evidence, 'ceremonies'),
    DOBBY_RESPONSIVE_EVIDENCE: path.join(evidence, 'responsive'),
    DOBBY_STITCH_RITUAL_EVIDENCE: path.join(evidence, 'ritual'),
    DOBBY_RESPONSIVE_WIDTHS: '320,390,768,1024,1440,1920',
    NODE_PATH: [path.join(__dirname, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter)
  };
  // Every case must run even when the caller previously used a focused filter.
  delete env.DOBBY_ACCESS_CASE_PATTERN;
  try {
    // Refuse a stale HTTP process serving a different checkout or generated HTML.
    for (const file of ['index.html', 'essai-stitch-v7/access.js', 'essai-stitch-v7/famille.html', 'essai-stitch-v5-famille/family-access.mjs']) {
      const response = await fetch(origin.origin + '/' + file);
      if (!response.ok) throw Error('Checkout HTTP source unavailable: ' + file + ' (' + response.status + ')');
      if (hash(Buffer.from(await response.arrayBuffer())) !== before[file]) throw Error('DOBBY_TEST_ORIGIN serves different source bytes: ' + file);
    }
    for (const [name, args] of plan) {
      console.log('STITCH19_20_CI_START ' + name);
      const started = Date.now();
      const result = spawnSync(process.execPath, args, {cwd: repo, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
      fs.writeFileSync(path.join(evidence, 'logs', name + '.log'), (result.stdout || '') + (result.stderr || '') + (result.error ? '\n' + result.error.stack + '\n' : ''));
      process.stdout.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      summary.results.push({name, command: ['node', ...args], exitCode: result.status, signal: result.signal, durationMs: Date.now() - started, log: 'logs/' + name + '.log'});
      write();
      if (result.error || result.status !== 0) throw Error('Stitch19/20 check failed: ' + name);
      console.log('STITCH19_20_CI_PASS ' + name);
    }
    const after = fingerprint();
    for (const file of sourceFiles) if (after[file] !== before[file]) throw Error('Source changed during verification: ' + file);
    summary.passed = true;
    console.log('STITCH19_20_CI_PASS all ' + plan.length + ' native additions; source fingerprints unchanged');
  } catch (error) {
    summary.passed = false;
    summary.error = error.message;
    throw error;
  } finally {
    summary.completedAt = new Date().toISOString();
    write();
  }
}

module.exports = {plan, sourceFiles, run};
if (require.main === module) run().catch(error => {console.error(error); process.exitCode = 1;});
