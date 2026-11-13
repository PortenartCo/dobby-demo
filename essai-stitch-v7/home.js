/* E01: bind native records into the Traverse's original cards, never rebuild
   those compositions. Selected day is presentation state and is not persisted. */
window.DobbyHome=(()=>{'use strict';
const E=window.DobbyFamilyStitchEngine;
const section=text=>[...document.querySelectorAll('main section')].find(s=>s.querySelector('h2')?.textContent.includes(text));
const eventSection=()=>document.querySelector('[data-e01-events]')||section('Gazette des Curiosités');
const originals={missions:section('Missions du Jour')?.cloneNode(true),meal:section('Festin du Soir')?.cloneNode(true),gazette:section('Gazette des Curiosités')?.cloneNode(true)};
let offset=0,quickDraft='',quickNotice='',quickBusy=false;
const localDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const add=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const label=date=>new Date(date+'T12:00:00').toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long'});
const message=text=>Object.assign(document.createElement('p'),{className:'e01-notice',textContent:text});
const empty=(title,description)=>{const body=document.createElement('div');body.className='e01-empty';body.dataset.e01Empty='true';const heading=document.createElement('strong'),text=document.createElement('p');heading.textContent=title;text.textContent=description;body.append(heading,text);return body;};
function cardHeader(title,icon,day=null){const header=originals.gazette.firstElementChild.cloneNode(true);header.className='e01-card-header';header.dataset.e01CardHeader='true';header.querySelector('h2').textContent=title;header.querySelector('.material-symbols-outlined').textContent=icon;header.querySelector('.material-symbols-outlined').setAttribute('aria-hidden','true');const date=header.querySelector('h2').parentElement.nextElementSibling;if(day)date.textContent=label(day);else date.remove();return header;}
function placeBadge(){const image=document.querySelector('main img[alt*="Dobby"]'),frame=image?.parentElement;if(!frame)return;const text=[...frame.querySelectorAll('span')].find(el=>/CHEMIN DE TRAVERSE/i.test(el.textContent));if(!text)return;const badge=text.parentElement;badge.dataset.e01Place='true';frame.dataset.e01HomeScene='true';frame.append(badge);}
function quickCourses(){
 let block=document.querySelector('[data-e01-quick]');if(!block){block=document.createElement('section');block.dataset.e01Quick='true';block.className='px-gutter-mobile py-space-md';document.querySelector('[data-e01-meals]').after(block);}
 const model=window.DobbyCuisineList,engine=window.DobbyCuisineEngine;let state;
 try{state=model.snapshot(engine);}catch(error){block.replaceChildren(message(error.message));return;}
 const card=document.createElement('div');card.className='e01-quick-card';const heading=cardHeader('Les Courses du Foyer','shopping_cart');
 const status=message(state.shared?'Foyer · '+state.status:state.status);status.dataset.e01QuickStatus='true';
 const form=document.createElement('form');form.dataset.e01QuickForm='true';const label=document.createElement('label');label.htmlFor='e01-quick-course';label.textContent='Ajouter un article';const input=document.createElement('input');input.id='e01-quick-course';input.dataset.e01QuickInput='true';input.type='text';input.maxLength=200;input.required=true;input.placeholder='Ex. : pain, savon…';input.value=quickDraft;input.disabled=quickBusy;input.oninput=()=>{quickDraft=input.value;};const button=document.createElement('button');button.type='submit';button.dataset.e01QuickAdd='true';button.textContent=quickBusy?'Ajout en cours…':'Ajouter';button.disabled=quickBusy;
 const fields=document.createElement('div');fields.className='e01-quick-fields';fields.append(input,button);form.append(label,fields);
 const notice=message(quickNotice||'Un seul panier : vos articles restent dans la liste complète des courses.');notice.dataset.e01QuickNotice='true';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 const open=document.createElement('a');open.href='./index.html#shop';open.dataset.e01QuickOpen='true';open.textContent='Voir la liste complète';const body=document.createElement('div');body.className='e01-quick-body';body.append(status,form,notice,open);card.append(heading,body);block.replaceChildren(card);
}
async function addQuick(){
 if(quickBusy)return;const input=document.querySelector('[data-e01-quick-input]');if(!input?.reportValidity())return;quickDraft=input.value;const name=quickDraft.trim();if(!name){input.setCustomValidity('Indiquez un article.');input.reportValidity();input.setCustomValidity('');return;}
 quickBusy=true;quickCourses();try{const model=window.DobbyCuisineList,engine=window.DobbyCuisineEngine,normalize=s=>s.trim().toLocaleLowerCase('fr-BE').replace(/\s+/g,' '),state=model.snapshot(engine);
 const existing=state.items.find(item=>!item.done&&normalize(item.name)===normalize(name));
 if(existing)quickNotice='« '+existing.name+' » est déjà dans la liste. Aucun doublon ajouté.';
 else{await model.add(engine,{name});const saved=model.snapshot(engine),item=saved.items.find(item=>!item.done&&normalize(item.name)===normalize(name));if(!item)throw Error('L’ajout n’a pas été confirmé. Vérifiez la liste complète.');quickDraft='';quickNotice='« '+name+' » ajouté à la liste. '+(saved.shared?(item.pending?'En attente de synchronisation.':saved.status+'.'):'Conservé sur cet appareil.');}
 }catch(error){quickNotice=error.message;}finally{quickBusy=false;quickCourses();}
}

function days(day){
 let row=document.querySelector('[data-e01-days]');if(!row){row=document.createElement('section');row.dataset.e01Days='true';row.setAttribute('aria-label','Choisir une journée, d’aujourd’hui à J+6');section('Missions du Jour').before(row);}
 row.dataset.e01Offset=String(offset);row.replaceChildren();
 const arrow=(step,icon,name)=>{const b=document.createElement('button');b.type='button';b.dataset.e011Shift=String(step);b.setAttribute('aria-label',name);b.disabled=step<0?offset===0:offset===6;const glyph=document.createElement('span');glyph.className='material-symbols-outlined';glyph.setAttribute('aria-hidden','true');glyph.textContent=icon;b.append(glyph);return b;};
 const center=document.createElement('div');center.className='e011-date-center';const time=document.createElement('time');time.dataset.e011Date='true';time.className='font-label-md';time.dateTime=day;time.setAttribute('aria-live','polite');
 const date=new Date(day+'T12:00:00');time.textContent=offset===0?"Aujourd'hui — "+date.toLocaleDateString('fr-BE',{day:'numeric',month:'long',year:'numeric'}):date.toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});center.append(time);
 if(offset>0){const today=document.createElement('button');today.type='button';today.dataset.e011Today='true';today.className='font-label-md';today.textContent="Aujourd'hui";center.append(today);}
 row.append(arrow(-1,'chevron_left','Jour précédent'),center,arrow(1,'chevron_right','Jour suivant'));
}
function render(data){if(!originals.missions)return;placeBadge();const day=add(localDay(),offset);days(day);
const missions=originals.missions.cloneNode(true),list=missions.querySelector('.space-y-2\\.5'),sample=list.lastElementChild.cloneNode(true);
const rows=[...(data.manualMissions||[]).filter(t=>t.due===day||!t.due&&offset===0).map(t=>({...t,manual:true,done:t.status==='done'})),...(data.autoTasks||[]).filter(t=>t.due===day&&t.state!=='obsolete').map(t=>({...t,done:t.state==='done'}))];
const badge=missions.querySelector('.items-center.gap-2 > span.border');badge.dataset.e01Count='true';badge.textContent=`${rows.filter(t=>!t.done).length} actives · ${rows.filter(t=>t.done).length} terminées`;
const addButton=missions.querySelector('button');addButton.dataset.e01Add='true';list.replaceChildren();
for(const task of rows){const card=sample.cloneNode(true);card.dataset.e01Mission=task.manual?task.id:task.key;card.dataset.e01Kind=task.manual?'manual':'automatic';card.dataset.e01Urgent=String(task.priority==='urgent'&&!task.done);card.tabIndex=0;card.setAttribute('role','link');card.setAttribute('aria-label','Consulter '+task.title);
const h=card.querySelector('h3');h.textContent=task.title;h.classList.toggle('line-through',task.done);
const tag=card.querySelector('.font-label-sm');tag.textContent=task.done?'Terminée':'À faire';
const by=tag.nextElementSibling;by.textContent=task.manual?'• '+(task.allFamily?'Toute la famille':(task.assigneeIds||[task.assigneeId]).map(id=>data.familyMembers.find(m=>m.id===id)?.name).filter(Boolean).join(' · ')||'Non attribuée'):'• Automatique';
card.querySelector('p').textContent=task.manual?(task.note||task.category||'Mission du foyer'):(task.sourceLabel||'Échéance automatique');
const check=card.querySelector('button');check.dataset.e01Complete=task.manual?task.id:task.key;check.dataset.e01Kind=card.dataset.e01Kind;check.disabled=task.done&&!task.manual;check.setAttribute('aria-pressed',String(task.done));check.setAttribute('aria-label',task.done?(task.manual?'Rouvrir '+task.title:'Mission automatique terminée — consulter sa source'):'Terminer '+task.title);check.querySelector('span').textContent=task.done?'check':'radio_button_unchecked';if(task.done&&!task.manual){card.querySelector('p').textContent=(task.sourceLabel||'Échéance automatique')+' · Terminée. Le suivi et toute réouverture dépendent de la fiche source.';check.title='Consultez la fiche source pour son suivi.';}
if(task.manual)card.dataset.e01Href='./famille.html#mission-edit?record='+encodeURIComponent(task.id);
else card.dataset.e01Href='./famille.html#'+(task.origin==='equipment'?'equipment':'document')+'?record='+encodeURIComponent(task.originId);
list.append(card);}
if(!rows.length)list.append(empty('Aucune mission pour cette journée.','Les missions prévues pour cette date apparaîtront ici.'));
// Keep the source header, controls and rows inside one Stitch card, like the Festin.
const missionCard=document.createElement('div'),missionHeader=missions.firstElementChild;missionCard.dataset.e013aCard='true';
missionCard.className='bg-surface-container-high rounded-2xl overflow-hidden border border-amber-900/40 shadow-lg';
missionHeader.className='bg-surface-container-highest/80 px-space-md py-3 flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/30';
list.classList.add('p-space-md');missionCard.append(missionHeader,list);missions.append(missionCard);section('Missions du Jour').replaceWith(missions);
const mealSection=originals.meal.cloneNode(true),card=mealSection.firstElementChild,body=card.lastElementChild.cloneNode(true);mealSection.dataset.e01Meals='true';card.dataset.e01Meal='true';
card.querySelector('h2').textContent='Les Repas du Jour';card.querySelector('h2').parentElement.nextElementSibling.textContent=label(day);card.lastElementChild.remove();
for(const slot of ['midi','soir']){
 const planned=data.planned?.[day+'-'+slot],recipe=planned&&planned.status!=='annulé'?data.recipes.find(r=>r.id===planned.id):null,entry=body.cloneNode(true);entry.classList.add('e01-meal-entry');entry.dataset.e01Slot=slot;entry.tabIndex=0;entry.setAttribute('role','link');entry.dataset.e01Href=recipe?'./index.html#recipe?id='+encodeURIComponent(recipe.id):'./index.html#pick?date='+day+'&slot='+slot;entry.setAttribute('aria-label',recipe?'Voir la recette '+recipe.name+' du '+(slot==='midi'?'midi':'soir'):'Choisir le repas du '+(slot==='midi'?'midi':'soir'));
 const slotName=document.createElement('span');slotName.className='e01-meal-slot';slotName.textContent=slot==='midi'?'Midi':'Soir';
 if(!recipe){entry.replaceChildren(slotName,empty('Aucun repas prévu','Choisir un repas dans la Taverne gourmande.'));card.append(entry);continue;}
 const title=entry.querySelector('h3');title.textContent=recipe.name;const people=title.nextElementSibling;let number=planned.adult!==undefined?Number(planned.adult)+Number(planned.children||0):Number(planned.people);
 if(Number.isFinite(number)&&number>0){const portions=window.DobbyCuisineEngine.evaluate('return portionCount(p.meal);',{meal:planned});people.textContent=number+' convive'+(number===1?'':'s')+' · '+Number(portions).toLocaleString('fr-BE')+' portions';}else people.remove();
 title.parentElement.nextElementSibling.textContent='Consulter la fiche recette.';const grid=entry.querySelector('.grid'),labels=[...grid.children];for(const box of labels.slice(1))box.remove();grid.classList.replace('grid-cols-3','grid-cols-1');if(Number.isFinite(Number(recipe.minutes))&&Number(recipe.minutes)>0)labels[0].lastElementChild.textContent=recipe.minutes+' min';else grid.remove();entry.querySelector('.bg-surface-container-lowest p')?.closest('.bg-surface-container-lowest').remove();
 const visual=document.createElement('div'),img=document.createElement('img');visual.className='e01-meal-image';img.className='e01-meal-thumb';visual.append(img);window.DobbyCuisine.recipeVisual(img,recipe,true);entry.prepend(slotName,visual);card.append(entry);
}
(document.querySelector('[data-e01-meals]')||section('Festin du Soir')).replaceWith(mealSection);quickCourses();
const gazette=originals.gazette.cloneNode(true);gazette.dataset.e01Events='true';const events=(data.agenda||[]).filter(e=>e.date===day).map(e=>({...e,label:e.title,person:e.meta})).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||a.label.localeCompare(b.label,'fr'));
// Reuse the source Gazette header and event rows; align its card frame with Festin and Missions.
const container=gazette.lastElementChild,proto=container.firstElementChild.cloneNode(true),gazetteHeader=cardHeader('Événements du Jour','auto_stories',day),eventsBody=document.createElement('div');
container.replaceChildren();gazette.firstElementChild.remove();
container.dataset.e013bCard='true';
container.className='bg-surface-container-high rounded-2xl overflow-hidden border border-amber-900/40 shadow-lg';

