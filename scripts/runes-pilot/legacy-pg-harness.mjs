/* Local PostgreSQL only. Transport translation is the sole mocked boundary. */
import assert from 'node:assert/strict';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

export const repo=resolve(import.meta.dirname,'../..');
export const container='dobby-runes-v2-legacy-test-20261112';
export const database='dobby_runes_legacy_tests';
export const sqlReference='04c58d9ebaf84374820a5e6a727c45dfa4ee3527';
const label='shared-runes-v2-legacy-20261112';
const image='postgres@sha256:ff87138949ad9a46f32ff23bd6852b52ce024a13dffe9b4087be98292cdd3b4f';
const admin='dobby_legacy_test_admin',dockerArgs=['--host','unix:///var/run/docker.sock'];
export const users=Object.freeze({a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',outsider:'33333333-3333-4333-8333-333333333333'});
export const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
export const sqlJSON=value=>quote(JSON.stringify(value))+'::jsonb';
const sha=value=>createHash('sha256').update(value).digest('hex');
export function guard(){
  assert.ok(!process.env.DOCKER_HOST||process.env.DOCKER_HOST===dockerArgs[1],'Remote Docker endpoints are forbidden');
  for(const key of ['DATABASE_URL','SUPABASE_DB_URL','PGHOST','PGPORT','PGDATABASE','PGSERVICE','PGSERVICEFILE','DOBBY_RUNES_PG_CONTAINER'])assert.ok(!process.env[key],'Connection override forbidden: '+key);
  const result=spawnSync('docker',[...dockerArgs,'inspect',container],{encoding:'utf8'});
  if(result.status!==0)throw Error('Exact isolated legacy PostgreSQL fixture unavailable; tests BLOCKED');
  const info=JSON.parse(result.stdout)[0];
  assert.equal(info.Name,'/'+container);assert.equal(info.Config.Labels?.['org.dobby.task'],label);
  assert.equal(info.Config.Image,image);assert.equal(info.HostConfig.NetworkMode,'none');assert.equal(info.State.Running,true);
  assert.equal(Object.keys(info.HostConfig.PortBindings||{}).length,0);
  assert.equal(Object.values(info.NetworkSettings.Ports||{}).some(Boolean),false);
  assert.ok(info.HostConfig.Tmpfs?.['/var/lib/postgresql/data']);
  return {container,database,dockerHost:dockerArgs[1],image,imageId:info.Image,network:'none',label};
}
const args=({client=false}={})=>[...dockerArgs,'exec','-i',container,'psql','-X','-qAt','-U',client?'dobby_fixture_authenticator':admin,'-d',database,'-v','ON_ERROR_STOP=1','--pset','footer=off'];
const input=sql=>'\\set VERBOSITY verbose\n'+sql+'\n';
function failed(result){
  const match=result.stderr.match(/ERROR:\s+([0-9A-Z]{5}):\s*([^\n]+)/);
  throw Object.assign(Error(match?.[2]||result.stderr||'PostgreSQL fixture command failed'),{code:match?.[1],status:match?.[1]?.startsWith('40')?500:match?.[1]==='42501'?403:400,postgres:result});
}
export function execute(sql,{client=false}={}){
  const result=spawnSync('docker',args({client}),{cwd:repo,input:input(sql),encoding:'utf8',maxBuffer:16*1024*1024});
  if(result.status!==0)failed(result);
  return result.stdout.trim();
}
export function authSQL(sql,{user=users.a,role='authenticated'}={}){
  assert.ok(['authenticated','anon'].includes(role));
  const claims=JSON.stringify({sub:user||'',role});
  return `BEGIN; SET LOCAL ROLE ${role}; SELECT pg_catalog.set_config('request.jwt.claim.sub',${quote(user||'')},true),pg_catalog.set_config('request.jwt.claims',${quote(claims)},true); ${sql}\nCOMMIT;`;
}
export async function query(sql,{user=users.a,client=true,role='authenticated'}={}){
  const child=spawn('docker',args({client}),{cwd:repo,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
  const result=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',status=>resolve({status,stdout,stderr}));child.stdin.end(input(client?authSQL(sql,{user,role}):sql));});
  if(result.status!==0)failed(result);
  const last=result.stdout.trim().split('\n').at(-1);return last?JSON.parse(last):null;
}
export const rpcSQL=(household,revision,operation,payload)=>`SELECT public.dobby_missions_v2_write(${quote(household)}::uuid,${Number(revision)}::bigint,${quote(operation)}::uuid,${sqlJSON(payload)})::text;`;
export async function snapshot(household){
  return query(`SELECT json_build_object('module',(SELECT row_to_json(t) FROM (SELECT module,payload,revision,updated_by FROM public.dobby_v2_modules WHERE household_id=${quote(household)}::uuid AND module='missions')t),'receipts',COALESCE((SELECT json_agg(to_jsonb(t) ORDER BY applied_revision) FROM dobby_runes_private.operations t WHERE household_id=${quote(household)}::uuid),'[]'::json));`,{client:false});
}
const fixtures=new Map();
export function fixture(name){assert.ok(fixtures.has(name),'Unknown pre-migration legacy fixture '+name);return fixtures.get(name);}
export function setup(names){
  const environment=guard();
  execute(readFileSync(resolve(repo,'tests/shared-runes-v2/bootstrap.sql'),'utf8'));
  const files=['sql-proposals/dobby-v2-modules.sql','sql-proposals/dobby-shared-runes-v2.sql','sql-proposals/dobby-shared-runes-v2-auth-42501.sql'];
  const source=Object.fromEntries(files.map(file=>[file,execFileSync('git',['show',sqlReference+':'+file],{cwd:repo,encoding:'utf8'})]));
  execute(source[files[0]]);
  for(const name of names){
    const id=randomUUID(),auto={key:'auto-remote',title:'Remote automatic task',done:false,opaque:{native:['keep',name]}};
    const payload={autoTasks:[auto],manualMissions:[],runeCredits:[]};
    execute(`INSERT INTO public.dobby_v2_households(id) VALUES(${quote(id)}); INSERT INTO public.dobby_v2_memberships(household_id,user_id,active) VALUES(${quote(id)},${quote(users.a)},true),(${quote(id)},${quote(users.b)},true);`);
    execute(authSQL(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(id)},'missions',${sqlJSON(payload)}); UPDATE public.dobby_v2_modules SET payload=${sqlJSON(payload)} WHERE household_id=${quote(id)} AND module='missions';`),{client:true});
    fixtures.set(name,{id,payload,auto});
  }
  execute(source[files[1]]);execute(source[files[2]]);
  const version=execute('SELECT version();');assert.match(version,/PostgreSQL 17\./);
  return {...environment,version,sqlReference,sqlSha256:Object.fromEntries(files.map(file=>[file,sha(source[file])])),authenticationBoundary:'Invented UUID claims and local fixture roles; real SQL/RLS/transactions, no Supabase JWT or PostgREST service.'};
}
export function transport(household){
  const journal=[];let interceptor=null;
  async function run(user,method,path,body){
    const entry={user,method,path,...(body?{body:structuredClone(body)}:{}),...(body?.p_operation_id?{operation:body.p_operation_id,expectedRevision:body.p_expected_revision}:{})};journal.push(entry);
    try{
      const params=new URLSearchParams(path.split('?')[1]);let result;
      if(method==='GET'&&path.startsWith('rpc/dobby_missions_v2_capabilities?')){
        assert.equal(params.get('p_household_id'),household);result=await query(`SELECT public.dobby_missions_v2_capabilities(${quote(household)}::uuid)::text;`,{user});
      }else if(method==='POST'&&path==='rpc/dobby_missions_v2_write'){
        assert.equal(body.p_household_id,household);result=await query(rpcSQL(household,body.p_expected_revision,body.p_operation_id,body.p_payload),{user});entry.receipt=structuredClone(result.operation);entry.replayed=result.replayed;entry.revision=result.module?.revision;
      }else{
        assert.ok(path==='dobby_v2_modules'||path.startsWith('dobby_v2_modules?'),'Unexpected native transport route');
        const requested=(params.get('household_id')||'').replace(/^eq\./,''),module=(params.get('module')||'').replace(/^eq\./,'');
        if(method==='GET'){
          assert.equal(requested,household);const where=`household_id=${quote(household)}::uuid`+(module?` AND module=${quote(module)}`:'');
          const fields=params.get('select')==='module'?'module':'module,payload,revision,updated_at';
          result=await query(`SELECT COALESCE(json_agg(row_to_json(t)),'[]'::json) FROM (SELECT ${fields} FROM public.dobby_v2_modules WHERE ${where} ORDER BY module)t;`,{user});
        }else if(method==='POST'){
          assert.equal(body.household_id,household);result=await query(`WITH t AS (INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(household)},${quote(body.module)},${sqlJSON(body.payload)}) RETURNING module,payload,revision,updated_at) SELECT json_agg(row_to_json(t)) FROM t;`,{user});
        }else if(method==='PATCH'){
          assert.equal(requested,household);const revision=Number((params.get('revision')||'').replace(/^eq\./,''));assert.ok(Number.isSafeInteger(revision));
          result=await query(`WITH t AS (UPDATE public.dobby_v2_modules SET payload=${sqlJSON(body.payload)} WHERE household_id=${quote(household)} AND module=${quote(module)} AND revision=${revision} RETURNING module,payload,revision,updated_at) SELECT COALESCE(json_agg(row_to_json(t)),'[]'::json) FROM t;`,{user});
        }else throw Error('Unsupported native transport method '+method);
      }
      entry.sqlCommitted=true;return result;
    }catch(error){entry.error={code:error.code,status:error.status,message:error.message};throw error;}
  }
  return {journal,setInterceptor(fn){interceptor=fn;},authorized:(user,method,path,body)=>interceptor?interceptor({user,method,path,body,next:()=>run(user,method,path,body)}):run(user,method,path,body)};
}
