import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileFunction} from 'node:vm';
import {canonical,normalizePayload,sha256} from './recipe-import-format.mjs';
import {readRecipeZip} from './recipe-import-zip.mjs';

const quotas={classic:{starter:30,main:140,dessert:30},diet:{starter:30,main:140,dessert:30}};
const nativeSource=await readFile(new URL('../essai-stitch-v5-famille/index.html',import.meta.url),'utf8');
const start=nativeSource.indexOf('function normalizedName('),end=nativeSource.indexOf('function drawBatchImport(',start);
const {validateBatch,normalizedName}=compileFunction(nativeSource.slice(start,end)+'\nreturn {validateBatch,normalizedName};')();
const imageExt={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const allowedMetadata=new Set(['collection','course','description','difficulty','tags','allergens']);
const label=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.trim().length<=n;
const labels=(a,n)=>Array.isArray(a)&&a.length<=30&&a.every(s=>label(s,n));

export async function buildCatalogue(paths,approvals={},{fixture=false}={}) {
  const counts={classic:{starter:0,main:0,dessert:0},diet:{starter:0,main:0,dessert:0}};
  const durationCounts={upTo30:0,upTo60:0,over60:0};
  const recipes=[],assets=new Map(),decisions=[],seenKeys=new Set(),seenNames=new Set(),seenContent=new Set();
  for(const path of paths){
    if(!/\.zip$/i.test(path))throw Error('Un ZIP dobby-recipes v2 est requis.');
    const buffer=await readFile(path);
    const bundle=await readRecipeZip(buffer);
    const batch=normalizePayload(bundle.jsonText,{jsonPath:bundle.jsonPath,images:bundle.images});
    if(batch.version!==2)throw Error('Le catalogue exige dobby-recipes v2.');
    // Metadata used solely by the offline editorial gate. Native personal import ignores it.
    const source=JSON.parse(bundle.jsonText.replace(/^\uFEFF/,''));
    for(const row of batch.entries){
      const raw=source.recipes[row.index],meta=raw?.catalogue,details=row.details,key=details?.key;
      const errors=[...row.errors],media=new Map();
      const check=(condition,message)=>{if(!condition)errors.push(message);};
      if(!row.native){decisions.push({key:key||null,errors});continue;}
      const validated=validateBatch(JSON.stringify({format:'dobby-recipes',version:2,recipes:[row.native]}));
      errors.push(...validated.errors);
      check(typeof raw.importKey==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key||'')&&key.length<=100,'Identifiant d’import stable requis.');
      const name=normalizedName(row.native.name);
      const content=canonical({ingredients:validated.recipes[0]?.ingredients.map(([ingredient,quantity,unit])=>[normalizedName(ingredient),quantity,normalizedName(unit)]).sort(),steps:Array.isArray(row.native.steps)?row.native.steps.map(normalizedName):[]});
      check(!seenKeys.has(key)&&!seenNames.has(name)&&!seenContent.has(content),'Doublon entre recettes ou lots.');
      seenKeys.add(key);seenNames.add(name);seenContent.add(content);
      check(meta&&Object.keys(meta).every(k=>allowedMetadata.has(k))&&Object.hasOwn(quotas,meta.collection)&&Object.hasOwn(quotas[meta.collection],meta.course)&&
        label(meta.description,500)&&['facile','intermediaire','avancee'].includes(meta.difficulty)&&labels(meta.tags,60)&&labels(meta.allergens,80),'Catalogue, type de plat, description, difficulté, étiquettes et allergènes attendus.');
      check(row.native.reviewed&&row.native.device==='classic'&&row.native.servings===4&&row.native.source&&
        row.native.steps.length&&details.missingFields.length===0&&details.missing.length===0&&details.uncertain.length===0,'Fiche traditionnelle complète, provenance, revue humaine et 4 portions requises.');
      check(Object.values(details.durations).every(n=>Number.isInteger(n)&&n>=0)&&details.durations.total>0&&
        details.durations.total>=Math.max(details.durations.preparation,details.durations.cooking,details.durations.rest),'Durées détaillées et total cohérent requis.');
      check(Array.isArray(row.native.ingredients)&&row.native.ingredients.length&&row.native.ingredients.every(i=>label(i?.id,100)&&label(i?.canonicalId,100)&&typeof i.optional==='boolean'),'Identifiant, groupe normalisé et caractère facultatif explicites requis.');
      for(const name of row.mediaPaths){
        const item=batch.images.get(name);
        if(!item){errors.push('Fichier image référencé absent.');continue;}
        const hash=await sha256(item.bytes),path='images/'+hash+'.'+imageExt[item.type];
        media.set(name,{path,hash,item});
      }
      const cover=media.get(row.coverPath),coverInfo=row.mediaDescriptors[row.coverPath];
      const steps=details.stepDetails.filter(item=>item.method==='classic').flatMap(item=>item.images);
      const distinct=new Set(steps.map(item=>media.get(item.path)?.hash).filter(Boolean));
      const fingerprint=await sha256(canonical({recipe:raw,images:[...media].map(([name,item])=>[name,item.hash])}));
      const approval=Object.hasOwn(approvals,key)?approvals[key]:null,approved=approval?.fingerprint===fingerprint;
      check(approved&&approval.editorial===true&&approval.rights===true,'Attestation éditoriale et droits liée à l’empreinte requise.');
      check(meta?.collection!=='diet'||approved&&approval.dietReviewed===true,'Revue diététique privée requise pour cette empreinte.');
      check(cover&&coverInfo?.provenance&&steps.every(image=>image.provenance&&media.has(image.path))&&
        distinct.size===steps.length&&!distinct.has(cover?.hash)&&steps.length<=5&&
        (steps.length>=2||approved&&approval.mediaException===true),'Couverture et 2 à 5 illustrations distinctes, provenance et liaison exactes requises.');
      check(details.stepDetails.every(item=>item.images.every(image=>image.provenance&&media.has(image.path))),'Provenance et fichier de chaque étape requis.');
      check(!row.tm5||approved&&approval.tm5===true&&typeof approval.tm5Date==='string'&&/^\d{4}-\d\d-\d\d$/.test(approval.tm5Date)&&
        row.tm5.portions===4&&row.tm5.steps.length&&row.tm5.steps.every(s=>s.text&&!s.uncertain.length&&(s.external||s.time&&s.temp&&s.speed&&s.reverse!==null)),'Adaptation TM5 complète et attestation de vérification requises.');
      decisions.push({key:key||null,fingerprint,errors});
      if(errors.length)continue;
      const stepDetails=details.stepDetails.map(d=>({...d,images:d.images.map(({path,...image})=>({...image,asset:media.get(path).path}))}));
      const tm5=row.tm5&&{...row.tm5,verified:true,verifiedAt:approval.tm5Date,status:'Vérifiée',stepDetails:stepDetails.filter(d=>d.method==='tm5')};
      recipes.push({...validated.recipes[0],id:'catalogue-'+key,fav:false,
        catalogue:{...meta},image:cover.path,importDetails:{...details,stepDetails},catalogueTM5:tm5});
      counts[meta.collection][meta.course]++;
      const total=details.durations.total;
      durationCounts[total<=30?'upTo30':total<=60?'upTo60':'over60']++;
      for(const {path,item} of media.values())assets.set(path,item.bytes);
    }
  }
  const countMatches=Object.keys(counts).every(group=>Object.keys(quotas[group]).every(course=>counts[group][course]===quotas[group][course]));
  return{recipes,assets,report:{fixture,counts,quotas,durationCounts,decisions,ready:!fixture&&countMatches&&decisions.every(row=>!row.errors.length)}};
}
export async function writeCatalogue(out,{recipes,assets,report}) {
  if(!report.ready&&!report.fixture)throw Error('Validation ou quotas incomplets. Aucun catalogue de diffusion généré.');
  if(report.fixture&&report.decisions.some(row=>row.errors.length))throw Error('Fixture invalide.');
  if(report.fixture&&resolve(out)===resolve(new URL('../essai-stitch-v5-famille/catalogue',import.meta.url).pathname))throw Error('Une fixture n’est pas un catalogue intégré.');
  await mkdir(out,{recursive:false});
  await mkdir(join(out,'images'));
  for(const [path,bytes] of assets)await writeFile(join(out,path),bytes);
  const json=JSON.stringify(recipes).replaceAll('<','\\u003c');
  const js=`(() => {
  const root = document.currentScript.src, url = file => new URL(file,root).href;
  window.DobbyIntegratedRecipes = ${json};
  for(const recipe of window.DobbyIntegratedRecipes){
    recipe.image=url(recipe.image);
    for(const item of recipe.importDetails.stepDetails)for(const image of item.images)image.url=url(image.asset);
    if(recipe.catalogueTM5)recipe.catalogueTM5.stepDetails=recipe.importDetails.stepDetails.filter(item=>item.method==='tm5');
  }
})();\n`;
  await writeFile(join(out,'recipes.js'),js,{flag:'wx'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [, ,action,reviewFile,location,...paths]=process.argv;
  if(!['audit','build'].includes(action)||!location||!paths.length)throw Error('Usage: node build-recipe-catalogue.mjs audit|build revues.json rapport.json|dossier ZIP...');
  const approvals=reviewFile==='-'?{}:JSON.parse(await readFile(reviewFile,'utf8'));
  const result=await buildCatalogue(paths,approvals);
  if(action==='audit')await writeFile(location,JSON.stringify(result.report,null,2)+'\n');
  else await writeCatalogue(location,result);
  if(!result.report.ready)process.exitCode=1;
}
