/* Real local portrait assets and renderers; isolated DOM, no accounts or persistence. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),atlas='essai-stitch-v7/assets/magic/portraits-09-24.png';
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const server=http.createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 if(pathname==='/essai-stitch-v7/__portrait-render-test'){response.setHeader('content-type','text/html');response.end('<!doctype html><html><head><link rel="stylesheet" href="member-avatar.css"><link rel="stylesheet" href="magic-profile.css"></head><body></body></html>');return;}
 const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404).end();return;}
 response.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'application/octet-stream');fs.createReadStream(file).pipe(response);
});
(async()=>{
 assert.equal(digest(atlas),'c1c4e2d7819c1540b66046709525187ba8219ceaec8308de3d410f1238dc45a9','Recovered atlas remains byte-identical');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await page.goto(origin+'/essai-stitch-v7/__portrait-render-test');
  await page.evaluate(()=>{window.DobbyFamilyStitchEngine={rewardSummary:()=>null};});
  await page.addScriptTag({url:origin+'/essai-stitch-v5-famille/family-profile.js'});
  await page.addScriptTag({url:origin+'/essai-stitch-v7/member-avatar.js'});
  await page.addScriptTag({url:origin+'/essai-stitch-v7/magic-profile.js'});
  const result=await page.evaluate(async()=>{
   const rows=[];
   for(const item of DobbyMagicIdentity.avatars){
    const member=DobbyMemberAvatar.create({name:item.name,avatar:'🌿',magicProfile:{avatarId:item.id}}),face=member.firstElementChild;
    member.style.cssText='width:72px;height:72px;border-radius:50%';document.body.append(member);
    const sprite=DobbyMagicProfile.sprite(item,'avatar');document.body.append(sprite);
    const url=getComputedStyle(face).backgroundImage.slice(5,-2),image=new Image();image.src=url;await image.decode();
    const saved=DobbyMagicIdentity.patch({id:'portrait-render-test',name:'Fixture',magicProfile:{version:1,houseId:'slytherin',patronusId:'otter'}},{magicAvatarId:item.id});
    rows.push({id:item.id,position:face.style.backgroundPosition,size:getComputedStyle(face).backgroundSize,url,width:image.naturalWidth,height:image.naturalHeight,spritePosition:sprite.style.backgroundPosition,spriteSize:sprite.style.backgroundSize,savedId:saved.magicProfile.avatarId,savedHouse:saved.magicProfile.houseId,savedPatronus:saved.magicProfile.patronusId});
   }
   const unknown=DobbyMemberAvatar.create({name:'Emoji compatibility',avatar:'🌿',magicProfile:{avatarId:'unknown-portrait'}});
   const patronus=DobbyMagicProfile.sprite(DobbyMagicIdentity.patronuses[11],'patronus');document.body.append(patronus);
   return{rows,unknown:unknown.textContent,patronus:{position:patronus.style.backgroundPosition,size:getComputedStyle(patronus).backgroundSize}};
  });
  assert.equal(result.rows.length,24,'The canonical catalogue contains all available human portraits');
  for(const[index,row]of result.rows.entries()){
   assert.equal(row.id,'portrait-'+(index+1));assert.equal(row.savedId,row.id,'Canonical validator accepts '+row.id);assert.equal(row.savedHouse,'slytherin');assert.equal(row.savedPatronus,'otter');
   const x=(index%4/3*100)+'%',y=index<8?(index<4?'16.6667%':'83.3333%'):(Math.floor((index-8)/4)/3*100)+'%';
   // Browsers round CSS percentages. Compare their numeric components instead of spelling.
   const coordinates=row.position.split(' ').map(parseFloat),expected=[parseFloat(x),parseFloat(y)];assert.ok(coordinates.every((value,axis)=>Math.abs(value-expected[axis])<.0001),row.id+' retains its atlas cell');
   assert.equal(row.size,'400% 400%',row.id+' atlas scale');assert.equal(row.width,1254);assert.equal(row.height,1254);
   if(index<8)assert.match(row.url,/\/assets\/magic\/avatars\.png$/,'Native portrait atlas is unchanged');
   else{assert.match(row.url,/\/assets\/magic\/portraits-09-24\.png$/);assert.equal(row.spritePosition,row.position,row.id+' shared renderer uses the same cell');assert.equal(row.spriteSize,'400% 400%');}
  }
  assert.equal(result.unknown,'🌿','Unknown portraits retain the existing emoji');assert.equal(result.patronus.position,'100% 100%');assert.equal(result.patronus.size,'400% 300%','Patronus ratio is unchanged');assert.deepEqual(errors,[]);
  console.log('STITCH19_20_PORTRAITS_PASS: 24 canonical IDs accepted, 8 unchanged native crops, 16 recovered cells, decoded local atlases, shared renderer, emoji and Patronus compatibility');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
