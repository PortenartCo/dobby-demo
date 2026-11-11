/* E03 presentation only. Native state, forms, writers and shared chrome own behavior. */
window.DobbyMissions=(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
let status='open',member='all',period='week',data=null;
const limits={period:10,late:10,undated:10},expanded={late:false,undated:false};
const validDay=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value:'';};
const brusselsDay=value=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value),part=key=>parts.find(x=>x.type===key).value;return `${part('year')}-${part('month')}-${part('day')}`;};
const today=()=>brusselsDay(new Date());
const addDays=(day,count)=>{const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+count);return date.toISOString().slice(0,10);};
const dateLabel=value=>validDay(value)?new Date(value+'T12:00:00Z').toLocaleDateString('fr-BE',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'}):value?'Échéance non reconnue':'Sans échéance';
const completionDay=value=>{if(validDay(value))return value;if(typeof value!=='string'||!validDay(value.slice(0,10))||!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value))return '';const date=new Date(value);return Number.isFinite(date.getTime())?brusselsDay(date):'';};
const reference=t=>t.done?(completionDay(t.row.completedAt)||validDay(t.row.due)):validDay(t.row.due);
const form=id=>'./famille.html#mission-edit'+(id?'?record='+encodeURIComponent(id):'');
function source(row){if(row.origin==='equipment'&&(data.houseItems||[]).some(x=>x.id===row.originId))return './famille.html#equipment?record='+encodeURIComponent(row.originId);if(row.origin==='document'&&(data.familyDocs||[]).some(x=>x.id===row.originId))return './famille.html#document?record='+encodeURIComponent(row.originId);return '';}
function rows(){
 const seen=new Set(),identities=new Set();
 return [...(data.manualMissions||[]).map(row=>({row,manual:true,id:row.id,done:row.status==='done'})),...(data.autoTasks||[]).filter(row=>['open','done'].includes(row.state)).map(row=>({row,manual:false,id:row.key,done:row.state==='done'}))].filter(t=>{
  const key=(t.manual?'manual:':'auto:')+t.id,series=t.manual&&(t.row.seriesId||t.row.recurrence?.seriesId),day=validDay(t.row.occurrenceDate||t.row.due),identity=series&&day?series+':'+day:'';
  if(t.id&&seen.has(key)||identity&&identities.has(identity))return false;if(t.id)seen.add(key);if(identity)identities.add(identity);return true;
 });
}
function resetLimits(){for(const key of Object.keys(limits))limits[key]=10;}
function rememberFocus(){const active=document.activeElement,button=active?.closest('[data-e03-status],[data-e03-member],[data-e03-period],[data-e03-more]');if(button){for(const key of ['status','member','period','more'])if(button.hasAttribute('data-e03-'+key))return {key,value:button.getAttribute('data-e03-'+key)};}const section=active?.closest('[data-e03-section]');return active?.tagName==='SUMMARY'&&section?{key:'section',value:section.dataset.e03Section}:null;}
function restoreFocus(focus){if(!focus)return;const selector=focus.key==='section'?'[data-e03-section]':'[data-e03-'+focus.key+']',target=[...document.querySelectorAll(selector)].find(el=>el.getAttribute('data-e03-'+focus.key)===focus.value);if(target)(focus.key==='section'?target.querySelector('summary'):target).focus({preventScroll:true});else if(focus.key==='more')document.getElementById('e03-'+focus.value+'-title')?.focus({preventScroll:true});}
function card(t,members){
 const r=t.row,m=members.find(m=>m.id===r.assigneeId),owner=m?.name||m?.firstName||(r.assigneeId?'Ancien membre':'Non attribuée'),href=t.manual&&t.id?form(t.id):!t.manual?source(r):'',completed=t.done?completionDay(r.completedAt):'';
 const content=`<span class="e03-task-icon">${icon(t.done?'task_alt':t.manual?'history_edu':'auto_awesome')}</span><span class="e03-task-body"><strong>${esc(r.title||'Mission')}</strong><span class="e03-meta"><span>${icon('person')}${esc(owner)}</span><span>${icon('schedule')}${esc(dateLabel(r.due))}</span><span class="${t.done?'e03-done':''}">${icon(t.done?'check_circle':'radio_button_unchecked')}${t.done?'Terminée':'À faire'}</span>${t.done?`<span>${icon('event_available')}${completed?'Terminée le '+esc(dateLabel(completed)):'Clôture non datée · échéance utilisée'}</span>`:''}${!t.manual?'<span>Automatique</span>':''}</span></span>${href?icon('chevron_right'):''}`;
 const attrs=`class="e03-card" data-e03-card="${esc(t.id)}" data-e03-kind="${t.manual?'manual':'auto'}"`;
 return href?`<a ${attrs} ${t.manual?`data-dv7-mission-edit="${esc(t.id)}"`:''} href="${esc(href)}">${content}</a>`:`<details ${attrs}><summary>${content}</summary><p>Consultation uniquement · ${esc(r.sourceLabel||r.title||'Mission')}. ${t.manual?'Identifiant de modification indisponible.':'Fiche source indisponible.'}</p></details>`;
}
function render(next){
 data=next;const filters=document.querySelector('[data-e03-filters]'),list=document.querySelector('[data-e03-list]'),family=document.querySelector('[data-e03-family]');if(!filters||!list||!family)throw Error('Missing Missions E03 composition');
 const focus=rememberFocus();for(const details of list.querySelectorAll('[data-e03-section]'))expanded[details.dataset.e03Section]=details.open;
 const members=data.familyMembers||[],all=rows(),day=today(),end=addDays(day,period==='month'?29:period==='today'?0:6);if(member!=='all'&&member!=='unassigned'&&!members.some(m=>m.id===member))member='all';
 const assigned=t=>t.manual&&members.some(m=>m.id===t.row.assigneeId)?t.row.assigneeId:'unassigned';
 const bucket=t=>{const date=reference(t);if(!date)return 'undated';if(!t.done&&date<day)return 'late';return period==='all'||date>=day&&date<=end?'period':'';};
 const selected=all.filter(t=>(member==='all'||assigned(t)===member)&&bucket(t)),matches=(t,s)=>s==='all'||s==='done'&&t.done||s==='open'&&!t.done||s==='urgent'&&!t.done&&!!validDay(t.row.due)&&t.row.due<=day;
 let controls=filters.parentElement.querySelector('[data-e03-period-control]');if(!controls){controls=document.createElement('div');controls.dataset.e03PeriodControl='true';controls.className='e03-period-control';filters.before(controls);}
 controls.innerHTML=`<label for="e03-period">Période</label><select id="e03-period" data-e03-period aria-describedby="e03-period-label" aria-label="Période des missions">${[['week','7 prochains jours'],['today',"Aujourd’hui"],['month','30 prochains jours'],['all','Toutes les missions']].map(([key,label])=>`<option value="${key}"${key===period?' selected':''}>${label}</option>`).join('')}</select><p id="e03-period-label" data-e03-period-label>${period==='all'?'Toutes les dates':period==='today'?'Aujourd’hui · '+esc(dateLabel(day)):'Du '+esc(dateLabel(day))+' au '+esc(dateLabel(end))+' inclus'}</p><p class="e03-period-help">Retards et missions sans échéance restent accessibles ci-dessous. Pour les missions terminées : date de clôture, ou échéance si elle est inconnue.</p>`;
 filters.innerHTML=[['open','À faire','history_edu'],['all','Toutes','auto_stories'],['urgent','Urgentes','bolt'],['done','Terminées','task_alt']].map(([key,label,symbol])=>`<button type="button" data-e03-status="${key}" aria-pressed="${key===status}">${icon(symbol)}<span>${label} (${selected.filter(t=>matches(t,key)).length})</span></button>`).join('');
 const visible=selected.filter(t=>matches(t,status)),ordered=(a,b)=>a.done!==b.done?(a.done?1:-1):(a.done?reference(b).localeCompare(reference(a)):reference(a).localeCompare(reference(b)))||String(a.row.title||'').localeCompare(String(b.row.title||''),'fr');
 const groups={period:visible.filter(t=>bucket(t)==='period').sort(ordered),late:visible.filter(t=>bucket(t)==='late').sort((a,b)=>reference(b).localeCompare(reference(a))||ordered(a,b)),undated:visible.filter(t=>bucket(t)==='undated').sort(ordered)};
 const contents=(key)=>groups[key].slice(0,limits[key]).map(t=>card(t,members)).join('')+(groups[key].length>limits[key]?`<button type="button" class="e03-more" data-e03-more="${key}">Voir davantage (${groups[key].length-limits[key]} restantes)</button>`:'');
 list.innerHTML=visible.length?`<div data-e03-main><h3 id="e03-period-title" class="e03-bucket-title" tabindex="-1">${period==='all'?'Missions datées':'Dans la période'} (${groups.period.length})</h3>${groups.period.length?contents('period'):'<p class="dv7-empty">Aucune mission dans cette période pour ces filtres.</p>'}</div>`+[['late','En retard'],['undated','Sans échéance reconnue']].filter(([key])=>groups[key].length).map(([key,label])=>`<details class="e03-bucket" data-e03-section="${key}"${expanded[key]?' open':''}><summary id="e03-${key}-title">${label} (${groups[key].length})</summary><div class="e03-bucket-content">${contents(key)}</div></details>`).join(''):'<p class="dv7-empty">Aucune mission pour ces filtres.</p>';
 const count=id=>all.filter(t=>!t.done&&(id==='all'||assigned(t)===id)).length;
 const person=(id,name,avatar)=>{const n=count(id);return `<button type="button" data-e03-member="${esc(id)}" aria-pressed="${member===id}"><span class="e03-avatar" aria-hidden="true">${esc(avatar||'👤')}</span><span><strong>${esc(name)}</strong><small>${n} mission${n!==1?'s':''} ouverte${n!==1?'s':''}</small></span>${icon(member===id?'check_circle':'chevron_right')}</button>`;};
 family.innerHTML='<p class="e03-count-scope" data-e03-count-scope>Missions ouvertes · ensemble du registre, toutes périodes.</p>'+person('all','Toute la maisonnée','🏠')+members.map(m=>person(m.id,m.name||m.firstName||'Membre',m.avatar)).join('')+person('unassigned','Non attribuées / ancien membre','📜');
 restoreFocus(focus);
}
document.addEventListener('change',event=>{if(document.body.dataset.dv7Screen!=='missions'||!event.target.matches('[data-e03-period]'))return;period=event.target.value;resetLimits();render(data);});
document.addEventListener('click',event=>{if(document.body.dataset.dv7Screen!=='missions')return;const button=event.target.closest('[data-e03-status],[data-e03-member],[data-e03-more]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();if(button.dataset.e03More)limits[button.dataset.e03More]+=10;else{if(button.dataset.e03Status)status=button.dataset.e03Status;else member=button.dataset.e03Member;resetLimits();}render(data);},true);
return {render};
})();
