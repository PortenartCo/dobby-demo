/* E03 presentation only. Native state, forms, writers and shared chrome own behavior. */
window.DobbyMissions=(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
let status='open',member='all',data=null;
const validDay=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';const day=new Date(value+'T12:00:00');return Number.isFinite(day.getTime())&&day.getFullYear()===Number(value.slice(0,4))&&day.getMonth()+1===Number(value.slice(5,7))&&day.getDate()===Number(value.slice(8,10))?value:'';};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const dateLabel=value=>validDay(value)?new Date(value+'T12:00:00').toLocaleDateString('fr-BE',{day:'numeric',month:'short',year:'numeric'}):value?'Échéance non reconnue':'Sans échéance';
const form=id=>'./famille.html#mission-edit'+(id?'?record='+encodeURIComponent(id):'');
function source(row){if(row.origin==='equipment'&&(data.houseItems||[]).some(x=>x.id===row.originId))return './famille.html#equipment?record='+encodeURIComponent(row.originId);if(row.origin==='document'&&(data.familyDocs||[]).some(x=>x.id===row.originId))return './famille.html#document?record='+encodeURIComponent(row.originId);return '';}
function rows(){return [...(data.manualMissions||[]).map(row=>({row,manual:true,id:row.id,done:row.status==='done'})),...(data.autoTasks||[]).filter(row=>['open','done'].includes(row.state)).map(row=>({row,manual:false,id:row.key,done:row.state==='done'}))];}
function render(next){data=next;const filters=document.querySelector('[data-e03-filters]'),list=document.querySelector('[data-e03-list]'),family=document.querySelector('[data-e03-family]');if(!filters||!list||!family)throw Error('Missing Missions E03 composition');
const focus=document.activeElement?.closest('[data-e03-status],[data-e03-member]'),focusKind=focus?.hasAttribute('data-e03-status')?'status':'member',focusValue=focus?.getAttribute('data-e03-'+focusKind);
const members=data.familyMembers||[],all=rows(),day=today();if(member!=='all'&&member!=='unassigned'&&!members.some(m=>m.id===member))member='all';
const assigned=t=>t.manual&&members.some(m=>m.id===t.row.assigneeId)?t.row.assigneeId:'unassigned';
const selected=all.filter(t=>member==='all'||assigned(t)===member),matches=(t,s)=>s==='all'||s==='done'&&t.done||s==='open'&&!t.done||s==='urgent'&&!t.done&&!!validDay(t.row.due)&&t.row.due<=day;
filters.innerHTML=[['open','À faire','history_edu'],['all','Toutes','auto_stories'],['urgent','Urgentes','bolt'],['done','Terminées','task_alt']].map(([key,label,symbol])=>`<button type="button" data-e03-status="${key}" aria-pressed="${key===status}">${icon(symbol)}<span>${label} (${selected.filter(t=>matches(t,key)).length})</span></button>`).join('');
const visible=selected.filter(t=>matches(t,status));list.innerHTML=visible.length?visible.map(t=>{const r=t.row,m=members.find(m=>m.id===r.assigneeId),owner=m?.name||m?.firstName||(r.assigneeId?'Ancien membre':'Non attribuée'),href=t.manual&&t.id?form(t.id):!t.manual?source(r):'';
const content=`<span class="e03-task-icon">${icon(t.done?'task_alt':t.manual?'history_edu':'auto_awesome')}</span><span class="e03-task-body"><strong>${esc(r.title||'Mission')}</strong><span class="e03-meta"><span>${icon('person')}${esc(owner)}</span><span>${icon('schedule')}${esc(dateLabel(r.due))}</span><span class="${t.done?'e03-done':''}">${icon(t.done?'check_circle':'radio_button_unchecked')}${t.done?'Terminée':'À faire'}</span>${!t.manual?'<span>Automatique</span>':''}</span></span>${href?icon('chevron_right'):''}`;
const attrs=`class="e03-card" data-e03-card="${esc(t.id)}" data-e03-kind="${t.manual?'manual':'auto'}"`;
return href?`<a ${attrs} ${t.manual?`data-dv7-mission-edit="${esc(t.id)}"`:''} href="${esc(href)}">${content}</a>`:`<details ${attrs}><summary>${content}</summary><p>Consultation uniquement · ${esc(r.sourceLabel||r.title||'Mission')}. ${t.manual?'Identifiant de modification indisponible.':'Fiche source indisponible.'}</p></details>`;}).join(''):'<p class="dv7-empty">Aucune mission pour ces filtres.</p>';
const count=id=>all.filter(t=>!t.done&&(id==='all'||assigned(t)===id)).length;
const person=(id,name,avatar)=>{const n=count(id);return `<button type="button" data-e03-member="${esc(id)}" aria-pressed="${member===id}"><span class="e03-avatar" aria-hidden="true">${esc(avatar||'👤')}</span><span><strong>${esc(name)}</strong><small>${n} mission${n!==1?'s':''} ouverte${n!==1?'s':''}</small></span>${icon(member===id?'check_circle':'chevron_right')}</button>`;};
family.innerHTML=person('all','Toute la maisonnée','🏠')+members.map(m=>person(m.id,m.name||m.firstName||'Membre',m.avatar)).join('')+person('unassigned','Non attribuées / ancien membre','📜');
if(focusValue!==undefined&&focusValue!==null)[...document.querySelectorAll('[data-e03-'+focusKind+']')].find(b=>b.getAttribute('data-e03-'+focusKind)===focusValue)?.focus({preventScroll:true});
}
document.addEventListener('click',event=>{if(document.body.dataset.dv7Screen!=='missions')return;const button=event.target.closest('[data-e03-status],[data-e03-member]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();if(button.dataset.e03Status)status=button.dataset.e03Status;else member=button.dataset.e03Member;render(data);},true);
return {render};
})();
