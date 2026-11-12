const test=require('node:test'),assert=require('node:assert/strict');
const clone=value=>JSON.parse(JSON.stringify(value));
const item=(label='Gourde')=>({id:'item-1',label,qty:1,unit:'pièce',done:false});
const template=(name='Sortie')=>({id:'template-1',name,version:1,items:[item()]});
const preparation=(label='Gourde')=>({id:'event-1',eventId:'event-1',version:1,templateId:'template-1',items:[item(label)]});
async function client(uid,backend,options={}){const {makeClient}=await import('./helpers/modules-harness.mjs');const value=makeClient(uid,backend,false,true,options);await value.provider.start();return value;}
async function pair(){const {makeBackend}=await import('./helpers/modules-harness.mjs');const backend=makeBackend(),a=await client('a',backend),b=await client('b',backend);await a.action('activate','family');await b.action('activate','family');return{backend,a,b};}

test('preparation templates and event snapshots propagate with existing family fields and unknown metadata intact',async()=>{
 const {backend,a,b}=await pair();a.st.familyNotes=[{id:'local-private',body:'NEVER_SHARE_PREP'}];a.st.familyEvents=[{id:'event-1',title:'Sortie',date:'2026-11-12',future:{retained:true}}];
 a.st.familyPreparationTemplates=[template()];a.st.familyEventPreparations=[{...preparation(),future:{receipt:'kept'}}];await a.provider.sync();await b.provider.sync();
 assert.equal(backend.rows.get('family').payload.familyPreparationsVersion,1);assert.equal(b.st.familyPreparationTemplates[0].name,'Sortie');assert.equal(b.st.familyEventPreparations[0].items[0].done,false);assert.deepEqual(clone(b.st.familyEventPreparations[0].future),{receipt:'kept'});assert.deepEqual(clone(b.st.familyEvents[0].future),{retained:true});
 a.st.familyEventPreparations[0].items[0].done=true;a.st.familyPreparationTemplates[0].items[0].label='Nouvelle gourde';await a.provider.sync();await b.provider.sync();assert.equal(b.st.familyEventPreparations[0].items[0].done,true);assert.equal(b.st.familyEventPreparations[0].items[0].label,'Gourde');assert.equal(b.st.familyPreparationTemplates[0].items[0].label,'Nouvelle gourde');
 a.st.familyPreparationTemplates=[];a.st.familyEventPreparations=[];await a.provider.sync();await b.provider.sync();assert.deepEqual(clone(b.st.familyPreparationTemplates),[]);assert.deepEqual(clone(b.st.familyEventPreparations),[]);assert.ok(!JSON.stringify(backend.rows.get('family').payload).includes('NEVER_SHARE_PREP'));
});

test('offline preparation changes survive reload and reconnect through the native module metadata',async()=>{
 const {backend,a}=await pair(),authorized=backend.authorized;backend.authorized=async()=>{throw Error('offline');};a.st.familyPreparationTemplates=[template()];a.st.familyEventPreparations=[preparation()];await a.provider.sync();assert.match(a.provider.statusFor('family'),/locales/);
 backend.authorized=authorized;const reloaded=await client('a',backend,{state:clone(a.st),metadata:a.metadata});await reloaded.provider.sync();assert.equal(backend.rows.get('family').payload.familyPreparationTemplates?.[0]?.name,'Sortie');assert.equal(backend.rows.get('family').payload.familyEventPreparations?.[0]?.eventId,'event-1');
});

test('a newly initialized client restores preparation arrays omitted by an older fixture from its acknowledged native metadata',async()=>{
 const {backend,a}=await pair();a.st.familyPreparationTemplates=[template('Already shared')];a.st.familyEventPreparations=[preparation('Already shared')];await a.provider.sync();const remembered=clone(a.metadata.get('v2-module-state:a|00000000-0000-4000-8000-000000000010'));delete remembered.family.preparationsProtocol;
 const c=await client('c',backend,{metadata:new Map([['v2-module-state:c|00000000-0000-4000-8000-000000000010',remembered]])});assert.equal(c.st.familyPreparationTemplates?.[0]?.name,'Already shared');assert.equal(c.st.familyEventPreparations?.[0]?.items[0].label,'Already shared');const revision=backend.rows.get('family').revision;await c.provider.sync();assert.equal(backend.rows.get('family').revision,revision);assert.equal(backend.rows.get('family').payload.familyPreparationTemplates[0].name,'Already shared');
});

