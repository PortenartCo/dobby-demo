/* Native E05 profile, modal confirmations and confirmed rune ledger.
 * A fictional parent is explicit in the native frame only; the top-level app
 * retains its actual V7 modal flow. Canonical writes/scoring/storage stay native.
 * Local original Stitch art must not be presented as an official crest. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765',out=process.env.DOBBY_E05_EVIDENCE_DIR||path.resolve(__dirname,'../../docs/dobby-v7/evidence/consolidation/e05');
const member={id:'e05-review',name:'TEST — Camille',memberCategory:'parent',avatar:'🌿',birthdate:'',magicProfile:{version:1,houseId:'slytherin',patronusId:'fox',avatarId:'portrait-1'}};
const credits=[{missionId:'e05-major',memberId:member.id,effort:'major',amount:50,date:'2026-11-10T12:00:00.000Z',title:'TEST — Préparer le repas',revision:0},{missionId:'e05-regular',memberId:member.id,effort:'regular',amount:25,date:'2026-11-09T12:00:00.000Z',title:'TEST — Ranger les livres',revision:0},{missionId:'e05-light',memberId:member.id,effort:'light',amount:10,date:'2026-11-08T12:00:00.000Z',title:'TEST — Arroser les plantes',revision:0}];
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{for(const width of process.env.DOBBY_E05_WIDTHS?process.env.DOBBY_E05_WIDTHS.split(',').map(Number):[320,390,1440]){const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',reducedMotion:'reduce'});await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());await context.addInitScript(()=>{if(location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))window.DobbyReview={demoMemberId:'e05-review',fixture:'e05-profile-native-modal'};});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
 const native=(code,values={})=>page.evaluate(({code,values})=>DobbyFamilyStitchEngine.evaluate(code,values),{code,values});
 await native('st.familyMembers=[p.member];st.runeCredits=p.credits;st.runeRequests=[];save();',{member,credits});await page.evaluate(id=>DobbyFamilyStitch.open('personal',{person:id,record:null}),member.id);await page.locator('[data-profile-member=e05-review]').waitFor();
 if(process.env.DOBBY_CAPTURE_BEFORE==='1'){await page.locator('[data-rune-profile] details').evaluate(e=>e.open=true);await page.screenshot({path:path.join(out,'before-'+width+'.png'),fullPage:true});await context.close();continue;}
 assert.match(await page.locator('.mp-house').innerText(),/Salazar Serpentard/,'The selected house explains its founder');
 assert.match(await page.locator('.mp-house').innerText(),/Poudlard/,'The house explains its origin');
 assert.match(await page.locator('.mp-patronus').innerText(),/adaptation/i,'Fox protective symbolism is visible');
 assert.equal(await page.locator('.mp-house svg').count(),0,'No redrawn crest is passed off as an official crest');
 const crest=page.locator('.mp-house img[data-house-crest="slytherin"]');
 assert.equal(await crest.count(),1,'The canonical local house illustration is rendered');
 assert.equal(await crest.getAttribute('data-art-origin'),'stitch-original');
 assert.match(await crest.getAttribute('alt'),/Blason original Stitch/,'Original art is not presented as an official crest');
 const art=await crest.evaluate(async image=>{await image.decode();return{width:image.naturalWidth,height:image.naturalHeight,url:image.src};});
 assert.equal(art.width,1024);assert.equal(art.height,1024);assert.equal(new URL(art.url).origin,origin);assert.match(new URL(art.url).pathname,/\/assets\/ceremony-v2\/house-slytherin\.png$/);
 assert.equal(await page.locator('.mp-grade-art svg').count(),1,'A large illustrated native grade is present');
 assert.match(await page.locator('[data-rune-profile]').innerText(),/Pastille d’argent/);assert.equal(await page.locator('[data-rune-profile] progress').getAttribute('max'),'50');assert.equal(await page.locator('[data-rune-profile] progress').getAttribute('value'),'35');assert.match(await page.locator('[data-rune-profile]').innerText(),/15 runes avant Pastille d’or/);
 await page.locator('[data-rune-profile] details').evaluate(e=>e.open=true);for(const credit of credits)assert.match(await page.locator('[data-rune-profile] details').innerText(),new RegExp(credit.title));
 assert.equal(await page.locator('main').evaluate(e=>e.scrollWidth<=e.clientWidth),true);await page.screenshot({path:path.join(out,'after-'+width+'.png'),fullPage:true});
 async function chooseMagic(kind,id){
  const field=kind==='house'?'houseId':'patronusId',section=page.locator(kind==='house'?'.mp-house':'.mp-patronus');
  const before=await native('return st.familyMembers[0].magicProfile;');
  await section.getByRole('button',{name:'Refaire le test',exact:true}).click();
  const dialog=page.locator('#dobby-ceremonies[open]');await dialog.waitFor();
  await dialog.getByRole('button',{name:'Choisir directement',exact:true}).click();
  await dialog.locator('[data-ceremony-choice]').first().waitFor();
  assert.equal(await dialog.locator('[data-ceremony-choice]').count(),kind==='house'?4:12);
  await dialog.locator('[data-ceremony-choice="'+id+'"]').click();
  const confirm=dialog.getByRole('button',{name:kind==='house'?'Confirmer ma Maison':'Confirmer mon Patronus',exact:true});await confirm.waitFor();
  assert.deepEqual(await native('return st.familyMembers[0].magicProfile;'),before,'Unconfirmed selection cannot rewrite the canonical identity');
  await confirm.click();await dialog.waitFor({state:'detached'});
  await page.waitForFunction(({field,id})=>DobbyFamilyStitchEngine.read().members[0].magicProfile[field]===id,{field,id});
  if(kind==='house')await page.waitForFunction(id=>document.querySelector('main')?.dataset.magicTheme===id,id);
  else await page.locator('.mp-patronus [data-media-id="'+id+'"]').waitFor();
  const saved=await native('return st.familyMembers[0];');
  assert.equal(saved.id,member.id);assert.equal(saved.magicProfile[field],id);assert.equal(saved.magicProfile[kind==='house'?'houseSelectionSource':'patronusSelectionSource'],'manual');
  assert.deepEqual(await native('return st.runeCredits;'),credits,'Native magic confirmation never rewrites the reward ledger');
 }
 const houses=[['gryffindor','Godric Gryffondor'],['slytherin','Salazar Serpentard'],['ravenclaw','Rowena Serdaigle'],['hufflepuff','Helga Poufsouffle']];
 for(const[id,founder]of houses){await chooseMagic('house',id);assert.ok((await page.locator('.mp-house').innerText()).includes(founder),'House copy immediately follows the saved identity');}
 const animals=[['stag',/bois/],['otter',/eau/],['fox',/adaptation/],['wolf',/meute/],['cat',/félin/],['owl',/nocturne/],['horse',/herbivore/],['hare',/grandes oreilles/],['swan',/oiseau d’eau/],['lynx',/félin/],['badger',/terrier/],['dolphin',/mammifère marin/]];
 for(const[id,trait]of animals){await chooseMagic('patronus',id);assert.match(await page.locator('.mp-patronus').innerText(),trait,'Each selected animal immediately has its own description');}
 await page.reload();await page.waitForFunction(()=>DobbyFamilyStitch?.ready);assert.match(await page.locator('.mp-house').innerText(),/Helga Poufsouffle/);assert.match(await page.locator('.mp-patronus').innerText(),/mammifère marin/);assert.deepEqual(await native('return st.runeCredits;'),credits,'Descriptions and native edits never rewrite the confirmed reward ledger');
 if(width===390){const grades=[[0,'point','copper','Pastille de cuivre'],[50,'point','silver','Pastille d’argent'],[100,'point','gold','Pastille d’or'],[200,'point','diamond','Pastille de diamant'],[350,'star4','copper','Étoile à 4 branches cuivre'],[550,'star4','silver','Étoile à 4 branches argent'],[800,'star4','gold','Étoile à 4 branches or'],[1100,'star4','diamond','Étoile à 4 branches diamant'],[1500,'star8','copper','Étoile à 8 branches cuivre'],[2000,'star8','silver','Étoile à 8 branches argent'],[2600,'star8','gold','Étoile à 8 branches or'],[3300,'star8','diamond','Étoile à 8 branches diamant']];
  for(const[total,shape,material,label]of grades){const ledger=Array.from({length:total/50},(_,i)=>({missionId:'e05-grade-'+i,memberId:member.id,effort:'major',amount:50,date:'2026-11-10T12:00:00.000Z',title:'TEST — Mission '+i,revision:0}));await native('st.runeCredits=p.ledger;save();',{ledger});await page.evaluate(id=>DobbyFamilyStitch.open('personal',{person:id,record:null}),member.id);assert.equal(await page.locator('.mp-grade-art').getAttribute('data-rune-shape'),shape);assert.equal(await page.locator('.mp-grade-art').getAttribute('data-rune-material'),material);assert.ok((await page.locator('[data-rune-profile]').innerText()).includes(label));assert.match(await page.locator('.dobby-rune-total').innerText(),new RegExp('^'+total+' rune'));assert.equal(await page.locator('.mp-grade-art svg '+(shape==='point'?'circle':'polygon')).count()>=1,true);assert.deepEqual(await native('return st.runeCredits;'),ledger);}
  assert.equal(await page.locator('[data-rune-profile] progress').count(),0,'The highest native grade has no invented next threshold');assert.match(await page.locator('[data-rune-profile]').innerText(),/Dernier grade atteint/);
  // A legacy/incompatible ledger must keep the native diagnostic and profile
  // usable; decorating it must not turn the handled read error into a crash.
  await native('st.runeCredits=[{unsupported:"TEST incompatible ledger"}];');await page.evaluate(id=>DobbyFamilyStitch.open('personal',{person:id,record:null}),member.id);assert.match(await page.locator('[data-rune-profile]').innerText(),/Historique de runes indisponible/);assert.equal(await page.locator('.mp-house').getByRole('button',{name:'Refaire le test',exact:true}).isVisible(),true);assert.equal(await page.locator('.mp-house').getByRole('button',{name:'Refaire le test',exact:true}).isEnabled(),true,'A malformed ledger does not disable the native magic profile action');assert.deepEqual(await native('return st.runeCredits;'),[{unsupported:'TEST incompatible ledger'}],'Reading preserves the unsupported native data');
 }
 assert.deepEqual(errors,[]);await context.close();console.log('E05_CONSOLIDATION_PASS',width,'4 houses and12 animals via native modal confirmation, original local crest, native illustrated grade/progress, unchanged ledger and persisted identity');}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
