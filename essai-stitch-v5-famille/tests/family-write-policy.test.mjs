import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSharedWrite} from '../family-write-policy.mjs';
const state=(category,verified=true)=>({phase:'active',verified,householdId:'TEST-HOME',memberId:'TEST-MEMBER',profile:{memberCategory:category}});
test('child cannot mutate household snapshots, groceries, files or arbitrary RPCs',()=>{
 for(const query of ['dobby_v2_modules?module=eq.recipes','dobby_v2_grocery','rpc/dobby_missions_v2_write','rpc/dobby_v7_update_member','storage'])
  assert.throws(()=>assertSharedWrite({method:'POST',query,body:{},access:state('child')}),/lecture seule|serveur/);
});
test('child can read shared data and only change its own magic through existing RPC',()=>{
 assert.doesNotThrow(()=>assertSharedWrite({method:'GET',query:'dobby_v2_modules',access:state('child')}));
 assert.doesNotThrow(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_context',access:state('child')}));
 assert.doesNotThrow(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_update_magic',body:{p_member_id:'TEST-MEMBER'},access:state('child')}));
 assert.throws(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_update_magic',body:{p_member_id:'TEST-OTHER'},access:state('child')}),/lecture seule|serveur/);
});
test('parent existing writes remain available; stale child verification is not permission',()=>{
 assert.doesNotThrow(()=>assertSharedWrite({method:'PATCH',query:'dobby_v2_modules',access:state('parent')}));
 assert.throws(()=>assertSharedWrite({method:'PATCH',query:'dobby_v2_modules',access:state('child',false)}),/lecture seule|serveur/);
 assert.throws(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_update_magic',body:{p_member_id:'TEST-MEMBER'},access:state('child',false)}),/lecture seule|serveur/);
});
