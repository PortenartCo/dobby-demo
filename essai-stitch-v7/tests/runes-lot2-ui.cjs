/* Product views with a fictional native transport. PostgreSQL is tested separately. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8772';
const parent=process.env.DOBBY_RUNES_LOT2_EVIDENCE;
const pending={id:'fixture-pending',status:'pending',missionId:'fixture-mission',memberId:'fixture-a',amount:25};
const active={id:'fixture-secret',mode:'surprise',threshold:25,unlocked:true};
const people=[{id:'p',name:'TEST Parent',memberCategory:'parent'},{id:'fixture-a',name:'TEST Alix',memberCategory:'child'},
 {id:'fixture-b',name:'TEST Bastien',memberCategory:'child'}];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of [320,390,1440]){
   const ctx=await browser.newContext({viewport:{width,height:900},locale:'fr-BE'});
   await ctx.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/essai-stitch-v7/missions.html');
   await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&document.getElementById('dv7-engine').contentWindow.DobbyFamilyMissions);
   await page.evaluate(({people,pending,active})=>{
    const E=DobbyFamilyStitchEngine,w=E.win();
    E.evaluate(`st.familyMembers=p;st.manualMissions=[{id:'fixture-mission',title:'TEST Jardiner ensemble',status:'open',category:'Famille',effort:'regular',rewardVersion:1,individualRunes:true,approvalRequired:true,assigneeIds:['fixture-a','fixture-b'],due:''}];
      st.autoTasks=[];st.runeCredits=[];st.runeRequests=[];`,people);
    const state={category:'parent',memberId:'p',entries:[pending],goals:{'fixture-a':active},rewards:[]};
    w.__state=state;w.__actions=[];
    w.DobbySharedRunesV3={...w.DobbySharedRunesV3,readProgress:()=>state,progressAvailable:()=>true,
      participationStatus:(row,last)=>last?.status||'open',recordProgress:async intent=>{
       w.__actions.push(intent);if(intent.kind==='approve')state.entries.push({...pending,id:'approved',status:'credited'});
       if(intent.kind==='submit')state.entries.push({...pending,id:'submitted',memberId:intent.memberId,status:'pending'});
      }};
    window.DobbyStitchV7.refresh();
   },{people,pending,active});
   await page.getByText('1 participation(s) à valider',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Participations',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'TEST Jardiner ensemble'});
   assert.ok(await dialog.getByText('TEST Bastien',{exact:true}).isVisible());
   if(parent){fs.mkdirSync(parent,{recursive:true});await page.screenshot({path:path.join(parent,'participations-'+width+'.png')});}
   await dialog.getByRole('button',{name:'Valider',exact:true}).click();
   await dialog.waitFor({state:'detached'});
   await page.evaluate(()=>{
    const w=DobbyFamilyStitchEngine.win();w.__state.category='child';w.__state.memberId='fixture-b';DobbyStitchV7.refresh();
   });
   await page.getByRole('button',{name:'Participations',exact:true}).click();
   assert.equal(await dialog.getByText('TEST Alix',{exact:true}).count(),0);
   await dialog.getByRole('button',{name:'Soumettre',exact:true}).click();
   assert.deepEqual(await page.evaluate(()=>DobbyFamilyStitchEngine.win().__actions),[
    {kind:'approve',missionId:'fixture-mission',memberId:'fixture-a'},
    {kind:'submit',missionId:'fixture-mission',memberId:'fixture-b'}
   ]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.goto(origin+'/essai-stitch-v7/famille.html');
   await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
   await page.evaluate(({people,active})=>{
    const E=DobbyFamilyStitchEngine,w=E.win();
    E.evaluate('st.familyMembers=p;st.runeCredits=[];st.runeRequests=[];',people);
    const progress={category:'child',memberId:'fixture-a',entries:[],goals:{'fixture-a':active},rewards:[]};
    w.__rewards=progress;
    w.DobbySharedRunesV3={...w.DobbySharedRunesV3,readProgress:()=>progress,
     recordProgress:async intent=>{
      if(intent.kind!=='reward-confirm')throw Error('Intention inattendue');
      delete progress.goals['fixture-a'];
      progress.rewards.push({memberId:'fixture-a',title:'TEST Sortie au musée',threshold:25,date:'2026-11-20'});
     }};
    DobbyFamilyStitch.open('personal',{person:'fixture-a'});
   },{people,active});
   const reward=page.locator('.dobby-rune-reward');
   await reward.getByText('Récompense mystère',{exact:true}).waitFor();
   assert.equal(await reward.getByRole('button').count(),0);
   await page.evaluate(()=>{
    const E=DobbyFamilyStitchEngine;E.win().__rewards.category='parent';
    document.querySelector('[data-rune-profile="fixture-a"]').replaceWith(DobbyMemberAvatar.profile(E.read().members.find(x=>x.id==='fixture-a')));
   });
   await reward.getByRole('button',{name:'Confirmer la récompense',exact:true}).click();
   await page.getByRole('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();
   await reward.getByText('TEST Sortie au musée',{exact:false}).waitFor();
   if(parent)await page.screenshot({path:path.join(parent,'recompenses-'+width+'.png')});
   assert.deepEqual(errors,[]);
   console.log('RUNES_LOT2_UI_PASS',width);
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
