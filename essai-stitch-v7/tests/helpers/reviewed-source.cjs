'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const digest=value=>createHash('sha256').update(value).digest('hex');

function beforeReviewedAmendment(file,source,extension,label){
  if(!extension)return source;
  assert.equal(digest(source),extension.afterSha256,file+' complete '+label+' source changed');
  const lines=source.match(/[^\n]*\n|[^\n]+$/g)||[];
  for(const patch of [...extension.patches].reverse()){
    const expected=patch.after.match(/[^\n]*\n|[^\n]+$/g)||[];
    const old=patch.before.match(/[^\n]*\n|[^\n]+$/g)||[];
    assert.notEqual(patch.before,patch.after,file+' records a real amendment');
    assert.deepEqual(lines.slice(patch.line,patch.line+expected.length),expected,file+' exact '+label+' amendment');
    lines.splice(patch.line,expected.length,...old);
  }
  const parent=lines.join('');
  assert.equal(digest(parent),extension.beforeSha256,file+' exact parent recovered before '+label);
  return parent;
}
module.exports={beforeReviewedAmendment};
