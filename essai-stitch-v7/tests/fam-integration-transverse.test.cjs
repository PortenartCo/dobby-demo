/* Global source boundary with explicit, tested PREP-01 extension points. No Git history needed in CI. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
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

test('Family source boundaries preserve history plus explicitly reviewed 60-point amendments', () => {
  for (const [file, expected] of Object.entries(preserved)) {
    let source=fs.readFileSync(path.join(repo,file),'utf8').replace(/\r\n/g,'\n');
    const review=require('./fixtures/revue-generale-source-extensions.json')[file];
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
