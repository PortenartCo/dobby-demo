import {safeRecipePath} from './recipe-import-zip.mjs';
/* Versioned transport for the existing DOBBY validator/writer. No storage or AI calls. */
export const limits=Object.freeze({json:2*1024*1024,recipes:150});
export const maxRecipeSteps=80;
export const maxRecipeImages=1+2*maxRecipeSteps;
const maxLegacyStepImages=10;

export function validateIllustratedRecipe(row,images){
 const {native,details,tm5,coverPath,mediaPaths,mediaDescriptors}=row;
 const errors=[],used=new Set();
 function requireMedia(path,provenance,label){
  if(!path||!provenance||!images.has(path))errors.push(label+' : image et provenance requises.');
  else if(used.has(path))errors.push(label+' : fichier réutilisé.');
  if(path)used.add(path);
 }
 requireMedia(coverPath,mediaDescriptors[coverPath]?.provenance,'Couverture');
 const stepsForMethod=native.device==='tm5'?{tm5:native.steps}:{classic:native.steps,tm5:tm5?.steps};
 const slots=new Map(details.stepDetails.map(item=>[item.method+':'+item.stepIndex,item.images]));
 for(const [method,steps] of Object.entries(stepsForMethod)){
  if(!Array.isArray(steps))continue;
  for(const index of steps.keys()){
   const media=slots.get(method+':'+index);
   const label=method+' étape '+(index+1);
   if(media?.length!==1)errors.push(label+' : exactement une image requise.');
   else requireMedia(media[0].path,media[0].provenance,label);
  }
 }
 if(mediaPaths.some(path=>!used.has(path)))errors.push('Fichier sans liaison à la couverture ou à une étape.');
 return errors;
}

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const value=(x,max=2000)=>typeof x==='string'?(x.trim().length>max?(()=>{throw Error('Texte trop long dans le fichier de recettes.');})():x.trim()):'';
const list=(x,max=80)=>{if(x===undefined||x===null||x==='')return [];if(typeof x==='string')return[value(x)];if(!Array.isArray(x)||x.length>max||x.some(v=>typeof v!=='string'))throw Error('Liste de notes, matériel ou informations incertaines invalide ou trop longue.');return x.map(v=>value(v));};
const absent=x=>x===undefined||x===null||x==='';
const knownNumber=x=>(typeof x==='number'||typeof x==='string'&&x.trim()!=='')&&Number.isFinite(Number(x))?Number(x):null;
export function resolveMediaPath(input,jsonPath='recipes.json'){
 const safe=safeRecipePath(input),descriptor=safeRecipePath(jsonPath),parent=descriptor.includes('/')?descriptor.slice(0,descriptor.lastIndexOf('/')+1):'';
 const path=safeRecipePath(parent+safe);if(!/\.(png|jpe?g|webp)$/i.test(path))throw Error('Image attendue : JPEG, PNG ou WebP.');return path;
}
export function canonical(value){return JSON.stringify(sort(value));}
function sort(x){return Array.isArray(x)?x.map(sort):object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;}
export async function sha256(bytes){const b=typeof bytes==='string'?new TextEncoder().encode(bytes):bytes;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function normalizeTM5(raw,servings,warnings){
 if(raw===undefined||raw===null)return null;if(!object(raw)||!absent(raw.steps)&&!Array.isArray(raw.steps)||(raw.steps?.length||0)>maxRecipeSteps)throw Error('Adaptation TM5 : étapes invalides.');
 const suppliedPortions=knownNumber(raw.portions);if(raw.portions!==null&&raw.portions!==undefined&&raw.portions!==''&&(suppliedPortions===null||suppliedPortions<=0||suppliedPortions>30))throw Error('Adaptation TM5 : portions invalides (plus de 0 et au maximum 30).');
 const steps=(raw.steps||[]).map((s,i)=>{if(!object(s)||!absent(s.text)&&typeof s.text!=='string')throw Error('Adaptation TM5 : instruction invalide à l’étape '+(i+1));const supplied=key=>{const v=s[key];if(v===null||v===undefined)return '';if(!['string','number'].includes(typeof v))throw Error('Réglage TM5 invalide.');return value(String(v),160);};return{text:value(s.text),tool:supplied('tool'),time:supplied('time'),temp:supplied('temp'),speed:supplied('speed'),reverse:typeof s.reverse==='boolean'?s.reverse:null,external:value(s.external),uncertain:list(s.uncertain,20)};});
 warnings.push('Adaptation Thermomix TM5 issue de l’import : à vérifier avant utilisation.');
 return{steps,portions:knownNumber(raw.portions)??servings,verified:false,verifiedAt:null,status:'À vérifier',origin:'external-import',equipment:list(raw.equipment),notes:list(raw.notes),warnings:list(raw.warnings),uncertain:list(raw.uncertain)};
}
export function normalizePayload(payload,{jsonPath='recipes.json',images=new Map()}={}){
 if(typeof payload==='string'){if(new TextEncoder().encode(payload).length>limits.json)throw Error('Fichier JSON trop volumineux (2 Mo maximum).');try{payload=JSON.parse(payload.replace(/^\uFEFF/,''));}catch{throw Error('Le fichier ne contient pas un JSON valide.');}}
 if(!object(payload)||payload.format!=='dobby-recipes'||![1,2].includes(payload.version)||!Array.isArray(payload.recipes))throw Error('Format attendu : dobby-recipes, version 1 ou 2, recipes:[…].');
 if(!payload.recipes.length||payload.recipes.length>limits.recipes)throw Error('Le lot doit contenir entre 1 et 150 recettes.');
 const entries=payload.recipes.map((x,index)=>{const errors=[],warnings=[];try{if(!object(x))return{index,errors:['Recette invalide : objet attendu.'],warnings};
 {for(const field of ['name','category','source','importKey','id'])if(x[field]!==undefined&&x[field]!==null&&typeof x[field]!=='string')errors.push('Champ '+field+' invalide : texte attendu.');if(Array.isArray(x.ingredients))for(const item of x.ingredients){const q=item?.quantity;if(q!==null&&q!==undefined&&q!==''&&(!['number','string'].includes(typeof q)||knownNumber(q)===null))errors.push('Quantité d’ingrédient non numérique.');}}
 const name=value(x.name,160),dur=object(x.durations)?x.durations:{},legacy=knownNumber(x.minutes);
 const durations={preparation:knownNumber(dur.preparation),cooking:knownNumber(dur.cooking),rest:knownNumber(dur.rest),total:knownNumber(dur.total)};
 if(payload.version===1)durations.total=legacy;else{if(durations.total===null)durations.total=legacy;if(durations.total===null&&[durations.preparation,durations.cooking,durations.rest].every(n=>n!==null))durations.total=durations.preparation+durations.cooking+durations.rest;if(legacy!==null&&durations.total!==null&&legacy!==durations.total)warnings.push('Durées contradictoires : le total explicite est utilisé ; les durées détaillées sont conservées.');}
 for(const [label,n]of Object.entries(durations)){if(n!==null&&(n<0||n>1440))errors.push('Durée '+label+' invalide (0 à 1440 minutes).');const raw=dur[label];if(raw!==null&&raw!==undefined&&raw!==''&&knownNumber(raw)===null)errors.push('Durée '+label+' non numérique.');}if(x.minutes!==null&&x.minutes!==undefined&&x.minutes!==''&&legacy===null)errors.push('Durée totale non numérique.');
 if(durations.total===null)warnings.push('Durée totale inconnue : aucune durée inventée.');
 if(!absent(x.servings)&&knownNumber(x.servings)===null)errors.push('Portions invalides : nombre attendu.');
 const servings=knownNumber(x.servings),native={name,category:value(x.category,60)||'Autre',source:value(x.source,400),servings,minutes:durations.total,device:x.device??'classic',favorite:x.favorite===true,reviewed:x.reviewed===true,ingredients:absent(x.ingredients)?[]:x.ingredients,steps:absent(x.steps)?[]:x.steps};
 if(native.device!=='classic'&&native.device!=='tm5')errors.push('Mode classic/tm5 incorrect.');
 if(native.reviewed!==true)warnings.push('Recette transcrite à contrôler avant de cuisiner.');
 if(x.mediaProfile!==undefined&&(payload.version!==2||x.mediaProfile!=='per-step'))errors.push('Profil média V2 inconnu.');
 const strictMedia=x.mediaProfile==='per-step';
 const key=value(x.importKey||x.id,200)||null,details={version:2,sourceVersion:payload.version,key,durations,equipment:list(x.equipment),notes:list(x.notes),missing:list(x.missing),uncertain:list(x.uncertain)};
 let tm5=null;try{tm5=normalizeTM5(x.tm5,servings,warnings);}catch(error){errors.push(error.message);}
 const ingredientIds=Array.isArray(native.ingredients)?native.ingredients.map((a,i)=>value(a?.id,100)||'ingredient-'+i):[];
 if(new Set(ingredientIds).size!==ingredientIds.length)errors.push('Identifiants d’ingrédients en doublon.');details.ingredientIds=ingredientIds;
 if(Array.isArray(native.ingredients)&&native.ingredients.some(a=>a?.optional!==undefined||a?.canonicalId!==undefined)){
   details.ingredientTraits=native.ingredients.map(a=>{
     if(a?.optional!==undefined&&typeof a.optional!=='boolean')throw Error('Indicateur d’ingrédient facultatif invalide.');
     const canonicalId=value(a?.canonicalId,100)||null;
     if(a?.canonicalId!==undefined&&(!canonicalId||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(canonicalId)))throw Error('Identifiant normalisé d’ingrédient invalide.');
     return{canonicalId,optional:a?.optional===true};
   });
 }
 details.missingFields=recipeMissingFields(native);details.stepDetails=[];
 const provenance=ref=>{const p=object(ref)?ref.provenance:null;if(p!==null&&p!==undefined&&!['photo-originale','illustration-IA'].includes(p))throw Error('Provenance d’image invalide.');return p??null;};
 let mediaPath=null;const media=typeof x.image==='string'?x.image:object(x.image)?x.image.path:null;details.coverProvenance=provenance(x.image);details.coverDescription=object(x.image)?value(x.image.description,400):'';
 if(media!==null&&media!==undefined&&media!==''){try{mediaPath=resolveMediaPath(media,jsonPath);if(!images.has(mediaPath))warnings.push('Image référencée absente : import sans photographie ; elle pourra être ajoutée plus tard.');}catch(error){errors.push(error.message);}}
 const mediaDescriptors={};if(mediaPath)mediaDescriptors[mediaPath]={provenance:details.coverProvenance,description:details.coverDescription};const mediaPaths=mediaPath?[mediaPath]:[];if(x.images!==undefined){if(!Array.isArray(x.images)||x.images.length>maxRecipeImages)errors.push('Maximum '+maxRecipeImages+' images par recette.');else for(const ref of x.images){try{const path=resolveMediaPath(object(ref)?ref.path:ref,jsonPath);mediaDescriptors[path]={provenance:provenance(ref),description:object(ref)?value(ref.description,400):''};if(!mediaPaths.includes(path))mediaPaths.push(path);if(!images.has(path))warnings.push('Image référencée absente : import sans cette photographie.');}catch(error){errors.push(error.message);}}}const coverPath=mediaPath||mediaPaths[0]||null;
 if(x.stepDetails!==undefined){
 if(!Array.isArray(x.stepDetails)||x.stepDetails.length>160)errors.push('Métadonnées d’étapes invalides (160 maximum).');
 else{const seen=new Set();for(const detail of x.stepDetails){
  if(!object(detail))throw Error('Métadonnées d’étape invalides.');const method=detail.method??(strictMedia&&native.device==='tm5'?'tm5':'classic'),stepIndex=detail.stepIndex,steps=method==='tm5'?(tm5?.steps??(native.device==='tm5'?native.steps:null)):native.steps;
  if(!['classic','tm5'].includes(method)||!Number.isInteger(stepIndex)||stepIndex<0||!Array.isArray(steps)||stepIndex>=steps.length)throw Error('Liaison à une étape ou méthode absente.');
  const token=method+':'+stepIndex;if(seen.has(token))throw Error('Liaison d’étape en doublon.');seen.add(token);
  if(detail.ingredients!==undefined&&(!Array.isArray(detail.ingredients)||detail.ingredients.length>100))throw Error('Ingrédients d’étape invalides.');
  const linked=(detail.ingredients||[]).map(ref=>{if(!object(ref)||!ingredientIds.includes(ref.ingredientId))throw Error('Référence d’ingrédient d’étape inconnue.');const quantity=knownNumber(ref.quantity);if(!absent(ref.quantity)&&(quantity===null||quantity<=0||quantity>100000))throw Error('Quantité d’étape invalide.');if(ref.useTotal!==undefined&&typeof ref.useTotal!=='boolean')throw Error('Référence à la quantité totale invalide.');return{ingredientId:ref.ingredientId,quantity,unit:value(ref.unit,30),useTotal:ref.useTotal===true};});
  if(detail.images!==undefined&&(!Array.isArray(detail.images)||detail.images.length>maxLegacyStepImages))throw Error('Images d’étape invalides.');
  const linkedImages=(detail.images||[]).map(ref=>{const path=resolveMediaPath(object(ref)?ref.path:ref,jsonPath);if(!mediaPaths.includes(path))mediaPaths.push(path);if(!images.has(path))warnings.push('Image d’étape référencée absente : repli sans photographie.');return{path,provenance:provenance(ref),description:object(ref)?value(ref.description,400):''};});
  details.stepDetails.push({method,stepIndex,title:value(detail.title,160),ingredients:linked,images:linkedImages});
 }} }
 if(mediaPaths.length>maxRecipeImages)errors.push('Maximum '+maxRecipeImages+' images par recette, couverture et étapes comprises.');
 if(strictMedia)errors.push(...validateIllustratedRecipe({native,details,tm5,coverPath,mediaPaths,mediaDescriptors},images));
 for(const field of details.missingFields)warnings.push('À compléter : '+field);
 return{index,native,details,tm5,strictMedia,mediaPath,coverPath,mediaPaths,mediaDescriptors,errors,warnings};}catch(error){return{index,errors:[...errors,error.message],warnings};}});
 return{version:payload.version,entries,images,warnings:[],errors:[]};
}
export function recipeMissingFields(r){
 const missing=[];if(!r.name?.trim())missing.push('name');if(r.servings==null)missing.push('servings');if(r.minutes==null)missing.push('minutes');
 if(!r.ingredients?.length)missing.push('ingredients');else r.ingredients.forEach((a,i)=>{if(!a?.name?.trim())missing.push('ingredients.'+i+'.name');if(absent(a?.quantity))missing.push('ingredients.'+i+'.quantity');if(!a?.unit?.trim())missing.push('ingredients.'+i+'.unit');});
 if(!r.steps?.length)missing.push('steps');else r.steps.forEach((t,i)=>{if(typeof t==='string'&&!t.trim())missing.push('steps.'+i);});return missing;
}
export async function parseFile(file){
 if(!file)throw Error('Choisissez un fichier JSON ou ZIP.');
 if(/\.zip$/i.test(file.name)){const {readRecipeZip,RECIPE_ZIP_LIMITS}=await import('./recipe-import-zip.mjs');if(file.size>RECIPE_ZIP_LIMITS.archiveBytes)throw Error('Archive trop volumineuse : 40 Mo maximum.');const bytes=new Uint8Array(await file.arrayBuffer()),bundle=await readRecipeZip(bytes);return{sourceArchive:{bytes,type:'application/zip'},...normalizePayload(bundle.jsonText,{jsonPath:bundle.jsonPath,images:bundle.images}),fileName:file.name,warnings:bundle.warnings};}
 if(!/\.json$/i.test(file.name)||file.size>limits.json)throw Error('Choisissez un JSON DOBBY de 2 Mo maximum, ou un ZIP de 40 Mo maximum.');return{...normalizePayload(await file.text()),fileName:file.name};
}
export const externalPrompt=`Tu m’aides à transcrire mes recettes dans DOBBY. Je vais transmettre des photographies successives, parfois plusieurs pages d’une même recette et parfois plusieurs recettes différentes. Regroupe les pages correctement, conserve toutes les recettes dans un registre cumulatif de cette conversation, et distingue clairement chaque recette. Après chaque lot de photos, demande exactement : « Avez-vous encore une recette à me fournir ? » Ne produis le fichier final qu’après ma confirmation explicite qu’il n’y a plus de recette à fournir. La sortie finale doit contenir TOUTES les recettes collectées, jamais seulement le dernier lot.
Transcris fidèlement les noms, ingrédients, quantités, unités, étapes, portions et durées. N’invente aucun ingrédient, quantité, durée, réglage ni texte illisible : utilise null pour une valeur numérique inconnue et indique les incertitudes dans missing et uncertain. Les champs culinaires absents n’empêchent pas de livrer : garde name vide, servings et minutes null, ingredients et steps vides s’ils sont inconnus, et signale les lacunes. Aucun nom ou nombre de portions par défaut. Distingue le temps de préparation, cuisson, repos et total ; ne calcule le total que si toutes ses composantes sont connues. Garde l’origine et les conseils de la source.
La sortie prioritaire est un ZIP unique réel et téléchargeable contenant recipes.json et images/, uniquement si tu sais réellement créer et joindre ces fichiers ; sinon fournis le JSON seul et indique honnêtement cette limite. Le JSON UTF-8 est au format {"format":"dobby-recipes","version":2,"recipes":[...]}. Chaque recette suit cet exemple de STRUCTURE, dont les valeurs sont à remplacer par la transcription, sans inventer de contenu :
{"importKey":"identifiant-stable-de-la-recette","name":"Titre transcrit","device":"classic","category":"Autre","source":"Source réellement indiquée","servings":null,"minutes":null,"durations":{"preparation":null,"cooking":null,"rest":null,"total":null},"ingredients":[{"name":"Ingrédient transcrit","quantity":null,"unit":""}],"steps":["Étape classique transcrite"],"equipment":[],"notes":[],"missing":[],"uncertain":[],"image":null,"images":[],"reviewed":false,"tm5":null}
Une seule recette peut comporter les deux préparations : steps pour la classique, et un objet tm5 associé, jamais une seconde recette en doublon. Propose une adaptation Thermomix TM5 lorsque c’est possible, en conservant strictement la recette originale. Le champ tm5 peut contenir {"steps":[{"text":"Instruction fournie","tool":"","time":"","temp":"","speed":"","reverse":null,"external":"","uncertain":[]}],"portions":null,"equipment":[],"notes":[],"warnings":[],"uncertain":[],"verified":false}. N’invente pas de vitesse, température, durée ni contrainte de capacité pour compléter artificiellement une adaptation. Signale les accessoires, le sens inverse lorsqu’il est connu et les opérations hors appareil (four, poêle…). Toute adaptation IA reste À vérifier avant utilisation ; seule une vérification humaine ultérieure pourra la confirmer.
Conserve steps comme une liste de textes ordonnés. Donne un id stable à chaque ingrédient. Ajoute stepDetails pour les associations certaines : [{"method":"classic","stepIndex":0,"title":"Titre effectivement connu","ingredients":[{"ingredientId":"id-ingredient","useTotal":true,"quantity":null,"unit":""}],"images":[{"path":"images/etape-1.png","provenance":"photo-originale","description":"État de préparation visible"}]}]. stepIndex commence à zéro ; method vaut classic ou tm5 et se rapporte aux étapes de cette méthode. quantity est seulement une quantité partielle explicitement connue ; useTotal:true réfère à la quantité entière. Sinon laisse ingredients vide, sans déduire une répartition. Chaque image est liée à l’étape exacte ; distingue photo-originale et illustration-IA, et n’attribue aucune provenance inconnue. Garde le plat, les ustensiles et l’état de cuisson cohérents entre vues. Chaque étape affichée doit avoir une image distincte, en classique et en TM5 lorsqu’une variante existe. Ne regroupe pas plusieurs étapes en planche et ne raccourcis pas la recette pour réduire le nombre d’images.
Fournis les photographies réellement disponibles. Si les photos manquent et que ton outil peut réellement créer et joindre des images, génère une couverture du plat terminé et une image distincte pour chaque étape affichée. Si le ZIP contient toutes ces images avec leurs liaisons et provenances, indique mediaProfile:"per-step" dans la recette. Déclare chacune avec provenance « illustration-IA ». N’utilise jamais une illustration pour compléter un ingrédient, un geste ou un réglage absent de la transcription. N’invente aucun fichier, URL ou lien de téléchargement. N’inclus aucune grosse photographie base64 dans le JSON. Si tu peux joindre les images, crée un ZIP contenant un seul recipes.json et un sous-dossier images/ avec des WebP optimisés de préférence, ou des JPEG et PNG réels ; image contient alors un chemin relatif tel que images/recette-1.jpg. Maximum 150 recettes, JSON 2 Mo, ZIP 40 Mo et 80 Mo décompressés, 180 entrées, 10 Mo par image et jusqu’à 161 images par recette, couverture comprise (80 étapes par méthode), dans la limite de l’archive. Si tu ne peux pas créer de ZIP ou joindre les images, fournis le JSON seul avec image:null, et indique-le clairement. Je récupérerai le fichier puis le sélectionnerai moi-même dans DOBBY ; aucun transfert automatique vers DOBBY n’existe.`;
