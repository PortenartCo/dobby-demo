/* Shared manual missions for Dobby V5. Separate from V5 autoTasks/reconcile(). */
(async function(){
'use strict';
const core=await import('./family-missions-core.mjs?v=20261108-5');
const esc=window.DobbyFamilyUI?.esc||(x=>String(x||''));
if(!Array.isArray(st.manualMissions))st.manualMissions=[];
const status=()=>window.DobbyFamilyUI?.getModuleStatus?.('missions')||'Partage à vérifier';
const fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('fr-BE'):'Sans échéance';
const members=()=>Array.isArray(st.familyMembers)?st.familyMembers:[];
const person=id=>members().find(x=>x.id===id)?.name||'Non attribuée';
const find=id=>st.manualMissions.find(x=>x.id===id);
function panel(){
  const rows=core.orderedMissions(st.manualMissions),todo=rows.filter(x=>x.status==='open'),done=rows.filter(x=>x.status==='done');
  const tasks=rows=>'<ul class="fms-list">'+rows.map(m=>
    '<li class="fms-task"><div class="fms-task-content">'+
    '<strong>'+esc(m.title)+'</strong><small>'+esc(m.category)+' · '+esc(fmt(m.due))+
    ' · '+esc(person(m.assigneeId))+'</small>'+
    (m.note?'<p>'+esc(m.note)+'</p>':'')+'</div>'+
    '<div class="fms-actions">'+
    '<button type="button" data-fms-action="toggle" data-id="'+esc(m.id)+'">'+
      (m.status==='open'?'Terminer':'Rouvrir')+'</button>'+
    '<button type="button" data-fms-action="edit" data-id="'+esc(m.id)+'">Modifier</button>'+
    '<button type="button" data-fms-action="delete" data-id="'+esc(m.id)+'" aria-label="Supprimer cette mission">×</button>'+
    '</div></li>').join('')+'</ul>';
  return '<section id="fmsManual" class="fms-panel" aria-label="Missions partagées">'+
    '<div class="fms-head"><div><small>Missions manuelles du foyer</small><h2>À faire ensemble</h2></div>'+
    '<button type="button" class="fms-main" data-fms-action="new">＋ Mission</button></div>'+
    '<p class="fms-desc">Créez une tâche pour votre foyer, attribuez-la à un membre et suivez son échéance. '+
    'Les tâches automatiques de contrats et entretiens restent gérées séparément.</p>'+
    '<p class="fms-status">Module Missions : '+esc(status())+'</p>'+
    '<h3>À faire · '+todo.length+'</h3>'+
    (todo.length?tasks(todo):'<p class="fms-empty">Aucune mission familiale ouverte.</p>')+
    (done.length?'<details><summary>Terminées ('+done.length+')</summary>'+tasks(done.slice(0,25))+'</details>':'')+
    '<p class="fms-desc">Ce module ne crée pas automatiquement de rappel Apple.</p></section>';
}
const previousRender=render;
render=function(){
  previousRender();
  if(st.page==='missions'&&!st.detail){
    const screen=document.getElementById('screen');if(!screen)return;
    const anchor=screen.querySelector('.fv2-strip');
    if(anchor)anchor.insertAdjacentHTML('afterend',panel());
    else screen.insertAdjacentHTML('afterbegin',panel());
  }
};
function ensureLayer(){
  let layer=document.getElementById('fmsLayer');
  if(!layer){
    layer=document.createElement('div');layer.id='fmsLayer';layer.hidden=true;
    document.body.append(layer);
  }
  return layer;
}
function showForm(id){
  const current=id?find(id):null;if(id&&!current)throw Error('Mission introuvable');
  const layer=ensureLayer();
  const selectable=members().map(x=>'<option value="'+esc(x.id)+'"'+
    (x.id===current?.assigneeId?' selected':'')+'>'+esc(x.name)+'</option>').join('');
  layer.innerHTML='<div class="fms-dialog" role="dialog" aria-modal="true" aria-label="Mission du foyer">'+
    '<button type="button" class="fms-close" data-fms-action="close" aria-label="Fermer">×</button>'+
    '<h2>'+(current?'Modifier':'Nouvelle')+' mission</h2>'+
    '<p class="fms-desc">Ces informations sont partagées avec les membres du foyer. '+
    'Ne pas saisir de données médicales ou confidentielles.</p>'+
    '<form id="fmsForm"><input type="hidden" name="missionKey" value="'+esc(current?.id||'')+'">'+
    '<label>À faire<input name="title" maxlength="140" required value="'+esc(current?.title||'')+'"></label>'+
    '<div class="fms-grid"><label>Échéance (facultative)<input type="date" name="due" value="'+esc(current?.due||'')+'"></label>'+
    '<label>Catégorie<select name="category">'+core.MISSION_CATEGORIES.map(x=>
      '<option'+(x===(current?.category||'Famille')?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label></div>'+
    '<label>Responsable<select name="assigneeId"><option value="">Non attribuée</option>'+selectable+'</select></label>'+
    '<label>Note non confidentielle<textarea name="note" maxlength="400">'+esc(current?.note||'')+'</textarea></label>'+
    '<div class="fms-actions"><button type="submit" class="fms-main">Enregistrer</button>'+
    '<button type="button" data-fms-action="close">Annuler</button></div></form></div>';
  layer.hidden=false;
  const form=layer.querySelector('form#fmsForm');
  if(!form)throw Error('Formulaire mission introuvable');
  form.addEventListener('submit',saveForm);
  form.querySelector('[name=title]').focus();
}
function close(){
  const layer=document.getElementById('fmsLayer');if(layer)layer.hidden=true;
}
function persist(){save();render();}
function saveForm(event){
  if(event.target?.getAttribute('id')!=='fmsForm')return;
  event.preventDefault();event.stopImmediatePropagation();
  try{
    const data=new FormData(event.target),existing=String(data.get('missionKey')||''),
      old=existing?find(existing):null;
    if(existing&&!old)throw Error('La mission a été modifiée ou supprimée sur cet appareil');
    if(!existing&&st.manualMissions.length>=200)throw Error('Limite de 200 missions atteinte');
    const now=new Date().toISOString();
    const row=core.normalizeMission({
      id:existing||('fm-'+crypto.randomUUID()),
      title:data.get('title'),due:data.get('due'),
      category:data.get('category'),assigneeId:data.get('assigneeId'),
      note:data.get('note'),state:old?.status||'open',
      createdAt:old?.createdAt||now,completedAt:old?.completedAt||''
    });
    st.manualMissions=existing?st.manualMissions.map(x=>x.id===existing?row:x):
      [...st.manualMissions,row];
    close();persist();
  }catch(err){alert(err?.message||'Enregistrement impossible');}
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-fms-action]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const id=button.dataset.id;
  try{
    const a=button.dataset.fmsAction;
    if(a==='new')showForm();
    else if(a==='edit')showForm(id);
    else if(a==='close')close();
    else if(a==='toggle'){
      const current=find(id);if(!current)return;
      st.manualMissions=st.manualMissions.map(row=>
        row.id===id?{...row,status:row.status==='open'?'done':'open',
          completedAt:row.status==='open'?new Date().toISOString():''}:row);
      persist();
    }else if(a==='delete'){
      const item=find(id);if(!item)return;
      if(confirm('Supprimer définitivement « '+item.title+' » de la liste familiale ?')){
        st.manualMissions=st.manualMissions.filter(x=>x.id!==id);
        persist();
      }
    }
  }catch(e){alert(e?.message||'Action indisponible');}
},true);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!document.getElementById('fmsLayer')?.hidden)close();
});
window.DobbyFamilyMissions=Object.freeze({available:true,countOpen:()=>st.manualMissions.filter(x=>x.status==='open').length});
render();
})();