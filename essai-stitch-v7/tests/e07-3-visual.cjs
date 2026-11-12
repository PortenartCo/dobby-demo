/* E07.3 review comparisons. Real native data in an ephemeral browser context;
   before = immutable 66a1395, after = current source or the isolated preview. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const before = process.env.DOBBY_E073_VISUAL_BEFORE === '1';
const origin = process.env.DOBBY_TEST_ORIGIN || (before ? 'http://127.0.0.1:8895' : 'http://127.0.0.1:8894');
const app = process.env.DOBBY_E073_APP_PATH || '/essai-stitch-v7';
const widths = (process.env.DOBBY_E073_VISUAL_WIDTHS || '320,390,1440').split(',').map(Number);
const out = path.resolve(process.env.DOBBY_E073_VISUAL_EVIDENCE || path.join(__dirname, '../../docs/dobby-v7/evidence/e07-3/visual', before ? 'before' : 'after'));
const phase = before ? 'before' : 'after';
fs.mkdirSync(out, {recursive: true});

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  const results = [];
  try {
    for (const width of widths) {
      const context = await browser.newContext({viewport: {width, height: 900}, locale: 'fr-BE', timezoneId: 'Europe/Paris', reducedMotion: 'reduce'});
      await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
      const page = await context.newPage(), errors = [], captured = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(15000);
      const native = code => page.evaluate(code => DobbyCuisineEngine.evaluate(code), code);
      const ready = () => page.waitForFunction(() => window.DobbyCuisine?.ready);
      const open = async (view, values = {}) => {
        await page.evaluate(({view, values}) => DobbyCuisine.open(view, values), {view, values});
        await page.waitForFunction(view => DobbyCuisine.view === view && !document.documentElement.classList.contains('dv7-loading'), view);
      };
      const decoded = async () => page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].filter(image => image.getAttribute('src')).map(image => image.decode()));
        const urls = new Set([...document.querySelectorAll('main *')].flatMap(node =>
          [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)].map(match => match[1])));
        for (const url of urls) { const image = new Image(); image.src = url; await image.decode(); }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const geometry = async () => page.evaluate(() => {
        const visible = node => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0 && node.checkVisibility({checkOpacity: true, checkVisibilityCSS: true}); };
        const filters = [...document.querySelectorAll('#filters-container button')].filter(visible).map(node => {
          const box = node.getBoundingClientRect();
          return {label: node.textContent.trim(), left: box.left, right: box.right, top: box.top, height: box.height, font: parseFloat(getComputedStyle(node).fontSize)};
        });
        return {viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, filters,
          images: [...document.querySelectorAll('main img')].map(image => ({alt: image.alt, loaded: image.complete && image.naturalWidth > 0, width: image.naturalWidth, height: image.naturalHeight})),
          scrollAreas: [...document.querySelectorAll('main *')].filter(node => visible(node) && /auto|scroll/.test(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth + 1).map(node => ({id: node.id, class: node.className, width: node.clientWidth, content: node.scrollWidth}))};
      });
      const actionPaints = async () => page.locator('[data-e073-grimoire] button,[data-e07-basket] button').evaluateAll(nodes => {
        const rgb = value => { const values = value.match(/[\d.]+/g)?.map(Number); return values?.length >= 3 ? values.slice(0, 3) : null; };
        const luminance = color => color.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((total, value, i) => total + value * [.2126, .7152, .0722][i], 0);
        const contrast = (a, b) => { const left = luminance(a), right = luminance(b); return (Math.max(left, right) + .05) / (Math.min(left, right) + .05); };
        return nodes.map(node => {
          const style = getComputedStyle(node), box = node.getBoundingClientRect(), gradients = [...style.backgroundImage.matchAll(/rgba?\([^)]*\)/g)].map(match => rgb(match[0]));
          // Use every actual opaque gradient stop, or the solid control fill.
          // The minimum ratio is conservative for this gold linear gradient.
          const backgrounds = gradients.length ? gradients : [rgb(style.backgroundColor)];
          const leaves = [node, ...node.querySelectorAll('*')].filter(part => !part.classList.contains('material-symbols-outlined') && [...part.childNodes].some(child => child.nodeType === 3 && child.textContent.trim())).map(part => {
            const paint = getComputedStyle(part), text = [...part.childNodes].filter(child => child.nodeType === 3).map(child => child.textContent).join(' ').trim(), foreground = rgb(paint.color);
            return {text, font: parseFloat(paint.fontSize), color: paint.color, contrast: foreground && backgrounds.every(Boolean) ? Math.min(...backgrounds.map(background => contrast(foreground, background))) : null};
          });
          return {label: node.textContent.trim().replace(/\s+/g, ' '), height: box.height, font: parseFloat(style.fontSize), background: style.backgroundColor, gradient: style.backgroundImage, leaves};
        });
      });
      const shot = async (name, locator = null, fullPage = true) => {
        await decoded();
        const file = `${name}-${width}.png`;
        if (locator) await locator.screenshot({path: path.join(out, file), animations: 'disabled', scale: 'css'});
        else await page.screenshot({path: path.join(out, file), fullPage, animations: 'disabled', scale: 'css'});
        captured.push(file);
      };
      const group = title => page.getByRole('heading', {name: title, exact: true}).locator('..').locator('..').locator('..');
      const belowFixedHeader = locator => locator.evaluate(node => {
        const top = document.querySelector('body > header')?.getBoundingClientRect().height || 0;
        scrollTo(0, scrollY + node.getBoundingClientRect().top - top - 12);
      });
      const favoriteInk = async (id, enabled) => {
        const card = page.locator(`#recipes-list [data-cu-recipe="${id}"]`);
        await belowFixedHeader(card);
        const favorite = card.locator('[data-cu-action=favorite]');
        assert.equal(await favorite.getAttribute('aria-pressed'), String(enabled));
        const star = favorite.locator('svg,.material-symbols-outlined').first();
        const foreground = await star.evaluate(node => {
          const shape = node.querySelector('path'), style = getComputedStyle(shape || node);
          return shape ? (style.fill === 'none' ? style.stroke : style.fill) : style.color;
        });
        const bytes = await star.screenshot({animations: 'disabled', scale: 'css'});
        fs.writeFileSync(path.join(out, `favorite-${enabled ? 'on' : 'off'}-icon-${width}.png`), bytes);
        return page.evaluate(async ({base64, foreground}) => {
          const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const context = canvas.getContext('2d'); context.fillStyle = foreground; context.fillRect(0, 0, 1, 1);
          const target = context.getImageData(0, 0, 1, 1).data;
          context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let ink = 0;
          for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 200 && [0, 1, 2].every(channel => Math.abs(pixels[i + channel] - target[channel]) <= 30)) ink++;
          return {inkPixels: ink, totalPixels: image.width * image.height, inkFraction: ink / (image.width * image.height), width: image.width, height: image.height, foreground};
        }, {base64: bytes.toString('base64'), foreground});
      };
      await page.goto(origin + app + '/index.html#taverne');
      await ready();
      await native(`
        custom=[
          {id:'e073-visual-photo',name:'TEST — Recette avec photographie de fixture',image:'./assets/cuisine/b6fc15f0728183f4.jpg',minutes:30,servings:4,category:'Végétarien',fav:true,ingredients:[['TEST Courgettes',200,'g']],steps:['Laver les légumes.','Cuire.']},
          {id:'e073-visual-long',name:'TEST — Une recette familiale au nom volontairement long pour vérifier la lecture et les actions',emoji:'🍝',minutes:25,servings:4,category:'Traditionnel',fav:false,ingredients:[['TEST Pâtes',200,'g']],steps:['Préparer.','Cuire.']},
          {id:'e073-visual-missing',name:'TEST — Recette sans photo et sans durée renseignée',minutes:null,servings:2,category:'Dessert',fav:false,ingredients:[['TEST Fruit',null,'']],steps:['Préparer.']}
        ];st.customRecipes=custom;st.day='2026-11-11';st.planned={};st.extras=['TEST Pain'];st.shopChoice={};st.shopFinal=null;st.shopHistory={};
        st.tmAdaptations={'e073-visual-long':{steps:[{text:'TEST Préparer selon les indications disponibles.',tool:'Spatule',time:'',temp:'',speed:'',reverse:false}],verified:false,portions:4}};
        st.stitchPreferences={effects:false,sound:false};save();
      `);
      await page.evaluate(() => DobbyCuisine.refresh());
      await page.evaluate(() => scrollTo(0, 0));
      await shot('taverne-empty');
      await native(`
        st.planned={
          '2026-11-11-midi':{id:'e073-visual-photo',adult:2,children:1,childFactor:.65,status:'prévu'},
          '2026-11-11-soir':{id:'e073-visual-long',adult:2,children:0,childFactor:.65,status:'prévu'},
          '2026-11-13-midi':{id:'e073-visual-photo',adult:1,children:0,childFactor:.65,status:'prévu'},
          '2026-11-15-soir':{id:'e073-visual-missing',adult:1,children:1,childFactor:.65,status:'prévu'}
        };save();
      `);
      const protectedData = await native('return JSON.stringify({day:st.day,recipes:custom,planned:st.planned,adaptations:st.tmAdaptations});');
      await page.evaluate(() => DobbyCuisine.refresh());
      await page.evaluate(() => scrollTo(0, 0));
      await shot('taverne-planned');
      await shot('taverne-meals', page.locator('[data-e07-dinner]'));
      await belowFixedHeader(page.locator('[data-e07-week]'));
      await shot('taverne-week', null, false);
      await group('Le Grimoire').scrollIntoViewIfNeeded();
      await shot('taverne-links', null, false);
      const taverne = await geometry();
      const actions = await actionPaints();
      if (!before) {
        assert.equal(await page.locator('[data-e07-dinner] [data-e073-meal-slot]').count(), 2);
        assert.equal(await page.locator('[data-e07-week-day]').count(), 7);
        assert.equal(await page.locator('[data-e073-week-detail] [data-e073-meal-slot]').count(), 2);
        assert.equal(taverne.documentWidth, width, 'No horizontal overflow on Taverne');
        assert.equal(actions.length, 4, 'Two Grimoire cards and the add/basket actions remain accessible');
        assert.ok(actions.every(action => action.font >= 16 && action.height >= 44), 'Readable and touch sized Taverne actions');
        assert.ok(actions.flatMap(action => action.leaves).every(leaf => leaf.font >= 14 && leaf.contrast >= 4.5), 'Actual action labels/counters remain legible with WCAG AA contrast');
      }

      await open('recipes', {filter: 'all'});
      await page.evaluate(() => scrollTo(0, 0));
      await shot('recipes-full');
      const hero = page.locator('[data-e073-recipes-hero]');
      await shot('recipes-hero', await hero.count() ? hero : page.locator('main img').first().locator('..'));
      await page.evaluate(() => scrollTo(0, 0));
      await shot('recipes-intro', null, false);
      await belowFixedHeader(page.locator('#recipe-search'));
      await shot('recipes-catalogue', null, false);
      await shot('recipes-card', page.locator('#recipes-list .recipe-card').first());
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await shot('recipes-footer', null, false);
      const catalogue = await geometry();
      let favoritePaints = null;
      if (!before) {
        assert.equal(catalogue.documentWidth, width, 'No horizontal overflow in the Grimoire');
        assert.deepEqual(catalogue.scrollAreas, [], 'No compulsory horizontal scroll area');
        assert.ok(catalogue.filters.length >= 6, 'Useful filters remain rendered');
        assert.ok(catalogue.filters.every(filter => filter.left >= -1 && filter.right <= width + 1 && filter.height >= 44), 'Every filter is visible within the viewport and touch sized');
        assert.equal(await page.locator('[data-e073-recipes-title]').innerText(), 'Mes recettes');
        assert.equal(await page.locator('[data-cu-action=new-recipe]').count(), 1, 'One principal creation entry');
        assert.doesNotMatch(await page.locator('main').innerText(), /Sanctuaire culinaire|Mémoire iPhone|Guide des Fourneaux du Logis|Sauvegarder ou enrichir le Grimoire|Inscription Manuelle|Importer lot JSON/i);
        const back = await page.locator('[data-e073-taverne-return]').evaluate(node => {
          const box = node.getBoundingClientRect(), parent = node.parentElement.getBoundingClientRect(), style = getComputedStyle(node);
          return {height: box.height, width: box.width, parent: parent.width, marginLeft: parseFloat(style.marginLeft), marginRight: parseFloat(style.marginRight), font: parseFloat(style.fontSize), weight: Number(style.fontWeight)};
        });
        assert.ok(back.height >= 52 && back.height <= 56 && back.font >= 16 && back.font <= 18 && back.weight >= 600, 'Readable gold return action: ' + JSON.stringify(back));
        assert.ok(Math.abs(back.width + back.marginLeft + back.marginRight - back.parent) <= 2, 'Full content width return action, allowing the shared page gutters: ' + JSON.stringify(back));
        favoritePaints = {on: await favoriteInk('e073-visual-photo', true), off: await favoriteInk('e073-visual-long', false)};
        assert.ok(favoritePaints.on.inkFraction > .15 && favoritePaints.on.inkFraction > favoritePaints.off.inkFraction * 1.25, 'The favorite star is visibly filled, not merely assigned a class or an unsupported font axis: ' + JSON.stringify(favoritePaints));
      }
      await open('recipes', {filter: 'fav'});
      await page.evaluate(() => scrollTo(0, 0));
      await shot('recipes-favorites');
      await open('recipes', {filter: 'all'});
      await page.locator('#recipe-search').fill('TEST AUCUNE RECETTE INEXISTANTE');
      await page.waitForFunction(() => document.querySelector('#recipes-list')?.textContent.includes('Aucune recette'));
      await page.evaluate(() => scrollTo(0, 0));
      await shot('recipes-empty');
      assert.equal(await native('return JSON.stringify({day:st.day,recipes:custom,planned:st.planned,adaptations:st.tmAdaptations});'), protectedData, 'Reading/filtering/capturing never changes native planning, recipes or adaptations');
      assert.deepEqual(errors, []);
      results.push({width, phase, status: 'PASS', origin, app, captured, taverne, actions, catalogue, favoritePaints, protectedData: 'unchanged', imagesDecoded: true, fixture: 'explicit TEST recipes, isolated native state; no real family account'});
      await context.close();
      console.log('E073_VISUAL_PASS', phase, width, captured.length + ' decoded comparisons; native data unchanged');
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
