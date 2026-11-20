import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileFunction} from 'node:vm';
import {canonical,normalizePayload,sha256,validateIllustratedRecipe} from './recipe-import-format.mjs';
import {readRecipeZip,RECIPE_ZIP_LIMITS} from './recipe-import-zip.mjs';
import {compressCatalogueImage} from './catalogue-image-codec.mjs';

const quotas={classic:{starter:30,main:140,dessert:30},diet:{starter:30,main:140,dessert:30}};
const nativeSource=await readFile(new URL('../essai-stitch-v5-famille/index.html',import.meta.url),'utf8');
const start=nativeSource.indexOf('function normalizedName('),end=nativeSource.indexOf('function drawBatchImport(',start);
const {validateBatch,normalizedName}=compileFunction(nativeSource.slice(start,end)+'\nreturn {validateBatch,normalizedName};')();
const allowedMetadata=new Set(['collection','course','description','difficulty','tags','allergens']);
const label=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.trim().length<=n;
const labels=(a,n)=>Array.isArray(a)&&a.length<=30&&a.every(s=>label(s,n));

export function catalogueReviewSample(rows){
  if(rows.length<=5)return rows.map(row=>row.key).sort();
  const strata=new Map();
  for(const row of rows){
    const group=row.collection+'/'+row.course;
    if(!strata.has(group))strata.set(group,[]);
    strata.get(group).push(row);
  }
  return [...strata.values()].flatMap(group=>group.sort((a,b)=>a.fingerprint.localeCompare(b.fingerprint))
    .slice(0,Math.ceil(group.length/10)).map(row=>row.key));
}

function reviewBatch(rows,review,{fixture}){
  const samples=catalogueReviewSample(rows);
  const anomalies=rows.filter(row=>row.warnings.length).map(row=>row.key);
  const tm5Keys=rows.filter(row=>row.tm5).map(row=>row.key);
  const gaps=[];
  if(fixture)return {status:'SKIP',samples,anomalies,gaps:['Données fictives.']};
  if(!review)return {status:'SKIP',samples,anomalies,gaps:['Revue du lot exact absente.']};
  const reviewed=review.samples||{},resolved=review.anomalies||{},tm5=review.tm5||{};
  const evidence=item=>item?.status==='PASS'&&label(item.evidence,400);
  if(!evidence(review.rights))gaps.push('Droits publics du lot à établir.');
  for(const key of samples)if(!evidence(reviewed[key]))gaps.push('Cohérence éditoriale et absence de montage à vérifier pour '+key+'.');
  for(const key of anomalies)if(!evidence(resolved[key]))gaps.push('Anomalie à traiter ou justifier pour '+key+'.');
  if(rows.some(row=>row.collection==='diet')&&!evidence(review.diet))gaps.push('Contrôle diététique privé du lot à établir.');
  for(const key of tm5Keys)if(!evidence(tm5[key])||!/^\d{4}-\d{2}-\d{2}$/.test(tm5[key].date||''))gaps.push('Adaptation TM5 à contrôler pour '+key+'.');
  return {status:gaps.length?'FAIL':'PASS',samples,anomalies,gaps};
}

function validMetadata(meta){
  return meta&&Object.keys(meta).every(key=>allowedMetadata.has(key))&&Object.hasOwn(quotas,meta.collection)&&
    Object.hasOwn(quotas[meta.collection],meta.course)&&label(meta.description,500)&&
    ['facile','intermediaire','avancee'].includes(meta.difficulty)&&labels(meta.tags,60)&&labels(meta.allergens,80);
}

