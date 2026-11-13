/* Public logged-out production only. No fixture identities or backend calls. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const base='https://portenartco.github.io/dobby-demo/',output=process.env.DOBBY_HOSTED_EVIDENCE||'/workspace/dobby-hosted-public';
(async()=>{fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const results=[];try{
 for(const width of [390,1440]){const c=await browser.newContext({viewport:{width,height:900},locale:'fr-BE'}),blocked=[];
 await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():(blocked.push(new URL(r.request().url()).origin),r.abort()));
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.getByRole('heading',{name:'Bienvenue dans DOBBY',exact:true}).waitFor();assert.equal(new URL(p.url()).pathname,'/dobby-demo/essai-stitch-v7/famille.html');assert.equal(await p.locator('body > nav').isVisible(),false,'No connected dock before login');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.screenshot({path:path.join(output,'public-welcome-'+width+'.png'),fullPage:true});await p.getByRole('button',{name:'Continuer',exact:true}).click();await p.getByRole('heading',{name:'Entrer dans DOBBY',exact:true}).waitFor();assert.equal(await p.locator('input[type=password]').count()>0,true);assert.equal(await p.locator('body > nav').isVisible(),false);
 assert.deepEqual(errors,[]);results.push({width,passed:true,route:p.url(),blockedExternalOrigins:[...new Set(blocked)],liveAuthVerified:false});await c.close();}
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,supabaseContacted:false,fixtures:false,results},null,2)+'\n');console.log('HOSTED_PUBLIC_PASS root/welcome/login navigation,390/1440,no auth submission,no backend certification');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
