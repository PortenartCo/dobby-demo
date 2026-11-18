'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const manifest=require('../fixtures/private-access-source-extensions.json');
const digest=source=>crypto.createHash('sha256').update(source).digest('hex');
const lot4Files=Object.freeze([
 'essai-stitch-v5-famille/family-v2.js',
 'essai-stitch-v5-famille/family-access.mjs',
 'essai-stitch-v7/build-source.cjs',
 'essai-stitch-v7/family.js'
]);
const dependencyOnlyFiles=Object.freeze(['essai-stitch-v5-famille/family-core.mjs']);
const reviewedFiles=Object.freeze([...lot4Files,...dependencyOnlyFiles]);

function reverseExact(file,source,patches,stage){
 assert.ok(Array.isArray(patches),file+' private access '+stage+' patches remain explicit');
 for(const patch of [...patches].reverse()){
  assert.equal(typeof patch.before,'string',file+' private access before literal');
  assert.equal(typeof patch.after,'string',file+' private access after literal');
  assert.ok(patch.after.length,file+' private access nonempty exact literal');
  assert.notEqual(patch.before,patch.after,file+' private access amendment changes an exact literal');
  assert.equal(patch.occurrences,1,file+' private access amendment is unique');
  assert.equal(source.split(patch.after).length-1,1,file+' private access '+stage+' exact amendment occurs once');
  source=source.replace(patch.after,()=>patch.before);
 }
 return source;
}

// Called once on raw current bytes, outside every independent historical
// inversion. A previous valid artifact is never an alternative accepted input.
function beforePrivateAccess(file,source,proof=manifest){
 assert.deepEqual(Object.keys(proof.files).sort(),[...reviewedFiles].sort(),'private access proof retains the closed reviewed-file allowlist');
 if(!reviewedFiles.includes(file))return source;
 const entry=proof.files[file];
 assert.ok(entry&&typeof entry==='object'&&!Array.isArray(entry),file+' private access reviewed entry is required');
 assert.equal(digest(source),entry.currentSha256,file+' private access current reviewed source changed');
 source=reverseExact(file,source,entry.lot4Patches,'Lot4');
 assert.equal(digest(source),entry.lot3Sha256,file+' private access reversal restores the complete mandatory PR31 source');
 source=reverseExact(file,source,entry.dependencyPatches,'dependencies');
 assert.equal(digest(source),entry.publishedSha256,file+' private access reversal restores the complete published V7 parent');
 return source;
}

module.exports={beforePrivateAccess,reviewedFiles,lot4Files,dependencyOnlyFiles};
