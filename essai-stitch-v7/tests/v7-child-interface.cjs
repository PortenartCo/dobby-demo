/* Account states from the native boundary are fictional. No request leaves the preview. */
'use strict';
const assert=require('node:assert/strict');
const {mkdir}=require('node:fs/promises');
const {join}=require('node:path');
const {chromium}=require('playwright');
const fixture=require('./e07-p01-fixture.cjs');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8898';
const path=name=>origin+'/essai-stitch-v7/'+name;
const evidence=process.env.DOBBY_CHILD_EVIDENCE;
const capture=(page,width,view)=>evidence&&page.screenshot({path:join(evidence,`${width}-${view}.png`),fullPage:true});

async function open(page,name){
 await page.goto(path(name));
 await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
}

async function identity(page,state){
 await page.evaluate(state=>{
  const native=document.getElementById('dv7-engine').contentWindow;
  native.__childAccess=state;
  native.dispatchEvent(new native.CustomEvent('dobby:account-change'));
 },state);
}

async function run(browser,width){
 const context=await fixture.context(browser,origin,width);
 try {
  await context.addInitScript(()=>{
   if(window===window.top)return;
   const state={restricted:true,active:true,memberId:'fixture-child'};
   const member={id:'fixture-child',name:'TEST Enfant',memberCategory:'child'};
   Object.defineProperty(window,'DobbyFamilyUI',{
    configurable:true,
    set(api){
     Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,writable:true,value:{
      ...api,
      childAccessState:()=>window.__childAccess||state,
      getContext:()=>({identityVerified:true,userId:'TEST-U',householdId:'TEST-H',memberId:member.id}),
      access:{...api.access,state:()=>({phase:'active',authenticated:true,verified:true,userId:'TEST-U',householdId:'TEST-H',memberId:member.id,profile:member})}
     }});
    }
   });
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(process.env.DOBBY_CHILD_DEBUG&&message.type()==='error')console.error(page.url(),message.text());});
  await open(page,'famille.html#chat');
  assert.equal(await page.locator('[data-family-view=chat]').count(),0,'Child deep link cannot mount E02');
  assert.equal(await page.locator('body > nav [data-e01-destination]').count(),6);
  assert.ok(await page.locator('body > header').isVisible());
  for(const view of ['chat-2','search','documents','contracts','settings','member-edit','medical-edit','health-person','mission-edit']){
   await page.evaluate(view=>DobbyFamilyStitch.open(view,{person:'wrong-member'}),view);
   assert.equal(await page.locator('body').getAttribute('data-family-view'),'salon',view);
  }
  await page.evaluate(()=>DobbyFamilyStitch.open('menu'));
  assert.equal(await page.locator('#menu-sections .module-item').filter({hasText:/Parler à Dobby|Archives|Contrats|Paramètres|Contacts/}).count(),0);
  assert.ok(await page.locator('#menu-sections .module-item').filter({hasText:'Profil magique'}).isVisible());
  await capture(page,width,'menu');
  await identity(page,{restricted:true,active:false,memberId:null});
  await page.waitForFunction(()=>!document.querySelector('[data-magic-profile]')&&!document.querySelector('main').textContent.includes('TEST'));
  await open(page,'traverse.html');
  assert.equal(await page.locator('#btn-vocal,[data-e01-add],[data-e01-quick-add],[data-e01-event-add]').count(),0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false,'Viewport '+width+'px');
  await page.evaluate(day=>{
   const native=DobbyFamilyStitchEngine.win();
   DobbyFamilyStitchEngine.evaluate(`
    st.familyMembers=[{id:'fixture-child',name:'TEST Enfant',memberCategory:'child'},{id:'fixture-other',name:'TEST Autre',memberCategory:'child'}];
    st.manualMissions=[{id:'own',title:'TEST Mission propre',assigneeIds:['fixture-child'],status:'open',due:p.day,individualRunes:true},
      {id:'legacy',title:'TEST Mission historique',assigneeId:'fixture-child',status:'open',due:p.day,childCompletionAllowed:true},
      {id:'other',title:'TEST Mission privée',assigneeIds:['fixture-other'],status:'open',due:p.day}];
    st.autoTasks=[{key:'auto',title:'TEST Mission automatique privée',state:'open',due:p.day}];
    save();
   `,{day});
   native.DobbySharedRunesV3={
    ...native.DobbySharedRunesV3,readProgress:()=>({category:'child',memberId:'fixture-child',entries:[],goals:{}}),
    participationStatus:()=> 'open', recordProgress:async action=>{native.__lastParticipation=action;}
   };
   DobbyStitchV7.refresh();
  },fixture.day);
  assert.ok(await page.getByRole('heading',{name:'TEST Mission propre'}).isVisible());
  assert.equal(await page.getByText('TEST Mission privée',{exact:true}).count(),0);
  await page.locator('body > nav [data-e01-destination="1"]').click();
  await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&document.body.dataset.dv7Screen==='missions').catch(async error=>{throw Error(page.url()+' '+JSON.stringify(errors),{cause:error});});
  assert.equal(await page.locator('#btn-nouvelle-mission,[data-e03-card=other],[data-e03-card=auto]').count(),0);
  await page.locator('[data-e03-card=own]').waitFor();
  await capture(page,width,'missions');
  await assert.rejects(page.evaluate(()=>DobbyMissionParticipants.open('other')),/participation|Mission/);
  await page.evaluate(()=>{
   const native=DobbyFamilyStitchEngine.win();
   native.DobbySharedRunesV3={
    ...native.DobbySharedRunesV3,readProgress:()=>({category:'child',memberId:'fixture-child',entries:[],goals:{}}),
    participationStatus:()=> 'open',recordProgress:async action=>{native.__lastParticipation=action;},available:()=>true
   };
   native.DobbyFamilyMissions={...native.DobbyFamilyMissions,complete:async(id,participants)=>{native.__completed={id,participants};}};
  });
  await page.getByRole('button',{name:'Ma participation'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Terminer',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>DobbyFamilyStitchEngine.win().__lastParticipation),{kind:'submit',missionId:'own',memberId:'fixture-child'});
  await page.locator('[data-dv7-complete=legacy]').click();
  assert.equal(await page.getByRole('dialog').getByRole('checkbox').count(),0);
  await page.getByRole('button',{name:'Confirmer la mission'}).click();
  assert.deepEqual(await page.evaluate(()=>DobbyFamilyStitchEngine.win().__completed),{id:'legacy',participants:['fixture-child']});
  await identity(page,{restricted:true,active:false,memberId:null});
  assert.equal(await page.getByText('TEST Mission propre',{exact:true}).count(),0);

  await open(page,'index.html#recipe-ai');
  await page.waitForFunction(()=>DobbyCuisine.view==='taverne');
  await fixture.seed(page);
  await fixture.native(page,"custom.find(r=>r.id==='p01-chicken').steps=['Cuire 2 minutes.','Vérifier la cuisson.'];");
  await fixture.open(page,'recipe',{id:'p01-chicken'});
  assert.equal(await page.locator('[data-cu-action=edit-recipe],[data-cu-action=e074-plan],[data-cu-action=archive-source]').count(),0);
  const planning=await fixture.native(page,'return JSON.stringify(st.planned);');
  await fixture.open(page,'cook',{id:'p01-chicken',date:fixture.day,slot:'midi'});
  await page.getByRole('button',{name:'Minuteur 2 min'}).click();
  await page.getByRole('button',{name:'Démarrer',exact:true}).click();
  await capture(page,width,'cuisine-tactile');
  await page.getByRole('button',{name:'Étape suivante',exact:true}).click();
  assert.match(await page.locator('[data-e074-instruction]').innerText(),/Vérifier la cuisson/);
  await page.getByRole('button',{name:'Terminer la recette',exact:true}).click();
  assert.ok(await page.getByRole('heading',{name:'Bon appétit !'}).isVisible());
  assert.equal(await fixture.native(page,'return JSON.stringify(st.planned);'),planning);
  await fixture.open(page,'shop');
  assert.equal(await page.locator('[data-cu-action=e072-add],[data-cu-action=e072-check],[data-cu-action=e072-finish]').count(),0);
  assert.deepEqual(errors,[]);
 } finally {await context.close();}
}

(async()=>{
 if(evidence)await mkdir(evidence,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const widths=(process.env.DOBBY_CHILD_WIDTHS||'320,390,820,1440').split(',').map(Number);
 try {for(const width of widths)await run(browser,width);}
 finally {await browser.close();}
 console.log('V7_CHILD_INTERFACE_PASS '+widths.join('/')+'; accès local simulé');
})().catch(error=>{console.error(error);process.exitCode=1;});
