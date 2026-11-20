import {buildIngredientIndex,findRecipes,ingredientMatches,shoppingIngredientKey} from './ingredient-matching.mjs';

const PAGE_SIZE=12;
const labels={classic:'Traditionnelle',tm5:'Thermomix',starter:'Entrée',main:'Plat',dessert:'Dessert',
 facile:'Facile',intermediaire:'Intermédiaire',avancee:'Avancée'};
const create=(tag,text,classes)=>{
 const item=document.createElement(tag);
 if(text!==undefined)item.textContent=text;
 if(classes)item.className=classes;
 return item;
};
function optionSelect(name,choices,onChange){
 const label=create('label',name,'cu-field'),select=create('select');
 select.setAttribute('aria-label',name);
 for(const [value,text] of choices){
  const option=create('option',text);option.value=value;select.append(option);
 }
 select.addEventListener('change',()=>onChange(select.value));
 label.append(select);
 return {label,select};
}
function control(action,text,id){
 const item=create('button',text,'cu-button');item.type='button';item.dataset.cuAction=action;
 if(id)item.dataset.id=id;
 return item;
}
const joinNames=values=>values.map(item=>item.name).join(', ');
const missingMessage=match=>match.missing.length?'Ingrédients manquants : '+joinNames(match.missing)+'.':'';

