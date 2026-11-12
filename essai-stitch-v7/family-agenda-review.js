/* FAM-18..20 presentation adapter. Native event forms/actions remain the writer. */
window.DobbyFamilyAgendaReview=(()=>{
 'use strict';
 const E=window.DobbyFamilyStitchEngine;
 let session=null;
 const clone=value=>value?JSON.parse(JSON.stringify(value)):null;
 const labelDate=value=>value?new Date(value+'T12:00:00').toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'Date non renseignée';
 const node=(tag,value,className)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=value;if(className)el.className=className;return el;};
 const row=(c,...children)=>{const el=node('div',undefined,'fam-review-actions');el.append(...children);return el;};
 const primary=button=>{button.classList.add('fam-review-primary');return button;};
 const origin=(ui,fallback='agenda')=>['salon','agenda'].includes(ui.origin)?ui.origin:fallback;
 const viewOrigin=c=>c.ui.view==='salon'?'salon':'agenda';
 function shiftMonth(day,delta){const [year,month,date]=day.split('-').map(Number),target=new Date(Date.UTC(year,month-1+delta,1)),lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();return target.getUTCFullYear()+'-'+String(target.getUTCMonth()+1).padStart(2,'0')+'-'+String(Math.min(date,lastDay)).padStart(2,'0');}
 const setDialog=(c,value)=>c.dialog?.(value);
 const find=id=>{const event=E.read().events.find(item=>item.id===id);if(!event)throw Error('Cet événement n’existe plus. Revenez à l’agenda.');return event;};
 function fresh(id){const current=find(id);if(session?.id===id&&JSON.stringify(current)!==JSON.stringify(session.snapshot))throw Error('Cet événement a été modifié depuis son ouverture. Votre saisie est conservée. Fermez puis consultez la nouvelle version.');return current;}
 function dialog(c,title){
  document.getElementById('fa-dialog')?.remove();
  const root=node('div');root.id='fa-dialog';root.dataset.famEvent='';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',title);
  const panel=node('section',undefined,'fam-review-panel');const h=node('h2',title);h.id='fam-event-dialog-title';root.setAttribute('aria-labelledby',h.id);panel.append(h);root.append(panel);document.body.append(root);return panel;
 }
 function showEvent(c,id){
  const event=find(id);session={id,snapshot:clone(event),origin:origin(c.ui,viewOrigin(c)),mode:'read'};setDialog(c,{kind:'event-read',id});
  const panel=dialog(c,event.title);panel.dataset.famEventRead='';const details=node('dl',undefined,'fam-review-details');
  for(const [label,value]of [['Date',labelDate(event.date)],['Heure',event.time],['Catégorie',event.category],['Personne / groupe',event.person],['Lieu',event.location]])if(value)details.append(node('dt',label),node('dd',value));
  panel.append(details);if(event.note)panel.append(node('p',event.note,'fam-review-body'));
  panel.append(row(c,primary(c.button('event-edit','Modifier',{record:id})),c.button('event-delete','Supprimer',{record:id}),c.button('event-export','Exporter (.ics)',{record:id})),c.button('dialog-close','Retour'));
  panel.querySelector('button')?.focus();
 }
 function beginEvent(c,id,values){
  const event=id?find(id):null;
  // Keep the consultation snapshot when moving into edit mode, so an update
  // received in between cannot silently become the base of an old detail view.
  if(event&&session?.id===id)fresh(id);
  session={id:id||null,snapshot:clone(event),origin:origin(c.ui,viewOrigin(c)),mode:'edit'};setDialog(c,{kind:'event',id,values:values||null});
  const native=E.eventForm(id);if(!native)throw Error('Le formulaire de l’événement est indisponible.');
  const panel=dialog(c,id?'Modifier l’événement':'Ajouter un événement'),form=document.importNode(native,true);
  form.id='fa-native-form';form.dataset.kind='event';form.dataset.record=id||'';form.className='fa-native fam-review-form';
  form.querySelectorAll('button').forEach(button=>button.remove());
  for(const empty of form.querySelectorAll('.fp-dialog-actions'))empty.remove();
  for(const field of form.querySelectorAll('input:not([type="hidden"]),select,textarea')){
   field.className='';field.closest('label')?.classList.add('fa-field');
   if(values&&Object.hasOwn(values,field.name))field.value=values[field.name];
  }
  if(!id&&!values&&c.ui.day)form.elements.namedItem('date').value=c.ui.day;
  const people=node('datalist');people.id='fa-event-people';for(const member of E.read().members)people.append(new Option(member.name,member.name));form.append(people);form.elements.namedItem('person').setAttribute('list',people.id);
  const save=node('button',id?'Enregistrer les modifications':'Enregistrer l’événement','fa-button fam-review-primary');save.type='submit';
  form.append(row(c,save,c.button('dialog-close','Annuler')));panel.append(form);form.querySelector('input:not([type="hidden"])')?.focus();
 }
 function closeEvent(c){
  const destination=session?.origin||origin(c.ui,viewOrigin(c));session=null;setDialog(c,null);document.getElementById('fa-dialog')?.remove();return c.open(destination,{origin:destination,record:null});
 }
 function saveEvent(c,form){
  if(!form.reportValidity())return;
  const id=form.dataset.record||null;if(id)fresh(id);const values=Object.fromEntries(new FormData(form));
  // E.saveEvent invokes the original fpEventForm submit listener, including
  // its native validation, stable identifier and family synchronization.
  E.saveEvent(id,values);c.ui.day=values.date;return closeEvent(c);
 }
 function renderAgenda(c){
  const {data,ui,main}=c;ui.day ||= E.evaluate('return todayISO();');
  // The original agenda template nests a second fixed dock and a header in
  // main. Only content is replaced; the common permanent DOBBY bars stay put.
  main.replaceChildren();main.classList.add('fam-review-main');document.getElementById('fa-supplement')?.replaceChildren();
  const intro=node('section',undefined,'fam-review-heading');intro.append(node('h1','Agenda familial'),primary(c.button('event-new','Ajouter un événement')));main.append(intro);
  const controls=node('section',undefined,'fam-review-calendar');controls.setAttribute('aria-label','Calendrier familial');
  const month=ui.calendarMode==='month',week=c.button('agenda-mode','Semaine',{mode:'week'}),monthButton=c.button('agenda-mode','Mois',{mode:'month'});week.id='btn-view-week';monthButton.id='btn-view-month';week.setAttribute('aria-pressed',String(!month));monthButton.setAttribute('aria-pressed',String(month));
  controls.append(row(c,week,monthButton),node('h2',new Date(ui.day+'T12:00:00').toLocaleDateString('fr-BE',{month:'long',year:'numeric'})));
  const previous=c.button(month?'agenda-month-shift':'agenda-shift','←',{delta:month?'-1':'-7'}),next=c.button(month?'agenda-month-shift':'agenda-shift','→',{delta:month?'1':'7'});previous.setAttribute('aria-label','Période précédente');next.setAttribute('aria-label','Période suivante');
  const days=node('div',undefined,'fam-review-days');days.dataset.famCalendar='';const start=month?ui.day.slice(0,8)+'01':ui.day,count=month?new Date(Number(ui.day.slice(0,4)),Number(ui.day.slice(5,7)),0).getDate():7;
  for(let index=0;index<count;index++){
   const value=E.evaluate('return addDays(p.day,p.index);',{day:start,index}),events=data.events.filter(event=>event.date===value),b=c.button('agenda-day',new Date(value+'T12:00:00').toLocaleDateString('fr-BE',{weekday:'short',day:'numeric'}),{date:value});
   b.setAttribute('aria-pressed',String(value===ui.day));b.setAttribute('aria-label',labelDate(value)+(events.length?' · '+events.length+' événement'+(events.length>1?'s':''):''));if(events.length)b.append(node('span',String(events.length),'fam-review-day-count'));days.append(b);
  }
  controls.append(row(c,previous,next),days);main.append(controls);
  const filters=node('div',undefined,'fam-review-filters');filters.setAttribute('aria-label','Filtrer par membre');for(const member of [{id:'',name:'Tout le foyer'},...data.members]){const b=c.button('agenda-person',member.name,{person:member.id});b.setAttribute('aria-pressed',String((ui.agendaPerson||'')===member.id));filters.append(b);}main.append(filters);
  const filter=data.members.find(member=>member.id===ui.agendaPerson),events=data.events.filter(event=>event.date===ui.day&&(!filter||event.personId===filter.id||event.person===filter.name)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const list=node('section',undefined,'fam-review-event-list');list.setAttribute('aria-label','Événements du jour');list.append(node('h2',labelDate(ui.day)));
  for(const event of events){const card=node('article',undefined,'fam-review-record');c.bind(card,'event-open',{record:event.id,origin:'agenda'});card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Consulter '+event.title);card.append(node('h3',event.title),c.paragraph([event.time||'Toute la journée',event.person,event.location].filter(Boolean).join(' · ')));list.append(card);}
  if(!events.length)list.append(c.paragraph('Aucun événement à cette date.'));
  const shared=data.shared.filter(visit=>visit.date===ui.day&&(!filter||(visit.personId?visit.personId===filter.id:visit.person===filter.name&&data.members.filter(member=>member.name===visit.person).length===1)));
  for(const visit of shared){const card=node('article',undefined,'fam-review-record');card.append(node('h3',visit.title||visit.name),c.paragraph([visit.time,visit.person,visit.provider].filter(Boolean).join(' · ')),c.button('medical-edit','Consulter le rendez-vous partagé',{record:visit.id,scope:'shared',person:visit.personId||''}));list.append(card);}main.append(list);
  const deadlines=data.upcoming.filter(item=>!['event','medical'].includes(item.kind));if(deadlines.length){const details=node('details',undefined,'fam-review-deadlines');details.append(node('summary','Échéances des autres modules'));for(const item of deadlines)details.append(c.paragraph(labelDate(item.date)+' · '+item.title));main.append(details);}
  const footer=node('div',undefined,'fam-review-status');footer.append(c.paragraph(data.status),c.button('salon','Revenir au Salon'));main.append(footer);
 }
 function action(c,action,el){
  const handled=value=>({handled:true,value});
  if(action==='agenda-month-shift'){c.ui.day=shiftMonth(c.ui.day,Number(el.dataset.delta));return handled(c.render());}
  if(action==='event-new'){c.ui.origin=viewOrigin(c);session=null;if(c.ui.view!=='agenda')return handled(c.open('agenda',{eventNew:true,origin:c.ui.origin}));return handled(beginEvent(c));}
  if(action==='event-open'){c.ui.origin=el.dataset.origin==='salon'?'salon':viewOrigin(c);return handled(showEvent(c,el.dataset.record));}
  if(action==='event-edit')return handled(beginEvent(c,el.dataset.record));
  if(action==='event-delete'){const id=el.dataset.record;fresh(id);E.deleteEvent(id);if(!E.read().events.some(event=>event.id===id))return handled(closeEvent(c));return handled(undefined);}
  if(action==='event-export'){E.exportEvent(el.dataset.record);return handled(undefined);}
  if(action==='dialog-close'&&document.querySelector('#fa-dialog[data-fam-event]'))return handled(closeEvent(c));
  return {handled:false};
 }
 return Object.freeze({renderAgenda,showEvent,beginEvent,closeEvent,saveEvent,action,origin,get busy(){return Boolean(session&&document.querySelector('#fa-dialog[data-fam-event]'));}});
})();
