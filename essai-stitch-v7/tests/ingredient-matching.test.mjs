import test from 'node:test';
import assert from 'node:assert/strict';
import {basicIngredients,buildIngredientIndex,findRecipes,ingredientMatches,normalizeIngredient} from '../ingredient-matching.mjs';

const row=name=>[name,1,'g'];
const make=(id,ingredients,other={})=>({id,name:id,servings:4,minutes:25,ingredients:ingredients.map(name=>typeof name==='string'?row(name):name),steps:['Mélanger.'],...other});
const data=(recipes,ids=[],tmAdaptations={})=>({recipes,customIds:ids,state:{tmAdaptations}});
const ids=rows=>rows.map(row=>row.id);
const traits=(ingredients)=>({ingredientTraits:ingredients.map(([canonicalId,optional])=>({canonicalId,optional}))});

test('four basiques, synonyms and subsets, optional groups, one and two misses, no fake substitutions',()=>{
 assert.deepEqual(basicIngredients,['eau','sel','poivre','huile']);
 assert.equal(normalizeIngredient('ŒUFS'), 'oeufs');
 const dishes=[
  make('Omelette',['Œufs','Fromage','Sel fin','Eau','Poivre moulu','Huile végétale']),
  make('Finition',['Œuf','Huile de sésame'],{importDetails:traits([[null,false],['huile',false]])}),
  make('Lait et beurre',['Lait','Beurre','Œuf']),
  make('Trois manques',['Farine','Cumin','Sucre','Œuf']),
  make('Décoration',['Œuf','Basilic'],{importDetails:traits([[null,false],[null,true]])}),
  make('Doublons',['Courgettes','Courgette','Œuf']),
  make('Lait végétal',['Lait d’avoine','Œuf'])
 ];
 const index=buildIngredientIndex(data(dishes)),omelette=findRecipes(index,['oeuf','fromage','courgette','tomate','pomme de terre','lait']).ready.find(row=>row.id==='Omelette');
 assert.ok(omelette);
 assert.deepEqual(omelette.used.map(x=>x.key),['oeuf','fromage','sel','eau','poivre','huile']);
 const match=findRecipes(index,['oeuf']);
 assert.deepEqual(ids(match.ready),['Décoration']);
 assert.deepEqual(new Map(match.almost.map(row=>[row.id,row.missing.map(x=>x.key)])),
   new Map([['Doublons',['courgette']],['Finition',['huile de sesame']],['Lait végétal',['lait d avoine']],['Omelette',['fromage']],['Lait et beurre',['lait','beurre']]]));
 assert.equal(ingredientMatches(index.options.find(item=>item.key==='oeuf'),'œufs'),true);
});

test('only complete structured ingredient identities participate and removed records stay out',()=>{
 const index=buildIngredientIndex(data([
  make('missing',[['Œuf',null,'pièce']]),
  make('uncertain',['Œuf'],{importDetails:{uncertain:['Ingrédients illisibles']}}),
  make('retired',['Œuf'],{removedAt:'2026-11-20'}),
  make('archived',['Œuf'],{archive:{version:1,archivedAt:'2026-11-20'}}),
  make('pure text',[],{ingredients:'Œufs et farine'}),
  make('complete',['Œuf'],{importDetails:traits([[null,false]])}),
  make('incomplete steps',['Œuf'],{steps:[],servings:null})
 ]));
 const found=findRecipes(index,['oeuf']);
 assert.deepEqual(ids(found.ready),['complete','incomplete steps']);
 assert.deepEqual(found.ready[1].modes,[]);
 assert.equal(found.ready[1].canPlan,false);
});

test('sources and all refinement filters, stable diversification, no reward for using all selected ingredients',()=>{
 const fixtures=[
  make('A peu d’ingrédients',['Œuf'],{catalogue:{collection:'classic',course:'main',difficulty:'facile'},minutes:10}),
  make('B plat',['Œuf','Courgette','Tomate'],{catalogue:{collection:'classic',course:'main',difficulty:'facile'},minutes:20}),
  make('C entrée',['Œuf','Tomate'],{catalogue:{collection:'diet',course:'starter',difficulty:'intermediaire'},minutes:45}),
  make('D dessert',['Œuf'],{catalogue:{collection:'classic',course:'dessert',difficulty:'avancee'},minutes:65}),
  make('Recette du foyer',['Œuf','Courgette'],{minutes:20,category:'Plat'}),
  make('Incomplète',['Œuf'],{minutes:null,category:'Desserts'})
 ];
 const index=buildIngredientIndex(data(fixtures,['Recette du foyer','Incomplète'],{'Recette du foyer':{steps:[{text:'Mélanger dans le bol.'}]}})),
 available=['oeuf','courgette','tomate'];
 const all=findRecipes(index,available);
 assert.equal(all.ready.length,6);
 assert.equal(all.ready[0].id,fixtures[0].id);
 assert.ok(new Set(all.ready.slice(0,3).map(row=>row.course)).size>=2);
 assert.deepEqual(ids(findRecipes(index,[...available].reverse()).ready),ids(all.ready));
 assert.deepEqual(ids(findRecipes(index,available,{collection:'diet',course:'starter',maxMinutes:60,mode:'classic'}).ready),[fixtures[2].id]);
 assert.deepEqual(ids(findRecipes(index,available,{personal:true,mode:'tm5',maxMinutes:30}).ready),['Recette du foyer']);
 assert.ok(!findRecipes(index,available,{maxMinutes:90}).ready.some(r=>r.id==='Incomplète'));
});
