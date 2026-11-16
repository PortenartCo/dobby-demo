/* Derived archive presentation. Every mutation delegates to the source API. */
(()=>{
 'use strict';const R=window.DobbyRegister,E=window.DobbyFamilyStitchEngine;
 let query='';const api=()=>{const a=E.win().DobbyArchiveSources;if(!a)throw Error('Archives indisponibles. Rechargez la page.');return a;};
 const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
 function control(action,text,source,id){return R.button(action,text,{source,record:id});}
 function sourceFor(view,ctx){
  if(!ctx.ui.record)return null;
  const source={contract:'documents','contract-1':'documents','contract-edit':'documents',document:'documents','document-edit':'documents',equipment:'equipment','equipment-edit':'equipment',maintenance:'equipment','contact-edit':'contacts','memo-edit':(ctx.data.state.familyNotes||[]).some(row=>row.id===ctx.ui.record)&&(ctx.ui.scope==='local'||!(ctx.data.state.sharedFamilyNotes||[]).some(row=>row.id===ctx.ui.record))?'localNotes':'sharedNotes'}[view];
  if(!source)return null;return {source,row:api().get(source,ctx.ui.record)};
 }
 function authorize(view,ctx){try{sourceFor(view,ctx);return true;}catch(error){ctx.main.replaceChildren(el('h1','Fiche introuvable ou accès indisponible'),el('p','Les données sont conservées. Revenez aux Archives avec le compte et le foyer autorisés.'),R.button('archive-return','Retour aux Archives'));document.querySelector('#fa-supplement')?.replaceChildren();return false;}}
 function authorizeRecipe(view,data,ui){
  const ids=new Set(data.customIds||[]);
  data.recipes=data.recipes.filter(row=>{if(!ids.has(row.id))return true;try{api().get('recipes',row.id);return true;}catch{return false;}});
  if(['recipe','cook','tm5'].includes(view)&&ids.has(ui.recipe)&&!data.recipes.some(row=>row.id===ui.recipe)){
   const main=document.querySelector('main');main.replaceChildren(el('h1','Recette introuvable ou accès indisponible'),el('p','Revenez aux Archives avec le compte et le foyer autorisés.'));return false;
  }
  return true;
 }
 function openSource(source,id){const a=api(),row=a.get(source,id),entry=a.list().find(x=>x.source===source&&x.id===id),view=entry?.view||(source==='documents'&&['Contrats','Assurances'].includes(row.category)?'contract':a.sources[source].view);
  if(source==='recipes'){location.href='./index.html#recipe?id='+encodeURIComponent(id);return;}
  return window.DobbyFamilyStitch.open(view,{record:id,scope:source==='localNotes'?'local':'shared',mode:'read',origin:'documents'});
 }
 function confirmChange(source,id,toArchived){
  const a=api(),row=a.get(source,id),expected=a.snapshot(source,id);a.writable(source);
  document.querySelector('#archive-confirm')?.remove();const dialog=el('dialog','','archive-dialog');dialog.id='archive-confirm';dialog.setAttribute('aria-labelledby','archive-confirm-title');
  const title=el('h2',toArchived?'Archiver cet élément ?':'Réactiver cet élément ?');title.id='archive-confirm-title';dialog.append(title,el('p',row.title||row.name),el('p',toArchived?'Il restera conservé dans DOBBY et pourra être réactivé depuis Archives & Scriptorium.':'Il sera de nouveau disponible dans son module d’origine.'));
  if(toArchived&&source==='documents'&&['Contrats','Assurances'].includes(row.category))dialog.append(el('p','L’archivage ne résilie pas le contrat et n’annule aucune obligation. Les échéances et les pièces restent conservées.','archive-warning'));
  const error=el('p','','archive-error');error.setAttribute('role','alert');const actions=el('div','','archive-actions'),cancel=el('button','Annuler'),commit=el('button',toArchived?'Confirmer l’archivage':'Confirmer la réactivation');cancel.type=commit.type='button';cancel.onclick=()=>dialog.close();
  commit.onclick=async()=>{commit.disabled=true;try{a.change(source,id,toArchived,{confirmed:true,expected});dialog.close();if(toArchived&&source==='recipes')location.href='./famille.html#documents';else if(toArchived)await window.DobbyFamilyStitch.open('documents');else await openSource(source,id);}catch(e){error.textContent=e.message;commit.disabled=false;}};
  actions.append(cancel,commit);dialog.append(error,actions);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();cancel.focus();
 }
 function render(ctx){
  const root=el('div','','archives-register'),hero=el('section','','archives-hero');hero.dataset.archivesHero='';const image=el('img');image.src='./assets/archives/stitch22.png';image.alt='Dobby au scriptorium, avec livres et parchemins sur sa table de travail';image.width=1376;image.height=768;
  const title=el('h1','✦ ARCHIVES & SCRIPTORIUM ✦');title.dataset.archivesTitle='';hero.append(image,title);root.append(hero,el('p','Les fiches archivées restent conservées dans leur module d’origine.','archives-intro'));
  const searchBox=el('div','','archives-search'),icon=el('span','search','material-symbols-outlined'),input=el('input'),clear=el('button','×');icon.setAttribute('aria-hidden','true');input.id='archive-search';input.type='search';input.placeholder='Rechercher dans les archives…';input.setAttribute('aria-label','Rechercher dans les archives');input.value=query;clear.type='button';clear.dataset.faAction='archive-clear';clear.setAttribute('aria-label','Effacer la recherche');searchBox.append(icon,input,clear);root.append(searchBox);
  const rows=el('section','','archives-list');rows.setAttribute('aria-label','Éléments archivés');rows.dataset.documentRows='true';root.append(rows);ctx.main.replaceChildren(root);document.querySelector('#fa-supplement')?.replaceChildren();
  function display(){
   rows.replaceChildren();clear.hidden=!query;const items=api().list(query);
   for(const entry of items){const card=el('article','','archive-row');card.dataset.archiveRow='';card.dataset.source=entry.source;card.dataset.record=entry.id;const copy=el('div','','archive-copy'),time=el('time',new Date(entry.archivedAt).toLocaleDateString('fr-BE'));time.dateTime=entry.archivedAt;
    copy.append(el('h2',entry.title),el('p',entry.type+' · '+entry.module),el('p','Archivé le '+time.textContent));copy.lastChild.replaceChildren(document.createTextNode('Archivé le '),time);
    const actions=el('div','','archive-actions'),restore=control('archive-reactivate','Réactiver',entry.source,entry.id);try{api().writable(entry.source);}catch{restore.disabled=true;restore.title='Lecture seule pour ce compte';}actions.append(control('archive-open','Consulter',entry.source,entry.id),restore);card.append(copy,actions);rows.append(card);
   }
   if(!items.length)rows.append(el('p',query?'Aucun élément archivé ne correspond à cette recherche.':'Aucun élément archivé pour le moment','archives-empty'));
  }
  input.oninput=()=>{query=input.value;display();};clear.onclick=()=>{query='';input.value='';display();input.focus();};display();
 }
 function decorate(view,ctx){
  const found=sourceFor(view,ctx);if(!found)return;const {source,row}=found,archived=api().archived(row);
  if(archived){
   const status=el('p','Archivé · fiche conservée dans son module d’origine.','archive-source-status');status.dataset.archiveStatus='';ctx.main.prepend(status);
   for(const control of ctx.main.querySelectorAll('input,textarea,select,button')){if(control.tagName!=='BUTTON'||/rg-save|edit|delete|detach|remove|share|replace|toggle|cloud-local|log-save|memo-import|rg-plan-|rg-house-link-contract/.test(control.dataset.faAction||''))control.disabled=true;}
   for(const label of ctx.main.querySelectorAll('label[for]')){if(document.getElementById(label.htmlFor)?.disabled){label.setAttribute('aria-disabled','true');label.style.pointerEvents='none';label.style.opacity='.5';}}
   ctx.main.append(R.button('archive-return','Retour aux Archives'));
  }else{const button=control('archive-request','Archiver',source,row.id);try{api().writable(source);}catch{button.disabled=true;}ctx.main.append(button);}
 }
 function readable(source,row){try{api().get(source,row.id);return true;}catch{return false;}}
 function guard(action,ctx){const found=sourceFor(ctx.ui.view,ctx);if(found&&api().archived(found.row)&&(/rg-save|edit|delete|detach|remove|replace|share|toggle|cloud-local|log-save|memo-import|rg-plan-|rg-house-link-contract/.test(action)))throw Error('Cette fiche est archivée et en lecture seule. Réactivez-la depuis Archives & Scriptorium.');}
 function act(action,button){if(action==='archive-clear'){const input=document.querySelector('#archive-search');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();return;}const {source,record}=button.dataset;if(action==='archive-request')return confirmChange(source,record,true);if(action==='archive-reactivate')return confirmChange(source,record,false);if(action==='archive-open')return openSource(source,record);if(action==='archive-return')return window.DobbyFamilyStitch.open('documents');}
 function recipe(recipe,main){
  if(!E.read().state.customRecipes?.some(row=>row.id===recipe.id))return;
  const archived=api().archived(recipe),button=el('button',archived?'Retour aux Archives':'Archiver');button.type='button';button.dataset.cuAction='archive-source';main.append(button);
  if(!archived){try{api().writable('recipes');if(recipe.removedAt)throw Error('Restaurez cette recette dans les réglages du Grimoire avant de l’archiver.');}catch(error){button.disabled=true;button.title=error.message;}}
  if(archived){main.prepend(el('p','Archivé · recette conservée, y compris dans les menus existants.','archive-source-status'));const reads=new Set(['back','recipes','taverne','e074-tab','e074-method','ingredients','steps','servings','archive-source']);for(const control of main.querySelectorAll('button[data-cu-action],input,select,textarea'))if(!reads.has(control.dataset.cuAction))control.disabled=true;}
 }
 window.DobbyArchivesUI=Object.freeze({render,decorate,guard,act,recipe,authorize,authorizeRecipe,recipeAction(id){if(api().archived(api().get('recipes',id)))location.href='./famille.html#documents';else confirmChange('recipes',id,true);},readable,isArchived:row=>Boolean(row?.archive?.archivedAt)});
})();
