/* Local PostgreSQL proof: accept CRLF/LF only and the attested exact stamp body. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {repo,container,users,guard,execute,value,asUser,asValue,freshHousehold,quote,sqlJSON,rpc} from './pg-harness.mjs';

assert.equal(container,'dobby-runes-v2-test-20261111-auth-42501','Only the separate labelled auth-42501 fixture may be reset');
const baseCommit='0a8e1ed';
const patchPath='sql-proposals/dobby-shared-runes-v2-auth-42501.sql';
const checksPath='sql-proposals/dobby-shared-runes-v2-auth-42501-checks.sql';
const fixturePath=process.env.DOBBY_RUNES_REAL_STAMP_SQL||resolve(repo,'tests/shared-runes-v2/fixtures/dobby_v2_modules_stamp_prosrc_LF.txt');
const evidence=resolve(repo,'docs/dobby-v7/evidence/shared-runes-v2/auth-42501/eol');
const started=new Date().toISOString(),results=[],checkLogs=[];
const hash=text=>createHash('sha256').update(text,'utf8').digest('hex');
// Deliberately normalize only a CR followed by LF. Spaces and lone CR stay significant.
const lf=text=>text.replaceAll('\r\n','\n');
const crlf=text=>lf(text).replaceAll('\n','\r\n');
const realStampSHA='66ebec0137d31429243d4ae6bafa21788cef3c2315e18059acb5e1f44744c4d0';
const realStampCRLFSHA='5581985c573e42feb3b02ede1a9eaec47e766529e97d0e3522883b33e30721af';
const helperSHA='f78ddf35693e99f233fcd4edc4e60c2b6a4b586fc7ce2c6c4c81d85eec236321';
const functions=[
 {signature:'public.dobby_missions_v2_capabilities(uuid)',original:'84a1f4924bf0babe881ba85a6afb6e0937e0f0d8b1cf1da33b3c2a40905c0b04',fixed:'be80e28dc03e10ab05615c1fe757c94e606f3128bcc7c14fb1154eeec1d8a02d',from:"'protocol',2",to:"'protocol',3"},
 {signature:'public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)',original:'729e7c32d25513c16ce45153b5c5182d8cf5a9be926ed94e3ae90b8cbd751506',fixed:'9ab7c1c9bf752900c9433bf6759b57e296139e8b33508309bfec166d99802f45',from:'next_revision:=p_expected_revision+1;',to:'next_revision:=p_expected_revision+2;'},
 {signature:'dobby_runes_private.lock_active_membership(uuid)',original:'24ab842834f5eef542060483dcda4bcf832658680bfbb9035e3b56dbd38f617a',fixed:'7f66b4569a016e65db7c504b3441ebd2f7af1219d3ff3a7f003776e4b623a1ff',from:'RETURN FOUND;',to:'RETURN true;'},
 {signature:'public.dobby_v2_modules_stamp()',original:'95c9c80b4b8a1e85d5c13286b841b2a03143ada42c290a6e67ac3b936b7bac6c',fixed:'fd9faf1d37bf06f04cacae23a20a6010be9ed9fa1806abca3f4e2d84c8e5a312',from:'NEW.revision := OLD.revision + 1;',to:'NEW.revision := OLD.revision + 2;'}
];
const helper='dobby_runes_private.request_user_id()';
const stamp=functions.at(-1).signature;
const otherModules=['menus','recipes','house','family','contracts'];
const emptyPayload={autoTasks:[],manualMissions:[],runeCredits:[],runeRequests:[],runeLedgerVersion:2};
function immutableSQL(path){const out=spawnSync('git',['show',`${baseCommit}:${path}`],{cwd:repo,encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(out.status,0,out.stderr);return out.stdout;}
const baselineModules=immutableSQL('sql-proposals/dobby-v2-modules.sql');
const baselineRunes=immutableSQL('sql-proposals/dobby-shared-runes-v2.sql');
let environment,patch,checks,realStamp,helperDefinition,functionCheck,household;

function getFunction(signature){return value(`SELECT json_build_object('signature',${quote(signature)},'body',p.prosrc,'definition',pg_get_functiondef(p.oid)) FROM pg_proc p WHERE p.oid=to_regprocedure(${quote(signature)});`);}
function setBody(signature,body){const old=getFunction(signature);assert.ok(old,signature);assert.ok(old.definition.includes(old.body),'Catalog definition must contain the exact stored body');execute(old.definition.replace(old.body,body));assert.equal(getFunction(signature).body,body,'The fixture must retain the requested exact EOL bytes');}
function data(){return value(`SELECT json_build_object(
 'users',(SELECT json_agg(to_jsonb(t) ORDER BY id) FROM auth.users t),
 'households',(SELECT json_agg(to_jsonb(t) ORDER BY id) FROM public.dobby_v2_households t),
 'memberships',(SELECT json_agg(to_jsonb(t) ORDER BY household_id,user_id) FROM public.dobby_v2_memberships t),
 'modules',(SELECT json_agg(to_jsonb(t) ORDER BY household_id,module) FROM public.dobby_v2_modules t),
 'receipts',(SELECT json_agg(to_jsonb(t) ORDER BY household_id,operation_id) FROM dobby_runes_private.operations t));`);}
function metadata({includeHelper=false}={}){return value(`SELECT json_build_object(
 'roles',(SELECT json_agg(to_jsonb(t) ORDER BY rolname) FROM (SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolvaliduntil,rolconfig FROM pg_roles WHERE rolname NOT LIKE 'pg_%') t),
 'role_memberships',(SELECT json_agg(to_jsonb(t) ORDER BY roleid,member,grantor) FROM pg_auth_members t),
 'schemas',(SELECT json_agg(to_jsonb(t) ORDER BY name) FROM (SELECT nspname AS name,pg_get_userbyid(nspowner) AS owner,nspacl::text AS acl FROM pg_namespace WHERE nspname IN ('public','auth','dobby_runes_private')) t),
 'relations',(SELECT json_agg(to_jsonb(t) ORDER BY schema,name) FROM (SELECT n.nspname AS schema,c.relname AS name,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text AS acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','dobby_runes_private') AND c.relkind='r') t),
 'functions',(SELECT json_agg(to_jsonb(t) ORDER BY schema,name,args) FROM (SELECT n.nspname AS schema,p.proname AS name,pg_get_function_identity_arguments(p.oid) AS args,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.provolatile,p.proconfig,p.proacl::text AS acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth','dobby_runes_private') ${includeHelper?'':"AND NOT(n.nspname='dobby_runes_private' AND p.proname='request_user_id' AND p.pronargs=0)"}) t),
 'policy_attributes',(SELECT json_agg(to_jsonb(t) ORDER BY relation,name) FROM (SELECT polrelid::regclass::text AS relation,polname AS name,polcmd,polpermissive,polroles FROM pg_policy WHERE polrelid IN ('public.dobby_v2_modules'::regclass,'public.dobby_v2_memberships'::regclass,'dobby_runes_private.operations'::regclass)) t),
 'triggers',(SELECT json_agg(to_jsonb(t) ORDER BY name) FROM (SELECT tgname AS name,tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE NOT tgisinternal) t));`);}
function definitions(){return value(`SELECT json_build_object(
 'functions',(SELECT json_agg(to_jsonb(t) ORDER BY schema,name,args) FROM (SELECT n.nspname AS schema,p.proname AS name,pg_get_function_identity_arguments(p.oid) AS args,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth','dobby_runes_private')) t),
 'policies',(SELECT json_agg(to_jsonb(t) ORDER BY schemaname,tablename,policyname) FROM pg_policies t WHERE schemaname IN ('public','dobby_runes_private')));`);}
function snapshot(){return {data:data(),metadata:metadata({includeHelper:true}),definitions:definitions()};}
function normalizeJSON(value){return JSON.parse(lf(JSON.stringify(value)).replaceAll('\\r\\n','\\n'));}
function assertPreserved(before){assert.deepEqual(data(),before.data,'Patch must preserve every row and prior receipt');assert.deepEqual(metadata(),before.metadata,'Owners, flags, role memberships, RLS attributes, triggers and existing ACLs must stay identical');}
function fixedBodies(encoding){
 const hashes={};
 for(const fn of [...functions,{signature:helper,fixed:helperSHA}]){
  const body=getFunction(fn.signature).body;assert.equal(hash(lf(body)),fn.fixed,fn.signature+' must be exactly the reviewed fixed body after CRLF normalization');
  assert.equal(body,encoding==='CRLF'?crlf(body):lf(body),fn.signature+' EOL shape');
  if(encoding==='CRLF')assert.ok(body.includes('\r\n'),fn.signature+' must really retain CRLF in prosrc');
  hashes[fn.signature]={raw:hash(body),normalized:hash(lf(body))};
 }
 return hashes;
}
function checkFlags(expected){
 const before=snapshot();
 const flags=value(`BEGIN READ ONLY; SELECT json_agg(row_to_json(t) ORDER BY signature) FROM (${functionCheck}) t; COMMIT;`);
 assert.equal(flags.length,4);
 for(const flag of flags)assert.equal(flag.matches_reviewed_fix,expected,flag.signature+' postcheck must recognize only the fixed normalized body');
 assert.deepEqual(snapshot(),before,'Read-only hash checks must preserve all state');
 return flags.map(({signature,matches_reviewed_fix})=>({signature,matches_reviewed_fix}));
}
function completeChecks(label){
 const before=snapshot(),out=execute('SET default_transaction_read_only=on;\n'+checks);
 assert.deepEqual(snapshot(),before,'The complete operator checks must execute read only');
 checkLogs.push(`--- ${label} ---\n${out.stdout}\n`);
 return {readOnly:true,allFourFlags:checkFlags(true)};
}
function refuse(sql,message=/Installed function differs from the reviewed original\/fix/){
 const before=snapshot(),out=execute(sql,{allowFailure:true});
 assert.notEqual(out.status,0,'Unreviewed source must be refused');assert.match(out.stderr,message);
 assert.deepEqual(snapshot(),before,'Refusal must roll back definitions, owners, ACLs, RLS and all data');
 return out.stderr.split('\n')[0];
}
function installHelper(body){execute(helperDefinition.replace(/AS \$\$[\s\S]*?\$\$;/,`AS $eol_helper$${body}$eol_helper$;`));execute('REVOKE ALL ON FUNCTION dobby_runes_private.request_user_id() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION dobby_runes_private.request_user_id() TO dobby_missions_v2_writer;');assert.equal(getFunction(helper).body,body);}
function setup({encoding='LF',actualStamp=false,preexistingHelper=false}={}){
 execute(readFileSync(resolve(repo,'tests/shared-runes-v2/bootstrap.sql'),'utf8'));
 execute(baselineModules);household=freshHousehold();
 asUser(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(household)},'missions',${sqlJSON(emptyPayload)});`);
 for(const module of otherModules)asUser(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(household)},${quote(module)},${sqlJSON({fixture:module,stage:'before-patch'})});`);
 execute(baselineRunes);
 // Fixture-only grants permit one real original RPC receipt, then recreate 42501.
 execute('GRANT USAGE ON SCHEMA auth TO dobby_missions_v2_writer; GRANT EXECUTE ON FUNCTION auth.uid() TO dobby_missions_v2_writer;');
 const prior=rpc(household,1,emptyPayload);assert.equal(prior.module.revision,2);
 execute('REVOKE USAGE ON SCHEMA auth FROM dobby_missions_v2_writer; REVOKE EXECUTE ON FUNCTION auth.uid() FROM PUBLIC,dobby_missions_v2_writer;');
 for(const fn of functions){let body=getFunction(fn.signature).body;assert.equal(hash(body),fn.original,'Immutable LF fixture: '+fn.signature);if(fn.signature===stamp&&actualStamp)body=realStamp;if(encoding==='CRLF')body=crlf(body);setBody(fn.signature,body);assert.equal(hash(lf(getFunction(fn.signature).body)),fn.signature===stamp&&actualStamp?realStampSHA:fn.original);}
 if(preexistingHelper){const body=helperDefinition.match(/AS \$\$([\s\S]*?)\$\$;/)[1];installHelper(crlf(body));}
 const denied=asUser(`SELECT public.dobby_missions_v2_capabilities(${quote(household)}::uuid);`,{allowFailure:true});
 assert.notEqual(denied.status,0);assert.match(denied.stderr,/42501/);assert.match(denied.stderr,/permission denied for schema auth/);
 return {data:data(),metadata:metadata(),originals:checkFlags(false),priorReceipts:1};
}
function reapply(sql,encoding){const before=snapshot();execute(sql);assert.deepEqual(snapshot(),before,'Reapplying the identical EOL artifact must be fully idempotent');return fixedBodies(encoding);}
function changeEOL(sql,encoding){const before=snapshot();execute(sql);const after=snapshot();assert.deepEqual(after.data,before.data);assert.deepEqual(after.metadata,before.metadata);assert.deepEqual(normalizeJSON(after.definitions),normalizeJSON(before.definitions),'Changing patch EOL must change only CRLF/LF representation');return fixedBodies(encoding);}
function runtime(){
 const options={claims:JSON.stringify({sub:users.b,role:'authenticated'}),legacyUser:users.a};
 assert.equal(asValue(`SELECT public.dobby_missions_v2_capabilities(${quote(household)}::uuid);`,options).protocol,2);
 const operation=randomUUID(),response=rpc(household,2,emptyPayload,{...options,operation});assert.equal(response.module.revision,3);
 const actor=value(`SELECT json_build_object('stamp',(SELECT updated_by FROM public.dobby_v2_modules WHERE household_id=${quote(household)} AND module='missions'),'receipt',(SELECT actor_id FROM dobby_runes_private.operations WHERE operation_id=${quote(operation)}));`);assert.deepEqual(actor,{stamp:users.b,receipt:users.b});
 const newHouse=freshHousehold();
 for(const module of otherModules){
  const insert=asValue(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(newHouse)},${quote(module)},${sqlJSON({fixture:module,stage:'insert'})}) RETURNING row_to_json(dobby_v2_modules);`,options);assert.equal(insert.revision,1);assert.equal(insert.updated_by,users.a,'Other module must retain legacy auth.uid stamp');
  const update=asValue(`UPDATE public.dobby_v2_modules SET payload=${sqlJSON({fixture:module,stage:'update'})} WHERE household_id=${quote(newHouse)} AND module=${quote(module)} RETURNING row_to_json(dobby_v2_modules);`,options);assert.equal(update.revision,2);assert.equal(update.created_at,insert.created_at);assert.equal(update.updated_by,users.a);
 }
 const before=data(),direct=asUser(`UPDATE public.dobby_v2_modules SET payload='{}' WHERE household_id=${quote(household)} AND module='missions';`,{allowFailure:true});assert.notEqual(direct.status,0);assert.match(direct.stderr,/42501/);assert.deepEqual(data(),before);
 const identity=asUser(`UPDATE public.dobby_v2_modules SET module='fixture_reassigned' WHERE household_id=${quote(newHouse)} AND module='menus';`,{allowFailure:true});assert.notEqual(identity.status,0);assert.match(identity.stderr,/Household and module identity cannot be reassigned/);assert.deepEqual(data(),before);
 return {capabilityProtocol:2,writeRevision:3,modernActorAndStamp:users.b,otherModules,otherModulesInsertRevision:1,otherModulesUpdateRevision:2,otherModulesLegacyStamp:users.a,directMissionsWriteRefused:true,moduleIdentityGuardPreserved:true};
}
async function scenario(name,fn){const now=Date.now();try{const detail=await fn();results.push({name,status:'PASS',milliseconds:Date.now()-now,detail});console.log('PASS '+name);}catch(error){results.push({name,status:'FAIL',milliseconds:Date.now()-now,error:error.stack});console.error('FAIL '+name+'\n'+error.stack);throw error;}}

try{
 // Validate the supplied source before guard() or any database operation.
 realStamp=lf(readFileSync(fixturePath,'utf8'));assert.equal(hash(realStamp),realStampSHA,'Real stamp body must match the exact user-attested normalized SHA-256');assert.equal(hash(crlf(realStamp)),realStampCRLFSHA,'The supplied real stamp must reproduce the reported CRLF fingerprint');
 patch=readFileSync(resolve(repo,patchPath),'utf8');checks=readFileSync(resolve(repo,checksPath),'utf8');
 helperDefinition=patch.match(/CREATE OR REPLACE FUNCTION dobby_runes_private\.request_user_id\(\)[\s\S]*?\$\$;/)?.[0];assert.ok(helperDefinition);
 functionCheck=checks.match(/WITH expected\(signature,fixed_body_sha256\)[\s\S]*?;/)?.[0].replace(/;$/,'');assert.ok(functionCheck);
 environment=guard();
 await scenario('canonical LF originals: LF patch, idempotent LF/CRLF reapplication and fixed-only read-only flags',()=>{
  const before=setup();execute(patch);assertPreserved(before);const bodies=fixedBodies('LF'),operatorChecks=completeChecks('canonical LF / LF patch');
  reapply(patch,'LF');changeEOL(crlf(patch),'CRLF');reapply(crlf(patch),'CRLF');changeEOL(patch,'LF');
  return {originalFlags:before.originals,bodies,operatorChecks,identicalArtifactIdempotent:true,LFAndCRLFReapplied:true,rowsReceiptsOwnersRLSACLsPreserved:true};
 });
 await scenario('canonical CRLF originals: complete CRLF patch retains CRLF and all four read-only flags are true',()=>{
  const before=setup({encoding:'CRLF'});execute(crlf(patch));assertPreserved(before);const bodies=fixedBodies('CRLF'),operatorChecks=completeChecks('canonical CRLF / complete CRLF patch');
  reapply(crlf(patch),'CRLF');changeEOL(patch,'LF');reapply(patch,'LF');
  return {originalFlags:before.originals,bodies,operatorChecks,completePatchConvertedToCRLF:true,preexistingCRLFHelperAcceptedOnReapply:true};
 });
 for(const encoding of ['LF','CRLF'])await scenario(`exact supplied real stamp ${encoding}: accepted without broadening whitespace or changing native runtime`,()=>{
  const before=setup({encoding,actualStamp:true}),source=getFunction(stamp).body;assert.equal(hash(lf(source)),realStampSHA);assert.equal(hash(source),encoding==='CRLF'?realStampCRLFSHA:realStampSHA);
  execute(encoding==='CRLF'?crlf(patch):patch);assertPreserved(before);const bodies=fixedBodies(encoding),operatorChecks=completeChecks(`exact real stamp ${encoding}`),behavior=runtime();
  reapply(encoding==='CRLF'?crlf(patch):patch,encoding);
  return {realSourceSHA256:hash(source),realSourceNormalizedSHA256:hash(lf(source)),originalFlags:before.originals,bodies,operatorChecks,behavior,rowsReceiptsOwnersRLSACLsPreserved:true};
 });
 await scenario('pre-existing canonical CRLF helper and original CRLF functions accept the LF patch',()=>{
  const before=setup({encoding:'CRLF',preexistingHelper:true});assert.equal(hash(lf(getFunction(helper).body)),helperSHA);const fullMetadata=metadata({includeHelper:true});
  execute(patch);assertPreserved(before);assert.deepEqual(metadata({includeHelper:true}),fullMetadata);return {bodies:fixedBodies('LF'),operatorChecks:completeChecks('pre-existing CRLF helper'),preexistingHelperACLAndOwnerPreserved:true};
 });
 await scenario('functional edits, arbitrary extra whitespace and lone CR remain refused for each canonical and real body',()=>{
  setup();const rejected=[];
  for(const fn of functions){const original=getFunction(fn.signature).body;assert.ok(original.includes(fn.from));
   const variants=[['functional change in CRLF',crlf(original.replace(fn.from,fn.to))],['unlisted extra space in CRLF',crlf(original.replace('BEGIN','BEGIN '))],['lone CR',original.replace('\n','\r')]];
   for(const [kind,body] of variants){setBody(fn.signature,body);try{rejected.push({signature:fn.signature,kind,normalizedSHA256:hash(lf(body)),refusal:refuse(crlf(patch))});}finally{setBody(fn.signature,original);}}
  }
  const original=getFunction(stamp).body;
  for(const [kind,body] of [['real stamp functional change in CRLF',crlf(realStamp.replace('NEW.revision := OLD.revision + 1;','NEW.revision := OLD.revision + 2;'))],['real stamp unlisted extra space in CRLF',crlf(realStamp.replace('BEGIN','BEGIN '))],['real stamp lone CR',realStamp.replace('\n','\r')]]){
   setBody(stamp,body);try{rejected.push({signature:stamp,kind,normalizedSHA256:hash(lf(body)),refusal:refuse(patch)});}finally{setBody(stamp,original);}
  }
  assert.equal(rejected.length,15);return {rejected,fullAtomicStatePreserved:true,noWhitespaceStripping:true,loneCRNeverNormalized:true};
 });
 await scenario('a pre-existing helper with CRLF functional/whitespace drift or lone CR is refused unchanged',()=>{
  setup();const body=helperDefinition.match(/AS \$\$([\s\S]*?)\$\$;/)[1],rejected=[];
  const functional=body.replace("RETURN NULLIF(claims->>'sub','')::uuid;",'RETURN NULL;');assert.notEqual(functional,body);
  for(const [kind,changed] of [['functional change in CRLF',crlf(functional)],['unlisted extra space in CRLF',crlf(body.replace('BEGIN','BEGIN '))],['lone CR',body.replace('\n','\r')]]){
   installHelper(changed);try{rejected.push({kind,refusal:refuse(crlf(patch),/Existing private claims helper differs/)});}finally{execute('DROP FUNCTION dobby_runes_private.request_user_id();');}
  }
  return {rejected,helperDefinitionOwnerAndACLUnchangedOnRefusal:true};
 });
 await scenario('LF and whole-file CRLF patch failures roll back all DDL, policies, ACLs and rows atomically',()=>{
  setup({encoding:'CRLF',actualStamp:true});const failures=[];
  assert.equal((patch.match(/\bCOMMIT\s*;/gi)||[]).length,1);
  for(const encoding of ['LF','CRLF']){
   const failed=patch.replace(/\bCOMMIT\s*;/i,"DO $eol_abort$ BEGIN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='EOL fixture injected atomic rollback'; END $eol_abort$;\nCOMMIT;");
   const before=snapshot(),out=execute(encoding==='CRLF'?crlf(failed):failed,{allowFailure:true});assert.notEqual(out.status,0);assert.match(out.stderr,/P0001/);assert.match(out.stderr,/EOL fixture injected atomic rollback/);assert.deepEqual(snapshot(),before);assert.equal(getFunction(helper),null);failures.push({encoding,sqlstate:'P0001',helperAbsent:true,fullAtomicStatePreserved:true});
  }
  return {failures};
 });
 assert.equal(hash(readFileSync(resolve(repo,patchPath),'utf8')),hash(patch),'Patch changed during proof: rerun the exact final artifact');
 assert.equal(hash(readFileSync(resolve(repo,checksPath),'utf8')),hash(checks),'Checks changed during proof: rerun the exact final artifact');
 assert.equal(hash(lf(readFileSync(fixturePath,'utf8'))),realStampSHA,'Real fixture changed during proof');
}catch(error){process.exitCode=1;if(!results.some(r=>r.status==='FAIL')){results.push({name:'fixture and artifact setup',status:'FAIL',error:error.stack});console.error(error.stack);}}
finally{
 mkdirSync(evidence,{recursive:true});
 const report={started,finished:new Date().toISOString(),environment,baselineCommit:baseCommit,patch:patchPath,patchSHA256:patch?hash(patch):null,checks:checksPath,checksSHA256:checks?hash(checks):null,realStampFixture:process.env.DOBBY_RUNES_REAL_STAMP_SQL?'DOBBY_RUNES_REAL_STAMP_SQL override':'tests/shared-runes-v2/fixtures/dobby_v2_modules_stamp_prosrc_LF.txt',realStampFixtureNormalizedSHA256:realStamp?hash(realStamp):null,realStampFixtureCRLFSHA256:realStamp?hash(crlf(realStamp)):null,realStampSourceStatus:realStamp&&hash(realStamp)===realStampSHA?'EXACT_SOURCE_VERIFIED':'UNVERIFIED',fixtureOnly:true,realSupabaseTouched:false,originalContainerTouched:false,summary:{pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,total:results.length},results};
 writeFileSync(resolve(evidence,'results.json'),JSON.stringify(report,null,2)+'\n');writeFileSync(resolve(evidence,'checks.log'),checkLogs.join('\n'));console.log(JSON.stringify(report.summary));
}
