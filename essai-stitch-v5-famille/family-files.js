/* Shared family documents: metadata via existing contracts module, binary files in private Storage.
   Each upload is explicit; older local files and health records remain untouched. */
(function(){
'use strict';
const api=window.DobbyFamilyUI;
if(!api)throw Error('Foyer Dobby indisponible');
let busy=false,message='';
const esc=api.esc;
const isShared=d=>d && d.category!=='Santé' &&
  (['Contrats','Assurances'].includes(d.category)||d.sharedToHousehold===true);
const documents=()=>Array.isArray(st.familyDocs)?st.familyDocs:[];
const byId=id=>documents().find(x=>x.id===id);
const active=()=>Boolean(api.getContext() && api.isModuleActive('contracts'));
const detail=()=>typeof docDetail==='string' && docDetail ? byId(docDetail):null;
const categoryAllowed=d=>Boolean(d&&d.category!=='Santé');
const CloudFields=['cloudPath','cloudName','cloudType','cloudSize'];
function status(){
  if(busy)return '<p class="fds-notice">Transfert en cours…</p>';
  return message?'<p class="fds-notice" role="status">'+esc(message)+'</p>':'';
}
function overview(){
  const list=documents().filter(isShared);
  const uploaded=list.filter(x=>Boolean(x.cloudPath));
  return '<section class="fds-panel" aria-label="Documents communs">'+
    '<div class="fds-heading"><div><small>Dobby · Foyer</small><h2>Documents communs</h2></div>'+
    '<span class="fds-count">'+uploaded.length+' fichier(s)</span></div>'+
    '<p class="fds-desc">Les fiches de contrats et assurances sont partagées. Pour les autres fiches, choisissez « Partager au foyer ». '+
    'Les PDF et photos ne sont envoyés que lorsque vous le demandez.</p>'+
    (!active()?'<p class="fds-hint">Connectez le foyer et activez le module « Documents et contrats » dans « Gérer le foyer ».</p>':'')+
    status()+
    (list.length?'<ul class="fds-list">'+list.slice(0,25).map(d=>
      '<li><div><strong>'+esc(d.title||'Sans titre')+'</strong><small>'+esc(d.category||'')+
      (d.cloudPath?' · 📎 '+esc(d.cloudName||'Fichier'):' · Fiche sans fichier')+
      '</small></div>'+
      '<div class="fds-actions">'+
      (d.cloudPath?'<button type="button" data-fds="open" data-id="'+esc(d.id)+'">Ouvrir</button>':'')+
      '<button type="button" data-doc="view" data-id="'+esc(d.id)+'">Fiche</button></div></li>').join('')+'</ul>':
      '<p class="fds-empty">Aucune fiche partagée pour le moment.</p>')+
    '</section>';
}
function detailPanel(d){
  if(!categoryAllowed(d)){
    return '<section class="fds-panel"><h2>Document personnel</h2><p class="fds-desc">'+
      'Cette fiche Santé reste sur cet appareil. Le carnet de santé sera traité séparément.</p></section>';
  }
  const shared=isShared(d),enabled=active();
  const pickable=enabled&&shared&&!busy;
  return '<section class="fds-panel" aria-label="Partage de document">'+
    '<div class="fds-heading"><h2>Partage avec le foyer</h2><span class="fds-count">'+
    (shared?'Fiche commune':'Sur cet appareil')+'</span></div>'+
    status()+
    (!enabled?'<p class="fds-hint">Ouvrez « Gérer le foyer » et activez « Documents et contrats » pour partager.</p>':'')+
    ((!['Contrats','Assurances'].includes(d.category))?
      '<button type="button" data-fds="toggle" data-id="'+esc(d.id)+'"'+(!enabled?' disabled':'')+'>'+
       (shared?'Arrêter le partage de cette fiche':'Partager cette fiche au foyer')+'</button>':'')+
    (shared?
      '<p class="fds-desc">La fiche et sa référence de fichier sont visibles par les membres du foyer.</p>':
      '<p class="fds-desc">La fiche ne sera pas envoyée tant que vous ne l’aurez pas partagée.</p>')+
    (shared && d.cloudPath?
      '<div class="fds-file"><strong>📎 '+esc(d.cloudName||'Fichier partagé')+'</strong>'+
      '<div class="fds-actions"><button type="button" data-fds="open" data-id="'+esc(d.id)+'"'+(!enabled?' disabled':'')+'>Ouvrir / enregistrer</button>'+
      '<button type="button" data-fds="remove" data-id="'+esc(d.id)+'"'+(!enabled?' disabled':'')+'>Retirer du foyer</button></div></div>'+
      '<p class="fds-desc">Pour le remplacer, retirez ce fichier puis envoyez la nouvelle version.</p>':'')+
    (shared&&!d.cloudPath?
      '<div class="fds-file">'+
      (d.attachmentName?'<button type="button" data-fds="local" data-id="'+esc(d.id)+'"'+(!pickable?' disabled':'')+
        '>Partager la pièce déjà enregistrée sur cet appareil</button>':'')+
      '<label>Ou choisir un PDF / une photo<input type="file" data-fds-file="'+esc(d.id)+'"'+
      ' accept=".pdf,image/jpeg,image/png,image/webp"'+(!pickable?' disabled':'')+'></label>'+
      '<small>10 Mo maximum, stockage partagé du foyer.</small></div>':'')+
    '</section>';
}
const previous=drawDocuments;
drawDocuments=function(){
  const rendered=previous();
  if(typeof docEdit!=='undefined' && (docEdit!==null || docNoteEdit!==null))return rendered;
  const selected=detail();
  if(selected)return rendered+detailPanel(selected);
  return overview()+rendered;
};
function redraw(){
  if(st.page==='documents'){
    const screen=document.getElementById('screen');
    if(screen)screen.innerHTML=drawDocuments();
  }
}
function report(err){
  message=err?.status===404?
    'Le stockage familial n’est pas encore activé sur Supabase. Aucun document local n’a été effacé.':
    err?.status===403?
    'Le serveur n’autorise pas cet accès. Vérifiez le raccordement du foyer.':
    (err?.message||'Action impossible');
  redraw();
}
function saveFiche(){save();redraw();}
async function upload(d,file,name){
  if(!active())throw Error('Activez le partage Documents dans « Gérer le foyer »');
  if(!isShared(d))throw Error('Partagez d’abord cette fiche');
  if(d.cloudPath)throw Error('Retirez d’abord le fichier précédent');
  const types={
    'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'
  };
  if(!file || !types[file.type] || file.size<=0 || file.size>10485760)
    throw Error('Choisissez un PDF ou une image de 10 Mo maximum');
  const context=api.getContext();
  const path=context.householdId+'/'+crypto.randomUUID()+'.'+types[file.type];
  busy=true;message='';redraw();
  try{
    await api.storageFetch('POST',path,file);
    if(api.getContext()?.householdId!==context.householdId || !byId(d.id)){
      await api.storageFetch('DELETE',path).catch(()=>{});
      throw Error('Foyer ou fiche modifié pendant le transfert');
    }
    const doc=byId(d.id);
    doc.cloudPath=path;
    doc.cloudName=String(name||'Fichier').slice(0,140);
    doc.cloudType=file.type;doc.cloudSize=file.size;
    message='Fichier transféré. La fiche sera synchronisée avec le foyer.';
    saveFiche();
  } finally {busy=false;redraw();}
}
async function openCloud(d){
  if(!active()||!d.cloudPath)throw Error('Connectez-vous au foyer pour ouvrir ce fichier');
  const blob=await api.storageFetch('GET',d.cloudPath);
  const url=URL.createObjectURL(blob);
  try{
    const link=document.createElement('a');
    link.href=url;link.download=String(d.cloudName||'document');
    document.body.append(link);link.click();link.remove();
  }finally{setTimeout(()=>URL.revokeObjectURL(url),6000);}
}
async function removeCloud(d){
  if(!active()||!d.cloudPath)return;
  if(!confirm('Supprimer ce fichier partagé pour les membres du foyer ? La fiche et votre éventuelle copie locale resteront disponibles.'))return;
  busy=true;message='';redraw();
  try{
    await api.storageFetch('DELETE',d.cloudPath);
    for(const k of CloudFields)delete d[k];
    message='Fichier retiré du foyer. La fiche reste disponible.';
    saveFiche();
  }finally{busy=false;redraw();}
}
document.addEventListener('click',async(event)=>{
  const button=event.target.closest('[data-fds]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(busy)return;
  const d=byId(button.dataset.id);
  if(!d)return;
  try{
    const action=button.dataset.fds;
    if(action==='toggle'){
      if(!active())throw Error('Le module Documents n’est pas actif');
      if(!categoryAllowed(d))throw Error('Cette fiche ne peut pas être partagée ici');
      if(d.sharedToHousehold){
        if(!confirm('Arrêter de partager cette fiche ? La copie locale restera disponible.'))return;
        d.sharedToHousehold=false;
      } else {
        if(!confirm('Partager cette fiche avec les membres connectés du foyer ?'))return;
        d.sharedToHousehold=true;
      }
      message=d.sharedToHousehold?'Fiche partagée avec le foyer.':'Fiche conservée uniquement sur cet appareil.';
      saveFiche();
    }
    if(action==='open')await openCloud(d);
    if(action==='remove')await removeCloud(d);
    if(action==='local'){
      const blob=await houseRead('family-'+d.id).catch(()=>null);
      if(!blob)throw Error('Pièce locale introuvable sur cet appareil');
      await upload(d,blob,d.attachmentName||'document');
    }
  }catch(err){report(err);}
},true);
document.addEventListener('change',async(event)=>{
  const input=event.target.closest('[data-fds-file]');
  if(!input)return;
  event.stopImmediatePropagation();
  if(busy)return;
  const doc=byId(input.dataset.fdsFile),file=input.files?.[0];
  if(!doc||!file)return;
  try{await upload(doc,file,file.name);}catch(e){report(e);}
},true);
window.DobbyFamilyFiles=Object.freeze({available:true,sharedCount:()=>documents().filter(isShared).length});
render();
})();