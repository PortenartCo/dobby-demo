/* E02 review: real UI/native writers/IDB; speech hardware and authenticated identity are simulated. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765',appPath=process.env.DOBBY_E02_APP_PATH||'/essai-stitch-v7';
const out=process.env.DOBBY_E02_EVIDENCE_DIR||path.resolve(__dirname,'../../docs/dobby-v7/evidence/consolidation/e02');
async function install(context){
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 await context.addInitScript(()=>{
  if(location.pathname.includes('essai-stitch-v5-famille/index.html')){
   window.__e02Identity={userId:'TEST-review-A',householdId:'TEST-review-household'};let nativeAPI;
   Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,get:()=>nativeAPI,set:api=>{nativeAPI={...api,getContext:()=>({...window.__e02Identity,memberId:'TEST-chat-parent',identityVerified:true}),access:{...api.access,state:()=>({...api.access.state(),...window.__e02Identity,verified:true,memberId:'TEST-chat-parent',profile:{id:'TEST-chat-parent'},permissions:{canEdit:true}})}};}});
  }
  if(!location.pathname.includes('essai-stitch-v5-famille/')){
   window.__e02Speech={instances:[],spoken:[],failStart:false};
   class Recognition{
    constructor(){__e02Speech.instances.push(this);}
    start(){if(__e02Speech.failStart)throw Error('TEST browser blocks start');queueMicrotask(()=>this.onstart?.());}
    stop(){if(!__e02Speech.deferStop)this.onend?.();}
    abort(){this.onend?.();}
   }
   window.SpeechRecognition=Recognition;
   window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{name:'TEST français',lang:'fr-FR'}],cancel(){},speak(message){__e02Speech.spoken.push(message);message.onstart?.();}}});
  }
 });
}
async function ready(page){await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&window.DobbyFamilyStitch?.ready&&!document.querySelector('#user-input')?.disabled);await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate("if(!st.familyMembers.some(m=>m.id==='TEST-chat-parent')){st.familyMembers.push({id:'TEST-chat-parent',name:'TEST Parent Chat',memberCategory:'parent'});save();}"));}
async function decoded(page){await page.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(image=>image.decode().catch(()=>{}))]));}
const input=page=>page.locator('#user-input'),button=(page,name)=>page.locator('[data-fa-action="rg-chat-'+name+'"]');
const status=page=>page.locator('[data-e02-status]').textContent();
const result=(page,rows)=>page.evaluate(rows=>__e02Speech.instances.at(-1).onresult?.({resultIndex:0,results:rows.map(row=>Object.assign([{transcript:row.text,confidence:.9}],{isFinal:row.final}))}),rows);
const end=page=>page.evaluate(()=>__e02Speech.instances.at(-1).onend?.());
const error=(page,value)=>page.evaluate(value=>__e02Speech.instances.at(-1).onerror?.({error:value}),value);
const native=(page,code)=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
async function send(page,text){if(text!==undefined)await input(page).fill(text);await button(page,'send').click();await page.waitForFunction(()=>!DobbyChat.busy);}
async function voiceCases(page){
 const count=()=>page.locator('[data-e02-message=user]').count();
 await page.evaluate(()=>DobbyCuisineList.snapshot(DobbyFamilyStitchEngine));
 const initial=await native(page,'return JSON.stringify({items:st.shopFinal.items,history:st.shopHistory});');
 await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});
 await page.waitForFunction(()=>document.querySelector('[data-fa-action=rg-chat-voice]').getAttribute('aria-pressed')==='true');
 await result(page,[{text:'acheter du lait TEST MULTISEGMENT',final:true}]);
 await page.waitForFunction(()=>!DobbyChat.busy);
 assert.equal(await count(),0,'a first final segment must remain a draft until explicit Send');
 assert.match(await input(page).inputValue(),/lait TEST MULTISEGMENT/);
 assert.equal(await native(page,'return JSON.stringify({items:st.shopFinal.items,history:st.shopHistory});'),initial,'dictation must not mutate groceries');
 await result(page,[{text:'acheter du lait TEST MULTISEGMENT',final:true},{text:'et du pain',final:false}]);
 await result(page,[{text:'acheter du lait TEST MULTISEGMENT',final:true},{text:'et du pain',final:true}]);
 assert.equal(await input(page).inputValue(),'acheter du lait TEST MULTISEGMENT et du pain');
 await result(page,[{text:'acheter du lait TEST MULTISEGMENT',final:true},{text:'et du pain',final:true}]);
 assert.equal(await input(page).inputValue(),'acheter du lait TEST MULTISEGMENT et du pain','cumulative duplicate callbacks do not append twice');
 await page.evaluate(()=>{window.__e02OldResult=__e02Speech.instances.at(-1).onresult;window.__e02OldEnd=__e02Speech.instances.at(-1).onend;});
 await end(page);
 assert.equal(await count(),0,'natural browser end must never send a partial message');
 assert.equal(await input(page).inputValue(),'acheter du lait TEST MULTISEGMENT et du pain');
 assert.equal(await button(page,'resume').count(),0,'no click-toggle resume control');
 await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});
 await result(page,[{text:'pour demain',final:true}]);
 assert.equal(await input(page).inputValue(),'acheter du lait TEST MULTISEGMENT et du pain pour demain');
 await page.evaluate(()=>{__e02OldResult?.({resultIndex:0,results:[Object.assign([{transcript:'SECRET OLD CALLBACK'}],{isFinal:true})]});__e02OldEnd?.();});
 assert.equal(await input(page).inputValue(),'acheter du lait TEST MULTISEGMENT et du pain pour demain','callbacks from the previous microphone run must be ignored');
 await button(page,'voice').dispatchEvent('pointerup',{pointerId:1});
 assert.equal(await count(),0,'Stop keeps the draft without sending');
 await page.screenshot({path:path.join(out,'dictation-paused-simulated-390.png')});
 await button(page,'abort').click();
 assert.equal(await input(page).inputValue(),'','Cancel explicitly restores the draft from before dictation');
 await input(page).fill('TEXTE AVANT DICTÉE');
 await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});
 await result(page,[{text:'phrase reconnue',final:false}]);
 await error(page,'network');
 assert.equal(await input(page).inputValue(),'TEXTE AVANT DICTÉE phrase reconnue','network interruption preserves interim text');
 assert.match(await status(page),/conserv|brouillon/i);
 assert.equal(await count(),0);
 await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});
 await result(page,[{text:'suite reconnue',final:true}]);
 await button(page,'voice').dispatchEvent('pointerup',{pointerId:1});
 assert.equal(await input(page).inputValue(),'TEXTE AVANT DICTÉE phrase reconnue suite reconnue');
 await button(page,'abort').click();
 assert.equal(await input(page).inputValue(),'TEXTE AVANT DICTÉE');
 await input(page).fill('');
 await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});await result(page,[{text:'première version',final:false}]);
 await page.evaluate(()=>{window.__e02BeforeEdit=__e02Speech.instances.at(-1).onresult;__e02Speech.deferStop=true;});
 await input(page).fill('Texte corrigé à la main');
 await page.evaluate(()=>__e02BeforeEdit?.({resultIndex:0,results:[Object.assign([{transcript:'ancienne transcription tardive'}],{isFinal:true})]}));
 assert.equal(await input(page).inputValue(),'Texte corrigé à la main','late recognition cannot overwrite an explicit manual edit');
 await page.evaluate(()=>__e02Speech.deferStop=false);
 await button(page,'abort').click();
 for(const name of ['no-speech','not-allowed','service-not-allowed','audio-capture','aborted']){
  await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});await result(page,[{text:'TRANSCRIPTION '+name,final:false}]);await error(page,name);
  assert.equal(await input(page).inputValue(),'TRANSCRIPTION '+name,`${name} keeps recognized text`);assert.equal(await count(),0);
  await button(page,'abort').click();
 }
 await page.evaluate(()=>__e02Speech.failStart=true);await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});
 assert.match(await status(page),/pas pu démarrer/i);assert.equal(await count(),0);
 await page.evaluate(()=>__e02Speech.failStart=false);await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});
 await result(page,[{text:'acheter du lait TEST EXPLICITE',final:true}]);
 await end(page);assert.equal(await count(),0);
 await page.locator('[data-e01-toggle=sound]').click();
 await send(page);
 assert.equal(await count(),1,'only explicit Send creates the exchange');
 const added=await native(page,'return st.shopFinal.items.filter(item=>item.name==="lait TEST EXPLICITE");');
 assert.equal(added.length,1,'explicit dictated request reaches the native shared grocery adapter');
 assert.equal(await page.evaluate(()=>__e02Speech.spoken.length),1,'explicitly sent dictation follows the shared Sound preference');
 assert.match(await native(page,'return localStorage.getItem(key);'),/lait TEST EXPLICITE/,'native storage confirms the result');
 const storageEvidence=await page.evaluate(async()=>{
  const frame=DobbyFamilyStitchEngine.win(),raw=frame.Storage.prototype.__reviewRaw,nativeKey=DobbyFamilyStitchEngine.evaluate('return key;'),prefix=window.DobbyReviewConfig?.storagePrefix||'';
  const physicalKey=prefix+nativeKey,physicalValue=raw?raw.getItem.call(frame.localStorage,physicalKey):frame.localStorage.getItem(nativeKey);
  return {prefix,nativeKey,physicalKey,containsWrittenGrocery:physicalValue?.includes('lait TEST EXPLICITE')===true,databaseNames:(await frame.indexedDB.databases()).map(row=>row.name)};
 });
 assert.equal(storageEvidence.containsWrittenGrocery,true,'the written item exists under the actual prefixed native key');
 if(storageEvidence.prefix)assert.ok(storageEvidence.databaseNames.every(name=>name.startsWith(storageEvidence.prefix)),'bundle databases use the isolated preview prefix');
 await send(page,'acheter du lait TEST EXPLICITE');
 assert.equal((await native(page,'return st.shopFinal.items.filter(item=>item.name==="lait TEST EXPLICITE");')).length,1,'duplicate request does not add another item');
 assert.equal(await page.evaluate(()=>__e02Speech.spoken.length),1,'written requests stay written');
 await page.locator('[data-e01-toggle=sound]').click();
 const base=await count();
 await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});await result(page,[{text:'SECRET NAVIGATION',final:false}]);
 await page.evaluate(()=>window.__e02LateNavigation=__e02Speech.instances.at(-1).onresult);
 await page.evaluate(()=>DobbyFamilyStitch.open('menu'));await page.evaluate(()=>__e02LateNavigation?.({resultIndex:0,results:[Object.assign([{transcript:'acheter du SECRET NAVIGATION'}],{isFinal:true})]}));
 await page.evaluate(()=>DobbyFamilyStitch.open('chat'));await ready(page);
 assert.equal(await input(page).inputValue(),'SECRET NAVIGATION','navigation retains an interrupted draft for the same identity');assert.equal(await count(),base);
 await input(page).fill('');await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});await result(page,[{text:'SECRET IDENTITY A',final:false}]);
 await page.evaluate(()=>{window.__e02LateIdentity=__e02Speech.instances.at(-1).onresult;DobbyFamilyStitchEngine.win().__e02Identity={userId:'TEST-review-B',householdId:'TEST-review-household'};DobbyFamilyStitchEngine.evaluate('render();');});
 await page.waitForFunction(()=>!document.querySelector('#user-input').disabled&&document.querySelector('#user-input').value==='');
 await page.evaluate(()=>__e02LateIdentity?.({resultIndex:0,results:[Object.assign([{transcript:'acheter du SECRET IDENTITY A'}],{isFinal:true})]}));
 assert.equal(await count(),0);assert.equal(await input(page).inputValue(),'','a different account never receives the old dictated draft');
 await send(page,'courses');assert.match(await page.locator('#chat-thread').textContent(),/lait TEST EXPLICITE/);
 await page.getByRole('link',{name:'Voir les courses',exact:true}).last().click();
 await page.waitForFunction(()=>window.DobbyCuisine?.ready&&DobbyCuisine.view.startsWith('shop'));
 assert.match(await page.locator('[data-e072-list]').innerText(),/lait TEST EXPLICITE/,'the result link opens the unique E07 list');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.DobbyCuisine?.ready);
 assert.match(await page.locator('[data-e072-list]').innerText(),/lait TEST EXPLICITE/,'the native grocery result survives reload');
 await page.goto(origin+appPath+'/famille.html#chat',{waitUntil:'domcontentloaded'});await ready(page);
 for(const [question,label,route]of [['missions','Voir les missions',/missions\.html$/],['agenda','Ouvrir l’Agenda',/famille\.html#agenda/],['documents','Documents',/famille\.html#documents?(?:\?|$)/]]){
  await send(page,question);
  let target=page.getByRole('link',{name:label,exact:true}).last(),documentRecord=null;
  if(question==='documents'){
   const records=await native(page,'return st.familyDocs||[];');
   if(records.length){
    target=page.locator('#chat-thread a[href*="famille.html#document?"]').last();
    const href=new URL(await target.getAttribute('href'),page.url()),id=new URLSearchParams(href.hash.split('?')[1]).get('record');
    documentRecord=records.find(row=>row.id===id);assert.ok(documentRecord,'the rendered document link identifies a canonical native record');
    assert.equal(await target.innerText(),documentRecord.title||documentRecord.name);
   }else assert.match(await target.getAttribute('href'),/#documents$/,'an empty document register keeps its native list fallback');
  }
  await target.click();await page.waitForURL(route);
  if(documentRecord){assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('record'),documentRecord.id);assert.ok((await page.locator('main').innerText()).includes(documentRecord.title||documentRecord.name),'the destination displays the same canonical document');}
  await page.goto(origin+appPath+'/famille.html#chat',{waitUntil:'domcontentloaded'});await ready(page);
 }
 await send(page,'Réserve un billet de train');assert.match(await page.locator('#chat-thread').textContent(),/ne sait pas encore interpréter/);
 await page.evaluate(()=>{delete window.SpeechRecognition;delete window.webkitSpeechRecognition;});
 await button(page,'voice').dispatchEvent('pointerdown',{pointerId:1,button:0,isPrimary:true});assert.match(await status(page),/dictée.*clavier/i);
 assert.notEqual(await button(page,'voice').getAttribute('aria-pressed'),'true');
 return storageEvidence;
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 let storageEvidence=null;try{
  for(const width of [390,320,1440]){
   const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',reducedMotion:'reduce'});await install(context);
   const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+appPath+'/famille.html#chat',{waitUntil:'domcontentloaded'});await ready(page);await decoded(page);
   if(process.env.E02_BASELINE){await page.screenshot({path:path.join(out,`before-${width}.png`)});await context.close();continue;}
   await page.goto(origin+appPath+'/famille.html#chat',{waitUntil:'domcontentloaded'});await ready(page);await decoded(page);await page.evaluate(()=>scrollTo(0,0));
   const geometry=await page.locator('[data-e02-voice-primary]').evaluate(frame=>{const r=frame.getBoundingClientRect(),button=frame.querySelector('button').getBoundingClientRect();return{top:r.top,bottom:r.bottom,buttonWidth:button.width,buttonHeight:button.height};});
   assert.ok(geometry.top>=72&&geometry.bottom<500,'Primary voice visible immediately');assert.ok(geometry.buttonWidth>=140&&geometry.buttonHeight>=140,'large central voice target');
   assert.match(await page.locator('[data-e02-voice-primary]').innerText(),/Maintenez appuyé pour parler/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   await page.screenshot({path:path.join(out,`after-${width}.png`)});
   if(width===390)storageEvidence=await voiceCases(page);
   await page.setViewportSize({width,height:540});await input(page).focus();
   const composer=await page.evaluate(()=>{const footer=document.querySelector('#user-input').getBoundingClientRect(),nav=document.querySelector('body > nav[data-e01-chrome]').getBoundingClientRect();return {bottom:footer.bottom,navTop:nav.top,width:document.documentElement.scrollWidth};});
   assert.ok(composer.bottom<=composer.navTop+1,'the message field stays above the dock on a reduced viewport');assert.equal(composer.width,width);
   await page.screenshot({path:path.join(out,`keyboard-simulated-${width}.png`)});
   assert.deepEqual(errors,[]);await context.close();console.log('E02_CONSOLIDATION_PASS',width);
  }
  if(!process.env.E02_BASELINE)fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',origin,appPath,widths:[320,390,1440],speech:'simulated SpeechRecognition and speechSynthesis API boundaries',identity:'simulated native identity output',writers:'real native grocery writer and storage',storageEvidence,cases:['multisegment','no autosend on final/end/error','stop','resume','cancel','interim preservation','late callbacks','navigation','identity isolation','sound preference','native grocery persistence and duplicate','canonical document link and native empty fallback','module navigation','decoded hero','reduced viewport'],realIPhone:false},null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
