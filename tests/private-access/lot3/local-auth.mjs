// Real, digest-pinned GoTrue + SMTP sink + PostgREST. Entirely local fiction.
// GoTrue owns all Auth table DDL and issues all fixture user/session tokens.
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

export const images = Object.freeze({
 postgres: 'postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4',
 auth: 'supabase/gotrue:v2.197.0@sha256:839f529492d116b4e8b7777c953a27c381d34c15a744b1bcefde5eefaa1f9f9f',
 inbox: 'axllent/mailpit:v1.34.0@sha256:5040a9c533087d25dcb8f2ac748f45c9be5f7bc1d9fe5b860afb9597a2471d57',
 rest: 'postgrest/postgrest:v14.18@sha256:c847127074bd26e1b8d3f7c0e6e01e5346f4b85dd34f5d699fd230af960827c0',
});
const suffix = `${process.pid}-${randomBytes(6).toString('hex')}`;
const network = `dobby-lot3-auth-net-${suffix}`;
const names = Object.fromEntries(['database','auth','inbox','rest'].map(name => [name,`dobby-lot3-${name}-${suffix}`]));
const dockerEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('DOCKER_')));
const database = 'dobby_auth_lot3';
const owned = new Set();
const children = new Set();
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
let networkCreated = false;
let relay;
let active;
let secrets = [];
let authEnvironment;
let signupDisabled = false;

