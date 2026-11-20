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
const maison = require('./fixtures/maison-source-extensions.json');
const readiness = require('./fixtures/pr15-native-readiness-source-extensions.json');
const composition = require('./fixtures/maison-pr15-source-composition.json');
const archives = require('./fixtures/archives-main16-source-extensions.json');
const finalArchives = require('./fixtures/archives-final-source-extensions.json');
const runesLot1 = require('./fixtures/runes-lot1-source-extensions.json');
const runesLot2 = require('./fixtures/runes-lot2-source-extensions.json');
const catalogueLot3 = require('./fixtures/catalogue-lot3-source-extensions.json');
const ingredientsLot4 = require('./fixtures/ingredients-lot4-source-extensions.json');
const healthIntegration = require('./fixtures/health-integration-source-extensions.json');
const {beforeReviewedAmendment}=require('./helpers/reviewed-source.cjs');
const beforeRunesLot1=(file,source)=>beforeReviewedAmendment(file,source,runesLot1.files[file],'Runes lot 1');
const beforeRunesLot2=(file,source)=>beforeReviewedAmendment(file,source,runesLot2.files[file],'Runes lot 2');
const beforeCatalogueLot3=(file,source)=>beforeReviewedAmendment(file,source,catalogueLot3.files[file],'Catalogue lot 3');
const readWorkingSource=file=>fs.readFileSync(path.join(repo,file),'utf8').replace(/\r\n/g,'\n');
const beforeIngredientsLot4=(file,source)=>beforeReviewedAmendment(file,source,ingredientsLot4.files[file],'Ingrédients lot 4');
const beforeHealth=(file,source)=>beforeReviewedAmendment(file,source,healthIntegration.files[file],'Santé');
const rawContextSource=file=>beforeIngredientsLot4(file,beforeHealth(file,readWorkingSource(file)));
const rawReviewedSource=file=>beforeCatalogueLot3(file,rawContextSource(file));
function reviewedSource(file){return beforeRunesLot1(file,beforeRunesLot2(file,rawReviewedSource(file)));}
test('Health amendments preserve the existing native source history',()=>{
  assert.equal(healthIntegration.baseCommit,'02ebb9fe5c85ab886680d3d8da9afa1d271462e1');
  assert.deepEqual(Object.keys(healthIntegration.files),[
    'essai-stitch-v5-famille/family-access.mjs','essai-stitch-v5-famille/family-files.js','essai-stitch-v5-famille/family-modules.js',
    'essai-stitch-v5-famille/family-v2.js','essai-stitch-v5-famille/index.html','essai-stitch-v5-famille/stitch-v5.js',
    'essai-stitch-v7/build-source.cjs','essai-stitch-v7/chat-engine.js','essai-stitch-v7/chat.js','essai-stitch-v7/family-engine.js','essai-stitch-v7/family.js'
  ]);
  for(const file of Object.keys(healthIntegration.files)){
    const current=readWorkingSource(file),previous=beforeHealth(file,current);
    assert.notEqual(previous,current);
    assert.throws(()=>beforeHealth(file,current+'/* changed */'),/complete Santé source changed/);
    assert.throws(()=>beforeHealth(file,previous),/complete Santé source changed/);
  }
});
test('ingredient search preserves the exact catalogue writer before it adds standalone cooking',()=>{
  assert.equal(ingredientsLot4.baseCommit,'e4388442253788e04afd92ee9f099ec67dec81df');
  const file='essai-stitch-v7/cuisine-engine.js';
  assert.deepEqual(Object.keys(ingredientsLot4.files),[file]);
  const current=readWorkingSource(file);
  assert.throws(()=>beforeIngredientsLot4(file,current+'/* changed */'),/complete Ingrédients lot 4 source changed/);
  assert.notEqual(beforeIngredientsLot4(file,current),current);
});
test('Catalogue amendments retain all three exact historical sources',()=>{
  assert.equal(catalogueLot3.baseCommit,'bf3936e9301a8cf25bc76ba781b691b87f341457');
  assert.deepEqual(Object.keys(catalogueLot3.files),['essai-stitch-v5-famille/family-modules.js','essai-stitch-v5-famille/index.html','essai-stitch-v7/cuisine-engine.js']);
  for(const file of Object.keys(catalogueLot3.files)){
    const current=rawContextSource(file);
    assert.throws(()=>beforeCatalogueLot3(file,current+'/* changed */'),/complete Catalogue lot 3 source changed/);
    assert.notEqual(beforeCatalogueLot3(file,current),current);
  }
});
test('the four Lot 2 amendments preserve the exact Lot 1 source history',()=>{
  assert.equal(runesLot2.baseCommit,'c4005809680d8533e1496ff08bef1747400fa741');
  assert.deepEqual(Object.keys(runesLot2.files).sort(),[
   'family-missions-core.mjs','family-mission-intents.mjs','family-missions.js','family-modules.js'
  ].map(file=>'essai-stitch-v5-famille/'+file).sort());
  for(const file of Object.keys(runesLot2.files)){
    const current=rawReviewedSource(file);
    assert.throws(()=>beforeRunesLot2(file,current+'/* changed */'),/complete Runes lot 2 source changed/);
    assert.notEqual(beforeRunesLot2(file,current),current);
  }
});
test('the six reviewed Runes lot 1 amendments preserve the complete historical source chain',()=>{
  assert.equal(runesLot1.baseCommit,'424ae01815b7392dff1b3e5da9c51f4a734b4140');
  assert.deepEqual(Object.keys(runesLot1.files).sort(),[
    'essai-stitch-v5-famille/family-v2.js','essai-stitch-v5-famille/family-mission-intents.mjs',
    'essai-stitch-v5-famille/family-missions.js','essai-stitch-v5-famille/family-modules.js',
    'essai-stitch-v5-famille/family-runes-core.mjs','essai-stitch-v7/family.js'
  ].sort());
  for(const [file,extension] of Object.entries(runesLot1.files)){
    const current=beforeRunesLot2(file,rawReviewedSource(file));
    const parent=beforeRunesLot1(file,current);
    assert.notEqual(extension.beforeSha256,extension.afterSha256);
    assert.throws(()=>beforeRunesLot1(file,current+'/* unreviewed byte */'),/complete Runes lot 1 source changed/);
    assert.throws(()=>beforeRunesLot1(file,parent),/complete Runes lot 1 source changed/);
  }
});
const beforeFinal=(file,source)=>beforeArchives(file,source,finalArchives.files[file]||null);
function beforeArchives(file,source,extension=archives.files[file]){
  if(!extension)return source;
  assert.equal(digest(source),extension.afterSha256,file+' current reviewed source changed');
  for(const patch of [...extension.patches].reverse()){
    assert.notEqual(patch.after,patch.before,file+' archive amendment changes an exact literal');
    assert.equal(source.split(patch.after).length-1,patch.occurrences||1,file+' exact archive amendment occurs once');
    source=source.replaceAll(patch.after,()=>patch.before);
  }
  assert.equal(digest(source),extension.beforeSha256,file+' Archives reversal restores its complete parent');
  return source;
}
function readReviewed(file){return beforeArchives(file,beforeFinal(file,beforeConsolidation(file,reviewedSource(file),'Archives')));}
const contacts = require('./fixtures/contacts-source-extensions.json');
function beforeContacts(file,source){
  const extension=contacts.files[file];if(!extension)return source;
  source=beforeConsolidation(file,source,'Contacts');
  assert.equal(digest(source),extension.afterSha256,file+' complete Contacts source changed: current reviewed source changed');
  source=reverseLiterals(file,source,extension.patches);
  assert.equal(digest(source),extension.beforeSha256,file+' Contacts reversal retains the full published parent');
  return source;
}
const consolidation=require('./fixtures/consolidation-source-composition.json');
function beforeConsolidation(file,source,parent){
  const entry=consolidation.files[file];if(!entry)return source;
  assert.equal(digest(source),entry.currentSha256,file+' complete consolidation source changed: current reviewed source changed');
  source=reverseLiterals(file,source,entry['from'+parent]);
  assert.equal(digest(source),entry[parent.toLowerCase()+'Sha256'],file+' exact '+parent+' parent recovered');
  return source;
}
for(const[file,hash]of Object.entries(consolidation.frozenFixtures))assert.equal(digest(fs.readFileSync(path.join(__dirname,'fixtures',file))),hash,'Frozen independent source proof retained: '+file);

