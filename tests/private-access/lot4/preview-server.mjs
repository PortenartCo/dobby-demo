// Full original V7 pages + actual Lot 3 backend, in disposable local fixtures.
// The two native source substitutions below are response-only test bindings.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync,realpathSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {startAuth,stopAuth} from '../lot3/local-auth.mjs';
import {businessCatalog,installAdministration} from '../lot3/business-catalog.mjs';
import {createAdminHandler} from '../../../supabase/functions/_shared/dobby-admin-handler.ts';
import {root,id,q,json} from '../local-db.mjs';

const publicKey='sb_publishable_lot4_fictional_loopback_only';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const staticRoots=['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview','design','docs/dobby-v7/stitch19-20'];
const csp="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
const fallback='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="360"><defs><radialGradient id="g"><stop stop-color="#785129"/><stop offset="1" stop-color="#24150f"/></radialGradient></defs><rect width="800" height="360" fill="url(#g)"/><text x="400" y="180" fill="#f3c879" text-anchor="middle" font-family="serif" font-size="38">✦ DOBBY · FOYER FICTIF ✦</text></svg>');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fictionalEmails(value){
 if(!value||typeof value!=='object')return true;
 return Object.entries(value).every(([key,item])=>['email','p_email'].includes(key)&&typeof item==='string'?item.toLowerCase().endsWith('.invalid'):fictionalEmails(item));
}