test('native metadata hydration preserves an explicit local preparation deletion',async()=>{
 const {backend,a}=await pair();a.st.familyPreparationTemplates=[template()];await a.provider.sync();const remembered=clone(a.metadata.get('v2-module-state:a|00000000-0000-4000-8000-000000000010'));
 const c=await client('c',backend,{state:{familyPreparationTemplates:[]},metadata:new Map([['v2-module-state:c|00000000-0000-4000-8000-000000000010',remembered]])});await c.provider.sync();assert.deepEqual(backend.rows.get('family').payload.familyPreparationTemplates,[]);
});

test('activate, join and activate-all retain distinct offline preparations alongside the remote registry',async()=>{
 for(const action of ['activate','join-family','activate-all']){
  const {backend,a}=await pair();a.st.familyPreparationTemplates=[template('Foyer')];a.st.familyEventPreparations=[preparation('Foyer')];await a.provider.sync();
  const c=await client('c',backend,{state:{familyPreparationTemplates:[{...template('Local'),id:'template-local'}],familyEventPreparations:[{...preparation('Local'),id:'event-local',eventId:'event-local',templateId:'template-local'}]}});await c.action(action,'family');await c.provider.sync();
  assert.deepEqual(new Set(backend.rows.get('family').payload.familyPreparationTemplates?.map(row=>row.id)),new Set(['template-1','template-local']),action);assert.deepEqual(new Set(backend.rows.get('family').payload.familyEventPreparations?.map(row=>row.id)),new Set(['event-1','event-local']),action);
 }
});

test('reactivation merges unchanged remote preparations and local additions by stable ID',async()=>{
 const {backend,a,b}=await pair();a.st.familyPreparationTemplates=[template()];a.st.familyEventPreparations=[preparation()];await a.provider.sync();await b.provider.sync();await b.action('disable','family');
 a.st.familyPreparationTemplates[0].name='Remote edit';a.st.familyEventPreparations[0].items[0].done=true;await a.provider.sync();b.st.familyPreparationTemplates.push({...template('Local addition'),id:'template-local'});await b.action('activate','family');await b.provider.sync();
 assert.equal(b.st.familyPreparationTemplates[0].name,'Remote edit');assert.equal(b.st.familyEventPreparations[0].items[0].done,true);assert.equal(backend.rows.get('family').payload.familyPreparationTemplates.length,2);
});

test('divergent preparation reactivation retains local data behind the explicit native conflict chooser',async()=>{
 const {backend,a,b}=await pair();a.st.familyPreparationTemplates=[template()];a.st.familyEventPreparations=[preparation()];await a.provider.sync();await b.provider.sync();await b.action('disable','family');
 a.st.familyEventPreparations[0].items[0].label='Remote edit';await a.provider.sync();b.st.familyEventPreparations[0].items[0].label='Local edit';await b.action('activate','family');assert.match(b.provider.statusFor('family'),/Conflit/);assert.equal(b.st.familyEventPreparations[0].items[0].label,'Local edit');await b.action('server','family');assert.equal(b.st.familyEventPreparations[0].items[0].label,'Remote edit');assert.ok(b.localBackups>0);
});

