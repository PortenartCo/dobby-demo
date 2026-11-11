/* Shared manual missions for Dobby V5. Separate from V5 autoTasks/reconcile(). */
(async function(){
'use strict';
const core=await import('./family-missions-core.mjs?v=20261111-recurrence-1');
const esc=window.DobbyFamilyUI?.esc||(x=>String(x||''));
if(!Array.isArray(st.manualMissions))st.manualMissions=[];
if(st.runeCredits===undefined)st.runeCredits=[];
if(st.runeRequests===undefined)st.runeRequests=[];
const status=()=>window.DobbyFamilyUI?.getModuleStatus?.('missions')||'Partage à vérifier';
const fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('fr-BE'):'Sans échéance';
const members=()=>Array.isArray(st.familyMembers)?st.familyMembers:[];
const person=id=>members().find(x=>x.id===id)?.name||'Non attribuée';
const find=id=>st.manualMissions.find(x=>x.id===id);
let projecting=false;
function project(){
  if(projecting)return;
  const rows=core.projectRecurringMissions(st.manualMissions);
  if(rows.length===st.manualMissions.length)return;
  const previous=st.manualMissions;projecting=true;st.manualMissions=rows;
  try{save();return true;}catch(error){st.manualMissions=previous;throw error;}finally{projecting=false;}
}
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
  try{project();}catch(error){console.error('Projection Missions :',error.message);}
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
  const layer=ensureLayer(),rule=current?.recurrence?.rules?.at(-1);
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
    '<label>Effort<select name="effort">'+core.runes.EFFORTS.map(e=>'<option value="'+e.id+'"'+(e.id===(current?.effort||'regular')?' selected':'')+'>'+esc(e.label)+' — '+e.amount+' runes</option>').join('')+'</select></label>'+
    '<label>Note non confidentielle<textarea name="note" maxlength="400">'+esc(current?.note||'')+'</textarea></label>'+
    '<fieldset><legend>Récurrence de mission</legend><label>Fréquence<select name="recurrenceFrequency">'+[['unique','Unique'],['daily','Quotidien'],['weekly','Hebdomadaire'],['monthly','Mensuel']].map(([value,label])=>'<option value="'+value+'"'+(value===(rule?.frequency||'unique')?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
    '<label>Jours de la semaine (0 = dimanche, 1 = lundi… 6 = samedi)<input name="recurrenceWeekdays" value="'+esc((rule?.weekdays||[new Date((current?.due||core.brusselsDate())+'T12:00:00Z').getUTCDay()]).join(','))+'"></label>'+
    '<label>Jour du mois<input type="number" name="recurrenceMonthDay" min="1" max="31" value="'+(rule?.monthDay||Number((current?.due||core.brusselsDate()).slice(-2)))+'"></label>'+
    '<label>État de la série<select name="recurrenceState">'+[['active','Active'],['paused','Suspendue'],['stopped','Arrêtée définitivement']].map(([value,label])=>'<option value="'+value+'"'+(value===(rule?.state||'active')?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
    '<p class="fms-desc">Mois plus court : dernier jour du mois. Reprise : les 30 jours précédents et aujourd’hui ; les occurrences déjà enregistrées sont conservées. Aucun futur généré.</p></fieldset>'+
    '<div class="fms-actions"><button type="submit" class="fms-main">Enregistrer</button>'+
    '<button type="button" data-fms-action="close">Annuler</button></div></form></div>';
  layer.hidden=false;
  const form=layer.querySelector('form#fmsForm');
  if(!form)throw Error('Formulaire mission introuvable');
  form.addEventListener('submit',saveForm);
  if(current?.seriesId){for(const name of ['due','recurrenceFrequency','recurrenceWeekdays','recurrenceMonthDay','recurrenceState'])form.elements[name].disabled=true;}
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
    if(!existing&&st.manualMissions.filter(x=>!x.seriesId).length>=200)throw Error('Limite de 200 missions ou séries atteinte');
    const now=new Date().toISOString();
    let row=core.normalizeMission({
      ...old,
      id:existing||('fm-'+crypto.randomUUID()),
      title:data.get('title'),due:old?.seriesId?old.due:data.get('due'),effort:data.get('effort'),
      ...(!old||old.rewardVersion===1?{rewardVersion:1}:{}),
      category:data.get('category'),assigneeId:data.get('assigneeId'),
      note:data.get('note'),status:old?.status||'open',
      createdAt:old?.createdAt||now,completedAt:old?.completedAt||''
    });
    if(old?.seriesId){row=core.normalizeMission({...row,due:old.due});}
    else{
      const frequency=String(data.get('recurrenceFrequency')||'unique');
      if(old?.recurrence&&frequency==='unique')throw Error('Arrêtez la série pour conserver son historique');
      if(frequency!=='unique'){
        if(!row.due)throw Error('Choisissez une date de début pour la série');
        if(row.id.length>69)throw Error('Identifiant trop long pour une série');
        if(old?.recurrence&&row.due!==old.due)throw Error('La date de première occurrence est conservée ; modifiez les jours de récurrence');
        const rules=old?.recurrence?.rules||[],last=rules.at(-1),today=core.brusselsDate(),from=last?(today>last.from?today:last.from):row.due;
        // Future rows are new missions. A legacy first occurrence remains
        // ineligible; it does not remove eligibility from genuinely new rows.
        const template={...last?.template,title:row.title,category:row.category,assigneeId:row.assigneeId,note:row.note,effort:row.effort,rewardVersion:1};
        const rule={from,start:rules[0]?.start||row.due,frequency,weekdays:String(data.get('recurrenceWeekdays')||'').split(',').filter(Boolean).map(Number).sort((a,b)=>a-b),monthDay:Number(data.get('recurrenceMonthDay')),shortMonth:'last-day',state:String(data.get('recurrenceState')||last?.state||'active'),template};
        if(!last&&!core.recurrenceMatches(row.due,rule))throw Error('La première échéance doit correspondre aux jours de récurrence choisis. Ajustez la date ou les jours de la série.');
        const equal=last&&JSON.stringify({...last,from:''})===JSON.stringify({...rule,from:''});
        if(last?.state==='stopped'){
          if(rule.state!=='stopped'||rule.frequency!==last.frequency||rule.monthDay!==last.monthDay||JSON.stringify(rule.weekdays)!==JSON.stringify(last.weekdays))throw Error('Une série arrêtée ne peut pas être reprise');
        }else row=core.normalizeMission({...row,recurrence:{...old?.recurrence,version:1,seriesId:row.id,rules:equal?rules:[...rules,rule]}});
      }
    }
    const previous=st.manualMissions;
    st.manualMissions=core.projectRecurringMissions(existing?st.manualMissions.map(x=>x.id===existing?row:x):[...st.manualMissions,row]);
    try{persist();close();}catch(error){st.manualMissions=previous;throw error;}
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
      const date=new Date().toISOString(),previous={manualMissions:st.manualMissions,runeCredits:st.runeCredits,runeRequests:st.runeRequests};
      const request=core.runes.completionRequest(current,members(),st.runeCredits,st.runeRequests,date);
      st.manualMissions=st.manualMissions.map(row=>row.id===id?{...row,status:row.status==='open'?'done':'open',completedAt:row.status==='open'?date:''}:row);
      if(request){st.runeRequests=core.runes.normalizeRequests([...st.runeRequests,request]);if(!requiresSync())st.runeCredits=core.runes.acceptRequests(st.runeCredits,[request],0);}
      try{persist();}catch(error){Object.assign(st,previous);throw error;}
    }else if(a==='delete'){
      const item=find(id);if(!item)return;
      if(item.recurrence||item.seriesId)throw Error('L’historique des séries est conservé. Ouvrez la première occurrence pour suspendre ou arrêter la série.');
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
function requiresSync(){const configured=window.DobbyFamilyUI?.isModuleConfigured?.('missions');return st.runeSyncRequired===true||configured===true||(configured==null&&Boolean(window.DobbyFamilyUI?.getContext()));}
window.DobbyFamilyMissions=Object.freeze({available:true,recurrenceVersion:1,today:core.brusselsDate,addDays:core.addCalendarDays,countOpen:()=>st.manualMissions.filter(x=>x.status==='open').length,efforts:core.runes.EFFORTS,grades:core.runes.GRADE_CONFIG,summary(memberId){return{...core.runes.memberSummary(memberId,st.runeCredits,st.runeRequests),shared:requiresSync(),syncStatus:window.DobbyFamilyUI?.getModuleStatus('missions')||'Statut du partage indisponible'};}});
// Resume a sleeping/offline tab without an unbounded timer or extra writer.
document.addEventListener('visibilitychange',()=>{if(!document.hidden){project();render();}});
window.addEventListener('focus',()=>{project();render();});
let midnightTimer;
function startTimer(){if(!midnightTimer)midnightTimer=setInterval(()=>{if(!document.hidden&&project())render();},60000);}
startTimer();
window.addEventListener('pagehide',()=>{clearInterval(midnightTimer);midnightTimer=null;});
window.addEventListener('pageshow',event=>{startTimer();if(event.persisted){project();render();}});
render();
})();
