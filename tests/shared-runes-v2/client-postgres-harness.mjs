/* Real SQL transport for the native VM client. No remote DSN or service key. */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {repo,quote,sqlJSON,users,authSQL,rpcSQL,dockerArgs} from './pg-harness.mjs';

export {users};
export const database='dobby_runes_client_tests';
const container='dobby-runes-v2-test-20261111';
const admin='dobby_test_admin';
function guard(){
  const inspected=spawnSync('docker',[...dockerArgs,'inspect',container],{encoding:'utf8'});
  if(inspected.status!==0)throw Error('Task-local Docker PostgreSQL unavailable; real client PostgreSQL tests BLOCKED');
  const info=JSON.parse(inspected.stdout)[0];
  assert.equal(info.Name,'/'+container);assert.equal(info.Config.Labels?.['org.dobby.task'],'shared-runes-v2-20261111');
  assert.equal(info.Config.Image,'postgres@sha256:ff87138949ad9a46f32ff23bd6852b52ce024a13dffe9b4087be98292cdd3b4f');
  assert.equal(info.HostConfig.NetworkMode,'none');assert.equal(Object.keys(info.NetworkSettings.Ports||{}).filter(k=>info.NetworkSettings.Ports[k]).length,0);assert.equal(info.State.Running,true);
  return {container,dockerHost:dockerArgs[1],network:info.HostConfig.NetworkMode,imageId:info.Image,image:info.Config.Image,labels:info.Config.Labels};
}
function args({client=false,maintenance=false}={}){
  assert.equal(database,'dobby_runes_client_tests');
  return [...dockerArgs,'exec','-i',container,'psql','-X','-qAt','-U',client?'dobby_fixture_authenticator':admin,'-d',maintenance?'postgres':database,'-v','ON_ERROR_STOP=1','--pset','footer=off'];
}
const input=sql=>'\\set VERBOSITY verbose\n'+sql+'\n';
const outcome=(status,stdout,stderr)=>({status,stdout:stdout.trim(),stderr:stderr.trim()});
function failure(result){
  const match=result.stderr.match(/ERROR:\s+([0-9A-Z]{5}):\s*([^\n]+)/);
  // PostgREST maps transaction-rollback SQLSTATE 40* to HTTP 500, including
  // the protocol's CAS 40001. The SQLSTATE remains authoritative to the client.
  const error=Object.assign(Error(match?.[2]||result.stderr||'PostgreSQL transport failed'),{code:match?.[1],status:match?.[1]?.startsWith('40')?500:match?.[1]==='42501'?403:400,postgres:result});
  throw error;
}
export function execute(sql,options={}){
  const result=spawnSync('docker',args(options),{cwd:repo,input:input(sql),encoding:'utf8',maxBuffer:16*1024*1024});
  const resultOut=outcome(result.status,result.stdout||'',result.stderr||'');
  if(result.status!==0)failure(resultOut);
  return resultOut.stdout;
}
export async function query(sql,{user=users.a,client=true}={}){
  const child=spawn('docker',args({client}),{cwd:repo,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';
  child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
  const result=await new Promise((resolve,reject)=>{
    child.on('error',reject);child.on('close',status=>resolve(outcome(status,stdout,stderr)));
    child.stdin.end(input(client?authSQL(sql,{user,application:'dobby-client-pg-fixture'}):sql));
  });
  if(result.status!==0)failure(result);
  return result.stdout?JSON.parse(result.stdout.split('\n').at(-1)):null;
}
export function setup(){
  const environment=guard();
  // The only maintenance operation is creation of this exact local test DB.
  const exists=execute(`SELECT 1 FROM pg_database WHERE datname=${quote(database)};`,{maintenance:true});
  if(exists!=='1')execute('CREATE DATABASE dobby_runes_client_tests;',{maintenance:true});
  for(const file of ['tests/shared-runes-v2/bootstrap.sql','sql-proposals/dobby-v2-modules.sql','sql-proposals/dobby-shared-runes-v2.sql'])execute(readFileSync(resolve(repo,file),'utf8'));
  return {...environment,database,version:execute('SELECT version();'),authenticationBoundary:'Synthetic UUID claims and fixture roles; no Supabase JWT issuance or real accounts.'};
}
export async function freshHousehold(){
  const id=randomUUID();
  await query(`INSERT INTO public.dobby_v2_households(id) VALUES(${quote(id)}); INSERT INTO public.dobby_v2_memberships(household_id,user_id,active) VALUES(${quote(id)},${quote(users.a)},true),(${quote(id)},${quote(users.b)},true);`,{client:false});
  return id;
}
export async function snapshot(household){
  return query(`SELECT json_build_object('module',(SELECT row_to_json(t) FROM (SELECT module,payload,revision,updated_by FROM public.dobby_v2_modules WHERE household_id=${quote(household)}::uuid AND module='missions')t),'receipts',COALESCE((SELECT json_agg(to_jsonb(t) ORDER BY applied_revision) FROM dobby_runes_private.operations t WHERE household_id=${quote(household)}::uuid),'[]'::json));`,{client:false});
}
export function transport(household){
  const journal=[];
  let interceptor=null;
  async function run(user,method,path,body){
    const entry={user,method,path,...(body?.p_operation_id?{operation:body.p_operation_id,expectedRevision:body.p_expected_revision}:{})};journal.push(entry);
    const params=new URLSearchParams(path.split('?')[1]);
    let result;
    try{
      if(method==='GET'&&path.startsWith('rpc/dobby_missions_v2_capabilities?')){
        assert.equal(params.get('p_household_id'),household);
        result=await query(`SELECT public.dobby_missions_v2_capabilities(${quote(household)}::uuid)::text;`,{user});
      }else if(method==='POST'&&path==='rpc/dobby_missions_v2_write'){
        assert.equal(body.p_household_id,household);
        result=await query(rpcSQL(household,body.p_expected_revision,body.p_operation_id,body.p_payload),{user});
        entry.replayed=result.replayed;entry.revision=result.module?.revision;
      }else{
        assert.ok(path.startsWith('dobby_v2_modules?')||path==='dobby_v2_modules','Only native module REST paths accepted');
        const requested=(params.get('household_id')||'').replace(/^eq\./,'');
        if(method==='GET'){
          assert.equal(requested,household);
          const module=(params.get('module')||'').replace(/^eq\./,'');
          const where=`household_id=${quote(household)}::uuid`+(module?` AND module=${quote(module)}`:'');
          const fields=params.get('select')==='module'?'module':'module,payload,revision,updated_at';
          result=await query(`SELECT COALESCE(json_agg(row_to_json(t)),'[]'::json) FROM (SELECT ${fields} FROM public.dobby_v2_modules WHERE ${where} ORDER BY module)t;`,{user});
        }else if(method==='POST'){
          assert.equal(body.household_id,household);
          result=await query(`WITH changed AS (INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(household)}::uuid,${quote(body.module)},${sqlJSON(body.payload)}) RETURNING module,payload,revision,updated_at) SELECT COALESCE(json_agg(row_to_json(changed)),'[]'::json) FROM changed;`,{user});
        }else if(method==='PATCH'){
          assert.equal(requested,household);
          const module=(params.get('module')||'').replace(/^eq\./,''),revision=Number((params.get('revision')||'').replace(/^eq\./,''));
          assert.ok(Number.isSafeInteger(revision));
          result=await query(`WITH changed AS (UPDATE public.dobby_v2_modules SET payload=${sqlJSON(body.payload)} WHERE household_id=${quote(household)}::uuid AND module=${quote(module)} AND revision=${revision} RETURNING module,payload,revision,updated_at) SELECT COALESCE(json_agg(row_to_json(changed)),'[]'::json) FROM changed;`,{user});
        }else throw Error('Unsupported native transport method '+method);
      }
      entry.sqlCommitted=true;return result;
    }catch(error){entry.error={code:error.code,status:error.status,message:error.message};throw error;}
  }
  return {journal,setInterceptor(fn){interceptor=fn;},authorized:async(user,method,path,body)=>interceptor?interceptor({user,method,path,body,next:()=>run(user,method,path,body)}):run(user,method,path,body)};
}
