import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';

const file=new URL('../family-access.mjs',import.meta.url);
async function accessModule(){assert.ok(fs.existsSync(file),'Native account access module must exist');return import(file);}
const USER='00000000-0000-4000-8000-000000000001',HH='00000000-0000-4000-8000-000000000010';
const active=()=>({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-canonical-person',profile:{id:'local-canonical-person',firstName:'Camille',name:'Camille'},permissions:{canEdit:true,canMagic:true,canCreate:false,canInvite:true},pendingCeremony:true,familyRevision:7});
async function fixture(){
 const {createFamilyAccess}=await accessModule(),metadata=new Map(),calls=[];
 const native={ready:true,configured:true,userId:null,householdId:null,epoch:0,verified:false};let context={protocol:1,phase:'profile',userId:USER,profile:null},authResponse={access_token:'fixture-access',refresh_token:'fixture-refresh',user:{id:USER},expires_in:3600},binding=null;
 const driver={crypto:webcrypto,now:()=>Date.now(),snapshot:()=>({...native}),meta:async key=>metadata.get(key)??null,putMeta:async(key,value)=>metadata.set(key,structuredClone(value)),delMeta:async key=>metadata.delete(key),
  updateMeta:async(key,change)=>{const value=change(metadata.get(key)??null);assert.equal(typeof value?.then,'undefined','Metadata updater is synchronous');metadata.set(key,structuredClone(value));return value;},
  auth:async(path,method,body,options={})=>{calls.push({path,method,body,...options});return structuredClone(authResponse);},
  rpc:async(name,body,options)=>{calls.push({name,body,options});return structuredClone(context);},
  installSession:async result=>{native.userId=result.user.id;native.householdId=null;native.verified=false;native.epoch++;binding=null;},
  bind:async value=>{binding=structuredClone(value);native.householdId=value.householdId;native.verified=true;},clearBinding:()=>{binding=null;},
  logout:async()=>{native.epoch++;native.userId=null;native.householdId=null;binding=null;},notify:()=>{}};
 const api=createFamilyAccess(driver);
 return{api,driver,native,metadata,calls,setContext:value=>{context=value;},setAuth:value=>{authResponse=value;},binding:()=>binding,reload:()=>createFamilyAccess(driver)};
}

test('a new authenticated account retains its native session without inventing a household or member',async()=>{
 const f=await fixture();await f.api.signIn(' camille@example.test ','fixture-password');
 assert.equal(f.native.userId,USER);assert.equal(f.api.state().phase,'profile');assert.equal(f.api.state().memberId,null);assert.equal(f.api.state().verified,false);assert.equal(f.binding(),null);
 assert.equal(f.calls[0].path,'/auth/v1/token?grant_type=password');assert.equal(f.calls[0].body.email,'camille@example.test');
});

test('sign-in Auth refusals carry a safe stage while withholding provider details',async()=>{
 const f=await fixture();f.driver.auth=async()=>{throw Object.assign(Error('PRIVATE_RESPONSE camille@example.test'),{status:403,code:'email_not_confirmed',stage:'untrusted',cause:{token:'PRIVATE_TOKEN'}});};
 await assert.rejects(f.api.signIn('camille@example.test','fixture-password'),error=>{
  assert.equal(error.stage,'auth');assert.equal(error.status,403);assert.equal(error.code,'email_not_confirmed');
  assert.equal(error.cause,undefined);assert.doesNotMatch(error.message+JSON.stringify(error),/PRIVATE_RESPONSE|camille@example|PRIVATE_TOKEN|untrusted/);return true;
 });
 assert.equal(f.native.userId,null);assert.equal(f.api.state().verified,false);
});

test('context RPC refusals are distinct from other RPC and native binding failures',async()=>{
 const f=await fixture();f.driver.rpc=async()=>{throw Object.assign(Error('PRIVATE_CONTEXT_RESPONSE'),{status:403,code:'42501'});};
 await assert.rejects(f.api.signIn('camille@example.test','fixture-password'),error=>{
  assert.equal(error.stage,'context');assert.equal(error.status,403);assert.equal(error.code,'42501');assert.doesNotMatch(error.message,/PRIVATE_CONTEXT_RESPONSE/);return true;
 });
 assert.equal(f.native.userId,USER);assert.equal(f.api.state().verified,false);
 await assert.rejects(f.api.saveProfile({firstName:'Camille'}),error=>{assert.equal(error.stage,'service');return true;});
 const binding=await fixture();binding.setContext(active());binding.driver.bind=async()=>{throw Object.assign(Error('Binding refused'),{status:403});};
 await assert.rejects(binding.api.signIn('camille@example.test','fixture-password'),error=>{assert.notEqual(error.stage,'context');return true;});
 assert.equal(binding.api.state().verified,false);
});
test('email confirmation never creates a profile or household and persists only a scoped PKCE flow',async()=>{
 const f=await fixture();f.setAuth({id:USER,identities:[]});await f.api.signUp('camille@example.test','fixture-password',{redirectTo:'https://example.test/dobby/'});
 assert.equal(f.api.state().phase,'email-confirmation');assert.equal(f.native.userId,null);assert.equal(f.calls.some(x=>x.name),false);
 const request=f.calls[0];assert.equal(request.method,'POST');assert.equal(new URL('https://auth.test'+request.path).pathname,'/auth/v1/signup');assert.equal(request.body.code_challenge_method,'s256');assert.match(request.body.code_challenge,/^[A-Za-z0-9_-]{43}$/);
 assert.doesNotMatch(JSON.stringify([...f.metadata.values()]),/fixture-password|camille@example/);assert.doesNotMatch(JSON.stringify(f.api.state()),/fixture-access|fixture-refresh|code_verifier/);
 assert.equal((await f.reload().refresh()).phase,'email-confirmation');
});
test('PKCE callback after reload exchanges the matching verifier and returns a clean URL',async()=>{
 const f=await fixture();f.setAuth({id:USER});await f.api.signUp('camille@example.test','fixture-password',{redirectTo:'https://example.test/dobby/'});
 const redirect=new URL(new URL('https://auth.test'+f.calls[0].path).searchParams.get('redirect_to'));assert.equal(redirect.href,'https://example.test/dobby/');
 f.setAuth({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:USER}});
 const restored=f.reload(),result=await restored.confirmFromURL('https://example.test/dobby/?code=private-code&keep=yes');
 const exchange=f.calls.find(x=>x.path==='/auth/v1/token?grant_type=pkce');assert.equal(exchange.body.auth_code,'private-code');assert.match(exchange.body.code_verifier,/^[A-Za-z0-9_-]{43,128}$/);
 assert.equal(restored.state().phase,'profile');assert.equal(result.cleanURL,'https://example.test/dobby/?keep=yes');assert.equal([...f.metadata.keys()].some(key=>key.startsWith('v7-auth-flow:')),false);
});
test('an explicit obsolete flow id cannot borrow the current PKCE verifier',async()=>{
 const f=await fixture();f.setAuth({id:USER});await f.api.signUp('camille@example.test','fixture-password',{redirectTo:'https://example.test/dobby/'});const before=f.calls.length;
 await assert.rejects(f.api.confirmFromURL('https://example.test/dobby/?code=private-code&dobby_flow=wrong-flow'),/confirmation|navigateur/i);assert.equal(f.calls.length,before);assert.equal(f.native.userId,null);
});
test('active identity is accepted only from the matching authenticated server context',async()=>{
 const f=await fixture();f.setContext(active());await f.api.signIn('camille@example.test','fixture-password');
 const state=f.api.state();assert.equal(state.verified,true);assert.equal(state.memberId,'local-canonical-person');assert.equal(state.pendingCeremony,true);assert.equal(f.binding().memberId,'local-canonical-person');
 state.permissions.canEdit=false;state.profile.name='Spoof';assert.equal(f.api.state().permissions.canEdit,true);assert.equal(f.api.state().profile.name,'Camille');
 f.setContext({...active(),userId:'another-user'});await assert.rejects(f.api.refresh(),/contexte|identit/i);assert.equal(f.api.state().verified,false);assert.equal(f.binding(),null);
});
test('missing backend capability is unavailable and cannot turn membership or local persona into identity',async()=>{
 const f=await fixture();f.driver.rpc=async()=>{throw Object.assign(Error('server internal detail'),{status:404,code:'PGRST202'});};
 await f.api.signIn('camille@example.test','fixture-password');assert.equal(f.api.state().phase,'unavailable');assert.equal(f.api.state().memberId,null);assert.equal(f.binding(),null);assert.equal(f.native.userId,USER);
});
test('late server context cannot bind after a replacement account or logout',async()=>{
 const f=await fixture();await f.api.signIn('camille@example.test','fixture-password');let release;f.driver.rpc=()=>new Promise(resolve=>{release=resolve;});const pending=f.api.refresh();await Promise.resolve();f.native.epoch++;f.native.userId='replacement';release(active());
 await assert.rejects(pending,/chang|remplac/i);assert.equal(f.binding(),null);assert.equal(f.api.state().memberId,null);
});
test('household creation is server-confirmed and retry uses the same durable operation ID',async()=>{
 const f=await fixture();f.setContext({protocol:1,phase:'household',userId:USER,profile:{firstName:'Camille',name:'Camille'}});await f.api.signIn('camille@example.test','fixture-password');let fail=true;
 f.driver.rpc=async(name,body)=>{f.calls.push({name,body});if(name==='dobby_v7_create_household'){if(fail)throw TypeError('offline');return {ok:true};}return active();};
 await assert.rejects(f.api.createHousehold('  Chez nous  '),/réseau|indisponible/i);assert.equal(f.binding(),null);fail=false;await f.api.createHousehold('Chez nous');
 const creates=f.calls.filter(x=>x.name==='dobby_v7_create_household');assert.equal(creates.length,2);assert.equal(creates[0].body.p_name,'Chez nous');assert.equal(creates[0].body.p_operation_id,creates[1].body.p_operation_id);assert.equal(f.api.state().phase,'active');
});
test('invitation preview has one server status and never exposes the token in public state',async()=>{
 const f=await fixture();f.driver.rpc=async(name,body,options)=>{f.calls.push({name,body,options});return {status:'expired',household:{id:HH,name:'must be discarded'},inviter:{name:'must be discarded'}};};
 const value=await f.api.previewInvitation('opaque-invite-code');assert.deepEqual(value,{status:'expired'});assert.deepEqual(f.api.state().invitation,{status:'expired'});assert.doesNotMatch(JSON.stringify(f.api.state()),/opaque-invite-code|discarded/);assert.equal(f.calls.at(-1).options.public,true);
});
test('invitation acceptance requires authentication and reuses an operation ID without persisting its token',async()=>{
 const f=await fixture();await assert.rejects(f.api.acceptInvitation('opaque-invite-code'),/connexion/i);assert.equal(f.calls.length,0);await f.api.signIn('camille@example.test','fixture-password');
 f.driver.rpc=async(name,body)=>{f.calls.push({name,body});return name==='dobby_v7_context'?active():{ok:true};};await f.api.acceptInvitation('opaque-invite-code');await f.api.acceptInvitation('opaque-invite-code');
 const accepts=f.calls.filter(x=>x.name==='dobby_v7_accept_invitation');assert.equal(accepts.length,2);assert.equal(accepts[0].body.p_operation_id,accepts[1].body.p_operation_id);assert.doesNotMatch(JSON.stringify([...f.metadata.entries()]),/opaque-invite-code/);assert.equal(f.api.state().memberId,'local-canonical-person');
});
test('profile changes use the server and cannot locally grant identity or permissions',async()=>{
 const f=await fixture();await f.api.signIn('camille@example.test','fixture-password');f.driver.rpc=async(name,body)=>{f.calls.push({name,body});return name==='dobby_v7_context'?{protocol:1,phase:'household',userId:USER,profile:{firstName:'Camille',lastName:'Dupont',name:'Camille Dupont',avatarId:'portrait-2'}}:{ok:true};};
 await f.api.saveProfile({firstName:' Camille ',lastName:'Dupont',avatarId:'portrait-2'});assert.equal(f.api.state().phase,'household');assert.equal(f.api.state().profile.name,'Camille Dupont');assert.equal(f.api.state().verified,false);assert.deepEqual(f.calls.find(x=>x.name==='dobby_v7_update_profile').body,{p_profile:{firstName:'Camille',lastName:'Dupont',avatarId:'portrait-2'}});
 await assert.rejects(f.api.saveProfile({firstName:'Camille',permissions:{canEdit:true}}),/profil|champ/i);
});
test('recovery uses PKCE and a password update needs the authenticated native bearer',async()=>{
 const f=await fixture();await assert.rejects(f.api.updatePassword('new-fixture-password'),/connexion/i);await f.api.recover('camille@example.test',{redirectTo:'https://example.test/dobby/'});assert.match(f.calls[0].path,/^\/auth\/v1\/recover\?redirect_to=/);assert.equal(f.calls[0].body.code_challenge_method,'s256');
 await f.api.signIn('camille@example.test','fixture-password');await f.api.updatePassword('new-fixture-password');const update=f.calls.find(x=>x.path==='/auth/v1/user');assert.equal(update.method,'PUT');assert.equal(update.body.password,'new-fixture-password');assert.equal(update.authenticated,true);
});
test('lost native household verification immediately withdraws the cached member identity',async()=>{
 const f=await fixture();f.setContext(active());await f.api.signIn('camille@example.test','fixture-password');f.native.verified=false;f.native.rejected=true;assert.equal(f.api.state().verified,false);assert.equal(f.api.state().memberId,null);assert.equal(f.api.state().phase,'rejected');
});
test('invitation creation returns its opaque token only to the caller and keeps retry idempotence',async()=>{
 const f=await fixture();f.setContext(active());await f.api.signIn('camille@example.test','fixture-password');assert.equal(typeof f.api.createInvitation,'function');f.driver.rpc=async(name,body)=>{f.calls.push({name,body});return{protocol:1,token:'opaque-server-only-token',expiresAt:'2026-11-19T10:00:00Z',household:{id:HH,name:'Chez nous'},inviter:{name:'Camille'}};};
 const result=await f.api.createInvitation({expiresInHours:24});await f.api.createInvitation({expiresInHours:24});assert.equal(result.token,'opaque-server-only-token');const calls=f.calls.filter(x=>x.name==='dobby_v7_create_invitation');assert.equal(calls[0].body.p_expires_in_hours,24);assert.equal(calls[0].body.p_operation_id,calls[1].body.p_operation_id);assert.doesNotMatch(JSON.stringify(f.api.state())+JSON.stringify([...f.metadata.values()]),/opaque-server-only-token/);
});
test('magic writes use the current canonical revision and adopt the confirmed snapshot before returning',async()=>{
 const f=await fixture();f.setContext(active());await f.api.signIn('camille@example.test','fixture-password');assert.equal(typeof f.api.updateMagic,'function');f.driver.rpc=async(name,body)=>{f.calls.push({name,body});return name==='dobby_v7_context'?{...active(),familyRevision:8,profile:{...active().profile,magicProfile:{version:1,houseId:'slytherin'}}}:{ok:true};};
 await f.api.updateMagic({memberId:'local-canonical-person',values:{magicHouseId:'slytherin'},expectedRevision:7,operationId:'00000000-0000-4000-8000-000000000099'});assert.equal(f.api.state().familyRevision,8);assert.equal(f.binding().profile.magicProfile.houseId,'slytherin');assert.deepEqual(f.calls.find(x=>x.name==='dobby_v7_update_magic').body,{p_member_id:'local-canonical-person',p_values:{magicHouseId:'slytherin'},p_expected_revision:7,p_operation_id:'00000000-0000-4000-8000-000000000099'});
 await assert.rejects(f.api.updateMagic({memberId:'other-member',values:{magicHouseId:'slytherin'},expectedRevision:8}),/autorisé|profil|membre/i);
});
test('bound native identity updates preserve fields through the server and resolve only after canonical adoption',async()=>{
 const f=await fixture();f.setContext(active());await f.api.signIn('camille@example.test','fixture-password');assert.equal(typeof f.api.updateMember,'function');f.driver.rpc=async(name,body)=>{f.calls.push({name,body});return name==='dobby_v7_context'?{...active(),familyRevision:8,profile:{...active().profile,name:'Camille Dupont',lastName:'Dupont'}}:{ok:true};};
 const id=await f.api.updateMember({memberId:'local-canonical-person',values:{name:'Camille Dupont',profileFirstName:'Camille',profileLastName:'Dupont',nickname:'Cam'},expectedRevision:7,operationId:'00000000-0000-4000-8000-000000000099'});assert.equal(id,'local-canonical-person');assert.equal(f.binding().profile.lastName,'Dupont');assert.equal(f.calls.find(x=>x.name==='dobby_v7_update_member').body.p_values.nickname,'Cam');
 await assert.rejects(f.api.updateMember({memberId:id,values:{permissions:{canEdit:true}},expectedRevision:8}),/champ|profil|valeur/i);
});
test('active profile save sends the displayed revision even after a newer context refresh',async()=>{
 const f=await fixture();f.setContext(active());await f.api.signIn('camille@example.test','fixture-password');
 const displayed=f.api.state();f.setContext({...active(),familyRevision:8});await f.api.refresh();
 await f.api.saveProfile({firstName:'Stale form'},{expectedRevision:displayed.familyRevision});
 const writes=f.calls.filter(x=>x.name==='dobby_v7_update_profile');assert.equal(writes.at(-1).body.p_expected_revision,7);
 await f.api.saveProfile({firstName:'Current immediate call'});assert.equal(f.calls.filter(x=>x.name==='dobby_v7_update_profile').at(-1).body.p_expected_revision,8);
 const before=f.calls.length;await assert.rejects(f.api.saveProfile({firstName:'Invalid revision'},{expectedRevision:null}),/révision/i);assert.equal(f.calls.length,before);
});
test('an active profile without a verified revision cannot fall back to draft writes',async()=>{
 const f=await fixture(),withoutRevision=active();delete withoutRevision.familyRevision;f.setContext(withoutRevision);await f.api.signIn('camille@example.test','fixture-password');
 const before=f.calls.length;await assert.rejects(f.api.saveProfile({firstName:'Unversioned'}),/révision/i);assert.equal(f.calls.length,before);
});

test('signup and recovery use the exact root URL without query, hash or wildcard',async()=>{
 const f=await fixture();f.setAuth({id:USER});
 for(const kind of ['signUp','recover']){
  await (kind==='signUp'?f.api.signUp('camille@example.test','fixture-password',{redirectTo:'https://example.test/dobby/'}):f.api.recover('camille@example.test',{redirectTo:'https://example.test/dobby/'}));
  assert.equal(new URL('https://auth.test'+f.calls.at(-1).path).searchParams.get('redirect_to'),'https://example.test/dobby/');
 }
 await assert.rejects(f.api.recover('camille@example.test',{redirectTo:'https://example.test/dobby/?flow=anything#access'}),/retour|exact/i);
});
test('only the latest browser flow is retained and a failed older callback cannot erase it',async()=>{
 const f=await fixture();f.setAuth({id:USER});await f.api.signUp('camille@example.test','fixture-password',{redirectTo:'https://example.test/dobby/'});
 const old=f.metadata.get('v7-auth-pending');await f.api.recover('camille@example.test',{redirectTo:'https://example.test/dobby/'});
 const latest=f.metadata.get('v7-auth-pending');assert.notEqual(latest.id,old.id);assert.equal(f.metadata.has('v7-auth-flow:'+old.id),false);
 f.driver.auth=async()=>{throw Object.assign(Error('wrong code verifier'),{status:400});};
 await assert.rejects(f.api.confirmFromURL('https://example.test/dobby/?code=older-code'),/indisponible/i);
 assert.equal(f.metadata.get('v7-auth-pending').id,latest.id);assert.ok(f.metadata.get('v7-auth-flow:'+latest.id).verifier);
});
test('recovery callback restores its own mode and cannot exchange from another path or account',async()=>{
 const f=await fixture();f.setAuth({id:USER});await f.api.recover('camille@example.test',{redirectTo:'https://example.test/dobby/'});
 const before=f.calls.length;
 await assert.rejects(f.api.confirmFromURL('https://example.test/dobby/other/?code=TEST'),/confirmation|navigateur/i);assert.equal(f.calls.length,before);
 f.native.userId='replacement';
 await assert.rejects(f.api.confirmFromURL('https://example.test/dobby/?code=TEST'),/confirmation|compte|navigateur/i);assert.equal(f.calls.length,before);
 f.native.userId=null;f.setAuth({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:USER}});
 assert.equal((await f.reload().confirmFromURL('https://example.test/dobby/?code=TEST')).recovery,true);
});
test('missing and expired browser PKCE state cannot exchange a code',async()=>{
 const f=await fixture();const before=f.calls.length;
 await assert.rejects(f.api.confirmFromURL('https://example.test/dobby/?code=TEST'),/confirmation|navigateur/i);assert.equal(f.calls.length,before);
 await f.api.recover('camille@example.test',{redirectTo:'https://example.test/dobby/'});
 const record=f.metadata.get('v7-auth-pending'),flow=f.metadata.get('v7-auth-flow:'+record.id);flow.createdAt-=86400001;
 await assert.rejects(f.api.confirmFromURL('https://example.test/dobby/?code=TEST'),/confirmation|navigateur/i);
 assert.equal(f.calls.some(c=>c.path==='/auth/v1/token?grant_type=pkce'),false);
});

