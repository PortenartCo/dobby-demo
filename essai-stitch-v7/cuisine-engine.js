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
    evaluate('st.day=p.date;st.slot=p.slot;st.choice="library";st.note=p.note||"";', values);
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
        custom[at]={...custom[at],...checked.recipes[0],id:custom[at].id,fav:custom[at].fav};save();render();return {id:custom[at].id,errors:[]};`, { id: editId, payload: values });
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
    page('batch');
    const input = win().document.getElementById('batchFile'); input.files = files;
    input.dispatchEvent(new (win().Event)('change', { bubbles: true }));
    const started = Date.now();
    while (!evaluate('return batchCandidate!==null;') && Date.now() - started < 4000) await new Promise(resolve => setTimeout(resolve, 30));
    return read().batch;
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
  function exportRecipes() {
    evaluate(`const recipes=[...BASE,...custom].map(r=>({name:r.name,minutes:r.minutes,servings:r.servings,device:r.thermomix?'tm5':'classic',category:r.category,favorite:!!r.fav,
      ingredients:r.ingredients.map(([name,quantity,unit])=>({name,quantity,unit})),steps:r.steps,source:r.source||'',reviewed:r.reviewed===true}));downloadJson('dobby-recettes.json',{format:'dobby-recipes',version:1,recipes});`);
  }
  return Object.freeze({ win, evaluate, page, read, amount, portions, choose, mealAction, favorite, cook, tm5, saveTM, saveRecipe, batch, commitBatch, shop, finalCheck, history, family, familyCheck, exportRecipes });
})();
