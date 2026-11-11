/* E02 facade: native reads/writers and native metadata store; no remote sync or LLM. */
window.DobbyChatEngine=(()=>{'use strict';
 const E=window.DobbyFamilyStitchEngine,C=window.DobbyCuisineEngine;
 let owner=undefined,rows=[],loaded=false,envelope={},conversation=null;
 const api=()=>E.win().DobbyFamilyUI;
 const identity=()=>{const c=api()?.getContext();return {user:typeof c?.userId==='string'&&c.userId?c.userId:null,household:c?.householdId||null};};
 const token=()=>JSON.stringify(identity());
 const check=expected=>{if(token()!==expected)throw Error('Le compte ou le foyer a changé. La demande n’a pas été exécutée.');};
 const key=user=>'v7-private-chat:'+encodeURIComponent(user);
 async function load(){const current=identity().user,guard=token();if(loaded&&owner===current)return rows;owner=current;loaded=false;rows=[];envelope={};conversation=null;
  if(current){const stored=await api().meta(key(current));check(guard);if(stored&&(stored.version!==1||stored.owner!==current||!Array.isArray(stored.rows)))throw Error('Historique individuel invalide. Aucune donnée remplacée.');if(stored?.rows.some(r=>!r||typeof r.id!=='string'||typeof r.input!=='string'||typeof r.answer!=='string'))throw Error('Historique individuel invalide. Aucune donnée remplacée.');envelope=stored||{};rows=stored?.rows||[];conversation=stored?.conversation||null;}
  loaded=true;return rows;
 }
 function current(){if(!loaded||owner!==identity().user)throw Error('Le compte a changé ou l’historique est indisponible. Revenez au fil.');return rows;}
 async function persist(){current();const guard=token();if(owner)await api().putMeta(key(owner),{...envelope,version:1,owner,rows:JSON.parse(JSON.stringify(rows)),conversation:JSON.parse(JSON.stringify(conversation))});check(guard);}
 async function append(row){current().push(row);if(conversation?.identity===token())conversation.exchange=row.id;await persist();}
 async function update(id,answer,links=[]){const row=current().find(r=>r.id===id);if(!row)throw Error('Échange introuvable.');row.answer=answer;row.links=links;await persist();}
 async function remove(id){current();rows=rows.filter(r=>r.id!==id);if(conversation?.exchange===id)conversation=null;await persist();}
 const norm=s=>String(s||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim();
 const link=(label,href)=>({label,href});
 const unknown=()=>({text:'Dobby ne sait pas encore interpréter cette demande. Il peut consulter les courses, le repas, les missions, l’agenda, les équipements et les documents, ajouter un article aux courses ou préparer la suppression d’une mission.',links:[]});
 function nativeWrite(task,fields){const w=E.win(),original=w.save,before=E.evaluate('return JSON.parse(JSON.stringify(Object.fromEntries(p.fields.map(k=>[k,st[k]]))));',{fields});let failure=null;E.clearError();w.save=function(...args){try{return original.apply(this,args);}catch(error){failure=error;}};try{task();}finally{w.save=original;}if(failure||E.lastError){
  // A native writer may mutate memory before save() fails. Reflect only the
  // last stored values for its own fields so a later preference save cannot commit a failed action.
  let stored;try{stored=persisted();}catch{stored=before;}const values={};for(const field of fields)values[field]=Object.hasOwn(stored,field)?stored[field]:before[field];E.evaluate('for(const field of p.fields){if(Object.hasOwn(p.values,field))st[field]=p.values[field];else delete st[field];}',{fields,values});
  throw Error('L’enregistrement natif n’a pas été confirmé. Vérifiez les données avant de réessayer.');}}
 function persisted(){return E.evaluate('return JSON.parse(localStorage.getItem(key)||"{}");');}
 const shoppingLinks=()=>[link('Voir les courses','./index.html#shop')];
 const thread=()=>owner?key(owner):'temporary';
 function remember(topic,targets=[]){conversation={version:1,identity:token(),thread:thread(),topic,targets};}
 function context(){return loaded&&owner===identity().user&&conversation?.version===1&&conversation.identity===token()&&conversation.thread===thread()&&rows.some(row=>row.id===conversation.exchange)&&Array.isArray(conversation.targets)?conversation:null;}
 const clarification=text=>({text:text||'De quel article parlez-vous ? Dobby a besoin d’une précision. Aucune modification effectuée.',links:shoppingLinks()});
 function itemName(value){return String(value||'').replace(/^(?:du|de la|des|le|la|les|un|une)\s+|^de l['’]/i,'').replace(/[.!?]+$/,'').trim();}
 const validName=value=>typeof value==='string'&&value.length>=2&&value.length<=119&&!/[\n;]/.test(value)&&!/(?:\bet (?:du|de la|des|un|une)\b|\b(?:puis|ensuite|supprime|ajoute)\b)/i.test(value);
 function legacyReference(name,state){const index=(state.extras||[]).findIndex(x=>norm(x)===norm(name));return {kind:'preparation',name,index,record:JSON.stringify(state.extras||[])};}
 // Shared transport revisions/timestamps change on a successful sync without
 // changing the article. Compare the canonical editable fields, as family-core
 // does; conflicts and checked items are separately rejected before writing.
 function itemRecord(snapshot,raw){return JSON.stringify(snapshot.shared&&raw?{id:raw.id,title:String(raw.title||'').trim(),quantity:raw.quantity==null?null:Number(raw.quantity),unit:String(raw.unit||'').trim(),checked:Boolean(raw.checked),deleted_at:raw.deleted_at||null}:raw);}
 function itemReference(snapshot,item){const raw=snapshot.shared?api().grocery.read().items.find(x=>x.id===item.id):E.read().state.shopFinal.items.find(x=>x.id===item.id);return {kind:'item',scope:snapshot.scope,list:snapshot.shared?null:E.read().state.shopFinal.id||null,id:item.id,name:item.name,record:itemRecord(snapshot,raw)};}
 function rememberItems(snapshot,items){remember('shopping',items.map(item=>itemReference(snapshot,item)));}
 function shoppingSnapshot(){const list=window.DobbyCuisineList;if(!list)throw Error('La liste de courses est indisponible. Ouvrez les courses avant de réessayer.');return list.snapshot(E);}
 function restoreShopping(){const saved=persisted();E.evaluate('for(const k of ["shopFinal","extras"]){if(Object.hasOwn(p,k))st[k]=p[k];else delete st[k];}',saved);}
 function verifyLocal(snapshot){if(snapshot.shared)return;const state=E.read().state,saved=persisted();if(JSON.stringify(state.shopFinal)!==JSON.stringify(saved.shopFinal)||JSON.stringify(state.extras)!==JSON.stringify(saved.extras)){restoreShopping();throw Error('L’enregistrement natif n’a pas été confirmé. Vérifiez les courses avant de réessayer.');}}
 // This contract is also the integration boundary for a future secured model.
 // No model provider, credential or remote request is installed or invoked here.
 const intentContract=Object.freeze({version:1,provider:null,kinds:Object.freeze(['shopping.replace','shopping.increase','shopping.remove','meal.read'])});
 function interpret(input){const text=String(input||'').trim().replace(/[.!?]+$/,''),q=norm(text);
  if(/^(?:non|quel|quels|le|repas|diner)\b/.test(q)&&/\b(?:repas|diner|mange)\b/.test(q)&&/\bdemain\b/.test(q))return {version:1,kind:'meal.read',offset:1};
  const amount=q.match(/^(?:finalement[, ]+)?ajoute[ -]en\s+(?:encore\s+)?(un|une|deux|trois|quatre|cinq|\d+)$/);
  let kind,values={};
  if(amount){kind='shopping.increase';values.delta=({un:1,une:1,deux:2,trois:3,quatre:4,cinq:5})[amount[1]]||Number(amount[1]);}
  else if(/^(?:finalement[, ]+)?(?:retire|enleve|supprime)[ -](?:le|la|les)$/.test(q))kind='shopping.remove';
  else {const replace=text.match(/^(?:(?:je voudrais|je veux|j['’]aimerais) que ce soit|(?:finalement[, ]+)?(?:remplace[ -](?:le|la)|change[ -](?:le|la)))\s+(?:par\s+)?(.+)$/i);if(!replace)return null;
   kind='shopping.replace';values.name=itemName(replace[1].split(/\s+(?:et\s+)?(?:pas|plut[oô]t que|au lieu de)\s+/i)[0]);
   if(!validName(values.name))return {version:1,kind:'clarify'};
  }
  const previous=context();if(previous?.topic!=='shopping'||previous.targets.length!==1)return {version:1,kind:'clarify'};
  return {version:1,kind,target:JSON.parse(JSON.stringify(previous.targets[0])),...values};
 }
 function validateIntent(intent){if(!intent||intent.version!==1||!intentContract.kinds.includes(intent.kind))throw Error('Intention non prise en charge. Aucune modification effectuée.');
  if(intent.kind==='meal.read'){if(intent.offset!==1)throw Error('Date non prise en charge.');return intent;}
  const previous=context();if(previous?.topic!=='shopping'||previous.targets.length!==1||JSON.stringify(intent.target)!==JSON.stringify(previous.targets[0]))throw Error('La référence de cet article n’est plus disponible. Précisez votre demande.');
  if(intent.kind==='shopping.replace'&&!validName(intent.name))throw Error('Nom d’article invalide.');if(intent.kind==='shopping.increase'&&(!Number.isInteger(intent.delta)||intent.delta<=0||intent.delta>999999))throw Error('Quantité invalide.');return intent;
 }
 async function executeIntent(candidate){const intent=validateIntent(candidate),guard=token();
  if(intent.kind==='meal.read'){remember('meal');return mealReply(1,E.read().state);}
  const list=window.DobbyCuisineList,reference=intent.target;let snapshot,item;
  if(reference.kind==='preparation'){
   const state=E.read().state;if(api()?.grocery?.read()?.context||state.shopFinal?.e072||JSON.stringify(state.extras||[])!==reference.record||norm(state.extras?.[reference.index])!==norm(reference.name)||(state.extras||[]).filter(x=>norm(x)===norm(reference.name)).length!==1)throw Error('L’article ou le mode de partage a changé. Consultez à nouveau les courses avant de le corriger.');
   // Canonical migration retains the existing final list and its archives.
   snapshot=shoppingSnapshot();verifyLocal(snapshot);const matches=snapshot.items.filter(x=>norm(x.name)===norm(reference.name));if(matches.length!==1)throw Error('Plusieurs articles correspondent. Consultez les courses pour préciser lequel.');item=matches[0];
  }else{
   snapshot=shoppingSnapshot();const raw=snapshot.shared?api().grocery.read().items.find(x=>x.id===reference.id):E.read().state.shopFinal.items.find(x=>x.id===reference.id);
   if(reference.scope!==snapshot.scope||(!snapshot.shared&&reference.list!==(E.read().state.shopFinal.id||null))||!raw||itemRecord(snapshot,raw)!==reference.record)throw Error('L’article a changé. Consultez à nouveau les courses avant de le corriger.');item=snapshot.items.find(x=>x.id===reference.id);
  }
  if(!item||item.conflict||item.done)throw Error('Cet article est terminé ou en conflit. Consultez les courses avant de le modifier.');
  const values={name:intent.kind==='shopping.replace'?intent.name:item.name,qty:intent.kind==='shopping.increase'?(item.qty==null?intent.delta:Number(item.qty)+intent.delta):item.qty,unit:item.unit||''};
  if(values.qty!=null&&(!Number.isFinite(values.qty)||values.qty>999999))throw Error('Quantité invalide.');
  if(intent.kind==='shopping.replace'&&snapshot.items.some(x=>x.id!==item.id&&norm(x.name)===norm(values.name)))return clarification('Cet article existe déjà dans les courses. Quel article souhaitez-vous conserver ? Aucune modification effectuée.');
  E.clearError();try{if(intent.kind==='shopping.remove')await list.remove(E,item.id);else await list.edit(E,item.id,values);check(guard);if(E.lastError)throw Error('L’enregistrement natif n’a pas été confirmé.');}catch(error){if(!snapshot.shared)restoreShopping();throw error;}
  const after=shoppingSnapshot();if(after.scope!==snapshot.scope)throw Error('Le foyer a changé. Vérifiez les courses.');verifyLocal(after);const result=after.items.find(x=>x.id===item.id);
  if(intent.kind==='shopping.remove'?!!result:!result||result.name!==values.name||result.qty!==values.qty||result.unit!==values.unit)throw Error('Le résultat de la modification n’a pas été confirmé. Vérifiez les courses.');
  // Family writers resolve after native IndexedDB putItem; a pending server sync
  // is a durable local result, never a claim that another device received it.
  if(intent.kind==='shopping.remove'){remember('shopping');return {text:'Dobby a retiré « '+item.name+' » des courses.',links:shoppingLinks()};}
  rememberItems(after,[result]);return {text:intent.kind==='shopping.replace'?'Dobby a remplacé « '+item.name+' » par « '+result.name+' » dans les courses.':'Dobby a fixé la quantité de « '+result.name+' » à '+result.qty+(result.unit?' '+result.unit:'')+'.',links:shoppingLinks()};
 }
 function mealReply(offset,state){const day=E.evaluate('return addDays(todayISO(),p.offset);',{offset}),meal=state.planned?.[day+'-soir'],recipe=meal&&meal.status!=='annulé'?C.read().recipes.find(r=>r.id===meal.id):null;return {text:recipe?'Pour le soir du '+day+', Dobby a trouvé au planning : '+recipe.name+'.':'Dobby ne voit aucun repas prévu pour le soir du '+day+'.',links:[recipe?link('Voir la recette','./index.html#recipe?id='+encodeURIComponent(recipe.id)):link('Choisir un repas','./index.html#pick?date='+day)]};}
 async function reply(input){const text=input.trim().replace(/^(?:Dobby[, ]+)?(?:peux[- ]tu|pouvez[- ]vous)\s+/i,'').replace(/[?!]+$/,'').trim(),q=norm(text),state=E.read().state;
  const intent=interpret(text);if(intent?.kind==='clarify'){remember('ambiguous');return clarification();}if(intent)return executeIntent(intent);
  remember('other');
  const add=text.match(/^(?:s['’]il (?:te|vous) pla[iî]t[, ]+)?(?:ajoute[r]?|acheter|mets?|mettre)\s+(.+?)(?:\s+(?:aux courses|[àa] (?:la |ma )?liste (?:de |des )?courses|dans (?:la |ma )?liste (?:de |des )?courses))?[.!]?$/i);
  if(add){const destination=/(?:aux courses|liste (?:de |des )?courses)/i.test(text);if(!destination&&(/^(?:un|une)\s/.test(norm(add[1]))||/\b(?:billets?|abonnements?)\b/.test(norm(add[1]))))return {text:'Souhaitez-vous l’ajouter à la liste de courses ? Écrivez la demande avec cette destination. Aucune modification effectuée.',links:[]};if(!/^acheter\b/i.test(text)&&!destination)return {text:'Dobby a besoin de la destination : précisez « ajoute cet article aux courses ». Aucune modification effectuée.',links:[]};const name=itemName(add[1]);if(/\bet (?:du|de la|des|un|une)\b/i.test(name))return clarification('Précisez un article à la fois pour les courses. Aucune modification effectuée.');if(!validName(name))return unknown();
   // E07.2 keeps an active list independently of its archives. Use its existing
   // adapter rather than the legacy editshop action, which clears shopFinal.
   if(state.shopFinal?.e072||api()?.grocery?.read()?.context){
    const list=window.DobbyCuisineList;if(!list)throw Error('La liste de courses est indisponible. Ouvrez les courses avant de réessayer.');
    const guard=token(),current=list.snapshot(E);
    const matches=current.items.filter(x=>norm(x.name)===norm(name));if(matches.length){rememberItems(current,matches);return {text:'« '+name+' » figure déjà dans les courses. Dobby n’a pas créé de doublon.',links:[link('Voir les courses','./index.html#shop')]};}
    await list.add(E,{name,qty:null,unit:''});check(guard);
    const after=list.snapshot(E),added=after.items.filter(x=>norm(x.name)===norm(name));verifyLocal(after);if(added.length!==1)throw Error('L’article n’a pas été ajouté. Consultez les courses avant de réessayer.');rememberItems(after,added);
    return {text:'Dobby a ajouté « '+name+' » aux courses.',links:[link('Voir les courses','./index.html#shop')]};
   }
   const existing=(state.extras||[]).some(x=>norm(x)===norm(name));if(existing){remember('shopping',[legacyReference(name,state)]);return {text:'« '+name+' » figure déjà dans la préparation des courses. Dobby n’a pas créé de doublon.',links:[link('Voir les courses','./index.html#shop')]};}
   if(state.shopFinal&&!Object.values(state.shopHistory||{}).some(row=>JSON.stringify(row)===JSON.stringify(state.shopFinal)))throw Error('La liste validée n’est pas retrouvée dans l’historique. Ouvrez les courses pour vérifier sa conservation avant tout ajout.');
   nativeWrite(()=>{if(state.shopFinal)C.shop('editshop');C.shop('addextra',{value:name});},['extras','shopFinal']);if(!(E.read().state.extras||[]).some(x=>norm(x)===norm(name))||!(persisted().extras||[]).some(x=>norm(x)===norm(name)))throw Error('L’article n’a pas été ajouté. Consultez la préparation des courses avant de réessayer.');
   remember('shopping',[legacyReference(name,E.read().state)]);
   return {text:'Dobby a ajouté « '+name+' » à la préparation des courses ! Une mission accomplie pour la maisonnée !',links:[link('Voir les courses','./index.html#shop')]};
  }
  const deletion=text.match(/^supprime(?:r)?\s+(?:la\s+)?mission\s+(.+?)[.!]?$/i);
  if(deletion){const matches=(state.manualMissions||[]).filter(r=>norm(r.title)===norm(deletion[1]));if(matches.length!==1)return {text:matches.length?'Plusieurs missions portent ce nom. Ouvrez les missions pour choisir la bonne.':'Dobby ne trouve pas de mission portant exactement ce nom. Aucune suppression effectuée.',links:[link('Voir les missions','./missions.html')]};const row=matches[0];return {text:'La suppression de « '+row.title+' » dans le foyer demande votre confirmation.',links:[],pending:{kind:'mission-delete',record:JSON.stringify(row),id:row.id,title:row.title,identity:token()}};}
  if(/^(?:supprime|modifie|annule|change|cree|enregistre|partage|envoie|reserve|termine)\b/.test(q))return unknown();
  if(/\b(?:medical|sante|urgence|douleur|medicament)\b/.test(q))return {text:'Dobby peut ouvrir le carnet de santé. Il ne fournit pas de diagnostic ni de conseil médical.',links:[link('Carnets de santé','./famille.html#health')]};
  if(/\b(?:repas|mange|diner|ce soir)\b/.test(q)){remember('meal');if(/\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|hier)\b|\d{1,2}[/-]\d/.test(q))return {text:'Dobby peut consulter le repas d’aujourd’hui ou de demain. Pour une autre date, ouvrez le planning.',links:[link('Ouvrir le planning','./index.html#plan')]};return mealReply(q.includes('demain')?1:0,state);}
  if(/\b(?:course|courses|panier)\b/.test(q)){const final=state.shopFinal;if(final&&!Array.isArray(final.items))throw Error('La liste validée est illisible. Ouvrez les courses pour la vérifier.');const snapshot=final?.e072||api()?.grocery?.read()?.context?shoppingSnapshot():null,names=snapshot?snapshot.items.map(r=>r.name):final?final.items.map(r=>r.name):[...C.read().draft.map(r=>r.name),...(state.extras||[])],label=snapshot?.shared?'La liste de courses du foyer':final?'La liste validée':'La préparation des courses';if(snapshot)rememberItems(snapshot,snapshot.items);else remember('shopping',(state.extras||[]).map(name=>legacyReference(name,state)));return {text:names.length?label+' contient '+names.length+' article(s) : '+names.slice(0,8).join(', ')+(names.length>8?'…':'.'):label+' ne contient aucun article.',links:[link('Voir les courses',final?'./index.html#shop-final':'./index.html#shop')]};}
  if(/\b(?:mission|missions|tache|taches|a faire|entretien)\b/.test(q)){const tasks=[...(state.manualMissions||[]).filter(t=>t.status!=='done'),...(state.autoTasks||[]).filter(t=>t.state==='open')];return {text:tasks.length?'Dobby a trouvé '+tasks.length+' mission(s) ouverte(s) : '+tasks.slice(0,5).map(t=>t.title).join(' ; ')+'.':'Dobby ne voit aucune mission ouverte.',links:[link('Voir les missions','./missions.html')]};}
  if(/\b(?:agenda|rendez-vous|evenement|evenements)\b/.test(q)){const events=(E.win().DobbyFamilyAgenda?.upcoming()||[]).filter(e=>['event','medical'].includes(e.kind));return {text:events.length?'Dans l’agenda partagé : '+events.slice(0,4).map(e=>[e.date,e.time,e.title].filter(Boolean).join(' · ')).join(' ; ')+'.':'Aucun événement à venir dans l’agenda partagé. Les fiches individuelles restent dans leur carnet.',links:[link('Ouvrir l’Agenda','./famille.html#agenda')]};}
  for(const [pattern,records,view,label]of [[/\b(?:document|documents|facture|contrat|contrats|garantie)\b/,state.familyDocs||[],'document','Documents'],[/\b(?:equipement|equipements|appareil|appareils|maison)\b/,state.houseItems||[],'equipment','Équipements']])if(pattern.test(q)){const needle=q.replace(/^.*?(?:documents?|facture|contrats?|garantie|equipements?|appareils?|maison)\b/,'').replace(/^(?:\s*(?:de|du|des|sur|pour|le|la))?\s*/,''),found=records.filter(r=>!needle||norm([r.title,r.name,r.provider,r.brand,r.model].join(' ')).includes(needle)).slice(0,5);return {text:found.length?'Dobby a trouvé : '+found.map(r=>r.title||r.name).join(' ; ')+'.':'Dobby n’a trouvé aucune fiche correspondante.',links:found.length?found.map(r=>link(r.title||r.name,'./famille.html#'+view+'?record='+encodeURIComponent(r.id))):[link(label,'./famille.html#'+(view==='document'?'documents':'house'))]};}
  return unknown();
 }
 function execute(pending){check(pending.identity);const row=E.read().state.manualMissions.find(r=>r.id===pending.id);if(!row||JSON.stringify(row)!==pending.record)throw Error('La mission a changé ou a été supprimée. Aucune suppression effectuée.');
  E.evaluate('st.extraPage="";go("missions");');const w=E.win(),original=w.confirm;try{w.confirm=message=>message==='Supprimer définitivement « '+row.title+' » de la liste familiale ?';nativeWrite(()=>E.action('fmsAction','delete',{id:row.id}),['manualMissions']);}finally{w.confirm=original;}
  if(E.read().state.manualMissions.some(r=>r.id===row.id)||(persisted().manualMissions||[]).some(r=>r.id===row.id))throw Error('La mission n’a pas été supprimée.');return {text:'Dobby a supprimé la mission « '+row.title+' » du foyer.',links:[link('Voir les missions','./missions.html')]};
 }
 return Object.freeze({identity,token,check,load,current,append,update,remove,reply,execute,interpret,validateIntent,intentContract});
})();
