/* FAM-10/11/12/15: canonical member fields and operation policy. No persistence.
 * Demo permissions are deliberately not a server authorization guarantee. */
window.DobbyFamilyMemberPolicy=(()=>{
 'use strict';
 const categories=Object.freeze(['parent','baby','child','pet']);
 const category=member=>categories.includes(member?.memberCategory)?member.memberCategory:null;
 const reason='Modification suspendue : le compte connecté n’est pas relié à un membre avec des droits parentaux vérifiés. Le serveur doit fournir cette association et contrôler les écritures.';
 function permissions(member,context={}){
  const denied={canEdit:false,canMagic:false,canCreate:false,reason};
  if(context.demo!==true)return denied;
  const actor=context.members?.find(row=>row.id===context.actorId),role=category(actor);
  if(!actor||!role)return{...denied,reason:'Choisissez une persona fictive dont la catégorie est explicitement renseignée.'};
  if(role==='baby'||role==='pet')return{...denied,reason:'Les bébés et les animaux ne possèdent pas de session autonome.'};
  if(role==='child')return{...denied,canMagic:!!member&&member.id===actor.id,reason:'Un enfant peut uniquement confirmer sa propre Maison et son propre Patronus par les questionnaires magiques.'};
  const own=!!member&&member.id===actor.id,dependent=['baby','child','pet'].includes(category(member)),allowed=own||dependent;
  return{canEdit:allowed,canMagic:allowed,canCreate:true,reason:allowed?'Droits limités à cette démonstration fictive.':member?'Un parent peut modifier sa fiche et celles des enfants, bébés et animaux, pas celle d’un autre parent ni une fiche sans catégorie.':'Création fictive réservée aux enfants, bébés et animaux.'};
 }
 function assertWrite(existing,values,context,{magicResult=false}={}){
  const p=permissions(existing,context);
  if(!existing){if(!p.canCreate)throw Error(p.reason);if(!['baby','child','pet'].includes(values.memberCategory))throw Error('La création directe est réservée aux bébés, enfants et animaux. Les parents rejoignent le foyer par invitation.');}
  else if(!p.canEdit){
   if(!magicResult||!p.canMagic)throw Error(p.reason);
   // A child has no manual identity/avatar/category/notes capability, even in
   // a form carrying otherwise valid E06 algorithm metadata.
   const magic=new Set(['magicHouseId','magicHouseAlgorithm','magicPatronusId','magicPatronusAlgorithm','magicCeremony']);
   const baseline={name:existing.name,birthdate:existing.birthdate||'',avatar:existing.avatar||'👤'};
   for(const[key,value]of Object.entries(values))if(!magic.has(key)&&(!Object.hasOwn(baseline,key)||value!==baseline[key]))throw Error(p.reason);
  }
  if(!magicResult&&['magicHouseId','magicPatronusId','magicHouseAlgorithm','magicPatronusAlgorithm','magicCeremony'].some(key=>Object.hasOwn(values,key)))throw Error('La Maison et le Patronus se découvrent uniquement par les questionnaires magiques E06. Aucun résultat ne peut être choisi manuellement.');
  if(existing&&Object.hasOwn(values,'memberCategory')&&values.memberCategory!==existing.memberCategory&&(category(existing)==='parent'||values.memberCategory==='parent'))throw Error('Le statut parental ne peut pas être accordé ou retiré par ce formulaire.');
  return p;
 }
 function text(values,key,max){if(!Object.hasOwn(values,key))return undefined;if(typeof values[key]!=='string'||values[key].length>max)throw Error('Champ du membre invalide : '+key+'.');return values[key].trim();}
 const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(new Date(value+'T12:00:00Z').valueOf())&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 function prepare(existing,values,patchIdentity){
  const source={...values},result={...existing};
  for(const[field,alias]of [['firstName','profileFirstName'],['lastName','profileLastName']])if(Object.hasOwn(source,field)){if(Object.hasOwn(source,alias)&&source[alias]!==source[field])throw Error('Les champs d’identité se contredisent.');source[alias]=text(source,field,80);delete source[field];}
  const structured=['profileFirstName','profileLastName'].some(key=>Object.hasOwn(source,key));
  const patched=patchIdentity(result,source);
  const name=text(source,'name',80);
  if(structured){const first=patched.firstName||'',last=patched.lastName||'',joined=[first,last].filter(Boolean).join(' ');if(!first||joined.length>80)throw Error('Indiquez un prénom et un nom de 80 caractères maximum au total.');if(name&&name!==joined)throw Error('Le nom du membre doit correspondre au prénom et au nom renseignés.');patched.name=joined;}
  else if(name!==undefined){if(!name)throw Error('Indiquez le nom du membre.');if(existing?.firstName&&name!==[existing.firstName,existing.lastName||''].filter(Boolean).join(' '))throw Error('Modifiez le prénom et le nom dans les champs d’identité pour préserver leur cohérence.');patched.name=name;}
  if(!patched.name)throw Error('Indiquez le prénom du membre.');
  for(const[key,max]of [['nickname',80],['notes',4000],['species',80]]){const value=text(source,key,max);if(value!==undefined)patched[key]=value;}
  if(Object.hasOwn(source,'memberCategory')){if(!categories.includes(source.memberCategory))throw Error('Catégorie du membre invalide.');patched.memberCategory=source.memberCategory;}
  if(Object.hasOwn(source,'birthdate')){const value=text(source,'birthdate',20);if(value&&!validDate(value)){if(value!==existing?.birthdate)throw Error('Date de naissance invalide.');}/* A native date input cannot display a legacy invalid date. Preserve it unless the caller explicitly clears it. */patched.birthdate=!value&&existing?.birthdate&&!validDate(existing.birthdate)&&source.clearBirthdate!=='true'?existing.birthdate:value;}
  if(Object.hasOwn(source,'avatar')){const value=text(source,'avatar',80);patched.avatar=value||'👤';}
  return patched;
 }
 // This is an eligibility interface only: the existing Cuisine portion inputs
 // remain canonical. No automatic head count or age transition is performed.
 const mealEligibility=member=>category(member)==='child'?'child':category(member)==='parent'?'adult':['baby','pet'].includes(category(member))?'excluded':'unknown';
 return Object.freeze({categories,category,permissions,assertWrite,prepare,mealEligibility,validDate});
})();