test('a newer flow started during exchange prevents the old response from installing a session',async()=>{
 const f=await fixture();await f.api.recover('camille@example.test',{redirectTo:'https://example.test/dobby/'});
 let release;f.driver.auth=async(path)=>path.includes('grant_type=pkce')?new Promise(resolve=>{release=resolve;}):{};
 const exchange=f.api.confirmFromURL('https://example.test/dobby/?code=older-code');
 while(!release)await new Promise(resolve=>setImmediate(resolve));
 await f.api.recover('camille@example.test',{redirectTo:'https://example.test/dobby/'});
 const latest=f.metadata.get('v7-auth-pending');release({access_token:'fixture-access',refresh_token:'fixture-refresh',user:{id:USER},expires_in:3600});
 await assert.rejects(exchange,/confirmation|remplac|parcours/i);assert.equal(f.native.userId,null);assert.equal(f.metadata.get('v7-auth-pending').id,latest.id);
});

test('successful ordinary login clears an earlier email flow and logout returns to welcome state',async()=>{
 const f=await fixture();f.setAuth({id:USER});await f.api.signUp('camille@example.test','fixture-password',{redirectTo:'https://example.test/dobby/'});
 const pending=f.metadata.get('v7-auth-pending');f.setAuth({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:USER}});
 await f.api.signIn('camille@example.test','fixture-password');
 assert.equal(await f.driver.meta('v7-auth-pending'),null);assert.equal(f.metadata.has('v7-auth-flow:'+pending.id),false);
 await f.api.logout();assert.equal((await f.api.refresh()).phase,'signed-out');
});
test('failed ordinary login retains its email flow; explicit logout cancels that flow',async()=>{
 const f=await fixture();await f.api.recover('camille@example.test',{redirectTo:'https://example.test/dobby/'});
 const pending=f.metadata.get('v7-auth-pending');f.driver.auth=async()=>{throw Object.assign(Error('denied'),{status:400});};
 await assert.rejects(f.api.signIn('camille@example.test','bad-fixture-password'));assert.equal(f.metadata.get('v7-auth-pending').id,pending.id);
 await f.api.logout();assert.equal((await f.api.refresh()).phase,'signed-out');assert.equal(f.metadata.has('v7-auth-flow:'+pending.id),false);
});

