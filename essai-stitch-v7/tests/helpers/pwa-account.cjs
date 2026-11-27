/* Additional assertions on the disposable #51 Auth fixture, with a live worker. */
'use strict';
const assert = require('node:assert/strict');
const {familyPage,verified,logout,login,password,capture,request,token} = require('../family-onboarding.cjs');

const nameA = 'TEST Conversation privée du parent A';
const nameB = 'TEST Conversation privée du parent B';
const cartTitle = 'TEST Article conservé hors ligne';

async function openPrivateChat(page, userId, expected, previous) {
  await page.goto(familyPage+'#salon');
  await verified(page);
  await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
  await page.evaluate(async ({userId,expected})=>{
    const api = DobbyFamilyStitchEngine.win().DobbyFamilyUI;
    assertOwner(api,userId);
    await api.putMeta('v7-private-chat:'+encodeURIComponent(userId),{
      version:1,owner:userId,rows:[{id:'pwa-private',input:expected,answer:'TEST Réponse locale',links:[]}]
    });
    function assertOwner(native, id){if(native.getContext().userId!==id)throw Error('La fixture n’est pas liée à ce compte.');}
    await DobbyFamilyStitch.open('chat');
  },{userId,expected});
  await page.getByText(expected,{exact:true}).waitFor();
  if(previous)assert.equal(await page.getByText(previous,{exact:true}).count(),0);
}

async function checkWorker(page) {
  await page.waitForFunction(()=>navigator.serviceWorker?.controller?.scriptURL.endsWith('/pwa-sw.js'));
}

async function verifyParentsOnSharedDevice(account, oldTab, parent, secondParent, email, width) {
  const {page,context,setBackendOnline}=account;
  await checkWorker(page);
  // The child fixture changed the shared registry from another browser.
  // Drain the existing household sync before switching its active parent.
  await page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.sync());
  await page.waitForFunction(()=>DobbyFamilyStitchEngine.read().members.some(member=>
    member.id==='test-enfant-un'&&member.magicProfile?.houseId==='ravenclaw'));
  await openPrivateChat(page,parent.userId,nameA);
  await logout(page);
  try{await login(page,email('parent-b'),password);}catch(error){
    const state=await page.evaluate(()=>{
      const access=DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state();
      return {route:location.pathname+location.hash,phase:access.phase,verified:access.verified,
        notice:document.querySelector('[data-access-status]')?.textContent};
    });
    throw Error('Connexion du parent B sur l’appareil partagé '+JSON.stringify(state),{cause:error});
  }
  assert.equal((await verified(page)).userId,secondParent.userId);
  await oldTab.waitForFunction(id=>window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI?.getContext()?.userId===id,secondParent.userId);
  await openPrivateChat(page,secondParent.userId,nameB,nameA);
  await capture(page,width,'pwa-session-parent-b');
  console.log('PWA_SHARED_PARENTS_PASS',width,'same household and independent private E02 histories');

  // Native IndexedDB queues the local write. The worker has no sync queue.
  setBackendOnline(false);
  await context.setOffline(true);
  try {
    await page.evaluate(async title=>{
      const grocery=DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery;
      await grocery.add({title,quantity:1,unit:'pièce'});
    },cartTitle);
    // The UI hides the native state while Auth is unverified. Inspect the
    // disposable fixture's durable queue instead of reopening it in the UI.
    const pending = await page.evaluate(async ({title,owner})=>{
      const rows = await new Promise((resolve,reject)=>{
        const open=indexedDB.open('dobby-v5-household-preview-v2');
        open.onerror=()=>reject(open.error);
        open.onsuccess=()=>{
          const db=open.result;
          const transaction=db.transaction('items','readonly');
          const read=transaction.objectStore('items').getAll();
          read.onsuccess=()=>resolve(read.result);
          read.onerror=()=>reject(read.error);
          transaction.oncomplete=()=>db.close();
        };
      });
      return rows.find(item=>item.title===title&&item.storageKey.startsWith(owner+'|'))?.syncState;
    },{title:cartTitle,owner:secondParent.userId+'|'+secondParent.householdId});
    assert.equal(pending,'pending');
    await page.goto(familyPage+'#menu',{waitUntil:'domcontentloaded'});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
    assert.equal(await page.getByText(nameA,{exact:true}).count(),0);
    assert.equal(await page.getByText(nameB,{exact:true}).count(),0);
  } finally {
    setBackendOnline(true);
    await context.setOffline(false);
  }
  await page.reload();
  await verified(page);
  await page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.sync());
  await expectRemoteDelivery(secondParent.householdId,await token(page));
}

async function expectRemoteDelivery(householdId,bearer) {
  const endpoint='dobby_v2_grocery?select=title&household_id=eq.'+encodeURIComponent(householdId);
  for(let attempt=0;attempt<50;attempt++){
    const rows=await request(endpoint,{bearer});
    if(rows.filter(row=>row.title===cartTitle).length===1)return;
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw Error('L’écriture Courses en attente n’a pas été resynchronisée.');
}

async function verifyChildOnSharedDevice(page,width) {
  await checkWorker(page);
  await page.goto(familyPage+'#chat');
  await verified(page);
  await page.waitForFunction(()=>!location.hash.startsWith('#chat'));
  assert.equal(await page.getByText(nameA,{exact:true}).count(),0);
  assert.equal(await page.getByText(nameB,{exact:true}).count(),0);
  await assert.rejects(page.evaluate(()=>DobbyChatEngine.load()),/réservé aux parents/);
  const cacheURLs = await page.evaluate(async()=>{
    const urls=[];
    for(const name of await caches.keys()){
      const cache=await caches.open(name);
      urls.push(...(await cache.keys()).map(request=>request.url));
    }
    return urls;
  });
  assert.ok(cacheURLs.some(url=>url.endsWith('/essai-stitch-v7/famille.html')));
  assert.ok(cacheURLs.every(url=>!/(?:\/auth\/v1|\/rest\/v1|\/storage\/v1|invite=|code=)/i.test(url)));
  await capture(page,width,'pwa-session-enfant');
  console.log('PWA_SHARED_ACCOUNT_PASS',width,'native offline grocery queue, session A → B → child, private E02 and API excluded');
}

module.exports={verifyParentsOnSharedDevice,verifyChildOnSharedDevice};
