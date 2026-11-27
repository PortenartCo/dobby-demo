/* Chromium and the native child account lifecycle against local services. */
'use strict';
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {randomUUID} = require('node:crypto');
const {mkdir} = require('node:fs/promises');
const {chromium} = require('playwright');
const {
  browserAccount, heading, button, field, signup, createHousehold, verified, token, request, rpc, capture,
  mailLink, logout, login, waitTraverse, acceptBody, origin, out, familyPage, password, resetPassword
} = require('./family-onboarding.cjs');
const {verifyParentsOnSharedDevice,verifyChildOnSharedDevice} = require('./helpers/pwa-account.cjs');

const fixtureConfig = {childAccountsAvailable:true};
const pwa = process.env.DOBBY_ONBOARDING_PWA==='1';
const members = [
  {id:'test-enfant-un',name:'TEST Enfant Un',memberCategory:'child',avatar:'👤',
    magicProfile:{version:1,houseId:'hufflepuff',avatarId:'portrait-2',patronusId:'otter'}},
  {id:'test-enfant-deux',name:'TEST Enfant Deux',memberCategory:'child',avatar:'👤',
    magicProfile:{version:1,houseId:'gryffindor',avatarId:'portrait-3',patronusId:'stag'}}
];
const sentinel = 'TEST_CONFIDENTIEL_PARENT_SANTE';

function sql(statement, values) {
  const container = process.env.DOBBY_LOCAL_PG_CONTAINER;
  assert.match(container, /^dobby-onboarding-[a-z0-9-]+$/);
  const args = Object.entries(values).flatMap(([key,value]) => ['-v', key+'='+value]);
  return execFileSync('docker', ['exec','-i',container,'psql','-XqAt','-v','ON_ERROR_STOP=1',
    '-U','dobby_fixture_admin','-d','dobby_onboarding',...args], {input:statement, encoding:'utf8'}).trim();
}

async function showMember(page, member) {
  await page.goto(familyPage+'#members');
  await page.waitForFunction(() => window.DobbyFamilyStitch?.ready && window.DobbyStitchV7?.ready);
  try{await verified(page);}catch(error){
    const detail = await page.evaluate(async()=> {
      const api = window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI;
      try {await api?.access.refresh(); return api?.access.state().phase;}
      catch (failure) {return failure.message;}
    });
    throw new Error('La session parent ne peut pas ouvrir la fiche: '+detail,{cause:error});
  }
  await page.evaluate(async()=>{
    await DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.refresh();
    await DobbyFamilyStitch.open('members');
  });
  const card = page.locator('[data-fa-member="'+member.id+'"]');
  try{await card.click();}catch(error){
    const detail = await page.evaluate(id => ({
      view:document.body.dataset.familyView,
      memberAvailable:DobbyFamilyStitchEngine.read().members.some(m=>m.id===id),
      access:DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state().phase
    }),member.id);
    throw Error('Fiche enfant indisponible '+JSON.stringify(detail),{cause:error});
  }
  await heading(page, member.name);
}

async function inviteChild(page, member) {
  await showMember(page, member);
  await button(page, 'Donner accès à DOBBY').click();
  await button(page, 'Créer un lien d’invitation').click();
  const fieldLink = field(page, 'Lien personnel d’invitation');
  await fieldLink.waitFor();
  const link = new URL(await fieldLink.inputValue());
  assert.equal(link.origin, origin);
  assert.match(link.searchParams.get('invite'), /^child:/);
  await button(page, 'Fermer').click();
  return link;
}

async function openChild(page, link, mail, householdName) {
  await page.goto(link.href);
  await heading(page, householdName);
  await button(page, 'Créer mon compte pour rejoindre').click();
  await field(page, 'Adresse e-mail').fill(mail);
  await field(page, 'Mot de passe').fill(password);
  await field(page, 'Confirmer le mot de passe').fill(password);
  await button(page, 'Créer mon compte').click();
  await heading(page, 'Consultez votre messagerie');
  await page.goto(await mailLink(mail, 'signup'));
  await heading(page, householdName);
  assert.equal(await page.getByRole('heading',{name:'Mon profil',exact:true}).count(),0);
  await button(page, 'Rejoindre ce foyer').click();
  try{await waitTraverse(page);}catch(error){
    const status = await page.evaluate(()=>{
      const state=DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state();
      return {view:document.body.dataset.familyView,phase:state.phase,verified:state.verified,
        notice:document.querySelector('[data-access-status]')?.textContent};
    });
    throw Error('Retour après rattachement '+JSON.stringify(status),{cause:error});
  }
  return verified(page);
}