function reverseLiterals(file,source,patches){
  for(const patch of [...patches].reverse()){
    assert.notEqual(patch.after,patch.before,patch.label+' is an exact source amendment');
    assert.equal(source.split(patch.after).length-1,1,patch.label+' occurs exactly once in '+file);
    source=source.replace(patch.after,()=>patch.before);
  }
  return source;
}
function compositionParents(file,source){
  const proof=composition.files[file];if(!proof)return null;
  const house=maison.files[file],ready=readiness.files[file];
  assert.equal(digest(source),proof.mergedSha256,file+' complete Maison source changed: current reviewed source changed');
  assert.equal(proof.baseSha256,reconciliation.files[file].mergedSha256,file+' composition retains the frozen PR11 parent');
  assert.equal(proof.maisonSha256,house.afterSha256,file+' composition retains the frozen Maison parent');
  assert.equal(proof.readinessSha256,ready.afterSha256,file+' composition retains the frozen readiness parent');
  assert.equal(house.beforeSha256,proof.baseSha256,file+' Maison retains the common parent');
  assert.equal(ready.beforeSha256,proof.baseSha256,file+' readiness retains the common parent');
  const withoutMaison=reverseLiterals(file,source,house.patches),withoutReadiness=reverseLiterals(file,source,proof.readinessPatches);
  assert.equal(digest(withoutMaison),proof.readinessSha256,file+' removing Maison recovers the complete PR15 artifact');
  assert.equal(digest(withoutReadiness),proof.maisonSha256,file+' removing PR15 recovers the complete Maison artifact');
  const first=reverseLiterals(file,withoutMaison,proof.readinessPatches),second=reverseLiterals(file,withoutReadiness,house.patches);
  assert.equal(first,second,file+' both exact inversion orders recover identical source bytes');
  assert.equal(digest(first),proof.baseSha256,file+' removing both amendments recovers the complete PR11 artifact');
  return{withoutMaison,withoutReadiness};
}
function beforeMaison(file,source){
  const amendment=maison.files[file];if(!amendment)return source;
  const parents=compositionParents(file,source);if(parents)source=parents.withoutReadiness;
  assert.equal(digest(source),amendment.afterSha256,file+' complete Maison source changed');
  source=reverseLiterals(file,source,amendment.patches);
  assert.equal(digest(source),amendment.beforeSha256,file+' Maison reversal preserves the complete published-main source');
  return source;
}
function currentFingerprint(file,source,review,composed,extension=readiness.files[file]){
  const previous=composed?composed.mergedSha256:review.sha256;
  if(extension){
    assert.ok(composed,file+' readiness extension requires the frozen reconciliation');
    assert.equal(extension.beforeSha256,previous,file+' readiness extension preserves its exact parent');
  }
  const expected=extension?extension.afterSha256:previous;
  assert.match(expected,/^[a-f0-9]{64}$/,file+' complete approved SHA-256');
  const parents=compositionParents(file,source),normalized=parents?parents.withoutMaison:beforeMaison(file,source);
  assert.equal(digest(normalized),expected,file+' current reviewed source changed');
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
    let source=readReviewed(file);
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
    currentFingerprint(file,readReviewed(file),review,reconciliation.files[file]);
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
    currentFingerprint(file,readReviewed(file),null,record);
  }
});

