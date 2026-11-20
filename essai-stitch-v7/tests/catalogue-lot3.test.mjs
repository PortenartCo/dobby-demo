import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,readFile,writeFile,rm,mkdir,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildCatalogue,writeCatalogue,catalogueReviewSample} from '../build-recipe-catalogue.mjs';
import {externalPrompt,normalizePayload,maxRecipeImages} from '../recipe-import-format.mjs';
import {readRecipeZip} from '../recipe-import-zip.mjs';

test('audit and compiler check every indexed classic and TM5 image, with exact batch evidence',async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'dobby-catalogue-'));
 try{
  const fixture=resolve('docs/dobby-v7/catalogue-lot3/fixture-zip.py');
  const paths=Object.fromEntries(['six','classic','diet','duplicate','missing','shared','renamed-copy'].map(id=>{
   const path=join(tmp,id+'.zip');execFileSync('python3',[fixture,path,id]);return [id,path];
  }));
  const {images,jsonText}=await readRecipeZip(await readFile(paths.six));
  assert.equal(images.size,7);
  assert.deepEqual(normalizePayload(jsonText,{images}).entries[0].errors,[]);
  const twelve=await readRecipeZip(await readFile(paths.diet));
  assert.equal(twelve.images.size,13);
  assert.deepEqual(normalizePayload(twelve.jsonText,{images:twelve.images}).entries[0].errors,[]);
  const audit=await buildCatalogue([paths.classic,paths.diet,paths.six]);
  assert.deepEqual(audit.report.decisions.map(item=>[item.status,item.media.length]),[['PASS',9],['PASS',13],['PASS',7]]);
  assert.ok(audit.report.decisions.every(item=>item.media.every(media=>media.webpBytes<=128*1024&&media.webpSha256.length===64)));
  assert.equal(audit.report.sizes.covers,3);assert.equal(audit.report.sizes.steps,26);
  assert.ok(audit.report.sizes.webpBytes<audit.report.sizes.originalBytes);
  assert.equal(audit.report.batches[0].review.status,'SKIP');
  assert.equal(audit.report.quotaStatus,'FAIL');
  assert.equal(audit.report.ready,false);
  await assert.rejects(writeCatalogue(join(tmp,'invalid'),audit),/quotas incomplets/);
  const bad=await buildCatalogue([paths.six,paths.duplicate,paths.missing,paths.shared,paths['renamed-copy']]);
  assert.deepEqual(bad.report.decisions.map(item=>item.status),['PASS','FAIL','FAIL','FAIL','FAIL']);
  assert.ok(bad.report.decisions[1].errors.some(error=>error.includes('Doublon')));
  assert.ok(bad.report.decisions[2].errors.some(error=>error.includes('étape 6')));
  assert.ok(bad.report.decisions[3].errors.some(error=>error.includes('fichier réutilisé')));
  // No editorial or dietary attestations are created for fictional data.
  const dietKey=audit.report.batches[1].sha256;
  const review=await buildCatalogue([paths.diet],{batches:{[dietKey]:{}}});
  assert.match(review.report.batches[0].review.gaps.join(' '),/diététique privé/);
  const accepted=await buildCatalogue([paths.classic,paths.diet,paths.six],{},{fixture:true});
  assert.ok(accepted.report.batches.every(batch=>batch.review.status==='SKIP'));
  assert.equal(accepted.recipes[0].catalogueTM5.verified,false);
  assert.equal(accepted.recipes[0].catalogueTM5.stepDetails.length,2);
  assert.equal(accepted.assets.size,29);
  const out=process.env.DOBBY_CATALOGUE_FIXTURE||join(tmp,'catalogue');
  await writeCatalogue(out,accepted);
  const js=await readFile(join(out,'recipes.js'),'utf8');
  assert.match(js,/TEST — Catalogue classic/);
  assert.doesNotMatch(js,/FIXTURE|dietReviewed/);
  const evidence=process.env.DOBBY_CATALOGUE_EVIDENCE;
  if(evidence){
   await mkdir(evidence,{recursive:true});
   await writeFile(join(evidence,'audit-medias-fictifs.json'),JSON.stringify(accepted.report,null,2)+'\n');
   await writeFile(join(evidence,'audit-rejets-fictifs.json'),JSON.stringify(bad.report,null,2)+'\n');
  }
  const transport=process.env.DOBBY_CATALOGUE_FIXTURE;
  if(transport)for(const key of ['six','diet','classic']){
   await copyFile(paths[key],transport+'/'+key+'.zip');
  }
 }finally{await rm(tmp,{recursive:true,force:true});}
});

test('prompt requests one media per displayed step; V2 legacy ingredients remain compatible',()=>{
 assert.equal(maxRecipeImages,161);
 assert.match(externalPrompt,/une image distincte pour chaque étape affichée/);
 assert.match(externalPrompt,/N’invente aucun ingrédient/);
 assert.match(externalPrompt,/illustration-IA/);
 assert.doesNotMatch(externalPrompt,/2 à 5 illustrations/);
 const row=normalizePayload({format:'dobby-recipes',version:2,recipes:[{ingredients:[{name:'Riz',canonicalId:'riz',optional:true}]}]}).entries[0];
 assert.deepEqual(row.details.ingredientTraits,[{canonicalId:'riz',optional:true}]);
});

test('review sampling is deterministic, stratified, and limited outside the pilot',()=>{
 const group=(collection,course,count)=>Array.from({length:count},(_,i)=>({
  key:collection+course+i,collection,course,fingerprint:String(i).padStart(2,'0')
 }));
 const rows=[...group('classic','main',25),...group('diet','main',12),...group('classic','dessert',2)];
 const expected=catalogueReviewSample(rows);
 assert.equal(expected.length,6);
 assert.deepEqual([...catalogueReviewSample([...rows].reverse())].sort(),[...expected].sort());
 assert.equal(catalogueReviewSample(rows.slice(0,5)).length,5);
});
