// Real local HTTP only. Sidecar shares the owned PG network:none namespace.
// JWT signing key/tokens are ephemeral, fictional, and never logged/exported.
import {spawnSync} from 'node:child_process';
import {createHmac,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';

export const restImage='postgrest/postgrest@sha256:c847127074bd26e1b8d3f7c0e6e01e5346f4b85dd34f5d699fd230af960827c0';
const environment=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('DOCKER_')));
function docker(args,input){return spawnSync('docker',['--host','unix:///var/run/docker.sock',...args],{input,encoding:'utf8',env:environment,timeout:7000,maxBuffer:1024*1024});}
const must=result=>{assert.equal(result.status,0,result.stderr||result.error?.message);return result.stdout.trim();};
export function restAvailable(){return docker(['image','inspect',restImage,'--format','{{.Id}}']).status===0;}

function bodyFromResponse(response){
 const split=response.indexOf('\r\n\r\n');assert.ok(split>0,'HTTP headers missing');
 const header=response.slice(0,split),raw=response.slice(split+4);
 let body=raw;
 if(/transfer-encoding:\s*chunked/i.test(header)){
  const buffer=Buffer.from(raw),chunks=[];let cursor=0;
  for(;;){const end=buffer.indexOf('\r\n',cursor);assert.ok(end>=cursor,'Malformed HTTP chunk');const size=parseInt(buffer.subarray(cursor,end).toString(),16);assert.ok(Number.isFinite(size));if(size===0)break;cursor=end+2;chunks.push(buffer.subarray(cursor,cursor+size));cursor+=size+2;}
  body=Buffer.concat(chunks).toString('utf8');
 }
 const status=Number(header.match(/^HTTP\/1\.1 (\d{3})/)?.[1]);assert.ok(status);
 return {status,json:body?JSON.parse(body):null};
}

export function startLocalRest(pgContainer){
 const info=JSON.parse(must(docker(['inspect',pgContainer])))[0];
 assert.equal(info.Name,'/'+pgContainer);assert.equal(info.Config.Labels['dobby.private-access-test'],'lot1');
 assert.equal(info.HostConfig.NetworkMode,'none');assert.ok(!info.Mounts.some(m=>m.Type==='bind'));
 const name='dobby-v7-rest-'+process.pid+'-'+randomBytes(4).toString('hex');
 const key=randomBytes(48).toString('hex'),tokens=new Map();let owned=false;
 function token(user=2){
  if(tokens.has(user))return tokens.get(user);
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const content=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role:'authenticated',sub:'00000000-0000-4000-8000-'+String(user).padStart(12,'0'),session_id:'00000000-0000-4000-8000-'+String(1000+user).padStart(12,'0'),exp:Math.floor(Date.now()/1000)+600});
  const value=content+'.'+createHmac('sha256',key).update(content).digest('base64url');tokens.set(user,value);return value;
 }
 function request(method,path,body=null,user=2){
  assert.ok(['GET','POST'].includes(method));assert.ok(path.startsWith('/rpc/'));
  const payload=body===null?'':JSON.stringify(body);
  const wire=method+' '+path+' HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nAuthorization: Bearer '+token(user)+'\r\nContent-Type: application/json\r\nContent-Length: '+Buffer.byteLength(payload)+'\r\n\r\n'+payload;
  const result=docker(['exec','-i',pgContainer,'bash','-c','exec 3<>/dev/tcp/127.0.0.1/3000\ncat >&3\ncat <&3'],wire);
  if(result.status!==0)return {status:0,json:null};
  return bodyFromResponse(result.stdout);
 }
 function close(){if(owned){must(docker(['rm','-f',name]));owned=false;}}
 try{
  must(docker(['run','--pull=never','--rm','-d','--name',name,'--label','dobby.private-access-test=lot5b-rest',
   '--network','container:'+pgContainer,'-e','PGRST_DB_URI=postgresql://dobby_fixture_client@127.0.0.1:5432/dobby_access_lot1',
   '-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_JWT_SECRET='+key,
   '-e','PGRST_SERVER_HOST=127.0.0.1','-e','PGRST_LOG_LEVEL=error','-e','PGRST_OPENAPI_MODE=disabled',restImage,'/bin/postgrest']));owned=true;
  const until=Date.now()+20000;let ready=false,last;
  while(Date.now()<until){last=request('GET','/rpc/dobby_v7_context');if(last.status===200){ready=true;break;}Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}
  assert.ok(ready,'Owned local PostgREST did not become ready: '+last?.status+' '+last?.json?.code);
  const rest=JSON.parse(must(docker(['inspect',name])))[0];
  assert.ok(['container:'+info.Id,'container:'+pgContainer].includes(rest.HostConfig.NetworkMode));assert.ok(!rest.HostConfig.PortBindings||Object.keys(rest.HostConfig.PortBindings).length===0);assert.ok(!rest.Mounts.some(m=>m.Type==='bind'));
  return {request,close,name,image:restImage};
 }catch(error){close();throw error;}
}
