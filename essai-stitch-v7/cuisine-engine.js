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
  function read() {
    const data = evaluate('return {state:JSON.parse(JSON.stringify(st)),recipes:JSON.parse(JSON.stringify([...BASE,...custom])),customIds:custom.map(r=>r.id),draft:shoppingDraft(),pending:pendingMeals().length,batch:batchCandidate,detailPortions:st.detail?(Object.values(st.planned).find(m=>m.id===st.detail)?portionCount(Object.values(st.planned).find(m=>m.id===st.detail)):st.people):st.people};');
    for(const recipe of data.recipes){const details=data.state.tmAdaptations?.[recipe.id]?.stepDetails;if(details?.length)recipe.importDetails={...(recipe.importDetails||{}),stepDetails:[...(recipe.importDetails?.stepDetails||[]).filter(d=>d.method!=='tm5'),...details]};}
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
  const portions = (adult, children) => evaluate('return portionCount({adult:p.adult,children:p.children,childFactor:st.childFactor??0.65});', { adult, children });
  function choose(values) {
    const recipe=read().recipes.find(r=>r.id===values.id);if(!recipe||!Number.isFinite(Number(recipe.servings))||Number(recipe.servings)<=0)throw Error('Complétez les portions de référence de cette recette avant de planifier ce repas.');
    evaluate('st.day=p.date;st.slot=p.slot;st.choice="library";st.filter="";st.cat="Toutes";st.favorites=false;st.note=p.note||"";', values);
    page('pick'); field('adults', values.adult); field('children', values.children);
    click('select', { id: values.id });
    return evaluate('return st.page==="plan" && st.planned[st.day+"-"+st.slot]?.id===p.id;', values);
  }
  function mealAction(action, values) {
    evaluate('st.day=p.date;st.slot=p.slot;', values); page('plan');
    if (action === 'status') {
      const prompt = win().prompt;
      try { win().prompt = () => values.status; click('status', { slot: values.slot }); }
      finally { win().prompt = prompt; }
    } else {
      click('move', { slot: values.slot }); field('moveDate', values.destination); click('confirmmove', { slot: values.slot });
    }
  }
  function favorite(id) { page('recipes', id); click('fav', { id }); }
  function cook(id, action) {
    if (evaluate('return st.detail!==p.id||!st.cook;', { id })) { page('recipes', id); click('cook'); }
    if (action) click(action);
  }
  function tm5(id) { evaluate('st.extraPage="";st.page="recipes";st.detail=p.id;st.tmEditor=true;st.tmView=false;st.cook=false;render();', { id }); }
  function saveTM(id, steps, verified) {
    tm5(id);
    steps.forEach((step, i) => ['text','tool','time','temp','speed','reverse'].forEach(key => field('tm' + key[0].toUpperCase() + key.slice(1) + i, step[key])));
    field('tmVerified', verified); click('savetm');
    return evaluate('return st.tmView===true;');
  }
  function saveRecipe(values, editId) {
    const result = evaluate('return validateBatch(JSON.stringify(p));', values);
    if (result.errors.length) return { errors: result.errors };
    if (editId) {
      return evaluate(`const at=custom.findIndex(r=>r.id===p.id);if(at<0)return {errors:['Cette recette intégrée peut être copiée, pas remplacée.']};
        const checked=validateBatch(JSON.stringify(p.payload));if(checked.errors.length)return checked;
        const recipeMissingFields=r=>{const m=[];if(!r.name.trim())m.push('name');if(r.servings==null)m.push('servings');if(r.minutes==null)m.push('minutes');if(!r.ingredients.length)m.push('ingredients');r.ingredients.forEach(([n,q,u],i)=>{if(!n.trim())m.push('ingredients.'+i+'.name');if(q==null)m.push('ingredients.'+i+'.quantity');if(!u.trim())m.push('ingredients.'+i+'.unit');});if(!r.steps.length)m.push('steps');r.steps.forEach((t,i)=>{if(!t.trim())m.push('steps.'+i);});return m;};const previous=custom[at],incoming=p.payload.recipes[0],next=checked.recipes[0];if(incoming.source===undefined)next.source=previous.source||'';if(incoming.reviewed===undefined)next.reviewed=previous.reviewed;custom[at]={...previous,...next,id:previous.id,fav:previous.fav};if(previous.importDetails)custom[at].importDetails={...previous.importDetails,durations:{...previous.importDetails.durations,...(incoming.durations||{}),total:next.minutes},missingFields:recipeMissingFields(next)};save();render();return {id:custom[at].id,errors:[]};`, { id: editId, payload: values });
    }
    // Use the original manual form validation and save action for a new recipe.
    page('import');
    const recipe = result.recipes[0];
    const fields = { importName: recipe.name, importDevice: recipe.thermomix ? 'tm5' : 'classic', importServings: recipe.servings,
      importMinutes: recipe.minutes, importCat: recipe.category, importIngredients: recipe.ingredients.map(([name, qty, unit]) => qty == null ? name : `${qty} ; ${unit} ; ${name}`).join('\n'), importSteps: recipe.steps.join('\n') };
    const previous = evaluate('return custom.length;');
    for (const [id, value] of Object.entries(fields)) field(id, value);
    click('reviewimport');
    return evaluate('return custom.length>p.previous?{id:custom[custom.length-1].id,errors:[]}:{errors:["La recette n’a pas été enregistrée. Vérifiez les champs ou confirmez l’enregistrement."]};', { previous });
  }
  async function batch(files) {
    // Use the native validator and candidate. Normalize its invalid-JSON result
    // for the native view, which assumes warnings is always present.
    evaluate('batchCandidate=null;');page('batch');
    const file=files[0];if(!file)return null;
    if(file.size>2*1024*1024)throw Error('Fichier trop volumineux (2 Mo maximum).');
    return evaluate('batchCandidate=validateBatch(p.text);batchCandidate.warnings ||= [];render();return batchCandidate;', {text:await file.text()});
  }
  function commitBatch(choices) {
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
    evaluate(`const recipes=[...BASE,...custom].filter(r=>!p.id||r.id===p.id).map(r=>{const d=r.importDetails||{};return {id:r.id,importKey:d.key||r.id,name:r.name,minutes:r.minutes??null,servings:r.servings,device:r.thermomix?'tm5':'classic',category:r.category,favorite:!!r.fav,
      ingredients:r.ingredients.map(([name,quantity,unit],i)=>({id:d.ingredientIds?.[i]||'ingredient-'+i,name,quantity,unit})),steps:r.steps,stepDetails:[...(d.stepDetails||[]).filter(s=>s.method!=='tm5'),...(st.tmAdaptations?.[r.id]?.stepDetails||d.stepDetails?.filter(s=>s.method==='tm5')||[])].map(s=>({...s,images:[]})),source:r.source||'',reviewed:r.reviewed===true,durations:{preparation:null,cooking:null,rest:null,...d.durations,total:r.minutes??null},equipment:d.equipment||[],notes:d.notes||[],missing:d.missing||[],uncertain:d.uncertain||[],image:null,images:[],tm5:st.tmAdaptations?.[r.id]||null,mediaNotice:r.localMedia?'Photographies conservées sur cet appareil, non comprises dans cet export JSON.':''};});downloadJson(p.id?'dobby-recette.json':'dobby-recettes.json',{format:'dobby-recipes',version:2,recipes});`,{id});
  }

  return Object.freeze({ win, evaluate, page, read, amount, portions, choose, mealAction, favorite, cook, tm5, saveTM, saveRecipe, batch, commitBatch, shop, finalCheck, history, family, familyCheck, exportRecipes, prepareRecipeImport, commitRecipeImport });
})();
