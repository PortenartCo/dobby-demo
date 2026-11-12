/* Four Stitch compositions, routed in Famille with its permanent native chrome. */
window.DobbyPreparationUI=(()=>{
 'use strict';
 const E=window.DobbyFamilyStitchEngine,copy=x=>JSON.parse(JSON.stringify(x));
 const routes=['models','model-edit','preparations'];let draft=null,baseline=null,draftKey='',pending=false;
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const native=(method,p)=>E.evaluate('return window.DobbyPreparations[p.method](...p.args);',{method,args:p});
 const template=(...args)=>native('template',args),write=(...args)=>native('preparation',args);
 const list=()=>E.read().state.preparationTemplates||[];
 const find=id=>list().find(t=>t.id===id);
 const event=id=>E.read().events.find(e=>e.id===id);
 function button(c,action,label,data={}){return c.button('prep-'+action,label,data);}
 function primary(b){b.classList.add('prep-primary');return b;}
 function field(form,label,name,value,type='text'){const wrap=node('label',label,'prep-field'),input=node('input');input.name=name;input.type=type;input.value=value??'';input.maxLength=name==='name'?200:40;if(type==='number'){input.min=0;input.max=999999;input.step='any';}wrap.append(input);form.append(wrap);return input;}
 function itemForm(c,section,action,item={}){
  const form=node('form',undefined,'prep-item-form');form.dataset.prepForm=action;form.dataset.item=item.id||'';
  const name=field(form,'Élément','name',item.name);name.required=true;
  field(form,'Quantité (facultative)','qty',item.qty,'number');field(form,'Unité (facultative)','unit',item.unit);
  const save=node('button',item.id?'Valider la modification':'Ajouter','fa-button prep-primary');save.type='submit';save.dataset.prepSubmit='true';form.append(save);
  if(item.id)form.append(button(c,'item-cancel','Annuler'));section.append(form);return form;
 }
 function heading(main,kicker,title,description){const hero=node('section',undefined,'prep-hero');hero.append(node('p',kicker,'prep-kicker'),node('h1',title));if(description)hero.append(node('p',description,'prep-description'));main.append(hero);return hero;}
 function render(c){
  const {main,ui}=c;main.replaceChildren();main.className='prep-main';document.getElementById('fa-supplement')?.replaceChildren();
  if(ui.view==='models'){
   draft=null;draftKey='';main.append(button(c,'home','← Famille'));heading(main,'LE CABINET DES CURIOSITÉS','Mes modèles','Des listes à réutiliser pour les événements du foyer.');
   main.append(primary(button(c,'new','＋ Créer un modèle')));const rows=list().slice().sort((a,b)=>a.name.localeCompare(b.name,'fr'));
   main.append(node('p','Vos modèles · '+rows.length,'prep-kicker'));
   for(const row of rows){const card=node('article',undefined,'prep-card');const icon=node('span','checklist','material-symbols-outlined prep-icon');const text=node('div');text.append(node('h2',row.name),node('p',row.items.length+' éléments'));card.append(icon,text,button(c,'open','Ouvrir',{record:row.id}));main.append(card);}
   if(!rows.length)main.append(node('p','Aucun modèle enregistré. Créez votre première liste de préparation.','prep-empty'));
  }else if(ui.view==='model-edit'){
   const key=ui.record||'new';if(draftKey!==key){const row=find(ui.record);if(ui.record&&!row){main.append(node('p','Ce modèle n’existe plus.'),button(c,'models','Mes modèles'));return;}baseline=row?copy(row):null;draft=copy(row||{name:'',items:[]});draftKey=key;}
   main.append(button(c,'models','← Mes modèles'));heading(main,'MODÈLE RÉUTILISABLE',ui.record?'Modifier le modèle':'Créer un modèle','Les préparatifs déjà associés aux événements restent indépendants.');
   const nameForm=node('div',undefined,'prep-name');const name=field(nameForm,'Nom du modèle','modelName',draft.name);name.maxLength=140;name.required=true;name.id='prep-model-name';name.addEventListener('input',()=>draft.name=name.value);main.append(nameForm);
   const section=node('section');section.append(node('h2','Éléments · '+draft.items.length));itemForm(c,section,'draft-add');
   draft.items.forEach((item,index)=>{const card=node('article',undefined,'prep-card prep-edit-row');card.append(node('span',item.name,'prep-item-name'),node('small',quantity(item)));const controls=node('div',undefined,'prep-actions');for(const [action,label]of [['up','↑'],['down','↓'],['edit-draft','Modifier'],['remove-draft','Retirer']]){const b=button(c,action,label,{item:item.id});if(action==='up'||action==='down'){b.disabled=action==='up'?index===0:index===draft.items.length-1;b.setAttribute('aria-label',(action==='up'?'Monter ':'Descendre ')+item.name);}controls.append(b);}card.append(controls);section.append(card);});
   if(!draft.items.length)section.append(node('p','Aucun élément. Ajoutez ce que vous souhaitez préparer.','prep-empty'));main.append(section);
   const actions=node('div',undefined,'prep-actions');actions.append(primary(button(c,'save','Enregistrer')),button(c,'models','Annuler'));if(ui.record)actions.append(button(c,'duplicate','Dupliquer'),button(c,'delete','Supprimer le modèle'));main.append(actions);
  }else{
   const current=event(ui.record);if(!current?.preparation){main.append(node('p','Aucune liste de préparation associée à cet événement.'),button(c,'agenda','Retour à l’agenda'));return;}
   const rows=current.preparation.items,done=rows.filter(i=>i.done).length;main.append(button(c,'event','← '+current.title));const hero=heading(main,'AGENDA ENCHANTÉ · PRÉPARATIFS','Préparatifs',current.title+' · '+new Date(current.date+'T12:00:00').toLocaleDateString('fr-BE')+(current.time?' · '+current.time:''));
   const progress=node('div',undefined,'prep-progress');progress.append(node('p',done+' sur '+rows.length+' préparés · '+(rows.length?Math.round(done/rows.length*100):0)+' %'));const bar=node('progress');bar.max=rows.length||1;bar.value=done;bar.setAttribute('aria-label','Progression des préparatifs');progress.append(bar);hero.append(progress);
   const add=node('section');add.append(node('h2','Ajouter un élément'));itemForm(c,add,'event-add');main.append(add);
   for(const completed of [false,true]){const section=node('section',undefined,'prep-group');section.append(node('h2',(completed?'Terminés':'À préparer')+' ('+rows.filter(i=>Boolean(i.done)===completed).length+')'));for(const item of rows.filter(i=>Boolean(i.done)===completed)){
    const card=node('article',undefined,'prep-card'+(completed?' prep-done':''));card.dataset.prepItem=item.id;
    const check=button(c,'toggle',completed?'✓':'○',{item:item.id});check.classList.add('prep-check');check.setAttribute('aria-label',(completed?'Décocher ':'Cocher ')+item.name);check.setAttribute('aria-pressed',String(completed));
    const text=node('div',undefined,'prep-item-name');text.append(node('h3',item.name),node('small',quantity(item)));const controls=node('div',undefined,'prep-actions');controls.append(button(c,'edit-event','Modifier',{item:item.id}),button(c,'remove-event','Retirer',{item:item.id}),button(c,'courses','Ajouter aux Courses',{item:item.id}));card.append(check,text,controls);section.append(card);
   }main.append(section);}if(!rows.length)main.append(node('p','Aucun élément à préparer.','prep-empty'));
  }
  main.append(node('p','Modèles et préparatifs · '+E.read().status,'prep-status'));
 }
 const quantity=i=>i.qty==null?(i.unit||''):(i.qty+' '+(i.unit||'')).trim();
 function editItem(c,item,kind){document.getElementById('prep-inline-editor')?.remove();const section=node('section',undefined,'prep-inline-editor');section.id='prep-inline-editor';section.dataset.snapshot=JSON.stringify(item);section.append(node('h2','Modifier l’élément'));itemForm(c,section,kind,item);c.main.prepend(section);section.querySelector('input').focus();}
 async function action(c,action,el){
  if(!action.startsWith('prep-'))return {handled:false};
  if(pending)return {handled:true};pending=true;try{await act(c,action.slice(5),el);return {handled:true};}finally{pending=false;}
 }
 async function act(c,action,el){
  const {ui}=c,record=ui.record;
  if(action==='home')return c.open('salon');if(action==='models'){draftKey='';draft=null;return c.open('models',{record:null});}
  if(action==='new'){draftKey='';return c.open('model-edit',{record:null});}if(action==='open'){draftKey='';return c.open('model-edit',{record:el.dataset.record});}
  if(action==='agenda')return c.open('agenda');
  if(action==='event'){const current=event(record);if(!current)return c.open('agenda');await c.open('agenda',{day:current.date,record:null});return window.DobbyFamilyAgendaReview.showEvent(c,current.id);}
  if(action==='item-cancel'){document.getElementById('prep-inline-editor')?.remove();return;}
  if(action==='save'){if(!document.getElementById('prep-model-name').reportValidity())return;template('save',record,{name:draft.name,items:draft.items},baseline);draftKey='';return c.open('models',{record:null});}
  if(action==='duplicate'){const source=find(record);if(!source)throw Error('Modèle introuvable.');template('duplicate',record,null,source);draftKey='';return c.open('models',{record:null});}
  if(action==='delete'){if(!confirm('Supprimer ce modèle ? Les préparatifs associés seront conservés.'))return;template('delete',record,null,baseline);draftKey='';return c.open('models',{record:null});}
  const item=(ui.view==='model-edit'?draft.items:event(record)?.preparation?.items||[]).find(i=>i.id===el.dataset.item);if(!item)throw Error('Cet élément n’existe plus.');
  if(action==='edit-draft'||action==='edit-event')return editItem(c,copy(item),action==='edit-draft'?'draft-edit':'event-edit');
  if(action==='up'||action==='down'){const index=draft.items.indexOf(item),target=index+(action==='up'?-1:1);if(target>=0&&target<draft.items.length)[draft.items[index],draft.items[target]]=[draft.items[target],draft.items[index]];return render(c);}
  if(action.startsWith('remove-')){if(!confirm('Retirer « '+item.name+' » ?'))return;if(action==='remove-draft')draft.items=draft.items.filter(i=>i.id!==item.id);else write(record,'delete',item.id,null,item);return render(c);}
  if(action==='toggle'){write(record,'toggle',item.id,null,item);return render(c);}
  if(action==='courses'){el.disabled=true;try{await window.DobbyCuisineList.addPreparation(E,{...item,eventId:record});c.notice('Ajout conservé dans les Courses natives. '+(window.DobbyCuisineList.snapshot(E).shared?'Synchronisation selon le statut Courses du foyer.':'Enregistré sur cet appareil.'));}finally{el.disabled=false;}return;}
 }
 async function submit(c,form){if(pending||!form.reportValidity())return;pending=true;try{
  const values=Object.fromEntries(new FormData(form)),kind=form.dataset.prepForm,id=form.dataset.item,editor=document.getElementById('prep-inline-editor');
  if(kind.startsWith('draft-')){if(kind==='draft-add')draft.items.push({...values,id:crypto.randomUUID()});else draft.items=draft.items.map(i=>i.id===id?{...i,...values}:i);}
  else write(c.ui.record,kind==='event-add'?'add':'edit',id||null,values,editor?JSON.parse(editor.dataset.snapshot):null);
  if(kind.endsWith('edit'))editor?.remove();render(c);
 }catch(error){c.notice(error.message);}finally{pending=false;}}
 function association(form,current){
  const section=node('fieldset',undefined,'prep-association');section.append(node('legend','Associer une liste de préparation'),node('p','Une copie indépendante est créée à l’association.'));
  const selected=current?.preparation?.templateId||'';
  const option=(value,label,detail)=>{const row=node('label',undefined,'prep-association-option'),radio=node('input');radio.type='radio';radio.name='preparationTemplate';radio.value=value;radio.checked=value===selected;const text=node('span');text.append(node('strong',label));if(detail)text.append(node('small',detail));row.append(radio,text);section.append(row);};
  option('','Aucune liste','Événement sans liste de préparation');
  for(const row of list().slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')))option(row.id,row.name,row.items.length+' éléments · copie indépendante');
  if(selected&&!find(selected))option(selected,'Modèle supprimé','Conserver les préparatifs de cet événement');form.append(section);
 }
 return Object.freeze({handles:view=>routes.includes(view),render,action,submit,association,get busy(){return pending;}});
})();
