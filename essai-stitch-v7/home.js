/* E01: bind native records into the Traverse's original cards, never rebuild
   those compositions. Selected day is presentation state and is not persisted. */
window.DobbyHome=(()=>{'use strict';
const E=window.DobbyFamilyStitchEngine;
const section=text=>[...document.querySelectorAll('main section')].find(s=>s.querySelector('h2')?.textContent.includes(text));
const originals={missions:section('Missions du Jour')?.cloneNode(true),meal:section('Festin du Soir')?.cloneNode(true),gazette:section('Gazette des Curiosités')?.cloneNode(true)};
let offset=0;
const localDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const add=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const label=date=>new Date(date+'T12:00:00').toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long'});
const empty=text=>Object.assign(document.createElement('p'),{className:'dv7-empty',textContent:text});
function days(day){
 let row=document.querySelector('[data-e01-days]');if(!row){row=document.createElement('section');row.dataset.e01Days='true';row.setAttribute('aria-label','Choisir une journée, d’aujourd’hui à J+6');section('Missions du Jour').before(row);}
 row.dataset.e01Offset=String(offset);row.replaceChildren();
 const arrow=(step,icon,name)=>{const b=document.createElement('button');b.type='button';b.dataset.e011Shift=String(step);b.setAttribute('aria-label',name);b.disabled=step<0?offset===0:offset===6;const glyph=document.createElement('span');glyph.className='material-symbols-outlined';glyph.setAttribute('aria-hidden','true');glyph.textContent=icon;b.append(glyph);return b;};
 const center=document.createElement('div');center.className='e011-date-center';const time=document.createElement('time');time.dataset.e011Date='true';time.className='font-label-md';time.dateTime=day;time.setAttribute('aria-live','polite');
 const date=new Date(day+'T12:00:00');time.textContent=offset===0?"Aujourd'hui — "+date.toLocaleDateString('fr-BE',{day:'numeric',month:'long',year:'numeric'}):date.toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});center.append(time);
 if(offset>0){const today=document.createElement('button');today.type='button';today.dataset.e011Today='true';today.className='font-label-md';today.textContent="Aujourd'hui";center.append(today);}
 row.append(arrow(-1,'chevron_left','Jour précédent'),center,arrow(1,'chevron_right','Jour suivant'));
}
function render(data){if(!originals.missions)return;const day=add(localDay(),offset);days(day);
const missions=originals.missions.cloneNode(true),list=missions.querySelector('.space-y-2\\.5'),sample=list.lastElementChild.cloneNode(true);
const rows=[...(data.manualMissions||[]).filter(t=>t.due===day||!t.due&&offset===0).map(t=>({...t,manual:true,done:t.status==='done'})),...(data.autoTasks||[]).filter(t=>t.due===day&&t.state!=='obsolete').map(t=>({...t,done:t.state==='done'}))];
const badge=missions.querySelector('.items-center.gap-2 > span.border');badge.dataset.e01Count='true';badge.textContent=`${rows.filter(t=>!t.done).length} actives · ${rows.filter(t=>t.done).length} terminées`;
const addButton=missions.querySelector('button');addButton.dataset.e01Add='true';list.replaceChildren();
for(const task of rows){const card=sample.cloneNode(true);card.dataset.e01Mission=task.manual?task.id:task.key;card.dataset.e01Kind=task.manual?'manual':'automatic';card.tabIndex=0;card.setAttribute('role','link');card.setAttribute('aria-label','Consulter '+task.title);
const h=card.querySelector('h3');h.textContent=task.title;h.classList.toggle('line-through',task.done);
const tag=card.querySelector('.font-label-sm');tag.textContent=task.done?'Terminée':'À faire';
const by=tag.nextElementSibling;by.textContent=task.manual?'• '+(data.familyMembers.find(m=>m.id===task.assigneeId)?.name||'Non attribuée'):'• Automatique';
card.querySelector('p').textContent=task.manual?(task.note||task.category||'Mission du foyer'):(task.sourceLabel||'Échéance automatique');
const check=card.querySelector('button');check.dataset.e01Complete=task.manual?task.id:task.key;check.dataset.e01Kind=card.dataset.e01Kind;check.disabled=task.done;check.setAttribute('aria-label',task.done?'Mission terminée':'Terminer '+task.title);check.querySelector('span').textContent='check';
if(task.manual)card.dataset.e01Href='./famille.html#mission-edit?record='+encodeURIComponent(task.id);
else card.dataset.e01Href='./famille.html#'+(task.origin==='equipment'?'equipment':'document')+'?record='+encodeURIComponent(task.originId);
list.append(card);}
if(!rows.length)list.append(empty('Aucune mission pour cette journée.'));section('Missions du Jour').replaceWith(missions);
const mealSection=originals.meal.cloneNode(true),card=mealSection.firstElementChild;card.dataset.e01Meal='true';card.tabIndex=0;card.setAttribute('role','link');
const planned=data.planned[day+'-soir'],recipe=planned&&planned.status!=='annulé'?data.recipes.find(r=>r.id===planned.id):null;
const title=card.querySelector('h3');title.textContent=recipe?.name||'Aucun repas prévu';
const people=title.nextElementSibling;if(recipe&&Number.isFinite(Number(planned.people))&&Number(planned.people)>0)people.textContent=`${planned.people} convives`;else people.remove();
title.parentElement.nextElementSibling.textContent=recipe?'Consulter la fiche recette.':'Choisir un repas dans la Taverne gourmande.';
const grid=card.querySelector('.grid'),labels=[...grid.children];for(const box of labels.slice(1))box.remove();grid.classList.replace('grid-cols-3','grid-cols-1');
if(recipe&&Number.isFinite(Number(recipe.minutes))&&Number(recipe.minutes)>0)labels[0].lastElementChild.textContent=`${recipe.minutes} min`;else grid.remove();
card.querySelector('.bg-surface-container-lowest p')?.closest('.bg-surface-container-lowest').remove();
card.querySelector('h2').parentElement.nextElementSibling.textContent=label(day);card.dataset.e01Href=recipe?'./index.html#recipe?id='+encodeURIComponent(recipe.id):'./index.html#pick?date='+day;card.setAttribute('aria-label',recipe?'Voir la recette '+recipe.name:'Choisir un repas pour '+label(day));section('Festin du Soir').replaceWith(mealSection);
const gazette=originals.gazette.cloneNode(true),events=(data.agenda||[]).filter(e=>e.date===day).map(e=>({...e,label:e.title,person:e.meta})).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||a.label.localeCompare(b.label,'fr'));
const container=gazette.lastElementChild,proto=container.firstElementChild.cloneNode(true);container.replaceChildren();gazette.querySelector('h2').parentElement.nextElementSibling.textContent=label(day);
for(const event of events){const row=proto.cloneNode(true);row.dataset.e01Event=event.id;row.dataset.e01Href='./famille.html#agenda?day='+day;row.tabIndex=0;row.setAttribute('role','link');row.querySelector('h4').textContent=event.label;row.querySelector('.material-symbols-outlined').textContent='event';row.querySelector('p').textContent=[event.person,event.location].filter(Boolean).join(' · ')||'Consulter dans l’Agenda';const time=row.querySelector('.font-label-md');time.textContent=event.time||'Journée';container.append(row);}if(!events.length)container.append(empty('Aucun événement ni rendez-vous partagé pour cette journée.'));section('Gazette des Curiosités').replaceWith(gazette);
}
document.addEventListener('click',event=>{const shift=event.target.closest('[data-e011-shift]'),today=event.target.closest('[data-e011-today]'),check=event.target.closest('[data-e01-complete]'),addButton=event.target.closest('[data-e01-add]'),link=event.target.closest('[data-e01-href]');if(!shift&&!today&&!check&&!addButton&&!link)return;event.preventDefault();event.stopImmediatePropagation();
if(shift||today){if(shift?.disabled)return;offset=today?0:Math.max(0,Math.min(6,offset+Number(shift.dataset.e011Shift)));window.DobbyStitchV7.refresh();const focus=document.querySelector(today?'[data-e011-shift="1"]':`[data-e011-shift="${shift.dataset.e011Shift}"]`);if(focus&&!focus.disabled)focus.focus({preventScroll:true});else{const label=document.querySelector('[data-e011-date]');label.tabIndex=-1;label.focus({preventScroll:true});}return;}
if(check){if(check.disabled)return;try{if(check.dataset.e01Kind==='manual'){const task=E.read().state.manualMissions.find(t=>t.id===check.dataset.e01Complete);if(task&&task.status!=='done')E.action('fmsAction','toggle',{id:task.id});}else{const input=E.win().document.createElement('input');input.type='checkbox';input.hidden=true;input.dataset.autotask=check.dataset.e01Complete;E.win().document.body.append(input);try{input.checked=true;input.dispatchEvent(new (E.win().Event)('change',{bubbles:true}));}finally{input.remove();}}window.DobbyStitchV7.refresh();}catch(error){const notice=empty(error.message);notice.setAttribute('role','alert');document.querySelector('main').prepend(notice);}return;}
location.href=addButton?'./famille.html#mission-edit':link.dataset.e01Href;
},true);
document.addEventListener('keydown',event=>{const link=event.target.closest('[data-e01-href]');if(link&&event.target===link&&['Enter',' '].includes(event.key)){event.preventDefault();link.click();}});
return {render,reset(){offset=0;if(document.body.dataset.dv7Screen==='traverse')window.DobbyStitchV7?.refresh();}};
})();
