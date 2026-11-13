import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {destination,invitationReference,childInvitationReference,canonicalAuthCallback} from '../access-flow.mjs';
import entry from '../access-entry.js';

test('an authenticated targeted child reaches acceptance without creating a pending profile',()=>{
 const state={phase:'profile',authenticated:true,userId:'TEST-child-auth'};
 assert.equal(destination(state,{invitationPending:true,invitationType:'child-account'}),'access-join');
 assert.equal(destination(state,{invitationPending:true,invitationType:'generic'}),'access-profile');
 assert.equal(destination({...state,authenticated:false},{invitationPending:true,invitationType:'child-account'}),'access-welcome');
 assert.equal(destination({...state,phase:'rejected'},{invitationPending:true,invitationType:'child-account'}),'access-unavailable');
});
test('the actual root relay, native entry and exact Auth callback preserve the typed child reference',()=>{
 const reference=childInvitationReference('TEST-existing-TEXT-child-token'),root='https://example.test/dobby/',html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 for(const suffix of ['?invite='+encodeURIComponent(reference),'#access?invite='+encodeURIComponent(reference)]){
  let forwarded;vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{URL,URLSearchParams,location:{href:root+suffix,replace:value=>forwarded=value}});
  const native=entry.capture(forwarded);assert.equal(native.invitation,reference);assert.doesNotMatch(native.cleanURL,/TEST-existing-TEXT-child-token/);
  const emailReturn=new URL(forwarded);emailReturn.searchParams.set('code','TEST');
  const callback=canonicalAuthCallback(emailReturn.href,forwarded);assert.equal(new URL(callback).searchParams.get('invite'),reference);assert.equal(new URL(callback).searchParams.get('code'),'TEST');
 }
});
test('typed child links remain distinct from adult links and their bearer leaves the URL immediately',()=>{
 const token='TEST-opaque-child-token',reference=childInvitationReference(token),url='https://example.test/dobby/?invite='+encodeURIComponent(reference);
 assert.deepEqual(invitationReference(url),{type:'child-account',token});
 assert.deepEqual(invitationReference(reference),{type:'child-account',token});
 assert.deepEqual(invitationReference(token),{type:'generic',token});
 const incoming=entry.capture(url);assert.equal(incoming.invitation,reference);assert.doesNotMatch(incoming.cleanURL,/TEST-opaque-child-token|child/);
});
