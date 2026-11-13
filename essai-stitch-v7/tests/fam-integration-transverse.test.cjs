/* Global source boundary with explicit, tested PREP-01 extension points. No Git history needed in CI. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const reconciliation = require('./fixtures/reconciliation-main-43eef-source-extensions.json');
const readiness = require('./fixtures/pr15-native-readiness-source-extensions.json');
function currentFingerprint(file,source,review,composed,extension=readiness.files[file]){
  const previous=composed?composed.mergedSha256:review.sha256;
  if(extension){
    assert.ok(composed,file+' readiness extension requires the frozen reconciliation');
    assert.equal(extension.beforeSha256,previous,file+' readiness extension preserves its exact parent');
  }
  const expected=extension?extension.afterSha256:previous;
  assert.match(expected,/^[a-f0-9]{64}$/,file+' complete approved SHA-256');
  assert.equal(digest(source),expected,file+' current reviewed source changed');
}
const preserved = {
  'essai-stitch-v7/chat-engine.js': 'ba84ce331c50e308dd57fe00155dd0fdff881d247bc1bbacac8ff518d2bab2bd',
  'essai-stitch-v7/chat.js': 'ada18c51fbf9c03327269aafd767c79463545562fc7514b608f3eb7814360485',
  'essai-stitch-v7/cuisine-engine.js': '4eb0ec960701457c64fe26d4f802a195619af99bc6be827723a4fb639b2b5044',
  'essai-stitch-v7/cuisine-e07.js': 'f99698719062154405d2bb03528c65b76cf73ddb4bb2b5ddeecc7c31684cab9b',
  'essai-stitch-v5-famille/family-v2.js': '72367aeb8b763502538e590de442d1d1271869dee2c632574f35a074f7cfff63',
  'essai-stitch-v5-famille/family-core.mjs': '97d441e7ab9d661f609988915a6a31ef116cef916005f156b7698ce5a0b49a24',
  'essai-stitch-v5-famille/family-missions.js': '33a48e99ab18f99ee9648f3594bf4fbf79c855401f4710911a16d5e931744349',
  'essai-stitch-v5-famille/family-runes-core.mjs': '5f90167122a88042b35846ee6887de115724ac3c45938434f1aca06cf47cbf7c',
  'scripts/review/global-demo.js': '914fe8109f1505a27dc449b99dbc59c80d6e800b08f400c01aa38dbe7d783303',
  'scripts/review/global-config.js': '082f0feff1f36159d00e85aaede40aab76aef62afa28b2703d3205950ebd38c3',
  'scripts/review/review-runtime.js': 'ecef2aa48f35a98bcc44ae4af6413e06bd701e7874e5f84c21b42a1b4aa13748',
  'essai-stitch-v7/tests/helpers/e02-shared-groceries.cjs': '4c599d0a9f09ac72c4cb04777091dd3559ede85498a858226a03774317bda4ef'
};

test('Family source boundaries preserve history plus reviewed general and family-core amendments', () => {
  const reviews=require('./fixtures/revue-generale-source-extensions.json');
  const socle=require('./fixtures/family-socle-source-extensions.json');
  for(const [file,amendment]of Object.entries(socle.files)){
    assert.ok(Object.hasOwn(preserved,file),file+' is an existing source boundary');
    assert.ok(amendment.reason,file+' records the family-core amendment');
    const composed=reconciliation.files[file];
    assert.ok(composed,file+' records both published-main and reserves parents');
    assert.equal(amendment.reviewSha256,reconciliation.mainReviewAnchors[file],file+' preserves the published-main review anchor');
    assert.equal(amendment.sha256,composed.publishedMainSha256,file+' preserves the complete published-main source');
    assert.equal(reviews[file]?.sha256,composed.reservesSha256,file+' preserves the complete reserves review anchor');
    assert.ok(amendment.tests.length,file+' records targeted semantic checks');
    for(const check of amendment.tests)assert.ok(fs.existsSync(path.join(repo,check)),check+' remains available');
  }
  for (const [file, expected] of Object.entries(preserved)) {
    let source=fs.readFileSync(path.join(repo,file),'utf8').replace(/\r\n/g,'\n');
    const review=reviews[file],amendment=socle.files[file],composed=reconciliation.files[file];
    if(composed){currentFingerprint(file,source,review,composed);continue;}
    if(amendment){assert.equal(digest(source),amendment.sha256,file+' family-core amendment changed');continue;}
    if(review){assert.ok(review.reason);assert.equal(digest(source),review.sha256,file+' reviewed amendment changed');continue;}
    if(file.endsWith('/family-v2.js')){
      const amendment=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/stitch19-20-access-extensions.json'),'utf8'));
      assert.equal(amendment.file,file);
      for(const patch of amendment.patches){
        assert.equal(source.split(patch.after).length-1,1,patch.label+' has exactly one bounded native extension');
        source=source.replace(patch.after,patch.before);
      }
      source=source.replace(/    async importRows\([\s\S]*?(?=    resolve: choose, sync)/,'');
    }
    assert.equal(digest(source), expected, file + ' differs from latest global review 6a6fcd9');
  }
});

test('every reviewed whole-file amendment retains its exact source fingerprint', () => {
  const reviews=require('./fixtures/revue-generale-source-extensions.json');
  for(const[file,review]of Object.entries(reviews)){
    if(file==='memoWriter')continue; // Its exact bounded writer has its own proof below.
    assert.ok(review.reason,file+' approval reason');
    assert.match(review.sha256,/^[a-f0-9]{64}$/,file+' complete SHA-256');
    currentFingerprint(file,fs.readFileSync(path.join(repo,file),'utf8').replace(/\r\n/g,'\n'),review,reconciliation.files[file]);
  }
});

test('published-main reconciliation preserves both parent manifests and every full current source',()=>{
  const reviews=require('./fixtures/revue-generale-source-extensions.json');
  assert.equal(reconciliation.reservesParent,'709c6f1057d70f90f76489014687022f4d56f086');
  assert.equal(reconciliation.publishedMainParent,'43eef7a57a56fe352f88902dfe89b208a4036495');
  assert.deepEqual(Object.keys(reconciliation.frozenFixtures).sort(),[
    'essai-stitch-v5-famille/tests/fixtures/contracts-native-extensions.json',
    'essai-stitch-v5-famille/tests/fixtures/contracts-reserves-native-composition.json',
    'essai-stitch-v5-famille/tests/fixtures/reserves-canonical-role-native-extensions.json',
    'essai-stitch-v7/tests/fixtures/family-socle-source-extensions.json',
    'essai-stitch-v7/tests/fixtures/revue-generale-source-extensions.json'
  ].sort(),'Every frozen parent fixture remains required');
  assert.deepEqual(Object.keys(reconciliation.files).sort(),[
    'essai-stitch-v5-famille/family-access.mjs',
    'essai-stitch-v5-famille/family-core.mjs',
    'essai-stitch-v5-famille/family-files.js',
    'essai-stitch-v5-famille/family-member-policy.js',
    'essai-stitch-v5-famille/family-mission-intents.mjs',
    'essai-stitch-v5-famille/family-missions-core.mjs',
    'essai-stitch-v5-famille/family-missions.js',
    'essai-stitch-v5-famille/family-modules.js',
    'essai-stitch-v5-famille/family-runes-core.mjs',
    'essai-stitch-v5-famille/family-v2.js'
  ].sort(),'Every composed source remains required');
  for(const[file,expected]of Object.entries(reconciliation.frozenFixtures)){
    assert.equal(digest(fs.readFileSync(path.join(repo,file))),expected,file+' frozen parent fixture changed');
  }
  for(const[file,record]of Object.entries(reconciliation.files)){
    for(const key of ['reservesSha256','publishedMainSha256'])if(record[key]!==null)assert.match(record[key],/^[a-f0-9]{64}$/,file+' exact parent '+key);
    assert.equal(record.reservesSha256===null,file==='essai-stitch-v5-famille/family-mission-intents.mjs',file+' records parent absence only for the newly introduced module');
    assert.notEqual(record.publishedMainSha256,null,file+' exists in published main');
    if(reviews[file])assert.equal(record.reservesSha256,reviews[file].sha256,file+' preserves its exact reserves parent review');
    assert.ok(record.reason,file+' composition reason');
    assert.ok(record.tests.length,file+' targeted semantic checks');
    for(const check of record.tests)assert.ok(fs.existsSync(path.join(repo,check)),check+' remains available');
    currentFingerprint(file,fs.readFileSync(path.join(repo,file),'utf8').replace(/\r\n/g,'\n'),null,record);
  }
});

test('a tampered reconciliation fingerprint cannot fall back to a valid older review',()=>{
  const file='essai-stitch-v5-famille/family-files.js';
  const source=fs.readFileSync(path.join(repo,file),'utf8').replace(/\r\n/g,'\n');
  const review=require('./fixtures/revue-generale-source-extensions.json')[file];
  assert.equal(digest(source),review.sha256,'The unchanged Contracts writer is a valid older review');
  assert.throws(()=>currentFingerprint(file,source,review,{...reconciliation.files[file],mergedSha256:'0'.repeat(64)}),/current reviewed source changed/);
});

test('native readiness amendments preserve the frozen reconciliation and pin exactly two complete sources',()=>{
  assert.equal(readiness.baseCommit,'25dd637c1b827bd09a46d8a55be63d9c14966f19');
  assert.equal(readiness.parentManifest.path,'essai-stitch-v7/tests/fixtures/reconciliation-main-43eef-source-extensions.json');
  assert.equal(digest(fs.readFileSync(path.join(repo,readiness.parentManifest.path))),readiness.parentManifest.sha256,'Frozen PR11 reconciliation remains byte-exact');
  assert.deepEqual(Object.keys(readiness.files).sort(),[
    'essai-stitch-v5-famille/family-modules.js',
    'essai-stitch-v5-famille/family-v2.js'
  ],'Only the reviewed access/bootstrap and module restoration sources are extended');
  for(const[file,extension]of Object.entries(readiness.files)){
    assert.equal(extension.beforeSha256,reconciliation.files[file].mergedSha256,file+' retains its complete PR11 parent');
    assert.notEqual(extension.afterSha256,extension.beforeSha256,file+' records a real source amendment');
    assert.ok(extension.reason,file+' explains the reviewed amendment');
    assert.ok(extension.tests.length,file+' records targeted semantic checks');
    for(const check of extension.tests)assert.ok(fs.existsSync(path.join(repo,check)),check+' remains available');
    const source=fs.readFileSync(path.join(repo,file),'utf8').replace(/\r\n/g,'\n');
    currentFingerprint(file,source,null,reconciliation.files[file]);
    assert.throws(()=>currentFingerprint(file,source+'\n/* unreviewed source byte */',null,reconciliation.files[file]),/current reviewed source changed/);
    assert.throws(()=>currentFingerprint(file,source,null,reconciliation.files[file],{...extension,afterSha256:'0'.repeat(64)}),/current reviewed source changed/);
    assert.throws(()=>currentFingerprint(file,source,null,reconciliation.files[file],{...extension,beforeSha256:'0'.repeat(64)}),/preserves its exact parent/);
  }
});