const fixtureId = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function redact(value) {
 let result = String(value ?? '');
 for (const secret of secrets) if (secret) result = result.replaceAll(secret,'[LOCAL SECRET REDACTED]');
 return result.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT REDACTED]')
  .replace(/([?&](?:token|token_hash|code)=)[^&\s"<>]+/g,'$1[REDACTED]');
}
function remember(value) {
 if (!value || typeof value !== 'object') return;
 for (const [key,item] of Object.entries(value)) {
  if (typeof item === 'string' && /token|password|action_link|email_otp/i.test(key)) secrets.push(item);
  else if (item && typeof item === 'object') remember(item);
 }
}
function docker(args,{input,env={},timeout=120000}={}) {
 return spawnSync('docker',['--host','unix:///var/run/docker.sock',...args],{
  input,env:{...dockerEnv,...env},encoding:'utf8',timeout,maxBuffer:8*1024*1024,
 });
}
function must(result,operation='Owned local fixture operation') {
 assert.equal(result.status,0,`${operation}: ${redact(result.stderr || result.error?.message)}`);
 return result.stdout.trim();
}
function inspect(name) { return JSON.parse(must(docker(['inspect',name])))[0]; }
function raw(statement,login='dobby_local_root') {
 assert.ok(['dobby_local_root','postgres','dobby_fixture_client','supabase_auth_admin'].includes(login));
 return docker(['exec','-i',names.database,'psql','-X','-qAt','-v','ON_ERROR_STOP=1',
  '-v','VERBOSITY=verbose','-U',login,'-d',database],{input:statement});
}
function sql(statement) { return must(raw(statement),'Local PostgreSQL query'); }

// The managed daemon cannot publish internal-network ports. Bash's TCP socket
// in our owned PG container carries real HTTP to a fixed owned service. Headers,
// tokens and bodies use stdin/stdout only, never argv or logs. No mock dispatch.
function internalHttp(service,method,path,headers=[],body=Buffer.alloc(0)) {
 assert.ok(['auth','inbox','rest','templates'].includes(service));
 assert.ok(path.startsWith('/') && !path.startsWith('//') && !/[\r\n]/.test(path));
 const port = {auth:9999,inbox:8025,rest:3000,templates:8099}[service];
 const host=service==='templates'?'database':service;
 const clean = headers.filter(([key]) => !['host','connection','content-length','transfer-encoding','accept-encoding'].includes(key.toLowerCase()));
 for (const [key,value] of clean) assert.ok(!/[\r\n]/.test(key+value));
 const request = Buffer.concat([Buffer.from(`${method} ${path} HTTP/1.1\r\nHost: ${host}:${port}\r\nConnection: close\r\nContent-Length: ${body.length}\r\n${clean.map(([key,value])=>`${key}: ${value}\r\n`).join('')}\r\n`),body]);
 return new Promise((resolve,reject) => {
  const child = spawn('docker',['--host','unix:///var/run/docker.sock','exec','-i',names.database,
   'bash','-c',`exec 3<>/dev/tcp/${host}/${port}; cat >&3; cat <&3`],{env:dockerEnv,stdio:['pipe','pipe','pipe']});
  children.add(child);
  const chunks=[];
  let length=0;
  const timer=setTimeout(()=>child.kill('SIGKILL'),15000);
  child.stdout.on('data',chunk=>{length+=chunk.length;if(length>8*1024*1024)child.kill('SIGKILL');else chunks.push(chunk);});
  // Service/transport diagnostics never echo request headers, tokens or bodies.
  child.stderr.on('data',()=>{});
  child.stdin.on('error',()=>{});
  child.once('error',reject);
  child.once('close',code=>{
   clearTimeout(timer); children.delete(child);
   if(code!==0){reject(new Error('Owned local service HTTP transport failed'));return;}
   try {
    const response=Buffer.concat(chunks);
    const end=response.indexOf('\r\n\r\n');
    assert.ok(end>=0,'Invalid local HTTP response');
    const lines=response.subarray(0,end).toString().split('\r\n');
    const status=Number(lines.shift().split(' ')[1]);
    const responseHeaders=lines.map(line=>{const split=line.indexOf(':');return [line.slice(0,split).toLowerCase(),line.slice(split+1).trim()];});
    let payload=response.subarray(end+4);
    if(responseHeaders.some(([key,value])=>key==='transfer-encoding' && value==='chunked')) {
     const decoded=[];
     while(payload.length){const split=payload.indexOf('\r\n');assert.ok(split>=0);const size=parseInt(payload.subarray(0,split).toString().split(';')[0],16);assert.ok(Number.isFinite(size));if(!size)break;decoded.push(payload.subarray(split+2,split+2+size));payload=payload.subarray(split+2+size+2);}
     payload=Buffer.concat(decoded);
    }
    resolve({status,headers:responseHeaders.filter(([key])=>!['transfer-encoding','connection','content-length'].includes(key)),body:payload});
   } catch { reject(new Error('Invalid owned local HTTP response')); }
  });
  child.stdin.end(request);
 });
}
async function startRelay() {
 relay=createServer(async(incoming,outgoing)=>{
  try {
   const target=new URL(incoming.url,'http://127.0.0.1');
   let service,path;
   for(const [prefix,name] of [['/auth/v1','auth'],['/rest/v1','rest'],['/inbox','inbox']]) {
    if(target.pathname===prefix || target.pathname.startsWith(prefix+'/')) {service=name;path=target.pathname.slice(prefix.length)||'/';break;}
   }
   if(!service){outgoing.writeHead(404);outgoing.end();return;}
   const chunks=[];let length=0;
   for await(const chunk of incoming){length+=chunk.length;assert.ok(length<=2*1024*1024);chunks.push(chunk);}
   const result=await internalHttp(service,incoming.method,path+target.search,Object.entries(incoming.headers),Buffer.concat(chunks));
   outgoing.writeHead(result.status,Object.fromEntries(result.headers));outgoing.end(result.body);
  } catch {outgoing.writeHead(502,{'content-type':'application/json'});outgoing.end('{"error":"Owned local Auth transport unavailable"}');}
 });
 await new Promise((resolve,reject)=>{relay.once('error',reject);relay.listen(0,'127.0.0.1',resolve);});
 return `http://127.0.0.1:${relay.address().port}`;
}
function createService(service,image,environment,tmpfs=[]) {
 must(docker(['create','--pull=never','--name',names[service],'--label','dobby.private-access-test=lot3-auth',
  '--network',network,'--network-alias',service,...tmpfs.flatMap(value=>['--tmpfs',value]),
  ...Object.keys(environment).flatMap(key=>['-e',key]),image],{env:environment}),`Create local ${service}`);
 owned.add(service);
 must(docker(['start',names[service]]),`Start local ${service}`);
}
function localProxyEnvironment() {
 // Preserve the daemon's inherited exclusions. Discover them without printing
 // proxy configuration or credentials, then add only fixed owned local names.
 must(docker(['create','--pull=never','--name',names.auth,'--label','dobby.private-access-test=lot3-auth',
  '--network',network,images.auth]),'Inspect inherited owned-container routing');owned.add('auth');
 const inherited=Object.fromEntries(inspect(names.auth).Config.Env.map(value=>{
  const split=value.indexOf('=');return [value.slice(0,split),value.slice(split+1)];
 }));
 must(docker(['rm',names.auth]),'Remove owned routing probe');owned.delete('auth');
 const local=['database','auth','inbox','rest','127.0.0.1','localhost'];
 const merge=value=>[...new Set([...(value||'').split(',').filter(Boolean),...local])].join(',');
 return {NO_PROXY:merge(inherited.NO_PROXY||inherited.no_proxy),no_proxy:merge(inherited.no_proxy||inherited.NO_PROXY)};
}
function startTemplateServer() {
 // Perl and IO::Socket::INET are part of the pinned stock PostgreSQL image.
 // This public, fixed template server lives inside the disposable PG container;
 // it receives no account data and exits when that container is removed.
 const program=String.raw`
 use strict; use warnings; use IO::Socket::INET;
 my $server=IO::Socket::INET->new(LocalAddr=>'0.0.0.0',LocalPort=>8099,Listen=>16,ReuseAddr=>1) or die 'local template listener unavailable';
 while(my $client=$server->accept()) {
  my $line=<$client> // '';
  while(defined(my $header=<$client>)){last if $header =~ /^\r?\n$/;}
  my ($kind)=$line =~ m{^GET /(invite|magiclink)[.]html HTTP/};
  my $body=$kind ? '<!doctype html><html><body><h2>LOCAL FICTIONAL DOBBY</h2><p><a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type='.$kind.'">Continue admission</a></p></body></html>' : 'Not found';
  my $status=$kind ? '200 OK' : '404 Not Found';
  print $client "HTTP/1.1 $status\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ".length($body)."\r\nConnection: close\r\n\r\n$body";
  close($client);
 }`;
 must(docker(['exec','-d',names.database,'perl','-e',program]),'Start owned fixed Auth templates');
}
async function healthy(service,path) {
 const deadline=Date.now()+45000;
 while(Date.now()<deadline){
  try {const result=await internalHttp(service,'GET',path);if(result.status===200)return;}catch{}
  if(!inspect(names[service]).State.Running)break;
  await sleep(100);
 }
 const logs=docker(['logs','--tail','12',names[service]]);
 throw new Error(`Owned local ${service} did not become ready: ${redact(logs.stdout+logs.stderr)}`);
}
async function requestAt(url,path,options={}) {
 assert.ok(typeof path==='string' && path.startsWith('/') && !path.startsWith('//'));
 const target=new URL(path,url);
 assert.equal(target.origin,new URL(url).origin);
 const response=await fetch(target,{...options,redirect:options.redirect??'manual',signal:options.signal??AbortSignal.timeout(20000)});
 if(response.headers.get('content-type')?.includes('json')){
  try{remember(await response.clone().json());}catch{}
 }
 return response;
}
async function reconfigureAuth(changes) {
 assert.ok(active,'Auth fixture is not running');
 must(docker(['rm','-f',names.auth]),'Recreate owned GoTrue configuration');owned.delete('auth');
 authEnvironment={...authEnvironment,...changes};
 createService('auth',images.auth,authEnvironment);await healthy('auth','/health');
}
async function setSignupDisabled(disabled) {
 assert.equal(typeof disabled,'boolean');
 if(disabled===signupDisabled)return;
 await reconfigureAuth({GOTRUE_DISABLE_SIGNUP:String(disabled)});signupDisabled=disabled;
}
async function setOtpExpiry(seconds) {
 assert.ok(Number.isInteger(seconds)&&seconds>=1&&seconds<=86400,'Local OTP expiry must be 1..86400 seconds');
 await reconfigureAuth({GOTRUE_MAILER_OTP_EXP:String(seconds)});
 active.info.auth.configuredOtpExpirySeconds=seconds;
}
export async function stopAuth() {
 active=undefined;
 if(relay){for(const child of children)child.kill('SIGKILL');relay.closeAllConnections();await new Promise(resolve=>relay.close(resolve));relay=undefined;}
 const errors=[];
 for(const service of ['rest','auth','inbox','database']){
  if(!owned.has(service))continue;
  const result=docker(['rm','-f',names[service]]);if(result.status!==0)errors.push(redact(result.stderr));owned.delete(service);
 }
 if(networkCreated){const result=docker(['network','rm',network]);if(result.status!==0)errors.push(redact(result.stderr));networkCreated=false;}
 authEnvironment=undefined;secrets=[];signupDisabled=false;
 assert.equal(errors.length,0,errors.join('\n'));
}

export async function startAuth() {
 assert.equal(owned.size,0,'Owned Auth fixture is already running');
 const secret=randomBytes(48).toString('base64url');
 const password=`Fixture!${randomBytes(24).toString('base64url')}9a`;
 secrets=[secret,password];
 const sign=claims=>{
  const now=Math.floor(Date.now()/1000);
  const body=[{alg:'HS256',typ:'JWT'},{iat:now,exp:now+7200,...claims}].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  const token=`${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;secrets.push(token);return token;
 };
 const serviceToken=sign({role:'service_role',aud:'authenticated'});
 const anonToken=sign({role:'anon',aud:'authenticated'});
 try {
  const imageInfo=Object.fromEntries(Object.entries(images).map(([key,image])=>[key,inspect(image)]));
  for(const [key,image] of Object.entries(images))assert.ok(imageInfo[key].RepoDigests.includes(`${image.split(':')[0]}@${image.split('@')[1]}`),`Pinned ${key} digest mismatch`);
  must(docker(['network','create','--internal','--label','dobby.private-access-test=lot3-auth',network]));networkCreated=true;
  createService('database',images.postgres,{POSTGRES_USER:'dobby_local_root',POSTGRES_DB:database,POSTGRES_HOST_AUTH_METHOD:'trust'},['/var/lib/postgresql/data:rw,mode=700']);
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){if(docker(['exec',names.database,'cat','/proc/1/comm']).stdout?.trim()==='postgres'&&raw('SELECT 1;').status===0)break;await sleep(100);}
  sql(readFileSync(new URL('./auth-fixtures.sql',import.meta.url),'utf8'));
  startTemplateServer();
  const template=await internalHttp('templates','GET','/invite.html');
  assert.equal(template.status,200,'Owned admission template server readiness');
  assert.ok(template.body.includes(Buffer.from('{{ .TokenHash }}')),'Owned admission template contents');
  const url=await startRelay();
  createService('inbox',images.inbox,{
   MP_DATABASE:'/data/mailpit.db',MP_MAX_MESSAGES:'200',MP_SMTP_ALLOWED_RECIPIENTS:'.+@[^@]+\\.invalid$',
   MP_SMTP_DISABLE_RDNS:'true',MP_VERBOSE:'false',MP_WEBROOT:'/',
  },['/data:rw,mode=1777']);
  await healthy('inbox','/livez');
  authEnvironment={
   // The managed daemon injects an HTTP proxy. Only these owned local names
   // route directly; the internal network still has no external route.
   ...localProxyEnvironment(),
   GOTRUE_API_HOST:'0.0.0.0',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:`${url}/auth/v1`,
   GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgres://supabase_auth_admin@database:5432/${database}?sslmode=disable`,GOTRUE_DB_NAMESPACE:'auth',
   GOTRUE_SITE_URL:`${url}/callback`,GOTRUE_URI_ALLOW_LIST:'http://127.0.0.1:*/**,http://localhost:*/**',GOTRUE_DISABLE_SIGNUP:'false',
   GOTRUE_JWT_SECRET:secret,GOTRUE_JWT_ADMIN_ROLES:'service_role',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_EXP:'3600',GOTRUE_JWT_ISSUER:`${url}/auth/v1`,
   GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_EXTERNAL_PHONE_ENABLED:'false',GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED:'false',GOTRUE_MAILER_AUTOCONFIRM:'false',
   GOTRUE_SMTP_ADMIN_EMAIL:'noreply@example.invalid',GOTRUE_SMTP_HOST:'inbox',GOTRUE_SMTP_PORT:'1025',GOTRUE_SMTP_SENDER_NAME:'LOCAL FICTIONAL DOBBY',GOTRUE_SMTP_MAX_FREQUENCY:'1ms',GOTRUE_MAILER_OTP_EXP:'3600',
   GOTRUE_MAILER_URLPATHS_INVITE:'/auth/v1/verify',GOTRUE_MAILER_URLPATHS_CONFIRMATION:'/auth/v1/verify',GOTRUE_MAILER_URLPATHS_RECOVERY:'/auth/v1/verify',GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE:'/auth/v1/verify',
   GOTRUE_MAILER_TEMPLATES_INVITE:'http://database:8099/invite.html',GOTRUE_MAILER_TEMPLATES_MAGIC_LINK:'http://database:8099/magiclink.html',
   GOTRUE_RATE_LIMIT_EMAIL_SENT:'10000',GOTRUE_RATE_LIMIT_TOKEN_REFRESH:'10000',GOTRUE_RATE_LIMIT_VERIFY:'10000',GOTRUE_RATE_LIMIT_SIGN_IN_SIGN_UP:'10000',GOTRUE_LOG_LEVEL:'error',LOG_LEVEL:'error',
  };
  createService('auth',images.auth,authEnvironment);await healthy('auth','/health');
  // Managed Supabase's table isolation is a separate owner capability. Apply it
  // only to the disposable fixture after real GoTrue migrations have completed.
  sql(`SET ROLE supabase_auth_admin; DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='auth' LOOP EXECUTE format('ALTER TABLE auth.%I ENABLE ROW LEVEL SECURITY',t.tablename); END LOOP; END $$;
   GRANT SELECT(id),REFERENCES(id) ON auth.users TO postgres;
   -- Reuse the existing local catalog's claim helper: PostgREST 14 sets the
   -- combined claims GUC; GoTrue's historical initial helper reads only sub.
   -- This compatibility helper does not construct a user, token or session.
   CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
      nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
   $$; RESET ROLE;`);
  createService('rest',images.rest,{
   PGRST_DB_URI:`postgres://authenticator@database:5432/${database}?sslmode=disable`,PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',
   PGRST_JWT_SECRET:secret,PGRST_SERVER_HOST:'0.0.0.0',PGRST_SERVER_PORT:'3000',PGRST_LOG_LEVEL:'crit',
  });
  await healthy('rest','/');
  const requestAuth=(path,options={})=>requestAt(url,`/auth/v1${path}`,options);
  const adminHeaders={authorization:`Bearer ${serviceToken}`,'content-type':'application/json'};
  const seedUsers=[];
  for(let number=1;number<=6;number++){
   const user={id:fixtureId(number),email:`fixture-${number}@example.invalid`,password,email_confirm:true};
   const response=await requestAuth('/admin/users',{method:'POST',headers:adminHeaders,body:JSON.stringify(user)});
   assert.equal(response.status,200,`Create fictional Auth account ${number}: HTTP ${response.status}`);
   const created=await response.json();assert.equal(created.id,user.id);seedUsers.push({number,id:user.id,email:user.email});
  }
  const inboxRequest=(path,options={})=>requestAt(url,`/inbox${path}`,options);
  const inbox={
   async list(){const response=await inboxRequest('/api/v1/messages');assert.equal(response.status,200);return response.json();},
   async get(messageId){assert.match(messageId,/^[A-Za-z0-9-]+$/);const response=await inboxRequest(`/api/v1/message/${messageId}`);assert.equal(response.status,200);const message=await response.json();remember(message);return message;},
   async clear(){const response=await inboxRequest('/api/v1/messages',{method:'DELETE'});assert.equal(response.status,200);},
   async waitFor(email,{timeout=10000}={}){assert.match(email,/@[^@]+\.invalid$/);const until=Date.now()+timeout;while(Date.now()<until){const page=await inbox.list();const item=page.messages.find(message=>message.To?.some(recipient=>recipient.Address===email));if(item)return inbox.get(item.ID);await sleep(100);}throw new Error('Fictional SMTP message was not received');},
  };
  const isolation=JSON.parse(must(docker(['network','inspect',network])))[0];
  assert.equal(isolation.Internal,true);
  assert.deepEqual(Object.values(isolation.Containers).map(value=>value.Name).sort(),Object.values(names).sort());
  for(const name of Object.values(names)){const resource=inspect(name);assert.ok(!resource.Mounts.some(value=>value.Type==='bind'));assert.ok(!resource.HostConfig.PortBindings||!Object.keys(resource.HostConfig.PortBindings).length);assert.deepEqual(Object.keys(resource.NetworkSettings.Networks),[network]);}
  const migrations=JSON.parse(sql('SELECT json_agg(version ORDER BY version) FROM auth.schema_migrations;'));
  const info={
   postgres:{version:sql('SHOW server_version;'),image:images.postgres},
   auth:{version:'v2.197.0',image:images.auth,imageId:imageInfo.auth.Id,synthetic:false,schemaCreatedBy:'unmodified GoTrue migrations',migrations,usersOwner:sql("SELECT relowner::regrole::text FROM pg_class WHERE oid='auth.users'::regclass;"),sessionsOwner:sql("SELECT relowner::regrole::text FROM pg_class WHERE oid='auth.sessions'::regclass;"),sessionRls:true,configuredOtpExpirySeconds:3600,localOwnerCapabilities:['enable Auth table RLS','grant postgres SELECT(id), REFERENCES(id)','existing fixture auth.uid() fallback for real PostgREST JSON claims']},
   smtp:{version:'v1.34.0',image:images.inbox,recipientPolicy:'only recipient domains ending .invalid',delivery:'owned internal Mailpit sink; no external route or SMTP relay',admissionTemplates:'real GoTrue template rendering of RedirectTo (trusted callback with admission_id) + TokenHash + invite/magiclink type; fixed internal fixture template server; recovery/signup defaults preserved'},
   rest:{version:'v14.18',image:images.rest,exposedSchemas:['public']},
   isolation:{internalNetwork:true,publishAddress:'127.0.0.1 relay only',bindMounts:false,publishedContainerPorts:false,databaseData:'tmpfs',inboxData:'tmpfs',ownedNetwork:network,transport:'loopback HTTP relay via docker exec and fixed internal TCP services',realAccounts:false,hostedChanges:false},
  };
  active={url,authUrl:`${url}/auth/v1`,restUrl:`${url}/rest/v1`,requestAuth,inbox,sql,raw,serviceToken,anonToken,info,seedUsers,setSignupDisabled,setOtpExpiry,
   toJSON(){return {info,seedUsers};},
   async getLogin(number){const user=seedUsers.find(user=>user.number===number);assert.ok(user,'Unknown fictional account');const response=await requestAuth('/token?grant_type=password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:user.email,password})});assert.equal(response.status,200,`Fictional account login: HTTP ${response.status}`);return response.json();},
   requestRpc(name,args,accessToken){assert.match(name,/^[a-z][a-z0-9_]*$/);return requestAt(url,`/rest/v1/rpc/${name}`,{method:'POST',headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify(args)});},
   reloadRest(){sql("NOTIFY pgrst, 'reload schema';");},
  };
  return active;
 } catch(error){const message=redact(error.message);try{await stopAuth();}catch(cleanup){throw new AggregateError([new Error(message),cleanup],'Owned Auth fixture setup and cleanup failed');}throw new Error(message);}
}
