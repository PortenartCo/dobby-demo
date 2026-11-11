/* Real UI, native writers and IndexedDB; only unavailable browser speech APIs and identity are simulated. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8891';
const out=process.env.DOBBY_REVIEW_VOICE_EVIDENCE_DIR||path.resolve(__dirname,'../../docs/dobby-v7/evidence/review-e01-e05/voice');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const checks=[],errors=[];let page;
 try{
  const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE',reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await context.addInitScript(()=>{
   if(location.pathname.includes('essai-stitch-v5-famille/index.html')){window.__reviewIdentity={userId:'REVIEW-voice-A',householdId:'REVIEW-household'};let api;Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,get:()=>api,set:value=>{api={...value,getContext:()=>window.__reviewIdentity};}});}
   if(location.pathname.includes('essai-stitch-v7/')){
    window.__voice={runs:[],spoken:[],canceled:0};
    class Recognition{constructor(){__voice.runs.push(this);}start(){queueMicrotask(()=>this.onstart?.());}stop(){this.onend?.();}abort(){this.aborted=true;this.onend?.();}}
    window.SpeechRecognition=Recognition;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:'fr-FR',name:'Test français'}],cancel(){__voice.canceled++;},speak(u){__voice.spoken.push(u);u.onstart?.();}}});
   }
  });
  page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>window.DobbyStitchV7?.ready&&window.DobbyFamilyStitch?.ready&&!document.querySelector('#user-input')?.disabled);
  await page.goto(origin+'/essai-stitch-v7/famille.html#chat',{waitUntil:'domcontentloaded'});await ready();await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  const count=()=>page.locator('[data-e02-message=user]').count(),input=()=>page.locator('#user-input');
  const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
  const emit=segments=>page.evaluate(segments=>__voice.runs.at(-1).onresult?.({resultIndex:0,results:segments.map(([text,final])=>Object.assign([{transcript:text,confidence:.9}],{isFinal:final}))}),segments);
  const final=text=>emit([[text,true]]),interim=text=>emit([[text,false]]);
  const event=name=>page.evaluate(name=>__voice.runs.at(-1)[name]?.(),name);
  const advance=ms=>page.clock.runFor(ms);
  const start=async()=>{await input().fill('');await page.locator('[data-fa-action=rg-chat-voice]').click();await page.waitForFunction(()=>document.querySelector('[data-fa-action=rg-chat-voice]').getAttribute('aria-pressed')==='true');};
  const settled=()=>page.waitForFunction(()=>!DobbyChat.busy);
  const pass=(name,detail)=>{checks.push({name,status:'PASS',detail});console.log('PASS '+name);};
  const noSend=async(before,ms,message)=>{await advance(ms);await settled();assert.equal(await count(),before,message);};
  const saveLate=()=>page.evaluate(()=>{const run=__voice.runs.at(-1);window.__lateVoice={result:run.onresult,start:run.onstart,speech:run.onspeechstart,end:run.onend,error:run.onerror};});
  const late=()=>page.evaluate(()=>{__lateVoice.start?.();__lateVoice.speech?.();__lateVoice.result?.({resultIndex:0,results:[Object.assign([{transcript:'acheter du REVIEW_LATE_PRIVATE',confidence:.9}],{isFinal:true})]});__lateVoice.error?.({error:'network'});__lateVoice.end?.();});

  // Missing final-only countdown or a premature timer causes a real persisted exchange mismatch.
  let before=await count();await start();await interim('Quel est le repas ce soir');await noSend(before,5000,'provisional recognition must never send');
  await final('Quel est le repas ce soir ?');await page.screenshot({path:path.join(out,process.env.DOBBY_REVIEW_RED?'before-countdown-390.png':'after-countdown-390.png')});
  await noSend(before,2999,'default pause must permit short pauses');await advance(2);await settled();assert.equal(await count(),before+1,'final speech must auto-send after the stable default 3 second pause');assert.equal(await input().inputValue(),'');
  pass('final-only default 3s', 'Interim held 5s; finalized draft held 2999ms, sent once at 3001ms through the native conversation path.');

  // Speech activity must invalidate the earlier deadline, including a later provisional fragment.
  before=await count();await start();await final('Quel est le repas');await advance(2400);await event('onspeechstart');await interim('Quel est le repas demain');await noSend(before,4000,'resumed/provisional speech cancels the old deadline');
  await emit([['Quel est le repas',true],['demain ?',true]]);await noSend(before,2999,'new final result needs a complete new pause');await advance(2);await settled();assert.equal(await count(),before+1);assert.equal(await page.locator('[data-e02-message=user]').last().innerText().then(s=>s.includes('Quel est le repas demain ?')),true);
  pass('multi-segment speech resets pause','A resumed utterance crosses the old deadline without sending; all cumulative final segments are sent once.');

  // User controls must cancel deadlines without sending or discarding the visible finalized draft.
  before=await count();await start();await final('Quel est le repas ce soir ?');await advance(1200);await page.locator('[data-fa-action=rg-chat-continue]').click();await final('Quel est le repas ce soir ?');await noSend(before,6000,'Continue cancels automatic sending even with a duplicate final callback');assert.match(await input().inputValue(),/repas/);
  await page.locator('[data-fa-action=rg-chat-send]').click();await settled();assert.equal(await count(),before+1);
  before=await count();await start();await final('Quel est le repas demain ?');await saveLate();await page.locator('[data-fa-action=rg-chat-abort]').click();await late();await noSend(before,6000,'Cancel invalidates deadline and saved callbacks');assert.equal(await input().inputValue(),'');
  pass('continue and cancel','Continue keeps the finalized draft for immediate Send; Cancel restores the original input and rejects saved callbacks.');

  // Sending provisional data would violate the final-only contract even with the immediate-send button.
  before=await count();await start();await interim('acheter du REVIEW_PROVISIONAL');await page.locator('[data-fa-action=rg-chat-send]').click();await noSend(before,5000,'Send cannot submit a provisional recognition result');
  await final('Quel est le repas ce soir ?');await saveLate();await page.locator('[data-fa-action=rg-chat-send]').click();await settled();assert.equal(await count(),before+1);await late();await noSend(before+1,6000,'late callbacks after immediate Send cannot mutate or duplicate');assert.equal(await input().inputValue(),'');
  pass('immediate final Send and stale callbacks','Immediate Send rejects provisional data, accepts final data, and invalidates old handlers before native execution.');

  before=await count();await start();await final('acheter du REVIEW_WRONG');await advance(1000);await saveLate();await input().fill('Quel est le repas demain ?');await late();await noSend(before,6000,'manual correction cancels autosend and cannot be overwritten');assert.equal(await input().inputValue(),'Quel est le repas demain ?');await page.locator('[data-fa-action=rg-chat-send]').click();await settled();assert.equal(await count(),before+1);assert.ok(!(await native('return st.extras||[];')).includes('REVIEW_WRONG'));
  pass('manual correction','Typing invalidates speech and countdown; a late final cannot overwrite or execute the discarded words.');

  // Resuming cannot silently turn a previous run's unfinished text into a final transcript.
  before=await count();await start();await interim('Quel est');await event('onend');await page.locator('[data-fa-action=rg-chat-resume]').click();await final('le repas demain ?');await noSend(before,6000,'a final suffix cannot validate an interrupted provisional prefix');await page.locator('[data-fa-action=rg-chat-send]').click();await noSend(before,1000,'an incomplete resumed draft must be reviewed before Send');assert.equal(await input().inputValue(),'Quel est le repas demain ?');await input().fill('Quel est le repas demain ?');await page.locator('[data-fa-action=rg-chat-send]').click();await settled();assert.equal(await count(),before+1);pass('interrupted provisional prefix','A resumed final suffix cannot automatically validate incomplete earlier text; an explicit manual review restores sending.');

  // The real selectable delay changes behavior, without requiring any additional storage.
  for(const [delay,wait]of [['1500',1499],['5000',4999]]){before=await count();await page.locator('[data-e02-voice-delay]').selectOption(delay);await start();await final('Quel est le repas ce soir ?');await noSend(before,wait,'configured pause must be respected');await advance(2);await settled();assert.equal(await count(),before+1);}
  await page.locator('[data-e02-voice-delay]').selectOption('3000');pass('configurable 1.5–5s','Both delay bounds are exercised before and just after their deadline; default is restored to 3s.');

  // End/error/hide/stop must clear the timer, keep the draft, and require an explicit restart.
  for(const interruption of ['end','error','stop','hidden','pagehide']){
   before=await count();await start();await final('Quel est le repas ce soir ?');await saveLate();const runs=await page.evaluate(()=>__voice.runs.length);
   if(interruption==='end')await event('onend');
   if(interruption==='error')await page.evaluate(()=>__voice.runs.at(-1).onerror?.({error:'audio-capture'}));
   if(interruption==='stop')await page.locator('[data-fa-action=rg-chat-stop]').click();
   if(interruption==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
   if(interruption==='pagehide')await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
   await late();await noSend(before,6000,interruption+' cannot send a draft');assert.match(await input().inputValue(),/repas/);assert.equal(await page.evaluate(()=>__voice.runs.length),runs,'no automatic restart loop');
   if(interruption==='hidden')await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
   if(interruption==='pagehide'){await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await ready();}
   pass('interruption '+interruption,'The pending final draft is retained, stale callbacks ignored, no exchange and no restart.');
  }

  before=await count();await start();await final('acheter du REVIEW_NAV_PRIVATE');await saveLate();await page.evaluate(()=>DobbyFamilyStitch.open('menu'));await late();await advance(6000);await page.evaluate(()=>DobbyFamilyStitch.open('chat'));await ready();assert.equal(await count(),before);assert.match(await input().inputValue(),/REVIEW_NAV_PRIVATE/);await input().fill('');
  pass('navigation','Leaving chat cancels pending sending; returning under the same identity preserves only the draft.');

  before=await count();await start();await final('acheter du REVIEW_IDENTITY_PRIVATE');await saveLate();await native("window.__reviewIdentity={userId:'REVIEW-voice-B',householdId:'REVIEW-household'};render();");await advance(700);await ready();await late();await advance(6000);assert.equal(await count(),0);assert.equal(await input().inputValue(),'');assert.ok(!(await native('return st.extras||[];')).includes('REVIEW_IDENTITY_PRIVATE'));
  await native("window.__reviewIdentity={userId:'REVIEW-voice-A',householdId:'REVIEW-household'};render();");await advance(700);await ready();assert.equal(await count(),before);pass('identity isolation','Changing native authenticated context clears the old draft and prevents any late pending write under either account.');

  // Browser failure branches and unsupported browsers retain the manual path.
  for(const error of ['not-allowed','no-speech','network']){before=await count();await start();await final('Quel est le repas demain ?');await page.evaluate(error=>__voice.runs.at(-1).onerror?.({error}),error);await noSend(before,6000,error+' cannot send');}
  before=await count();await input().fill('');await page.evaluate(()=>{window.__recognition=SpeechRecognition;delete window.SpeechRecognition;});await page.locator('[data-fa-action=rg-chat-voice]').click();await input().fill('Quel est le repas ce soir ?');await page.locator('[data-fa-action=rg-chat-send]').click();await settled();assert.equal(await count(),before+1);await page.evaluate(()=>window.SpeechRecognition=__recognition);pass('microphone errors and manual fallback','Denial, no speech and network failure retain drafts; an unsupported browser still sends typed input.');

  // Readback follows existing shared sound preference; sensitive actions still need confirmation.
  assert.equal(await page.evaluate(()=>__voice.spoken.length),0,'sound OFF must suppress automatic voice output');await page.locator('[data-e01-toggle=sound]').click();before=await count();await start();await final('Quel est le repas ce soir ?');await advance(3001);await settled();assert.equal(await count(),before+1);assert.equal(await page.evaluate(()=>__voice.spoken.length),1);await page.locator('[data-fa-action=rg-chat-silence]').click();assert.equal(await page.locator('[data-fa-action=rg-chat-silence]').isVisible(),false);await page.locator('[data-fa-action=rg-chat-replay]').last().click();assert.equal(await page.evaluate(()=>__voice.spoken.length),2);await page.locator('[data-e01-toggle=sound]').click();assert.equal(await page.locator('[data-fa-action=rg-chat-silence]').isVisible(),false);await page.locator('[data-fa-action=rg-chat-replay]').last().click();assert.equal(await page.evaluate(()=>__voice.spoken.length),2);
  await native("st.manualMissions=[{id:'REVIEW-voice-confirm',title:'REVIEW Mission Vocale',category:'Famille',status:'open'}];save();");await start();await final('Supprime la mission REVIEW Mission Vocale');await advance(3001);await settled();await page.locator('[data-e02-confirm]').waitFor();assert.equal((await native('return st.manualMissions;')).length,1,'autosend cannot bypass sensitive confirmation');await page.locator('[data-e02-cancel]').click();await settled();assert.equal((await native('return st.manualMissions;')).length,1);pass('sound and sensitive confirmation','Automatic voice request respects Son OFF/ON, replay/interruption, and still requests confirmation before deletion.');

  // Real native history survives reload; a draft does not become an exchange on reload.
  before=await count();await page.clock.resume();await page.reload({waitUntil:'domcontentloaded'});await ready();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));assert.equal(await count(),before);assert.deepEqual(errors,[]);pass('history persistence and runtime','All sent exchanges survive IndexedDB reload; no uncaught browser error.');
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});await start();await final('Quel est le repas ce soir ?');await page.screenshot({path:path.join(out,'countdown-'+width+'.png')});const box=await page.locator('[data-e02-countdown]').boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width,'countdown controls stay inside '+width+'px viewport');await page.locator('[data-fa-action=rg-chat-abort]').click();}
  const report={status:'PASS',checks,errors,speech:'API boundary simulations; application UI, native writers and IndexedDB real',timer:'Playwright clock, exact causal deadlines',network:'Only local origin allowed; no external service',realDevice:false,limits:['Safari/iOS actual recognition/permission and installed voices remain unverified','Delay preference is tab-local; no additional persistence store']};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.log('REVIEW_VOICE_20261111_PASS '+checks.length+' checks');await context.close();
 }catch(error){if(page)await page.screenshot({path:path.join(out,process.env.DOBBY_REVIEW_RED?'red-failure.png':'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,process.env.DOBBY_REVIEW_RED?'red-results.json':'failure-results.json'),JSON.stringify({status:'FAIL',checks,error:error.stack,errors},null,2)+'\n');throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
