/* Only local labelled Docker PostgreSQL, never a Supabase DSN. */
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
export const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const container=process.env.DOBBY_RUNES_PG_CONTAINER||'dobby-runes-v2-test-20261111';
export const dockerSocket='unix:///var/run/docker.sock';
export const dockerArgs=['-H',dockerSocket];
export const db='dobby_runes_tests',adminUser='dobby_test_admin';
export const users=Object.freeze({a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',outsider:'33333333-3333-4333-8333-333333333333'});
export const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
export const sqlJSON=value=>quote(JSON.stringify(value))+'::jsonb';
export function guard(){
 assert.ok(!process.env.DOCKER_HOST||process.env.DOCKER_HOST===dockerSocket,'Remote DOCKER_HOST is forbidden');
 assert.match(container,/^dobby-runes-v2-test-[0-9]{8}$/,'Only task-local Docker names are permitted');
 const result=spawnSync('docker',[...dockerArgs,'inspect',container],{encoding:'utf8'});if(result.status!==0)throw Error('Local isolated PostgreSQL container unavailable; TESTS_POSTGRESQL_RÉELS=BLOCKED');
 const info=JSON.parse(result.stdout)[0];assert.equal(info.Config.Labels?.['org.dobby.task'],'shared-runes-v2-20261111');assert.equal(info.HostConfig.NetworkMode,'none');assert.equal(Object.keys(info.NetworkSettings.Ports||{}).filter(k=>info.NetworkSettings.Ports[k]).length,0);assert.equal(info.State.Running,true);
 return {container,dockerSocket,network:info.HostConfig.NetworkMode,imageId:info.Image,labels:info.Config.Labels};
}
const argsFor=({client=false,database=db}={})=>{assert.ok([db,'dobby_runes_restore_tests'].includes(database));return [...dockerArgs,'exec','-i',container,'psql','-X','-qAt','-U',client?'dobby_fixture_authenticator':adminUser,'-d',database,'-v','ON_ERROR_STOP=1','--pset','footer=off'];};
export function execute(sql,{allowFailure=false,client=false,database=db}={}){
 const result=spawnSync('docker',argsFor({client,database}),{cwd:repo,input:'\\set VERBOSITY verbose\n'+sql+'\n',encoding:'utf8',maxBuffer:16*1024*1024});
 const outcome={status:result.status,stdout:result.stdout.trim(),stderr:result.stderr.trim()};
 if(result.status!==0&&!allowFailure)throw Object.assign(Error(outcome.stderr||'PostgreSQL command failed'),outcome);
 return outcome;
}
export function value(sql){const out=execute(sql).stdout;return out?JSON.parse(out.split('\n').at(-1)):null;}
export function authSQL(sql,{user=users.a,role='authenticated',application='dobby-runes-fixture'}={}){
 assert.ok(['authenticated','anon'].includes(role));
 return `BEGIN; SET LOCAL application_name=${quote(application)}; SET LOCAL ROLE ${role}; DO $auth$ BEGIN PERFORM pg_catalog.set_config('request.jwt.claim.sub',${quote(user||'')},true); END $auth$; ${sql}\nCOMMIT;`;
}
export function asUser(sql,options={}){return execute(authSQL(sql,options),{...options,client:true});}
export function asValue(sql,options={}){const out=asUser(sql,options);return out.stdout?JSON.parse(out.stdout.split('\n').at(-1)):null;}
export function rpcSQL(household,revision,operation,payload){return `SELECT public.dobby_missions_v2_write(${quote(household)}::uuid,${Number(revision)}::bigint,${quote(operation)}::uuid,${sqlJSON(payload)})::text;`;}
export function rpc(household,revision,payload,options={}){const operation=options.operation||randomUUID();return asValue(rpcSQL(household,revision,operation,payload),options);}
export async function asyncExecute(sql,{client=true,database=db}={}){
 const child=spawn('docker',argsFor({client,database}),{cwd:repo,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);const promise=new Promise(resolve=>child.on('close',status=>resolve({status,stdout:stdout.trim(),stderr:stderr.trim()})));child.stdin.end('\\set VERBOSITY verbose\n'+sql+'\n');return{child,promise};
}
export function bootstrap(){guard();execute(readFileSync(resolve(repo,'tests/shared-runes-v2/bootstrap.sql'),'utf8'));execute(readFileSync(resolve(repo,'sql-proposals/dobby-v2-modules.sql'),'utf8'));}
export function migrate(){execute(readFileSync(resolve(repo,'sql-proposals/dobby-shared-runes-v2.sql'),'utf8'));}
export function freshHousehold(){const id=randomUUID();execute(`INSERT INTO public.dobby_v2_households(id) VALUES(${quote(id)}); INSERT INTO public.dobby_v2_memberships(household_id,user_id,active) VALUES(${quote(id)},${quote(users.a)},true),(${quote(id)},${quote(users.b)},true);`);return id;}
export function readModule(id){return asValue(`SELECT row_to_json(t) FROM (SELECT payload,revision,updated_by FROM public.dobby_v2_modules WHERE household_id=${quote(id)}::uuid AND module='missions')t;`);}
export function wholeState(id){return value(`SELECT json_build_object('modules',COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.module) FROM public.dobby_v2_modules t WHERE household_id=${quote(id)}::uuid),'[]'::json),'receipts',COALESCE((SELECT json_agg(to_jsonb(t) ORDER BY t.operation_id) FROM dobby_runes_private.operations t WHERE household_id=${quote(id)}::uuid),'[]'::json));`);}
export const waitUntil=async(test,{timeout=10000,interval=30}={})=>{const start=Date.now();for(;;){const result=await test();if(result)return result;if(Date.now()-start>timeout)throw Error('PostgreSQL synchronization barrier timed out');await new Promise(r=>setTimeout(r,interval));}};

export function interactive(sql,{client=false,database=db}={}){const child=spawn('docker',argsFor({client,database}),{cwd:repo,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const closed=new Promise(resolve=>child.on('close',status=>resolve({status,stdout,stderr})));child.stdin.write('\\set VERBOSITY verbose\n'+sql+'\n');return {child,closed,get stdout(){return stdout;},get stderr(){return stderr;}};}
