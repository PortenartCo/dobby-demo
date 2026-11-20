/* Structured ingredient matching. Availability is an ephemeral set of products. */
export const normalizeIngredient=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'')
  .toLocaleLowerCase('fr-BE').replaceAll('œ','oe').replaceAll('æ','ae').replace(/[^a-z0-9]+/g,' ').trim();

const entries=[
 ['Les indispensables','Eau','eau de cuisson','eau potable'],
 ['Les indispensables','Sel','sel fin','sel de cuisine','sel de table'],
 ['Les indispensables','Poivre','poivre moulu','poivre noir','poivre noir moulu'],
 ['Les indispensables','Huile','huile de cuisson','huile de cuisine','huile neutre','huile végétale','huile végétale générique'],
 ['Légumes et fruits','Courgette','courgettes'],
 ['Légumes et fruits','Tomate','tomates'],
 ['Légumes et fruits','Pomme de terre','pommes de terre','patate','patates'],
 ['Légumes et fruits','Carotte','carottes'],
 ['Légumes et fruits','Oignon','oignons'],
 ['Légumes et fruits','Ail','gousse d’ail','gousses d’ail'],
 ['Légumes et fruits','Brocoli','brocolis'],
 ['Légumes et fruits','Salade','salades'],
 ['Légumes et fruits','Pomme','pommes'],
 ['Légumes et fruits','Citron','citrons'],
 ['Protéines','Œuf','œufs','oeuf','oeufs'],
 ['Protéines','Filet de poulet','filets de poulet','blanc de poulet','blancs de poulet'],
 ['Protéines','Poulet','poulets'],
 ['Protéines','Filet de saumon','filets de saumon'],
 ['Protéines','Saumon'],
 ['Protéines','Jambon cuit'],
 ['Protéines','Lentille','lentilles'],
 ['Protéines','Pois chiche','pois chiches'],
 ['Féculents et céréales','Riz'],
 ['Féculents et céréales','Riz basmati'],
 ['Féculents et céréales','Pâtes sèches','pâtes alimentaires sèches'],
 ['Féculents et céréales','Pain de mie'],
 ['Féculents et céréales','Farine'],
 ['Crémerie','Fromage','fromages'],
 ['Crémerie','Fromage râpé','fromages râpés'],
 ['Crémerie','Beurre'],
 ['Crémerie','Lait','lait de vache'],
 ['Crémerie','Crème fraîche'],
 ['Épicerie et assaisonnements','Sucre'],
 ['Épicerie et assaisonnements','Cumin'],
 ['Épicerie et assaisonnements','Paprika'],
 ['Épicerie et assaisonnements','Huile d’olive'],
 ['Épicerie et assaisonnements','Huile de sésame'],
 ['Épicerie et assaisonnements','Huile de tournesol'],
 ['Épicerie et assaisonnements','Basilic']
];
const lexicon=new Map(),aliases=new Map();
for(const [category,name,...forms] of entries){
 const key=normalizeIngredient(name);
 lexicon.set(key,{key,name,category});
 for(const label of [name,...forms])aliases.set(normalizeIngredient(label),key);
}
export const basicIngredients=Object.freeze(['eau','sel','poivre','huile']);
const basics=new Set(basicIngredients);
const comparer=new Intl.Collator('fr-BE',{sensitivity:'base',numeric:true});
const courses=new Map([['entree','starter'],['entrees','starter'],['plat','main'],['plats','main'],['plat principal','main'],['dessert','dessert'],['desserts','dessert']]);
const difficultyOrder={facile:0,intermediaire:1,avancee:2};
const courseOrder={starter:0,main:1,dessert:2};
function keyFor(name,canonicalId){
 const label=normalizeIngredient(name),identifier=normalizeIngredient(canonicalId);
 if(aliases.has(label))return aliases.get(label);
 const synonym=aliases.get(identifier)||identifier;
 // An imported identifier alone cannot make a special product an implicit basic.
 return synonym&&!basics.has(synonym)?synonym:label;
}
export const shoppingIngredientKey=name=>keyFor(name,null);
export function ingredientMatches(item,term){
 const query=normalizeIngredient(term);
 return !query||normalizeIngredient(item.name).includes(query)||[...aliases].some(([name,key])=>key===item.key&&name.includes(query));
}
function structuredIngredients(recipe){
 const rows=recipe.ingredients,details=recipe.importDetails;
 if(!Array.isArray(rows)||!rows.length||details?.missing?.length||details?.uncertain?.length)return null;
 const traits=details?.ingredientTraits;
 if(traits&&(!Array.isArray(traits)||traits.length!==rows.length))return null;
 const result=[];
 for(const [index,row] of rows.entries()){
  if(!Array.isArray(row)||typeof row[0]!=='string'||!row[0].trim())return null;
  const name=row[0].trim(),optional=traits?.[index]?.optional===true;
  const key=keyFor(name,traits?.[index]?.canonicalId);
  if(!key||(!optional&&(!Number.isFinite(row[1])||row[1]<=0||typeof row[2]!=='string'||!row[2].trim())))return null;
  result.push({key,name,optional});
 }
 return result;
}
export function buildIngredientIndex(data){
 const personal=new Set(data.customIds||[]),catalogue=[],options=new Map(lexicon);
 for(const recipe of data.recipes||[]){
  if(recipe.removedAt||recipe.archive?.archivedAt||typeof recipe.name!=='string'||!recipe.name.trim())continue;
  const ingredients=structuredIngredients(recipe);
  if(!ingredients?.some(item=>!item.optional))continue;
  const id=recipe.id,classic=!recipe.thermomix&&recipe.steps?.some(step=>typeof step==='string'&&step.trim());
  const adaptation=data.state?.tmAdaptations?.[id];
  const thermomix=adaptation?.steps?.some(step=>typeof step.text==='string'&&step.text.trim())||
    recipe.thermomix&&recipe.steps?.some(step=>typeof step==='string'&&step.trim());
  const minutes=recipe.importDetails?.durations?.total??recipe.minutes;
  const meta=recipe.catalogue||{};
  catalogue.push({id,name:recipe.name,ingredients,minutes:Number.isFinite(minutes)&&minutes>=0?minutes:null,
    personal:personal.has(id)&&!recipe.catalogue,collection:meta.collection||null,
    course:meta.course||courses.get(normalizeIngredient(recipe.category))||null,difficulty:meta.difficulty||null,
    canPlan:Number.isInteger(recipe.servings)&&recipe.servings>0,modes:[...(classic?['classic']:[]),...(thermomix?['tm5']:[])]});
  for(const item of ingredients)if(!options.has(item.key))options.set(item.key,{key:item.key,name:item.name,category:'Autres ingrédients'});
 }
 const available=[...options.values()].filter(item=>!basics.has(item.key)).sort((a,b)=>comparer.compare(a.name,b.name));
 return {catalogue,options:available};
}
function durationGroup(value){return value===null?3:value<=30?0:value<=60?1:2;}
function order(a,b){
 return a.missing.length-b.missing.length||Number(b.used.some(item=>!basics.has(item.key)))-Number(a.used.some(item=>!basics.has(item.key)))||
  (difficultyOrder[a.difficulty]??3)-(difficultyOrder[b.difficulty]??3)||
  comparer.compare(a.name,b.name)||comparer.compare(a.id,b.id);
}
function diverse(rows){
 const buckets=new Map();
 for(const row of rows.sort(order)){
  const bucket=(courseOrder[row.course]??3)+'|'+durationGroup(row.minutes);
  if(!buckets.has(bucket))buckets.set(bucket,[]);
  buckets.get(bucket).push(row);
 }
 const result=[];
 const groups=[...buckets.values()];
 for(let place=0;result.length<rows.length;place++)for(const group of groups)if(group[place])result.push(group[place]);
 return result;
}
export function findRecipes(index,selected,filters={}){
 const explicit=new Set(selected),available=new Set([...basicIngredients,...explicit]),ready=[],almost=[];
 for(const recipe of index.catalogue){
  if(filters.collection&&recipe.collection!==filters.collection||
    filters.course&&recipe.course!==filters.course||filters.personal&&!recipe.personal||
    filters.mode&&!recipe.modes.includes(filters.mode)||
    filters.maxMinutes&&(recipe.minutes===null||recipe.minutes>filters.maxMinutes))continue;
  const missing=new Map(),used=new Map();
  for(const item of recipe.ingredients){
   if(!available.has(item.key)&&!item.optional)missing.set(item.key,item);
   if(available.has(item.key))used.set(item.key,item);
  }
  if(missing.size>2)continue;
  const result={...recipe,missing:[...missing.values()],used:[...used.values()]};
  (missing.size?almost:ready).push(result);
 }
 return {ready:diverse(ready),almost:diverse(almost)};
}