eventsBody.dataset.e013bBody='true';eventsBody.className='p-space-md space-y-3';
for(const event of events){const row=proto.cloneNode(true);row.dataset.e01Event=event.id;row.dataset.e01Href='./famille.html#agenda?day='+day;row.tabIndex=0;row.setAttribute('role','link');row.querySelector('h4').textContent=event.label;row.querySelector('.material-symbols-outlined').textContent='event';row.querySelector('p').textContent=[event.person,event.location].filter(Boolean).join(' · ')||'Consulter dans l’Agenda';const time=row.querySelector('.font-label-md');time.textContent=event.time||'Journée';eventsBody.append(row);}
if(!events.length)eventsBody.append(empty('Aucun événement ni rendez-vous partagé pour cette journée.','Les prochains événements apparaîtront à leur date dans l’agenda du foyer.'));
const addEvent=document.createElement('a');addEvent.dataset.e01EventAdd='true';addEvent.className='e01-event-add';addEvent.href='./famille.html#agenda?dialog=event&day='+localDay()+'&origin=home';addEvent.textContent='+ Ajouter un événement';eventsBody.append(addEvent);container.append(gazetteHeader,eventsBody);eventSection().replaceWith(gazette);
}
document.addEventListener('submit',event=>{if(!event.target.matches('[data-e01-quick-form]'))return;event.preventDefault();event.stopImmediatePropagation();addQuick();},true);
document.addEventListener('click',event=>{if(event.target.closest('[data-e01-quick-add]')){event.preventDefault();event.stopImmediatePropagation();addQuick();return;}const shift=event.target.closest('[data-e011-shift]'),today=event.target.closest('[data-e011-today]'),check=event.target.closest('[data-e01-complete]'),addButton=event.target.closest('[data-e01-add]'),link=event.target.closest('[data-e01-href]');if(!shift&&!today&&!check&&!addButton&&!link)return;event.preventDefault();event.stopImmediatePropagation();
if(shift||today){if(shift?.disabled)return;offset=today?0:Math.max(0,Math.min(6,offset+Number(shift.dataset.e011Shift)));window.DobbyStitchV7.refresh();const focus=document.querySelector(today?'[data-e011-shift="1"]':`[data-e011-shift="${shift.dataset.e011Shift}"]`);if(focus&&!focus.disabled)focus.focus({preventScroll:true});else{const label=document.querySelector('[data-e011-date]');label.tabIndex=-1;label.focus({preventScroll:true});}return;}
if(check){if(check.disabled)return;try{if(check.dataset.e01Kind==='manual'){const task=E.read().state.manualMissions.find(t=>t.id===check.dataset.e01Complete);if(task?.participantVersion===1){if(task.status==='done'){E.win().DobbyFamilyMissions.reopen(task.id);}else{if(!window.DobbyMissionParticipants)throw Error('Le choix des participants est indisponible. Aucune mission validée.');window.DobbyMissionParticipants.open(task.id);return;}}else if(task&&(task.status==='done'||window.confirm('Terminer « '+task.title+' » ?'))){E.action('fmsAction','toggle',{id:task.id});}}else{const task=E.read().state.autoTasks.find(t=>t.key===check.dataset.e01Complete);if(!task||task.state!=='open'||!window.confirm('Terminer « '+task.title+' » ?'))return;const input=E.win().document.createElement('input');input.type='checkbox';input.hidden=true;input.dataset.autotask=check.dataset.e01Complete;E.win().document.body.append(input);try{input.checked=true;input.dispatchEvent(new (E.win().Event)('change',{bubbles:true}));}finally{input.remove();}}window.DobbyStitchV7.refresh();}catch(error){const notice=message(error.message);notice.setAttribute('role','alert');document.querySelector('main').prepend(notice);}return;}
location.href=addButton?'./famille.html#mission-edit':link.dataset.e01Href;
},true);
document.addEventListener('keydown',event=>{const link=event.target.closest('[data-e01-href]');if(link&&event.target===link&&['Enter',' '].includes(event.key)){event.preventDefault();link.click();}});
return {render,eventSaved(){location.href='./traverse.html';return Promise.resolve();},eventCancelled(){location.href='./traverse.html';return Promise.resolve();},reset(){offset=0;if(document.body.dataset.dv7Screen==='traverse')window.DobbyStitchV7?.refresh();}};
})();
