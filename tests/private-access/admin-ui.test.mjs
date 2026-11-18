// Component behaviour only. The separate full-V7 suite supplies physical HTTP evidence.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const require=createRequire(import.meta.url);
let playwright;
try {playwright=require('playwright');}
catch {playwright=require(process.env.PLAYWRIGHT_MODULE || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
const source=await readFile(new URL('../../essai-stitch-v7/admin-access.js',import.meta.url),'utf8');
const owner='00000000-0000-4000-8000-000000000001',target='00000000-0000-4000-8000-000000000003';
const admission='10000000-0000-4000-8000-000000000001',admission2='10000000-0000-4000-8000-000000000002';
let browser,server,origin;
before(async()=>{
 server=createServer((request,response)=>{response.writeHead(200,{'content-type':'text/html; charset=utf-8'});response.end('<!doctype html><html lang="fr"><body data-family-view="menu"><main><div id="menu-sections"></div></main></body></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
 browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function fixture(t,{items,requests}={}){
 const page=await browser.newPage({viewport:{width:390,height:844}});t.after(()=>page.close());
 page.setDefaultTimeout(8000);await page.goto(origin);
 await page.evaluate(({owner,target,admission,items,requests})=>{
  const account={userId:owner,householdId:'fixture-household',memberId:'fixture-parent',verified:true,privateAccess:{status:'active',isOwner:true}};
  const listeners=new Set();
  const f=window.__fixture={state:account,calls:[],defer:null,deferred:null,error:null,result:null,
   list:{protocol:1,items:items || [{userId:owner,email:'owner@example.invalid',confirmed:true,status:'active',revision:1,isOwner:true,canCreateHousehold:false,admissions:[]},{userId:target,email:'parent@example.invalid',confirmed:true,status:'active',revision:4,isOwner:false,canCreateHousehold:false,admissions:[]}],requests:requests || [],nextCursor:null,nextRequestsCursor:null},
   history:{protocol:1,items:[],nextCursor:null},
   emit(patch){Object.assign(f.state,patch);for(const fn of listeners)fn({...f.state});},
   release(value){f.deferred?.(value);f.deferred=null;}
  };
  const access={ready:Promise.resolve(),state:()=>({...f.state}),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},async admin(command,payload){
   f.calls.push({command,payload:structuredClone(payload)});
   if(f.defer===command)return new Promise(resolve=>{f.deferred=resolve;});
   if(f.error)throw Object.assign(Error('untrusted backend details should never appear'),f.error);
   if(command==='listAccess')return structuredClone(f.list);
   if(command==='listDecisions')return structuredClone(f.history);
   if(f.result)return structuredClone(f.result);
   return {admission:{id:admission,email:'new@example.invalid',purpose:'new-household',state:'sent',revision:3},delivery:{outcome:'sent',requiresResume:false}};
  }};
  window.DobbyFamilyUI={access,connectionState:()=>({ready:true})};window.DobbyFamilyStitchEngine={win:()=>window};window.DobbyRegister={until:async fn=>{if(!fn())throw Error('unready fixture');}};
  const context=window.__context={main:document.querySelector('main'),ui:{view:'menu'},async open(view){context.ui.view=view;document.body.dataset.familyView=view;await window.DobbyAdminAccess.prepare(view);window.DobbyAdminAccess.render(view,context);}};
 },{owner,target,admission,items,requests});
 await page.addScriptTag({content:source});return page;
}
async function view(page,name){await page.evaluate(name=>window.__context.open(name),name);}
async function confirm(page){await page.locator('[data-admin-confirmation] input[name=confirmed]').check();await page.locator('[data-admin-confirm]').click();await page.waitForFunction(()=>!window.DobbyAdminAccess.busy);}
async function invite(page){await view(page,'admin-invite');await page.getByLabel('Adresse e-mail',{exact:true}).fill('new@example.invalid');await page.getByRole('button',{name:'Préparer le récapitulatif',exact:true}).click();}

test('local owner identity and a direct route do not grant administration without a fresh server result',async t=>{
 const page=await fixture(t);await page.evaluate(()=>{__fixture.error={status:403,code:'owner_required'};});
 await page.evaluate(()=>DobbyAdminAccess.decorateMenu(__context));assert.equal(await page.locator('[data-admin-entry]').count(),0);
 await view(page,'admin-invite');assert.equal(await page.locator('input[name=email]').count(),0);assert.equal(await page.getByRole('heading',{name:'Administration indisponible'}).count(),1);
 assert.equal((await page.evaluate(()=>__fixture.calls)).every(call=>call.command==='listAccess'),true);
 assert.equal((await page.locator('body').innerText()).includes('untrusted backend'),false);
});

test('menu entry follows a fresh server verification and disappears immediately on account change',async t=>{
 const page=await fixture(t);assert.equal(await page.locator('[data-admin-entry]').count(),0);
 await page.evaluate(()=>DobbyAdminAccess.decorateMenu(__context));assert.equal(await page.locator('[data-admin-entry]').count(),1);
 assert.deepEqual(await page.evaluate(()=>__fixture.calls[0]),{command:'listAccess',payload:{limit:1}});
 await page.evaluate(()=>__fixture.emit({userId:'00000000-0000-4000-8000-000000000006',verified:false}));assert.equal(await page.locator('[data-admin-entry]').count(),0);
});

test('late owner verification cannot restore entry or metadata after an account switch',async t=>{
 const page=await fixture(t);await page.evaluate(()=>{__fixture.defer='listAccess';window.pending=DobbyAdminAccess.decorateMenu(__context);});
 await page.waitForFunction(()=>!!__fixture.deferred);
 await page.evaluate(()=>{__fixture.emit({userId:'00000000-0000-4000-8000-000000000006',verified:false});__fixture.release(__fixture.list);});
 await page.evaluate(()=>window.pending);assert.equal(await page.locator('[data-admin-entry]').count(),0);
});

test('suspension clears visible metadata and closes a confirmation before a late response',async t=>{
 const page=await fixture(t);await invite(page);assert.equal(await page.locator('dialog[open]').count(),1);
 await page.evaluate(()=>__fixture.emit({verified:false,privateAccess:{status:'suspended'}}));
 assert.equal(await page.locator('dialog').count(),0);assert.equal(await page.locator('input[name=email]').count(),0);
 assert.equal(await page.getByRole('heading',{name:'Administration indisponible'}).count(),1);
 assert.equal((await page.evaluate(()=>__fixture.calls)).filter(call=>call.command==='invite').length,0);
});

test('invitation requires explicit confirmation and transmits one operation ID with exact closed payload',async t=>{
 const page=await fixture(t);await invite(page);
 assert.equal(await page.locator('[data-admin-confirm]').isDisabled(),true);
 assert.equal((await page.evaluate(()=>__fixture.calls)).filter(call=>call.command==='invite').length,0);
 await confirm(page);
 const calls=(await page.evaluate(()=>__fixture.calls)).filter(call=>call.command==='invite');assert.equal(calls.length,1);
 assert.deepEqual(Object.keys(calls[0].payload).sort(),['email','operationId','purpose']);assert.equal(calls[0].payload.email,'new@example.invalid');assert.equal(calls[0].payload.purpose,'new-household');
 assert.match(calls[0].payload.operationId,/^[0-9a-f-]{36}$/);assert.match(await page.locator('[data-admin-status]').innerText(),/Envoi confirmé.*pas encore consommée/);
});

test('an uncertain delivery is never reported as confirmed and is not automatically retried',async t=>{
 const page=await fixture(t);await page.evaluate(({admission})=>{__fixture.result={admission:{id:admission,state:'delivering',revision:3},delivery:{outcome:'uncertain',requiresResume:true}};},{admission});
 await invite(page);await confirm(page);
 const text=await page.locator('[data-admin-status]').innerText();assert.match(text,/Livraison en cours ou incertaine/);assert.match(text,/aucun envoi confirmé/);assert.equal(text.includes('Envoi confirmé par'),false);
 assert.equal(await page.locator('[data-admin-status]').getAttribute('data-error'),'true');
 assert.equal((await page.evaluate(()=>__fixture.calls)).filter(call=>call.command==='invite').length,1);
});

test('an explicit failed delivery is distinct from an uncertain or sent delivery',async t=>{
 const page=await fixture(t);await page.evaluate(({admission})=>{__fixture.result={admission:{id:admission,state:'approved',revision:3},delivery:{state:'failed',requiresResume:true}};},{admission});
 await invite(page);await confirm(page);const text=await page.locator('[data-admin-status]').innerText();assert.match(text,/Envoi échoué/);assert.equal(text.includes('Envoi confirmé'),false);assert.equal(await page.locator('[data-admin-status]').getAttribute('data-error'),'true');
});

test('a lost mutation response preserves the form, prevents a second submit and asks to inspect state',async t=>{
 const page=await fixture(t);await invite(page);await page.evaluate(()=>{__fixture.error={status:503};});await confirm(page);
 assert.equal(await page.locator('[data-admin-confirm]').isDisabled(),true);
 assert.match(await page.locator('dialog [data-admin-status]').innerText(),/réponse n’a pas été confirmée.*historique/);
 assert.equal(await page.getByLabel('Adresse e-mail',{exact:true}).inputValue(),'new@example.invalid');
 assert.equal((await page.evaluate(()=>__fixture.calls)).filter(call=>call.command==='invite').length,1);
});

test('status changes carry displayed CAS revision, confirmation and a new operation ID',async t=>{
 const page=await fixture(t);await view(page,'admin-status');await page.locator('[data-admin-status-action=suspended]').click();
 assert.match(await page.locator('dialog').innerText(),/déjà signés/);
 await page.evaluate(()=>{__fixture.result={status:'suspended',revision:5,replayed:false,sessionBoundaryPending:false};});await confirm(page);
 const call=(await page.evaluate(()=>__fixture.calls)).find(call=>call.command==='setStatus');
 assert.equal(call.payload.userId,target);assert.equal(call.payload.expectedRevision,4);assert.equal(call.payload.confirmed,true);assert.equal(call.payload.status,'suspended');assert.match(call.payload.operationId,/^[0-9a-f-]{36}$/);
 assert.match(await page.locator('[data-admin-status]').innerText(),/Suspension confirmée par le serveur/);
});

test('reactivation is not declared confirmed while the server session boundary is pending',async t=>{
 const page=await fixture(t);await page.evaluate(()=>{__fixture.list.items[1].status='suspended';__fixture.result={status:'active',revision:5,sessionBoundaryPending:true};});
 await view(page,'admin-status');await page.locator('[data-admin-status-action=active]').click();await confirm(page);
 const text=await page.locator('[data-admin-status]').innerText();assert.match(text,/pas entièrement confirmé/);assert.equal(text.includes('Réactivation confirmée'),false);
});

test('CAS refusal does not retry or display a successful status',async t=>{
 const page=await fixture(t);await view(page,'admin-status');await page.locator('[data-admin-status-action=suspended]').click();await page.evaluate(()=>{__fixture.error={status:409,code:'operation_conflict'};});await confirm(page);
 assert.match(await page.locator('dialog [data-admin-status]').innerText(),/L’état a changé/);assert.equal((await page.evaluate(()=>__fixture.calls)).filter(call=>call.command==='setStatus').length,1);
 assert.equal((await page.locator('dialog').innerText()).includes('Suspension confirmée'),false);
});

test('existing child request preserves its identifier and cannot open the production child delivery gate',async t=>{
 const request={id:admission,email:'child@example.invalid',purpose:'family-child',state:'requested',revision:2,memberId:'canonical-child-7'};
 const page=await fixture(t,{requests:[request]});await view(page,'admin-requests');
 assert.match(await page.locator('[data-admin-request]').innerText(),/canonical-child-7/);
 assert.equal(await page.getByRole('button',{name:'Approuver',exact:true}).isDisabled(),true);
 assert.match(await page.locator('[data-admin-request]').innerText(),/profil enfant local et ses données sont conservés/);
});

test('family decisions carry admission CAS without family payloads',async t=>{
 const request={id:admission,email:'parent-new@example.invalid',purpose:'family-parent',state:'requested',revision:7};
 const page=await fixture(t,{requests:[request]});await view(page,'admin-requests');await page.getByRole('button',{name:'Refuser',exact:true}).click();
 await page.evaluate(({admission})=>{__fixture.result={admission:{id:admission,state:'rejected',revision:8}};},{admission});await confirm(page);
 const call=(await page.evaluate(()=>__fixture.calls)).find(call=>call.command==='decide');assert.deepEqual(Object.keys(call.payload).sort(),['admissionId','decision','expectedRevision','operationId']);assert.equal(call.payload.admissionId,admission);assert.equal(call.payload.expectedRevision,7);assert.equal(call.payload.decision,'reject');
});

test('request and account cursors advance independently without duplicate hidden first pages',async t=>{
 const first={id:admission,email:'first@example.invalid',purpose:'family-parent',state:'rejected',revision:2};
 const second={id:admission2,email:'second@example.invalid',purpose:'family-parent',state:'requested',revision:1};
 const page=await fixture(t,{requests:[first]});await page.evaluate(({admission,target})=>{__fixture.list.nextRequestsCursor=admission;__fixture.list.nextCursor=target;},{admission,target});
 await view(page,'admin-requests');await page.evaluate(({second})=>{__fixture.list.requests=[second];__fixture.list.nextRequestsCursor=null;},{second});
 await page.locator('[data-admin-more=requests]').click();await page.waitForFunction(()=>!DobbyAdminAccess.busy);
 const call=(await page.evaluate(()=>__fixture.calls)).at(-1);assert.deepEqual(call,{command:'listAccess',payload:{limit:25,requestsCursor:admission}});
 assert.equal(await page.locator('[data-admin-request]').count(),2);assert.equal(await page.locator('[data-admin-more=accounts]').count(),1);
});

test('history projects dates, actor, target, decision IDs and has no mutation action',async t=>{
 const page=await fixture(t);await page.evaluate(({owner,target,admission})=>{__fixture.history.items=[{id:admission,actorUserId:owner,targetUserId:target,action:'suspend',beforeStatus:'active',afterStatus:'suspended',revision:2,decidedAt:'2026-11-18T09:00:00Z'}];},{owner,target,admission});
 await view(page,'admin-history');const card=page.locator('[data-admin-decision]');const text=await card.innerText();assert.match(text,/Acteur/);assert.match(text,/Cible/);assert.match(text,/18 nov/);assert.match(text,/Actif → Suspendu/);assert.equal(await card.locator('button').count(),0);
});

test('projected labels are text, never injected HTML or private family content',async t=>{
 const page=await fixture(t,{items:[{userId:target,email:'<img src=x onerror=alert(1)>',status:'unapproved',revision:0,isOwner:false,admissions:[],privateFamily:{secret:'SHOULD_NOT_RENDER'}}]});
 await view(page,'admin-access');assert.equal(await page.locator('main img').count(),0);assert.match(await page.locator('main').innerText(),/<img src=x/);assert.equal((await page.locator('main').innerText()).includes('SHOULD_NOT_RENDER'),false);
});

test('late metadata cannot remount an admin form after its route was left',async t=>{
 const page=await fixture(t);await page.evaluate(()=>{__fixture.defer='listAccess';window.pending=DobbyAdminAccess.prepare('admin-invite');});await page.waitForFunction(()=>!!__fixture.deferred);
 await page.evaluate(()=>{DobbyAdminAccess.leave();__context.ui.view='menu';document.body.dataset.familyView='menu';__context.main.textContent='MENU';__fixture.release(__fixture.list);});await page.evaluate(()=>window.pending);
 assert.equal(await page.locator('main').innerText(),'MENU');assert.equal(await page.locator('input[name=email]').count(),0);
});

test('account switch clears a pending operation and its late receipt cannot restore the old view',async t=>{
 const page=await fixture(t);await invite(page);await page.evaluate(()=>{__fixture.defer='invite';});
 await page.locator('dialog input[name=confirmed]').check();await page.locator('[data-admin-confirm]').click();await page.waitForFunction(()=>!!__fixture.deferred);
 await page.evaluate(()=>__fixture.emit({userId:'00000000-0000-4000-8000-000000000006',verified:false,privateAccess:{status:'unapproved'}}));
 assert.equal(await page.evaluate(()=>DobbyAdminAccess.busy),false);assert.equal(await page.locator('dialog').count(),0);
 await page.evaluate(({admission})=>__fixture.release({admission:{id:admission,state:'sent'},delivery:{outcome:'sent'}}),{admission});
 await page.waitForTimeout(50);assert.equal(await page.getByRole('heading',{name:'Administration indisponible'}).count(),1);assert.equal((await page.locator('main').innerText()).includes('Envoi confirmé'),false);
});
