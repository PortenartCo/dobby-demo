/* Native V7 UI contract. Auth outcomes are fixtures, never live certification. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8819';
const out=process.env.DOBBY_ACCESS_EVIDENCE||'/workspace/scratch/stitch-access-ui';
const widths=(process.env.DOBBY_ACCESS_WIDTHS||'320,390,768,1024,1440,1920').split(',').map(Number);
const exactReturn=new URL('/',origin).href;
async function geometry(page){
 const result=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth-innerWidth}));
 assert.ok(result.overflow<=1,'Access view must not overflow horizontally: '+JSON.stringify(result));return result;
}
async function motion(page){
 const size=await geometry(page),range=size.scrollHeight-size.height;
 if(range<=20)return{range,fits:true};
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(80);
 // Start in the content gutter: a focused text input can consume a drag to move
 // its caret. This exercises native page panning beside the form controls.
 const copy=await page.locator('.access-content').boundingBox();
 const x=Math.max(4,copy.x-8),y=Math.min(size.height-50,Math.max(100,size.height*.55));
 await page.mouse.move(x,y);await page.mouse.wheel(0,450);await page.waitForTimeout(150);
 const wheel=await page.evaluate(()=>scrollY);assert.ok(wheel>20,'A real wheel event must scroll the access page: '+wheel);
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(80);
 const session=await page.context().newCDPSession(page),start=size.height*.82,end=size.height*.25;
 try{
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start}]});
  for(let step=1;step<=8;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*step/8}]});await page.waitForTimeout(20);}
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }finally{await session.detach();}
 await page.waitForTimeout(150);const touch=await page.evaluate(()=>scrollY);
 assert.ok(touch>20,'A real finger gesture must scroll the access page: '+JSON.stringify({touch,size,x,start,target:await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.outerHTML.slice(0,250),{x,y:start})}));
 return{range,wheel,touch};
}
async function reachable(page,locator){
 await locator.scrollIntoViewIfNeeded();
 const bounds=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{top:r.top,bottom:r.bottom,height:innerHeight,hit:el===hit||el.contains(hit)};});
 assert.ok(bounds.hit&&bounds.top>=-1&&bounds.bottom<=bounds.height+1,'The final access action must be visible and clickable: '+JSON.stringify(bounds));return bounds;
}
async function capture(page,name,width){
 await page.evaluate(()=>scrollTo(0,0));await geometry(page);
 await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true,animations:'disabled'});
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];
 try{
  for(const width of widths){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:true,isMobile:width<768,locale:'fr-BE',reducedMotion:'reduce'});
   await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
   await context.addInitScript(()=>{
    if(!location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))return;
    let state={phase:'signed-out',configured:true,authenticated:false,verified:false};
    const listeners=new Set(),emit=()=>{for(const listener of listeners)listener({...state});return {...state};};
    const access={ready:Promise.resolve(),state:()=>({...state}),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},refresh:async()=>({...state}),
     signUp:async(email,password,options)=>{window.__accessCalls.push({kind:'signup',email,passwordLength:password.length,redirectTo:options?.redirectTo});state={phase:'profile',configured:true,authenticated:true,userId:'TEST-ACCOUNT',verified:false};return emit();},
     signIn:async()=>{state={phase:'household',configured:true,authenticated:true,userId:'TEST-ACCOUNT',profile:{firstName:'TEST',lastName:'UI',avatarId:'portrait-9'}};return emit();},
     saveProfile:async profile=>{window.__accessCalls.push({kind:'profile',profile});state={...state,phase:'household',profile};return emit();},
     previewInvitation:async token=>token==='TEST-EXPIRED'?{status:'expired'}:token==='TEST-VALID'?{status:'valid',household:{id:'TEST-HH',name:'Foyer <img src=x onerror=alert(1)>'},inviter:{name:'TEST — Invitant'},expiresAt:'2099-11-12T12:00:00Z'}:{status:'invalid'},
     recover:async(email,options)=>{window.__accessCalls.push({kind:'recover',redirectTo:options?.redirectTo});return{...state};}
    };
    window.__accessCalls=[];let native;
    Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,get:()=>native,set:api=>{native={...api,access};}});
   });
   const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/essai-stitch-v7/famille.html#access');
   await page.getByRole('heading',{name:'Bienvenue dans DOBBY',exact:true}).waitFor();
   assert.equal(await page.locator('[data-e06-member]').count(),0,'Authentication has no fictional member picker');
   await capture(page,'welcome',width);const welcomeMotion=await motion(page);
   await page.getByRole('button',{name:'Continuer',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.getByRole('heading',{name:'Entrer dans DOBBY',exact:true}).waitFor();
   await capture(page,'login',width);const loginMotion=await motion(page);
   await page.getByRole('button',{name:'Mot de passe oublié',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.getByLabel('Adresse e-mail',{exact:true}).fill('test-ui@example.test');
   await page.getByRole('button',{name:'Envoyer le lien de récupération',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.getByRole('heading',{name:'Consultez votre messagerie',exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.win().__accessCalls.find(c=>c.kind==='recover').redirectTo),exactReturn,'Recovery uses the exact official root return without a query or fragment');
   await page.getByRole('button',{name:'Revenir à la connexion',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.getByRole('tab',{name:'Inscription',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.getByLabel('Adresse e-mail',{exact:true}).fill('test-ui@example.test');
   await page.getByLabel('Mot de passe',{exact:true}).fill('TEST-ONLY-PASSWORD');
   await page.getByLabel('Confirmer le mot de passe',{exact:true}).fill('TEST-ONLY-PASSWORD');
   await page.setViewportSize({width,height:420});await page.getByLabel('Mot de passe',{exact:true}).focus();
   const signupShortMotion=await motion(page),signupShortAction=await reachable(page,page.getByRole('button',{name:'Créer mon compte',exact:true}));
   await page.screenshot({path:path.join(out,'signup-short-'+width+'.png'),animations:'disabled'});
   await page.setViewportSize({width,height:900});
   await page.getByRole('button',{name:'Créer mon compte',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.getByRole('heading',{name:'Mon profil',exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.win().__accessCalls.find(c=>c.kind==='signup').redirectTo),exactReturn,'Signup confirmation uses the exact official root return without a query or fragment');
   assert.equal(await page.locator('[data-access-avatar]').count(),24);
   await page.getByLabel('Prénom',{exact:true}).fill('TEST');
   await page.getByLabel('Nom de famille',{exact:true}).fill('UI');
   await page.locator('[data-access-avatar="portrait-9"]').check();
   await capture(page,'profile',width);const profileMotion=await motion(page);
   await page.setViewportSize({width,height:420});await page.getByLabel('Prénom',{exact:true}).focus();
   const profileShortMotion=await motion(page),profileShortAction=await reachable(page,page.getByRole('button',{name:'Enregistrer mon profil',exact:true}));
   await page.screenshot({path:path.join(out,'profile-short-'+width+'.png'),animations:'disabled'});
   await page.setViewportSize({width,height:900});
   await page.getByRole('button',{name:'Enregistrer mon profil',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.getByRole('heading',{name:'Créer mon foyer',exact:true}).waitFor();
   await capture(page,'create',width);const createMotion=await motion(page);
   assert.equal(await page.getByLabel('Nom du foyer',{exact:true}).inputValue(),'','No fictional household is prefilled');
   const profile=await page.evaluate(()=>DobbyFamilyStitchEngine.win().__accessCalls.find(c=>c.kind==='profile').profile);
   assert.equal(profile.avatarId,'portrait-9');assert.equal(profile.firstName,'TEST');
   await page.getByRole('button',{name:'J’ai une invitation',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.getByLabel('Code ou lien d’invitation',{exact:true}).fill('TEST-VALID');
   await page.getByRole('button',{name:'Vérifier l’invitation',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.getByRole('button',{name:'Rejoindre ce foyer',exact:true}).waitFor();
   await capture(page,'join',width);const joinMotion=await motion(page);
   await page.setViewportSize({width,height:420});await page.getByLabel('Code ou lien d’invitation',{exact:true}).focus();
   const joinShortMotion=await motion(page),joinShortAction=await reachable(page,page.getByRole('button',{name:'Rejoindre ce foyer',exact:true}));
   await page.screenshot({path:path.join(out,'join-short-'+width+'.png'),animations:'disabled'});
   await page.setViewportSize({width,height:900});
   assert.match(await page.locator('[data-access-invitation]').innerText(),/Foyer <img/);
   assert.equal(await page.locator('[data-access-invitation] img').count(),0,'Server names are text, never HTML');
   await page.getByLabel('Code ou lien d’invitation',{exact:true}).fill('TEST-EXPIRED');
   await page.getByRole('button',{name:'Vérifier l’invitation',exact:true}).click();await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   await page.locator('[data-access-invitation][data-invitation-state=expired]').waitFor();
   assert.equal(await page.getByRole('button',{name:'Rejoindre ce foyer',exact:true}).count(),0,'Expired invitation cannot retain a valid acceptance control');
   assert.match(await page.locator('[data-access-invitation]').innerText(),/expiré/i);
   await page.setViewportSize({width,height:420});
   const invitationResumeAction=await reachable(page,page.getByRole('button',{name:'Vérifier mon accès au foyer',exact:true}));
   await page.screenshot({path:path.join(out,'join-resume-short-'+width+'.png'),animations:'disabled'});
   await page.evaluate(()=>DobbyMagicProfile.openAccount());
   await page.getByRole('heading',{name:'Profil magique',exact:true}).waitFor();
   const logout=page.getByRole('button',{name:'Se déconnecter',exact:true});
   const logoutAction=await reachable(page,logout);
   assert.equal(await logout.evaluate(button=>!!button.closest('details:not([open])')),false,'Sign out must be visible without opening account details');
   await page.screenshot({path:path.join(out,'account-logout-short-'+width+'.png'),animations:'disabled'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   assert.deepEqual(errors,[]);
   results.push({width,welcomeMotion,loginMotion,signupShortMotion,signupShortAction,profileMotion,profileShortMotion,profileShortAction,createMotion,joinMotion,joinShortMotion,joinShortAction,invitationResumeAction,logoutAction});
   await context.close();console.log('STITCH_ACCESS_UI_PASS',width);
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',widths,authOutcomes:'local fixtures',backendVerified:false,physicalKeyboard:false,shortViewportHeight:420,exactReturn,results},null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