test('a readiness extension cannot fall back to valid frozen-parent bytes',()=>{
  const file='essai-stitch-v5-famille/family-v2.js',previous='fixture: reviewed PR11 source',next='fixture: reviewed PR15 source';
  const review={sha256:digest(previous)},composed={mergedSha256:digest(previous)},extension={beforeSha256:digest(previous),afterSha256:digest(next)};
  currentFingerprint(file,next,review,composed,extension);
  assert.throws(()=>currentFingerprint(file,previous,review,composed,extension),/current reviewed source changed/,'A matching older review never rescues a failed current fingerprint');
});

// Courses intentionally evolves for C01-C07 and independent dessert imports.
// Verify native quantity/home/import/idempotence behavior, rather than freezing old UI bytes.
test('Courses retains the native shopping contract including independent dessert import', () => {
  const result=require('node:child_process').spawnSync(process.execPath,['--test','essai-stitch-v7/tests/e07-p02-model.test.cjs','essai-stitch-v7/tests/e07-p02-home-core.test.mjs'],{cwd:repo,encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
});

test('all four functional roots still load the native shared Courses adapter before E02', () => {
  for (const file of ['index.html', 'traverse.html', 'missions.html', 'famille.html']) {
    const html = fs.readFileSync(path.join(repo, 'essai-stitch-v7', file), 'utf8');
    const at = script => html.indexOf('src="./' + script);
    assert.ok(at('cuisine-list.js') > -1, file + ' includes shared Courses');
    assert.ok(at('family-engine.js') > -1, file + ' includes native Family facade');
    assert.ok(at('chat-engine.js') > at('cuisine-list.js'), file + ' binds chat after Courses');
    assert.ok(at('chat.js') > at('chat-engine.js'), file + ' binds chat after its facade');
    assert.ok(at('family.js') > at('family-engine.js'), file + ' binds Family after its native facade');
  }
});

test('E09 memo writer retains identity/stale/import tests with the explicit child-write amendment', () => {
  const source = fs.readFileSync(path.join(repo, 'essai-stitch-v7/family-engine.js'), 'utf8').replace(/\r\n/g,'\n');
  const start = source.indexOf(' // Shared memos use the native state/save pipeline');
  const end = source.indexOf(' return Object.freeze(', start);
  assert.ok(start > -1 && end > start, 'Shared native memo writer remains identifiable');
  assert.equal(digest(source.slice(start, end)), require('./fixtures/revue-generale-source-extensions.json').memoWriter.sha256);
});

module.exports = { preserved };
