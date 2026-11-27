'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { existsSync } = require('node:fs');
const test = require('node:test');

const source = path.resolve(__dirname, '../../scripts/review/global-roles.js');
const nativeRoot = pathToFileURL(path.resolve(__dirname, '../../essai-stitch-v5-famille') + '/');
const household = '00000000-0000-4000-8000-000000000010';
const c = 'review-enfant-c';
const d = 'review-enfant-d';
const a = 'review-person';
const operation = '00000000-0000-4000-8000-000000000090';

function setup() {
  assert.ok(existsSync(source), 'le transport de démonstration V7 doit fournir la projection canonique');
  const roles = require(source)(nativeRoot);
  const profiles = [
    {id:a,memberCategory:'parent',name:'A',lastName:'Ancienne note confidentielle',notes:'Confidentiel'},
    {id:c,memberCategory:'child',name:'C',magicProfile:{version:1,houseId:'slytherin',patronusId:'cat'}},
    {id:d,memberCategory:'child',name:'D',birthdate:'2015-12-01'}
  ];
  const row = (module,payload) => ({module, revision:1, household_id:household, payload});
  const state = {suspended:{},modules:{
    family:row('family',{familyMembers:profiles,familyEvents:[
      {id:'public',title:'Sortie',notes:'Détail privé',category:'Famille'},
      {id:'private',title:'Absent',private:true},
      {id:'only-d',title:'Pour D',visibility:'restricted',visibleToMemberIds:[d]}
    ],famHealth:[{title:'Santé confidentielle'}]}),
    missions:row('missions',{manualMissions:[
      {id:'task-c',title:'Mission C',assigneeId:c,effort:'regular',rewardVersion:1,status:'open',note:'Détail mission privé'},
      {id:'task-d',title:'Mission D',assigneeId:d,effort:'regular',rewardVersion:1,status:'open'}
    ],autoTasks:[],runeCredits:[],runeRequests:[],runeLedgerVersion:3,missionParticipation:[],runeRewards:[],runeGoals:{}})
  }};
  const call = (name,{client='C',method='POST',query='',body={}}={}) => roles.handle({client,method,
    url:new URL(`https://dobby-global-demo.invalid/rest/v1/rpc/${name}${query}`),body,state,household,
    user:`fictional-${client}`,respond:(value,status=200)=>({value,status}),denied:()=>({status:403})});
  return {call,state};
}

test('l’enfant authentifié reçoit une projection des membres et des événements permise par #51', async () => {
  const {call} = setup();
  const context = await call('dobby_v7_context');
  assert.equal(context.value.memberId,c);
  assert.equal(context.value.profile.memberCategory,'child');
  assert.equal(context.value.permissions.canEdit,false);
  assert.equal(context.value.permissions.canMagic,true);
  const module = await call('dobby_v7_child_module',{method:'GET',query:`?p_household_id=${household}&p_module=family`});
  assert.deepEqual(module.value.payload.familyEvents,[{id:'public',title:'Sortie',category:'Famille'}]);
  assert.equal(module.value.payload.familyMembers[0].notes,undefined);
  assert.equal(module.value.payload.familyMembers[2].birthdate,undefined);
  assert.equal(module.value.payload.famHealth,undefined);
  assert.equal((await call('dobby_v7_child_module',{method:'GET',query:`?p_household_id=${household}&p_module=contracts`})).status,403);
});

test('la suspension est réservée aux parents, conserve la fiche et ferme RPC/mutations enfant', async () => {
  const {call,state} = setup();
  const body = {p_member_id:c};
  assert.equal((await call('dobby_v7_suspend_child_access',{client:'D',body})).status,403);
  assert.deepEqual((await call('dobby_v7_suspend_child_access',{client:'A',body})).value,{linked:true,active:false});
  assert.equal(state.modules.family.payload.familyMembers[1].id,c);
  const context = (await call('dobby_v7_context')).value;
  assert.equal(context.phase,'rejected');
  assert.equal(context.reason,'child_access_suspended');
  assert.equal(context.profile,undefined);
  assert.equal((await call('dobby_v7_child_module',{method:'GET',query:`?p_household_id=${household}&p_module=family`})).status,403);
});

test('le profil magique enfant est modifiable uniquement pour soi, par révision et sans réutiliser un autre reçu', async () => {
  const {call,state} = setup();
  const body = {p_member_id:c,p_expected_revision:1,p_operation_id:operation,p_values:{magicHouseId:'hufflepuff'}};
  assert.equal((await call('dobby_v7_update_magic',{body:{...body,p_member_id:d}})).status,403);
  assert.equal((await call('dobby_v7_update_magic',{body:{...body,p_values:{magicCeremony:'complete'}}})).status,403);
  assert.equal((await call('dobby_v7_update_magic',{body})).status,200);
  assert.equal((await call('dobby_v7_update_magic',{body})).value.replayed,true);
  assert.equal((await call('dobby_v7_context')).value.profile.magicProfile.houseId,'hufflepuff');
  assert.equal(state.modules.family.revision,2);
});

