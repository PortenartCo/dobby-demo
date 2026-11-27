/* Exercise the V7 console and native V5 Auth transport with synthetic HTTP responses. */
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { canonicalGroceryFixture } = require('./helpers/canonical-grocery-fixture.cjs');

const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const family = origin + '/essai-stitch-v7/famille.html';
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12,'0');
const users = { A:uuid(1), B:uuid(2), C:uuid(3) };
const household = uuid(10);
const ownerMarker = 'fixture-owner@example.test';
const project = 'https://pqcdkrwljgvgagzwrcmg.supabase.co';
const deferred = () => {let resolve;const promise = new Promise(r => {resolve = r;});return {promise,resolve};};

async function install(context,{enabled,childEnabled=false}) {
  const canonical = canonicalGroceryFixture(household,users);
  canonical.profiles.C.memberCategory = 'child';
  const fixture = { calls:[], protocol:1, hold:null, wrongProjection:false };
  const account = (role,email) => ({userId:users[role],email,status:'active',revision:1,isOwner:role==='A',admissions:[]});
  await context.route('**/*',async route => {
    const request = route.request(),url = new URL(request.url()),endpoint = url.pathname;
    if(url.origin === origin){
      if(endpoint === '/essai-stitch-v7/access-config.js')return route.fulfill({contentType:'text/javascript',
        body:`window.DobbyPublicConfig=Object.freeze({privateAdministrationAvailable:${enabled},childAccountsAvailable:${childEnabled},publicKey:'sb_publishable_admin_fixture_only'});`});
      return route.continue();
    }
    if(url.origin !== project)return route.abort();
    const headers = request.headers();
    const cors = {'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':headers['access-control-request-headers'] || '*'};
    const json = (data,status=200) => route.fulfill({status,json:data,headers:cors});
    const deny = () => json({message:'fixture denied'},403);
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(endpoint==='/auth/v1/token'){
      const body=request.postDataJSON(),role=body.email?.split('@')[0] || body.refresh_token?.replace('fixture-refresh-','');
      if(!users[role])return deny();
      return json({access_token:'fixture-access-'+role,refresh_token:'fixture-refresh-'+role,expires_in:3600,
        user:{id:users[role],email:role+'@example.test'}});
    }
    if(endpoint==='/auth/v1/logout')return json({});
    const role=/^Bearer fixture-access-([ABC])$/.exec(headers.authorization)?.[1];
    if(!users[role])return deny();
    if(endpoint==='/functions/v1/dobby-access-admin'){
      assert.equal(request.method(),'POST');
      const {command,payload}=request.postDataJSON();fixture.calls.push({role,command,payload});
      if(role!=='A')return deny();
      if(fixture.hold){const hold=fixture.hold;fixture.hold=null;await hold.promise;}
      if(command==='listAccess')return json({ok:true,result:{protocol:fixture.protocol,
        items:fixture.wrongProjection?[null]:[account('A',ownerMarker),account('B','fixture-parent@example.test')],
        requests:[],nextCursor:null,nextRequestsCursor:null}});
      if(command==='listDecisions')return json({ok:true,result:{protocol:fixture.protocol,items:[],nextCursor:null}});
      if(command==='invite')return json({ok:true,result:{admission:{state:'sent'},delivery:{outcome:'sent'}}});
      return deny();
    }
    if(endpoint.endsWith('/dobby_v2_memberships'))return json([{household_id:household,user_id:users[role],active:true}]);
    if(endpoint.endsWith('/dobby_v2_households'))return json([{id:household}]);
    if(endpoint.endsWith('/dobby_v2_grocery'))return json([]);
    if(endpoint.endsWith('/dobby_v7_context'))return json(canonical.context(role));
    if(endpoint.endsWith('/dobby_v7_child_module')&&role==='C'){
      const module=url.searchParams.get('p_module');
      if(module==='family')return json({...canonical.familyRow,payload:{...canonical.familyRow.payload,
        familyMembers:[canonical.profiles.C]}});
      if(module==='missions')return json(null);
      return deny();
    }
    if(endpoint.endsWith('/dobby_v7_family_capabilities'))return json({protocol:2,installed:childEnabled,
      familyRolesAvailable:true,familyRolesVerified:true,storagePoliciesVerified:true,
      childAccountLinkAvailable:true,childAccountLinkVerified:true,childAccessProtocol:1});
    if(endpoint.endsWith('/dobby_v2_modules')){
      if(request.method()!=='GET')return deny();
      const name=url.searchParams.get('module');
      return json(name==='eq.family'?[canonical.familyRow]:name?[]:[{module:'family'}]);
    }
    if(endpoint.includes('missions')&&endpoint.endsWith('_capabilities'))return json({});
    return deny();
  });
  return fixture;
}

