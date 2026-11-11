/* Source-backed Cuisine UI. Each screen starts from its own original Stitch DOM. */
window.DobbyCuisine = (() => {
  'use strict';
  const E = window.DobbyCuisineEngine;
  const routes = ['taverne','pick','recipes','recipe','cook','tm5','recipe-add','recipe-add-1','recipe-entry','recipe-ai','batch','shop','shop-1','shop-final','shop-history'];
  const cache = new Map();
  const ui = { view: 'taverne', recipe: null, selected: null, slot: 'soir', filter: 'all', query: '', ingredients: new Set(), step: 0, timer: 0 };
  let ready = false, busy = false, revision = 0, legacy, pristine, timerId;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const text = (el, value) => { if (el) el.textContent = value ?? ''; };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[ch]);
  const icon = name => `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
  const button = (action, label, attributes = '') => `<button type="button" class="cu-button" data-cu-action="${action}" ${attributes}>${label}</button>`;
  function bind(el, action, values = {}) {
    if (!el) return;
    el.dataset.cuAction = action;
    for (const [key, value] of Object.entries(values)) el.dataset[key] = value;
  }
  const labelButton = (part, action) => { const el = $$('main button,main a').find(el => el.textContent.toLocaleLowerCase('fr').includes(part.toLocaleLowerCase('fr'))); bind(el, action); return el; };
  const heading = part => $$('main h1,main h2,main h3,main h4').find(el => el.textContent.includes(part));
  const empty = message => { const el = document.createElement('p'); el.className = 'dv7-empty'; el.textContent = message; return el; };
  const input = (id, label, type = 'text', value = '', extra = '') => `<label class="cu-field">${label}<input id="${id}" type="${type}" ${type==='number'?'step="any" min="0" max="999999"':''} value="${esc(value)}" ${extra}></label>`;
  function notice(message, error = false) {
    let el = $('#cu-notice');
    if (!el) { el = document.createElement('div'); el.id = 'cu-notice'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = message;
    const close=document.createElement('button');close.type='button';close.textContent='Fermer';close.dataset.cuAction='dismiss';close.className='cu-button';el.append(close);
    el.dataset.error = String(error); el.hidden = false;
  }
  async function template(view) {
    if (!cache.has(view)) {
      const sourceView=({'recipe-entry':'recipe-add','recipe-ai':'batch'})[view]||view;
      const url = new URL('./templates/' + sourceView + '.html', location.href);
      const response = await fetch(url); if (!response.ok) throw Error('Maquette Cuisine indisponible : ' + view);
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      for (const image of doc.querySelectorAll('img[src]')) image.src = new URL(image.getAttribute('src'), url).href;
      cleanDemo(doc);
      cache.set(view, doc);
    }
    return cache.get(view);
  }
  function clone(selector) { return pristine.querySelector(selector)?.cloneNode(true); }
  function replaceChildren(el, rows) { if (el) el.replaceChildren(...rows); }
  function markSource(el, selector) { if (el) el.dataset.stitchComponent = selector; return el; }
  function cleanDemo(root) {
    for(const el of root.querySelectorAll('main *'))for(const node of [...el.childNodes])if(node.nodeType===3){
      if(/chiffr|crypt|uniquement sur cet appareil|exclusivement sur cet appareil|exclusivement en local|sur iPhone|sur le stockage local de l.iPhone|ne quittent jamais|zéro fuite|aucun transfert|conservation locale garantie|point de restauration automatique/i.test(node.textContent))node.textContent='Données DOBBY · partage selon les modules activés';
      else if(/potimarron|butternut|châtaignes|Isigny|morilles|noisettes|Risotto|Fondant au chocolat|Tarte rustique/i.test(node.textContent))node.textContent='Données du grimoire à renseigner';
    }
    // Only original demo leaves are scrubbed, before injecting any household data.
    for (const el of root.querySelectorAll('main *')) {
      if (el.children.length || el.matches('style,script,textarea')) continue;
      const value = el.textContent.trim().replace(/\s+/g,' ');
      el.dataset.stitchText=value;
      if (/AES.?256|hermétique|chiffr|crypt|Étalonnage Officiel|certifi|souverain|zéro cloud|aucun cloud|stockage local iPhone|privées, scellées|seule garde de votre appareil|conservation locale garantie|exclusivement sur cet appareil|0\.75|0,75|100% local|uniquement sur cet appareil|exclusivement en local|Aucun transfert vers|point de restauration automatique|AES.?256|exclusivement sur cet appareil/i.test(value)) text(el, 'Données DOBBY · partage selon les modules activés');
      else if (/potimarron|butternut|châtaignes|Isigny|morilles|noisettes|Risotto|Fondant au chocolat|Tarte rustique|recettes_famille_automne/i.test(value)) text(el,'Données du grimoire à renseigner');
      else if (/\d/.test(value) && !/^Rituel des Étapes TM5$/.test(value) && !el.matches('.material-symbols-outlined,button,code') && !el.closest('button')) text(el, '—');
    }
  }
  function scrub() {
    for (const el of $$('main input,main textarea')) {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
      else if (el.type !== 'file') el.value = '';
    }
    for (const id of ['toast','toast-notification','modal-schema']) { const el = $('#' + id); if (el) el.hidden = true; }
  }
  function shell() {
    const currentRecipe=E.read().recipes.find(r=>r.id===ui.recipe);
    if(ui.view==='cook')for(const leaf of $$('header *'))if(!leaf.children.length&&/Mode Fourneaux/.test(leaf.textContent))text(leaf,`Mode cuisine · Étape ${(E.read().state.cookStep||0)+1}/${currentRecipe?.steps.length||0}`);
    for(const leaf of $$('header *'))if(!leaf.children.length&&/potimarron|butternut|châtaigne/i.test(leaf.textContent))text(leaf,currentRecipe?.name||'Cuisine DOBBY');
    for (const h of $$('header h1')) { const span = document.createElement('span'); span.className = h.className; span.textContent = h.textContent; h.replaceWith(span); }
    for (const control of $$('header button,header a,header .cursor-pointer')) {
      const symbol = control.querySelector('.material-symbols-outlined')?.textContent;
      if (/volume_/.test(symbol || '') || control.id === 'btn-sound-toggle') control.remove();
      else if(symbol==='star')bind(control,'favorite',{id:ui.recipe||''});
      else bind(control, /arrow_back|chevron_left|close/.test(symbol || '') ? 'back' : symbol === 'person' ? 'account' : 'menu');
    }
    for(const symbol of $$('header .material-symbols-outlined'))if(symbol.textContent.trim()==='person'){const control=symbol.closest('button,a')||symbol.parentElement;bind(control,'account');control.tabIndex=0;control.setAttribute('role','button');control.setAttribute('aria-label','Ouvrir le compte familial');}
    for (const control of $$('body > nav a,body > nav button')) {
      const value = control.textContent.toLowerCase();
      bind(control, value.includes('traverse') ? 'home' : value.includes('mission') ? 'missions' : value.includes('famille') ? 'family' : 'taverne');
      if (control.tagName === 'A') control.href = '#';
    }
    const navigation=$('body > nav');if(navigation)navigation.hidden=ui.view!=='taverne';
    if (!$('main h1')) {
      const title = $('main h2');
      if (title) { const h1 = document.createElement('h1'); h1.className = title.className; h1.append(...title.childNodes); title.replaceWith(h1); }
    }
    const status = document.createElement('p'); status.className = 'cu-sync-note';
    status.textContent = E.win().DobbyFamilyUI?.getModuleStatus?.(['shop','shop-1','shop-final','shop-history'].includes(ui.view) ? 'menus' : 'recipes') || 'Données du moteur DOBBY';
    $('main').append(status);
  }
  function recipeVisual(el, recipe, localOnly = false) {
    if (!el) return;
    // Do not present a fictitious Stitch dish photograph as a real household meal.
    const image = recipe?.image || recipe?.photo;
    const local = !localOnly || (typeof image === 'string' && (()=>{try{return new URL(image,location.href).origin===location.origin || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(image);}catch{return false;}})());
    const fallback = () => { const visual = document.createElement('div'); visual.className = el.className + ' dv7-meal-visual'; visual.textContent = recipe?.emoji || '🍽'; visual.setAttribute('aria-label', localOnly?'Illustration générique : photographie locale indisponible':'Aucune photographie enregistrée pour cette recette'); el.replaceWith(visual); };
    if (image && local) { el.onerror=fallback;el.src = image; el.alt = recipe.name; } else fallback();
  }
  function fillRecipeCard(card, recipe, selected = false) {
    card.dataset.cuRecipe = recipe.id;
    text(card.querySelector('h2,h3,h4'), recipe.name);
    const description = card.querySelector('p'); if (description) text(description, `${durationLabel(recipe)} · ${recipe.servings == null ? 'Portions non renseignées' : recipe.servings+' portions'} · ${recipe.category || 'Recette du foyer'}`);
    for (const image of card.querySelectorAll('img')) recipeVisual(image, recipe);
    // Keep card geometry and original controls; replace fictional badges and meta.
    for (const span of card.querySelectorAll('span')) if (!span.children.length && !span.classList.contains('material-symbols-outlined')) {
      const value = span.textContent.trim();
      if (/min|pers|part|saison|Favori des|Garde-manger|Rustique|Express|cellier|Sélectionné|TM5|Traditionnel/.test(value)) text(span, selected ? 'Sélectionné' : recipe.thermomix ? 'TM5' : recipe.fav ? 'Favori' : 'Recette');
    }
    for (const b of card.querySelectorAll('button')) {
      const symbol = b.querySelector('.material-symbols-outlined')?.textContent;
      bind(b, symbol === 'star' || /Favori/i.test(b.textContent) ? 'favorite' : /Planifier/i.test(b.textContent) ? 'plan-recipe' : 'recipe', { id: recipe.id });
    }
    card.classList.toggle('cu-selected', selected);
    return markSource(card, '.recipe-card');
  }
  function renderTaverne(data) {
    const day = data.state.day, planned = data.state.planned || {}, meal = planned[day + '-soir'];
    const recipe = data.recipes.find(r => r.id === meal?.id);
    const festin = heading('Le Festin de ce Soir')?.closest('.px-gutter-mobile');
    const card = festin?.querySelector('.overflow-hidden');
    if (!card) throw Error('Structure Stitch Taverne introuvable');
    if(recipe)card.dataset.cuRecipe=recipe.id;
    text(card.querySelector('h4,h3'), recipe?.name || 'Aucun dîner prévu');
    const desc = card.querySelector('.p-space-md > div > p'); text(desc, recipe ? `${durationLabel(recipe)} · ${E.evaluate('return countLabel(p.meal);', { meal })}` : 'Choisissez un repas dans le planning du foyer.');
    recipeVisual(card.querySelector('img'), recipe);
    const ingredients = card.querySelector('.grid.grid-cols-2');
    if (ingredients) {
      const sample = ingredients.firstElementChild.cloneNode(true);
      replaceChildren(ingredients, recipe ? recipe.ingredients.slice(0,6).map(([name]) => { const row = sample.cloneNode(true); text(row.querySelector('span:last-child'), name); return row; }) : [empty('Aucun ingrédient à afficher.')]);
    }
    const ready = card.querySelector('.rounded-lg.bg-surface-container-low');
    if (ready) {
      const title=ready.querySelector('.uppercase'); if(title) title.innerHTML=icon('restaurant_menu')+' Ingrédients de la recette';
      for(const symbol of ready.querySelectorAll('.material-symbols-outlined'))if(symbol.textContent==='check_circle')text(symbol,'circle');
      text(ready.querySelector('.text-secondary'),recipe?.ingredients.length||0);
    }
    for (const b of card.querySelectorAll('button')) bind(b, /recette/i.test(b.textContent) && recipe ? 'recipe' : recipe ? 'cooked' : 'pick', { id: recipe?.id || '', date: day, slot: 'soir' });
    const dateBadge = festin.querySelector(':scope > div > span'); text(dateBadge, day);
    const week = heading('La Semaine de Festins')?.closest('.px-gutter-mobile');
    const list = week?.querySelector(':scope > .flex.flex-col');
    if (list) {
      const sample = list.firstElementChild.cloneNode(true);
      replaceChildren(list, Array.from({ length:7 }, (_, i) => {
        const date = E.evaluate('return addDays(p.day,p.index);', { day, index:i });
        const record = planned[date + '-soir'] || planned[date + '-midi']; const r = data.recipes.find(r => r.id === record?.id);
        const row = sample.cloneNode(true); row.dataset.cuAction = 'pick'; row.dataset.date = date; row.tabIndex = 0; row.setAttribute('role','button');
        text(row.querySelector('.uppercase'), date); text(row.querySelector('p'), r?.name || 'Repas à prévoir');
        const paragraphs = row.querySelectorAll('p'); text(paragraphs[1], r ? `${durationLabel(r)} · ${record.status}` : 'Choisir un repas');
        recipeVisual(row.querySelector('img'), r); row.querySelectorAll('button').forEach(button => bind(button,'pick',{date})); return row;
      }));
    }
    const basket = heading('Le Panier de Dobby')?.closest('.px-gutter-mobile');
    if (basket) {
      const rows = basket.querySelector('.flex.flex-col.gap-2');
      if (rows) {
        const sample = rows.firstElementChild.cloneNode(true);
        replaceChildren(rows, data.draft.slice(0,4).map(item => { const row = sample.cloneNode(true); const title = row.querySelector('.font-body-md,.font-body-lg,.font-body-sm') || row; text(title, `${item.name} · ${item.qty == null ? 'Quantité à préciser' : item.qty + ' ' + item.unit}`); return row; }));
        if (!data.draft.length) rows.append(empty('Aucune provision à préparer.'));
      }
      basket.querySelectorAll('button').forEach(button => bind(button,'shop'));
      text(basket.querySelector('button'),`Voir les ${data.draft.length} articles à préparer`);
      for(const label of basket.querySelectorAll('span'))if(!label.children.length&&!label.classList.contains('material-symbols-outlined')&&label.textContent.trim()==='—')text(label,data.draft.length+' articles');
      text(basket.querySelector('p'),'Provisions calculées depuis les repas non encore couverts par une liste validée.');
    }
    bind($('#btn-inspiration'),'pick'); text($('#btn-inspiration span:last-child'),'Choisir un repas');
    for (const tab of $$('[data-tab]')) bind(tab, ({ menu:'taverne',grimoire:'recipes',provisions:'shop' })[tab.dataset.tab] || 'taverne');
    for (const b of week?.querySelectorAll(':scope > div:first-child button') || []) bind(b,'pick');
    for (const section of $$('main .px-gutter-mobile')) if (/SCEAU DE PROTECTION/i.test(section.textContent)) section.remove();
    const tip=$$('main p').find(p=>p.textContent.includes('Dobby a déjà regroupé'));text(tip,'Les besoins du panier sont calculés à partir des repas enregistrés. Aucune commande ni livraison n’est effectuée par Dobby.');
  }
  function renderPick(data) {
    window.history.replaceState({cuisine:'pick'},'', '#pick?date='+encodeURIComponent(ui.date)+'&slot='+encodeURIComponent(ui.slot));
    const meal = data.state.planned[ui.date + '-' + ui.slot];
    ui.adult ??= meal?.adult ?? meal?.people ?? data.state.adult ?? 2; ui.children ??= meal?.children ?? data.state.children ?? 0;
    ui.selected ||= meal?.id || data.recipes[0]?.id;
    text($('#adultCount'), ui.adult); text($('#childCount'), ui.children);
    for (const [id,key] of [['adultCount','adult'],['childCount','children']]) {
      const controls = $('#' + id).parentElement.querySelectorAll('button'); bind(controls[0],'count',{key,delta:'-1'}); bind(controls[1],'count',{key,delta:'1'});
    }
    text($('#ratioSummary'), `${E.portions(ui.adult,ui.children)} portions équivalentes adultes`); text($('#totalGuests'), `${Number(ui.adult)+Number(ui.children)} convives`);
    const factor = $('#childCount').parentElement.parentElement.querySelector('.text-on-surface-variant'); text(factor, `Coefficient du foyer : ${data.state.childFactor ?? .65}`);
    const days = $('#daysCarousel'); const sampleDay = days.firstElementChild.cloneNode(true);
    replaceChildren(days, Array.from({ length:7 },(_,i)=>{const date=E.evaluate('return addDays(p.date,p.i);',{date:ui.date,i:i-2});const el=sampleDay.cloneNode(true);text(el,date);bind(el,'date',{date});return el;}));
    const dateField = document.createElement('div'); dateField.innerHTML = input('cu-date','Date du repas','date',ui.date); days.after(dateField);
    bind($('#slotLunch'),'slot',{slot:'midi'}); bind($('#slotDinner'),'slot',{slot:'soir'});
    $('#slotLunch').setAttribute('aria-pressed',String(ui.slot==='midi')); $('#slotDinner').setAttribute('aria-pressed',String(ui.slot==='soir'));
    bind($('#tabDobby'),'suggestion'); bind($('#tabGrimoire'),'recipes'); text($('#tabGrimoire'),`Mes recettes (${data.recipes.length})`);
    const list = $('#recipesContainer'); const sample = list.querySelector('.recipe-card').cloneNode(true);
    replaceChildren(list, data.recipes.map(recipe => { const card=fillRecipeCard(sample.cloneNode(true),recipe,ui.selected===recipe.id);bind(card,'select-recipe',{id:recipe.id});return card; }));
    const note = $('#prepNotes'); note.value = ui.note || data.state.note || ''; note.placeholder = 'Précisions pour le choix du repas';
    bind(labelButton('Enregistrer dans le planning','save-meal'),'save-meal');
    labelButton('Annuler','taverne'); labelButton('Parcourir tout','recipes'); labelButton('aléatoire','suggestion');
    // No fixed, invented dietary tags are persisted from the mockup.
    for (const b of $$('main button')) if (/Végétarien|Moins de 30|Fromage au choix|Pain frais/.test(b.textContent) && !b.dataset.cuAction) b.hidden=true;
    const extras = document.createElement('div'); extras.className='cu-context';
    extras.innerHTML = `<p>Repas : ${esc(ui.slot)} · ${esc(meal?.status || 'à prévoir')}</p>` + (meal ? input('cu-move-date','Déplacer ce repas vers','date',ui.date)+button('move-meal','Déplacer le repas')+button('cancel-meal','Annuler ce repas dans le planning')+`<p>Repas enregistré : ${esc(data.recipes.find(r=>r.id===meal.id)?.name||'Recette indisponible')}</p>`+button('cooked',meal.status==='préparé'?'Repas déjà préparé':'Marquer comme préparé',`data-date="${esc(ui.date)}" data-slot="${esc(ui.slot)}" ${meal.status==='préparé'?'disabled':''}`) : '');
    $('main').append(extras);
  }
  const totalMinutes = recipe => {
    if(window.DobbyRecipeImport?.totalMinutes)return window.DobbyRecipeImport.totalMinutes(recipe);
    const value=recipe?.importDetails?.durations?.total??recipe?.minutes;
    return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  };
  const recipeName = recipe => recipe?.name?.trim() || 'Recette sans titre — À compléter';
  const durationLabel = recipe => {const minutes=totalMinutes(recipe);return minutes===null?'Durée non renseignée':minutes+' min';};
  const normalized = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
  const ingredientLine=([name,quantity,unit])=>quantity==null?(unit?`? ; ${unit} ; ${name}`:name):`${quantity} ; ${unit} ; ${name}`;
  function catalogueCard(sample,recipe,data){
    const card=sample.cloneNode(true);card.dataset.cuRecipe=recipe.id;card.dataset.fav=String(!!recipe.fav);card.dataset.stitchComponent='.recipe-card';card.classList.add('e073-recipe-card');
    const visual=card.firstElementChild,image=visual.querySelector('img'),favorite=visual.querySelector('.fav-toggle'),overlay=visual.querySelector('.absolute.inset-0');
    visual.replaceChildren(...[image,overlay,favorite].filter(Boolean));recipeVisual(image,recipe);
    favorite.setAttribute('aria-pressed',String(!!recipe.fav));favorite.setAttribute('aria-label',(recipe.fav?'Retirer des favoris : ':'Ajouter aux favoris : ')+recipe.name);bind(favorite,'favorite',{id:recipe.id});
    // The supplied Material Symbols file is static, so FILL variations cannot
    // draw a filled favorite. One real SVG shape gives distinct painted states.
    const star=document.createElementNS('http://www.w3.org/2000/svg','svg');star.setAttribute('viewBox','0 0 24 24');star.setAttribute('width','25');star.setAttribute('height','25');star.setAttribute('aria-hidden','true');star.dataset.e073FavoriteStar='';star.style.color=recipe.fav?'#f9bb5f':'#e6d7c3';
    const shape=document.createElementNS('http://www.w3.org/2000/svg','path');shape.setAttribute('d','M12 2.5 14.94 8.45 21.5 9.4 16.75 14.03 17.87 20.57 12 17.48 6.13 20.57 7.25 14.03 2.5 9.4 9.06 8.45Z');shape.setAttribute('stroke','currentColor');shape.setAttribute('stroke-width','1.6');shape.setAttribute('stroke-linejoin','round');shape.setAttribute('fill',recipe.fav?'currentColor':'none');star.append(shape);favorite.replaceChildren(star);
    const content=card.lastElementChild,title=content.querySelector('h2,h3,h4'),actions=content.querySelector('.grid.grid-cols-2');text(title,recipeName(recipe));content.replaceChildren(title);
    const category=document.createElement('p');category.className='e073-recipe-category';category.textContent=recipe.category||'Recette du foyer';content.append(category);
    const minutes=totalMinutes(recipe);if(minutes!==null){const duration=document.createElement('p');duration.className='e073-recipe-duration';duration.dataset.e073Duration='';duration.innerHTML=icon('schedule');duration.append(document.createTextNode(' '+minutes+' min'));content.append(duration);}
    if(data.state.tmAdaptations?.[recipe.id]){const a=data.state.tmAdaptations[recipe.id],state=document.createElement('p');state.className='e073-recipe-mode';state.textContent=a.verifiedAt&&a.verified!==false?'Classique · Adaptation TM5 contrôlée':'Classique · Adaptation TM5 à vérifier';content.append(state);}
    if(actions){content.append(actions);for(const b of actions.querySelectorAll('button'))bind(b,/Planifier/.test(b.textContent)?'plan-recipe':'recipe',{id:recipe.id});}
    return card;
  }
  function cataloguePresentation(){
    const main=$('main'),hero=main.querySelector('img')?.parentElement;if(hero){hero.dataset.e073RecipesHero='';
      const kicker=[...hero.querySelectorAll('span')].find(el=>(el.dataset.stitchText||el.textContent).includes('GRIMOIRE & FORMULES DU LOGIS'))?.parentElement;
      if(kicker){kicker.dataset.e073RecipesKicker='';kicker.classList.remove('top-3','left-3');}
      for(const child of [...hero.children])if(child!==kicker&&child!==hero.querySelector('img')&&!child.classList.contains('inset-0'))child.remove();
    }
    for(const section of [...main.querySelectorAll('section')]){
      if(section.id==='recipes-list'||section.contains($('#recipe-search'))||section.contains($('#filters-container')))continue;
      if(/Sanctuaire Culinaire|Mémoire iPhone|Guide des Fourneaux du Logis|Sauvegarder ou enrichir le Grimoire/i.test(section.textContent))section.remove();
    }
    const exportButton=$('#btn-export-json');if(exportButton)exportButton.closest('section')?.remove();
    $('#drop-zone')?.closest('section')?.remove();$('#btn-create-recipe')?.parentElement.remove();
    const search=$('#recipe-search');if(search&&!$('[data-e073-recipes-title]')){const title=document.createElement('h2');title.dataset.e073RecipesTitle='';title.className='e073-catalogue-title';title.textContent='Mes recettes';search.parentElement.before(title);}
    const create=$('#btn-hero-add-recipe');if(create){create.dataset.e073Create='';create.parentElement.classList.remove('max-w-xs');create.replaceChildren();const symbol=document.createElement('span');symbol.className='material-symbols-outlined';symbol.textContent='edit_note';symbol.setAttribute('aria-hidden','true');create.append(symbol,document.createTextNode('Ajouter des recettes avec l’IA'));bind(create,'new-recipe');}
    let back=$('[data-e073-taverne-return]');if(!back){back=[...main.querySelectorAll('button,a')].find(el=>/Retour à la Taverne/.test(el.textContent));if(!back){back=document.createElement('button');main.append(back);}const oldFooter=back.closest('footer');if(oldFooter){oldFooter.remove();main.append(back);}back.type='button';back.dataset.e073TaverneReturn='';back.className='e073-gold-return';back.replaceChildren();const arrow=document.createElement('span');arrow.className='material-symbols-outlined';arrow.setAttribute('aria-hidden','true');arrow.textContent='arrow_back';back.append(arrow,document.createTextNode('Retour à la Taverne Gourmande'));bind(back,'taverne');}
  }
  function renderRecipes(data) {
    cataloguePresentation();const list=$('#recipes-list'),sample=clone('#recipes-list .recipe-card'),query=normalized(ui.query);
    const rows=data.recipes.filter(recipe=>{
      const searchable=[recipe.name,recipe.category,recipe.source,...(recipe.ingredients||[]).map(i=>i[0]),...(recipe.steps||[]),JSON.stringify(recipe.importDetails?.notes||''),...[recipe.tags,recipe.keywords].flatMap(value=>Array.isArray(value)?value:typeof value==='string'?[value]:[])].join(' ');
      const mode=!!recipe.thermomix||!!data.state.tmAdaptations?.[recipe.id],classic=!recipe.thermomix||!!recipe.importDetails?.classicSteps?.length;
      const minutes=totalMinutes(recipe),filter=ui.filter||'all';
      return (!query||normalized(searchable).includes(query))&&(filter==='all'||filter==='fav'&&recipe.fav||filter==='tm5'&&mode||filter==='trad'&&classic||filter==='quick'&&minutes!==null&&minutes<30||filter==='veggie'&&recipe.category==='Végétarien'||filter==='category'&&recipe.category===ui.category);
    });
    replaceChildren(list,rows.map(recipe=>catalogueCard(sample,recipe,data)));if(!rows.length)list.append(empty('Aucune recette pour ces critères.'));$('#recipe-search').value=ui.query;grimoireSettings();
    const filters=$('#filters-container'),chipSample=clone('#filters-container button');filters.replaceChildren();
    const specs=[['all',`Toutes (${data.recipes.length})`],['fav','Favoris'],['tm5','Thermomix TM5'],['trad','Traditionnelles'],['fast','Rapides (< 30 min)'],['veg','Végétarien']];
    for(const category of [...new Set(data.recipes.map(r=>r.category).filter(Boolean))])if(category!=='Végétarien')specs.push(['category',category,category]);
    for(const [filter,label,category]of specs){const chip=chipSample.cloneNode(false);chip.type='button';chip.textContent=label;chip.dataset.filter=filter;if(category)chip.dataset.category=category;bind(chip,'filter',{filter,...(category?{category}:{})});const active=category?ui.filter==='category'&&ui.category===category:ui.filter===({fast:'quick',veg:'veggie'})[filter]||ui.filter===filter;chip.setAttribute('aria-pressed',String(!!active));filters.append(chip);}
  }
  function grimoireSettings(){
    if($('[data-e074-grimoire-settings]'))return;
    const section=document.createElement('details');section.className='e073-recipe-management e074-grimoire-settings';section.dataset.e074GrimoireSettings='';
    const summary=document.createElement('summary');summary.textContent='Réglages du Grimoire';section.append(summary);
    const info=document.createElement('p');info.textContent='Cet export JSON contient les textes des recettes et leurs variantes TM5. Les photographies ne sont pas incluses : ce fichier n’est pas une sauvegarde complète.';section.append(info);
    section.insertAdjacentHTML('beforeend',button('export-recipes','Exporter les recettes en JSON'));$('main').append(section);
  }
  function renderRecipeEntry(data){return window.DobbyRecipeImport.render(data,{E,ui,bind,text,button,input,empty,notice,open,render});}
  function renderRecipe(data) {
    const recipe = data.recipes.find(r=>r.id===ui.recipe); if(!recipe)throw Error('Recette introuvable dans le grimoire.');
    ui.servings ??= data.detailPortions || recipe.servings;
    text($('main h1,main h2'),recipe.name);
    for(const image of $$('main img')) recipeVisual(image,recipe);
    const sourceMeta=$$('main section')[1];
    if(sourceMeta){
      const subtitle=sourceMeta.querySelector('h2 + p,h1 + p');text(subtitle,recipe.source||'Recette enregistrée dans le grimoire du foyer.');
      for(const badge of sourceMeta.querySelectorAll('.absolute.top-3 > span')){badge.textContent=recipe.thermomix?'Thermomix TM5':recipe.category||'Recette du foyer';}
      for(const badge of sourceMeta.querySelectorAll('.absolute.bottom-3 span'))text(badge,recipe.fav?'Favori du foyer':'Recette du foyer');
      const metrics=sourceMeta.querySelector('.grid');if(metrics)for(const [i,box]of [...metrics.children].entries()){const label=box.querySelector('.uppercase');const value=box.querySelector(':scope > span:last-child');text(label,['Durée totale','Portions de référence','Catégorie','Coût / part'][i]);text(value,[durationLabel(recipe),recipe.servings,recipe.category||'Autre','Non renseigné'][i]);}
    }
    text($('#mode-tm5-btn'), 'Thermomix TM5');
    const servingLabel=$('#servings-display')?.nextElementSibling;text(servingLabel,'portions');
    const counter=$('#servings-display');text(counter,ui.servings);bind($('#btn-decrease'),'servings',{delta:'-1'});bind($('#btn-increase'),'servings',{delta:'1'});
    bind($('#favorite-btn'),'favorite',{id:recipe.id});$('#favorite-btn')?.setAttribute('aria-pressed',String(Boolean(recipe.fav)));
    bind($('#export-btn'),'export-recipe');$('#export-btn')?.setAttribute('aria-label','Exporter cette recette au format JSON');bind($('#mode-trad-btn'),'ingredients');bind($('#mode-tm5-btn'),'tm5');
    text($('#method-banner'),'Recette du grimoire DOBBY · quantités adaptées aux portions choisies');
    bind($('#tab-btn-ingredients'),'ingredients');bind($('#tab-btn-steps'),'steps');
    text($('#tab-btn-ingredients'),`Garde-manger (${recipe.ingredients.length})`);text($('#tab-btn-steps'),`Préparation (${recipe.steps.length})`);
    const list=$('#ingredients-list'),sample=list.firstElementChild.cloneNode(true);
    replaceChildren(list,recipe.ingredients.map(([name,qty,unit],i)=>{const row=sample.cloneNode(true);text(row.querySelector('.ingredient-name'),name);text(row.querySelector('.ingredient-name')?.nextElementSibling,qty==null?'Quantité à préciser':E.amount(qty,ui.servings,recipe.servings)+' '+unit);
      const check=row.querySelector('input');check.checked=ui.ingredients.has(i);check.dataset.cuIngredient=i;return markSource(row,'#ingredients-list > label');}));
    text($('#checked-counter'),`${ui.ingredients.size} / ${recipe.ingredients.length}`);
    const steps=$('#tab-content-steps'),stepBox=steps.firstElementChild;
    const sampleStep=stepBox.querySelector(':scope > .relative').cloneNode(true),stepHeader=stepBox.firstElementChild;
    text(stepHeader.lastElementChild,recipe.steps.length+' étapes');
    replaceChildren(stepBox,[stepHeader,...recipe.steps.map((step,i)=>{const row=sampleStep.cloneNode(true);text(row.querySelector('h3'),`Étape ${i+1}`);text(row.querySelector('p'),step);text(row.querySelector('.w-8.h-8'),i+1);row.querySelector('h3')?.nextElementSibling?.remove();return markSource(row,'#tab-content-steps .relative');})]);
    $('#tab-content-ingredients').hidden=ui.recipeTab==='steps';steps.hidden=ui.recipeTab!=='steps';steps.classList.remove('hidden');
    bind($('#add-to-cart-btn'),'recipe-shop');bind($('#cook-mode-btn'),'cook');
    labelButton('Planifier au Menu','plan-recipe');labelButton('Au Grimoire','recipes');
    const edit=document.createElement('div');edit.className='cu-context';edit.innerHTML=button('edit-recipe',data.customIds.includes(recipe.id)?'Modifier cette recette':'Créer une copie modifiable');$('main').append(edit);
  }
  async function render(view = ui.view) {
    const current=++revision; const doc=await template(view); if(current!==revision)return;
    pristine=doc;ui.view=view;
    const main=document.importNode(doc.querySelector('main'),true);main.classList.add('cu-enter');
    document.querySelector('main').replaceWith(main);
    $('#cu-source-style')?.remove();const style=document.createElement('style');style.id='cu-source-style';style.textContent=[...doc.querySelectorAll('head style')].map(s=>s.textContent).join('\n');document.head.append(style);
    $('#cu-supplement')?.remove();const supplement=document.createElement('div');supplement.id='cu-supplement';
    for(const node of doc.body.children)if(!node.matches('main,header,nav,script'))supplement.append(document.importNode(node,true));document.body.append(supplement);
    const sourceHeader=doc.querySelector('header');if(sourceHeader&&document.querySelector('body > header'))document.querySelector('body > header').replaceWith(document.importNode(sourceHeader,true));
    document.body.dataset.cuisineView=view;document.body.dataset.stitchSource=doc.body.dataset.stitchSource;
    scrub();const data=E.read();await window.DobbyRecipeImport?.hydrate?.(data.recipes,{E});
    if(!window.DobbyCuisineE07?.render(view,data,{E,ui,pristine,bind,text,button,input,empty,renderShared,recipeVisual}))
    ({taverne:renderTaverne,pick:renderPick,recipes:renderRecipes,recipe:renderRecipe,cook:renderCook,tm5:renderTM5,'recipe-add':renderAdd,'recipe-add-1':renderAdd,'recipe-entry':renderRecipeEntry,'recipe-ai':data=>window.DobbyRecipeImport?.render(data,{E,ui,bind,text,button,input,empty,notice,open,render}),batch:renderBatch,shop:renderShop,'shop-1':renderShop,'shop-final':renderFinal,'shop-history':renderHistory})[view](data);
    shell();window.DobbyChrome?.mount();
    for(const control of $$('main button,#cu-supplement button'))if(!control.dataset.cuAction && control.type!=='submit') {control.disabled=true;control.title='Commande décorative de la maquette, sans action métier disponible.';}
    document.querySelector('main').style.visibility='visible';
    document.documentElement.classList.remove('dv7-loading');
  }
  async function open(view, values = {}, history = true) {
    if(view==='shop-history'){view='shop';history=false;window.history.replaceState({cuisine:view},'','#shop');}
    if(!routes.includes(view))return false;
    if(view==='recipe-entry'||['recipe-add','recipe-add-1'].includes(view)&&!ui.editId){view='recipe-ai';if(!history)window.history.replaceState({cuisine:view},'','#recipe-ai');}
    if(['recipe-add','recipe-add-1'].includes(ui.view)&&$('#recipe-form')&&!ui.recipeSaved)ui.recipeDraft=readRecipeDraft();ui.recipeSaved=false;
    busy=true;
    try {
      if(values.id&&values.id!==ui.recipe){ui.recipe=values.id;ui.servings=null;ui.ingredients.clear();ui.tmDraft=null;ui.tmEditing=undefined;ui.recipeTab='ingredients';}
      if(values.date)ui.date=values.date;if(values.slot)ui.slot=values.slot;
      if(view==='pick') {if(values.date||values.slot)ui.selected=values.id||null;ui.date ||= E.read().state.day;ui.adult=null;ui.children=null;E.page('pick');}
      else if(['recipe','cook','tm5'].includes(view)) {
        ui.recipe ||= E.read().recipes[0]?.id;
        if(!E.read().recipes.some(r=>r.id===ui.recipe)){ui.recipe=null;notice('Cette recette n’est plus disponible dans votre grimoire.',true);return open('recipes',{},history);}
        if(view==='cook'){E.cook(ui.recipe);ui.timer=0;}
        else if(view==='tm5')E.tm5(ui.recipe);else E.page('recipes',ui.recipe);
      } else if(view==='recipe-add'||view==='recipe-add-1')E.page('import');
      else if(view==='batch')E.page('batch');
      else if(view.startsWith('shop'))E.page('shop');
      else E.page(view==='taverne'?'plan':'recipes');
      if(history)window.history.pushState({cuisine:view},'', '#'+view+(ui.recipe&&['recipe','cook','tm5'].includes(view)?'?id='+encodeURIComponent(ui.recipe):''));
      $('#cu-notice')?.setAttribute('hidden','');await render(view);window.scrollTo(0,0);return true;
    } finally {busy=false;}
  }
  async function refresh() {if(!ready||busy)return;busy=true;try{if(ui.view.startsWith('shop')&&E.read().state.page!=='shop')E.page('shop');await render();}finally{busy=false;}}
  async function act(action, el) {
    const data=E.read();
    if((action.startsWith('e072-')||action.startsWith('e073-week-'))&&await window.DobbyCuisineE07.action(action,el,{E,render}))return;
    if(action.startsWith('e073-import-')&&await window.DobbyRecipeImport?.action(action,el,{E,ui,bind,text,button,input,empty,notice,open,render}))return;
    if(action==='dismiss'){$('#cu-notice').hidden=true;return;}
    if(routes.includes(action)){
      if(action==='recipes'&&el.dataset.filter)ui.filter=el.dataset.filter;
      if(action.startsWith('recipe-add')&&ui.view.startsWith('recipe-add'))ui.recipeDraft=readRecipeDraft();
      return open(action,el.dataset);
    }
    if(action==='new-recipe')return open('recipe-ai');
    if(action==='manual-recipe')return open('recipe-ai');
    if(['home','missions','family','account','menu'].includes(action))return legacy(action);
    if(action==='back'){if(ui.view==='taverne')return legacy('home');return open(['cook','tm5'].includes(ui.view)?'recipe':['recipe-add','recipe-add-1','recipe-entry','recipe-ai','batch','recipe'].includes(ui.view)?'recipes':'taverne');}
    if(action==='count'){ui[el.dataset.key]=Math.max(0,Number(ui[el.dataset.key])+Number(el.dataset.delta));return render();}
    if(action==='date'){ui.date=el.dataset.date;ui.adult=null;ui.children=null;ui.selected=null;return render();}
    if(action==='slot'){ui.slot=el.dataset.slot;ui.adult=null;ui.children=null;ui.selected=null;return render();}
    if(action==='select-recipe'){ui.selected=el.dataset.id;return render();}
    if(action==='suggestion'){ui.selected=data.recipes.find(r=>r.id!==ui.selected)?.id||data.recipes[0]?.id;notice('Une recette de votre grimoire est sélectionnée. Aucune suggestion IA n’est utilisée.');return render();}
    if(action==='save-meal'){ui.note=$('#prepNotes').value; const key=$('#cu-date').value+'-'+ui.slot,prior=data.state.planned[key];if(E.choose({id:ui.selected,date:$('#cu-date').value,slot:ui.slot,adult:ui.adult,children:ui.children,note:ui.note})){if(prior?.id===ui.selected&&prior._e072ImportRef)E.evaluate('st.planned[p.key]._e072ImportRef=p.ref;save();',{key,ref:prior._e072ImportRef});return open('taverne');}return;}
    if(action==='favorite'){const id=el.dataset.id||ui.recipe,recipe=data.recipes.find(r=>r.id===id);if(!recipe)return;if(recipe.fav&&!window.confirm('Retirer « '+recipe.name+' » des favoris ? La recette sera conservée.'))return;E.favorite(id);await render();notice(recipe.fav?'Recette retirée des favoris.':'Recette ajoutée aux favoris.');return;}
    if(action==='filter'){ui.filter=({stew:'all',fast:'quick',veg:'veggie'})[el.dataset.filter]||el.dataset.filter;ui.category=el.dataset.category||null;return render();}
    if(action==='plan-recipe'){ui.selected=el.dataset.id||ui.recipe;return open('pick');}
    if(action==='servings'){ui.servings=Math.max(1,Math.min(30,Number(ui.servings)+Number(el.dataset.delta)));return render();}
    if(action==='ingredients'||action==='steps'){ui.recipeTab=action;return render();}
    if(action==='recipe-shop'){notice('Planifiez la recette pour que le moteur ajoute ses ingrédients aux courses.');ui.selected=ui.recipe;return open('pick');}
    if(action==='cooked'){E.mealAction('status',{date:el.dataset.date,slot:el.dataset.slot,status:'préparé'});return render();}
    if(action==='move-meal'||action==='cancel-meal'){E.mealAction(action==='move-meal'?'move':'status',{date:ui.date,slot:ui.slot,destination:$('#cu-move-date')?.value,status:'annulé'});return open('taverne');}
    if(action==='export-recipes'){E.exportRecipes();return;}
    if(action==='export-recipe'){E.exportRecipes(ui.recipe);return;}
    return extraAction(action,el,data);
  }
  async function init(openLegacy) {
    if(ready)return;legacy=openLegacy;document.body.classList.add('cu-active');
    E.win().alert=message=>notice(String(message),true);
    const parseHash=()=>{const [view,query]=location.hash.slice(1).split('?');return {view:routes.includes(view)?view:'taverne',id:new URLSearchParams(query||'').get('id'),date:new URLSearchParams(query||'').get('date')||undefined,slot:['midi','soir'].includes(new URLSearchParams(query||'').get('slot'))?new URLSearchParams(query||'').get('slot'):undefined}};
    document.addEventListener('click',event=>{
      if(!document.body.classList.contains('cu-active')||event.target.closest('#dv7-panel'))return;
      const control=event.target.closest('[data-cu-action]');if(!control)return;
      event.preventDefault();event.stopImmediatePropagation();
      busy=true;Promise.resolve(act(control.dataset.cuAction,control)).catch(error=>notice(error.message,true)).finally(()=>{busy=false;});
    },true);
    document.addEventListener('keydown',event=>{const control=event.target.closest('[data-cu-action][role="button"]');if(control&&(event.key==='Enter'||event.key===' ')){event.preventDefault();control.click();}});
    document.addEventListener('input',event=>{
      if(event.target.id==='recipe-search'){ui.query=event.target.value;const query=ui.query,data=E.read();Promise.resolve(window.DobbyRecipeImport?.hydrate?.(data.recipes,{E})).then(()=>{if(ui.view==='recipes'&&query===ui.query)renderRecipes(data);}).catch(error=>notice(error.message,true));}
      if(event.target.id==='cu-date')ui.date=event.target.value;
      if(event.target.id==='prepNotes')ui.note=event.target.value;
    });
    document.addEventListener('change',event=>{if(event.target.matches('[data-e073-import-file],[data-e073-import-choice]')){Promise.resolve(window.DobbyRecipeImport?.change(event,{E,ui,bind,text,button,input,empty,notice,open,render})).catch(error=>notice(error.message,true));return;}if(event.target.id==='cu-date'){ui.date=event.target.value;ui.adult=null;ui.children=null;ui.selected=null;render();}if(event.target.dataset.cuIngredient!==undefined){const i=Number(event.target.dataset.cuIngredient);event.target.checked?ui.ingredients.add(i):ui.ingredients.delete(i);text($('#checked-counter'),`${ui.ingredients.size} / ${E.read().recipes.find(r=>r.id===ui.recipe).ingredients.length}`);}});
    bindForms();
    window.addEventListener('popstate',()=>{const route=parseHash();open(route.view,{id:route.id,date:route.date,slot:route.slot},false).catch(error=>notice(error.message,true));});
    const route=parseHash();await open(route.view,{id:route.id,date:route.date,slot:route.slot},false);ready=true;
    new MutationObserver(()=>{if(ready&&!busy&&!document.activeElement?.matches('input,textarea,select'))refresh().catch(error=>notice(error.message,true));}).observe(E.win().document.getElementById('screen'),{childList:true});
  }
  // Additional source adapters are defined below, sharing this controller and engine.
  function renderCook(data) {
    const recipe=data.recipes.find(r=>r.id===ui.recipe);if(!recipe)throw Error('Recette introuvable.');
    const index=Math.min(data.state.cookStep||0,recipe.steps.length-1);
    text($('main h1,main h2'),recipe.name);
    const article=$('main article');text(article.querySelector('h3'),`Étape ${index+1} sur ${recipe.steps.length}`);
    text(article.querySelector('.select-text'),recipe.steps[index]);
    const progress=$('main .grid-cols-5');if(progress){const cell=progress.firstElementChild.cloneNode(true);progress.replaceChildren(...recipe.steps.map((step,i)=>{const el=cell.cloneNode(true);el.title='Étape '+(i+1);el.style.opacity=i<=index?'1':'.25';return el;}));progress.style.gridTemplateColumns=`repeat(${recipe.steps.length},minmax(0,1fr))`;}
    for(const b of $$('main nav button')){const subtitle=b.querySelector('.font-body-sm,.text-body-sm');text(subtitle,'');b.setAttribute('aria-label',b.textContent.includes('Précédente')?'Étape précédente':'Étape suivante');const spans=b.querySelectorAll('span:not(.material-symbols-outlined)');if(spans.length>1)text(spans[spans.length-1],b.textContent.includes('Précédente')?(index?'Étape '+index:'Début'):index===recipe.steps.length-1?'Terminer':'Étape '+(index+2));}
    const summary=$('main details summary .font-label-md');text(summary,`${recipe.ingredients.length} ingrédients de la recette`);

    const ingredients=article.querySelector('.grid');
    if(ingredients){const sample=ingredients.firstElementChild.cloneNode(true);replaceChildren(ingredients,recipe.ingredients.map(([name,qty,unit])=>{const row=sample.cloneNode(true);const labels=row.querySelectorAll('.font-label-md');text(labels[0],name);text(labels[1],qty==null?'Quantité à préciser':E.amount(qty,ui.servings||recipe.servings,recipe.servings)+' '+unit);row.querySelectorAll('small,.font-body-sm').forEach(el=>el.remove());return row;}));}
    for(const label of article.querySelectorAll('span'))if(label.textContent.includes('Vivres requis'))text(label,'Ingrédients de la recette (répartition par étape non renseignée)');
    text($('#timer-display')?.nextElementSibling,'minuteur manuel');
    text($('#timer-display'),`${String(Math.floor(ui.timer/60)).padStart(2,'0')}:${String(ui.timer%60).padStart(2,'0')}`);
    bind($('#btn-timer-toggle'),'timer');text($('#timer-text'),timerId?'Pause':'Démarrer');
    for(const b of $$('main button')){if(b.textContent.trim()==='+1m')bind(b,'timer-add',{seconds:'60'});if(b.textContent.trim()==='+5m')bind(b,'timer-add',{seconds:'300'});}
    const jump=$$('main .overflow-x-auto').at(-1);if(jump){const sample=jump.firstElementChild.cloneNode(true);replaceChildren(jump,recipe.steps.map((step,i)=>{const b=sample.cloneNode(true);text(b,`Étape ${i+1}`);bind(b,'cook-jump',{index:String(i)});return b;}));}
    const details=$('main details');if(details){const list=details.querySelector('.flex.flex-col');if(list){const sample=list.firstElementChild.cloneNode(true);replaceChildren(list,recipe.ingredients.map(([name,qty,unit])=>{const row=sample.cloneNode(true);text(row.firstElementChild,name);text(row.lastElementChild,qty==null?'Quantité à préciser':E.amount(qty,ui.servings||recipe.servings,recipe.servings)+' '+unit);return row;}));}}
    for(const aside of $$('main aside'))text(aside.querySelector('p'),'Suivez les instructions de votre recette et vérifiez les cuissons avant de servir.');
    for(const b of $$('button,a')){if(/Précédent/i.test(b.textContent)){bind(b,'cook-prev');b.disabled=index===0;}if(/Suivant|Terminer|fin du rituel|Poursuivre/i.test(b.textContent))bind(b,'cook-next');}
    // Some mockup controls live outside main in a fixed footer.
    if(!$('[data-cu-action="cook-next"]')){$('main').insertAdjacentHTML('beforeend',button('cook-prev','Étape précédente')+button('cook-next',index===recipe.steps.length-1?'Terminer la cuisine':'Étape suivante'));}
    for(const el of $$('main span'))if(!el.children.length && /Étape|PHASE|^III$|en cours/.test(el.dataset.stitchText||el.textContent)&&!el.classList.contains('material-symbols-outlined')){
      const original=el.dataset.stitchText||el.textContent;text(el,original==='PHASE'?'ÉTAPE':original==='III'?index+1:`Étape ${index+1} / ${recipe.steps.length}`);
    }
    const hero=$('main img')?.parentElement;if(hero){const image=hero.querySelector('img');if(image){image.classList.add('cu-cook-scene');image.alt='Illustration Stitch du mode cuisine, cadrée pour masquer les textes fictifs incorporés';}for(const leaf of hero.querySelectorAll('span'))if(leaf.dataset.stitchText==='25 min • 4 parts')text(leaf,`${durationLabel(recipe)} · ${ui.servings||recipe.servings} portions`);}

  }
  function renderTM5(data) {
    const recipe=data.recipes.find(r=>r.id===ui.recipe);if(!recipe)throw Error('Recette introuvable.');
    const adaptation=data.state.tmAdaptations?.[recipe.id],adaptationVerified=!!adaptation?.verifiedAt&&adaptation.verified!==false;
    text($('main h1'),recipe.name);
    const warning=heading('Avertissement')?.parentElement.querySelector('p');text(warning,'Aucune adaptation automatique : vérifiez les instructions et paramètres auprès d’une source fiable pour votre TM5 avant validation. Respectez les limites du fabricant.');
    const recipeNote=$('main h1')?.parentElement.querySelector('p');text(recipeNote,adaptation&&!adaptationVerified?'Adaptation enregistrée — À vérifier auprès d’une source fiable. Aucun réglage n’est inventé par Dobby.':'Adaptation manuelle de votre recette. Aucun réglage n’est inventé par Dobby.');
    const metricSection=$$('main section').find(section=>section.textContent.includes('Paramètres Synthétiques'));
    if(metricSection){
      const labels=['Durée','Température','Sens inverse','Vitesse'];
      for(const [i,box]of [...metricSection.querySelectorAll('.grid > div')].entries()){
        box.replaceChildren();const label=document.createElement('span');label.className='font-label-sm text-primary';label.textContent=labels[i];const value=document.createElement('p');value.className='font-headline-sm text-on-surface';value.textContent=adaptationVerified?'Voir les étapes vérifiées':adaptation?'À vérifier':'Non renseigné';box.append(label,value);
      }
      const caption=metricSection.querySelector('.flex.items-center.justify-between > span:last-child');text(caption,adaptationVerified?'Réglages contrôlés manuellement':adaptation?'Réglages à vérifier':'Réglages à renseigner');
    }
    const intro=$('main h1')?.closest('section');if(intro)for(const badge of intro.querySelectorAll('.flex.flex-wrap > span'))text(badge,'Paramètres à vérifier');
    const section=heading('Rituel des Étapes TM5')?.closest('section');const sample=section?.querySelector(':scope > .bg-surface-container');
    if(!sample)throw Error('Structure des étapes TM5 introuvable');
    const list=document.createElement('div');list.id='cu-tm-steps';list.className='flex flex-col gap-space-md';
    const steps=ui.tmDraft||adaptation?.steps||recipe.steps.map(step=>({text:step,tool:'',time:'',temp:'',speed:'',reverse:false}));
    for(const [i,step]of steps.entries()){
      const row=sample.cloneNode(true);row.dataset.stitchComponent='TM5 step';
      text(row.querySelector('h4'),`Étape ${i+1}`);const badge=row.firstElementChild?.querySelector(':scope > span');text(badge,step.tool||'Méthode à renseigner');text(row.firstElementChild?.querySelector('.w-6.h-6'),i+1);
      for(const div of [...row.children].slice(1))div.remove();
      row.insertAdjacentHTML('beforeend',`<label class="cu-field">Instructions<textarea name="tm-text-${i}">${esc(step.text)}</textarea></label><div class="cu-grid">`+
        ['tool','time','temp','speed'].map(key=>input('cu-tm-'+key+'-'+i,({tool:'Méthode / accessoire',time:'Durée',temp:'Température',speed:'Vitesse'})[key],'text',step[key]||'',`data-tm-key="${key}"`)).join('')+`</div><label class="cu-check"><input type="checkbox" id="cu-tm-reverse-${i}" ${step.reverse?'checked':''}> Sens inverse</label>`);
      list.append(row);
    }
    for(const row of section.querySelectorAll(':scope > .bg-surface-container'))row.remove();section.append(list);
    for(const originalCheck of $$('main input[type="checkbox"]:not([id^="cu-"])')){const equipment=originalCheck.closest('section');if(equipment)equipment.replaceChildren(empty('Accessoires et capacité à vérifier dans vos instructions TM5.'));}
    bind($('#btnEditMode'),'tm-edit');bind($('#btnGuidedMode'),'tm-view');bind($('#btnModifySettings'),'tm-edit');
    for(const b of $$('main button')){if(/Mode Cuisine TM5/.test(b.textContent)){text(b,'Consulter les étapes TM5');bind(b,'tm-view');}if(/Annuler/.test(b.textContent))bind(b,'recipe');}
    const footer=document.createElement('div');footer.className='cu-context';footer.innerHTML=`<label class="cu-check"><input type="checkbox" id="cu-tm-verified"> J’ai vérifié les instructions et réglages auprès d’une source fiable.</label>`+button('save-tm','Enregistrer l’adaptation TM5')+button('recipe','Retour à la recette');section.append(footer);
    if(recipe.thermomix){for(const field of list.querySelectorAll('input,textarea'))field.disabled=true;footer.querySelector('.cu-check').hidden=true;footer.querySelector('[data-cu-action="save-tm"]').hidden=true;footer.insertAdjacentHTML('afterbegin','<p>Cette recette est déjà destinée au TM5. Modifiez ses instructions depuis sa fiche ou créez une copie.</p>');}
    if(adaptation&&!ui.tmEditing){for(const field of list.querySelectorAll('input,textarea'))field.disabled=true;footer.querySelector('[data-cu-action="save-tm"]').hidden=true;text($('#editNoticeBanner'),(adaptationVerified?'Adaptation contrôlée':'À vérifier — adaptation enregistrée')+' pour '+adaptation.portions+' portions.');}
  }
  function renderAdd(data) {
    const form=$('#recipe-form');const recipe=ui.editId?data.recipes.find(r=>r.id===ui.editId):null;const enriched=!!recipe;
    const draft=ui.recipeDraft||{name:recipe?.name||'',servings:recipe?.servings??'',minutes:recipe?.minutes??'',category:recipe?.category||'Autre',device:recipe?.thermomix?'tm5':'classic',ingredients:recipe?.ingredients.map(ingredientLine).join('\n')||'',steps:recipe?.steps||['']};
    form.noValidate=true;for(const f of form.querySelectorAll('[required]'))f.required=false;$('#recipe-title').value=draft.name;$('#recipe-title').placeholder='Nom de la recette — À compléter';
    if(enriched){$('#prep-time').value=(Object.prototype.hasOwnProperty.call(draft,'preparation')?draft.preparation:recipe.importDetails?.durations?.preparation)??'';$('#cook-time').value=draft.minutes??'';text($('label[for=prep-time]'),'Préparation (facultative)');text($('label[for=cook-time]'),'Durée totale (facultative)');const help=document.createElement('p');help.className='cu-help';help.textContent='Laissez la durée totale vide si elle est inconnue. Les autres durées de la recette sont conservées.';$('#cook-time').closest('.bg-surface-container-lowest')?.append(help);}
    else{$('#prep-time').value=0;$('#cook-time').value=draft.minutes;}
    const count=$('#portions-count');count.innerHTML=`<input id="cu-recipe-servings" type="number" min="1" max="30" placeholder="À compléter" aria-label="Portions de référence" value="${esc(draft.servings??'')}">`;
    for(const b of count.parentElement.parentElement.querySelectorAll('button'))bind(b,'recipe-portions',{delta:b.textContent.includes('－')?'-1':'1'});
    bind($('#mode-trad'),'recipe-device',{device:'classic'});bind($('#mode-tm5'),'recipe-device',{device:'tm5'});$('#cooking-mode-val').value=draft.device;
    const categories=['Viande','Poisson','Végétarien','Rapide','Autre'];
    const pills=$$('#category-pills button');pills.forEach((b,i)=>{if(!categories[i])b.remove();else{text(b,categories[i]);bind(b,'recipe-category',{category:categories[i]});}});$('#category-val').value=draft.category;
    $('#ingredients-input').value=draft.ingredients;$('#ingredients-input').placeholder='200 ; g ; courgettes\nSel (quantité non précisée)';
    const help=document.createElement('p');help.className='cu-help';help.textContent=enriched?'Une ligne par ingrédient : quantité ; unité ; nom. Pour une quantité inconnue avec unité connue : ? ; g ; nom. Le nom seul reste possible.':'Une ligne par ingrédient : quantité ; unité ; nom, ou le nom seul si la quantité est inconnue.';$('#ingredients-input').after(help);
    const steps=$('#steps-container');const sample=steps.firstElementChild.cloneNode(true);
    replaceChildren(steps,draft.steps.map((step,i)=>{const row=sample.cloneNode(true);const field=row.querySelector('textarea');field.value=step;field.dataset.cuStep=i;row.querySelectorAll('button').forEach(b=>bind(b,'remove-step',{index:String(i)}));return row;}));
    text($('#steps-counter'),draft.steps.length+' étape(s)');
    labelButton('Ajouter une étape','add-step');labelButton('Annuler','recipes');for(const b of $$('main button')){if(b.getAttribute('aria-label')==='Annuler')bind(b,'recipes');if(b.textContent.includes("Insérer l'exemple")){text(b,'Aide au format');bind(b,'ingredient-help');}}
    for(const b of $$('button'))if(/Enregistrer.*(?:Grimoire|recette)/i.test(b.textContent)){b.type='submit';b.setAttribute('form','recipe-form');b.dataset.cuAction='save-recipe';}
    const tm=$('#thermomix-section');tm.hidden=draft.device!=='tm5';tm.classList.remove('hidden');if(!tm.hidden)tm.replaceChildren(empty('Pour une recette TM5, renseignez des étapes fiables et spécifiques à l’appareil. Les adaptations détaillées se font depuis sa fiche.'));
    for(const file of form.querySelectorAll('input[type="file"]'))file.addEventListener('change',()=>text($('#file-status'),file.files[0]?file.files[0].name+' · référence temporaire, non enregistrée':'Aucune référence sélectionnée'));
    const missing=(target,message)=>{const note=document.createElement('small');note.className='cu-help e074-missing';note.dataset.e074Missing='';note.id='e074-missing-'+target.id;note.textContent=message+' — À compléter';target.after(note);target.setAttribute('aria-describedby',note.id);};
    if(!draft.name?.trim())missing($('#recipe-title'),'Nom de la recette');
    if(draft.servings===null||draft.servings===undefined||draft.servings==='')missing($('#cu-recipe-servings'),'Portions de référence');
    if(draft.minutes===null||draft.minutes===undefined||draft.minutes==='')missing($('#cook-time'),'Durée totale');
    if(!draft.ingredients?.trim())missing($('#ingredients-input'),'Ingrédients');
    else {const rows=draft.ingredients.split('\n').filter(line=>line.trim()).map(line=>line.split(';').map(s=>s.trim()));const gaps=[];if(rows.some(p=>p.length===1||p[0]==='?'||!p[0]))gaps.push('quantités');if(rows.some(p=>p.length===1||!p[1]))gaps.push('unités');if(rows.some(p=>p.length>1&&!p.slice(2).join(';').trim()))gaps.push('noms');if(gaps.length)missing($('#ingredients-input'),'Ingrédients : '+gaps.join(', '));}
    if(!draft.steps.length)missing($('#steps-container'),'Étapes de préparation');else draft.steps.forEach((step,i)=>{if(!step.trim()){const field=steps.querySelectorAll('textarea')[i];field.id='e074-step-'+i;missing(field,'Étape '+(i+1));}});

    if(!$('main h1')){const title=document.createElement('h1');title.className='font-headline-md text-headline-md text-primary';title.textContent=ui.editId?'Modifier la recette':'Inscrire une recette';form.before(title);}
    form.dataset.e074EditorReady='';
  }
  function readRecipeDraft() {
    const source=ui.editId?E.read().recipes.find(r=>r.id===ui.editId):null,enriched=!!source,number=value=>value.trim()===''?null:Number(value);
    return {name:$('#recipe-title').value,servings:number($('#cu-recipe-servings').value),minutes:enriched?number($('#cook-time').value):Number($('#prep-time').value)+Number($('#cook-time').value),preparation:enriched?number($('#prep-time').value):undefined,category:$('#category-val').value||'Autre',device:$('#cooking-mode-val').value||'classic',ingredients:$('#ingredients-input').value,steps:$$('#steps-container textarea').map(el=>el.value)};
  }
  function renderBatch(data) {
    const candidate=data.batch;
    const blocks=$$('main > div > div');
    const fileBlock=blocks.find(el=>el.textContent.includes('Choisir un autre fichier'));
    if(fileBlock){text(fileBlock.querySelector('.font-label-lg'),ui.batchName||'Aucun fichier JSON sélectionné');fileBlock.insertAdjacentHTML('beforeend','<label class="cu-field">Fichier DOBBY (.json, 2 Mo maximum)<input class="sr-only" aria-label="Choisir un fichier JSON DOBBY" id="cu-batch-file" type="file" accept=".json,application/json"></label>');}
    labelButton('Choisir un autre fichier','choose-batch');text(labelButton('Modèle officiel','batch-example'),'Exemple au format DOBBY');if(fileBlock){text(fileBlock.querySelector('.truncate'),ui.batchName||'Aucun fichier sélectionné');for(const el of fileBlock.querySelectorAll('.uppercase'))if(/Prêt/.test(el.textContent))text(el,candidate?.errors.length?'À corriger':candidate?'Analysé':'En attente');}
    const schema=$('#modal-schema');schema.hidden=false;text(schema.querySelector('p'),'Format DOBBY : {format:"dobby-recipes",version:1,recipes:[{name,minutes,servings,device,category,ingredients:[{name,quantity,unit}],steps:[...]}]}. Les quantités inconnues peuvent être null.');
    const bilan=heading('Bilan du Crible')?.closest('.rounded-xl');if(bilan){const slot=bilan.querySelector('.grid');if(slot){slot.style.gridTemplateColumns='minmax(0,1fr)';slot.replaceChildren(empty(candidate?`${candidate.recipes.length} recette(s) valides · ${candidate.errors.length} erreur(s) · ${candidate.warnings?.length||0} avertissement(s)`:'Choisissez un fichier pour démarrer la validation.'));}bilan.querySelectorAll('[style*="width"]').forEach(el=>el.style.width='0%');}
    const duplicates=heading('Arbitrage')?.closest('.rounded-xl');if(duplicates){duplicates.querySelectorAll('fieldset').forEach(el=>el.remove());const title=duplicates.querySelector('h3');duplicates.replaceChildren(title);}
    ui.batchChoices ||= {};
    if(candidate&&duplicates){for(const [i,r]of candidate.recipes.entries()){const existing=data.recipes.find(x=>x.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()===r.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()&&Boolean(x.thermomix)===Boolean(r.thermomix));if(existing){const choice=document.createElement('label');choice.className='cu-field';choice.innerHTML=esc(r.name)+`<select data-cu-collision="${i}"><option value="skip">Conserver la recette existante</option>${data.customIds.includes(existing.id)?'<option value="replace">Remplacer la recette importée existante</option>':''}</select>`;choice.querySelector('select').value=ui.batchChoices[i]||'skip';duplicates.append(choice);}}}
    const registry=heading('Registre Détaillé')?.closest('.space-y-space-sm');if(registry){const h=registry.querySelector('h3,h2');registry.replaceChildren(h);for(const message of candidate?.errors||[])registry.append(empty('Erreur : '+message));for(const message of candidate?.warnings||[])registry.append(empty('À vérifier : '+message));for(const r of candidate?.recipes||[]){const p=document.createElement('p');p.textContent=`${r.name} · ${durationLabel(r)} · ${r.servings} portions`;registry.append(p);}}
    for(const b of $$('main button')){if(/Importer|Intégrer|Sceller|Confirmer|Valider/.test(b.dataset.stitchText||b.textContent)&&!b.dataset.cuAction){text(b,`Importer ${candidate?.recipes.length||0} recette(s) contrôlée(s)`);bind(b,'batch-commit');b.disabled=!candidate?.recipes.length;}if(/Annuler|Grimoire/.test(b.textContent)&&!b.dataset.cuAction)bind(b,'recipes');}
    const agree=document.createElement('label');agree.className='cu-check';agree.innerHTML='<input id="cu-batch-agree" type="checkbox"> Je confirme avoir contrôlé les recettes avant l’import.';$('main').append(agree);
    if(!$('[data-cu-action="batch-commit"]'))$('main').insertAdjacentHTML('beforeend',button('batch-commit','Importer les recettes contrôlées'));
  }
  function provisionCard(sample, item, key, data) {
    const card=sample.cloneNode(true);card.dataset.stitchComponent='.provision-card';card.dataset.state=data.state.shopChoice?.[key]==='skip'?'skip':'buy';
    const name=card.querySelector('.font-label-lg,.font-body-lg');text(name,item.name);
    const quantity=card.querySelector('.font-headline-sm,.font-headline-md');text(quantity,item.detail|| (item.qty==null?'Quantité à préciser':`${item.qty} ${item.unit}`));
    for(const span of card.querySelectorAll('span'))if(!span.children.length&&!span.classList.contains('material-symbols-outlined')&&span!==name&&span!==quantity)text(span,'');
    const buttons=card.querySelectorAll('button');buttons.forEach((b,i)=>{text(b,i===0?'À acheter':'Pas nécessaire');bind(b,'shop-choice',{key,value:i===0?'buy':'skip'});b.setAttribute('aria-pressed',String((data.state.shopChoice?.[key]||'buy')===(i===0?'buy':'skip')));});
    if(!buttons.length)card.insertAdjacentHTML('beforeend',button('shop-choice','À acheter',`data-key="${esc(key)}" data-value="buy"`)+button('shop-choice','Pas nécessaire',`data-key="${esc(key)}" data-value="skip"`));
    return card;
  }
  function renderShop(data) {
    const cards=$$('.provision-card');const sample=cards[0]?.cloneNode(true);if(!sample)throw Error('Carte de provision Stitch introuvable');
    const sections=new Set(cards.map(card=>card.closest('section')));const primary=[...sections][0];
    const list=$('#provisions-list')||cards[0].parentElement;list.replaceChildren();
    for(const item of data.draft)list.append(provisionCard(sample,item,'recipe:'+item.id,data));
    for(const [i,name]of(data.state.extras||[]).entries()){const card=provisionCard(sample,{name,detail:'Achat complémentaire'},'extra:'+i,data);card.insertAdjacentHTML('beforeend',button('remove-extra','Retirer cet ajout',`data-index="${i}"`));list.append(card);}
    for(const section of sections)if(section&&section!==primary&&!section.contains(list))section.remove();
    const menuCards=$$('main article').filter(el=>!el.closest('#provisions-list')&&!el.classList.contains('provision-card'));
    for(const card of menuCards)card.remove();
    text($('#badge-total-articles'),`${data.draft.length+(data.state.extras||[]).length} articles`);text($('#count-menu-items'),data.draft.length);text($('#count-manual-items'),data.state.extras?.length||0);text($('#estimated-cost'),'Non renseigné');
    for(const el of $$('main span'))if(!el.children.length&&/convives par service|festins de la semaine|ARTICLES & BESOINS|INGRÉDIENTS & BESOINS/.test(el.dataset.stitchText||el.textContent))text(el,`${data.pending} repas à couvrir`);
    bind($('#btn-hero-add'),'focus-extra');bind($('#btn-add-manual'),'focus-extra');bind($('#btn-submit-cart'),'validate-shop');text($('#btn-submit-text'),'Valider les courses');
    const form=document.createElement('form');form.id='cu-extra-form';form.className='cu-context';form.innerHTML=input('cu-extra','Autre achat à prévoir')+'<button type="submit" class="cu-button">Ajouter cet achat</button>';list.after(form);
    const tools=document.createElement('div');tools.className='cu-context';tools.innerHTML=button('shop-history','Historique des listes')+button(ui.view==='shop'?'shop-1':'shop','Autre disposition des provisions');form.after(tools);
    for(const chip of $$('[data-category]'))if(chip.tagName==='BUTTON'){bind(chip,'shop-filter',{category:chip.dataset.category});text(chip,chip.dataset.category==='all'?'Tous les articles':chip.textContent.replace(/\(.*?\)/,''));}
    for(const b of $$('main button,main a'))if(/Retour aux Menus|Retour aux Repas/.test(b.textContent))bind(b,'taverne');
    renderShared(data.shared||{connected:false,status:'Connectez le foyer pour le panier commun',items:[]},sample);
  }
  function renderShared(shared, sample) {
    const section=document.createElement('section');section.id='cu-shared';section.className='cu-context';section.innerHTML='<h2 class="font-headline-sm text-headline-sm">Panier commun du foyer</h2>';
    const status=document.createElement('p');status.textContent=shared.status;section.append(status);
    for(const message of shared.messages||[])section.append(empty(message));
    section.insertAdjacentHTML('beforeend',button('account',shared.connected?'Gérer mon foyer':'Connecter mon foyer'));
    if(shared.connected){
      section.insertAdjacentHTML('beforeend',button('family-import','Ajouter les ingrédients du planning au panier commun')+button('family-sync','Synchroniser'));
      const add=document.createElement('form');add.id='cu-family-add';add.innerHTML=input('cu-family-title','Nouvel article commun')+input('cu-family-quantity','Quantité','number')+input('cu-family-unit','Unité')+'<button class="cu-button" type="submit">Ajouter au foyer</button>';section.append(add);
      for(const item of shared.items){const card=sample.cloneNode(true);card.replaceChildren();card.dataset.stitchComponent='.provision-card';
        if(item.editing){card.innerHTML=`<form id="cu-family-edit" data-id="${esc(item.id)}">`+input('cu-edit-title','Article','text',item.fields.title)+input('cu-edit-quantity','Quantité','number',item.fields.quantity)+input('cu-edit-unit','Unité','text',item.fields.unit)+'<button class="cu-button" type="submit">Enregistrer</button>'+button('family-cancel','Annuler')+'</form>';}
        else {const title=document.createElement('strong');title.textContent=item.title;card.append(title);const qty=document.createElement('p');qty.textContent=item.quantity;card.append(qty);
          card.insertAdjacentHTML('beforeend',`<label class="cu-check"><input type="checkbox" data-cu-family-check="${esc(item.id)}" ${item.checked?'checked':''} ${item.conflict?'disabled':''}> Article acheté</label>`+
          (item.conflict?button('family-conflict-server','Garder la version du foyer',`data-id="${esc(item.id)}"`)+button('family-conflict-local','Garder ma version',`data-id="${esc(item.id)}"`):button('family-edit','Modifier',`data-id="${esc(item.id)}"`)+button('family-delete','Supprimer',`data-id="${esc(item.id)}"`)));}
        section.append(card);
      }
    }else section.append(empty('Les courses locales restent disponibles ci-dessus. La validation locale ne partage pas automatiquement les ingrédients.'));
    $('main').append(section);
  }
  function renderFinal(data) {
    const final=data.state.shopFinal;
    const list=$('#shopping-list-container');const sample=list.querySelector('.shop-item')?.cloneNode(true);if(!sample)throw Error('Article validé Stitch introuvable');
    replaceChildren(list,(final?.items||[]).map((item,i)=>{const row=sample.cloneNode(true);text(row.querySelector('.item-title'),item.name);text(row.querySelector('.item-subtitle'),item.detail);text(row.querySelector('.item-status'),item.done?'Dans le panier':'À acheter');row.classList.toggle('checked',Boolean(item.done));row.querySelector('.item-title').classList.toggle('line-through',Boolean(item.done));
      const b=row.querySelector('.check-btn');bind(b,'final-check',{index:String(i),checked:String(!item.done)});b.setAttribute('aria-label',(item.done?'Décocher ':'Cocher ')+item.name);row.querySelectorAll('.font-label-md').forEach(el=>{if(el!==row.querySelector('.item-title'))text(el,item.detail);});return markSource(row,'.shop-item');}));
    if(!final)list.append(empty('Aucune liste validée. Préparez vos courses puis validez-les.'));
    for(const b of $$('main button,main a'))if(/Retour aux Repas/.test(b.textContent))bind(b,'taverne');
    const count=final?.items.filter(item=>item.done).length||0,total=final?.items.length||0;
    text($('#progress-count-text'),`${count} / ${total} articles trouvés`);text($('#remaining-count-text'),`${total-count} articles restants`);$('#progress-bar-fill').style.width=(total?count/total*100:0)+'%';
    for(const el of $$('main span'))if(!el.children.length&&/Validée le|repas couverts|ARTICLES PRÊTS/.test(el.dataset.stitchText||el.textContent))text(el,final?`${final.meals.length} repas couverts · ${new Date(final.validatedAt).toLocaleString('fr-BE')}`:'Aucune liste validée');
    for(const b of $$('main button,main a')){if(/Modifier|Déverrouiller|préparation/i.test(b.textContent))bind(b,'edit-shop');if(/Copier|Exporter|Partager/i.test(b.textContent))bind(b,'export-final');if(/Historique|registre/i.test(b.textContent))bind(b,'shop-history');}
    if(!$('[data-cu-action="edit-shop"]'))$('main').insertAdjacentHTML('beforeend',button('edit-shop','Modifier la préparation')+button('export-final','Copier la liste')+button('shop-history','Historique des listes'));
  }
  function renderHistory(data) {
    const articles=$$('main article');const sample=articles[0]?.cloneNode(true);const list=articles[0]?.parentElement;if(!sample||!list)throw Error('Archive Stitch introuvable');
    articles.forEach(el=>el.remove());
    for(const [id,entry]of Object.entries(data.state.shopHistory||{}).reverse()){
      const card=sample.cloneNode(true);text(card.querySelector('h3,h4'),new Date(entry.validatedAt).toLocaleString('fr-BE'));const desc=card.querySelector('p');text(desc,`${entry.items.length} articles · ${entry.meals.length} repas couverts`);
      for(const el of card.querySelectorAll('span'))if(!el.children.length&&!el.classList.contains('material-symbols-outlined'))text(el,`${entry.items.filter(i=>i.done).length} / ${entry.items.length}`);
      const controls=card.querySelectorAll('button');controls.forEach((b,i)=>{text(b,i?'Reprendre les articles':'Consulter la liste');bind(b,i?'history-reuse':'history-open',{id});});list.append(markSource(card,'history article'));
    }
    if(!Object.keys(data.state.shopHistory||{}).length)list.append(empty('Aucune liste de courses archivée.'));
    const selected=data.state.shopHistory?.[ui.historyId];
    if(selected){const section=document.createElement('section');section.className='cu-context';section.dataset.e072Archive='';section.innerHTML='<h2>Articles archivés</h2>'+selected.items.map(item=>'<p>'+esc(item.name)+' — '+esc(item.detail||'À préciser')+'</p>').join('');list.prepend(section);}

    const recent=heading('Liste en Cours')?.closest('section');
    if(recent){
      const final=data.state.shopFinal;
      for(const el of recent.querySelectorAll('*')){
        for(const node of [...el.childNodes])if(node.nodeType===3&&/potimarron|Risotto|butternut/i.test(node.textContent))node.textContent=' Articles de la liste validée DOBBY.';
        if(!el.children.length&&!el.classList.contains('material-symbols-outlined')&&/Validée le|articles au total|vivres|festins couverts|prélevés|Cabas en main/.test(el.dataset.stitchText||el.textContent))text(el,final?`${final.items.length} articles · ${final.meals.length} repas · ${new Date(final.validatedAt).toLocaleDateString('fr-BE')}`:'Aucune liste en cours');
      }
      for(const b of recent.querySelectorAll('button,a'))bind(b,/modifier|Déverrouiller/.test(b.textContent)?'edit-shop':'shop-final');
    }
    for(const link of $$('main [data-path="preparer-liste"]'))bind(link,'edit-shop');for(const b of $$('main button')){if(/Déverrouiller|modifier la préparation/i.test(b.textContent))bind(b,'edit-shop');}
    for(const b of $$('main button'))if(/Purger/.test(b.textContent)){text(b,'Exporter les archives (aucun effacement)');bind(b,'export-history');}
  }
  function bindForms() {
    document.addEventListener('submit',event=>{
      if(!['recipe-form','cu-extra-form','cu-family-add','cu-family-edit'].includes(event.target.id))return;
      event.preventDefault();event.stopImmediatePropagation();
      const id=event.target.id;
      Promise.resolve().then(async()=>{
        if(id==='recipe-form')return extraAction('save-recipe',event.submitter||event.target,E.read());
        if(id==='cu-extra-form'){E.shop('addextra',{value:$('#cu-extra').value});return render();}
        const prefix=id==='cu-family-add'?'cu-family-':'cu-edit-';
        E.family(id==='cu-family-add'?'add':'edit',null,Object.fromEntries(['title','quantity','unit'].map(key=>[key,$('#'+prefix+key).value])));
        await new Promise(resolve=>setTimeout(resolve,50));await render();
      }).catch(error=>notice(error.message,true));
    },true);
    document.addEventListener('change',event=>{
      if(event.target.id==='cu-batch-file'){ui.batchName=event.target.files[0]?.name;ui.batchChoices={};busy=true;E.batch(event.target.files).then(candidate=>{if(!candidate)notice('Le fichier n’a pas pu être validé.',true);return render();}).catch(error=>notice(error.message,true)).finally(()=>busy=false);}
      if(event.target.dataset.cuCollision!==undefined)ui.batchChoices[event.target.dataset.cuCollision]=event.target.value;
      if(event.target.dataset.cuFamilyCheck){E.familyCheck(event.target.dataset.cuFamilyCheck,event.target.checked);setTimeout(()=>refresh(),100);}
    });
  }
  async function extraAction(action,el,data) {
    if(action==='ingredient-help'){notice('Saisissez une ligne par ingrédient : quantité ; unité ; nom. Saisissez uniquement le nom si la quantité est inconnue.');return;}
    if(action==='edit-recipe'){const r=data.recipes.find(r=>r.id===ui.recipe);ui.editId=data.customIds.includes(r.id)?r.id:null;ui.recipeDraft={name:ui.editId?r.name:r.name+' (copie)',servings:r.servings,minutes:r.minutes,category:r.category,device:r.thermomix?'tm5':'classic',ingredients:r.ingredients.map(ingredientLine).join('\n'),steps:r.steps};return open('recipe-add');}
    if(action==='recipe-portions'){const field=$('#cu-recipe-servings');field.value=Math.max(1,Math.min(30,Number(field.value)+Number(el.dataset.delta)));return;}
    if(['recipe-device','recipe-category','add-step','remove-step'].includes(action)){ui.recipeDraft=readRecipeDraft();if(action==='recipe-device')ui.recipeDraft.device=el.dataset.device;if(action==='recipe-category')ui.recipeDraft.category=el.dataset.category;if(action==='add-step')ui.recipeDraft.steps.push('');if(action==='remove-step'&&ui.recipeDraft.steps.length>1)ui.recipeDraft.steps.splice(Number(el.dataset.index),1);return render();}
    if(action==='save-recipe'){
      const draft=readRecipeDraft(),source=ui.editId?data.recipes.find(r=>r.id===ui.editId):null,enriched=!!source;
      const ingredients=enriched&&draft.ingredients===source.ingredients.map(ingredientLine).join('\n')?source.ingredients.map(([name,quantity,unit])=>({name,quantity,unit})):draft.ingredients.split('\n').filter(line=>line.trim()).map(line=>{const parts=line.split(';').map(s=>s.trim());if(parts.length===1)return{name:parts[0],quantity:null,unit:''};const unknown=enriched&&parts[0]==='?',quantity=unknown?null:Number((parts[0]||'').replace(',','.'));if(!unknown&&(!Number.isFinite(quantity)||quantity<=0))throw Error('Quantité invalide. Renseignez une quantité positive, ou le nom seul si elle est inconnue.');return{name:parts.slice(2).join('; '),quantity,unit:parts[1]||''};});
      const record={name:draft.name,minutes:draft.minutes,servings:draft.servings,device:draft.device,category:draft.category,ingredients,steps:draft.steps,...(!ui.editId?{reviewed:false,source:'Saisie dans DOBBY'}:{})};if(enriched){if(draft.minutes!==null&&(!Number.isFinite(draft.minutes)||draft.minutes<0||draft.minutes>1440)||draft.preparation!==null&&(!Number.isFinite(draft.preparation)||draft.preparation<0||draft.preparation>1440)){notice('Renseignez une durée valide, ou laissez le champ vide si elle est inconnue.',true);return;}record.durations={total:draft.minutes,preparation:draft.preparation};}
      const result=E.saveRecipe({format:'dobby-recipes',version:enriched?2:1,recipes:[record]},ui.editId);
      if(result.errors.length){notice(result.errors.join('\n'),true);return;}ui.recipeDraft=null;ui.editId=null;ui.recipeSaved=true;return open('recipe',{id:result.id});
    }
    if(action==='cook-prev'||action==='cook-next'){E.cook(ui.recipe,action==='cook-prev'?'stepback':'stepnext');if(!E.read().state.cook)return open('recipe');return render();}
    if(action==='cook-jump'){E.cook(ui.recipe);const current=E.read().state.cookStep;for(let i=current;i<Number(el.dataset.index);i++)E.cook(ui.recipe,'stepnext');for(let i=current;i>Number(el.dataset.index);i--)E.cook(ui.recipe,'stepback');return render();}
    if(action==='timer-add'){ui.timer+=Number(el.dataset.seconds);return render();}
    if(action==='timer'){if(timerId){clearInterval(timerId);timerId=null;}else if(ui.timer>0){timerId=setInterval(()=>{ui.timer=Math.max(0,ui.timer-1);text($('#timer-display'),`${String(Math.floor(ui.timer/60)).padStart(2,'0')}:${String(ui.timer%60).padStart(2,'0')}`);if(!ui.timer){clearInterval(timerId);timerId=null;notice('Le minuteur est terminé. Vérifiez la cuisson.');}},1000);}return render();}
    if(action==='tm-edit'||action==='tm-view'){ui.tmDraft=$$('#cu-tm-steps > div').map((row,i)=>({text:row.querySelector('textarea').value,...Object.fromEntries(['tool','time','temp','speed'].map(key=>[key,$('#cu-tm-'+key+'-'+i).value])),reverse:$('#cu-tm-reverse-'+i).checked}));ui.tmEditing=action==='tm-edit';return render();}
    if(action==='save-tm'){const steps=$$('#cu-tm-steps > div').map((row,i)=>({text:row.querySelector('textarea').value,...Object.fromEntries(['tool','time','temp','speed'].map(key=>[key,$('#cu-tm-'+key+'-'+i).value])),reverse:$('#cu-tm-reverse-'+i).checked}));ui.tmDraft=steps;if(E.saveTM(ui.recipe,steps,$('#cu-tm-verified').checked)){ui.tmDraft=null;ui.tmEditing=false;notice('Adaptation TM5 enregistrée.');return render();}return;}
    if(action==='choose-batch')return $('#cu-batch-file').click();
    if(action==='batch-example'){E.win().document.querySelector('[data-action="batchExample"]')?.click();return;}
    if(action==='batch-commit'){if(!$('#cu-batch-agree').checked){notice('Confirmez le contrôle du lot avant l’import.',true);return;}E.commitBatch(ui.batchChoices||{});if(!E.read().batch)return open('recipes');return render();}
    if(action==='shop-choice'){E.shop('shopchoice',{dataset:{key:el.dataset.key,value:el.dataset.value}});return render();}
    if(action==='remove-extra'){E.shop('rmextra',{dataset:{idx:el.dataset.index}});return render();}
    if(action==='focus-extra'){$('#cu-extra').focus();$('#cu-extra-form').scrollIntoView({block:'center'});return;}
    if(action==='validate-shop'){E.shop('validateshop');return open('shop-final');}
    if(action==='edit-shop')return open('shop');
    if(action==='final-check'){E.finalCheck(Number(el.dataset.index),el.dataset.checked==='true');return render();}
    if(action==='export-final'){E.shop('exportfinal');return;}
    if(action==='history-open'){ui.historyId=el.dataset.id;return render();}
    if(action==='history-reuse'){const items=data.state.shopHistory[el.dataset.id].items;if(!window.confirm('Ajouter ces articles à la liste active ?\n'+items.map(x=>x.name+' — '+(x.detail||'À préciser')).join('\n')))return;await window.DobbyCuisineList.reuse(E,el.dataset.id);return open('shop');}
    if(action==='export-history'){E.evaluate('downloadJson("dobby-historique-courses.json",st.shopHistory);');return;}
    if(action==='shop-filter'){const category=el.dataset.category;for(const card of $$('.provision-card'))card.hidden=category!=='all'&&card.dataset.category!==category;for(const group of $$('[data-e07-category]'))group.hidden=category!=='all'&&group.dataset.e07Category!==category;return;}
    const familyActions={'family-import':'import','family-sync':'sync','family-edit':'edit','family-delete':'delete','family-cancel':'cancel-edit','family-conflict-server':'conflict-server','family-conflict-local':'conflict-local'};
    if(familyActions[action]){E.family(familyActions[action],el.dataset.id);await new Promise(resolve=>setTimeout(resolve,50));return render();}
  }
  return Object.freeze({init,open,refresh,recipeVisual,get ready(){return ready},get view(){return ui.view},handles:route=>['plan','pick','recipes','shop'].includes(route)});
})();