export async function buildCatalogue(paths,approvals={},{fixture=false}={}) {
  const counts={classic:{starter:0,main:0,dessert:0},diet:{starter:0,main:0,dessert:0}};
  const durationCounts={upTo30:0,upTo60:0,over60:0};
  const recipes=[],assets=new Map(),decisions=[],batches=[];
  const seenKeys=new Set(),seenNames=new Set(),seenContent=new Set(),sourceHashes=new Set(),webpHashes=new Set();
  const sizes={originalBytes:0,webpBytes:0,covers:0,steps:0,overTarget:0};
  for(const path of paths){
    const decisionsInBatch=[],candidates=[];
    let batchId=null,archiveBytes=0;
    try{
      if(!/\.zip$/i.test(path))throw Error('Un ZIP dobby-recipes V2 est requis.');
      if((await stat(path)).size>RECIPE_ZIP_LIMITS.archiveBytes)throw Error('ZIP supérieur à 40 Mio.');
      const buffer=await readFile(path);
      archiveBytes=buffer.byteLength;
      batchId=await sha256(buffer);
      const bundle=await readRecipeZip(buffer);
      const batch=normalizePayload(bundle.jsonText,{jsonPath:bundle.jsonPath,images:bundle.images});
      if(batch.version!==2)throw Error('Le catalogue exige dobby-recipes V2.');
      const source=JSON.parse(bundle.jsonText.replace(/^\uFEFF/,''));
      const usedFiles=new Set();
      for(const row of batch.entries){
        const raw=source.recipes[row.index],meta=raw?.catalogue,details=row.details,key=details?.key??null;
        const errors=[...row.errors],warnings=[],media=new Map();
        const decision={key,index:row.index,status:'FAIL',stage:'qa_fail',errors,warnings,media:[]};
        decisionsInBatch.push(decision);
        if(!row.native)continue;
        decision.expected={
          classic:Array.isArray(row.native.steps)?row.native.steps.length:null,
          tm5:row.tm5?.steps.length??0
        };
        const check=(condition,message)=>{if(!condition)errors.push(message);};
        const validated=validateBatch(JSON.stringify({format:'dobby-recipes',version:2,recipes:[row.native]}));
        errors.push(...validated.errors);
        check(typeof raw.importKey==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key||'')&&key.length<=100,'Identifiant d’import stable requis.');
        const name=normalizedName(row.native.name);
        const content=canonical({ingredients:validated.recipes[0]?.ingredients.map(([ingredient,quantity,unit])=>[normalizedName(ingredient),quantity,normalizedName(unit)]).sort(),
          steps:Array.isArray(row.native.steps)?row.native.steps.map(normalizedName):[]});
        check(!seenKeys.has(key)&&!seenNames.has(name)&&!seenContent.has(content),'Doublon entre recettes ou lots.');
        seenKeys.add(key);seenNames.add(name);seenContent.add(content);
        check(validMetadata(meta),'Catalogue, type de plat, description, difficulté, étiquettes et allergènes attendus.');
        check(row.native.device==='classic'&&row.native.servings===4&&row.native.source&&
          row.native.steps.length&&details.missingFields.length===0&&details.missing.length===0&&details.uncertain.length===0,
          'Fiche traditionnelle complète, provenance et 4 portions requises.');
        check(Object.values(details.durations).every(n=>Number.isInteger(n)&&n>=0)&&details.durations.total>0&&
          details.durations.total>=Math.max(details.durations.preparation,details.durations.cooking,details.durations.rest),'Durées détaillées et total cohérent requis.');
        check(!row.warnings.some(message=>message.startsWith('Durées contradictoires')),'Durée détaillée incohérente avec la durée déclarée.');
        check(Array.isArray(row.native.ingredients)&&row.native.ingredients.length&&row.native.ingredients.every(i=>label(i?.id,100)&&label(i?.canonicalId,100)&&typeof i.optional==='boolean'),
          'Identifiant, groupe normalisé et caractère facultatif explicites requis.');
        if(!row.strictMedia)errors.push(...validateIllustratedRecipe(row,bundle.images));
        check(!row.tm5||row.tm5.portions===4&&row.tm5.steps.length&&row.tm5.steps.every(s=>s.text&&!s.uncertain.length&&(s.external||s.time&&s.temp&&s.speed&&s.reverse!==null)),
          'Adaptation TM5 incomplète.');
        const slots=new Map(details.stepDetails.flatMap(d=>d.images.map(ref=>[ref.path,{method:d.method,stepIndex:d.stepIndex,provenance:ref.provenance}])));
        for(const imagePath of row.mediaPaths){
          usedFiles.add(imagePath);
          const item=bundle.images.get(imagePath);
          if(!item)continue; // The format validator records the absent reference.
          try{
            const cover=imagePath===row.coverPath;
            const sourceHash=await sha256(item.bytes);
            const output=await compressCatalogueImage(item.bytes,item.type,cover?'cover':'step');
            const hash=await sha256(output.bytes);
            check(!sourceHashes.has(sourceHash)&&!webpHashes.has(hash),'Image identique dans la recette ou dans un autre lot : '+imagePath+'.');
            sourceHashes.add(sourceHash);webpHashes.add(hash);
            media.set(imagePath,{path:'images/'+hash+'.webp',bytes:output.bytes});
            decision.media.push({file:imagePath,role:cover?'cover':'step',
              ...(cover?{provenance:row.mediaDescriptors[imagePath]?.provenance}:slots.get(imagePath)),sourceSha256:sourceHash,webpSha256:hash,
              sourceBytes:item.bytes.length,webpBytes:output.bytes.length,width:output.width,height:output.height,target:output.target});
            if(output.bytes.length>output.target){
              warnings.push('Budget indicatif dépassé : '+imagePath+'. Justifier la lisibilité ou remplacer cette image.');
              sizes.overTarget++;
            }
            if(!fixture&&Math.max(output.width,output.height)<(cover?640:480))warnings.push('Résolution utile à vérifier : '+imagePath+'.');
            sizes.originalBytes+=item.bytes.length;sizes.webpBytes+=output.bytes.length;
            sizes[cover?'covers':'steps']++;
          }catch(error){errors.push(imagePath+' : '+error.message);}
        }
        decision.fingerprint=await sha256(canonical({recipe:raw,media:decision.media.map(({file,sourceSha256})=>[file,sourceSha256])}));
        if(errors.length)continue;
        Object.assign(decision,{status:'PASS',stage:'qa_pass',collection:meta.collection,course:meta.course,tm5:Boolean(row.tm5)});
        candidates.push({decision,validated,meta,media,row});
      }
      const unreferenced=[...bundle.images.keys()].filter(name=>!usedFiles.has(name));
      if(unreferenced.length)throw Error('Images sans recette dans le ZIP : '+unreferenced.join(', ')+'.');
    }catch(error){
      decisionsInBatch.push({key:null,status:'FAIL',stage:'qa_fail',errors:[error.message],warnings:[],media:[]});
    }
    const approved=approvals?.batches&&Object.hasOwn(approvals.batches,batchId)?approvals.batches[batchId]:null;
    const review=reviewBatch(candidates.map(item=>item.decision),approved,{fixture});
    batches.push({sha256:batchId,archiveBytes,status:decisionsInBatch.every(row=>row.status==='PASS')?'PASS':'FAIL',review,entries:decisionsInBatch.length});
    decisions.push(...decisionsInBatch);
    for(const {decision,validated,meta,media,row} of candidates){
      const {key}=decision,details=row.details;
      const stepDetails=details.stepDetails.map(d=>({...d,images:d.images.map(({path,...image})=>({...image,asset:media.get(path).path}))}));
      const checkedTM5=!fixture&&review.status==='PASS'&&Boolean(approved?.tm5?.[key]?.date);
      const tm5=row.tm5&&{...row.tm5,verified:checkedTM5,verifiedAt:checkedTM5?approved.tm5[key].date:null,
        status:checkedTM5?'Vérifiée':'À vérifier',stepDetails:stepDetails.filter(d=>d.method==='tm5')};
      recipes.push({...validated.recipes[0],id:'catalogue-'+key,fav:false,
        reviewed:!fixture&&review.status==='PASS'&&approved?.samples?.[key]?.status==='PASS',
        catalogue:{...meta},image:media.get(row.coverPath).path,importDetails:{...details,stepDetails},catalogueTM5:tm5});
      counts[meta.collection][meta.course]++;
      const total=details.durations.total;
      durationCounts[total<=30?'upTo30':total<=60?'upTo60':'over60']++;
      for(const {path,bytes} of media.values())assets.set(path,bytes);
    }
  }
  const exact=Object.keys(counts).every(group=>Object.keys(quotas[group]).every(course=>counts[group][course]===quotas[group][course]));
  const technical=decisions.length>0&&decisions.every(row=>row.status==='PASS');
  return {recipes,assets,report:{fixture,technicalStatus:technical?'PASS':'FAIL',counts,quotas,quotaStatus:exact?'PASS':'FAIL',durationCounts,sizes,batches,decisions,
    semanticCoverage:'Échantillons attestés par lot. Autres recettes non vérifiées sur le plan sémantique.',
    ready:!fixture&&exact&&technical&&batches.every(batch=>batch.review.status==='PASS')}};
}
export async function writeCatalogue(out,{recipes,assets,report}) {
  if(!report.ready&&!report.fixture)throw Error('Validation ou quotas incomplets. Aucun catalogue de diffusion généré.');
  if(report.fixture&&(!report.decisions.length||report.decisions.some(row=>row.status!=='PASS')))throw Error('Fixture invalide.');
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
  if(!['audit','build'].includes(action)||!location||!paths.length)throw Error('Usage: node build-recipe-catalogue.mjs audit|build revues-par-lot.json rapport.json|dossier ZIP...');
  const approvals=reviewFile==='-'?{}:JSON.parse(await readFile(reviewFile,'utf8'));
  const result=await buildCatalogue(paths,approvals);
  if(action==='audit')await writeFile(location,JSON.stringify(result.report,null,2)+'\n');
  else await writeCatalogue(location,result);
  if(!result.report.ready)process.exitCode=1;
}