async function ready(page) {
  await page.waitForFunction(()=>window.DobbyStitchV7?.ready &&
    document.querySelector('#dv7-engine')?.contentWindow.DobbyFamilyUI?.connectionState().ready);
}
async function signIn(page,role) {
  await page.evaluate(role=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.signIn(role+'@example.test','fixture-only-password'),role);
  await page.waitForFunction(userId=>{const api=DobbyFamilyStitchEngine.win().DobbyFamilyUI;
    return api.connectionState().identityVerified && api.connectionState().userId===userId;},users[role]);
}
const view = (page,name) => page.evaluate(name=>DobbyFamilyStitch.open(name),name);
const direct = async(page,name) => {
  await page.goto(family+'?fixture-admin='+name+'#'+name);
  await ready(page);
};
const projection = page => page.locator('[data-admin-account],[data-admin-request],[data-admin-decision]');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  async function scenario(options,run){
    const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:900}});
    try {
      const fixture=await install(context,options),page=await context.newPage();
      page.setDefaultTimeout(9000);
      await direct(page,'salon');
      await run(page,fixture);
    } finally {await context.close();}
  }
  try {
    await scenario({enabled:true,childEnabled:true},async(page,fixture)=>{
      await signIn(page,'A');
      await direct(page,'admin-access');
      await page.getByText(ownerMarker,{exact:true}).waitFor();
      assert.equal(await page.locator('[data-admin-tab]').count(),5);
      assert.equal(await page.locator('body > nav [data-e01-destination]').count(),6);
      await view(page,'menu');
      await page.locator('[data-admin-entry]').click();
      await page.getByText(ownerMarker,{exact:true}).waitFor();
      await view(page,'admin-requests');
      await page.getByRole('heading',{name:'Demandes familiales',exact:true}).waitFor();
      await view(page,'admin-status');
      await page.getByRole('heading',{name:'Suspendre / Réactiver',exact:true}).waitFor();
      assert.equal(await page.locator('select[data-admin-target]').inputValue(),users.B);
      await view(page,'admin-history');
      await page.getByRole('heading',{name:'Historique',exact:true}).waitFor();
      assert.equal(fixture.calls.at(-1).command,'listDecisions');
      await view(page,'admin-invite');
      await page.getByLabel('Adresse e-mail',{exact:true}).fill('new@example.test');
      await page.getByRole('button',{name:'Préparer le récapitulatif'}).click();
      const dialog=page.locator('[data-admin-confirmation]');
      assert.ok(await dialog.locator('[data-admin-confirm]').isDisabled());
      assert.equal(fixture.calls.filter(call=>call.command==='invite').length,0);
      await dialog.locator('input[name=confirmed]').check();
      await dialog.locator('[data-admin-confirm]').click();
      await page.getByText(/Envoi confirmé par le service/).waitFor();
      const invites=fixture.calls.filter(call=>call.command==='invite');
      assert.equal(invites.length,1);
      assert.deepEqual({...invites[0].payload,operationId:undefined},{email:'new@example.test',purpose:'new-household',operationId:undefined});
      assert.match(invites[0].payload.operationId,/^[\da-f-]{36}$/i);
      fixture.protocol=2;
      await view(page,'admin-access');
      await page.getByRole('heading',{name:'Administration indisponible'}).waitFor();
      assert.equal(await projection(page).count(),0);
      fixture.protocol=1;fixture.wrongProjection=true;
      await view(page,'admin-access');
      await page.getByRole('heading',{name:'Administration indisponible'}).waitFor();
      assert.equal(await projection(page).count(),0);
      fixture.wrongProjection=false;
      const hold=deferred();fixture.hold=hold;
      const requested=page.waitForRequest(request=>request.url().endsWith('/dobby-access-admin')&&request.method()==='POST');
      const pending=view(page,'admin-access');
      // Catch immediately while the alternate account changes the route.
      const navigated=pending.then(()=>false,error=>{
        if(!/Execution context was destroyed/.test(error.message))throw error;
        return true;
      });
      await requested;
      try {await page.evaluate(()=>DobbyAccess.logout());await ready(page);await signIn(page,'B');}
      finally {hold.resolve();}
      await navigated;
      assert.equal(await page.getByText(ownerMarker,{exact:true}).count(),0);
      await direct(page,'admin-access');
      await page.getByRole('heading',{name:'Administration indisponible'}).waitFor();
      assert.equal(await projection(page).count(),0);
      assert.ok(fixture.calls.some(({role})=>role==='B'),'Non-owner denied by the fixture Edge over native transport');
      await view(page,'menu');
      assert.equal(await page.locator('[data-admin-entry]').count(),0);
      assert.ok(await page.locator('#menu-sections .module-item').count()>0);
    });
    await scenario({enabled:false},async(page,fixture)=>{
      await signIn(page,'A');await direct(page,'admin-access');
      assert.equal(await page.locator('main[data-admin-view]').count(),0);
      await view(page,'menu');assert.equal(await page.locator('[data-admin-entry]').count(),0);
      assert.deepEqual(fixture.calls,[]);
    });
    await scenario({enabled:true,childEnabled:true},async(page,fixture)=>{
      await signIn(page,'C');
      assert.ok(await page.evaluate(()=>DobbyStitchV7.childAccess().restricted));
      await direct(page,'admin-invite');
      assert.equal(await page.locator('main[data-admin-view]').count(),0);
      await view(page,'menu');assert.equal(await page.locator('[data-admin-entry]').count(),0);
      assert.deepEqual(fixture.calls,[]);
    });
    await scenario({enabled:true},async(page,fixture)=>{
      await signIn(page,'A');
      await page.evaluate(()=>{DobbyFamilyStitchEngine.win().DobbyReview={demoMemberId:'fixture-demo'};});
      await view(page,'admin-access');
      assert.equal(await page.locator('main[data-admin-view]').count(),0);
      assert.equal(await projection(page).count(),0);
      assert.deepEqual(fixture.calls,[]);
    });
  } finally {await browser.close();}
  console.log('PRIVATE_ADMINISTRATION_BROWSER_PASS owner authorization, native actor switch, disabled, child and demo');
})().catch(error=>{console.error(error);process.exitCode=1;});
