/* External AI equipment exchange. Parsing and review stay on this device. */
(()=>{
 'use strict';
 const R=window.DobbyRegister,E=window.DobbyFamilyStitchEngine,base=document.currentScript.src;
 let F,Z,M,promptText='',prepared=null,message='',busy=false,loading=false,generation=0;
 const previews=new Set();
 const ready=Promise.all([
  import(new URL('equipment-import-format.mjs',base)),
  import(new URL('equipment-import-zip.mjs',base)),
  import(new URL('house-model.mjs',base)),
  fetch(new URL('equipment-import-prompt.txt',base)).then(response=>{if(!response.ok)throw Error('Le prompt ne peut pas être chargé. Rechargez la page.');return response.text();})
 ]).then(([format,zip,model,prompt])=>{F=format;Z=zip;M=model;promptText=prompt;});
 ready.catch(()=>{});
 const clone=value=>JSON.parse(JSON.stringify(value));
 const same=(a,b)=>String(a??'').normalize('NFKC').trim().toLocaleLowerCase('fr')===String(b??'').normalize('NFKC').trim().toLocaleLowerCase('fr');
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const present=value=>value!==null&&value!==undefined&&value!=='';
 const rows=()=>E.read().state.houseItems||[];
 function native(){const api=E.win().DobbyFamilyHouse;if(!api)throw Error('Le registre des équipements se charge. Réessayez dans un instant.');return api;}
 async function nativeReady(){await ready;await R.until(()=>E.win().DobbyHouseReady||E.win().DobbyFamilyHouse);if(E.win().DobbyHouseReady)await E.win().DobbyHouseReady;native().assertWritable();}
 const stateKey=value=>typeof value==='string'?value:JSON.stringify(value);
 const stale=candidate=>stateKey(native().registrySnapshot())!==candidate.state;
 const staleMessage='Le foyer ou le registre a changé depuis la lecture. Sélectionnez à nouveau le fichier pour vérifier un nouvel aperçu.';
 function duplicate(a,b){return Boolean(a.brand&&a.model&&a.serialNumber&&b.brand&&b.model&&b.serialNumber&&same(a.brand,b.brand)&&same(a.model,b.model)&&same(a.serialNumber,b.serialNumber));}
 function matches(entry,existing){return existing.filter(row=>Array.isArray(row.equipmentImportKeys)&&row.equipmentImportKeys.includes(entry.importKey)||row.equipmentImportKey===entry.importKey||duplicate(entry,row));}
 function paths(entry){return [...new Set([...entry.documents,...entry.sources].map(item=>item.path).filter(Boolean))];}
 async function prepare(file){
  await nativeReady();
  if(!file||!Number.isFinite(file.size)||file.size<=0)throw Error('Choisissez un fichier JSON ou ZIP non vide.');
  const expected=native().registrySnapshot(),state=stateKey(expected);let manifest,files=new Map();
  if(/\.zip$/i.test(file.name)){
   if(file.size>Z.EQUIPMENT_ZIP_LIMITS.archiveBytes)throw Error('ZIP trop volumineux : 40 Mo maximum.');
   ({manifest,files}=await Z.readEquipmentZip(new Uint8Array(await file.arrayBuffer())));
  }else{
   if(!/\.json$/i.test(file.name)||file.size>F.EQUIPMENT_FORMAT_LIMITS.jsonBytes)throw Error('Choisissez un JSON de 2 Mo maximum ou un ZIP de 40 Mo maximum.');
   manifest=F.parseEquipmentManifest(await file.text());
   if(manifest.equipment.some(entry=>paths(entry).length))throw Error('Les fichiers référencés dans les documents ou les sources sont absents du JSON. Importez le ZIP contenant ces pièces ; un JSON seul peut contenir des liens URL sans chemin local.');
  }
  if(stateKey(native().registrySnapshot())!==state)throw Error(staleMessage);
  const existing=clone(rows());
  return {fileName:file.name,expected,state,files,existing,entries:manifest.equipment.map((entry,index)=>{
   const found=matches(entry,existing),within=manifest.equipment.filter((other,i)=>i!==index&&duplicate(entry,other));
   return {source:clone(entry),entry:clone(entry),matches:found.map(row=>({id:row.id,name:row.name})),within:within.map(other=>other.name),choice:found.length||within.length?'skip':'add',targetId:'',nativeId:crypto.randomUUID(),planIds:new Map(entry.maintenancePlans.map(plan=>[plan.importKey,crypto.randomUUID()])),sourceIds:new Map()};
  })};
 }
 function additive(old,incoming){const result=clone(Array.isArray(old)?old:[]);for(const item of incoming||[])if(!result.some(value=>equal(value,item)))result.push(clone(item));return result;}
 function mergeNonempty(old,incoming){
  const result=clone(old&&typeof old==='object'&&!Array.isArray(old)?old:{});
  for(const [key,value]of Object.entries(incoming||{})){
   if(!present(value)||Array.isArray(value)&&!value.length)continue;
   result[key]=Array.isArray(value)?additive(result[key],value):typeof value==='object'?mergeNonempty(result[key],value):value;
  }
  return result;
 }
 const sourceFields=['origin','title','path','url','page','retrievedAt','note'];
 const sourceFacts=source=>sourceFields.map(key=>source[key]??null);
 function nativeProvenance(item,entry,existing){
  const result=clone(entry),known=Array.isArray(existing?.sources)?existing.sources:[],refs=new Map();
  result.sources=entry.sources.map(source=>{
   const exact=known.find(prior=>known.filter(value=>value.id===prior.id).length===1&&(prior.importSourceId||prior.id)===source.id&&equal(sourceFacts(prior),sourceFacts(source)));
   let id=exact?.id||source.id;
   if(!exact&&known.some(prior=>prior.id===id)){
    if(!item.sourceIds.has(source.id))item.sourceIds.set(source.id,'source-'+crypto.randomUUID());
    id=item.sourceIds.get(source.id);
   }
   refs.set(source.id,id);
   return exact?clone(exact):{...clone(source),id,importSourceId:source.id,equipmentImportKey:entry.importKey};
  });
  result.maintenancePlans=result.maintenancePlans.map(plan=>({...plan,equipmentImportKey:entry.importKey,sourceRefs:plan.sourceRefs.map(id=>refs.get(id))}));
  result.documents=result.documents.map(document=>({...document,equipmentImportKey:entry.importKey,importDocumentId:document.id,sourceRefs:document.sourceRefs.map(id=>refs.get(id))}));
  return result;
 }
 function nativeValues(item,entry,existing){
  entry=nativeProvenance(item,entry,existing);
  const values={};
  if(!existing)values.id=item.nativeId;
  const put=(key,value)=>{if(present(value)&&!equal(existing?.[key],value))values[key]=clone(value);};
  for(const key of ['name','category','brand','model','serialNumber','manufacturerReference','place','notes'])put(key,entry[key]);
  put('purchased',entry.purchase.date);put('warranty',entry.warranty.endDate);
  for(const [key,incoming]of [['purchaseDetails',entry.purchase],['warrantyDetails',entry.warranty]]){
   const merged=mergeNonempty(existing?.[key],incoming);if(Object.keys(merged).length)put(key,merged);
  }
  for(const [key,incoming]of [['sources',entry.sources],['equipmentDocuments',entry.documents],['equipmentImportKeys',[entry.importKey]],['equipmentMissing',entry.missing],['equipmentUncertain',entry.uncertain]]){
   const merged=additive(existing?.[key],incoming);if(merged.length)put(key,merged);
  }
  if(entry.maintenancePlans.length){
   const plans=existing?M.plans(existing):[];
   for(const imported of entry.maintenancePlans){
    const found=plans.find(plan=>plan.importKey===imported.importKey&&(plan.equipmentImportKey===entry.importKey||!plan.equipmentImportKey&&existing?.equipmentImportKeys?.length===1&&existing.equipmentImportKeys[0]===entry.importKey));
    if(found)Object.assign(found,mergeNonempty(found,imported));
    else{
     if(!item.planIds.has(imported.importKey))item.planIds.set(imported.importKey,crypto.randomUUID());
     plans.push({...clone(imported),id:item.planIds.get(imported.importKey)});
    }
   }
   put('maintenancePlans',plans);
  }
  return values;
 }
 function attachmentDescriptors(entry){
  return paths(entry).map(path=>{
   const documents=entry.documents.filter(document=>document.path===path),sources=entry.sources.filter(source=>source.path===path);
   return {path,kind:documents[0]?.kind||'other',sourceRefs:[...new Set([...documents.flatMap(document=>document.sourceRefs),...sources.map(source=>source.id)])],provenance:{equipmentImportKey:entry.importKey,documents:clone(documents),sources:clone(sources)}};
  });
 }
 async function commit(candidate){
  await nativeReady();
  if(!candidate||stale(candidate))throw Error(staleMessage);
  const selected=candidate.entries.filter(item=>item.choice!=='skip');
  if(!selected.length)throw Error('Sélectionnez au moins un équipement à ajouter ou à mettre à jour.');
  const manifest=F.parseEquipmentManifest({format:'dobby-equipment',version:1,equipment:selected.map(item=>item.entry)}),targets=new Set(),work=[];
  for(let index=0;index<selected.length;index++){
   const item=selected[index],entry=manifest.equipment[index];
   if(!['add','update'].includes(item.choice))throw Error('Choisissez Ajouter, Ignorer ou Mettre à jour pour chaque équipement.');
   const existing=item.choice==='update'?rows().find(row=>row.id===item.targetId):null;
   if(item.choice==='update'&&!existing)throw Error('Sélectionnez explicitement l’équipement à mettre à jour.');
   if(existing&&targets.has(existing.id))throw Error('Deux entrées ciblent le même équipement. Conservez une seule mise à jour.');
   if(existing)targets.add(existing.id);
   for(const path of paths(entry))if(!candidate.files.has(path))throw Error('Pièce locale absente : '+path);
   const values=nativeValues(item,entry,existing);
   values.equipmentImportHistory=[...(existing?.equipmentImportHistory||[]),{at:new Date().toISOString(),source:clone(item.source),reviewed:clone(entry)}];
   work.push({action:item.choice,...(existing?{targetId:existing.id}:{}),values,documents:attachmentDescriptors(nativeProvenance(item,entry,existing))});
  }
  // Entire selection and all original bytes are prepared before the one atomic native write.
  const files=new Map(),w=E.win();
  for(const path of new Set(work.flatMap(job=>job.documents.map(document=>document.path)))){
   const source=candidate.files.get(path);files.set(path,new w.File([source.bytes],source.name||path.split('/').pop(),{type:source.type}));
  }
  if(stale(candidate))throw Error(staleMessage);
  const result=await native().importEquipment(work,files,candidate.expected);
  return {added:work.filter(job=>job.action==='add').length,updated:work.filter(job=>job.action==='update').length,result};
 }
 function el(tag,text,cls){const node=document.createElement(tag);if(text!==null&&text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
 function field(container,label,value,change,type='text',options){
  const wrap=el('label',null,'equipment-import-field');wrap.append(el('span',label));
  const input=el(options?'select':type==='textarea'?'textarea':'input');input.className='rg-input';input.setAttribute('aria-label',label);
  if(input.tagName==='INPUT')input.type=type;
  if(options)for(const [key,text]of options)input.add(new Option(text,key));
  input.value=value??'';
  input.addEventListener(options?'change':'input',()=>{change(input.value);const agree=document.getElementById('equipment-ai-agree');if(agree)agree.checked=false;});
  wrap.append(input);container.append(wrap);return input;
 }
 const nullable=value=>value.trim()||null;
 const numeric=value=>value===''?null:Number(value);
 function link(container,url){if(!url)return;const anchor=el('a',url);anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';container.append(anchor,el('p','URL fournie par votre IA ; contenu et correspondance du modèle non vérifiés par DOBBY.','equipment-import-hint'));}
 function localPiece(container,path,candidate){
  if(!path)return;container.append(el('p','Pièce jointe : '+path));const source=candidate.files.get(path);if(!source)return;
  const url=URL.createObjectURL(new Blob([source.bytes],{type:source.type}));previews.add(url);
  const anchor=el('a','Ouvrir la pièce locale');anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';container.append(anchor);
 }
 const origins={user_invoice:'Facture de l’utilisateur',user_photo:'Photo de l’utilisateur',user_manual:'Notice fournie par l’utilisateur',manufacturer:'Fabricant',official_distributor:'Distributeur officiel déclaré',other:'Autre',unknown:'Origine non confirmée'};
 const kinds={purchase_invoice:'Facture d’achat',technical_sheet:'Fiche technique',manual:'Mode d’emploi',installation:'Notice d’installation',warranty:'Garantie',maintenance_invoice:'Facture d’entretien',inspection:'Rapport / attestation',other:'Autre document'};
 function evidence(card,item,candidate){
  const section=el('section',null,'equipment-import-evidence');section.append(el('h3','Sources, documents et points à vérifier'));
  if(item.entry.missing.length){section.append(el('h4','Informations manquantes'));const list=el('ul');for(const text of item.entry.missing)list.append(el('li',text));section.append(list);}
  if(item.entry.uncertain.length){section.append(el('h4','Incertitudes à valider'));const list=el('ul');for(const text of item.entry.uncertain)list.append(el('li',text));section.append(list);}
  section.append(el('h4','Documents'));
  if(!item.entry.documents.length)section.append(el('p','Aucun document annoncé dans cet export.'));
  for(const document of item.entry.documents){
   const part=el('div',null,'equipment-import-source');part.append(el('strong',document.title||kinds[document.kind]),el('p',kinds[document.kind]+' · référence '+document.id));
   part.append(el('p',document.official===true?'Déclaré officiel par l’IA ; à vérifier sur le modèle exact.':document.official===false?'Document déclaré non officiel.':'Caractère officiel non confirmé.'));
   if(document.sourceRefs.length)part.append(el('p','Sources associées : '+document.sourceRefs.join(', ')));
   localPiece(part,document.path,candidate);link(part,document.url);if(!document.path)part.append(el('p','Lien uniquement ; aucun fichier joint.'));section.append(part);
  }
  section.append(el('h4','Provenance précise'));
  if(!item.entry.sources.length)section.append(el('p','Aucune source fournie. Les informations restent à vérifier.'));
  for(const source of item.entry.sources){
   const part=el('div',null,'equipment-import-source');part.append(el('strong',source.title||source.id),el('p','Référence '+source.id+' · '+origins[source.origin]));
   if(source.page!==null)part.append(el('p','Page '+source.page));if(source.retrievedAt)part.append(el('p','Consultation déclarée : '+source.retrievedAt));if(source.note)part.append(el('p',source.note));
   localPiece(part,source.path,candidate);link(part,source.url);section.append(part);
  }
  card.append(section);
 }
 const scalarLabels={name:'Nom',category:'Catégorie',brand:'Marque',model:'Modèle',serialNumber:'N° de série',manufacturerReference:'Référence constructeur',place:'Emplacement',purchased:'Date d’achat',warranty:'Fin de garantie',notes:'Notes',purchaseDetails:'Données d’achat',warrantyDetails:'Conditions de garantie',sources:'Sources',equipmentDocuments:'Documents et liens',equipmentImportKeys:'Référence de cet import',equipmentMissing:'Informations manquantes',equipmentUncertain:'Incertitudes'};
 const detailLabels={date:'Date',amount:'Montant',currency:'Monnaie',seller:'Vendeur',invoiceReference:'Référence de facture',endDate:'Fin',details:'Détails',title:'Intitulé',interval:'Fréquence',lastKnownDate:'Dernière date connue',nextDateOverride:'Échéance explicite',overrideReason:'Motif',usualProvider:'Prestataire',notes:'Notes',sourceRefs:'Sources'};
 function display(value){if(value&&typeof value==='object'&&!Array.isArray(value)&&'value'in value&&'unit'in value)return value.value?value.value+' '+(value.unit==='years'?'an(s)':'mois'):'Non renseignée';if(Array.isArray(value))return value.every(v=>typeof v==='string')?value.join(', '):value.length+' élément(s)';return present(value)?String(value):'Non renseigné';}
 function changedPreview(container,item,candidate){
  container.replaceChildren();container.hidden=item.choice!=='update';if(container.hidden)return;
  container.append(el('h3','Modifications proposées'));
  const existing=candidate.existing.find(row=>row.id===item.targetId);if(!existing){container.append(el('p','Choisissez la fiche cible pour voir les valeurs qui seront ajoutées ou modifiées.'));return;}
  const values=nativeValues(item,item.entry,existing),list=el('ul');
  for(const [key,value]of Object.entries(values)){
   if(key==='equipmentImportKeys')continue;
   if(key==='maintenancePlans'){
    const oldPlans=M.plans(existing);
    for(const plan of value){const old=oldPlans.find(previous=>previous.id===plan.id);if(old&&equal(old,plan))continue;
     const changed=Object.entries(plan).filter(([key,value])=>!['id','importKey','equipmentImportKey'].includes(key)&&(!old||!equal(old[key],value))).map(([key,value])=>{
      const text=key==='sourceRefs'?value.map(id=>{const source=(values.sources||existing.sources||[]).find(source=>source.id===id);return source?[source.title,source.url||source.path].filter(Boolean).join(' · ')||source.importSourceId||id:id;}).join(', '):display(value);
      return(detailLabels[key]||key)+' : '+text;
     });
     list.append(el('li',(old?'Programme modifié':'Nouveau programme')+' « '+plan.title+' » — '+changed.join(' · ')));
    }
   }else if(key==='purchaseDetails'||key==='warrantyDetails'){
    const changed=Object.entries(value).filter(([name,v])=>!equal(existing[key]?.[name],v));if(changed.length)list.append(el('li',scalarLabels[key]+' : '+changed.map(([name,v])=>(detailLabels[name]||name)+' : '+display(v)).join(' · ')));
   }else if(Array.isArray(value)){
    const added=value.filter(incoming=>!Array.isArray(existing[key])||!existing[key].some(prior=>equal(prior,incoming)));
    if(added.length)list.append(el('li',(scalarLabels[key]||key)+' à ajouter : '+added.map(part=>typeof part==='object'?[part.title,part.url||part.path].filter(Boolean).join(' · ')||'Source conservée':part).join(' ; ')));
   }else list.append(el('li',(scalarLabels[key]||key)+' : '+display(value)));
  }
  if(!list.children.length)container.append(el('p','Aucune valeur métier différente. La provenance de cet import sera conservée.'));else container.append(list);
  container.append(el('p','Les champs absents de l’import, les autres programmes, l’historique et les documents déjà enregistrés sont conservés.','equipment-import-hint'));
 }
 function editor(card,item,index,candidate,refresh){
  const entry=item.entry,grid=el('div',null,'equipment-import-grid');
  const set=key=>value=>{entry[key]=nullable(value);refresh();};
  for(const [key,label]of [['name','Nom de l’équipement *'],['category','Catégorie / type'],['brand','Marque'],['model','Modèle'],['serialNumber','N° de série'],['manufacturerReference','Référence constructeur'],['place','Emplacement']])field(grid,label,entry[key],set(key));
  field(grid,'Date d’achat',entry.purchase.date,value=>{entry.purchase.date=nullable(value);refresh();},'date');
  const amount=field(grid,'Montant d’achat',entry.purchase.amount,value=>{entry.purchase.amount=numeric(value);refresh();},'number');amount.min='0';amount.step='any';
  for(const [key,label]of [['currency','Monnaie (ISO 4217)'],['seller','Vendeur'],['invoiceReference','Référence de facture']])field(grid,label,entry.purchase[key],value=>{entry.purchase[key]=nullable(value);refresh();});
  field(grid,'Fin de garantie',entry.warranty.endDate,value=>{entry.warranty.endDate=nullable(value);refresh();},'date');
  field(grid,'Conditions de garantie',entry.warranty.details,value=>{entry.warranty.details=nullable(value);refresh();},'textarea');
  field(grid,'Notes de l’équipement',entry.notes,set('notes'),'textarea');card.append(grid);
  const programs=el('section',null,'equipment-import-plans');programs.append(el('h3','Programmes de maintenance'),el('p','La dernière date connue est une déclaration ; elle ne crée aucune intervention dans l’historique. Aucune fréquence n’est imposée.'));
  const list=el('div');
  const renderPlans=()=>{
   list.replaceChildren();if(!entry.maintenancePlans.length)list.append(el('p','Aucun programme de maintenance dans cet import.'));
   entry.maintenancePlans.forEach((plan,planIndex)=>{
    const part=el('fieldset',null,'equipment-import-plan');part.append(el('legend','Programme '+(planIndex+1)));const planGrid=el('div',null,'equipment-import-grid'),due=el('p',null,'equipment-import-hint'),sourceStatus=el('p',null,'equipment-import-hint');
    const planStatus=()=>{const result=M.due({id:item.nativeId},plan);due.textContent=result.date?(result.source==='explicit'?'Prochaine échéance explicite : ':'Prochaine échéance calculée : ')+result.date+' (selon les données de cet import)':'Prochaine échéance inconnue : date ou fréquence manquante.';sourceStatus.textContent=plan.sourceRefs.length?'Sources : '+plan.sourceRefs.join(', '):'À vérifier — aucune source indiquée.';};
    const setPlan=key=>value=>{plan[key]=nullable(value);planStatus();refresh();};
    field(planGrid,'Intitulé du programme',plan.title,setPlan('title'));
    const interval=field(planGrid,'Fréquence (quantité)',plan.interval.value,value=>{plan.interval.value=numeric(value);planStatus();refresh();},'number');interval.min='1';interval.step='1';
    field(planGrid,'Unité de fréquence',plan.interval.unit,value=>{plan.interval.unit=nullable(value);planStatus();refresh();},'text',[['','Non renseignée'],['months','Mois'],['years','Années']]);
    field(planGrid,'Dernière date connue',plan.lastKnownDate,setPlan('lastKnownDate'),'date');field(planGrid,'Prochaine échéance explicite',plan.nextDateOverride,setPlan('nextDateOverride'),'date');
    field(planGrid,'Motif / source de l’échéance',plan.overrideReason,setPlan('overrideReason'));field(planGrid,'Prestataire habituel',plan.usualProvider,setPlan('usualProvider'));
    field(planGrid,'Notes du programme',plan.notes,setPlan('notes'),'textarea');
    field(planGrid,'Références source du programme',plan.sourceRefs.join(', '),value=>{plan.sourceRefs=value.split(',').map(v=>v.trim()).filter(Boolean);planStatus();refresh();});part.append(planGrid);
    planStatus();part.append(due,sourceStatus);
    const remove=el('button','Retirer ce programme de l’import','fa-button');remove.type='button';remove.onclick=()=>{entry.maintenancePlans.splice(planIndex,1);renderPlans();refresh();};part.append(remove);list.append(part);
   });
  };
  renderPlans();const add=el('button','Ajouter un programme à cet import','fa-button');add.type='button';add.onclick=()=>{entry.maintenancePlans.push({importKey:'review-'+crypto.randomUUID(),title:'',interval:{value:null,unit:null},lastKnownDate:null,nextDateOverride:null,overrideReason:null,usualProvider:null,notes:null,sourceRefs:[]});renderPlans();refresh();};
  programs.append(list,add);card.append(programs);
 }
 function clearPreviews(){for(const url of previews)URL.revokeObjectURL(url);previews.clear();}
 function status(main){let node=main.querySelector('[data-equipment-import-status]');if(!node){node=el('p',null,'equipment-import-status');node.dataset.equipmentImportStatus='';node.setAttribute('role','status');node.setAttribute('aria-live','polite');main.append(node);}node.textContent=message;node.hidden=!message;return node;}
 function render(ctx){
  clearPreviews();const main=ctx.main;main.classList.add('equipment-import');
  document.querySelector('body > header')?.replaceChildren();document.getElementById('fa-supplement')?.replaceChildren();
  if(prepared&&stale(prepared)){generation++;prepared=null;message=staleMessage;}
  main.replaceChildren(el('h1','Importer des équipements avec mon IA'),el('p','Copiez le prompt dans l’IA de votre choix, puis communiquez-lui progressivement vos photos, factures et notices. Après « J’ai terminé », récupérez son ZIP ou son JSON et vérifiez les fiches ci-dessous.'));
  main.append(el('p','Lorsque vous utilisez ce prompt, vous transmettez vous-même vos documents et données personnelles à l’IA choisie, selon ses règles de confidentialité. DOBBY ne lui envoie aucun document.','equipment-import-privacy'),R.button('rg-equipment-prompt','Copier le prompt'));
  const details=el('details');details.append(el('summary','Lire ou sélectionner le prompt'));const prompt=el('textarea');prompt.id='equipment-ai-prompt';prompt.readOnly=true;prompt.value=promptText;prompt.setAttribute('aria-label','Prompt complet pour mon IA');details.append(prompt);main.append(details);
  const picker=el('input');picker.id='equipment-ai-file';picker.type='file';picker.accept='.json,.zip,application/json,application/zip';picker.disabled=busy;
  picker.onchange=()=>R.run(async()=>{
   const current=++generation;prepared=null;clearPreviews();main.querySelector('[data-equipment-import-preview]')?.remove();const file=picker.files?.[0];loading=Boolean(file);message=file?'Lecture et validation locale…':'';status(main);
   const cancel=main.querySelector('[data-fa-action="rg-equipment-import-cancel"]');if(cancel)cancel.hidden=!file;
   if(!file)return;
   try{const candidate=await prepare(file);if(current!==generation||window.DobbyFamilyStitch.view!=='equipment-ai')return;prepared=candidate;message='';}
   catch(error){if(current!==generation||window.DobbyFamilyStitch.view!=='equipment-ai')return;message=error.message;}
   if(current===generation&&window.DobbyFamilyStitch.view==='equipment-ai'){loading=false;await ctx.open('equipment-ai',{},false);}
  });
  const pickerGroup=R.filePicker(picker,'Choisir le ZIP ou JSON produit par mon IA');if(prepared)pickerGroup.children[1].textContent='Fichier préparé : '+prepared.fileName;
  main.append(pickerGroup,el('p','JSON : 2 Mo · ZIP : 40 Mo · PDF, JPEG, PNG et WebP : 10 Mo par pièce. Les documents importés sont conservés localement sur cet appareil. Les liens restent des liens ; DOBBY ne télécharge pas les notices externes.','equipment-import-hint'));
  status(main);
  if(prepared){
   const candidate=prepared,preview=el('section');preview.dataset.equipmentImportPreview='';preview.append(el('h2','Vérifier et corriger avant d’enregistrer'),el('p',candidate.entries.length+' équipement(s) · '+candidate.fileName));
   candidate.entries.forEach((item,index)=>{
    const card=el('article',null,'equipment-import-card');card.dataset.equipmentImportRow=index;const title=el('h2',item.entry.name);card.append(title);
    if(item.matches.length)card.append(el('p','Doublon possible avec : '+item.matches.map(row=>row.name).join(', ')+'. Choisissez explicitement l’action et la fiche cible.','equipment-import-warning'));
    if(item.within.length)card.append(el('p','Autre entrée potentiellement identique dans ce fichier : '+item.within.join(', ')+'. Vérifiez les appareils distincts.','equipment-import-warning'));
    const diff=el('section',null,'equipment-import-diff');diff.dataset.equipmentImportDiff='';
    const refresh=()=>{title.textContent=item.entry.name||'Équipement à nommer';const agree=document.getElementById('equipment-ai-agree');if(agree)agree.checked=false;changedPreview(diff,item,candidate);};
    editor(card,item,index,candidate,refresh);evidence(card,item,candidate);
    const actionBox=el('div',null,'equipment-import-actions');
    const targetBox=el('div');
    const action=field(actionBox,'Action pour cet équipement',item.choice,value=>{item.choice=value;targetBox.hidden=value!=='update';refresh();},'text',[['skip','Ignorer cette entrée'],['add','Ajouter un nouvel équipement'],['update','Mettre à jour une fiche existante']]);action.disabled=busy;
    field(targetBox,'Équipement à mettre à jour',item.targetId,value=>{item.targetId=value;refresh();},'text',[['','Choisir la fiche cible…'],...candidate.existing.map(row=>[row.id,row.name+([row.brand,row.model,row.serialNumber,row.place].filter(Boolean).length?' · '+[row.brand,row.model,row.serialNumber,row.place].filter(Boolean).join(' · '):'')])]);
    targetBox.hidden=item.choice!=='update';actionBox.append(targetBox);card.append(actionBox,diff);changedPreview(diff,item,candidate);preview.append(card);
   });
   const agree=el('label',null,'equipment-import-agree'),check=el('input');check.type='checkbox';check.id='equipment-ai-agree';check.name='equipment-import-agree';agree.append(check,document.createTextNode(' J’ai vérifié les informations, les sources, les programmes et l’action choisie pour chaque équipement.'));
   preview.append(agree,R.button('rg-equipment-import-confirm',busy?'Enregistrement…':'Confirmer l’importation'));main.append(preview);
  }
  const cancel=R.button('rg-equipment-import-cancel','Annuler cet import');cancel.hidden=!prepared&&!loading;main.append(cancel,R.button('house','Revenir aux équipements'));
 }
 async function act(action,button,ctx){
  if(action==='rg-equipment-prompt'){
   await ready;try{await navigator.clipboard.writeText(promptText);message='Prompt copié. Vous choisissez les documents à transmettre dans votre IA.';}
   catch{const prompt=document.getElementById('equipment-ai-prompt');prompt.closest('details').open=true;prompt.focus();prompt.select();message='Le prompt est sélectionné. Utilisez la commande Copier de votre appareil.';}
   status(ctx.main);return;
  }
  if(action==='rg-equipment-import-cancel'){
   if(busy)return;generation++;prepared=null;loading=false;clearPreviews();message='Import annulé. Aucune nouvelle donnée enregistrée.';return ctx.open('equipment-ai',{},false);
  }
  if(action==='rg-equipment-import-confirm'){
   if(busy)return;
   if(!document.getElementById('equipment-ai-agree')?.checked)throw Error('Confirmez la vérification des équipements avant l’importation.');
   busy=true;button.disabled=true;
   try{
    const result=await R.lock(()=>commit(prepared));generation++;prepared=null;clearPreviews();message=result.added+' équipement(s) ajouté(s), '+result.updated+' mis à jour. Les pièces jointes restent sur cet appareil.';ctx.notice(message);return await ctx.open('house');
   }catch(error){
    message=error.message;ctx.notice(message);
    if(prepared&&stale(prepared)){generation++;prepared=null;clearPreviews();}
    busy=false;await ctx.open('equipment-ai',{},false);
   }finally{busy=false;button.disabled=false;}
  }
 }
 // A dock/route navigation can leave the screen while File.text() is pending.
 // Invalidate that session even if the user returns before its read resolves.
 new MutationObserver(()=>{if(document.body.dataset.familyView!=='equipment-ai'&&(prepared||loading)){generation++;prepared=null;loading=false;clearPreviews();}}).observe(document.body,{attributes:true,attributeFilter:['data-family-view']});
 R.register({views:['equipment-ai'],prepare:nativeReady,render:(_view,ctx)=>render(ctx),act,back:()=>{generation++;prepared=null;loading=false;clearPreviews();return R.target('house');}});
 window.DobbyEquipmentImport=Object.freeze({ready,prepare,commit,open:ctx=>ctx.open('equipment-ai')});
})();