test('la réalisation enfant respecte l’attribution et le reçu du transport Missions V3 natif', async () => {
  const {call,state} = setup();
  const body = {p_household_id:household,p_expected_revision:1,p_operation_id:operation,
    p_intent:{kind:'complete',missionId:'task-c',participantIds:[c]}};
  assert.equal((await call('dobby_missions_v3_write',{body:{...body,p_intent:{...body.p_intent,missionId:'task-d'}}})).status,403);
  const receipt = await call('dobby_missions_v3_write',{body});
  assert.equal(receipt.status,200);
  assert.equal(receipt.value.protocol,3);
  assert.equal(receipt.value.operation.revision,2);
  assert.equal(receipt.value.operation.changed,true);
  assert.equal(receipt.value.module.payload.manualMissions[0].status,'done');
  assert.equal(receipt.value.module.payload.manualMissions[0].note,undefined);
  assert.equal(receipt.value.module.payload.manualMissions.length,1);
  assert.deepEqual(receipt.value.module.payload.runeCredits[0].allocations,[{memberId:c,amount:25}]);
  assert.equal(state.modules.missions.payload.manualMissions[1].status,'open');
  assert.equal((await call('dobby_missions_v3_write',{body})).value.replayed,true);
});

test('le solde natif débloque un palier puis seul un parent confirme la récompense', async () => {
  const {call,state} = setup();
  const parentConfirmed = '00000000-0000-4000-8000-000000000091';
  const newGoal = '00000000-0000-4000-8000-000000000092';
  const run = (p_intent,p_expected_revision,p_operation_id,client) => call('dobby_missions_v3_write',{
    client,body:{p_intent,p_expected_revision,p_operation_id,p_household_id:household}
  });
  const set = {kind:'reward-set',memberId:c,threshold:25,mode:'announced',title:'Jeu du soir'};
  assert.equal((await run(set,1,newGoal,'C')).status,403);
  assert.equal((await run(set,1,newGoal,'A')).value.module.payload.runeGoals[c].unlocked,false);
  const done = await run({kind:'complete',missionId:'task-c',participantIds:[c]},2,operation,'C');
  assert.equal(done.value.module.payload.runeGoals[c].unlocked,true);
  const confirm = {kind:'reward-confirm',memberId:c,goalId:newGoal};
  assert.equal((await run(confirm,3,parentConfirmed,'C')).status,403);
  assert.equal((await run(confirm,3,parentConfirmed,'B')).value.module.payload.runeGoals[c],undefined);
  assert.deepEqual(state.modules.missions.payload.runeRewards.map(row=>[row.memberId,row.title,row.confirmationId]),[
    [c,'Jeu du soir',parentConfirmed]
  ]);
  const other = await call('dobby_v7_child_module',{client:'D',method:'GET',query:`?p_household_id=${household}&p_module=missions`});
  assert.deepEqual(other.value.payload.runeRewards,[]);
});

test('une récompense surprise préparée reste privée et un parent peut la confirmer sans ressaisie', async () => {
  const {call} = setup();
  const goal = '00000000-0000-4000-8000-000000000093';
  const confirm = '00000000-0000-4000-8000-000000000094';
  const run = (p_intent,p_expected_revision,p_operation_id,client) => call('dobby_missions_v3_write',{
    client,body:{p_intent,p_expected_revision,p_operation_id,p_household_id:household}
  });
  const set = await run({kind:'reward-set',memberId:c,threshold:25,mode:'surprise',title:'Détail à garder secret'},1,goal,'A');
  assert.equal(set.value.module.payload.runeGoals[c].title,undefined);
  const done = await run({kind:'complete',missionId:'task-c',participantIds:[c]},2,operation,'C');
  assert.equal(done.value.module.payload.runeGoals[c].title,undefined);
  const confirmed = await run({kind:'reward-confirm',memberId:c,goalId:goal},3,confirm,'B');
  assert.equal(confirmed.status,200);
  assert.equal(confirmed.value.module.payload.runeRewards[0].title,'Détail à garder secret');
  const view = await call('dobby_v7_child_module',{method:'GET',query:`?p_household_id=${household}&p_module=missions`});
  assert.equal(view.value.payload.runeRewards[0].title,'Récompense mystère');
});
