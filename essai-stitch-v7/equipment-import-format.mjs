/* Local transport validation only: no household writes, file reads, uploads or AI. */
export const EQUIPMENT_FORMAT_LIMITS=Object.freeze({jsonBytes:2*1024*1024,equipment:150,documents:20,maintenancePlans:100,sources:100});
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const currencies=new Set('AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BOV BRL BSD BTN BWP BYN BZD CAD CDF CHE CHF CHW CLF CLP CNY COP COU CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MXV MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD USN UYI UYU UYW UZS VED VES VND VUV WST XAF XAG XAU XBA XBB XBC XBD XCD XCG XDR XOF XPD XPF XPT XSU XTS XUA XXX YER ZAR ZMW ZWG ZWL'.split(' '));
function reject(message){const error=new Error(message);error.name='EquipmentImportError';error.code='INVALID_MANIFEST';throw error;}
function keys(value,allowed,label){if(!isObject(value))reject(label+' : objet attendu.');for(const key of Object.keys(value))if(!allowed.includes(key))reject(label+' : champ non autorisé « '+key+' ».');}
function text(value,label,max=2000,required=false){
  if(value===undefined||value===null){if(required)reject(label+' : texte obligatoire.');return null;}
  if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))reject(label+' : texte invalide ou trop long.');
  const result=value.trim();if(required&&!result)reject(label+' : texte obligatoire.');return result||null;
}
function identifier(value,label){const result=text(value,label,120,true);if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(result))reject(label+' : identifiant stable invalide.');return result;}
function date(value,label){
  if(value===undefined||value===null)return null;
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/u.test(value))reject(label+' : date ISO YYYY-MM-DD attendue.');
  const year=Number(value.slice(0,4)),month=Number(value.slice(5,7)),day=Number(value.slice(8,10)),days=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  if(year<1||month<1||month>12||day<1||day>days[month-1])reject(label+' : date invalide.');return value;
}
function enumeration(value,options,fallback,label){if(value===undefined||value===null)return fallback;if(!options.includes(value))reject(label+' : valeur invalide.');return value;}
function array(value,label,max=100){if(value===undefined||value===null)return[];if(!Array.isArray(value)||value.length>max)reject(label+' : liste invalide (maximum '+max+').');return value;}
function unique(values,label,token=value=>value){const seen=new Set();for(const value of values){const key=token(value);if(seen.has(key))reject(label+' : identifiant ou chemin en doublon.');seen.add(key);}return values;}
function optionalPath(value){if(value===undefined||value===null)return null;const path=safeEquipmentPath(value);if(!/^documents\/.+\.(pdf|png|jpe?g|webp)$/iu.test(path))reject('Source : chemin documents/ vers un PDF, JPEG, PNG ou WebP attendu.');return path;}
function url(value){
  if(value===undefined||value===null)return null;
  const result=text(value,'URL',4000,true);if(/\s|\\|\p{Cf}/u.test(result))reject('URL de source invalide.');
  let parsed;try{parsed=new URL(result);}catch{reject('URL de source invalide.');}
  if(!['https:','http:'].includes(parsed.protocol)||!parsed.hostname||parsed.username||parsed.password)reject('URL de source : lien HTTP(S) sans identifiants attendu.');return result;
}
/* JSON and ZIP use the same NFC canonical path. No extraction onto a filesystem. */
export function safeEquipmentPath(value){
  if(typeof value!=='string'||!value||value.length>500||value.trim()!==value||/[\\\u0000-\u001f\u007f%?#:\u2044\u2215\uff0f\uff3c\ufe68\uff0e\p{Cf}]/u.test(value)||value.startsWith('/')||value.startsWith('~'))reject('Chemin de document non autorisé.');
  const normalized=value.normalize('NFC'),parts=normalized.split('/');if(parts.at(-1)==='')parts.pop();
  if(!parts.length||parts.some(part=>!part||part==='.'||part==='..'||part.startsWith('.')||part.trim()!==part||part.endsWith('.')||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part)))reject('Chemin de document ambigu ou dangereux.');
  return parts.join('/')+(normalized.endsWith('/')?'/':'');
}
function interval(value){
  if(value===undefined||value===null)return{value:null,unit:null};keys(value,['value','unit'],'Fréquence');const amount=value.value??null,unit=enumeration(value.unit,['months','years'],null,'Unité de fréquence');
  if(amount!==null&&(!Number.isSafeInteger(amount)||amount<1||unit===null))reject('Fréquence : entier strictement positif et unité months/years attendus.');return{value:amount,unit};
}
function sourceRefs(value,sources){return unique(array(value,'Références source').map(ref=>{const id=identifier(ref,'Référence source');if(!sources.some(source=>source.id===id))reject('Référence source inconnue : '+id);return id;}),'Références source');}
function purchase(value){
  const raw=value??{};keys(raw,['date','amount','currency','seller','invoiceReference'],'Achat');const amount=raw.amount??null;
  if(amount!==null&&(typeof amount!=='number'||!Number.isFinite(amount)||amount<0))reject('Montant : nombre fini positif ou nul, ou null attendu.');
  const currency=text(raw.currency,'Monnaie',3);if(currency!==null&&!currencies.has(currency))reject('Monnaie : code ISO 4217 valide attendu.');
  return{date:date(raw.date,"Date d'achat"),amount,currency,seller:text(raw.seller,'Vendeur',240),invoiceReference:text(raw.invoiceReference,'Référence facture',240)};
}
function warranty(value){const raw=value??{};keys(raw,['endDate','details'],'Garantie');return{endDate:date(raw.endDate,'Fin de garantie'),details:text(raw.details,'Garantie',10000)};}
function parseSource(raw){
  keys(raw,['id','origin','title','path','url','page','retrievedAt','note'],'Source');const page=raw.page??null;if(page!==null&&(!Number.isSafeInteger(page)||page<1))reject('Source : numéro de page entier supérieur à zéro attendu.');
  return{id:identifier(raw.id,'Identifiant source'),origin:enumeration(raw.origin,['user_invoice','user_photo','user_manual','manufacturer','official_distributor','other','unknown'],'unknown','Origine source'),title:text(raw.title,'Titre source',240),path:optionalPath(raw.path),url:url(raw.url),page,retrievedAt:date(raw.retrievedAt,'Date de consultation'),note:text(raw.note,'Note source',10000)};
}
function parseDocument(raw,sources){
  keys(raw,['id','kind','title','path','url','official','sourceRefs'],'Document');const path=optionalPath(raw.path),link=url(raw.url),official=raw.official??null;
  if(!path&&!link)reject('Document : chemin joint ou URL réelle obligatoire.');if(official!==null&&typeof official!=='boolean')reject('Document : official doit être true, false ou null.');
  return{id:identifier(raw.id,'Identifiant document'),kind:enumeration(raw.kind,['purchase_invoice','technical_sheet','manual','installation','warranty','maintenance_invoice','inspection','other'],'other','Nature du document'),title:text(raw.title,'Titre document',240),path,url:link,official,sourceRefs:sourceRefs(raw.sourceRefs,sources)};
}
function parsePlan(raw,sources){
  keys(raw,['importKey','title','interval','lastKnownDate','nextDateOverride','overrideReason','usualProvider','notes','sourceRefs'],"Programme d'entretien");
  return{importKey:identifier(raw.importKey,'Identifiant programme'),title:text(raw.title,'Titre programme',160,true),interval:interval(raw.interval),lastKnownDate:date(raw.lastKnownDate,'Dernier entretien connu'),nextDateOverride:date(raw.nextDateOverride,'Prochaine échéance explicite'),overrideReason:text(raw.overrideReason,"Motif d'échéance",4000),usualProvider:text(raw.usualProvider,'Prestataire habituel',240),notes:text(raw.notes,'Notes programme',10000),sourceRefs:sourceRefs(raw.sourceRefs,sources)};
}
export function parseEquipmentManifest(value){
  if(typeof value==='string'){
    if(new TextEncoder().encode(value).length>EQUIPMENT_FORMAT_LIMITS.jsonBytes)reject('JSON trop volumineux : 2 Mo maximum.');
    try{value=JSON.parse(value.replace(/^\ufeff/u,''));}catch{reject('Le manifeste ne contient pas un JSON valide.');}
  }
  keys(value,['format','version','equipment'],'Manifeste');if(value.format!=='dobby-equipment'||value.version!==1)reject('Format attendu : dobby-equipment, version 1.');
  if(!Array.isArray(value.equipment)||!value.equipment.length||value.equipment.length>EQUIPMENT_FORMAT_LIMITS.equipment)reject('Le manifeste doit contenir entre 1 et 150 équipements.');
  const equipment=value.equipment.map(raw=>{
    keys(raw,['importKey','name','category','brand','model','serialNumber','manufacturerReference','place','purchase','warranty','maintenancePlans','documents','sources','notes','missing','uncertain'],'Équipement');
    const sources=unique(array(raw.sources,'Sources',EQUIPMENT_FORMAT_LIMITS.sources).map(parseSource),'Sources',source=>source.id),documents=unique(array(raw.documents,'Documents',EQUIPMENT_FORMAT_LIMITS.documents).map(document=>parseDocument(document,sources)),'Documents',document=>document.id),maintenancePlans=unique(array(raw.maintenancePlans,'Programmes',EQUIPMENT_FORMAT_LIMITS.maintenancePlans).map(plan=>parsePlan(plan,sources)),'Programmes',plan=>plan.importKey);
    unique(documents.filter(document=>document.path!==null),'Chemins documents',document=>document.path.toLowerCase());
    const uncertain=array(raw.uncertain,'Incertitudes').map(item=>text(item,'Incertitude',2000,true));
    for(const plan of maintenancePlans)if(!plan.sourceRefs.some(id=>sources.some(source=>source.id===id&&(source.path||source.url||source.title||source.note)))){const message='Programme « '+plan.title+' » : provenance absente — À vérifier.';if(!uncertain.includes(message))uncertain.push(message);}
    if(uncertain.length>100)reject('Incertitudes : maximum 100 messages, signalements de provenance inclus.');
    return{importKey:identifier(raw.importKey,'Identifiant équipement'),name:text(raw.name,"Nom de l'équipement",160,true),category:text(raw.category,'Catégorie',160),brand:text(raw.brand,'Marque',240),model:text(raw.model,'Modèle',240),serialNumber:text(raw.serialNumber,'Numéro de série',240),manufacturerReference:text(raw.manufacturerReference,'Référence constructeur',240),place:text(raw.place,'Emplacement',160),purchase:purchase(raw.purchase),warranty:warranty(raw.warranty),maintenancePlans,documents,sources,notes:text(raw.notes,'Notes équipement',10000),missing:array(raw.missing,'Informations manquantes').map(item=>text(item,'Information manquante',2000,true)),uncertain};
  });
  unique(equipment,'Équipements',item=>item.importKey);return{format:'dobby-equipment',version:1,equipment};
}