export async function startLot4Preview({port=0,longRequests=0}={}){
 const auth=await startAuth();let server,origin,handler;
 const previewInstance=randomUUID();
 const journal=[];
 const control={fault:null,delayMs:0,businessWritesOffline:false};
 try{
  await businessCatalog(auth);await installAdministration(auth);
  auth.sql(`UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{familyMembers}',${json([{id:'TEST_PARENT_A',memberCategory:'parent',name:'DÉMO — Camille H1',firstName:'Camille',lastName:'Fictif',avatar:'🧙',magicProfile:{version:1,houseId:'ravenclaw',patronusId:'otter'}},{id:'TEST_PARENT_B',memberCategory:'parent',name:'DÉMO — Alex H1',firstName:'Alex',lastName:'Fictif',avatar:'🧑'}])}) WHERE household_id=${q(id(101))} AND module='family';
   UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{familyMembers}',${json([{id:'TEST_PARENT_C',memberCategory:'parent',name:'DÉMO — Parent H2',firstName:'Parent',lastName:'Fictif',avatar:'🧙'},{id:'TEST_CHILD',memberCategory:'child',name:'DÉMO — Enfant existant',firstName:'Enfant',lastName:'Fictif',avatar:'🦉',magicProfile:{version:1,houseId:'ravenclaw',patronusId:'otter'}}])}) WHERE household_id=${q(id(102))} AND module='family';`);
  const owner=await auth.getLogin(1),parent=await auth.getLogin(3);
  for(let attempt=0;attempt<50;attempt++){
   const response=await auth.requestRpc('dobby_access_context',{},owner.access_token);
   if(response.ok && Object.hasOwn(await response.json(),'admission'))break;
   if(attempt===49)throw Error('Local administration catalog readiness failed');await sleep(100);
  }
  for(let index=0;index<longRequests;index++){
   const response=await auth.requestRpc('dobby_access_request_family_account',{p_email:`long-request-${String(index).padStart(3,'0')}@example.invalid`,p_kind:'family-parent',p_member_id:null,p_operation_id:randomUUID()},parent.access_token);
   assert.equal(response.status,200,'Seed fictional family request');
  }
  const common={'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','content-security-policy':csp};
  const send=(res,status,body,type='text/plain; charset=utf-8',extra={})=>{res.writeHead(status,{...common,'content-type':type,...extra});res.end(body);};
  server=createServer(async(req,res)=>{
   try{
    const target=new URL(req.url,origin??'http://127.0.0.1');
    if(!['127.0.0.1','localhost'].includes(target.hostname)||origin&&req.headers.host!==new URL(origin).host)return send(res,421,'Loopback preview only');
    let path=decodeURIComponent(target.pathname).replace(/^\/fixture-[134](?=\/)/,'');
    if(path.split('/').some(segment=>segment==='.'||segment==='..'))return send(res,403,'Not a public fixture asset');
    journal.push({method:req.method,path});
    if(path==='/')return send(res,302,'','text/plain',{location:'/fixture-1/essai-stitch-v7/famille.html#salon'});
    if(path==='/__fixture')return send(res,200,'<!doctype html><html lang="fr"><meta charset="utf-8"><title>Aperçu Lot 4 isolé</title><body style="background:#24150f;color:#ffdda1;font:18px/1.5 Georgia;padding:2rem;max-width:760px"><h1>DOBBY V7 — Aperçu local Lot 4</h1><p>Données entièrement fictives, comptes .invalid. Les pages V7 complètes utilisent GoTrue, PostgreSQL et PostgREST locaux et la commande propriétaire Lot 3 réelle. Les clés serveur ne quittent pas le serveur de test.</p><p>Cet aperçu est destiné à la revue et ne constitue pas une application de production. Les accès réseau sont limités à cette origine ; aucun appel au projet Supabase hébergé.</p><p><a style="color:inherit" href="/fixture-1/essai-stitch-v7/famille.html#salon">Ouvrir le propriétaire fictif</a> · <a style="color:inherit" href="/fixture-3/essai-stitch-v7/famille.html#salon">Ouvrir le Parent fictif H2</a> · <a style="color:inherit" href="/fixture-4/essai-stitch-v7/famille.html#access">Ouvrir le compte non approuvé</a></p></body></html>','text/html; charset=utf-8');
    if(path==='/__fixture/bootstrap.js')return send(res,200,readFileSync(new URL('./preview-bootstrap.js',import.meta.url),'utf8').replaceAll('__DOBBY_LOT4_PREVIEW_INSTANCE__',previewInstance),mime['.js']);
    if(path==='/__fixture/login'){
     if(req.method!=='POST'||req.headers.origin!==origin)return send(res,403,'Fixture origin required');
     const chunks=[];for await(const chunk of req)chunks.push(chunk);
     const body=JSON.parse(Buffer.concat(chunks));assert.deepEqual(Object.keys(body),['number']);assert.ok([1,3,4].includes(body.number));
     return send(res,200,JSON.stringify(await auth.getLogin(body.number)),'application/json');
    }
    if(path.startsWith('/auth/v1/')||path.startsWith('/rest/v1/')||path==='/functions/v1/dobby-access-admin'){
     if(path.startsWith('/auth/v1/admin/')||path==='/auth/v1/invite')return send(res,403,'Server-only Auth route');
     const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
     if(body.length&&req.headers['content-type']?.includes('application/json')){let value;try{value=JSON.parse(body);}catch{return send(res,400,'Invalid fixture JSON');}if(!fictionalEmails(value))return send(res,400,JSON.stringify({message:'Aperçu fictif : utilisez uniquement une adresse .invalid.'}),'application/json');}
     const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(!['host','connection','content-length','transfer-encoding'].includes(key))headers.set(key,String(value));
     if(control.delayMs)await sleep(control.delayMs);
     if(control.fault==='network'||control.businessWritesOffline&&path==='/rest/v1/dobby_v2_grocery'&&!['GET','HEAD'].includes(req.method))return send(res,503,JSON.stringify({message:'Réseau fictif indisponible',code:'fixture_unavailable'}),'application/json');
     const options={method:req.method,headers,body:body.length?body:undefined};
     const response=path==='/functions/v1/dobby-access-admin'?await handler(new Request(target.href,options)):await fetch(new URL(path+target.search,auth.url),{...options,redirect:'manual'});
     const responseHeaders=Object.fromEntries([...response.headers].filter(([key])=>!['content-length','content-encoding','transfer-encoding','connection','content-security-policy'].includes(key)));
     res.writeHead(response.status,{...common,...responseHeaders});res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if(!['GET','HEAD'].includes(req.method))return send(res,405,'Static preview only');
    const relative=path.replace(/^\//,'');
    if(!staticRoots.some(root=>relative.startsWith(root+'/')))return send(res,404,'Not a public fixture asset');
    const file=resolve(root,relative);
    if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile())return send(res,404,'Asset not found');
    const realFile=realpathSync(file);
    if(!staticRoots.some(directory=>realFile.startsWith(realpathSync(resolve(root,directory))+sep)))return send(res,403,'Not a public fixture asset');
    let bytes=readFileSync(file);const extension=extname(file);
    if(path.endsWith('/access-config.js'))bytes=Buffer.from(`window.DobbyPublicConfig=Object.freeze({projectRef:'pqcdkrwljgvgagzwrcmg',publicKey:'${publicKey}'});`);
    if(path==='/essai-stitch-v5-famille/family-v2.js'){
     let source=bytes.toString();assert.equal(source.split("const PROJECT = 'https://pqcdkrwljgvgagzwrcmg.supabase.co';").length,2,'Native fixed-project fixture binding must be reviewed');
     source=source.replace("const PROJECT = 'https://pqcdkrwljgvgagzwrcmg.supabase.co';",`const PROJECT = ${JSON.stringify(origin)};`);
     assert.equal(source.split('void boot();').length,2,'Native boot fixture binding must be reviewed');
     bytes=Buffer.from(source.replace('void boot();','void window.__fixtureReady.then(boot);'));
    }
    if(extension==='.html'){
     let source=bytes.toString().replace('<head>','<head><script src="/__fixture/bootstrap.js"></script>');
     source=source.replace(/\b(src|href)=(['"])https?:\/\/[^'"]+\2/g,(_all,attr,quote)=>attr==='src'?`src=${quote}${fallback}${quote}`:'');
     bytes=Buffer.from(source);
    }
    return send(res,200,req.method==='HEAD'?undefined:bytes,mime[extension]??'application/octet-stream');
   }catch{return send(res,500,'Owned local preview operation failed');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;
  handler=createAdminHandler({supabaseUrl:auth.url,anonKey:auth.anonToken,serviceRoleKey:auth.serviceToken,allowedOrigins:[origin],redirectTo:origin+'/fixture-1/essai-stitch-v7/famille.html',fetch:async(url,options)=>{
   let command;try{command=JSON.parse(options?.body??'null')?.p_command;}catch{}
   if(control.fault==='delivery-record'&&command==='recordDelivery')throw new TypeError('Owned fixture response interruption before delivery confirmation');
   return fetch(url,options);
  }});
  return {origin,auth,journal,control,owner,parent,info:{...auth.info,preview:{fullV7:true,responseOnlyNativeBinding:true,externalConnections:'CSP connect-src self + test-only loopback PROJECT binding',productionSourceModified:false,fictionalProfiles:[1,3,4]}},async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await stopAuth();}};
 }catch(error){if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await stopAuth();throw error;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const fixture=await startLot4Preview({port:Number(process.env.DOBBY_LOT4_PREVIEW_PORT||3214),longRequests:27});
 console.log(JSON.stringify({preview:fixture.origin+'/fixture-1/essai-stitch-v7/famille.html#salon',scope:'isolated local fiction; never production',serverSecretsExposed:false}));
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void fixture.close().finally(()=>process.exit(0)));
}