test('reactivating a locally created event and preparation retains their association behind explicit conflict',async()=>{
 const {backend,b}=await pair();await b.action('disable','family');b.st.familyEvents=[{id:'event-local',title:'Sortie hors ligne',date:'2026-12-12'}];b.st.familyEventPreparations=[{...preparation('Affaires locales'),id:'event-local',eventId:'event-local'}];const events=clone(b.st.familyEvents),preparations=clone(b.st.familyEventPreparations),remote=clone(backend.rows.get('family'));
 await b.action('activate','family');assert.match(b.provider.statusFor('family'),/Conflit/);assert.deepEqual(clone(b.st.familyEvents),events);assert.deepEqual(clone(b.st.familyEventPreparations),preparations);await b.provider.sync();assert.deepEqual(backend.rows.get('family'),remote);await b.action('local','family');assert.deepEqual(backend.rows.get('family').payload.familyEvents,events);assert.deepEqual(backend.rows.get('family').payload.familyEventPreparations,preparations);
});

test('remote event deletion cannot detach an offline preparation edit during reactivation',async()=>{
 const {backend,a,b}=await pair();a.st.familyEvents=[{id:'event-1',title:'Sortie',date:'2026-12-12'}];a.st.familyEventPreparations=[preparation()];await a.provider.sync();await b.provider.sync();await b.action('disable','family');a.st.familyEvents=[];a.st.familyEventPreparations=[];await a.provider.sync();b.st.familyEventPreparations[0].items[0].label='Affaires hors ligne';const events=clone(b.st.familyEvents),preparations=clone(b.st.familyEventPreparations),revision=backend.rows.get('family').revision;
 await b.action('activate','family');assert.match(b.provider.statusFor('family'),/Conflit/);assert.deepEqual(clone(b.st.familyEvents),events);assert.deepEqual(clone(b.st.familyEventPreparations),preparations);await b.provider.sync();assert.equal(backend.rows.get('family').revision,revision);await b.action('server','family');assert.deepEqual(clone(b.st.familyEvents),[]);assert.deepEqual(clone(b.st.familyEventPreparations),[]);
});

test('a locally changed associated event is retained when remote metadata diverges during reactivation',async()=>{
 const {backend,a,b}=await pair();a.st.familyEvents=[{id:'event-1',title:'Sortie',date:'2026-12-12'}];a.st.familyEventPreparations=[preparation()];await a.provider.sync();await b.provider.sync();await b.action('disable','family');b.st.familyEvents[0].date='2026-12-13';b.st.familyEventPreparations[0].items[0].label='Affaires du 13';a.st.familyEvents[0].title='Autre version du foyer';await a.provider.sync();const events=clone(b.st.familyEvents),preparations=clone(b.st.familyEventPreparations),remote=clone(backend.rows.get('family'));
 await b.action('activate','family');assert.match(b.provider.statusFor('family'),/Conflit/);assert.deepEqual(clone(b.st.familyEvents),events);assert.deepEqual(clone(b.st.familyEventPreparations),preparations);await b.provider.sync();assert.deepEqual(backend.rows.get('family'),remote);
});

test('fresh remote metadata for the same unchanged local event remains compatible with an offline preparation edit',async()=>{
 const {backend,a,b}=await pair();a.st.familyEvents=[{id:'event-1',title:'Sortie',date:'2026-12-12'}];a.st.familyEventPreparations=[preparation()];await a.provider.sync();await b.provider.sync();await b.action('disable','family');b.st.familyEventPreparations[0].items[0].label='Affaires hors ligne';a.st.familyEvents[0].title='Titre actualisé';await a.provider.sync();await b.action('activate','family');assert.doesNotMatch(b.provider.statusFor('family'),/Conflit/);await b.provider.sync();assert.equal(backend.rows.get('family').payload.familyEvents[0].title,'Titre actualisé');assert.equal(backend.rows.get('family').payload.familyEventPreparations[0].items[0].label,'Affaires hors ligne');
});

test('preparation writes preserve unknown family extensions and tolerate an initially unversioned older payload',async()=>{
 const {backend}=await pair(),row=backend.rows.get('family');delete row.payload.familyPreparationsVersion;delete row.payload.familyPreparationTemplates;delete row.payload.familyEventPreparations;row.payload.futureFamily={untouched:['yes']};row.revision++;
 const c=await client('c',backend,{state:{familyPreparationTemplates:[template()],familyEventPreparations:[preparation()]}});await c.action('activate','family');await c.provider.sync();assert.equal(backend.rows.get('family').payload.familyPreparationsVersion,1);assert.equal(c.st.familyPreparationTemplates[0].name,'Sortie');assert.deepEqual(backend.rows.get('family').payload.futureFamily,{untouched:['yes']});
});

