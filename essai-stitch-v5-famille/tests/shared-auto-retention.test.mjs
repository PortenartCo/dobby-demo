import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const native=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const projection=native.slice(native.indexOf('const getState=()=>st;'),native.indexOf('const existingSave=save;'));

for(const [label,shared,available,expected] of [
 ['shared offline',true,false,'open'],
 ['verified V2',false,true,'open'],
 ['local only',false,false,'obsolete']
])test('native automatic task projection preserves '+label+' semantics',()=>{
 const st={autoTasks:[{key:'equipment:other-device:2026-11-12',state:'open'}],houseItems:[],familyDocs:[],runeSyncRequired:shared};
 vm.runInNewContext(projection+'reconcile();',{st,window:{DobbySharedRunesV2:{available:()=>available}}});
 assert.equal(st.autoTasks[0].state,expected);
});
