/* External-AI exchange: preview locally, then use the one native family writer. */
(()=>{
 'use strict';
 const R=window.DobbyRegister,E=window.DobbyFamilyStitchEngine,base=document.currentScript.src;
 let F,Z,M,prepared=null,message='',busy=false,generation=0;
 const ready=Promise.all([import(new URL('contracts-import-format.mjs',base)),import(new URL('contracts-import-zip.mjs',base)),import(new URL('contracts-model.mjs',base))]).then(([f,z,m])=>{F=f;Z=z;M=m;});ready.catch(()=>{});
 const clone=x=>JSON.parse(JSON.stringify(x));
 const rows=()=>E.read().state.familyDocs||[];
 const native=()=>{const api=E.win().DobbyFamilyContracts;if(!api)throw Error('Le registre des contrats se charge. Réessayez dans un instant.');return api;};
 const snapshot=()=>JSON.stringify(rows());
 const identity=()=>native().snapshot(null);
 const same=(a,b)=>String(a||'').normalize('NFKC').trim().toLocaleLowerCase('fr')===String(b||'').normalize('NFKC').trim().toLocaleLowerCase('fr');
 function matches(entry){return rows().filter(row=>['Contrats','Assurances'].includes(row.category)&&(row.contractImportId===entry.id||row.id===entry.id||same(row.title,entry.title)&&same(row.provider,entry.provider)&&same(row.reference,entry.reference)));}
 async function prepare(file){
  await ready;if(!file||!file.size)throw Error('Choisissez un fichier JSON ou ZIP non vide.');
  const token=identity(),state=snapshot();let manifest,files=new Map();
  if(/\.zip$/i.test(file.name)){if(file.size>Z.CONTRACT_ZIP_LIMITS.archiveBytes)throw Error('ZIP trop volumineux (40 Mo maximum).');({manifest,files}=await Z.readContractZip(new Uint8Array(await file.arrayBuffer())));}
  else{if(!/\.json$/i.test(file.name)||file.size>2*1024*1024)throw Error('JSON de 2 Mo maximum ou ZIP attendu.');manifest=F.parseContractManifest(await file.text());if(manifest.contracts.some(x=>x.documents.length))throw Error('Les originaux référencés sont absents du JSON. Importez le ZIP contenant ces pièces ou exportez un JSON sans pièces en signalant leur absence.');}
  if(identity()!==token||snapshot()!==state)throw Error('Le foyer ou les fiches ont changé pendant la lecture. Sélectionnez à nouveau le fichier.');
  return {fileName:file.name,token,state,files,entries:manifest.contracts.map(entry=>({source:clone(entry),entry:clone(entry),matches:matches(entry).map(row=>({id:row.id,title:row.title,expected:native().snapshot(row.id)})),choice:matches(entry).length?'skip':'add'}))};
 }
 function nativeValues(entry,existing){
  const values={title:entry.title,provider:entry.provider,reference:entry.reference,date:entry.date,deadline:entry.deadline,note:entry.note,category:entry.contract.type==='insurance'?'Assurances':'Contrats',contract:entry.contract,contractImportId:entry.id};
  if(existing){values.contract=M.mergeContract(existing,{contract:entry.contract}).contract;values.contractImportHistory=[...(existing.contractImportHistory||[]),{at:new Date().toISOString(),record:clone({...existing,contractImportHistory:undefined})}];}
  return values;
 }
 async function commit(candidate,choices){
  await ready;const api=native();if(!candidate||identity()!==candidate.token||snapshot()!==candidate.state)throw Error('Le foyer ou les fiches ont changé depuis l’aperçu. Relisez le fichier avant de confirmer.');
  const equipment=(E.read().state.houseItems||[]).map(x=>x.id),targets=new Set(),work=[];
  for(let i=0;i<candidate.entries.length;i++){
   const item=candidate.entries[i],choice=choices?.[i]||item.choice;if(choice==='skip')continue;
   const entry=F.parseContractManifest({format:'dobby-contracts',version:1,contracts:[item.entry]}).contracts[0];
   const errors=M.validateContract({...entry,category:entry.contract.type==='insurance'?'Assurances':'Contrats'},equipment);if(errors.length)throw Error(entry.title+' : '+errors.join(' · '));
   const target=choice.startsWith('update:')?choice.slice(7):null;if(choice!=='add'&&!target)throw Error('Choix d’import invalide.');
   const match=target&&item.matches.find(x=>x.id===target),existing=target&&rows().find(x=>x.id===target);if(target&&(!match||!existing||api.snapshot(target)!==match.expected))throw Error('La fiche à mettre à jour a changé. Recommencez l’aperçu.');
   if(targets.has(target)&&target)throw Error('Deux entrées mettent à jour la même fiche. Conservez une seule mise à jour.');if(target)targets.add(target);
   for(const doc of entry.documents)if(!candidate.files.has(doc.path))throw Error('Pièce originale absente : '+doc.name);
   work.push({entry,target,existing,expected:match?.expected});
  }
  if(!work.length)throw Error('Sélectionnez au moins un contrat à ajouter ou à mettre à jour.');
  // Validation of the entire selection precedes the first native mutation.
  const completed=[];let started=null;
  try{for(const job of work){
   if(identity()!==candidate.token)throw Error('Le foyer a changé pendant l’import.');
   const id=api.save(job.target,nativeValues(job.entry,job.existing),job.target?job.expected:api.snapshot(null));started=id;
   for(const doc of job.entry.documents){
    const source=candidate.files.get(doc.path),w=E.win(),attachment=await api.addAttachment(id,new w.File([source.bytes],doc.name,{type:source.type}),doc.kind);
    const row=rows().find(value=>value.id===id),links=[...(row.contractSourceLinks||[]),{importId:job.entry.id,documentId:doc.id,attachmentId:attachment.id,name:doc.name,path:doc.path}];
    api.save(id,{contractSourceLinks:links},api.snapshot(id));
   }
   completed.push(id);started=null;
  }}catch(error){const partial=completed.length||started;throw Error((partial?'Import interrompu après enregistrement de '+completed.length+' contrat(s) complet(s)'+(started?' ; la fiche en cours est conservée avec ses pièces déjà ajoutées':'')+'. Consultez le registre avant de réimporter. ':'Aucune fiche importée. ')+error.message);}
  return {added:work.filter(x=>!x.target).length,updated:work.filter(x=>x.target).length,ids:completed};
 }
 function el(tag,text,cls){const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;}
 function field(container,label,value,change,type='text',options){const wrap=el('label',null,'contracts-import-field');wrap.append(el('span',label));const input=el(options?'select':type==='textarea'?'textarea':'input');input.className='rg-input';input.setAttribute('aria-label',label);if(input.tagName==='INPUT')input.type=type;if(options)for(const [v,t]of options)input.add(new Option(t,v));input.value=value??'';input.addEventListener('input',()=>change(input.value));wrap.append(input);container.append(wrap);return input;}
 function editable(card,item,index){
  const editor=el('div',null,'contracts-form'),prefix='contract-import-'+index+'-';
  window.DobbyContractsUI.contractFields(editor,item.entry,prefix,{files:false});
  const capture=()=>{const values=window.DobbyContractsUI.readFields(editor,item.entry,prefix);for(const key of ['title','provider','reference','deadline','note','contract'])item.entry[key]=values[key];};
  editor.addEventListener('input',capture);editor.addEventListener('change',capture);card.append(editor);
  const provenance=el('details');provenance.append(el('summary','Sources et incertitudes'));
  for(const source of item.entry.contract.provenance||[])provenance.append(el('p',[source.field,source.documentId,source.pages?.length?'pages '+source.pages.join(', '):'',source.passage].filter(Boolean).join(' · ')));
  for(const uncertainty of item.entry.contract.uncertainties||[])provenance.append(el('p',uncertainty));
  if(!(item.entry.contract.provenance?.length||item.entry.contract.uncertainties?.length))provenance.append(el('p','Aucune référence source fournie. Vérifiez les originaux.'));card.append(provenance);
 }
 function render(ctx){
  const main=ctx.main;main.classList.add('contracts-main','contracts-import');main.replaceChildren(el('h1','Importer des contrats avec une IA'),el('p','Copiez le prompt dans votre IA préférée et transmettez vos documents dans cette conversation. Après « J’ai terminé », récupérez le ZIP puis vérifiez les fiches ici. DOBBY n’envoie aucun document à une IA.'));
  main.append(R.button('rg-contract-prompt','Copier le prompt'));const details=el('details');details.append(el('summary','Lire ou sélectionner le prompt'));const prompt=el('textarea');prompt.id='contracts-ai-prompt';prompt.readOnly=true;prompt.value=F.externalPrompt;prompt.setAttribute('aria-label','Prompt complet pour mon IA');details.append(prompt);main.append(details);
  const picker=el('input');picker.id='contracts-ai-file';picker.type='file';picker.accept='.json,.zip,application/json,application/zip';picker.disabled=busy;picker.onchange=()=>R.run(async()=>{const current=++generation;prepared=null;message='';const file=picker.files?.[0];if(!file)return;try{const candidate=await prepare(file);if(current!==generation||window.DobbyFamilyStitch.view!=='contract-ai')return;prepared=candidate;}catch(error){message=error.message;}if(current===generation&&window.DobbyFamilyStitch.view==='contract-ai')await ctx.open('contract-ai',{},false);});
  main.append(R.filePicker(picker,'Choisir le ZIP ou JSON produit par mon IA'),el('p','JSON : 2 Mo · ZIP : 40 Mo · pièces PDF, JPEG, PNG ou WebP de 10 Mo maximum. Les pièces importées restent locales jusqu’à un transfert explicite depuis leur fiche. Les rappels constituent un échéancier ; aucune notification automatique n’est activée.'));
  if(message){const status=el('p',message,'contracts-import-status');status.setAttribute('role','status');main.append(status);}
  if(prepared){const preview=el('section');preview.dataset.contractImportPreview='';preview.append(el('h2','Vérifier et corriger avant d’enregistrer'),el('p',prepared.entries.length+' contrat(s) · '+prepared.fileName));
   prepared.entries.forEach((item,index)=>{const card=el('article',null,'contracts-import-card');card.dataset.contractImportRow=index;card.append(el('h3',item.entry.title));if(item.matches.length)card.append(el('p','Doublon possible. La fiche existante et toutes ses pièces sont conservées par défaut.'));
    editable(card,item,index);card.append(el('p',item.entry.documents.length?item.entry.documents.map(x=>x.name).join(' · '):'Originaux absents de cet export.'));
    const options=[['skip','Ignorer cette entrée'],['add','Ajouter une nouvelle fiche'],...item.matches.map(x=>['update:'+x.id,'Mettre à jour « '+x.title+' » en conservant son historique et ses pièces'])];field(card,'Action pour ce contrat',item.choice,v=>item.choice=v,'text',options);preview.append(card);
   });const agree=el('label'),check=el('input');check.type='checkbox';check.name='contract-import-agree';check.id='contracts-ai-agree';agree.append(check,document.createTextNode(' J’ai vérifié les informations, les sources et les choix ci-dessus.'));preview.append(agree,R.button('rg-contract-import-confirm',busy?'Enregistrement…':'Confirmer l’importation'),R.button('rg-contract-import-cancel','Annuler cet import'));main.append(preview);
  }
  main.append(R.button('contracts','Revenir aux contrats'));
 }
 async function act(action,el,ctx){
  if(action==='rg-contract-prompt'){await ready;try{await navigator.clipboard.writeText(F.externalPrompt);message='Prompt copié.';}catch{const input=document.getElementById('contracts-ai-prompt');input.closest('details').open=true;input.focus();input.select();message='Le prompt est sélectionné. Utilisez la commande Copier de votre appareil.';}const status=document.createElement('p');status.setAttribute('role','status');status.textContent=message;el.after(status);return;}
  if(action==='rg-contract-import-cancel'){generation++;prepared=null;message='Import annulé. Aucune nouvelle fiche enregistrée.';return ctx.open('contract-ai',{},false);}
  if(action==='rg-contract-import-confirm'){
   if(busy)return;if(!document.getElementById('contracts-ai-agree')?.checked)throw Error('Confirmez la vérification des contrats avant l’importation.');busy=true;
   try{const result=await R.lock(()=>commit(prepared));prepared=null;message=result.added+' contrat(s) ajouté(s), '+result.updated+' mis à jour. Pièces conservées sur cet appareil.';ctx.notice(message);return await ctx.open('contracts');}
   catch(error){message=error.message;ctx.notice(message);if(prepared&&snapshot()!==prepared.state){prepared=null;await ctx.open('contract-ai',{},false);}}
   finally{busy=false;}
  }
 }
 R.register({views:['contract-ai'],prepare:async()=>{await ready;await window.DobbyContractsUI.ready;await R.until(()=>E.win().DobbyFamilyContracts);},render:(_view,ctx)=>render(ctx),act,back:()=>R.target('contracts')});
 window.DobbyContractsImport=Object.freeze({ready,prepare,commit,open:ctx=>ctx.open('contract-ai')});
})();