for(const action of ['signIn','logout'])test(action+' cleanup cannot erase a newer recovery flow queued after its metadata transaction',async()=>{
 const f=await fixture(),{createFamilyAccess}=await accessModule(),redirectTo='https://example.test/dobby/';
 await f.api.recover('camille@example.test',{redirectTo});
 let tail=Promise.resolve(),heldCommit,holdPending=true,armed=false,pendingReads=0,injected=false,signalHeld;
 const held=new Promise(resolve=>{signalHeld=resolve;});
 // Model IndexedDB: every metadata read/write is a distinct serialized
 // transaction; updateMeta reads and changes its row inside one transaction.
 const transaction=work=>{const result=tail.then(work);tail=result.catch(()=>{});return result;};
 const enqueueNewer=()=>{if(injected)return;injected=true;heldCommit();};
 const store={
  meta:key=>transaction(()=>{const value=structuredClone(f.metadata.get(key)??null);if(armed&&key==='v7-auth-pending'&&++pendingReads===3)enqueueNewer();return value;}),
  putMeta:(key,value)=>{
   const commit=()=>transaction(()=>{f.metadata.set(key,structuredClone(value));});
   if(key==='v7-auth-pending'&&holdPending){holdPending=false;return new Promise((resolve,reject)=>{heldCommit=()=>commit().then(resolve,reject);signalHeld();});}
   return commit();
  },
  delMeta:key=>transaction(()=>f.metadata.delete(key)),
  updateMeta:(key,change)=>transaction(()=>{const value=change(structuredClone(f.metadata.get(key)??null));assert.equal(typeof value?.then,'undefined','Atomic updater cannot yield');f.metadata.set(key,structuredClone(value));if(armed&&key==='v7-auth-pending')enqueueNewer();return structuredClone(value);})
 };
 Object.assign(f.driver,store);
 // A second browser tab shares IndexedDB, while retaining its own signed-out
 // native session. Its new pending write is queued at the cleanup boundary.
 const otherNative={ready:true,configured:true,userId:null,epoch:0,verified:false};
 const other=createFamilyAccess({...f.driver,snapshot:()=>({...otherNative}),
  auth:async path=>path.includes('grant_type=pkce')?{access_token:'fixture-new-access',refresh_token:'fixture-new-refresh',user:{id:USER},expires_in:3600}:{},
  installSession:async result=>{otherNative.userId=result.user.id;otherNative.epoch++;},
  rpc:async()=>({protocol:1,phase:'profile',userId:USER,profile:null})});
 const recovering=other.recover('camille@example.test',{redirectTo});await held;armed=true;
 await(action==='signIn'?f.api.signIn('camille@example.test','fixture-password'):f.api.logout());
 await recovering;assert.equal(injected,true,'A real newer pending write was queued during cleanup');
 const newer=await f.driver.meta('v7-auth-pending');assert.ok(newer?.id,'Cleanup must preserve the newer pending pointer');assert.ok(f.metadata.get('v7-auth-flow:'+newer.id)?.verifier,'Cleanup must preserve its matching verifier');
 const confirmed=await other.confirmFromURL(redirectTo+'?code=fixture-new-code');assert.equal(confirmed.authenticated,true);assert.equal(confirmed.userId,USER);
});