test('choosing an older family copy does not falsely acknowledge a preparation protocol absent on the server',async()=>{
 const {backend}=await pair(),row=backend.rows.get('family');delete row.payload.familyPreparationsVersion;delete row.payload.familyPreparationTemplates;delete row.payload.familyEventPreparations;row.revision++;
 const c=await client('c',backend);await c.action('activate','family');c.st.familyPreparationTemplates=[template('Local draft')];row.payload.familyMembers=[{id:'remote-member'}];row.revision++;await c.provider.sync();assert.match(c.provider.statusFor('family'),/Conflit/);await c.action('server','family');c.st.familyPreparationTemplates=[template('After choice')];await c.provider.sync();assert.equal(backend.rows.get('family').payload.familyPreparationTemplates?.[0]?.name,'After choice');
});

test('invalid local preparation data cannot be published by initial module activation',async()=>{
 const {makeBackend}=await import('./helpers/modules-harness.mjs'),backend=makeBackend(),a=await client('a',backend,{state:{familyPreparationTemplates:[{...template(),items:[{...item(),qty:1.001}]}]}});await a.action('activate','family');assert.equal(backend.rows.has('family'),false);assert.equal(a.st.familyPreparationTemplates[0].items[0].qty,1.001);
});

test('unsupported local preparation protocol cannot be downgraded and published during activation',async()=>{
 const {makeBackend}=await import('./helpers/modules-harness.mjs'),backend=makeBackend(),a=await client('a',backend,{state:{familyPreparationsVersion:2,familyPreparationTemplates:[{...template(),futureRules:{keep:['future-v2-rule']}}],familyEventPreparations:[preparation()]}}),before=clone(a.st);await a.action('activate','family');assert.equal(backend.rows.has('family'),false);assert.deepEqual(clone(a.st),before);assert.equal(backend.journal.filter(row=>row.method!=='GET').length,0);
});

test('unsupported local preparation protocol retains both copies without writes or an automatic-save exception',async()=>{
 const {backend,a}=await pair();a.st.familyPreparationsVersion=2;a.st.familyPreparationTemplates=[{...template('Future local'),futureRules:{keep:['future-v2-rule']}}];a.st.familyEventPreparations=[preparation('Future local')];const local=clone(a.st),remote=clone(backend.rows.get('family')),start=backend.journal.length;await a.provider.sync();assert.deepEqual(clone(a.st),local);assert.deepEqual(backend.rows.get('family'),remote);assert.equal(backend.journal.slice(start).filter(row=>row.method!=='GET').length,0);assert.doesNotThrow(()=>a.provider.onSave());assert.match(a.provider.statusFor('family'),/incompatible/i);
});

test('unknown preparation protocol blocks the complete family update without altering local records',async()=>{
 const {backend,a}=await pair(),row=backend.rows.get('family');row.payload.familyPreparationsVersion=2;row.payload.familyPreparationTemplates=[template('Unknown')];row.payload.familyEvents=[{id:'do-not-apply'}];row.revision++;await a.provider.sync();assert.deepEqual(clone(a.st.familyEvents),[]);assert.notEqual(a.provider.statusFor('family'),'Partagé · à jour');assert.equal(backend.rows.get('family').revision,row.revision);
});

