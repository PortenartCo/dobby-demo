import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend,makeClient} from './helpers/modules-harness.mjs';

const equipment=()=>({id:'boiler',name:'Chaudière',serialNumber:'SERIAL',manufacturerReference:'REF',future:{kept:true},maintenancePlans:[{id:'flue',title:'Ramonage',lastKnownDate:'2024-02-29',interval:{value:12,unit:'months',page:4},future:{kept:true}},{id:'service',title:'Révision',interval:{value:36,unit:'months'}}]});

test('Maison sync carries all program and serial metadata while native documents remain local',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,false,true,{state:{houseItems:[equipment()],houseLogs:[{id:'log',itemId:'boiler',planId:'flue',date:'2025-02-01',note:'Réalisé',future:9}]}}),b=makeClient('b',backend);
 await a.provider.start();await a.action('activate','house');const payload=backend.rows.get('house').payload;
 assert.equal(payload.houseVersion,1);assert.equal(payload.houseItems[0].serialNumber,'SERIAL');assert.equal(payload.houseItems[0].maintenancePlans[0].interval.page,4);assert.equal(payload.houseLogs[0].planId,'flue');assert.equal(payload.houseDocs,undefined);
 await b.provider.start();await b.action('activate','house');assert.equal(b.st.houseItems[0].maintenancePlans.length,2);assert.equal(b.st.houseItems[0].manufacturerReference,'REF');assert.equal(b.st.houseDocs[0].id,'pdf-1');
});

test('old Maison snapshots cannot drop programs, serial fields or classified log metadata',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,false,true,{state:{houseItems:[equipment()],houseLogs:[{id:'log',itemId:'boiler',planId:'flue',date:'2025-02-01',note:'Old',provider:'Artisan',future:9}]}});
 await a.provider.start();await a.action('activate','house');const previous=backend.rows.get('house');backend.rows.set('house',{...previous,revision:previous.revision+1,payload:{houseItems:[{id:'boiler',name:'Legacy edit',brand:'Brand'}],houseLogs:[{id:'log',itemId:'boiler',date:'2025-02-01',note:'Legacy edit'}]}});
 await a.provider.sync();assert.equal(a.st.houseItems[0].name,'Legacy edit');assert.equal(a.st.houseItems[0].serialNumber,'SERIAL');assert.equal(a.st.houseItems[0].maintenancePlans.length,2);assert.equal(a.st.houseItems[0].future.kept,true);assert.equal(a.st.houseLogs[0].planId,'flue');assert.equal(a.st.houseLogs[0].provider,'Artisan');
 await a.provider.sync();assert.equal(backend.rows.get('house').payload.houseItems[0].maintenancePlans[0].interval.page,4);
});

test('modern program deletion propagates while partial program edits retain nested unknown fields',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,false,true,{state:{houseItems:[equipment()]}}),b=makeClient('b',backend);
 await a.provider.start();await a.action('activate','house');await b.provider.start();await b.action('activate','house');
 a.st.houseItems[0].maintenancePlans=[{id:'flue',title:'Renommé',interval:{value:24,unit:'months'}}];await a.provider.sync();await b.provider.sync();
 assert.equal(b.st.houseItems[0].maintenancePlans.length,1);assert.equal(b.st.houseItems[0].maintenancePlans[0].interval.value,24);assert.equal(b.st.houseItems[0].maintenancePlans[0].interval.page,4);assert.equal(b.st.houseItems[0].maintenancePlans[0].future.kept,true);
});
