/* E07.2: adapt native shopFinal/shopHistory and the native family cache.
   No storage key, database, network client or replacement writer. */
window.DobbyCuisineList=(()=>{
  'use strict';
  const norm=s=>String(s||'').trim().toLocaleLowerCase('fr-BE').replace(/\s+/g,' ');
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
    return shared?.context?{
      scope:shared.context,shared:true,status:shared.status,error:shared.error,
      items:shared.items.map(x=>({id:x.id,name:x.title,qty:x.quantity,unit:x.unit,done:x.checked,conflict:x.syncState==='conflict',pending:x.syncState==='pending',category:E.evaluate('return categoryOf(p.name);',{name:x.title})})),localCount:local.items.length
    }:{scope:'local',shared:false,status:'Sur cet appareil',error:'',items:local.items.map(parse),localCount:local.items.length};
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
  async function edit(E,id,values){const x=valid(values),s=snapshot(E);if(s.shared)return family(E).edit(id,{title:x.name,quantity:x.qty,unit:x.unit});
    transaction(E,`const item=st.shopFinal.items.find(x=>x.id===p.id);if(!item)throw Error('Article introuvable');Object.assign(item,p.x,{detail:p.detail,category:categoryOf(p.x.name)});`,{id,x,detail:detail(x)});
  }
  async function check(E,id,done){const s=snapshot(E);if(s.shared)return family(E).edit(id,{checked:done});
    transaction(E,`const item=st.shopFinal.items.find(x=>x.id===p.id);if(!item)throw Error('Article introuvable');item.done=p.done;`,{id,done});
  }
  async function preview(E){
    const s=snapshot(E),receipts=E.evaluate('return [...Object.values(st.shopHistory||{}).flatMap(x=>x.imports||[]),...(st.shopFinal?.imports||[])];');
    const rows=E.evaluate(`const result=[];for(const [key,m]of pendingMeals()){
      const r=getR(m.id);if(!r)continue;const grouped=new Map(),ref=m._e072ImportRef||(key+'|'+m.id);
      for(const [name,q,unit]of r.ingredients){const token=ref+'|'+name.trim().toLocaleLowerCase('fr-BE')+'|'+(unit||'').trim().toLocaleLowerCase('fr-BE');
        const qty=q==null?null:Number(q)*portionCount(m)/r.servings;
        const before=grouped.get(token);if(before)before.qty=before.qty==null||qty==null?null:before.qty+qty;
        else grouped.set(token,{token,key,ref,name,qty,unit:unit||'',origin:key+' · '+r.name,meal:mealSignature(key,m)});
      }result.push(...grouped.values());}return result;`);
    const signature=JSON.stringify(rows.map(({token,name,qty,unit,origin})=>({token,name,qty,unit,origin})));
    if(s.shared)return {scope:s.scope,signature,rows:await family(E).proposeRows(rows,s.scope)};
    const seen=new Map(receipts.filter(x=>x&&typeof x==='object').map(x=>[x.token,x]));
    const proposed=[];
    for(const row of rows){
      const prior=seen.get(row.token);
      if(!prior){proposed.push({...row,targetQty:row.qty});continue;}
      const item=s.items.find(x=>(x.provenance||[]).includes(row.token));
      if(!item||item.done)continue; // Already purchased/archived contributions are not new purchases.
      if(norm(item.unit)!==norm(row.unit))throw Error('L’unité d’un apport a été modifiée. Ajustez cet article manuellement.');
      if(prior.qty!=null&&row.qty!=null&&row.qty>prior.qty)proposed.push({...row,targetQty:row.qty,qty:row.qty-prior.qty,previousQty:prior.qty,mode:'delta'});
    }
    return {scope:s.scope,signature,rows:proposed};
  }
  async function confirmImport(E,proposal){
    const current=await preview(E);
    if(proposal.scope!==current.scope||proposal.signature!==current.signature)throw Error('Les menus ou le foyer ont changé. Ouvrez un nouveau récapitulatif.');
    const selected=new Map(proposal.rows.map(x=>[x.token,x])),rows=current.rows.filter(x=>selected.has(x.token));
    for(const row of rows){const approved=selected.get(row.token);for(const key of ['qty','previousQty','targetQty','expected'])if(JSON.stringify(row[key])!==JSON.stringify(approved[key]))throw Error('Un apport a changé. Ouvrez un nouveau récapitulatif.');}
    if(!rows.length)return 0;
    const tag=`for(const row of p.rows)if(st.planned[row.key])st.planned[row.key]._e072ImportRef=row.ref;`;
    if(current.scope!=='local'){
      transaction(E,tag,{rows});
      return family(E).importRows(rows,current.scope);
    }
    transaction(E,tag+`const list=st.shopFinal;for(const row of p.rows){
      const found=list.items.find(x=>(x.provenance||[]).includes(row.token))||list.items.find(x=>!x.done&&x.qty!=null&&row.qty!=null&&x.name.trim().toLocaleLowerCase('fr-BE')===row.name.trim().toLocaleLowerCase('fr-BE')&&(x.unit||'').trim().toLocaleLowerCase('fr-BE')===row.unit.trim().toLocaleLowerCase('fr-BE'));
      if(found){found.qty=Number(found.qty)+row.qty;found.detail=fmt(found.qty)+(found.unit?' '+found.unit:'');if(!(found.provenance||[]).includes(row.token))(found.provenance ||= []).push(row.token);}
      else list.items.push({...row,id:crypto.randomUUID(),detail:row.qty==null?'À préciser':fmt(row.qty)+(row.unit?' '+row.unit:''),category:categoryOf(row.name),done:false,provenance:[row.token]});
      const receipt={token:row.token,qty:row.targetQty};const at=list.imports.findIndex(x=>x?.token===row.token);if(at<0)list.imports.push(receipt);else list.imports[at]=receipt;
    }`,{rows});
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
  async function archive(E){
    const s=snapshot(E),done=s.items.filter(x=>x.done&&!x.conflict);if(!done.length)return;
    const id='e072-'+crypto.randomUUID(),stamp=new Date().toISOString();
    // Snapshot first. Pending deletes can be retried by the native family queue.
    transaction(E,`st.shopHistory[p.id]={items:p.items.map(x=>({...x,detail:x.qty==null?'À préciser':fmt(x.qty)+(x.unit?' '+x.unit:''),done:true})),validatedAt:p.stamp,meals:[],scope:p.scope,imports:[...(st.shopFinal.imports||[])]};
      if(p.scope==='local')st.shopFinal.items=st.shopFinal.items.filter(x=>!p.ids.includes(x.id));`,{id,stamp,items:done,ids:done.map(x=>x.id),scope:s.scope});
    if(s.shared)for(const item of done)await family(E).edit(item.id,{deleted_at:stamp});
  }
  return Object.freeze({snapshot,add,edit,check,preview,confirmImport,transfer,archive,reuse,detail});
})();