test('malformed preparation registries are rejected before any family data is replaced',async()=>{
 const invalid=[
  {familyPreparationTemplates:'broken'},
  {familyEventPreparations:undefined},
  {familyPreparationTemplates:[template(),template()]},
  {familyPreparationTemplates:[{...template(),version:2}]},
  {familyPreparationTemplates:[{...template(),items:[item(),item()]}]},
  {familyPreparationTemplates:[{...template(),items:[{...item(),qty:-1}]}]},
  {familyPreparationTemplates:[{...template(),items:[{...item(),qty:0.000000001}]}]},
  {familyPreparationTemplates:[{...template(),items:[{...item(),qty:1000000}]}]},
  {familyPreparationTemplates:[{...template(),items:[{...item(),done:'yes'}]}]},
  {familyPreparationTemplates:[{...template(),items:[{...item(),done:true}]}]},
  {familyEventPreparations:[{...preparation(),eventId:'different-event'}]},
  {familyEventPreparations:[{...preparation(),items:[{...item(),label:' '}]}]}
 ];
 for(const changes of invalid){const {backend,a}=await pair(),row=backend.rows.get('family');row.payload={...row.payload,familyPreparationsVersion:1,familyPreparationTemplates:[],familyEventPreparations:[],...changes,familyEvents:[{id:'do-not-apply'}]};row.revision++;await a.provider.sync();assert.deepEqual(clone(a.st.familyEvents),[],JSON.stringify(changes));assert.notEqual(a.provider.statusFor('family'),'Partagé · à jour');}
});

test('acknowledged preparations removed by an older peer remain local until explicit recovery',async()=>{
 const {backend,a,b}=await pair();a.st.familyPreparationTemplates=[template()];a.st.familyEventPreparations=[preparation()];await a.provider.sync();await b.provider.sync();const row=backend.rows.get('family');delete row.payload.familyPreparationsVersion;delete row.payload.familyPreparationTemplates;delete row.payload.familyEventPreparations;row.payload.familyMembers=[{id:'remote-member'}];row.revision++;
 await a.provider.sync();await b.provider.sync();assert.match(a.provider.statusFor('family'),/Conflit/);assert.equal(a.st.familyEventPreparations[0].eventId,'event-1');const revision=row.revision;await a.action('server','family');assert.equal(backend.rows.get('family').revision,revision);assert.equal(a.st.familyEventPreparations[0].eventId,'event-1');
 await a.action('family-recover','family');assert.equal(backend.rows.get('family').payload.familyPreparationsVersion,1);assert.equal(backend.rows.get('family').payload.familyEventPreparations[0].eventId,'event-1');assert.equal(backend.rows.get('family').payload.familyMembers[0].id,'remote-member');await b.action('refresh','family');await b.action('server','family');assert.doesNotMatch(b.provider.statusFor('family'),/Conflit/);assert.equal(b.st.familyPreparationTemplates[0].name,'Sortie');
});

test('an edit while preparation PATCH is in flight stays local and pending',async()=>{
 const {backend,a}=await pair();assert.equal(backend.rows.get('family').payload.familyPreparationsVersion,1);a.st.familyPreparationTemplates=[template()];a.st.familyEventPreparations=[preparation()];const authorized=backend.authorized;let entered,release;const started=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);backend.authorized=async(...args)=>{if(args[1]==='PATCH'){entered();await gate;}return authorized(...args);};
 const syncing=a.provider.sync();await started;a.st.familyEventPreparations[0].items[0].done=true;release();await syncing;assert.equal(a.st.familyEventPreparations[0].items[0].done,true);assert.match(a.provider.statusFor('family'),/locales/);backend.authorized=authorized;await a.provider.sync();assert.equal(backend.rows.get('family').payload.familyEventPreparations[0].items[0].done,true);
});

test('a concurrent rival preparation update loses CAS without acknowledging or overwriting local changes',async()=>{
 const {backend,a}=await pair();a.st.familyPreparationTemplates=[template('Local')];const authorized=backend.authorized;let raced=false;backend.authorized=async(...args)=>{if(args[1]==='PATCH'&&!raced){raced=true;const row=backend.rows.get('family');row.revision++;row.payload.familyPreparationTemplates=[template('Rival')];}return authorized(...args);};await a.provider.sync();assert.equal(backend.rows.get('family').payload.familyPreparationTemplates[0].name,'Rival');assert.equal(a.st.familyPreparationTemplates[0].name,'Local');assert.match(a.provider.statusFor('family'),/Conflit/);
});
