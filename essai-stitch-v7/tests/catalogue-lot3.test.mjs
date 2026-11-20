import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildCatalogue,writeCatalogue} from '../build-recipe-catalogue.mjs';
import {externalPrompt,normalizePayload} from '../recipe-import-format.mjs';

test('catalogue gate binds each approved image/recipe, rejects title-only duplicates and requires private diet review',async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'dobby-catalogue-'));
 try {
  const fixture=resolve('docs/dobby-v7/catalogue-lot3/fixture-zip.py');
  const paths=['classic','diet','duplicate'].map(id=>{
   const path=join(tmp,id+'.zip');execFileSync('python3',[fixture,path,id]);return path;
  });
  const originals=paths.slice(0,2),audit=await buildCatalogue(originals);
  assert.equal(audit.report.ready,false);assert.equal(audit.recipes.length,0);
  assert.ok(audit.report.decisions[1].errors.some(e=>e.includes('privée')));
  const reviews=Object.fromEntries(audit.report.decisions.map(({key,fingerprint})=>[key,{fingerprint,editorial:true,rights:true,tm5:true,tm5Date:'2026-11-20'}]));
  const partial=await buildCatalogue(originals,reviews);
  assert.equal(partial.recipes.length,1);
  assert.equal(partial.recipes[0].catalogueTM5.verified,true);
  assert.equal(partial.report.ready,false);
  await assert.rejects(writeCatalogue(join(tmp,'invalid'),partial),/quotas incomplets/);
  reviews['test-diet'].dietReviewed=true;
  const duplicate=await buildCatalogue(paths,reviews);
  assert.ok(duplicate.report.decisions[2].errors.some(e=>e.includes('Doublon')));
  const accepted=await buildCatalogue(originals,reviews,{fixture:true});
  assert.deepEqual(accepted.report.counts,{classic:{starter:0,main:1,dessert:0},diet:{starter:0,main:1,dessert:0}});
  assert.equal(accepted.report.ready,false);
  assert.equal(accepted.recipes[0].catalogueTM5.stepDetails[0].method,'tm5');
  assert.equal(accepted.assets.size,4);
  const out=process.env.DOBBY_CATALOGUE_FIXTURE||join(tmp,'catalogue');
  await writeCatalogue(out,accepted);
  const js=await readFile(join(out,'recipes.js'),'utf8');
  assert.match(js,/TEST — Catalogue classic|TEST — Catalogue diet/);
  assert.doesNotMatch(js,/dietReviewed|tm5Date|fixture-[0-9a-f]{64}/);
 }finally{await rm(tmp,{recursive:true,force:true});}
});

test('import prompt requests the real cover and two to five intermediate illustrations, without inventing transcription',()=>{
 assert.match(externalPrompt,/une image principale et 2 à 5 illustrations/);
 assert.match(externalPrompt,/N’invente aucun ingrédient/);
 assert.match(externalPrompt,/illustration-IA/);
 const row=normalizePayload({format:'dobby-recipes',version:2,recipes:[{ingredients:[{name:'Riz',canonicalId:'riz',optional:true}]}]}).entries[0];
 assert.deepEqual(row.details.ingredientTraits,[{canonicalId:'riz',optional:true}]);
});