test('a tampered reconciliation fingerprint cannot fall back to a valid older review',()=>{
  const file='essai-stitch-v5-famille/family-files.js';
  const source=readReviewed(file);
  const review=require('./fixtures/revue-generale-source-extensions.json')[file];
  assert.equal(digest(source),review.sha256,'The unchanged Contracts writer is a valid older review');
  assert.throws(()=>currentFingerprint(file,source,review,{...reconciliation.files[file],mergedSha256:'0'.repeat(64)}),/current reviewed source changed/);
});

test('Maison source amendments preserve every frozen published-main fingerprint and reject unrelated byte edits',()=>{
  const reviews=require('./fixtures/revue-generale-source-extensions.json');
  assert.equal(maison.baseCommit,'25dd637c1b827bd09a46d8a55be63d9c14966f19');
  assert.equal(composition.baseCommit,maison.baseCommit);
  assert.equal(composition.maisonParent,'98f6bc953e7434184c759e0a812b72a4745bc4e3');
  assert.equal(composition.readinessParent,'2584a8955bac1358d08a8f59070179aa5d624071');
  assert.deepEqual(Object.keys(composition.files),['essai-stitch-v5-famille/family-modules.js'],'Only the independently changed module source requires composition');
  assert.deepEqual(Object.keys(composition.frozenFixtures).sort(),[
    'essai-stitch-v7/tests/fixtures/maison-source-extensions.json',
    'essai-stitch-v7/tests/fixtures/pr15-native-readiness-source-extensions.json',
    'essai-stitch-v7/tests/fixtures/reconciliation-main-43eef-source-extensions.json'
  ].sort(),'Both outer parent manifests and their common reconciliation remain required');
  for(const[file,expected]of Object.entries(composition.frozenFixtures))assert.equal(digest(fs.readFileSync(path.join(repo,file))),expected,file+' frozen parent fixture remains byte-exact');
  assert.equal(maison.frozenParentFixture.file,'essai-stitch-v7/tests/fixtures/reconciliation-main-43eef-source-extensions.json');
  assert.equal(digest(fs.readFileSync(path.join(repo,maison.frozenParentFixture.file))),maison.frozenParentFixture.sha256,'The complete reconciliation parent fixture remains frozen');
  assert.deepEqual(Object.keys(maison.files).sort(),['essai-stitch-v5-famille/family-modules.js','essai-stitch-v5-famille/stitch-v5.js','essai-stitch-v7/build-source.cjs','essai-stitch-v7/family.js'].sort(),'Only the four reviewed Maison integration surfaces are normalized');
  for(const[file,amendment]of Object.entries(maison.files)){
    const expected=reconciliation.files[file]?.mergedSha256||reviews[file]?.sha256;
    assert.equal(amendment.beforeSha256,expected,file+' retains its exact published parent proof');
    assert.ok(amendment.reason);assert.ok(amendment.patches.length);assert.ok(amendment.tests.length);
    for(const check of amendment.tests)assert.ok(fs.existsSync(path.join(repo,check)),check+' remains available');
    const source=readReviewed(file);
    assert.equal(digest(beforeMaison(file,source)),expected,file+' exact literals recover the full immutable parent');
    assert.throws(()=>beforeMaison(file,source+'\n// Unreviewed byte change\n'),/complete (Maison|Contacts) source changed/);
    assert.throws(()=>currentFingerprint(file,source,reviews[file],{mergedSha256:'0'.repeat(64)}),/current reviewed source changed|preserves its exact parent/,'Maison normalization never bypasses a failed parent fingerprint');
    const parents=compositionParents(file,source);
    if(parents)for(const parent of [parents.withoutMaison,parents.withoutReadiness])assert.throws(()=>currentFingerprint(file,parent,reviews[file],reconciliation.files[file]),/current reviewed source changed/,'Neither valid earlier branch artifact can replace the current composed source');
  }
});

