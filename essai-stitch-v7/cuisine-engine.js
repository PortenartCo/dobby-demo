/* Same-origin adapter to the existing V5 engine. No database, storage key or sync writer. */
window.DobbyCuisineEngine = (() => {
  'use strict';
  const win = () => document.getElementById('dv7-engine').contentWindow;
  const evaluate = (code, values = {}) => win().eval(`(function(p){${code}})(${JSON.stringify(values)})`);
  const field = (name, value) => {
    const input = win().document.getElementById(name);
    if (!input) throw Error('Champ du moteur indisponible : ' + name);
    if (input.type === 'checkbox') input.checked = Boolean(value); else input.value = value ?? '';
  };
  const click = (action, values = {}) => {
    const button = [...win().document.querySelectorAll('[data-action]')].find(el => el.dataset.action === action && Object.entries(values).every(([key, value]) => el.dataset[key] === String(value)));
    if (!button) throw Error('Action du moteur indisponible : ' + action);
    button.click();
  };
  function page(page, detail = null) {
    evaluate('st.extraPage=""; st.detail=p.detail; st.page=p.page; st.cook=false; st.tmEditor=false; st.tmView=false; render();', { page, detail });
  }
  function read(mealContext=null) {
    const data = evaluate('return {state:JSON.parse(JSON.stringify(st)),recipes:JSON.parse(JSON.stringify(allRecipes())),customIds:custom.map(r=>r.id),baseIds:BASE.map(r=>r.id),draft:shoppingDraft(),pending:pendingMeals().length,batch:batchCandidate,detailPortions:st.detail?(Object.values(st.planned).find(m=>m.id===st.detail)?portionCount(Object.values(st.planned).find(m=>m.id===st.detail)):st.people):st.people};');
    const context=data.state.cook&&data.state.cookMeal?data.state.cookMeal:mealContext,key=context?.key||(context?.date&&context?.slot?context.date+'-'+context.slot+(context.component==='dessert'?'-dessert':''):null),record=key?data.state.planned[key]:null,batch=data.state.planned.__dobbyDessertPreparationsV1?.batches?.[context?.batchId||record?.dessertPreparationId];
    if(batch?.recipeSnapshot&&batch.recipeId===(mealContext?record?.id:data.state.detail)){const at=data.recipes.findIndex(r=>r.id===batch.recipeId);if(at>=0)data.recipes[at]={...data.recipes[at],...batch.recipeSnapshot};if(batch.tm5Snapshot)data.state.tmAdaptations[batch.recipeId]=batch.tm5Snapshot;else delete data.state.tmAdaptations[batch.recipeId];data.preparationVersion=true;}
    for(const recipe of data.recipes){const details=data.state.tmAdaptations?.[recipe.id]?.stepDetails;if(details?.length)recipe.importDetails={...(recipe.importDetails||{}),stepDetails:[...(recipe.importDetails?.stepDetails||[]).filter(d=>d.method!=='tm5'),...details]};}
    data.removedIds=data.recipes.filter(r=>r.removedAt).map(r=>r.id);data.catalogueRecipes=data.recipes.filter(r=>!r.removedAt);
    if (data.state.page === 'shop') {
      const d = win().document;
      data.shared = {
        connected: Boolean(win().DobbyFamilyUI?.getContext()),
        status: d.querySelector('.fv2-status')?.textContent || 'Partage à vérifier',
        messages: [...d.querySelectorAll('.fv2-error,.fv2-panel [role="status"],.fv2-panel > .fv2-minor')].map(el => el.textContent),
        items: [...d.querySelectorAll('.fv2-item')].map(el => ({
          id: el.querySelector('[data-fv-check]')?.dataset.fvCheck || el.querySelector('form')?.dataset.id,
          title: el.querySelector('.fv2-itemname')?.textContent || el.querySelector('[name="title"]')?.value,
          quantity: el.querySelector('.fv2-minor')?.textContent || '', checked: Boolean(el.querySelector('[data-fv-check]')?.checked),
          conflict: Boolean(el.querySelector('.fv2-conflict')), editing: Boolean(el.querySelector('form')),
          fields: Object.fromEntries([...el.querySelectorAll('input[name]')].map(input => [input.name, input.value]))
        }))
      };
    }
    return data;
  }
  const amount = (quantity, people, base) => evaluate('return amount(p.quantity,p.people,p.base);', { quantity, people, base });
  const portions = (adult, children, childFactor = 0.65) => evaluate('return portionCount({adult:p.adult,children:p.children,childFactor:p.childFactor});', { adult, children, childFactor });
  function familyCounts() {
    return evaluate(`const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),part=name=>parts.find(x=>x.type===name).value,day=part('year')+'-'+part('month')+'-'+part('day'),at=new Date(day+'T12:00:00'),rows=Array.isArray(st.familyMembers)?st.familyMembers:[],members=[...new Map(rows.filter(m=>m&&typeof m==='object').map((m,i)=>[m.id||'position-'+i,m])).values()];
      if(!members.length)return {adult:Math.max(0,Number(st.adult)||0),children:Math.max(0,Number(st.children)||0),babies:0,unknown:0,total:Math.max(0,Number(st.adult)||0)+Math.max(0,Number(st.children)||0),source:'preferences'};
      const counts={adult:0,children:0,babies:0,unknown:0,total:0,source:'family'};
      for(const member of members){const value=member.birthdate,born=typeof value==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(value)?new Date(value+'T12:00:00'):null;let age=null;
        if(born&&Number.isFinite(born.getTime())&&[born.getFullYear(),String(born.getMonth()+1).padStart(2,'0'),String(born.getDate()).padStart(2,'0')].join('-')===value){age=at.getFullYear()-born.getFullYear();if(at.getMonth()<born.getMonth()||at.getMonth()===born.getMonth()&&at.getDate()<born.getDate())age--;if(age<0||age>130)age=null;}
        if(age===null){counts.adult++;counts.unknown++;}else if(age<3)counts.babies++;else if(age<18)counts.children++;else counts.adult++;
      }counts.total=counts.adult+counts.children;return counts;`);
  }
  // The native reserve is the existing, user-declared `have` map. A shopping
  // omission is not stock, and no generator or second ingredient store is added.
  function reserveIngredients() {
    return evaluate(`return Object.entries(st.have||{}).flatMap(([id,raw])=>{const quantity=Number(raw),at=id.lastIndexOf('|'),name=(at<0?id:id.slice(0,at)).trim(),unit=at<0?'':id.slice(at+1).trim();return name&&Number.isFinite(quantity)&&quantity>0?[{id,name,quantity,unit}]:[];}).sort((a,b)=>a.name.localeCompare(b.name,'fr-BE'));`);
  }
  const assertSharedWrite=()=>{if(window.DobbyFamilyStitch?.sharedReadOnly?.()===true)throw Error('Les données partagées sont en lecture seule pour votre profil enfant.');};
  function choose(values) {
    assertSharedWrite();
    const recipe=read().recipes.find(r=>r.id===values.id);if(recipe?.removedAt)throw Error('Cette recette est retirée du catalogue.');if(!recipe||!Number.isFinite(Number(recipe.servings))||Number(recipe.servings)<=0)throw Error('Complétez les portions de référence de cette recette avant de planifier ce repas.');
    evaluate('st.day=p.date;st.slot=p.slot;st.choice="library";st.filter="";st.cat="Toutes";st.favorites=false;st.note=p.note||"";', values);
    page('pick'); field('adults', values.adult); field('children', values.children);
    click('select', { id: values.id });
    return evaluate('return st.page==="plan" && st.planned[st.day+"-"+st.slot]?.id===p.id;', values);
  }
  function cookAt(id,index=null,method='classic',meal=null) {
    if(meal)componentKey(meal);
    return transaction(`const requested=p.meal||(st.cook&&st.detail===p.id?st.cookMeal:null),requestedKey=requested?requested.date+'-'+requested.slot+(requested.component==='dessert'?'-dessert':''):null,priorBatch=requested?.component==='dessert'?preparationRegistry()?.batches[st.planned[requestedKey]?.dessertPreparationId]:null,r=priorBatch?.recipeSnapshot||getR(p.id),adaptation=priorBatch?priorBatch.tm5Snapshot:st.tmAdaptations?.[p.id];if(!r)throw Error('Recette introuvable.');if(!['classic','tm5'].includes(p.method))throw Error('Méthode de préparation invalide.');const steps=p.method==='tm5'?(adaptation?.steps||(r.thermomix?r.steps:null)):(r.thermomix?null:r.steps);if(!steps?.length)throw Error('Cette méthode de préparation n’est pas disponible ; complétez ses étapes.');if(p.index!==null&&(!Number.isInteger(p.index)||p.index<0||p.index>=steps.length))throw Error('Étape de préparation invalide.');st.cookProgress||={};if(typeof st.cookProgress!=='object'||Array.isArray(st.cookProgress))throw Error('Progression de cuisson invalide.');const context=p.meal||(st.cook&&st.detail===p.id?st.cookMeal:null);if(context){const key=context.date+'-'+context.slot+(context.component==='dessert'?'-dessert':''),record=st.planned[key];if(!record||record.id!==p.id||record.status==='annulé')throw Error('Ce repas a changé. Actualisez le planning.');if(Object.prototype.hasOwnProperty.call(context,'expectedMeal')&&JSON.stringify(record)!==JSON.stringify(context.expectedMeal))throw Error('Ce repas a changé. Actualisez le planning.');let batch=null;if(context.component==='dessert'){batch=ensurePreparation(key);if(context.expectedBatch&&JSON.stringify(batch)!==JSON.stringify(context.expectedBatch))throw Error('La préparation dessert a changé pendant la cuisine.');if(batch.status==='prepared')throw Error('Ce dessert est déjà préparé. Utilisez ses portions disponibles.');}st.cookMeal={...context,key,id:p.id,expectedMeal:JSON.parse(JSON.stringify(st.planned[key])),...(batch?{batchId:batch.id,expectedBatch:JSON.parse(JSON.stringify(batch))}:{})};}else st.cookMeal=null;const progressKey=st.cookMeal?.batchId?st.cookMeal.batchId+'|'+p.id:st.cookMeal?st.cookMeal.key+'|'+p.id:p.id,progress=st.cookProgress[progressKey]||{},saved=progress[p.method],index=p.index===null?(Number.isInteger(saved)&&saved>=0?Math.min(saved,steps.length-1):0):p.index;st.cookProgress[progressKey]={...progress,[p.method]:index};st.extraPage='';st.detail=p.id;st.page='recipes';st.cook=true;st.cookStep=index;st.cookMethod=p.method;st.tmEditor=false;st.tmView=false;result={id:p.id,index,method:p.method};`,{id,index,method,meal});
  }
  function mealAction(action, values) {
    const validDate=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00');return Number.isFinite(d.getTime())&&[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')===value;};
    if(!['status','move'].includes(action)||!validDate(values.date)||!['midi','soir'].includes(values.slot))throw Error('Date, créneau ou action de repas invalide.');
    if(action==='status'&&!['prévu','reporté','préparé','annulé'].includes(values.status))throw Error('Statut de repas invalide.');
    if(action==='move'&&(!validDate(values.destination)||values.destinationSlot&&values.destinationSlot!==values.slot))throw Error('Choisissez une date valide dans le même créneau. Midi et Soir restent indépendants.');
    if(values.confirmed===false)return false;
    if(action==='status'&&values.status==='annulé'&&values.confirmed!==true&&!window.confirm('Annuler ce repas dans le planning ?'))return false;
    if(action==='move'&&values.destination===values.date)return false;
    try{return transaction(`const key=p.date+'-'+p.slot,source=st.planned[key]||null,destinationKey=p.destination+'-'+p.slot,destination=st.planned[destinationKey]||null;
      if(!source)throw Error('Ce repas n’est plus disponible.');
      if(Object.prototype.hasOwnProperty.call(p,'expectedMeal')&&JSON.stringify(source)!==JSON.stringify(p.expectedMeal))throw Error('Le repas a changé. Ouvrez à nouveau la confirmation.');
      if(p.action==='move'&&Object.prototype.hasOwnProperty.call(p,'expectedDestination')&&JSON.stringify(destination)!==JSON.stringify(p.expectedDestination))throw Error('La destination a changé. Ouvrez à nouveau la confirmation.');
      if(p.action==='move'&&p.expectedPlanning&&JSON.stringify(st.planned)!==JSON.stringify(p.expectedPlanning))throw Error('Le calendrier a changé. Ouvrez à nouveau la confirmation.');
      st.day=p.date;st.slot=p.slot;st.extraPage='';st.detail=null;st.page='plan';st.cook=false;st.tmEditor=false;st.tmView=false;render();
      const nativeRender=render,nativePrompt=window.prompt,nativeConfirm=window.confirm,nativeAlert=window.alert;let failure=null,cancelled=false;
      const nativeClick=action=>{const button=[...document.querySelectorAll('[data-action]')].find(b=>b.dataset.action===action&&b.dataset.slot===p.slot);if(!button)throw Error('Action du moteur indisponible : '+action);button.click();if(failure)throw failure;};
      try{
        // The historical event listener is async. Capture synchronous render /
        // persistence failures at its boundary so rollback remains observable.
        render=function(){try{return nativeRender();}catch(error){failure=error;}};
        window.alert=message=>{failure=Error(String(message));};
        if(p.action==='status'){window.prompt=()=>p.status;nativeClick('status');}
        else{window.confirm=message=>{const accepted=p.confirmed===true?true:nativeConfirm(message);if(!accepted)cancelled=true;return accepted;};nativeClick('move');const input=document.getElementById('moveDate');if(!input)throw Error('Date de déplacement indisponible.');input.value=p.destination;nativeClick('confirmmove');}
      }finally{render=nativeRender;window.prompt=nativePrompt;window.confirm=nativeConfirm;window.alert=nativeAlert;}
      if(cancelled)throw Object.assign(Error('Déplacement annulé.'),{name:'DobbyMealCancelled'});
      const meal=st.planned[p.action==='move'?destinationKey:key];if(!meal||p.action==='status'&&meal.status!==p.status||p.action==='move'&&JSON.stringify(meal)!==JSON.stringify(source))throw Error('La modification du repas n’a pas pu être confirmée.');
      result={date:p.action==='move'?p.destination:p.date,slot:p.slot,meal:JSON.parse(JSON.stringify(meal))};`, {...values,action});
    }catch(error){if(error.name==='DobbyMealCancelled')return false;throw error;}
  }
  const componentKey=values=>{
    const date=values.date,d=new Date(date+'T12:00:00');
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(d.getTime())||[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')!==date||!['midi','soir'].includes(values.slot)||!['main','dessert'].includes(values.component||'main'))throw Error('Date, créneau ou préparation invalide.');
    return date+'-'+values.slot+(values.component==='dessert'?'-dessert':'');
  };
  // Technical metadata remains inside the native planned JSON. Old snapshot
  // writers preserve this key; it is never a displayed meal or recipe.
  const dessertHelpers=`
    const registryKey='__dobbyDessertPreparationsV1';
    const preparationRegistry=(create=false)=>{const present=Object.prototype.hasOwnProperty.call(st.planned,registryKey);let value=st.planned[registryKey];if(present&&(!value||value.kind!=='dessert-preparations'||value.version!==1||!value.batches||typeof value.batches!=='object'||Array.isArray(value.batches)))throw Error('Version des préparations dessert non prise en charge. Les données sont conservées.');if(!present&&create)value=st.planned[registryKey]={id:registryKey,kind:'dessert-preparations',version:1,batches:{}};return value;};
    const servicePortions=m=>Number(m.dessertPortions??portionCount(m));
    const allocations=(id,except=null)=>Object.entries(st.planned).filter(([key,m])=>key!==except&&/^\\d{4}-\\d{2}-\\d{2}-(midi|soir)-dessert$/.test(key)&&m?.status!=='annulé'&&m?.dessertPreparationId===id);
    const allocated=(id,except=null)=>allocations(id,except).reduce((total,[,m])=>total+servicePortions(m),0);
    const assertPlanning=()=>{if(p.expectedPlanning&&JSON.stringify(st.planned)!==JSON.stringify(p.expectedPlanning))throw Error('Le planning a changé. Ouvrez à nouveau la confirmation.');};
    const snapshotRecipe=r=>JSON.parse(JSON.stringify({id:r.id,name:r.name,category:r.category,servings:r.servings,minutes:r.minutes,thermomix:!!r.thermomix,ingredients:JSON.parse(JSON.stringify(r.ingredients)),steps:[...r.steps],importDetails:{durations:r.importDetails?.durations||{},ingredientIds:r.importDetails?.ingredientIds||[],stepDetails:(r.importDetails?.stepDetails||[]).map(({images,...detail})=>detail)}}));
    const snapshotTM=id=>{const tm=st.tmAdaptations?.[id];return tm?JSON.parse(JSON.stringify({steps:(tm.steps||[]).map(step=>Object.fromEntries(['text','tool','time','temp','speed','external','reverse'].filter(key=>step[key]!==undefined).map(key=>[key,step[key]]))),verified:tm.verified===true,verifiedAt:tm.verifiedAt||null,stepDetails:(tm.stepDetails||[]).map(({images,...detail})=>detail)})):null;};
    const validPortions=n=>Number.isFinite(n)&&n>0&&n<=100;
    const ensurePreparation=(key,total)=>{const source=st.planned[key];if(!source||source.status==='annulé')throw Error('Ce dessert a changé.');const registry=preparationRegistry(true),existing=source.dessertPreparationId?registry.batches[source.dessertPreparationId]:null;if(source.dessertPreparationId&&!existing)throw Error('La préparation dessert référencée est introuvable.');const quantity=total??existing?.totalPortions??portionCount(source);if(!validPortions(quantity))throw Error('Choisissez un nombre de portions entre 0 et 100.');if(existing){if(existing.recipeId!==source.id)throw Error('La recette de cette préparation a changé.');if(quantity!==existing.totalPortions){if(existing.status==='prepared'||existing.imported)throw Error('Cette préparation est déjà préparée ou ses ingrédients ont été importés dans les courses. Sa quantité reste conservée ; créez une autre préparation.');if(quantity<allocated(existing.id))throw Error('Les portions réservées dépassent la quantité à préparer.');existing.totalPortions=quantity;existing.revision++;}return existing;}
      const portion=portionCount(source),legacyCovered=covered(key,source),imported=!!source._e072ImportRef||legacyCovered;if(imported&&quantity!==portion)throw Error('Les ingrédients de ce dessert ont déjà été importés. Conservez cette quantité ou créez une autre préparation.');if(quantity<portion)throw Error('Les portions réservées dépassent la quantité à préparer.');const id='dessert-prep-'+crypto.randomUUID(),batch={id,recipeId:source.id,totalPortions:quantity,status:source.status==='préparé'?'prepared':'planned',preparedAt:source.status==='préparé'?new Date().toISOString():null,createdAt:new Date().toISOString(),revision:1,recipeSnapshot:snapshotRecipe(getR(source.id)),tm5Snapshot:snapshotTM(source.id),legacyCovered,imported,importRef:source._e072ImportRef||source.dessertIngredientRef||(key+'|'+source.id)};registry.batches[id]=batch;st.planned[key]={...source,dessertPreparationId:id,dessertPortions:portion};return batch;};
  `;
  function dessertPreparations(){return evaluate(`${dessertHelpers}const registry=preparationRegistry();return {batches:Object.values(registry?.batches||{}).map(batch=>({...batch,allocatedPortions:allocated(batch.id),availablePortions:Math.max(0,batch.totalPortions-allocated(batch.id)),serviceKeys:allocations(batch.id).map(([key])=>key)})),planning:JSON.parse(JSON.stringify(st.planned))};`);}
  function prepareDessert(values){const key=componentKey({...values,component:'dessert'});return transaction(`assertPlanning();const record=st.planned[p.key];if(Object.prototype.hasOwnProperty.call(p,'expectedMeal')&&JSON.stringify(record||null)!==JSON.stringify(p.expectedMeal))throw Error('Ce dessert a changé.');if(p.expectedRecipe&&!record?.dessertPreparationId&&JSON.stringify(snapshotRecipe(getR(record.id)))!==JSON.stringify(snapshotRecipe(p.expectedRecipe)))throw Error('La recette a changé. Ouvrez à nouveau la préparation.');const batch=ensurePreparation(p.key,p.totalPortions);result=JSON.parse(JSON.stringify(batch));`,{...values,key});}
  function allocateDessert(values){const key=componentKey({...values,component:'dessert'});return transaction(`assertPlanning();const registry=preparationRegistry(),batch=registry?.batches[p.batchId],prior=st.planned[p.key]||null;if(!batch)throw Error('Cette préparation dessert n’est plus disponible.');if(Object.prototype.hasOwnProperty.call(p,'expectedMeal')&&JSON.stringify(prior)!==JSON.stringify(p.expectedMeal))throw Error('Ce créneau a changé.');if(prior&&prior.status!=='annulé'&&prior.dessertPreparationId!==batch.id&&p.replaceConfirmed!==true)throw Error('Confirmez le remplacement du dessert existant.');if(!validPortions(p.portions)||allocated(batch.id,p.key)+p.portions>batch.totalPortions+1e-9)throw Error('Les portions demandées dépassent les portions disponibles.');const next={...prior,id:batch.recipeId,adult:p.portions,children:0,people:p.portions,childFactor:1,status:batch.status==='prepared'?'préparé':'prévu',dessertPreparationId:batch.id,dessertPortions:p.portions};if(prior?.id!==batch.recipeId||prior?.dessertPreparationId!==batch.id)delete next._e072ImportRef;st.planned[p.key]=next;result={key:p.key,meal:JSON.parse(JSON.stringify(next))};`,{...values,key});}
  function componentAction(action,values){
    const key=componentKey(values);if(!['status','move','portions'].includes(action))throw Error('Action de préparation invalide.');
    if(action==='status'&&!['prévu','reporté','préparé','annulé'].includes(values.status))throw Error('Statut de préparation invalide.');
    if(action==='portions'){const linked=values.component==='dessert'&&read().state.planned[key]?.dessertPreparationId,valid=linked?n=>Number.isFinite(n)&&n>=0:n=>Number.isInteger(n)&&n>=0;if(![values.adult,values.children].every(valid)||values.adult+values.children<(linked ? 0.1 : 1)||values.adult+values.children>(linked?100:20))throw Error(linked?'Choisissez un nombre de portions valide.':'Choisissez entre 1 et 20 convives entiers.');}
    if(action==='move'&&values.destinationSlot&&values.destinationSlot!==values.slot)throw Error('Midi et Soir restent indépendants.');const destinationKey=action==='move'?componentKey({...values,date:values.destination}):null;
    if(values.confirmed===false)return false;
    if(action==='move'&&destinationKey===key)return false;
    if(values.component!=='dessert'&&action!=='portions')return mealAction(action,values);
    if((action==='move'||action==='status'&&values.status==='annulé')&&values.confirmed!==true&&!window.confirm(action==='move'?'Déplacer ce dessert ?':'Retirer ce dessert du planning ?'))return false;
    return transaction(`const source=st.planned[p.key];if(!source)throw Error('Cette préparation n’est plus disponible.');if(Object.prototype.hasOwnProperty.call(p,'expectedMeal')&&JSON.stringify(source)!==JSON.stringify(p.expectedMeal))throw Error('La préparation a changé. Ouvrez à nouveau la confirmation.');
      if(p.action==='status'&&p.status!=='annulé'&&source.dessertPreparationId){const batch=preparationRegistry()?.batches[source.dessertPreparationId];if(!batch||allocated(batch.id,p.key)+servicePortions(source)>batch.totalPortions+1e-9)throw Error('Les portions demandées dépassent les portions disponibles.');}
      if(p.action==='portions'&&source.dessertPreparationId){const batch=preparationRegistry()?.batches[source.dessertPreparationId],quantity=p.adult+p.children*Number(source.childFactor??.65);if(!batch||allocated(batch.id,p.key)+quantity>batch.totalPortions+1e-9)throw Error('Les portions demandées dépassent les portions disponibles.');}
      if(p.action==='move'){const target=st.planned[p.destinationKey]||null;if(Object.prototype.hasOwnProperty.call(p,'expectedDestination')&&JSON.stringify(target)!==JSON.stringify(p.expectedDestination))throw Error('La destination a changé. Ouvrez à nouveau la confirmation.');if(p.expectedPlanning&&JSON.stringify(st.planned)!==JSON.stringify(p.expectedPlanning))throw Error('Le calendrier a changé. Ouvrez à nouveau la confirmation.');const next={...st.planned};delete next[p.key];let moving=source,date=p.destination;for(let i=0;i<370;i++){const key=date+'-'+p.slot+'-dessert',occupied=next[key];next[key]=moving;if(!occupied){moving=null;break;}moving=occupied;date=addDays(date,1);}if(moving)throw Error('Aucun créneau libre trouvé.');st.planned=next;}
      else if(p.action==='portions')st.planned[p.key]={...source,adult:p.adult,children:p.children,people:p.adult+p.children,...(source.dessertPreparationId?{dessertPortions:p.adult+p.children*Number(source.childFactor??.65)}:{})};else{if(p.status==='préparé'){const batch=ensurePreparation(p.key);if(batch.status!=='prepared'){batch.status='prepared';batch.preparedAt=new Date().toISOString();batch.revision++;}}st.planned[p.key]={...st.planned[p.key],status:p.status};}result={date:p.action==='move'?p.destination:p.date,slot:p.slot,meal:JSON.parse(JSON.stringify(st.planned[p.action==='move'?p.destinationKey:p.key]))};`,{...values,action,key,destinationKey});
  }
  function finishCook(){
    return transaction(`if(!st.cook)throw Error('Aucune préparation en cours.');const currentBatch=st.cookMeal?.batchId?preparationRegistry()?.batches[st.cookMeal.batchId]:null,recipe=currentBatch?.recipeSnapshot||getR(st.detail),adaptation=currentBatch?currentBatch.tm5Snapshot:st.tmAdaptations?.[st.detail],steps=st.cookMethod==='tm5'?(adaptation?.steps||(recipe?.thermomix?recipe.steps:null)):recipe?.steps;if(!steps?.length||st.cookStep!==steps.length-1)throw Error('Terminez la dernière étape avant de confirmer la préparation.');const context=st.cookMeal;if(context){const record=st.planned[context.key];if(!record||record.id!==context.id||record.status==='annulé'||JSON.stringify(record)!==JSON.stringify(context.expectedMeal))throw Error('Le repas a changé pendant la préparation. Vérifiez le planning.');if(context.batchId){const batch=preparationRegistry()?.batches[context.batchId];if(!batch||JSON.stringify(batch)!==JSON.stringify(context.expectedBatch))throw Error('La préparation dessert a changé pendant la cuisine.');batch.status='prepared';batch.preparedAt=new Date().toISOString();batch.revision++;}st.planned[context.key]={...record,status:'préparé'};}st.cook=false;st.cookMeal=null;result={prepared:context?.key||null};`);
  }
  function favorite(id) { assertSharedWrite();page('recipes', id); click('fav', { id }); }
  function cook(id, action) {
    if (evaluate('return st.detail!==p.id||!st.cook;', { id })) { page('recipes', id); click('cook'); }
    if (action) click(action);
  }
  function tm5(id) { evaluate('st.extraPage="";st.page="recipes";st.detail=p.id;st.tmEditor=true;st.tmView=false;st.cook=false;render();', { id }); }
  // A native mutation is either persisted in full or restored byte-for-byte.
  function transaction(code, values={}) {
    assertSharedWrite();
    return evaluate(`const before={state:JSON.parse(JSON.stringify(st)),custom:JSON.parse(JSON.stringify(custom)),raw:localStorage.getItem(key),favorites:BASE.map(r=>[r.id,r.fav])};
      try{let result;${dessertHelpers}${code};save();render();return result;}catch(error){st=before.state;custom=before.custom;st.customRecipes=custom;for(const [id,fav]of before.favorites){const r=BASE.find(x=>x.id===id);if(r)r.fav=fav;}let restored=false;try{if(before.raw===null)localStorage.removeItem(key);else localStorage.setItem(key,before.raw);restored=localStorage.getItem(key)===before.raw;}catch{}if(!restored)throw Error('La restauration locale n’a pas pu être confirmée après : '+error.message);throw error;}`,values);
  }
  function recipeUsage(id) {
    return evaluate(`const recipe=getR(p.id);if(!recipe)throw Error('Recette introuvable.');const planned=Object.entries(st.planned||{}).filter(([,m])=>m?.id===p.id).map(([key,meal])=>({key,...meal}));const c=window.DobbyFamilyUI?.connectionState?.()||{};return {id:recipe.id,name:recipe.name,base:BASE.some(r=>r.id===recipe.id),removedAt:recipe.removedAt||null,planned,favorite:!!recipe.fav,hasTM5:!!st.tmAdaptations?.[p.id],expected:JSON.stringify({recipe,tm5:st.tmAdaptations?.[p.id]||null,planned,context:{epoch:c.epoch??null,userId:c.userId??null,householdId:c.householdId??null}})};`,{id});
  }
  function retirement(id,options,removed) {
    if(options?.confirmed!==true)return false;
    const usage=recipeUsage(id);if(options.expected!==usage.expected)throw Error('La recette ou ses repas ont changé. Vérifiez à nouveau la confirmation.');
    return transaction(`const prior=getR(p.id);let at=custom.findIndex(r=>r.id===p.id);const next={...prior,id:prior.id,...(BASE.some(r=>r.id===p.id)?{baseRecipeId:p.id}:{})};if(p.removed)next.removedAt=new Date().toISOString();else delete next.removedAt;if(at<0)custom.push(next);else custom[at]=next;result=true;`,{id,removed});
  }
  const removeRecipe=(id,options={})=>retirement(id,options,true);
  const restoreRecipe=(id,options={})=>retirement(id,options,false);
  function planRecipe(values) {
    const {id,date,slot,adult,children}=values;const plannedKey=componentKey(values);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['midi','soir'].includes(slot))throw Error('Date ou créneau invalide.');
    const d=new Date(date+'T12:00:00');if(Number.isNaN(d.getTime())||[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')!==date)throw Error('Date invalide.');
    if(![adult,children].every(n=>Number.isInteger(n)&&n>=0)||adult+children<1||adult+children>20)throw Error('Choisissez entre 1 et 20 convives entiers.');
    return transaction(`const r=getR(p.id),key=p.plannedKey,prior=st.planned[key]||null;if(!r||r.removedAt)throw Error('Cette recette est retirée du catalogue.');if(r.servings==null||!Number.isFinite(Number(r.servings))||Number(r.servings)<=0)throw Error('Complétez les portions de référence avant de planifier ce repas.');if(Object.prototype.hasOwnProperty.call(p,'expectedMeal')&&JSON.stringify(prior)!==JSON.stringify(p.expectedMeal))throw Error('Ce créneau a changé. Ouvrez à nouveau la confirmation.');if(prior&&p.replaceConfirmed!==true)throw Error('Confirmez le remplacement du repas existant.');st.day=p.date;st.slot=p.slot;st.adult=p.adult;st.children=p.children;st.people=p.adult+p.children;if(p.note!==undefined)st.note=p.note;const config={...prior,people:p.adult+p.children,adult:p.adult,children:p.children,childFactor:prior?.childFactor??0.65};delete config.id;delete config.status;if(prior?.id!==p.id)delete config._e072ImportRef;if(prior?.dessertPreparationId){delete config.dessertPreparationId;delete config.dessertPortions;delete config._e072ImportRef;}if(p.component==='dessert'&&(!prior||prior.id!==p.id||['préparé','annulé'].includes(prior.status)||prior.dessertPreparationId)){delete config._e072ImportRef;config.dessertIngredientRef='dessert-service-'+crypto.randomUUID();}if(p.note!==undefined)config.note=p.note;if(p.component==='dessert')st.planned[key]={id:p.id,...config,status:'prévu'};else planSelectedMeal(p.id,config);result={id:p.id,key,meal:JSON.parse(JSON.stringify(st.planned[key]))};`,{...values,plannedKey});
  }
  const boundedText=(x,max=2000)=>{if(x===null||x===undefined)return '';if(!['string','number'].includes(typeof x)||String(x).length>max)throw Error('Texte TM5 invalide ou trop long.');return String(x).trim();};
  function normalizeTMEdit(raw,humanVerified=false) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.steps)||raw.steps.length>80)throw Error('Étapes TM5 invalides.');
    const steps=raw.steps.map(s=>{if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Étape TM5 invalide.');if(s.reverse!==undefined&&s.reverse!==null&&typeof s.reverse!=='boolean')throw Error('Sens inverse TM5 invalide.');const step={...s,text:boundedText(s.text),tool:boundedText(s.tool,160),time:boundedText(s.time,160),temp:boundedText(s.temp,160),speed:boundedText(s.speed,160),reverse:s.reverse??null};if(humanVerified&&(!step.text||!step.tool))throw Error('Vérifiez chaque instruction et accessoire TM5 avant validation humaine.');return step;});
    if(humanVerified&&!steps.length)throw Error('Ajoutez des instructions TM5 avant validation humaine.');
    return {...raw,steps,verified:humanVerified,verifiedAt:humanVerified?new Date().toISOString():null,status:humanVerified?'Vérifiée':'À vérifier'};
  }
  function saveRecipeCore(values,editId,options={},humanVerified=false) {
    if(!editId)return {errors:['La création manuelle est fermée. Utilisez l’import IA.']};
    const result=evaluate('return validateBatch(JSON.stringify(p));',values);if(result.errors.length)return {errors:result.errors};
    if(result.recipes.length!==1)return {errors:['Une seule recette peut être modifiée à la fois.']};
    const tm5=options.tm5===undefined?undefined:normalizeTMEdit(options.tm5,humanVerified);
    if((options.media||[]).some(m=>m.bytes))throw Error('Utilisez saveRecipeWithMedia pour enregistrer les nouvelles images.');
    return transaction(`
      const c=window.DobbyFamilyUI?.connectionState?.()||{},context=JSON.stringify({epoch:c.epoch??null,userId:c.userId??null,householdId:c.householdId??null});if(p.options._context&&p.options._context!==context)throw Error('Le foyer a changé pendant l’édition.');if(p.options._snapshot&&p.options._snapshot!==JSON.stringify({custom,tm:st.tmAdaptations||{}}))throw Error('Le grimoire a changé pendant l’édition.');
      const previous=getR(p.id);if(!previous)throw Error('Recette introuvable.');const at=custom.findIndex(r=>r.id===p.id),incoming=p.payload.recipes[0],next={...previous,...p.checked,id:p.id,fav:previous.fav,...(BASE.some(r=>r.id===p.id)?{baseRecipeId:p.id}:{})};if(incoming.source===undefined)next.source=previous.source||'';if(incoming.reviewed===undefined)next.reviewed=previous.reviewed;
      const details={version:2,...previous.importDetails,durations:{preparation:null,cooking:null,rest:null,...previous.importDetails?.durations,...incoming.durations,total:next.minutes}};
      const oldDetails=previous.importDetails||{},oldIDs=oldDetails.ingredientIds||previous.ingredients.map((_,i)=>'ingredient-'+i),sameIngredients=JSON.stringify(previous.ingredients.map(x=>x[0]))===JSON.stringify(next.ingredients.map(x=>x[0]));
      const ids=p.options.ingredientIds;if(ids!==undefined&&(!Array.isArray(ids)||ids.length!==next.ingredients.length||ids.some(id=>typeof id!=='string'||!id||id.length>100)||new Set(ids).size!==ids.length))throw Error('Identifiants d’ingrédients invalides.');details.ingredientIds=ids||(!sameIngredients?next.ingredients.map((_,i)=>'ingredient-'+i):oldIDs);
      const order=p.options.stepOrder;if(order!==undefined&&(!Array.isArray(order)||order.length!==next.steps.length||order.some(i=>i!==null&&(!Number.isInteger(i)||i<0||i>=previous.steps.length))||new Set(order.filter(i=>i!==null)).size!==order.filter(i=>i!==null).length))throw Error('Ordre des étapes invalide.');
      const priorTM=st.tmAdaptations?.[p.id],structuralSteps=previous.steps.length!==next.steps.length,oldMapping=[...(oldDetails.stepDetails||[]).filter(d=>d.method!=='tm5'),...(priorTM?.stepDetails||oldDetails.stepDetails?.filter(d=>d.method==='tm5')||[])],archiveMedia=[...(previous.localMediaArchive||[])];let archived=false;
      const archive=reason=>{if(archived)return;archived=true;details.mappingHistory=[...(oldDetails.mappingHistory||[]),{at:new Date().toISOString(),reason,ingredientIds:oldIDs,stepDetails:oldMapping}];};
      const suppliedTM=p.tm5===undefined?priorTM:{...(priorTM||{}),...p.tm5,portions:p.tm5.portions??priorTM?.portions??next.servings??null};
      details.stepDetails=oldMapping.flatMap(d=>{let index=d.stepIndex;if((d.method||'classic')==='classic'){if(order)index=order.indexOf(d.stepIndex);else if(structuralSteps)index=-1;}else if(p.tm5!==undefined&&priorTM?.steps?.length!==p.tm5.steps.length)index=-1;if(index<0){archive('Étapes supprimées ou ordre non identifié');archiveMedia.push(...(d.images||[]));return [];}const entry={...d,method:d.method||'classic',stepIndex:index,ingredients:[...(d.ingredients||[])]};if(order&&index!==d.stepIndex)archive('Ordre des étapes modifié');if(!sameIngredients&&!ids){archive('Structure des ingrédients à vérifier');entry.ingredients=[];}else{entry.ingredients=entry.ingredients.filter(ref=>details.ingredientIds.includes(ref.ingredientId));if(entry.ingredients.length!==(d.ingredients||[]).length)archive('Ingrédients retirés');}return [entry];});
      for(const m of p.options.media||[]){if(!m.ref||!/^recipe-media-[a-f0-9]{64}$/.test(m.ref.key)||m.ref.sha256!==m.ref.key.slice(13)||!['image/jpeg','image/png','image/webp'].includes(m.ref.type))throw Error('Référence de média invalide.');if(m.target==='cover'){if(next.localMedia&&next.localMedia.key!==m.ref.key)archiveMedia.push(next.localMedia);next.localMedia=m.ref;details.coverProvenance=m.ref.provenance??null;details.coverDescription=m.ref.description||'';}else if(m.target==='step'){const method=m.method||'classic',steps=method==='tm5'?suppliedTM?.steps:next.steps;if(!['classic','tm5'].includes(method)||!Number.isInteger(m.stepIndex)||m.stepIndex<0||!steps||m.stepIndex>=steps.length)throw Error('La photo ne correspond plus à une étape existante.');let d=details.stepDetails.find(d=>d.method===method&&d.stepIndex===m.stepIndex);if(!d){d={method,stepIndex:m.stepIndex,title:'',ingredients:[],images:[]};details.stepDetails.push(d);}archiveMedia.push(...(d.images||[]));d.images=[m.ref];}else throw Error('Cible de média invalide.');}
      details.missingFields=[];if(!next.name.trim())details.missingFields.push('name');if(next.servings==null)details.missingFields.push('servings');if(next.minutes==null)details.missingFields.push('minutes');if(!next.ingredients.length)details.missingFields.push('ingredients');next.ingredients.forEach(([name,q,u],i)=>{if(!name.trim())details.missingFields.push('ingredients.'+i+'.name');if(q==null)details.missingFields.push('ingredients.'+i+'.quantity');if(!u.trim())details.missingFields.push('ingredients.'+i+'.unit');});if(!next.steps.length)details.missingFields.push('steps');next.steps.forEach((s,i)=>{if(!s.trim())details.missingFields.push('steps.'+i);});
      next.importDetails=details;if(archiveMedia.length)next.localMediaArchive=[...new Map(archiveMedia.map(ref=>[ref.key,ref])).values()];const old={...previous};delete old.importHistory;next.importHistory=[...(previous.importHistory||[]),{recipe:old,tm5:priorTM||null,replacedAt:new Date().toISOString(),origin:'manual-edit'}];
      if(at<0)custom.push(next);else custom[at]=next;
      if(suppliedTM){st.tmAdaptations||={};st.tmAdaptations[p.id]={...suppliedTM,stepDetails:details.stepDetails.filter(d=>d.method==='tm5'),...(p.tm5!==undefined&&priorTM?{history:[...(priorTM.history||[]),Object.fromEntries(Object.entries(priorTM).filter(([key])=>key!=='history'))]}:{})};}if(p.humanVerified){st.tmEditor=false;st.tmView=true;st.detail=p.id;st.page='recipes';}
      result={id:p.id,errors:[]};`,{id:editId,payload:values,checked:result.recipes[0],options,tm5,humanVerified});
  }
  function saveRecipe(values,editId,options={}) {return saveRecipeCore(values,editId,options);}
  function saveTM(id,steps,verified) {
    if(verified!==true)return false;const r=read().recipes.find(r=>r.id===id);if(!r)throw Error('Recette introuvable.');
    const payload={format:'dobby-recipes',version:2,recipes:[{name:r.name,servings:r.servings,minutes:r.minutes,category:r.category,device:r.thermomix?'tm5':'classic',ingredients:r.ingredients.map(([name,quantity,unit])=>({name,quantity,unit})),steps:r.steps}]};
    const result=saveRecipeCore(payload,id,{tm5:{steps}},true);return !result.errors.length;
  }
  function prepareRecipeMedia(file,target) {return window.DobbyRecipeImport.prepareMedia(file,target,{E:this});}
  function saveRecipeWithMedia(payload,id,options={}) {return window.DobbyRecipeImport.saveEdit(payload,id,options,{E:this});}
  async function batch(files) {
    // Use the native validator and candidate. Normalize its invalid-JSON result
    // for the native view, which assumes warnings is always present.
    evaluate('batchCandidate=null;');page('batch');
    const file=files[0];if(!file)return null;
    if(file.size>2*1024*1024)throw Error('Fichier trop volumineux (2 Mo maximum).');
    return evaluate('batchCandidate=validateBatch(p.text);batchCandidate.warnings ||= [];render();return batchCandidate;', {text:await file.text()});
  }
  function commitBatch(choices) {
    assertSharedWrite();
    for (const [index, value] of Object.entries(choices)) field('collision' + index, value);
    field('batchConfirmed', true); click('batchCommit');
  }
  function shop(action, values = {}) {
    if (evaluate('return st.page!=="shop";')) page('shop');
    if (action === 'addextra') field('extra', values.value);
    click(action, values.dataset || {});
  }
  function finalCheck(index, checked) {
    const input = win().document.querySelector('[data-finalcheck="' + Number(index) + '"]');
    if (!input) throw Error('Article de la liste introuvable');
    input.checked = checked; input.dispatchEvent(new (win().Event)('change', { bubbles: true }));
  }
  function history(id) { evaluate('if(st.shopHistory[p.id]){st.shopFinal=st.shopHistory[p.id];st.page="shop";st.detail=null;save();render();}', { id }); }
  function family(action, id, values) {
    if (values) {
      const form = win().document.getElementById(action === 'add' ? 'fv2AddForm' : 'fv2EditForm');
      if (!form) throw Error('Connectez le foyer pour modifier le panier commun.');
      for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value;
      form.requestSubmit(); return;
    }
    const button = [...win().document.querySelectorAll('[data-fv-action]')].find(button => button.dataset.fvAction === action && (!id || button.dataset.id === id));
    if (!button) throw Error('Action du panier indisponible.'); button.click();
  }
  function familyCheck(id, checked) {
    const input = [...win().document.querySelectorAll('[data-fv-check]')].find(input => input.dataset.fvCheck === id);
    if (!input || input.disabled) throw Error('Résolvez le conflit avant de modifier cet article.');
    input.checked = checked; input.dispatchEvent(new (win().Event)('change', { bubbles: true }));
  }
  function prepareRecipeImport(file) { return window.DobbyRecipeImport.prepare(file,{E:this}); }
  function commitRecipeImport(plan) {
    assertSharedWrite();
    return evaluate(`
      const token=()=>{const c=window.DobbyFamilyUI?.connectionState?.()||{};return JSON.stringify({epoch:c.epoch??null,userId:c.userId??null,householdId:c.householdId??null});};
      if(token()!==p.context)throw Error('Le foyer a changé : analysez à nouveau le fichier.');
      if(JSON.stringify({custom,tm:st.tmAdaptations||{}})!==p.snapshot)throw Error('Le grimoire a changé depuis l’aperçu : analysez à nouveau le fichier.');
      const rows=p.entries.filter(x=>x.mode!=='skip'),validated=[];
      for(const row of rows){const check=validateBatch(JSON.stringify({format:'dobby-recipes',version:p.version,recipes:[row.native]}));if(check.errors.length||check.recipes.length!==1)throw Error(check.errors.join(' · ')||'Recette invalide.');
        const existing=row.existingId?[...custom,...BASE].find(x=>x.id===row.existingId):null;
        if(row.existingId&&!existing)throw Error('Recette existante indisponible.');
        if(row.mode==='replace'&&!custom.includes(existing))throw Error('Une recette intégrée ne peut pas être remplacée.');
        if(row.mode==='tm5'&&(!existing||!row.tm5))throw Error('Adaptation TM5 non raccordable.');
        const checked=check.recipes[0];checked.importDetails={...(existing?.importDetails||{}),...row.details,notes:[...new Set([...(existing?.importDetails?.notes||[]),...(row.details.notes||[])])],equipment:[...new Set([...(existing?.importDetails?.equipment||[]),...(row.details.equipment||[])])]};if(existing&&!row.native.source)checked.source=existing.source||'';
        if(row.media)checked.localMedia=row.media;const archive=[...(existing?.localMediaArchive||[]),...(row.mediaArchive||[]),...(row.media&&existing?.localMedia&&row.media.key!==existing.localMedia.key?[existing.localMedia]:[])];if(archive.length)checked.localMediaArchive=[...new Map(archive.map(x=>[x.key,x])).values()];
        if(existing){checked.id=existing.id;if(row.mode==='replace'){
          const previous={...existing};delete previous.importHistory;
          checked.importHistory=[...(existing.importHistory||[]),{recipe:previous,tm5:st.tmAdaptations?.[existing.id]||null,replacedAt:new Date().toISOString()}];
          if(!row.media&&existing.localMedia)checked.localMedia=existing.localMedia;
        }}
        validated.push({...row,checked,existing});
      }
      if(!rows.length)return{inserted:0,replaced:0,adapted:0,skipped:p.entries.length,ids:[]};
      const before={state:JSON.parse(JSON.stringify(st)),custom:JSON.parse(JSON.stringify(custom)),batch:batchCandidate,raw:localStorage.getItem(key)},alertBefore=window.alert;
      try{
        const imports=validated.filter(x=>x.mode!=='tm5');
        if(imports.length){batchCandidate={errors:[],warnings:[],recipes:imports.map(x=>x.checked)};st.extraPage='';st.detail=null;st.cook=false;st.tmEditor=false;st.tmView=false;st.page='batch';render();
          document.getElementById('batchConfirmed').checked=true;
          imports.forEach((row,i)=>{let select=document.getElementById('collision'+i);if(!select){select=document.createElement('select');select.id='collision'+i;document.getElementById('screen').append(select);}select.replaceChildren();const option=document.createElement('option');option.value=row.mode==='replace'?'replace':'skip';select.append(option);select.value=option.value;});
          window.alert=()=>{};commitBatch();
        }
        let adapted=0;const ids=[];
        for(const row of validated){const r=row.mode==='tm5'?row.existing:custom.find(x=>x.importDetails?.fingerprint===row.details.fingerprint&&(row.existingId?x.id===row.existingId:true));
          if(!r)throw Error('L’enregistrement de '+row.native.name+' n’a pas pu être confirmé.');ids.push(r.id);
          if(row.tm5&&(!st.tmAdaptations?.[r.id]||row.replaceTM5)){
            st.tmAdaptations||={};const prior=st.tmAdaptations[r.id];st.tmAdaptations[r.id]={...row.tm5,verified:false,verifiedAt:null,status:'À vérifier',...(prior?{history:[...(prior.history||[]),Object.fromEntries(Object.entries(prior).filter(([k])=>k!=='history'))]}:{})};adapted++;
          }
        }
        save();render();
        return{inserted:validated.filter(x=>x.mode==='add').length,replaced:validated.filter(x=>x.mode==='replace').length,adapted,skipped:p.entries.filter(x=>x.mode==='skip').length,ids};
      }catch(error){custom=before.custom;st=before.state;st.customRecipes=custom;batchCandidate=before.batch;let restored=false;try{if(before.raw===null)localStorage.removeItem(key);else localStorage.setItem(key,before.raw);restored=localStorage.getItem(key)===before.raw;}catch{}if(!restored)throw Error('Import interrompu : la restauration locale n’a pas pu être confirmée. Rechargez et vérifiez le Grimoire avant de réessayer. Erreur initiale : '+error.message);throw error;
      }finally{window.alert=alertBefore;}
    `,plan);
  }
  function exportRecipes(id) {
    evaluate(`const recipes=allRecipes().filter(r=>!p.id||r.id===p.id).map(r=>{const d=r.importDetails||{};return {id:r.id,importKey:d.key||r.id,name:r.name,minutes:r.minutes??null,servings:r.servings,device:r.thermomix?'tm5':'classic',category:r.category,favorite:!!r.fav,...(r.removedAt?{removedAt:r.removedAt}:{}),...(r.baseRecipeId?{baseRecipeId:r.baseRecipeId}:{}),
      ingredients:r.ingredients.map(([name,quantity,unit],i)=>({id:d.ingredientIds?.[i]||'ingredient-'+i,name,quantity,unit})),steps:r.steps,stepDetails:[...(d.stepDetails||[]).filter(s=>s.method!=='tm5'),...(st.tmAdaptations?.[r.id]?.stepDetails||d.stepDetails?.filter(s=>s.method==='tm5')||[])].map(s=>({...s,images:[]})),source:r.source||'',reviewed:r.reviewed===true,durations:{preparation:null,cooking:null,rest:null,...d.durations,total:r.minutes??null},equipment:d.equipment||[],notes:d.notes||[],missing:d.missing||[],uncertain:d.uncertain||[],image:null,images:[],tm5:st.tmAdaptations?.[r.id]||null,mediaNotice:r.localMedia?'Photographies conservées sur cet appareil, non comprises dans cet export JSON.':''};});downloadJson(p.id?'dobby-recette.json':'dobby-recettes.json',{format:'dobby-recipes',version:2,recipes});`,{id});
  }

  return Object.freeze({ win, evaluate, page, read, amount, portions, familyCounts, reserveIngredients, choose, mealAction, componentAction, dessertPreparations, prepareDessert, allocateDessert, finishCook, favorite, cook, cookAt, tm5, saveTM, saveRecipe, saveRecipeWithMedia, prepareRecipeMedia, recipeUsage, removeRecipe, restoreRecipe, planRecipe, batch, commitBatch, shop, finalCheck, history, family, familyCheck, exportRecipes, prepareRecipeImport, commitRecipeImport });
})();
