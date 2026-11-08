/* Shared medical appointments: voluntary entries on existing household family module. */
(async function(){
'use strict';
const core=await import('./family-health-core.mjs?v=20261108-6');
const api=window.DobbyFamilyUI,esc=api.esc;
if(!Array.isArray(st.sharedHealthVisits))st.sharedHealthVisits=[];
const today=()=>{
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
};
const label=d=>d?new Date(d+'T12:00:00').toLocaleDateString('fr-BE'):'—';
const visits=()=>core.validVisits(st.sharedHealthVisits);
const getVisit=id=>(st.sharedHealthVisits||[]).find(x=>x.id===id);
function panel(){
  const items=visits(),pending=items.filter(x=>x.date>=today()),old=items.filter(x=>x.date<today()).reverse();
  const draw=list=>'<ul class="fh-list">'+list.map(x=>
    '<li><div><strong>'+esc(x.title)+'</strong><small>'+esc(label(x.date))+
    (x.time?' · '+esc(x.time):'')+
    (x.person?' · '+esc(x.person):'')+
    (x.provider?' · '+esc(x.provider):'')+'</small></div>'+
    '<div class="fh-actions"><button type="button" data-fh="edit" data-id="'+esc(x.id)+'">Modifier</button>'+
    '<button type="button" data-fh="delete" data-id="'+esc(x.id)+'">×</button></div></li>').join('')+'</ul>';
  return '<section id="fhVisits" class="fh-panel"><div class="fh-heading"><h2>Rendez-vous médicaux du foyer</h2>'+
    '<button type="button" data-fh="new" class="fh-primary">＋ Rendez-vous</button></div>'+
    '<p class="fh-description">Vous choisissez les rendez-vous à enregistrer ici : ils sont visibles par les membres connectés du foyer. '+
    'Vos anciennes fiches du carnet de santé restent sur cet appareil tant que vous ne les copiez pas ici.</p>'+
    '<p class="fh-status">Partage Famille : '+esc(api.getModuleStatus('family'))+'</p>'+
    (pending.length?draw(pending):'<p class="fh-empty">Aucun rendez-vous partagé à venir.</p>')+
    (old.length?'<details><summary>Rendez-vous passés ('+old.length+')</summary>'+draw(old.slice(0,20))+'</details>':'')+
    '</section>';
}
const oldDraw=drawFamily;
drawFamily=function(){return oldDraw()+panel();};
function layer(){
  let el=document.getElementById('fhDialog');
  if(!el){el=document.createElement('div');el.id='fhDialog';el.hidden=true;document.body.append(el);}
  return el;
}
function form(id){
  if(!api.isModuleActive('family'))throw Error('Activez le module Famille dans « Gérer le foyer »');
  const old=id?getVisit(id):null;if(id&&!old)throw Error('Rendez-vous introuvable');
  const root=layer(),people=(Array.isArray(st.familyMembers)?st.familyMembers:[]);
  const options=people.map(p=>'<option value="'+esc(p.id)+'"'+(p.id===old?.personId?' selected':'')+'>'+esc(p.name)+'</option>').join('');
  root.innerHTML='<div class="fh-dialog" role="dialog" aria-modal="true" aria-label="Rendez-vous médical partagé">'+
    '<button type="button" data-fh="close" class="fh-close" aria-label="Fermer">×</button>'+
    '<h2>'+(old?'Modifier':'Nouveau')+' rendez-vous</h2>'+
    '<p class="fh-description">Cette fiche sera partagée avec les membres du foyer. Aucun autre compte ou permission n’est nécessaire.</p>'+
    '<form id="fhForm"><input type="hidden" name="visitKey" value="'+esc(old?.id||'')+'">'+
    '<label>Intitulé<input name="title" required maxlength="140" value="'+esc(old?.title||'')+'"></label>'+
    '<div class="fh-grid"><label>Date<input type="date" name="date" required value="'+esc(old?.date||today())+'"></label>'+
    '<label>Heure<input type="time" name="time" value="'+esc(old?.time||'')+'"></label></div>'+
    '<label>Personne<select name="personId"><option value="">Foyer</option>'+options+'</select></label>'+
    '<label>Professionnel / établissement<input name="provider" maxlength="160" value="'+esc(old?.provider||'')+'"></label>'+
    '<label>Lieu<input name="location" maxlength="160" value="'+esc(old?.location||'')+'"></label>'+
    '<label>Informations utiles<textarea name="note" maxlength="500">'+esc(old?.note||'')+'</textarea></label>'+
    '<div class="fh-actions"><button type="submit" class="fh-primary">Enregistrer</button>'+
    '<button type="button" data-fh="close">Annuler</button></div></form></div>';
  root.hidden=false;
  root.querySelector('form')?.addEventListener('submit',saveForm);
  root.querySelector('[name="title"]')?.focus();
}
function close(){const root=document.getElementById('fhDialog');if(root)root.hidden=true;}
function commit(){save();render();}
function saveForm(e){
  if(e.target?.getAttribute('id')!=='fhForm')return;
  e.preventDefault();e.stopImmediatePropagation();
  try{
    if(!api.isModuleActive('family'))throw Error('Le foyer n’est plus connecté');
    const data=new FormData(e.target),key=String(data.get('visitKey')||'');
    if(key&&!getVisit(key))throw Error('Fiche supprimée');
    if(!key && st.sharedHealthVisits.length>=200)throw Error('200 rendez-vous maximum');
    const personId=String(data.get('personId')||'');
    const member=(st.familyMembers||[]).find(x=>x.id===personId);
    const item=core.normalizeVisit({
      id:key||('fh-'+crypto.randomUUID()),title:data.get('title'),date:data.get('date'),
      time:data.get('time'),personId,person:member?.name||'Foyer',
      provider:data.get('provider'),location:data.get('location'),note:data.get('note')
    });
    st.sharedHealthVisits=key?st.sharedHealthVisits.map(x=>x.id===key?item:x):
      [...st.sharedHealthVisits,item];
    close();commit();
  }catch(err){alert(err?.message||'Erreur d’enregistrement');}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-fh]');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const a=b.dataset.fh,id=b.dataset.id;
  try{
    if(a==='new')form();
    else if(a==='edit')form(id);
    else if(a==='close')close();
    else if(a==='delete'){
      const found=getVisit(id);if(!found)return;
      if(!confirm('Supprimer ce rendez-vous de la liste commune du foyer ?'))return;
      st.sharedHealthVisits=st.sharedHealthVisits.filter(x=>x.id!==id);
      commit();
    }
  }catch(err){alert(err?.message||'Action indisponible');}
},true);
window.DobbyFamilyHealth=Object.freeze({available:true,count:()=>visits().length});
render();
})();