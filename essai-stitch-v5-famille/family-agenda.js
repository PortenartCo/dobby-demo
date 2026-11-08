/* Dobby family agenda: ordinary household events only. Not an Apple Calendar connector. */
(async function(){
'use strict';
const core=await import('./family-agenda-core.mjs?v=20261108-4');
const esc=window.DobbyFamilyUI?.esc || (v=>String(v||''));
const TODAY=()=>{
  // Use the browser's local day, not UTC (important near Brussels midnight).
  const now=new Date(),p=n=>String(n).padStart(2,'0');
  return now.getFullYear()+'-'+p(now.getMonth()+1)+'-'+p(now.getDate());
};
if (!Array.isArray(st.familyEvents)) st.familyEvents=[];
const maxEvents=200;
const item=(id)=>(st.familyEvents||[]).find(e=>e.id===id);
const formatDate=(iso)=>core.validDate(iso)?
  new Date(iso+'T12:00:00').toLocaleDateString('fr-BE',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):
  String(iso||'');
const status=()=>window.DobbyFamilyUI?.getModuleStatus?.('family') || 'Statut de partage non vérifié';
const htmlList=(arr,limit=10)=>arr.slice(0,limit).map(e=>
  '<li class="fp-event"><div class="fp-event-details"><span class="fp-type">'+esc(e.category)+'</span>' +
  '<strong>'+esc(e.title)+'</strong><small>'+esc(formatDate(e.date))+
  (e.time?' · '+esc(e.time):' · Toute la journée')+
  (e.person?' · '+esc(e.person):'')+'</small>'+
  (e.location?'<small>'+esc(e.location)+'</small>':'')+'</div>'+
  '<div class="fp-event-actions">'+
  '<button type="button" data-fp-action="edit" data-id="'+esc(e.id)+'">Modifier</button>'+
  '<button type="button" data-fp-action="ics" data-id="'+esc(e.id)+'">Calendrier</button>'+
  '<button type="button" data-fp-action="delete" data-id="'+esc(e.id)+'" aria-label="Supprimer '+esc(e.title)+'">×</button>'+
  '</div></li>').join('');
const dueType=kind=>({
  event:'Événement',birthday:'Anniversaire',mission:'Mission',
  contract:'Contrat',maintenance:'Entretien'
}[kind]||'Échéance');
function summaryCard(rows,max=8){
  return rows.slice(0,max).map(entry=>{
    const stale=entry.date<TODAY();
    return '<li class="fp-due"><span class="fp-due-date'+(stale?' fp-overdue':'')+'">'+
      esc(formatDate(entry.date))+'</span><span><strong>'+esc(entry.title)+'</strong>'+
      '<small>'+esc(dueType(entry.kind))+(entry.time?' · '+esc(entry.time):'')+
      (entry.meta?' · '+esc(entry.meta):'')+'</small></span></li>';
  }).join('');
}
function agendaPanel(){
  const rows=core.validEvents(st.familyEvents).sort(core.eventSort);
  const today=TODAY(),next=rows.filter(e=>e.date>=today),previous=rows.filter(e=>e.date<today).reverse();
  const deadlines=core.collectUpcoming(st,today,30).filter(x=>x.kind!=='event');
  return '<section id="fpAgenda" class="fp-panel" aria-label="Agenda partagé du foyer">'+
    '<header class="fp-heading"><div><small class="fp-eyebrow">Organisation familiale</small>'+
    '<h2>Agenda du foyer</h2></div><button type="button" class="fp-main-btn" data-fp-action="new">＋ Événement</button></header>'+
    '<p class="fp-description">Activités, école, anniversaires et rendez-vous familiaux ordinaires. '+
    'Les informations médicales restent exclues de cet agenda partagé.</p>'+
    '<p class="fp-sharing">Module Famille : '+esc(status())+'</p>'+
    '<h3>Événements à venir</h3>'+
    (next.length?'<ul class="fp-events">'+htmlList(next,20)+'</ul>':
      '<p class="fp-empty">Aucun événement familial ajouté. Commencez par un événement réel.</p>')+
    (previous.length?'<details class="fp-history"><summary>Événements passés ('+previous.length+')</summary>'+
       '<ul class="fp-events">'+htmlList(previous,20)+'</ul></details>':'')+
    '<section class="fp-deadlines"><h3>Échéances des autres modules</h3>'+
    '<p class="fp-description">Missions, entretiens, contrats et anniversaires prévus dans les 30 prochains jours ; '+
    'retards récents également signalés. Aucun rappel automatique Apple.</p>'+
    (deadlines.length?'<ul class="fp-due-list">'+summaryCard(deadlines,12)+'</ul>':
       '<p class="fp-empty">Aucune échéance enregistrée sur cette période.</p>')+
    '</section></section>';
}
function enhanceHome(){
  const screen=document.getElementById('screen');if(!screen)return;
  const today=TODAY();
  const events=core.validEvents(st.familyEvents).filter(x=>x.date===today).sort(core.eventSort);
  const sections=[...screen.querySelectorAll('.v2-panel')];
  const eventBlock=sections.find(x=>x.querySelector('h2')?.textContent?.trim()==='Événements du jour');
  const content=events.length ? '<ul class="fp-home-today">'+
    events.map(x=>'<li><strong>'+esc(x.title)+'</strong><small>'+
      (x.time?esc(x.time)+' · ':'')+esc(x.category)+'</small></li>').join('')+
    '</ul><p class="fp-description">Événements Dobby, sans liaison automatique à Apple Calendrier.</p>' :
    '<p class="fp-description">Aucun événement Dobby aujourd’hui. Le calendrier Apple n’est pas connecté.</p>';
  let anchor=eventBlock;
  if(eventBlock){
    const placeholder=eventBlock.querySelector('.v2-empty');
    if(placeholder)placeholder.outerHTML=content;
    const badge=eventBlock.querySelector('.v2-count');
    if(badge)badge.textContent=String(events.length);
  } else {
    // Stitch V5 replaces the original v2 homepage. Always provide the actual
    // family events in the newest homepage, without relying on removed selectors.
    const card=document.createElement('section');
    card.className='fp-panel fp-home-agenda';
    card.innerHTML='<div class="fp-heading"><div><small class="fp-eyebrow">Aujourd’hui</small>'+
      '<h2>Agenda familial</h2></div><button class="fp-main-btn" type="button" data-fp-action="family">Voir tout ›</button></div>'+content;
    const hero=screen.querySelector('.st-hero')||screen.firstElementChild;
    if(hero)hero.insertAdjacentElement('afterend',card);
    else screen.append(card);
    anchor=card;
  }
  const due=core.collectUpcoming(st,today,14).filter(x=>x.kind!=='event').slice(0,5);
  if(due.length){
    const card=document.createElement('section');card.className='v2-panel fp-home-due';
    card.innerHTML='<div class="v2-panel-head"><h2>Échéances du foyer</h2>'+
      '<button type="button" data-fp-action="family">Voir tout ›</button></div>'+
      '<ul class="fp-due-list">'+summaryCard(due,5)+'</ul>';
    (anchor||screen.firstElementChild)?.insertAdjacentElement('afterend',card);
  }
}
function decorate(){
  if(st.detail)return;
  if(st.page==='family' && !st.extraPage) {
    const screen=document.getElementById('screen');if(!screen)return;
    const anchor=screen.querySelector('.fv2-strip');
    if(anchor)anchor.insertAdjacentHTML('afterend',agendaPanel());
    else screen.insertAdjacentHTML('afterbegin',agendaPanel());
  } else if(st.page==='home')enhanceHome();
}
const baseRender=render;
render=function() {baseRender();decorate();};
function ensureDialog(){
  let layer=document.getElementById('fpDialogLayer');
  if(layer)return layer;
  layer=document.createElement('div');layer.id='fpDialogLayer';layer.hidden=true;
  document.body.append(layer);
  return layer;
}
function formField(name,label,value,type='text',required=false,attrs=''){
  return '<label>'+esc(label)+'<input name="'+name+'" type="'+type+'" value="'+esc(value||'')+'" '+
    (required?'required ':'')+attrs+'></label>';
}
function showForm(id){
  const record=id?item(id):null;
  if(id&&!record)throw Error('Événement introuvable');
  const form=ensureDialog();
  const recordDate=record?.date||TODAY();
  form.innerHTML='<div class="fp-dialog" role="dialog" aria-modal="true" aria-label="Événement familial">'+
    '<button type="button" class="fp-close" data-fp-action="close" aria-label="Fermer">×</button>'+
    '<h2>'+(record?'Modifier':'Ajouter')+' un événement</h2>'+
    '<p class="fp-description">Cet agenda est partagé avec les membres du foyer. '+
    'Pour un rendez-vous médical ou une donnée confidentielle, ne pas utiliser ce formulaire.</p>'+
    '<form id="fpEventForm"><input type="hidden" name="id" value="'+esc(record?.id||'')+'">'+
    formField('title','Intitulé',record?.title,'text',true,'maxlength="120"')+
    '<div class="fp-form-row">'+
      formField('date','Date',recordDate,'date',true)+
      formField('time','Heure (facultatif)',record?.time,'time')+'</div>'+
    '<label>Catégorie<select name="category">'+core.CATEGORIES.map(x=>
      '<option value="'+esc(x)+'"'+(x===(record?.category||'Famille')?' selected':'')+'>'+esc(x)+'</option>').join('')+
      '</select></label>'+
    formField('person','Personne / groupe (facultatif)',record?.person,'text',false,'maxlength="80"')+
    formField('location','Lieu (facultatif)',record?.location,'text',false,'maxlength="140"')+
    '<label>Note non confidentielle<textarea name="note" maxlength="350">'+esc(record?.note||'')+'</textarea></label>'+
    '<div class="fp-dialog-actions"><button type="submit" class="fp-main-btn">Enregistrer</button>'+
      '<button type="button" data-fp-action="close">Annuler</button></div></form></div>';
  form.hidden=false;
  const activeForm=form.querySelector('#fpEventForm');
  if(!activeForm)throw Error('Formulaire Dobby introuvable');
  activeForm.addEventListener('submit',submitFamilyEvent);
  form.querySelector('input[name=title]')?.focus();
}
function closeDialog(){
  const layer=document.getElementById('fpDialogLayer');
  if(layer)layer.hidden=true;
}
function mutate() {save();render();}
function downloadIcs(id){
  const record=item(id);if(!record)throw Error('Événement introuvable');
  const blob=new Blob([core.eventIcs(record,new Date().toISOString())],
    {type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download='dobby-evenement-'+record.date+'.ics';
    document.body.append(anchor);anchor.click();anchor.remove();
  }finally{setTimeout(()=>URL.revokeObjectURL(url),3000);}
}
document.addEventListener('click',event=>{
  const btn=event.target.closest('[data-fp-action]');if(!btn)return;
  event.preventDefault();event.stopImmediatePropagation();
  const action=btn.dataset.fpAction,id=btn.dataset.id;
  try{
    if(action==='new')showForm();
    else if(action==='edit')showForm(id);
    else if(action==='close')closeDialog();
    else if(action==='family'){go('family');}
    else if(action==='ics')downloadIcs(id);
    else if(action==='delete'){
      const record=item(id);
      if(!record)return;
      if(confirm('Supprimer cet événement familial : « '+record.title+' » ?')){
        st.familyEvents=st.familyEvents.filter(x=>x.id!==id);
        mutate();
      }
    }
  }catch(error){alert(error?.message||'Action impossible');}
},true);
function submitFamilyEvent(event){
  if(event.target?.getAttribute('id')!=='fpEventForm')return;
  event.preventDefault();event.stopImmediatePropagation();
  try{
    const data=new FormData(event.target),existing=String(data.get('id')||'');
    const id=existing||('fp-'+crypto.randomUUID());
    if(!existing && st.familyEvents.length>=maxEvents)throw Error('Limite de 200 événements atteinte');
    const record=core.normalizeEvent({
      id,title:data.get('title'),date:data.get('date'),time:data.get('time'),
      category:data.get('category'),person:data.get('person'),
      location:data.get('location'),note:data.get('note')
    });
    if(existing && !item(existing))throw Error('L’événement a été supprimé entre-temps');
    st.familyEvents=existing
      ? st.familyEvents.map(row=>row.id===existing?record:row)
      : [...st.familyEvents,record];
    closeDialog();mutate();
  }catch(error){alert(error?.message||'Enregistrement impossible');}
}
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && !document.getElementById('fpDialogLayer')?.hidden)closeDialog();
});
window.DobbyFamilyAgenda=Object.freeze({available:true,upcoming:()=>core.collectUpcoming(st,TODAY(),30)});
render();
})();