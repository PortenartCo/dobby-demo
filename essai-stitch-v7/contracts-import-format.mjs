/* Versioned, local-only exchange. This module validates transport data; it never
   writes family records, loads a document, uploads a file or calls an AI. */
export const CONTRACT_FORMAT_LIMITS = Object.freeze({jsonBytes:2*1024*1024,contracts:150,documents:20});
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function reject(message) { const error = new Error(message); error.name = 'ContractImportError'; throw error; }
function keys(value, allowed, label) {
  if (!isObject(value)) reject(label+' : objet attendu.');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) reject(label+' : champ non autorisé « '+key+' ».');
}
function text(value, label, max=2000, required=false) {
  if (value === undefined || value === null) { if (required) reject(label+' : texte obligatoire.'); return ''; }
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) reject(label+' : texte invalide ou trop long.');
  const result=value.trim(); if (required && !result) reject(label+' : texte obligatoire.'); return result;
}
function identifier(value, label) {
  const result=text(value,label,120,true);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(result)) reject(label+' : identifiant stable invalide.');
  return result;
}
function date(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) reject(label+' : date ISO YYYY-MM-DD attendue.');
  const year=Number(value.slice(0,4)),month=Number(value.slice(5,7)),day=Number(value.slice(8,10));
  const days=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month-1]) reject(label+' : date invalide.');
  return value;
}
function enumeration(value, options, fallback, label) {
  if (value === undefined || value === null) return fallback;
  if (!options.includes(value)) reject(label+' : valeur invalide.'); return value;
}
function array(value, label, max=100) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max) reject(label+' : liste invalide ou trop longue.'); return value;
}
function unique(values, label, token=value=>value) {
  const seen=new Set(); for (const value of values) { const key=token(value); if (seen.has(key)) reject(label+' : identifiant ou chemin en doublon.'); seen.add(key); } return values;
}
function duration(value, label, units, fallback, minimum) {
  if (value === undefined || value === null) return {value:null,unit:fallback};
  keys(value,['value','unit'],label);
  const amount=value.value ?? null;
  if (amount !== null && (!Number.isSafeInteger(amount) || amount < minimum)) reject(label+' : valeur entière invalide.');
  if (amount !== null && !units.includes(value.unit)) reject(label+' : unité explicitement connue obligatoire avec une valeur.');
  return {value:amount,unit:enumeration(value.unit,units,fallback,label+' unité')};
}

/* A path is canonicalized identically in JSON and the ZIP directory. No URL,
   escape, invisible control, hidden segment or ambiguous separator is accepted. */
