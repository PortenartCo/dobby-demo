import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync}from'node:child_process';
const cfg=JSON.parse(fs.readFileSync(new URL('../../design/e06/references/scoring/dobby-e06-scoring-v1.json',import.meta.url))),url=new URL('../onboarding-scoring.mjs',import.meta.url),api=fs.existsSync(url)?await import(url):null;
test('E06 JavaScript matches every Python base/optional combination and supplied QA result',()=>{
 assert.ok(api,'The E06 scoring implementation exists');const S=api.createScoring(cfg);
 const program=`import importlib.util,itertools,json,sys\nsys.dont_write_bytecode=True\ns=importlib.util.spec_from_file_location('ref','design/e06/references/scoring/validate.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nassert m.evaluate()==json.load(open('design/e06/references/scoring/qa-results.json'))\nfor kind,size,fn in [('house',6,m.house_result),('patronus',5,m.patronus_result)]:\n for picks in itertools.product(range(4),repeat=size):\n  for extra in [None,0,1,2,3]:\n   print(json.dumps([kind,picks,extra,fn(picks,extra)],ensure_ascii=False))`;
 const rows=execFileSync('python3',['-c',program],{cwd:new URL('../..',import.meta.url),encoding:'utf8',maxBuffer:15*1024*1024}).trim().split('\n');assert.equal(rows.length,25600);
 const found={house:new Set(),patronus:new Set()};for(const line of rows){const[kind,indices,extra,expected]=JSON.parse(line),questions=cfg[kind].questions,ids=indices.map((v,i)=>questions[i].answers[v].id),optional=extra===null?undefined:questions[indices.length].answers[extra].id;const result=S[kind](ids,optional);assert.deepEqual(result,expected,JSON.stringify({kind,ids,optional}));if(result.result)found[kind].add(S.catalogueId(kind,result.result));}
 assert.equal(found.house.size,4);assert.equal(found.patronus.size,12);assert.equal(S.version,'e06-v1');
});
test('E06 validates stable answer IDs and does not use optional answers that were never asked',()=>{
 assert.ok(api,'The E06 scoring implementation exists');const S=api.createScoring(cfg);assert.throws(()=>S.house(['A']),/réponses/i);assert.throws(()=>S.patronus(['A','A','A','A','?']),/réponse/i);assert.throws(()=>S.catalogueId('house','unknown'),/résultat/i);
 const picks=['A','A','A','A','A','A'];assert.equal(S.house(picks).needs_extra,false);for(const extra of ['A','B','C','D'])assert.deepEqual(S.house(picks,extra),S.house(picks));assert.equal(S.patronus(['A','A','A','A','A']).result,undefined);
});
