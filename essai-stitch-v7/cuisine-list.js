/* E07.2: adapt native shopFinal/shopHistory and the native family cache.
   No storage key, database, network client or replacement writer. */
window.DobbyCuisineList=(()=>{
  'use strict';
  const norm=s=>String(s||'').trim().toLocaleLowerCase('fr-BE').replace(/\s+/g,' ');
  // Only exact product names and explicit compatible units are grouped.
  const units={g:['g',1],kg:['g',1000],mg:['g',.001],ml:['ml',1],cl:['ml',10],dl:['ml',100],l:['ml',1000]};
  const measure=x=>{const [unit,factor]=units[norm(x.unit)]||[norm(x.unit),1];return {unit,qty:x.qty==null?null:Number(x.qty)*factor};};
  const keyOf=x=>JSON.stringify([norm(x.name),measure(x).unit]);
  const precise=n=>Math.round(n*1e9)/1e9;
  const homeKey=x=>x.groupKey||JSON.stringify((x.ids||[x.id]).slice().sort());
  function decorate(items,annotations){return items.map(x=>{const note=annotations?.[homeKey(x)],current=!note?.ids||note.ids.some(id=>(x.ids||[x.id]).includes(id)),atHomeQty=current?Math.min(x.qty??0,Number(note?.qty??note??0)):0;return {...x,requiredQty:x.qty,atHomeQty,qty:x.qty==null?null:precise(Math.max(0,x.qty-atHomeQty))};});}
  const adjustHome=`for(const entries of Object.values(st.shopFinal.homeByScope||{})){const note=entries[p.homeKey];if(note){if(p.factor==null)delete entries[p.homeKey];else if(typeof note==='object')note.qty*=p.factor;else entries[p.homeKey]*=p.factor;}}`;
  const clearSession=`for(const item of p.items){if(!p.preserveLegacy)for(const entries of Object.values(st.shopFinal.homeByScope||{}))delete entries[item.homeKey];if(st.shopFinal.manualCoverage)delete st.shopFinal.manualCoverage[item.productKey];for(const origins of Object.values(st.shopFinal.sharedOrigins||{}))delete origins[item.productKey];}`;
  function sharedItems(E,items){
    const groups=new Map();
    for(const raw of items){const x={id:raw.id,name:raw.title,qty:raw.quantity,unit:raw.unit,done:raw.checked,conflict:raw.syncState==='conflict',pending:raw.syncState==='pending',atHomeQty:Number(raw.at_home_quantity??0),sources:[{...raw}],category:E.evaluate('return categoryOf(p.name);',{name:raw.title})};
      const m=measure(x),key=x.qty==null||x.conflict?x.id:keyOf(x)+'|'+x.done;
      const before=groups.get(key);if(before){before.qty=precise(before.qty+m.qty);before.atHomeQty=precise(before.atHomeQty+measure({qty:x.atHomeQty,unit:x.unit}).qty);before.ids.push(x.id);before.sources.push(...x.sources);before.pending ||= x.pending;}
      else groups.set(key,{...x,qty:m.qty,atHomeQty:measure({qty:x.atHomeQty,unit:x.unit}).qty,unit:m.unit,ids:[x.id],groupKey:'shared|'+keyOf(x)});
    }return [...groups.values()].map(x=>({...x,requiredQty:x.qty,qty:x.qty==null?null:precise(Math.max(0,x.qty-x.atHomeQty))}));
  }
  const parse=item=>{
    const match=/^([\d\s.,]+)\s+(.*)$/.exec(item.detail||'');
    return {...item,qty:item.qty!==undefined?item.qty:match?Number(match[1].replace(/\s/g,'').replace(',','.')):null,unit:item.unit!==undefined?item.unit:match?match[2]:''};
  };
  function transaction(E,code,values={}) {
    return E.evaluate(`const before=JSON.stringify(st);try{${code};save();render();return true;}catch(error){st=JSON.parse(before);throw error;}`,values);
  }
  function ensure(E) {
    const s=E.read().state;
    if(s.shopFinal?.e072&&!(s.extras||[]).length)return;
    transaction(E,`let list=st.shopFinal?JSON.parse(JSON.stringify(st.shopFinal)):{items:[],meals:[],validatedAt:new Date().toISOString()};
      list.id ||= crypto.randomUUID();list.meals ||= [];list.imports ||= [];list.e072=true;
      for(const item of list.items)item.id ||= crypto.randomUUID();
      for(const name of st.extras||[])list.items.push({id:crypto.randomUUID(),name,detail:'À préciser',qty:null,unit:'',category:categoryOf(name),done:false,origin:'Ajout manuel'});
      st.shopFinal=list;st.extras=[];`);
  }
  function family(E){return E.win().DobbyFamilyUI?.grocery;}
  function snapshot(E) {
    ensure(E);
    const local=E.read().state.shopFinal,shared=family(E)?.read();
    const scope=shared?.context||'local',annotations=local.homeByScope?.[scope]||{};
    return shared?.context?{
      scope,shared:true,status:shared.status,error:shared.error,homeSupported:shared.homeSupported,legacyHomeCount:Object.keys(annotations).length,
      items:sharedItems(E,shared.items).map(x=>({...x,origin:local.sharedOrigins?.[scope]?.[keyOf(x)]||''})),localCount:local.items.length
    }:{scope,shared:false,status:'Sur cet appareil',error:'',items:decorate(local.items.map(parse),annotations),localCount:local.items.length};
  }

  function valid(values){
    const name=String(values.name||'').trim(),raw=values.qty,qty=raw==null||raw===''?null:Number(String(raw).replace(',','.'));
    if(!name||name.length>200)throw Error('Nom requis (200 caractères maximum).');
    if(qty!==null&&(!Number.isFinite(qty)||qty<0||qty>999999))throw Error('Quantité invalide.');
    return {name,qty,unit:String(values.unit||'').trim().slice(0,40)};
  }
  const detail=x=>x.qty==null?'À préciser':Number(x.qty).toLocaleString('fr-BE',{maximumFractionDigits:2})+(x.unit?' '+x.unit:'');
  async function add(E,values){const x=valid(values),s=snapshot(E);if(s.shared)return family(E).add({title:x.name,quantity:x.qty,unit:x.unit});
    transaction(E,`st.shopFinal.items.push({...p,id:crypto.randomUUID(),category:categoryOf(p.name),done:false,origin:'Ajout manuel'});`,{...x,detail:detail(x)});
  }
  // A preparation's stable source token is a receipt, never a product-name match.
  // Local receipts travel with E07 archives; shared receipts use the native queue.
  async function addOnce(E,values,token){
    if(typeof token!=='string'||!token||token.length>500||/[\x00-\x1f]/.test(token))throw Error('Référence de préparation invalide.');
    if(String(values.unit||'').trim().length>40)throw Error('Unité trop longue (40 caractères maximum).');
    const x=valid(values),api=E.win().DobbyFamilyUI,grocery=api?.grocery,read=grocery?.read();
    if(read?.ready===false)throw Error('Les courses sont en cours d’initialisation.');
    if(api?.getContext?.()&&!read?.context)throw Error('La liste de courses du foyer est indisponible.');
    const scope=read?.context||'local',identity=()=>{const a=E.win().DobbyFamilyUI,c=a?.connectionState?.();return JSON.stringify({scope:a?.grocery?.read().context||'local',epoch:c?.epoch??null,userId:c?.userId??null,householdId:c?.householdId??null});},guard=identity();
    if(scope!=='local'){
      if(x.qty!=null&&Math.abs(x.qty-Math.round(x.qty*100)/100)>1e-9)throw Error('La précision des courses partagées est limitée à deux décimales.');
      const result=await grocery.importRows([{...x,token,done:false}],scope,{receipt:true});
      if(identity()!==guard)throw Error('Le compte ou le foyer a changé. Vérifiez les courses avant de réessayer.');
      const row=result?.receipts?.[0];
      if(result?.scope!==scope||result.receipts.length!==1||row?.token!==token||typeof row.id!=='string'||!row.id)throw Error('L’enregistrement natif des courses n’a pas été confirmé.');
      return {scope,id:row.id,token,shared:true,pending:row.syncState==='pending',conflict:row.syncState==='conflict',archived:Boolean(row.deleted_at),checked:Boolean(row.checked)};
    }
    return E.evaluate(`const before={state:JSON.parse(JSON.stringify(st)),raw:localStorage.getItem(key)};
      try{
        let changed=!st.shopFinal?.e072||Boolean((st.extras||[]).length);
        const list=st.shopFinal||={items:[],meals:[],validatedAt:new Date().toISOString()};list.id||=crypto.randomUUID();list.meals||=[];list.imports||=[];list.e072=true;
        for(const item of list.items)item.id||=crypto.randomUUID();
        for(const name of st.extras||[])list.items.push({id:crypto.randomUUID(),name,detail:'À préciser',qty:null,unit:'',category:categoryOf(name),done:false,origin:'Ajout manuel'});st.extras=[];
        const receipts=[...list.imports,...Object.values(st.shopHistory||{}).flatMap(x=>x.imports||[])],prior=receipts.find(x=>x?.token===p.token),id=prior?.id||('prep-'+encodeURIComponent(p.token));
        if(!prior){list.items.push({...p.x,id,detail:p.detail,category:categoryOf(p.x.name),done:false,origin:'Préparation',provenance:[p.token]});list.imports.push({token:p.token,id,qty:p.x.qty,unit:p.x.unit,kind:'preparation'});changed=true;}
        if(changed){save();render();}
        const stored=JSON.parse(localStorage.getItem(key)||'{}'),durable=[...(stored.shopFinal?.imports||[]),...Object.values(stored.shopHistory||{}).flatMap(x=>x.imports||[])].some(x=>x?.token===p.token&&x.id===id);
        if(!durable)throw Error('L’enregistrement natif des courses n’a pas été confirmé.');
        const item=list.items.find(x=>x.id===id),archived=Object.values(st.shopHistory||{}).flatMap(x=>x.items||[]).find(x=>x.id===id);
        return {scope:'local',id,token:p.token,shared:false,pending:false,conflict:false,archived:Boolean(prior&&!item),checked:Boolean(item?.done||archived?.done)};
      }catch(error){st=before.state;let restored=false;try{if(before.raw===null)localStorage.removeItem(key);else localStorage.setItem(key,before.raw);restored=localStorage.getItem(key)===before.raw;}catch{}if(!restored)throw Error('La restauration des courses n’a pas pu être confirmée. Rechargez avant de réessayer.');throw error;}`,{x,token,detail:detail(x)});
  }
  function assertExpected(item,expected){if(expected&&JSON.stringify(expected.sources)!==JSON.stringify(item.sources))throw Error('L’article a changé. Ouvrez un nouveau récapitulatif.');}
  async function edit(E,id,values,expected){const x=valid(values),s=snapshot(E),item=s.items.find(x=>x.id===id);if(!item)throw Error('Article introuvable');
    const compatible=norm(item.name)===norm(x.name)&&measure(item).unit===measure(x).unit,factor=compatible?measure({qty:1,unit:item.unit}).qty/measure({qty:1,unit:x.unit}).qty:null;
    if(s.shared){assertExpected(item,expected);const total=measure(x);await family(E).editGroup(item.sources.map((source,i)=>({id:source.id,expected:source,values:{title:x.name,quantity:i===0?total.qty:0,unit:total.unit,...(s.homeSupported===true?{at_home_quantity:i===0&&compatible?Math.min(total.qty??0,item.atHomeQty):0}:{})}})),s.scope);return;}

    transaction(E,adjustHome+`const item=st.shopFinal.items.find(x=>x.id===p.id);if(!item)throw Error('Article introuvable');Object.assign(item,p.x,{detail:p.detail,category:categoryOf(p.x.name)});delete item.manualQty;`,{id,x,detail:detail(x),homeKey:homeKey(item),factor});
  }
  async function home(E,id,quantity,expected){const s=snapshot(E),item=s.items.find(x=>x.id===id);if(!item||item.done||item.conflict)throw Error('Article indisponible.');
    const qty=Number(String(quantity).replace(',','.'));if(item.requiredQty==null||!Number.isFinite(qty)||qty<0||qty>item.requiredQty)throw Error('Indiquez une quantité disponible entre 0 et '+(item.requiredQty??'la quantité requise')+'.');
    if(s.shared){
      if(s.homeSupported!==true)throw Error('Disponibilité partagée indisponible : migration at_home_quantity requise ou vérification en attente.');
      assertExpected(item,expected);
      let remaining=qty;const changes=[...item.sources].sort((a,b)=>a.id.localeCompare(b.id)).map(source=>{const m=measure({qty:source.quantity,unit:source.unit}),part=Math.min(remaining,m.qty??0);remaining=precise(remaining-part);return {id:source.id,expected:source,values:{at_home_quantity:precise(part/measure({qty:1,unit:source.unit}).qty)}};});
      return family(E).editGroup(changes,s.scope);
    }
    transaction(E,`const scopes=st.shopFinal.homeByScope ||= {};const entries=scopes[p.scope] ||= {};if(p.qty)entries[p.key]={qty:p.qty,ids:p.ids};else delete entries[p.key];`,{scope:s.scope,key:homeKey(item),qty,ids:item.ids||[item.id]});
  }
  async function remove(E,id,expected){const s=snapshot(E),item=s.items.find(x=>x.id===id);if(!item)throw Error('Article introuvable');
    if(s.shared)assertExpected(item,expected);
    if(s.shared)await family(E).editGroup(item.sources.map(source=>({id:source.id,expected:source,values:{deleted_at:new Date().toISOString(),...(s.homeSupported===true?{at_home_quantity:0}:{})}})),s.scope);
    transaction(E,clearSession+(s.shared?'':'st.shopFinal.items=st.shopFinal.items.filter(x=>x.id!==p.id);'),{id,preserveLegacy:s.shared,items:[{homeKey:homeKey(item),productKey:keyOf(item)}]});
  }
  async function check(E,id,done){const s=snapshot(E),item=s.items.find(x=>x.id===id);if(!item)throw Error('Article introuvable');if(done&&item.qty===0)throw Error('Cet article est déjà disponible à la maison.');
    if(s.shared){await family(E).editGroup(item.sources.map(source=>({id:source.id,expected:source,values:{checked:done}})),s.scope);return;}
    transaction(E,`const item=st.shopFinal.items.find(x=>x.id===p.id);if(!item)throw Error('Article introuvable');item.done=p.done;`,{id,done});
  }
  function importRange(E,range){
    const today=E.evaluate('return todayISO();'),start=range?.start??today,end=range?.end??E.evaluate('return addDays(p.start,6);',{start});
    const date=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00');return !Number.isNaN(d.getTime())&&[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')===value;};
    if(!date(start)||!date(end))throw Error('Choisissez des dates de début et de fin valides.');
    if(end<start)throw Error('La date de fin doit suivre ou correspondre à la date de début.');
    return {start,end};
  }
  async function preview(E,range){
    range=importRange(E,range);
    const s=snapshot(E),receipts=E.evaluate('return [...Object.values(st.shopHistory||{}).flatMap(x=>x.imports||[]),...(st.shopFinal?.imports||[])];');
    const rows=E.evaluate(`const result=[];for(const [key,m]of pendingMeals()){
      const date=key.slice(0,10);if(!/^\\d{4}-\\d{2}-\\d{2}-(midi|soir)(-dessert)?$/.test(key))continue;
      const r=m._dessertRecipeSnapshot||getR(m.id);if(!r)continue;const grouped=new Map(),ref=m._e072ImportRef||m.dessertIngredientRef||(key+'|'+m.id);
      for(const [name,q,unit]of r.ingredients){const token=ref+'|'+name.trim().toLocaleLowerCase('fr-BE')+'|'+(unit||'').trim().toLocaleLowerCase('fr-BE');
        const qty=q==null||!Number.isFinite(Number(r.servings))||Number(r.servings)<=0?null:Number(q)*portionCount(m)/r.servings;
        const before=grouped.get(token);if(before)before.qty=before.qty==null||qty==null?null:before.qty+qty;
        else grouped.set(token,{token,key,ref,name,qty,unit:unit||'',origin:key+' · '+(key.endsWith('-dessert')?'Dessert · ':'')+r.name,meal:mealSignature(key,m),...(m._dessertPreparationId?{preparationId:m._dessertPreparationId,serviceKeys:m._dessertServices}:{})});
      }result.push(...grouped.values());}return result;`,range);
    // Normalize quantities without changing provenance tokens from E07.2.
    for(const row of rows){const m=measure(row);row.originalUnit=row.unit;row.qty=m.qty;row.unit=m.unit;}
    const inRange=row=>(row.serviceKeys||[row.key]).some(key=>key.slice(0,10)>=range.start&&key.slice(0,10)<=range.end);
    let proposed;
    if(s.shared){
      // Allocate manual coverage over the complete source set before asking the
      // native deterministic-id facade about deltas. Repeating it is stable.
      const manual=new Map();for(const item of s.items){if(item.done||item.requiredQty==null)continue;const raw=family(E).read().items.filter(x=>(item.ids||[item.id]).includes(x.id)&&!x.import_source_id);for(const x of raw){const k=keyOf({name:x.title,unit:x.unit}),q=measure({qty:x.quantity,unit:x.unit}).qty;if(q!=null)manual.set(k,(manual.get(k)||0)+q);}}
      for(const row of [...rows].sort((a,b)=>a.token.localeCompare(b.token))){const key=keyOf(row),available=manual.get(key)||0,covered=row.qty==null?0:Math.min(row.qty,available);manual.set(key,available-covered);row.sourceQty=row.qty;row.qty=row.qty==null?null:precise(row.qty-covered);}
      proposed=await family(E).proposeRows(rows,s.scope);
      if(proposed.some(x=>!inRange(x)&&x.mode==='update')&&proposed.some(inRange))throw Error('La répartition des articles déjà présents a changé. Élargissez la période à tous les repas concernés.');
      proposed=proposed.filter(inRange);
    }else{
      const seen=new Map(receipts.filter(x=>x&&typeof x==='object').map(x=>[x.token,x]));proposed=[];
      for(const row of rows.filter(inRange)){const prior=seen.get(row.token);
        if(!prior){proposed.push({...row,targetQty:row.qty});continue;}
        const item=s.items.find(x=>(x.provenance||[]).includes(row.token));if(!item||item.done)continue;
        if(measure(item).unit!==measure(row).unit)throw Error('L’unité d’un apport a été modifiée. Ajustez cet article manuellement.');
        const priorQty=measure({qty:prior.qty,unit:prior.unit??row.originalUnit}).qty;
        if(priorQty!=null&&row.qty!=null&&row.qty>priorQty)proposed.push({...row,targetQty:row.qty,qty:precise(row.qty-priorQty),previousQty:priorQty,mode:'delta'});
      }
    }
    const groups=new Map();for(const row of proposed){const quantity=measure(row).qty,change=row.mode==='update'&&quantity!=null?precise(quantity-measure({qty:row.previousQty,unit:row.unit}).qty):quantity;const key=row.qty==null?row.token:keyOf(row);let group=groups.get(key);if(!group){group={token:'group|'+key,name:row.name,qty:0,unit:measure(row).unit,contributions:[],origins:[]};groups.set(key,group);}group.qty=group.qty==null||row.qty==null?null:precise(group.qty+change);group.contributions.push(row);if(!group.origins.includes(row.origin))group.origins.push(row.origin);}
    for(const group of groups.values()){
      group.origin=group.origins.join(' ; ');const matches=s.items.filter(x=>!x.done&&!x.conflict&&x.requiredQty!=null&&group.qty!=null&&keyOf(x)===keyOf(group));
      group.existingQty=matches.reduce((n,x)=>n+measure({qty:x.requiredQty,unit:x.unit}).qty,0);
      const manualTotal=matches.reduce((n,x)=>{const manual=x.manualQty??((x.provenance||[]).length?0:x.requiredQty);return n+measure({qty:manual,unit:x.unit}).qty;},0),consumed=E.read().state.shopFinal.manualCoverage?.[keyOf(group)]??matches.reduce((n,x)=>n+(x.coveredQty||0),0);
      const coverage=s.shared?0:Math.max(0,manualTotal-consumed);
      group.coveredQty=group.qty==null?0:Math.max(0,Math.min(group.qty,coverage));if(group.qty!=null)group.qty=precise(group.qty-group.coveredQty);
      group.atHomeQty=matches.reduce((n,x)=>n+measure({qty:x.atHomeQty,unit:x.unit}).qty,0);
      group.toBuyQty=group.qty==null?null:precise(Math.max(0,group.existingQty+group.qty-group.atHomeQty));
    }
    const signature=JSON.stringify({range,rows:rows.filter(inRange).map(({token,name,qty,unit,origin})=>({token,name,qty,unit,origin}))});
    return {scope:s.scope,range,signature,rows:[...groups.values()]};
  }
  async function confirmImport(E,proposal){
    const current=await preview(E,proposal.range);
    if(proposal.scope!==current.scope||proposal.signature!==current.signature)throw Error('Les menus ou le foyer ont changé. Ouvrez un nouveau récapitulatif.');
    const selected=new Map(proposal.rows.map(x=>[x.token,x])),groups=current.rows.filter(x=>selected.has(x.token));
    for(const group of groups)if(JSON.stringify(group)!==JSON.stringify(selected.get(group.token)))throw Error('Les articles ou un apport ont changé. Ouvrez un nouveau récapitulatif.');
    if(!groups.length)return 0;const rows=groups.flatMap(x=>x.contributions);
    const tag=`for(const row of p.rows){if(st.planned[row.key])st.planned[row.key]._e072ImportRef=row.ref;if(row.preparationId){const batch=st.planned.__dobbyDessertPreparationsV1?.batches?.[row.preparationId];if(!batch)throw Error('La préparation dessert a changé.');batch.imported=true;}}`;
    if(current.scope!=='local'){const result=await family(E).importRows(rows,current.scope);transaction(E,tag+`const scopes=st.shopFinal.sharedOrigins ||= {};const origins=scopes[p.scope] ||= {};for(const item of p.origins)origins[item.key]=[...new Set([origins[item.key],item.origin].filter(Boolean))].join(' ; ');`,{rows,scope:current.scope,origins:groups.map(x=>({key:keyOf(x),origin:x.origin}))});return result;}
    // Prepare one update per compatible product, using the native transaction.
    const items=E.read().state.shopFinal.items.map(parse),updates=[];
    for(const group of groups){const found=group.qty==null?null:items.find(x=>!x.done&&x.qty!=null&&keyOf(x)===keyOf(group));
      const id=found?.id||crypto.randomUUID(),qty=group.qty==null?null:precise((found?measure(found).qty:0)+group.qty);
      updates.push({homeFactor:found?measure({qty:1,unit:found.unit}).qty:1,coverageKey:keyOf(group),newCoverage:group.coveredQty,id,name:found?.name||group.name,qty,unit:group.unit,detail:detail({qty,unit:group.unit}),manualQty:found?(found.manualQty??((found.provenance||[]).length?0:measure(found).qty)):0,coveredQty:(found?.coveredQty||0)+group.coveredQty,origin:[found?.origin,...group.origins].filter(Boolean).join(' ; '),provenance:[...new Set([...(found?.provenance||[]),...group.contributions.map(x=>x.token)])]});
    }
    transaction(E,tag+`const list=st.shopFinal;for(const update of p.updates){const {homeFactor,coverageKey,newCoverage,...fields}=update;list.manualCoverage ||= {};list.manualCoverage[coverageKey]=(list.manualCoverage[coverageKey]||0)+newCoverage;if(homeFactor!==1)for(const entries of Object.values(list.homeByScope||{})){const key=JSON.stringify([update.id]);if(entries[key]){if(typeof entries[key]==='object')entries[key].qty*=homeFactor;else entries[key]*=homeFactor;}}const found=list.items.find(x=>x.id===update.id);if(found)Object.assign(found,fields);else list.items.push({...fields,category:categoryOf(update.name),done:false});}
      for(const row of p.rows){const receipt={token:row.token,qty:row.targetQty,unit:row.unit};const at=list.imports.findIndex(x=>x?.token===row.token);if(at<0)list.imports.push(receipt);else list.imports[at]=receipt;}`,{rows,updates});
    return rows.length;
  }
  async function transfer(E){const s=snapshot(E);if(!s.shared)throw Error('Foyer indisponible.');
    const local=E.read().state.shopFinal;
    return family(E).importRows(local.items.map(parse).map(x=>({...x,token:'local|'+local.id+'|'+x.id})),s.scope);
  }
  async function reuse(E,id){
    const state=snapshot(E),entry=E.read().state.shopHistory[id];if(!entry)throw Error('Archive introuvable.');
    const session=crypto.randomUUID(),rows=entry.items.map(parse).map((x,i)=>({...x,done:false,token:'archive|'+id+'|'+session+'|'+(x.id||i)}));
    if(state.shared)return family(E).importRows(rows,state.scope);
    transaction(E,`for(const row of p.rows){if(st.shopFinal.imports.includes(row.token))continue;st.shopFinal.items.push({...row,id:crypto.randomUUID(),done:false});st.shopFinal.imports.push(row.token);}`,{rows});
  }
  async function archive(E,ids,expectedItems){
    const s=snapshot(E),done=s.items.filter(x=>x.done&&!x.conflict&&(!ids||ids.includes(x.id)));if(!done.length)return 0;
    if(s.shared&&expectedItems)for(const item of done)assertExpected(item,expectedItems.find(x=>x.id===item.id));
    const id='e072-'+crypto.randomUUID(),stamp=new Date().toISOString();
    // Snapshot first. Pending deletes can be retried by the native family queue.
    transaction(E,`st.shopHistory[p.id]={items:p.items.map(x=>({...x,detail:x.qty==null?'À préciser':fmt(x.qty)+(x.unit?' '+x.unit:''),done:true})),validatedAt:p.stamp,meals:[],scope:p.scope,imports:[...(st.shopFinal.imports||[])]};
      if(p.scope==='local')st.shopFinal.items=st.shopFinal.items.filter(x=>!p.ids.includes(x.id));`,{id,stamp,items:done,ids:done.map(x=>x.id),scope:s.scope});
    if(s.shared)await family(E).editGroup(done.flatMap(item=>item.sources.map(source=>({id:source.id,expected:source,values:{deleted_at:stamp,...(s.homeSupported===true?{at_home_quantity:0}:{})}}))),s.scope);
    transaction(E,clearSession,{preserveLegacy:s.shared,items:done.map(x=>({homeKey:homeKey(x),productKey:keyOf(x)}))});
    return done.length;
  }
  return Object.freeze({snapshot,add,addOnce,edit,remove,check,home,preview,confirmImport,transfer,archive,reuse,detail});
})();
