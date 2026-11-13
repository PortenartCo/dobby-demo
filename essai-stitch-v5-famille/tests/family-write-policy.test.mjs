import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSharedWrite} from '../family-write-policy.mjs';
const state=(category,verified=true)=>({phase:'active',authenticated:true,userId:'TEST-U',verified,householdId:'TEST-HOME',memberId:'TEST-MEMBER',profile:{id:'TEST-MEMBER',memberCategory:category}});
test('child cannot mutate household snapshots, groceries, files or arbitrary RPCs',()=>{
 for(const query of ['dobby_v2_modules?module=eq.recipes','dobby_v2_grocery','rpc/dobby_missions_v2_write','rpc/dobby_v7_update_member','storage'])
  assert.throws(()=>assertSharedWrite({method:'POST',query,body:{},access:state('child')}),/lecture seule|serveur/);
});
test('child can read shared data and only change its own magic through existing RPC',()=>{
 assert.doesNotThrow(()=>assertSharedWrite({method:'GET',query:'dobby_v2_modules',access:state('child')}));
 assert.doesNotThrow(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_context',access:state('child')}));
 assert.doesNotThrow(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_update_magic',body:{p_member_id:'TEST-MEMBER',p_values:{magicHouseId:'ravenclaw'}},access:state('child')}));
 assert.throws(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_update_magic',body:{p_member_id:'TEST-OTHER'},access:state('child')}),/lecture seule|serveur/);
});
test('parent existing writes remain available; stale child verification is not permission',()=>{
 assert.doesNotThrow(()=>assertSharedWrite({method:'PATCH',query:'dobby_v2_modules',access:state('parent')}));
 assert.throws(()=>assertSharedWrite({method:'PATCH',query:'dobby_v2_modules',access:state('child',false)}),/lecture seule|serveur/);
 assert.throws(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_update_magic',body:{p_member_id:'TEST-MEMBER',p_values:{magicHouseId:'ravenclaw'}},access:state('child',false)}),/lecture seule|serveur/);
});

test('reserves: authenticated incomplete or stale identity never falls back to parent shared writes',()=>{
 for(const access of [
  {phase:'active',verified:true,profile:{}},
  {phase:'active',verified:true,userId:'TEST-U',householdId:'TEST-H',memberId:'TEST-M',profile:{}},
  {phase:'unavailable',verified:false,userId:'TEST-U',profile:null},
  {...state('parent',false),userId:'TEST-U'},
  {...state('unknown'),userId:'TEST-U'}
 ])assert.throws(()=>assertSharedWrite({method:'PATCH',query:'dobby_v2_modules',access}),/lecture seule|vérifi|catégorie/);
});
test('reserves: child own-magic exception rejects mixed identity values before transport',()=>{
 const access={...state('child'),userId:'TEST-U'},base={p_member_id:'TEST-MEMBER',p_values:{magicHouseId:'ravenclaw'}};
 assert.doesNotThrow(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_update_magic',body:base,access}));
 for(const p_values of [{magicHouseId:'ravenclaw',memberCategory:'parent'},{magicHouseId:'ravenclaw',notes:'TEST changed'},{magicHouseId:{unexpected:true}},{},null])
  assert.throws(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_update_magic',body:{...base,p_values},access}),/lecture seule|valeurs|magique/);
});
test('reserves: existing pre-household setup RPCs remain available without granting general writes',()=>{
 for(const [phase,query] of [['profile','dobby_v7_update_profile'],['household','dobby_v7_update_profile'],['household','dobby_v7_create_household'],['household','dobby_v7_accept_invitation']])
  assert.doesNotThrow(()=>assertSharedWrite({method:'POST',query:'rpc/'+query,access:{phase,authenticated:true,userId:'TEST-U',verified:false,profile:null}}));
 assert.throws(()=>assertSharedWrite({method:'PATCH',query:'dobby_v2_grocery',access:{phase:'household',userId:'TEST-U',verified:false}}),/lecture seule|vérifi|catégorie/);
 assert.doesNotThrow(()=>assertSharedWrite({method:'PATCH',query:'dobby_v2_modules',access:null}),'Unauthenticated local clients retain their existing local scope');
});

test('reserves: own-magic and parent writes require complete matching canonical identity',()=>{
 const complete={...state('child'),authenticated:true,userId:'TEST-U',profile:{id:'TEST-MEMBER',memberCategory:'child'}},body={p_member_id:'TEST-MEMBER',p_values:{magicHouseId:'ravenclaw'}};
 for(const patch of [{householdId:null},{householdId:''},{userId:null},{memberId:null},{authenticated:false},{profile:{id:'OTHER',memberCategory:'child'}},{profile:{memberCategory:'child'}}]){
  const access={...complete,...patch};assert.throws(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_update_magic',body:{...body,p_member_id:access.memberId},access}),/lecture seule|vérifi|catégorie/);
 }
 for(const patch of [{householdId:null},{userId:null},{memberId:''},{authenticated:false},{profile:{id:'OTHER',memberCategory:'parent'}},{profile:{memberCategory:'parent'}}])
  assert.throws(()=>assertSharedWrite({method:'PATCH',query:'dobby_v2_modules',access:{...complete,profile:{id:'TEST-MEMBER',memberCategory:'parent'},...patch}}),/lecture seule|vérifi|catégorie/);
});
test('reserves: setup exception cannot be borrowed by a linked or incoherent child context',()=>{
 const pending={phase:'household',authenticated:true,verified:false,userId:'TEST-U',profile:{firstName:'TEST Draft'}};
 assert.doesNotThrow(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_accept_invitation',access:pending}));
 for(const patch of [{authenticated:false},{verified:true},{profile:{memberCategory:'child'}},{profile:{id:'TEST-MEMBER'}},{householdId:'TEST-HOME'},{memberId:'TEST-MEMBER'}])
  assert.throws(()=>assertSharedWrite({method:'POST',query:'rpc/dobby_v7_accept_invitation',access:{...pending,...patch}}),/lecture seule|vérifi|catégorie/);
});