for(const kind of ['callback','immediate signup'])test(kind+' cannot consume a newer pending flow or install its superseded session',async()=>{
 const f=await fixture(),{createFamilyAccess}=await accessModule(),redirectTo='https://example.test/dobby/';
 let releaseAuth,signalAuth;
 const authEntered=new Promise(resolve=>{signalAuth=resolve;}),authGate=new Promise(resolve=>{releaseAuth=resolve;});
 f.driver.auth=async path=>{
  if(path.includes(kind==='callback'?'grant_type=pkce':'/auth/v1/signup')){signalAuth();await authGate;return{access_token:'fixture-old-access',refresh_token:'fixture-old-refresh',user:{id:USER},expires_in:3600};}
  return{};
 };
 if(kind==='callback')await f.api.recover('camille@example.test',{redirectTo});
 const consuming=(kind==='callback'?f.api.confirmFromURL(redirectTo+'?code=fixture-old-code'):f.api.signUp('camille@example.test','fixture-password',{redirectTo})).then(value=>({value}),error=>({error}));
 await authEntered;const old=f.metadata.get('v7-auth-pending');assert.ok(old?.id);
 let tail=Promise.resolve(),heldCommit,holdPending=true,armed=false,injected=false,signalHeld;
 const held=new Promise(resolve=>{signalHeld=resolve;});
 const transaction=work=>{const result=tail.then(work);tail=result.catch(()=>{});return result;};
 const enqueueNewer=()=>{if(injected)return;injected=true;heldCommit();};
 const store={
  meta:key=>transaction(()=>structuredClone(f.metadata.get(key)??null)),
  putMeta:(key,value)=>{
   const commit=()=>transaction(()=>{f.metadata.set(key,structuredClone(value));});
   if(key==='v7-auth-pending'&&holdPending){holdPending=false;return new Promise((resolve,reject)=>{heldCommit=()=>commit().then(resolve,reject);signalHeld();});}
   return commit();
  },
  // Legacy consumption has already checked A before deleting its verifier.
  // B commits between that deletion and the separate pending-pointer delete.
  delMeta:key=>transaction(()=>{const result=f.metadata.delete(key);if(armed&&key==='v7-auth-flow:'+old.id)enqueueNewer();return result;}),
  // With atomic consumption, B's already prepared write is queued before the
  // comparison transaction starts; that transaction must observe B and refuse A.
  updateMeta:(key,change)=>{if(armed&&key==='v7-auth-pending')enqueueNewer();return transaction(()=>{const value=change(structuredClone(f.metadata.get(key)??null));assert.equal(typeof value?.then,'undefined','Atomic updater cannot yield');f.metadata.set(key,structuredClone(value));return structuredClone(value);});}
 };
 Object.assign(f.driver,store);
 const otherNative={ready:true,configured:true,userId:null,epoch:0,verified:false};
 const other=createFamilyAccess({...f.driver,snapshot:()=>({...otherNative}),
  auth:async path=>path.includes('grant_type=pkce')?{access_token:'fixture-new-access',refresh_token:'fixture-new-refresh',user:{id:USER},expires_in:3600}:{},
  installSession:async result=>{otherNative.userId=result.user.id;otherNative.epoch++;},
  rpc:async()=>({protocol:1,phase:'profile',userId:USER,profile:null})});
 const recovering=other.recover('camille@example.test',{redirectTo});await held;armed=true;releaseAuth();
 const result=await consuming;await recovering;assert.equal(injected,true,'B pending commit is ordered within the consumption window');
 assert.ok(result.error,'Superseded email flow A must be rejected');assert.match(result.error.message,/remplac|parcours|confirmation/i);assert.equal(f.native.userId,null,'A must not install a session after B supersedes it');
 if(kind==='callback')assert.equal(result.error.cleanURL,redirectTo,'Rejected callback supplies its sanitized return URL');
 const newer=await f.driver.meta('v7-auth-pending');assert.ok(newer?.id);assert.notEqual(newer.id,old.id);assert.ok(f.metadata.get('v7-auth-flow:'+newer.id)?.verifier);
 const confirmed=await other.confirmFromURL(redirectTo+'?code=fixture-new-code');assert.equal(confirmed.authenticated,true);assert.equal(confirmed.userId,USER);
});
