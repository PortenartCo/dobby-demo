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
function days(day){let row=document.querySelector('[data-e01-days]');if(!row){row=document.createElement('section');row.dataset.e01Days='true';row.setAttribute('aria-label','Les sept prochains jours');section('Missions du Jour').before(row);}row.replaceChildren();for(let i=0;i<7;i++){const date=add(localDay(),i),d=new Date(date+'T12:00:00'),button=document.createElement('button');button.type='button';button.dataset.e01Day=String(i);button.setAttribute('aria-label',label(date));button.setAttribute('aria-pressed',String(date===day));const name=document.createElement('span');name.textContent=i===0?'Auj.':d.toLocaleDateString('fr-BE',{weekday:'short'});const number=document.createElement('span');number.textContent=d.getDate();button.append(name,number);row.append(button);}}
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
const title=card.querySelector('h3');title.textContent=recipe?.name||'Aucun repas prévu';title.nextElementSibling.textContent=recipe?`${planned.people||recipe.servings} convives`:'À choisir';title.parentElement.nextElementSibling.textContent=recipe?'Repas enregistré dans votre planning DOBBY.':'Choisir un repas dans la Taverne gourmande.';
const labels=[...card.querySelectorAll('.grid > div')];labels[0].lastElementChild.textContent=recipe?`${recipe.minutes||0} min`:'—';for(const box of labels.slice(1))box.lastElementChild.textContent='Non renseigné';
card.querySelector('.bg-surface-container-lowest p').textContent=recipe?'Consultez la fiche recette pour ses ingrédients et sa préparation.':'Aucun repas enregistré pour ce soir.';
card.querySelector('h2').parentElement.nextElementSibling.textContent=label(day);card.dataset.e01Href=recipe?'./index.html#recipe?id='+encodeURIComponent(recipe.id):'./index.html#pick?date='+day;card.setAttribute('aria-label',recipe?'Voir la recette '+recipe.name:'Choisir un repas pour '+label(day));section('Festin du Soir').replaceWith(mealSection);
const gazette=originals.gazette.cloneNode(true),events=(data.agenda||[]).filter(e=>e.date===day).map(e=>({...e,label:e.title,person:e.meta})).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||a.label.localeCompare(b.label,'fr'));
const container=gazette.lastElementChild,proto=container.firstElementChild.cloneNode(true);container.replaceChildren();gazette.querySelector('h2').parentElement.nextElementSibling.textContent=label(day);
for(const event of events){const row=proto.cloneNode(true);row.dataset.e01Event=event.id;row.dataset.e01Href='./famille.html#agenda?day='+day;row.tabIndex=0;row.setAttribute('role','link');row.querySelector('h4').textContent=event.label;row.querySelector('.material-symbols-outlined').textContent='event';row.querySelector('p').textContent=[event.person,event.location].filter(Boolean).join(' · ')||'Consulter dans l’Agenda';const time=row.querySelector('.font-label-md');time.textContent=event.time||'Journée';container.append(row);}if(!events.length)container.append(empty('Aucun événement ni rendez-vous partagé pour cette journée.'));section('Gazette des Curiosités').replaceWith(gazette);
}
document.addEventListener('click',event=>{const day=event.target.closest('[data-e01-day]'),check=event.target.closest('[data-e01-complete]'),addButton=event.target.closest('[data-e01-add]'),link=event.target.closest('[data-e01-href]');if(!day&&!check&&!addButton&&!link)return;event.preventDefault();event.stopImmediatePropagation();
if(day){offset=Math.max(0,Math.min(6,Number(day.dataset.e01Day)));window.DobbyStitchV7.refresh();return;}
if(check){if(check.disabled)return;try{if(check.dataset.e01Kind==='manual'){const task=E.read().state.manualMissions.find(t=>t.id===check.dataset.e01Complete);if(task&&task.status!=='done')E.action('fmsAction','toggle',{id:task.id});}else{const input=E.win().document.createElement('input');input.type='checkbox';input.hidden=true;input.dataset.autotask=check.dataset.e01Complete;E.win().document.body.append(input);try{input.checked=true;input.dispatchEvent(new (E.win().Event)('change',{bubbles:true}));}finally{input.remove();}}window.DobbyStitchV7.refresh();}catch(error){const notice=empty(error.message);notice.setAttribute('role','alert');document.querySelector('main').prepend(notice);}return;}
location.href=addButton?'./famille.html#mission-edit':link.dataset.e01Href;
},true);
document.addEventListener('keydown',event=>{const link=event.target.closest('[data-e01-href]');if(link&&event.target===link&&['Enter',' '].includes(event.key)){event.preventDefault();link.click();}});
return {render,reset(){offset=0;if(document.body.dataset.dv7Screen==='traverse')window.DobbyStitchV7?.refresh();}};
})();
