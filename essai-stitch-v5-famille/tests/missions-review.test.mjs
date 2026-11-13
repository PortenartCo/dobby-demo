import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../family-missions-core.mjs';
const row={id:'fm-review',title:'TEST — Mission',category:'Famille',status:'open',due:'',effort:'regular',rewardVersion:1};
test('M06 normalizes multiple assignment without cloning and excludes animal profiles',()=>{
 const mission=core.normalizeMission({...row,assigneeIds:['b','a','b'],allFamily:false,participantVersion:1,priority:'urgent'});
 assert.deepEqual(mission.assigneeIds,['a','b']);
 const people=[{id:'a',memberCategory:'child'},{id:'b',memberCategory:'parent'},{id:'pet',memberCategory:'pet'}];
 assert.deepEqual(core.assignmentIds({...mission,allFamily:true},people),['a','b']);
 assert.deepEqual(core.assignmentIds({...row,assigneeId:'b'},people),['b']);
 assert.throws(()=>core.normalizeMission({...row,assigneeIds:['']}),/Attribution/);
 assert.throws(()=>core.normalizeMission({...row,priority:'automatic'}),/Priorité/);
});
test('M05 overdue is a separate status and never changes urgency or removes a mission',()=>{
 const mission={...row,due:'2026-11-12',priority:'normal'};
 assert.equal(core.isOverdue(mission,'2026-11-13'),true);
 assert.equal(core.isOverdue({...mission,status:'done'},'2026-11-13'),false);
 assert.equal(core.isOverdue(row,'2026-11-13'),false);
 assert.equal(mission.priority,'normal');
});
test('M05 recurrence occurrence identity remains separate from optional deadline',()=>{
 const template={title:row.title,category:'Famille',effort:'regular',rewardVersion:1,participantVersion:1,assigneeIds:['a'],deadlineOffsetDays:null};
 const root=core.normalizeMission({...row,deadlineOffsetDays:null,recurrence:{version:1,seriesId:row.id,rules:[{from:'2026-11-12',start:'2026-11-12',frequency:'daily',weekdays:[4],monthDay:12,state:'active',shortMonth:'last-day',template}]}});
 const projected=core.projectRecurringMissions([root],'2026-11-13');
 assert.equal(projected.length,2);assert.equal(projected[1].id,'fm-review-r20261113');assert.equal(projected[1].due,'');
 assert.equal(projected[1].occurrenceDate,'2026-11-13');
 assert.deepEqual(core.projectRecurringMissions(projected,'2026-11-13'),projected);
 const dated=core.projectRecurringMissions([{...root,due:'2026-11-14',deadlineOffsetDays:2,recurrence:{...root.recurrence,rules:[{...root.recurrence.rules[0],template:{...template,deadlineOffsetDays:2}}]}}],'2026-11-13');
 assert.equal(dated[1].due,'2026-11-15');
});