async function scenario(browser, width) {
  const accounts = await Promise.all(Array.from({length:4}, () => browserAccount(browser,width,fixtureConfig,{pwa})));
  const [a,b,c,d] = accounts.map(account => account.page);
  const run = randomUUID().slice(0,8);
  const email = name => 'dobby-'+run+'-'+name+'@example.test';
  const name = 'TEST Foyer enfants '+width;
  try {
    await signup(a,email('parent-a'),width);
    const parent = await createHousehold(a,name);
    const parentToken = await token(a);
    const parentInvitation = await rpc('create_invitation',parentToken,{p_expires_in_hours:24,p_operation_id:randomUUID()});
    const parentLink = new URL(origin);
    parentLink.searchParams.set('invite',parentInvitation.token);
    await b.goto(parentLink.href);
    await heading(b,name);
    await signup(b,email('parent-b'),width,true);
    await button(b,'Rejoindre ce foyer').click();
    await waitTraverse(b);
    const secondParent = await verified(b);
    assert.equal(secondParent.householdId,parent.householdId);
    assert.notEqual(secondParent.memberId,parent.memberId);

    sql(`SET ROLE authenticated;
      SELECT set_config('request.jwt.claims',jsonb_build_object('sub',:'actor')::text,false);
      UPDATE public.dobby_v2_modules SET payload=payload || jsonb_build_object(
      'familyMembers',payload->'familyMembers'||:'children'::jsonb,
      'famHealth',jsonb_build_array(jsonb_build_object('title',:'secret')))
      WHERE household_id=:'household' AND module='family';`,
      {children:JSON.stringify(members),secret:sentinel,household:parent.householdId,actor:parent.userId});
    const missions = members.map((member,index)=>({id:'mission-'+index,title:'TEST Mission '+(index+1),
      assigneeId:member.id,status:'open',effort:'regular',rewardVersion:1}));
    await request('rpc/dobby_missions_v3_write',{bearer:parentToken,body:{
      p_household_id:parent.householdId,p_expected_revision:0,p_operation_id:randomUUID(),
      p_intent:{kind:'snapshot',payload:{manualMissions:missions,autoTasks:[]}}
    }});
    const expired = await rpc('create_child_invitation',parentToken,{
      p_member_id:members[0].id,p_expires_in_hours:24,p_operation_id:randomUUID()
    });
    sql("UPDATE dobby_v7_private.invitations SET expires_at=clock_timestamp()-interval '1 sec' WHERE id=:'id';",
      {id:expired.invitationId});
    const expiredLink = new URL(origin);
    expiredLink.searchParams.set('invite','child:'+expired.token);
    await c.goto(expiredLink.href);
    await c.locator('[data-invitation-state=expired]').waitFor();
    assert.equal(await button(c,'Rejoindre ce foyer').count(),0);
    await capture(c,width,'enfant-invitation-expiree',[field(c,'Code ou lien d’invitation')]);

    const firstLink = await inviteChild(a,members[0]);
    const secondLink = await inviteChild(b,members[1]);
    const first = await openChild(c,firstLink,email('enfant-un'),name);
    const second = await openChild(d,secondLink,email('enfant-deux'),name);
    assert.deepEqual([first.memberId,second.memberId],members.map(member=>member.id));
    assert.equal(new Set([parent.userId,secondParent.userId,first.userId,second.userId]).size,4);
    assert.ok([first,second].every(child => child.householdId===parent.householdId &&
      child.profile.memberCategory==='child' && child.capabilities.childAccessProtocol===1));
    assert.equal(first.profile.magicProfile.houseId,members[0].magicProfile.houseId);
    assert.equal(second.profile.magicProfile.avatarId,members[1].magicProfile.avatarId);
    const firstBearer = await token(c);
    const secondBearer = await token(d);
    const rawInvite = firstLink.searchParams.get('invite').slice('child:'.length);
    assert.equal((await rpc('accept_child_invitation',firstBearer,acceptBody(rawInvite))).replayed,true);
    assert.equal((await rpc('accept_child_invitation',secondBearer,acceptBody(rawInvite),400)).code,'22023');
    assert.deepEqual(await request('dobby_v2_modules?module=eq.family',{bearer:firstBearer}),[]);
    const family = await rpc('child_module?p_household_id='+parent.householdId+'&p_module=family',firstBearer);
    assert.equal(family.payload.familyMembers.length,4);
    assert.ok(!JSON.stringify(family).includes(sentinel));

    await c.goto(familyPage+'#members');
    await verified(c);
    await capture(c,width,'enfant-famille');
    await c.goto(familyPage+'#chat');
    await c.waitForFunction(() => !document.querySelector('#chat-message-input') && !location.hash.startsWith('#chat'));
    await c.goto(origin+'/essai-stitch-v7/missions.html');
    await verified(c);
    await c.locator('[data-e03-card="mission-0"]').waitFor();
    assert.equal(await c.locator('[data-e03-card="mission-1"]').count(),0);
    await capture(c,width,'enfant-missions');
    await c.locator('[data-dv7-complete="mission-0"]').click();
    const receipt = c.waitForResponse(response => response.request().method()==='POST' &&
      new URL(response.url()).pathname.endsWith('/dobby_missions_v3_write') &&
      response.request().postDataJSON()?.p_intent?.kind==='complete');
    await button(c,'Confirmer la mission').click();
    assert.equal((await receipt).status(),200);
    const done = await request('dobby_v2_modules?module=eq.missions',{bearer:parentToken});
    assert.equal(done[0].payload.manualMissions.find(mission=>mission.id==='mission-0').status,'done');
    assert.equal(done[0].payload.manualMissions.find(mission=>mission.id==='mission-1').status,'open');

    await c.goto(familyPage+'#access-account');
    await verified(c);
    await c.evaluate(async id=>{
      const api = DobbyFamilyStitchEngine.win().DobbyFamilyUI.access;
      await api.updateMagic({memberId:id,values:{magicHouseId:'ravenclaw'},expectedRevision:api.state().familyRevision});
    },first.memberId);
    assert.equal((await verified(c)).profile.magicProfile.houseId,'ravenclaw');
    await logout(c);
    await button(c,'Continuer').click();
    await button(c,'Mot de passe oublié').click();
    await field(c,'Adresse e-mail').fill(email('enfant-un'));
    await button(c,'Envoyer le lien de récupération').click();
    await heading(c,'Consultez votre messagerie');
    await c.goto(await mailLink(email('enfant-un'),'recovery'));
    await heading(c,'Choisir un nouveau mot de passe');
    await field(c,'Nouveau mot de passe').fill(resetPassword);
    await field(c,'Confirmer le mot de passe').fill(resetPassword);
    await button(c,'Enregistrer mon mot de passe').click();
    await waitTraverse(c);
    assert.equal((await verified(c)).memberId,first.memberId);

    const oldTab = await accounts[0].context.newPage();
    await oldTab.goto(familyPage+'#members');
    assert.equal((await verified(oldTab)).memberId,parent.memberId);
    if(pwa)await verifyParentsOnSharedDevice(accounts[0],oldTab,parent,secondParent,email,width);
    await logout(a);
    await login(a,email('enfant-un'),resetPassword);
    assert.equal((await verified(a)).memberId,first.memberId);
    await oldTab.waitForFunction(id => {
      const api = window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI;
      return api?.childAccessState().active && api.getContext()?.memberId===id;
    },first.memberId);
    assert.equal(await oldTab.locator('#invite-member-btn').count(),0);
    assert.ok(!await a.evaluate(secret => {
      const engine = window.DobbyFamilyStitchEngine;
      return JSON.stringify(engine.read()).includes(secret);
    },sentinel));
    if(pwa)await verifyChildOnSharedDevice(a,width);
    await showMember(b,members[0]);
    await button(b,'Suspendre l’accès à DOBBY').click();
    await button(b,'Confirmer la suspension').click();
    await b.getByText('Accès suspendu. La fiche et son historique sont conservés.',{exact:true}).waitFor();
    const stale = await rpc('context',firstBearer,{});
    assert.notEqual(stale.phase,'active');
    await c.reload();
    await c.waitForFunction(() => {
      const api = window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI;
      const access = api?.access.state();
      return access?.authenticated && access.phase==='rejected' && access.reason==='child_access_suspended';
    });
    assert.equal((await rpc('context',secondBearer,{})).memberId,second.memberId);
    const persisted = await request('dobby_v2_modules?module=eq.family',{bearer:await token(b)});
    assert.equal(persisted[0].payload.familyMembers.find(member=>member.id===first.memberId).magicProfile.houseId,'ravenclaw');
    assert.deepEqual(accounts.flatMap(account=>account.errors),[]);
    console.log('CHILD_ONBOARDING_LOCAL_PASS',width,'two parents, two canonical children, mail, replay, expiry, recovery, shared device, suspension');
  } finally {
    await Promise.all(accounts.map(account=>account.context.close()));
  }
}

(async () => {
  if (out) await mkdir(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',
    args:['--no-sandbox','--host-resolver-rules=MAP pqcdkrwljgvgagzwrcmg.supabase.co 127.0.0.1']});
  try {
    console.log('CHROMIUM',browser.version());
    for (const width of (process.env.DOBBY_ONBOARDING_WIDTHS||'320,390,1440').split(',').map(Number)) await scenario(browser,width);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