test('Contacts controller amendments recover the exact parent and reject unrelated source changes',()=>{
  assert.equal(contacts.baseCommit,'521c9199ac18cb71b2fbbd2717ded2f7781aa4db');
  assert.deepEqual(Object.keys(contacts.files),['essai-stitch-v7/family.js']);
  for(const[file,extension]of Object.entries(contacts.files)){
    assert.equal(extension.beforeSha256,maison.files[file].afterSha256,'Existing Maison source fingerprint stays frozen');
    for(const check of extension.tests)assert.ok(fs.existsSync(path.join(repo,check)),check);
    const current=reviewedSource(file),parent=beforeContacts(file,current);
    assert.equal(digest(parent),extension.beforeSha256);
    assert.throws(()=>beforeContacts(file,current+'\n// unrelated byte'),/current reviewed source changed/);
    assert.throws(()=>beforeContacts(file,parent),/current reviewed source changed/,'An earlier valid source cannot replace the current Contacts implementation');
  }
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
    const source=readReviewed(file);
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
  const source = readReviewed('essai-stitch-v7/family-engine.js');
  const start = source.indexOf(' // Shared memos use the native state/save pipeline');
  const end = source.indexOf(' return Object.freeze(', start);
  assert.ok(start > -1 && end > start, 'Shared native memo writer remains identifiable');
  assert.equal(digest(source.slice(start, end)), require('./fixtures/revue-generale-source-extensions.json').memoWriter.sha256);
});

test('Archives amendments reverse exactly to current main and reject altered bytes or parent hashes',()=>{
  assert.equal(archives.baseCommit,'a4190bb3b1b2fd95995e33dbce09ffb31c77614c');
  assert.equal(Object.keys(archives.files).length,7);
  for(const[file,expected]of Object.entries(archives.frozenParentFixtures))assert.equal(digest(fs.readFileSync(path.join(repo,file))),expected,file+' frozen earlier Archives proof');
  for(const [file,extension]of Object.entries(archives.files)){
    const source=beforeFinal(file,beforeConsolidation(file,reviewedSource(file),'Archives'));
    const previous=beforeArchives(file,source);
    assert.equal(digest(previous),extension.beforeSha256);
    assert.throws(()=>beforeArchives(file,source+'\n/* unreviewed byte */'),/current reviewed source changed/);
    assert.throws(()=>beforeArchives(file,source,{...extension,beforeSha256:'0'.repeat(64)}),/restores its complete parent/);
    assert.throws(()=>beforeArchives(file,source,{...extension,afterSha256:'0'.repeat(64)}),/current reviewed source changed/);
  }
});

module.exports = { preserved };

test('final native archive guards preserve every byte of the reviewed PR17 parent',()=>{
 for(const [file,expected]of Object.entries(finalArchives.frozenParentFixtures))assert.equal(digest(fs.readFileSync(path.join(repo,file))),expected);
 for(const [file,extension]of Object.entries(finalArchives.files)){const source=beforeConsolidation(file,reviewedSource(file),'Archives');assert.equal(digest(beforeFinal(file,source)),extension.beforeSha256);assert.throws(()=>beforeFinal(file,source+'/* changed */'),/current reviewed source changed/);}
});
