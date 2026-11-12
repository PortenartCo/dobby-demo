/* Additive Famille integration coverage. The existing Courses CI campaign still runs. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync, execFileSync } = require('node:child_process');

const repo = path.resolve(__dirname, '../..');
const outputName = 'essai-dobby-v7-famille-review-20261112';
const sourceTests = [
  ['native-member-policy', ['--test', 'essai-stitch-v5-famille/tests/family-member-policy.test.cjs']],
  ['member-detail', ['essai-stitch-v7/tests/fam-detail.cjs']],
  ['members', ['essai-stitch-v7/tests/fam-members.cjs']],
  ['agenda-memos', ['essai-stitch-v7/tests/fam-agenda-memos.cjs']],
  ['agenda-memos-sync', ['essai-stitch-v7/tests/fam-agenda-memos-sync.cjs']],
  ['agenda-month', ['essai-stitch-v7/tests/fam-agenda-month.cjs']],
  ['effects', ['essai-stitch-v7/tests/family-review-effects.cjs']]
];
const plan = [
  ['build-and-boundary-contracts', ['--test', 'essai-stitch-v7/tests/fam-integration-build.test.cjs', 'essai-stitch-v7/tests/fam-integration-transverse.test.cjs', 'essai-stitch-v7/tests/e09-memo-writer.test.cjs']],
  ...sourceTests,
  ['build-isolated-preview', ['scripts/build-dobby-family-review.cjs', '--output', outputName]],
  ['transverse-preview', ['essai-stitch-v7/tests/fam-integration-transverse.cjs']],
  ['preview-browser-and-reset', ['essai-stitch-v7/tests/fam-integration-preview.cjs']]
];

async function run() {
  const origin = new URL(process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765');
  if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.pathname !== '/' || origin.search || origin.hash) {
    throw Error('DOBBY_TEST_ORIGIN must be a localhost HTTP origin serving this checkout.');
  }
  const evidence = path.resolve(process.env.DOBBY_FAM_CI_EVIDENCE || path.join(repo, 'docs/dobby-v7/evidence/famille-integration-20261112/ci-current'));
  fs.mkdirSync(path.join(evidence, 'logs'), { recursive: true });
  const summary = { version: 1, campaign: 'famille-integration-20261112', startedAt: new Date().toISOString(), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), origin: origin.origin, output: outputName, historicalReuse: false, existingCoursesCampaign: 'Required separately by the unchanged Functional Stitch roots and source fidelity workflow step.', results: [] };
  const write = () => fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify(summary, null, 2) + '\n');
  const env = {
    ...process.env,
    DOBBY_TEST_ORIGIN: origin.origin,
    DOBBY_FAM_EVIDENCE: path.join(evidence, 'family'),
    DOBBY_FAM_INTEGRATION_BASE: origin.origin + '/' + outputName + '/',
    DOBBY_FAM_INTEGRATION_EVIDENCE: path.join(evidence, 'transverse'),
    DOBBY_FAMILY_BASE: origin.origin + '/' + outputName + '/',
    DOBBY_FAMILY_EVIDENCE: path.join(evidence, 'preview'),
    DOBBY_FAMILY_WIDTHS: '320,390,1440',
    FAM01_CAPTURE_BASELINE: '0',
    NODE_PATH: [path.join(__dirname, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter)
  };
  try {
    // Refuse stale servers: browser evidence must exercise the source bytes in this checkout.
    const response = await fetch(origin.origin + '/essai-stitch-v7/family.js');
    if (!response.ok) throw Error('The checkout HTTP server is unavailable: ' + response.status);
    const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
    const served = hash(Buffer.from(await response.arrayBuffer()));
    const local = hash(fs.readFileSync(path.join(repo, 'essai-stitch-v7/family.js')));
    if (served !== local) throw Error('DOBBY_TEST_ORIGIN serves different Family source bytes.');
    summary.servedFamilySha256 = served;
    if (fs.existsSync(path.join(repo, outputName))) throw Error('Famille CI requires a fresh preview output directory: ' + outputName);
    for (const [name, args] of plan) {
      const command = [...args];
      if (name === 'build-isolated-preview' && process.argv.includes('--allow-dirty')) command.push('--allow-dirty');
      console.log('FAM_INTEGRATION_CI_START ' + name);
      const started = Date.now();
      const result = spawnSync(process.execPath, command, { cwd: repo, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
      const log = (result.stdout || '') + (result.stderr || '') + (result.error ? '\n' + result.error.stack + '\n' : '');
      fs.writeFileSync(path.join(evidence, 'logs', name + '.log'), log);
      process.stdout.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      summary.results.push({ name, command: ['node', ...command], exitCode: result.status, signal: result.signal, durationMs: Date.now() - started, log: 'logs/' + name + '.log' });
      write();
      if (result.error || result.status !== 0) throw Error('Famille integration check failed: ' + name);
      console.log('FAM_INTEGRATION_CI_PASS ' + name);
    }
    summary.passed = true;
    console.log('FAM_INTEGRATION_CI_PASS all ' + summary.results.length + ' current-checkout checks');
  } catch (error) {
    summary.passed = false;
    summary.error = error.message;
    throw error;
  } finally {
    summary.completedAt = new Date().toISOString();
    write();
  }
}

module.exports = { plan, run };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