export function createIngredientSearch(){
 const selected=new Set(),filters={};
 let scope,category='',query='',expanded=false,pages={ready:1,almost:1},writing=false;
 function syncScope(E){
  const state=E.win().DobbyFamilyUI?.connectionState?.()||{};
  const next=JSON.stringify([state.userId??null,state.householdId??null,state.epoch??null]);
  if(scope!==undefined&&scope!==next){selected.clear();query='';category='';expanded=false;for(const key of Object.keys(filters))delete filters[key];}
  scope=next;
  return next;
 }
 function results(data){return findRecipes(buildIngredientIndex(data),selected,filters);}
 function mount(main,data,{E,readOnly}){
  syncScope(E);
  const index=buildIngredientIndex(data);
  main.replaceChildren();main.classList.add('cu-matching');
  const title=create('h1','Avec mes ingrédients');
  const information=create('p','Indiquez les ingrédients dont vous disposez. Eau, sel, poivre et huile de cuisine sont déjà pris en compte. Vérifiez les quantités dans chaque recette.');
  const back=control('ingredients-back','Retour');
  back.setAttribute('aria-label','Retour à la Taverne ou au Grimoire');
  const panel=create('section',undefined,'cu-matching-panel');
  const picker=create('details');picker.open=true;
  picker.append(create('summary','Choisir les ingrédients'));
  const controls=create('div',undefined,'cu-matching-fields');
  const searchLabel=create('label','Rechercher un ingrédient','cu-field'),search=create('input');
  search.type='search';search.value=query;search.autocomplete='off';searchLabel.append(search);
  search.addEventListener('input',()=>{query=search.value;renderOptions();});
  const categories=[...new Set(index.options.map(option=>option.category))].sort((a,b)=>a.localeCompare(b,'fr-BE'));
  const categoryField=optionSelect('Catégorie',[['','Toutes les catégories'],...categories.map(value=>[value,value])],value=>{category=value;renderOptions();});
  categoryField.select.value=categories.includes(category)?category:'';
  controls.append(searchLabel,categoryField.label);
  const options=create('div',undefined,'cu-matching-options');
  options.setAttribute('role','group');options.setAttribute('aria-label','Ingrédients disponibles');
  picker.append(controls,options);
  const chosen=create('ul',undefined,'cu-matching-selected');chosen.setAttribute('aria-label','Ingrédients sélectionnés');
  const refine=create('details');refine.open=expanded;refine.append(create('summary','Affiner'));
  refine.addEventListener('toggle',()=>{expanded=refine.open;});
  const fields=create('div',undefined,'cu-matching-fields');
  const selectFilter=(key,name,choices)=>{
   const field=optionSelect(name,choices,value=>{
    filters[key]=key==='maxMinutes'?Number(value)||null:value;
    updateResults();
   });
   field.select.value=filters[key]??'';
   fields.append(field.label);
  };
  selectFilter('collection','Collection',[['','Toutes'],['classic','Classique'],['diet','Diététique']]);
  selectFilter('maxMinutes','Durée maximale',[['','Toutes'],['15','15 min'],['30','30 min'],['45','45 min'],['60','1 h'],['90','1 h 30']]);
  selectFilter('course','Type de plat',[['','Tous'],['starter','Entrée'],['main','Plat'],['dessert','Dessert']]);
  selectFilter('mode','Mode de préparation',[['','Tous'],['classic','Traditionnel'],['tm5','Thermomix']]);
  const personal=create('label',undefined,'cu-matching-check'),checkbox=create('input');
  checkbox.type='checkbox';checkbox.checked=Boolean(filters.personal);
  personal.append(checkbox,document.createTextNode('Recettes personnelles uniquement'));
  checkbox.addEventListener('change',()=>{filters.personal=checkbox.checked;updateResults();});
  refine.append(fields,personal);
  panel.append(picker,chosen,refine);
  const summary=create('p',undefined,'cu-matching-summary');
  summary.setAttribute('role','status');summary.setAttribute('aria-atomic','true');
  const output=create('div',undefined,'cu-matching-groups');
  main.append(back,title,information,panel,summary,output);
  function toggle(key){
   if(selected.has(key))selected.delete(key);else selected.add(key);
   for(const button of options.querySelectorAll('[data-ingredient-key]'))button.setAttribute('aria-pressed',String(selected.has(button.dataset.ingredientKey)));
   renderChosen();updateResults();
  }
  function renderOptions(){
   options.replaceChildren();
   for(const item of index.options){
    if(category&&item.category!==category||!ingredientMatches(item,query))continue;
    const button=create('button',item.name,'cu-matching-chip');button.type='button';
    button.dataset.ingredientKey=item.key;button.setAttribute('aria-pressed',String(selected.has(item.key)));
    button.addEventListener('click',()=>toggle(item.key));options.append(button);
   }
   if(!options.childElementCount)options.append(create('p','Aucun ingrédient dans cette recherche.'));
  }
  function renderChosen(){
   chosen.replaceChildren();
   for(const item of index.options.filter(item=>selected.has(item.key))){
    const line=create('li'),button=create('button',item.name+' ×','cu-matching-chip');
    button.type='button';button.setAttribute('aria-label','Retirer '+item.name);
    button.addEventListener('click',()=>{toggle(item.key);search.focus();});
    line.append(button);chosen.append(line);
   }
  }
  function card(match){
   const item=create('article',undefined,'cu-matching-card');item.dataset.ingredientRecipe=match.id;
   const source=match.personal?'Recette personnelle':match.collection==='diet'?'Catalogue diététique':match.collection==='classic'?'Catalogue classique':'Recette de référence';
   const metadata=[source,labels[match.course],match.minutes===null?null:match.minutes+' min',labels[match.difficulty]].filter(Boolean).join(' · ');
   item.append(create('h3',match.name),create('p',metadata,'cu-matching-meta'),
    create('p',match.used.length?'Ingrédients disponibles utilisés : '+joinNames(match.used)+'.':'Aucun des ingrédients sélectionnés n’est utilisé.'));
   if(match.missing.length)item.append(create('p',missingMessage(match),'cu-matching-missing'));
   const actions=create('div',undefined,'cu-matching-actions');
   const see=control('ingredients-recipe','Voir la recette',match.id);
   const cook=control('ingredients-cook','Commencer à cuisiner',match.id);
   cook.disabled=readOnly()||match.modes.length===0;
   const plan=control('ingredients-plan','Ajouter au planning',match.id);
   plan.disabled=readOnly()||!match.canPlan;
   actions.append(see);
   if(match.modes.length>1){
    const method=optionSelect('Méthode',match.modes.map(value=>[value,labels[value]]),()=>{});
    if(match.modes.includes(filters.mode))method.select.value=filters.mode;
    method.select.dataset.ingredientsMode='';method.select.disabled=readOnly();
    actions.append(method.label);
   }else if(match.modes.length===1)cook.dataset.method=match.modes[0];
   actions.append(cook,plan);
   if(match.missing.length){
    const add=control('ingredients-shopping','Ajouter les ingrédients manquants aux courses',match.id);
    add.disabled=readOnly();actions.append(add);
   }
   item.append(actions);
   if(!match.canPlan||!match.modes.length)item.append(create('p','Complétez les portions ou les étapes manquantes dans la fiche avant d’utiliser ces actions.','cu-matching-meta'));
   return item;
  }
  function renderResults(){
   const found=findRecipes(index,selected,filters),total=found.ready.length+found.almost.length;
   summary.textContent=total?total+' recette(s) suggérée(s).':'Aucune recette compatible avec cette sélection et ces filtres.';
   output.replaceChildren();
   for(const [key,title] of [['ready','Avec les ingrédients renseignés'],['almost','Il manque 1 ou 2 ingrédients']]){
    const rows=found[key],group=create('section');group.dataset.ingredientGroup=key;
    const header=create('h2',title);header.id='ingredients-result-'+key;group.setAttribute('aria-labelledby',header.id);
    const list=create('div',undefined,'cu-matching-cards');
    list.append(...rows.slice(0,PAGE_SIZE*pages[key]).map(card));
    group.append(header,list);
    if(!rows.length)group.append(create('p','Aucune suggestion dans ce groupe.','cu-matching-meta'));
    if(rows.length>PAGE_SIZE*pages[key]){
     const more=control('ingredients-more','Afficher plus');
     more.addEventListener('click',event=>{event.stopPropagation();pages[key]++;renderResults();output.querySelector('[data-ingredient-group="'+key+'"] h2').tabIndex=-1;output.querySelector('[data-ingredient-group="'+key+'"] h2').focus();});
     // This local action does not go through the Cuisine router.
     delete more.dataset.cuAction;group.append(more);
    }
    output.append(group);
   }
  }
  function updateResults(){pages={ready:1,almost:1};renderResults();}
  renderOptions();renderChosen();renderResults();
 }
 async function action(name,button,{E,ui,open,notice,readOnly,visibleData,plan}){
  if(name==='ingredients-back')return open(ui.ingredientOrigin||'taverne');
  const original=syncScope(E);
  const found=results(visibleData()),match=[...found.ready,...found.almost].find(row=>row.id===button.dataset.id);
  if(!match)throw Error('La recette ou ses ingrédients ont changé. Vérifiez les suggestions.');
  if(name==='ingredients-recipe')return open('recipe',{id:match.id});
  if(readOnly())throw Error('Cette action exige un compte parent autorisé.');
  if(name==='ingredients-cook'){
   const method=button.closest('article').querySelector('[data-ingredients-mode]')?.value||button.dataset.method;
   if(!match.modes.includes(method))throw Error('Cette méthode n’est plus disponible.');
   if(await open('cook',{id:match.id,method,standalone:true})&&match.missing.length)notice(missingMessage(match));
   return;
  }
  if(name==='ingredients-plan')return plan(match.id,missingMessage(match));
  if(name!=='ingredients-shopping'||!match.missing.length||writing)return;
  writing=true;button.disabled=true;
  try {
   const list=window.DobbyCuisineList;
   let pending=false;
   for(const item of match.missing){
    if(syncScope(E)!==original||readOnly())throw Error('Le foyer a changé. Vérifiez la liste de courses.');
    const snapshot=list.snapshot(E);
    const exists=snapshot.items.find(row=>[item.key,shoppingIngredientKey(item.name)].includes(shoppingIngredientKey(row.name)));
    if(exists){pending||=Boolean(exists.pending);continue;}
    let token='ingredient-match|'+item.key;
    // Successive explicit purchases can follow an archived item. Derive the
    // next receipt from that item, so concurrent parents still share one ID.
    for(;;){
     if(syncScope(E)!==original||readOnly())throw Error('Le foyer a changé. Vérifiez la liste de courses.');
     const receipt=await list.addOnce(E,{name:item.name,qty:null,unit:''},token);
     if(receipt.conflict)throw Error('Un article de courses est en conflit. Vérifiez la liste avant de réessayer.');
     if(!receipt.archived){pending||=receipt.pending;break;}
     const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(receipt.id));
     token='ingredient-match|'+item.key+'|'+[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
    }
   }
   notice(pending?'Ingrédients enregistrés dans les courses. Synchronisation en attente.':'Les ingrédients manquants figurent dans vos courses.');
  }finally{writing=false;button.disabled=readOnly();}
 }
 return {mount,action};
}