export function safeContractPath(value) {
  if (typeof value !== 'string' || !value || value.length > 500 || value.trim() !== value ||
      /[\\\u0000-\u001f\u007f%?#:\u2044\u2215\uff0f\uff3c\ufe68\uff0e]/u.test(value) || value.startsWith('/') || value.startsWith('~')) reject('Chemin de document non autorisé.');
  const normalized=value.normalize('NFC'),parts=normalized.split('/');
  if (parts.at(-1) === '') parts.pop();
  if (!parts.length || parts.some(part=>!part || part==='.' || part==='..' || part.startsWith('.') || part.trim()!==part)) reject('Chemin de document ambigu ou dangereux.');
  return parts.join('/')+(normalized.endsWith('/')?'/':'');
}

function documentName(value, path) {
  const supplied=text(value,'Nom du document',240,true);
  let name;
  try { name=safeContractPath(value); } catch { reject('Nom du document : nom de fichier seul et sûr attendu, sans chemin ni caractère de contrôle.'); }
  if (supplied!==value || name.includes('/') || /\p{Cf}/u.test(name)) reject('Nom du document : nom de fichier seul et sûr attendu, sans chemin ni caractère de contrôle.');
  const family=input=>input.split('.').at(-1).toLowerCase().replace(/^jpeg$/u,'jpg');
  if (!['pdf','png','jpg','webp'].includes(family(name)) || family(name)!==family(path)) reject('Nom du document : extension PDF, JPEG, PNG ou WebP correspondant au type du chemin obligatoire.');
  return name;
}

const contractKeys=['version','type','scope','equipmentIds','effectiveDate','autoRenewal','renewalDuration','notice','renonDate','renonMethod','reminders','amount','periodicity','terminationConditions','provenance','uncertainties'];
function metadata(raw, documents) {
  raw=raw ?? {}; keys(raw,contractKeys,'Métadonnées du contrat');
  if (raw.version !== undefined && raw.version !== 1) reject('Métadonnées du contrat : version 1 attendue.');
  const equipmentIds=unique(array(raw.equipmentIds,'Équipements').map(value=>identifier(value,'Équipement')),'Équipements');
  const scope=enumeration(raw.scope,['house','equipment'],'house','Périmètre');
  if (scope==='equipment' && !equipmentIds.length) reject('Périmètre équipements : sélectionner au moins un identifiant.');
  if (scope==='house' && equipmentIds.length) reject('Périmètre maison : la liste des équipements doit être vide.');
  const reminders=raw.reminders===undefined || raw.reminders===null ? [90,30,7] : unique(array(raw.reminders,'Rappels',20).map(value=>{
    if (!Number.isSafeInteger(value) || value < 0) reject('Rappel : entier positif ou nul attendu.'); return value;
  }),'Rappels');
  const amount=raw.amount ?? null;
  if (amount !== null && (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0)) reject('Montant : nombre fini positif ou nul, ou null attendu.');
  const provenance=array(raw.provenance,'Provenance').map(item=>{
    keys(item,['field','documentId','pages','passage'],'Provenance');
    const documentId=item.documentId===undefined || item.documentId===null ? null : identifier(item.documentId,'Source de provenance');
    if (documentId !== null && !documents.some(document=>document.id===documentId)) reject('Provenance : référence à un document source absent.');
    const pages=unique(array(item.pages,'Pages source',100).map(page=>{
      if (!Number.isSafeInteger(page) || page < 1) reject('Provenance : numéro de page entier supérieur à zéro attendu.'); return page;
    }),'Pages source');
    return {field:text(item.field,'Champ de provenance',120,true),documentId,pages,passage:text(item.passage,'Passage source',4000)};
  });
  return {version:1,type:text(raw.type,'Type de contrat',80)||'other',scope,equipmentIds,effectiveDate:date(raw.effectiveDate,'Prise d’effet'),autoRenewal:enumeration(raw.autoRenewal,['yes','no','unknown'],'unknown','Reconduction automatique'),renewalDuration:duration(raw.renewalDuration,'Durée de reconduction',['months','years'],'months',1),notice:duration(raw.notice,'Préavis',['days','months'],'days',0),renonDate:date(raw.renonDate,'Date limite de renon'),renonMethod:text(raw.renonMethod,'Modalités du renon',4000),reminders,amount,periodicity:text(raw.periodicity,'Périodicité',160),terminationConditions:text(raw.terminationConditions,'Conditions de résiliation',10000),provenance,uncertainties:array(raw.uncertainties,'Incertitudes').map(value=>text(value,'Incertitude',2000,true))};
}

export function parseContractManifest(value) {
  if (typeof value === 'string') {
    if (new TextEncoder().encode(value).length > CONTRACT_FORMAT_LIMITS.jsonBytes) reject('JSON trop volumineux : 2 Mo maximum.');
    try { value=JSON.parse(value.replace(/^\ufeff/u,'')); } catch { reject('Le manifeste ne contient pas un JSON valide.'); }
  }
  keys(value,['format','version','contracts'],'Manifeste');
  if (value.format!=='dobby-contracts' || value.version!==1) reject('Format attendu : dobby-contracts, version 1.');
  if (!Array.isArray(value.contracts) || !value.contracts.length || value.contracts.length>CONTRACT_FORMAT_LIMITS.contracts) reject('Le manifeste doit contenir entre 1 et 150 contrats.');
  const documentIds=new Set(),paths=new Set();
  const contracts=value.contracts.map(raw=>{
    keys(raw,['id','title','provider','reference','date','deadline','note','contract','documents'],'Contrat');
    const documents=array(raw.documents,'Documents',CONTRACT_FORMAT_LIMITS.documents).map(document=>{
      keys(document,['id','path','name','kind'],'Document');
      const id=identifier(document.id,'Identifiant du document'),path=safeContractPath(document.path);
      if (!/^originals\/.+\.(pdf|png|jpe?g|webp)$/iu.test(path)) reject('Document : chemin originals/ vers un PDF, JPEG, PNG ou WebP attendu.');
      if (documentIds.has(id) || paths.has(path.toLowerCase())) reject('Document : identifiant ou chemin en doublon.');
      documentIds.add(id); paths.add(path.toLowerCase());
      return {id,path,name:documentName(document.name,path),kind:enumeration(document.kind,['contract','amendment','terms','correspondence','other'],'other','Nature du document')};
    });
    return {id:identifier(raw.id,'Identifiant du contrat'),title:text(raw.title,'Nom du contrat',140,true),provider:text(raw.provider,'Organisme',240),reference:text(raw.reference,'Référence',240),date:date(raw.date,'Date du contrat'),deadline:date(raw.deadline,'Prochaine échéance'),note:text(raw.note,'Notes',10000),contract:metadata(raw.contract,documents),documents};
  });
  unique(contracts,'Contrats',contract=>contract.id);
  return {format:'dobby-contracts',version:1,contracts};
}

export const externalPrompt=`Tu m’aides à préparer mes contrats et assurances pour DOBBY. Je vais transmettre progressivement des PDF, images, pages et contrats successifs dans cette même conversation. Maintiens un registre cumulatif de TOUS les contrats reçus. Regroupe les pages d’un même contrat, distingue les contrats distincts, leurs avenants, conditions générales et courriers. Un avenant complète le contrat concerné : ne remplace jamais silencieusement son original ou une révision. Après chaque lot, indique brièvement les documents reçus et demande si j’ai d’autres pièces. Attends que je dise exactement « J'ai terminé » avant de générer le livrable final.
Transcris les clauses effectivement disponibles : type, objet, fournisseur/assureur, référence, montant et périodicité, prise d’effet, prochaine échéance, reconduction, durée, préavis, modalités et conditions particulières du renon. Ne confonds pas échéance, renouvellement et date limite de renon. Ne jamais inventer un montant, une garantie, un délai, une date ou un équipement. Les nombres/dates inconnus valent null, les textes inconnus "", les listes sans donnée []. autoRenewal vaut "unknown" si la clause est absente ou ambiguë. N’invente ni préavis standard, ni date calculée : renonDate contient seulement une date limite explicitement donnée par une source ; DOBBY peut calculer une proposition distincte à partir des clauses connues. Une proposition de calendrier ne prouve pas la validité juridique d’un renon. Signale les contradictions, sources absentes et ambiguïtés dans uncertainties.
La sortie prioritaire est un ZIP unique réel et téléchargeable contenant exactement un manifeste UTF-8 contracts.json à la racine et les documents originaux réellement disponibles dans originals/. N’invente aucun fichier, URL ou lien de téléchargement. Ne restitue les originaux que si tu les possèdes réellement et peux les joindre. Si tu ne peux pas produire un véritable ZIP ou récupérer les originaux, dis-le honnêtement et fournis le JSON seul compatible, avec documents:[] et les absences signalées dans uncertainties ; conserve alors les citations disponibles avec documentId:null. Ne mets aucun fichier base64 dans le JSON. Je sélectionnerai le fichier dans DOBBY ; aucun appel IA, envoi ou transfert automatique n’existe.
Le manifeste exact est {"format":"dobby-contracts","version":1,"contracts":[...]}. Chaque contrat suit ce MODÈLE DE STRUCTURE ; remplace les textes d’exemple par les faits connus, sans ajouter de clés :
{"id":"contrat-identifiant-stable","title":"Nom du contrat","provider":"","reference":"","date":null,"deadline":null,"note":"","contract":{"version":1,"type":"other","scope":"house","equipmentIds":[],"effectiveDate":null,"autoRenewal":"unknown","renewalDuration":{"value":null,"unit":"months"},"notice":{"value":null,"unit":"days"},"renonDate":null,"renonMethod":"","reminders":[90,30,7],"amount":null,"periodicity":"","terminationConditions":"","provenance":[],"uncertainties":[]},"documents":[]}
id est stable, unique et limité à 120 caractères ASCII lettres/chiffres/points/tirets/soulignés, commençant par une lettre ou un chiffre. title est obligatoire et limité à 140 caractères : demande le nom si aucun ne peut être identifié. Les dates sont de vraies dates YYYY-MM-DD ou null. date conserve la date documentaire connue ; effectiveDate est la prise d’effet ; deadline la prochaine échéance. type vaut maintenance, insurance, energy, subscription, other ou un autre libellé explicite. scope vaut house pour toute la maison, ou equipment seulement si les identifiants d’équipements réellement fournis par moi sont connus ; equipmentIds contient ces identifiants stables. N’en crée pas : note les équipements à relier dans uncertainties. autoRenewal vaut yes/no/unknown. renewalDuration.value est un entier strictement positif ou null et unit months/years ; notice.value est un entier positif ou nul ou null et unit days/months (mois calendaires). reminders est une liste d’entiers positifs ou nuls, sans doublons, exprimés en jours avant le renon ; [90,30,7] est la proposition modifiable de DOBBY, sans promettre une notification. amount est un nombre fini positif ou nul, ou null ; zéro reste zéro. periodicity et terminationConditions sont des textes libres fidèles aux sources.
Pour chaque citation fiable, ajoute contract.provenance:[{"field":"notice","documentId":"document-original-1","pages":[2],"passage":"Passage exact utile"}]. field désigne le champ justifié, pages contient les numéros de pages à partir de 1, passage cite le texte lorsqu’il est lisible. documentId désigne une pièce de ce contrat, ou null si le document n’est pas joignable ; ne fabrique pas de référence. uncertainties est une liste de textes, jamais un objet.
Pour chaque original effectivement joint au ZIP, ajoute documents:[{"id":"document-original-1","path":"originals/contrat-1.pdf","name":"Contrat original.pdf","kind":"contract"}]. kind vaut contract/amendment/terms/correspondence/other. name est un nom de fichier seul, sûr, sans séparateur de chemin, contrôle ou segment caché, avec une extension obligatoire correspondant au type de path ; seules les extensions .jpg et .jpeg sont interchangeables. Identifiants des documents et chemins uniques dans tout le lot, lien explicite à leur contrat ; si un même original couvre plusieurs contrats, joins des copies avec des chemins et identifiants distincts, sans modifier le contenu. Chaque fichier référencé doit exister et tout fichier de originals/ doit être référencé. Chemins relatifs sûrs uniquement, sans ../, barre oblique inverse, URL, encodage %, segment caché ou chemin absolu. Types réels autorisés : PDF, JPEG, PNG, WebP non animé. Aucun chemin local, key, cloudPath, attachment ni autre référence de stockage DOBBY ne doit être ajouté.
Limites : 150 contrats, 20 pièces par contrat, JSON 2 Mo, ZIP 40 Mo, 80 Mo décompressés au total, 10 Mo par pièce, 200 entrées ZIP dossiers inclus ; expansion au plus 100:1 avec une tolérance de 1 Ko, images au plus 40 mégapixels et 16 000 pixels par côté. Utilise un ZIP standard stocké ou deflate, non chiffré, sans ZIP64 ni liens symboliques. La sortie finale inclut tous les contrats accumulés, leurs sources disponibles et les incertitudes, après « J'ai terminé ». L’importation dans DOBBY passera ensuite par un aperçu modifiable, des choix de doublons et une confirmation explicite de ma part.`;
