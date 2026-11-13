import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync, inflateRawSync} from 'node:zlib';
import {parseContractManifest, externalPrompt} from '../contracts-import-format.mjs';
import {readContractZip, inspectContractFile, CONTRACT_ZIP_LIMITS} from '../contracts-import-zip.mjs';

const encode = value => new TextEncoder().encode(value);
const entry = (patch = {}) => ({id:'chauffage-2026',title:'Entretien chaudière',provider:'Chauffage SA',reference:'C-42',date:null,deadline:'2027-02-28',note:'',contract:{version:1,type:'maintenance',scope:'equipment',equipmentIds:['chaudiere'],effectiveDate:'2026-02-28',autoRenewal:'yes',renewalDuration:{value:1,unit:'years'},notice:{value:3,unit:'months'},renonDate:null,renonMethod:'Courrier recommandé',reminders:[90,30,7],amount:0,periodicity:'annuelle',terminationConditions:'',provenance:[],uncertainties:[]},documents:[],...patch});
const manifest = (...contracts) => ({format:'dobby-contracts',version:1,contracts:contracts.length?contracts:[entry()]});
const doc = (patch = {}) => ({id:'original-1',path:'originals/contrat.pdf',name:'Contrat original.pdf',kind:'contract',...patch});
function pdf(){
  const objects=['1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n','2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n','3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\n'];
  let text='%PDF-1.4\n';const offsets=[0];for(const object of objects){offsets.push(encode(text).length);text+=object;}const start=encode(text).length;text+='xref\n0 4\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';return encode(text);
}
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}return(crc^0xffffffff)>>>0;}
function zip(files){
  const locals=[],centrals=[];let offset=0;
  for(const file of files){const name=encode(file.name),bytes=typeof file.bytes==='string'?encode(file.bytes):file.bytes,packed=file.deflate?deflateRawSync(bytes):bytes,checksum=crc32(bytes),size=file.size??bytes.length,local=new Uint8Array(30+name.length+packed.length),l=new DataView(local.buffer);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(8,file.deflate?8:0,true);l.setUint32(14,checksum,true);l.setUint32(18,packed.length,true);l.setUint32(22,size,true);l.setUint16(26,name.length,true);local.set(name,30);local.set(packed,30+name.length);const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(10,file.deflate?8:0,true);c.setUint32(16,checksum,true);c.setUint32(20,packed.length,true);c.setUint32(24,size,true);c.setUint16(28,name.length,true);c.setUint32(38,file.attributes??0,true);c.setUint32(42,offset,true);central.set(name,46);locals.push(local);centrals.push(central);offset+=local.length;}
  const length=offset+centrals.reduce((n,file)=>n+file.length,0)+22,out=new Uint8Array(length);let at=0;for(const file of [...locals,...centrals]){out.set(file,at);at+=file.length;}const end=new DataView(out.buffer,at,22);end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,at-offset,true);end.setUint32(16,offset,true);return out;
}
const bundle = (data, files=[]) => zip([{name:'contracts.json',bytes:JSON.stringify(data)},...files]);
const inflate = bytes => new Uint8Array(inflateRawSync(bytes));

test('manifest normalizes all manual fields, preserves unknowns as null and amount zero',()=>{
  const value=parseContractManifest(JSON.stringify(manifest()));assert.equal(value.format,'dobby-contracts');assert.equal(value.contracts[0].contract.amount,0);assert.equal(value.contracts[0].date,null);assert.equal(value.contracts[0].contract.renonDate,null);assert.deepEqual(value.contracts[0].contract.equipmentIds,['chaudiere']);
  const partial=parseContractManifest(manifest({id:'unknown',title:'Assurance'})).contracts[0];assert.equal(partial.contract.autoRenewal,'unknown');assert.equal(partial.contract.amount,null);assert.deepEqual(partial.contract.reminders,[90,30,7]);assert.equal(partial.deadline,null);assert.deepEqual(partial.documents,[]);
});
test('contract title matches the native writer boundary without truncation',()=>{
  const title='A'.repeat(140);assert.equal(parseContractManifest(manifest(entry({title}))).contracts[0].title,title);
  assert.throws(()=>parseContractManifest(manifest(entry({title:'A'.repeat(141)}))),/Nom du contrat.*long/i);
});
test('invalid shape, versions, dates, coercions and out-of-range manual fields are refused',()=>{
  for(const value of [null,[],{},manifest({...entry(),title:''}),{...manifest(),version:2},{...manifest(),contracts:[]},'{'])assert.throws(()=>parseContractManifest(value));
  for(const patch of [{deadline:'2027-02-29'},{date:'2026-13-01'},{title:3},{contract:{amount:true}},{contract:{amount:-1}},{contract:{amount:Infinity}},{contract:{reminders:[-1]}},{contract:{reminders:[7,7]}},{contract:{autoRenewal:true}},{contract:{notice:{value:1.5,unit:'months'}}},{contract:{notice:{value:1,unit:'years'}}},{contract:{notice:{value:3}}},{contract:{renewalDuration:{value:1,unit:null}}},{contract:{renewalDuration:{value:0,unit:'years'}}},{contract:{equipmentIds:['x','x']}},{contract:{scope:'equipment',equipmentIds:[]}}])assert.throws(()=>parseContractManifest(manifest(entry(patch))),JSON.stringify(patch));
});
test('stable IDs, source descriptors and provenance reject duplicates and unavailable references',()=>{
  assert.throws(()=>parseContractManifest(manifest(entry(),entry())),/identifiant|doublon/i);
  for(const documents of [[doc(),doc()],[doc(),doc({id:'other',path:'originals/CONTRAT.pdf'})],[doc({path:'../contrat.pdf'})],[doc({path:'originals/%2e%2e/secret.pdf'})],[doc({path:'https://x.test/a.pdf'})],[doc({path:'originals/a.svg'})],[doc({kind:'script'})]])assert.throws(()=>parseContractManifest(manifest(entry({documents}))));
  const provenance=[{field:'notice',documentId:'original-1',pages:[2],passage:'Préavis de trois mois.'}];
  assert.throws(()=>parseContractManifest(manifest(entry({contract:{provenance}}))),/source|document/i);
  const parsed=parseContractManifest(manifest(entry({documents:[doc()],contract:{provenance,uncertainties:['La signature est illisible.']}})));assert.deepEqual(parsed.contracts[0].contract.provenance,provenance);
  for(const pages of [[0],[1.5],[1,1],['2']])assert.throws(()=>parseContractManifest(manifest(entry({documents:[doc()],contract:{provenance:[{...provenance[0],pages}]}}))));
});
test('document display names are safe basenames with the same real type as their path',()=>{
  assert.equal(parseContractManifest(manifest(entry({documents:[doc({name:'Original.pdf'})]}))).contracts[0].documents[0].name,'Original.pdf');
  assert.equal(parseContractManifest(manifest(entry({documents:[doc({path:'originals/page.jpg',name:'Page.jpeg'})]}))).contracts[0].documents[0].name,'Page.jpeg');
  for(const name of ['original.html','original','../original.pdf','folder/original.pdf','folder\\original.pdf','.','..','.hidden.pdf','original\u0000.pdf','original\n.pdf','original.png'])assert.throws(()=>parseContractManifest(manifest(entry({documents:[doc({name})]}))),undefined,name);
  assert.throws(()=>parseContractManifest(manifest(entry({documents:[doc({path:'originals/page.png',name:'Page.webp'})]}))));
});
test('transport cannot import local keys, native attachments or arbitrary cloud references',()=>{
  for(const patch of [{key:'family-secret'},{cloudPath:'other-family/private.pdf'},{attachments:[{key:'private'}]},{documents:[{...doc(),cloudPath:'secret'}]},{contract:{cloudPath:'secret'}},{contract:{provenance:[{field:'notice',documentId:null,pages:[],passage:'',key:'secret'}]}}])assert.throws(()=>parseContractManifest(manifest(entry(patch))),/champ|clé|autorisé|inconnu/i);
  assert.throws(()=>parseContractManifest(JSON.parse('{"format":"dobby-contracts","version":1,"contracts":[{"id":"x","title":"X","__proto__":{"polluted":true}}]}')));assert.equal({}.polluted,undefined);
});
test('ZIP returns normalized metadata and actual original PDF bytes without writing or AI calls',async()=>{
  const original=pdf(),data=manifest(entry({documents:[doc()],contract:{provenance:[{field:'deadline',documentId:'original-1',pages:[1],passage:'28 février 2027'}]}})),parsed=await readContractZip(bundle(data,[{name:'originals/contrat.pdf',bytes:original,deflate:true}]),{inflate});
  assert.equal(parsed.manifest.contracts[0].title,'Entretien chaudière');assert.equal(parsed.files.size,1);assert.equal(parsed.files.get('originals/contrat.pdf').type,'application/pdf');assert.deepEqual(parsed.files.get('originals/contrat.pdf').bytes,original);assert.equal(inspectContractFile('original.pdf',original).type,'application/pdf');
});
test('ZIP source relationships are exact: missing, extra, duplicate and mismatched source bytes fail',async()=>{
  const withDoc=manifest(entry({documents:[doc()]}));
  for(const archive of [bundle(withDoc),bundle(manifest(),[{name:'originals/contrat.pdf',bytes:pdf()}]),bundle(withDoc,[{name:'originals/contrat.pdf',bytes:'<html>pretend PDF</html>'}]),bundle(withDoc,[{name:'originals/contrat.pdf',bytes:pdf()},{name:'originals/CONTRAT.pdf',bytes:pdf()}]),zip([{name:'contracts.json',bytes:JSON.stringify(manifest())},{name:'other.json',bytes:'{}'}])])await assert.rejects(readContractZip(archive));
  assert.throws(()=>inspectContractFile('wrong.png',pdf()));assert.throws(()=>inspectContractFile('original.pdf',encode('%PDF-1.4\ntruncated')));assert.throws(()=>inspectContractFile('script.svg',encode('<svg/>')));
});
test('ZIP rejects unsafe paths, symlinks, metadata disagreement, corrupted checksums and foreign bytes',async()=>{
  for(const name of ['../secret.pdf','/absolute.pdf','originals/a\\b.pdf','originals/a?.pdf','originals/\uff0e\uff0e/x.pdf','originals/.hidden.pdf'])await assert.rejects(readContractZip(bundle(manifest(),[{name,bytes:pdf()}])));
  await assert.rejects(readContractZip(bundle(manifest(),[{name:'originals/link.pdf',bytes:pdf(),attributes:0xa0000000}])));
  const mismatch=bundle(manifest());mismatch[30]^=1;await assert.rejects(readContractZip(mismatch));
  const corrupt=bundle(manifest());corrupt[30+encode('contracts.json').length]^=1;await assert.rejects(readContractZip(corrupt),/CRC|empreinte/i);
  const foreign=new Uint8Array(bundle(manifest()).length+1);foreign.set(bundle(manifest()));await assert.rejects(readContractZip(foreign));
});
test('ZIP bounds are checked before inflation or allocating declared file sizes',async()=>{
  let inflated=0;const bounded={inflate:()=>{inflated++;throw Error('must not inflate');}};
  await assert.rejects(readContractZip(bundle(manifest(),[{name:'originals/large.pdf',bytes:pdf(),deflate:true,size:CONTRACT_ZIP_LIMITS.fileBytes+1}]),bounded),/volumineux|limite/i);
  await assert.rejects(readContractZip(zip([{name:'contracts.json',bytes:encode(' '.repeat(100_000)),deflate:true}]),bounded),/compression|expansion/i);
  await assert.rejects(readContractZip(zip(Array.from({length:CONTRACT_ZIP_LIMITS.entries+1},(_,i)=>({name:'f'+i+'.pdf',bytes:new Uint8Array()}))),bounded),/fichiers|limite/i);assert.equal(inflated,0);
  await assert.rejects(readContractZip(new Uint8Array(CONTRACT_ZIP_LIMITS.archiveBytes+1)),/volumineu|limite/i);
});
test('deflate uses native streams and rejects or cancels output beyond its announced size',async()=>{
  const original=pdf(),archive=zip([{name:'contracts.json',bytes:JSON.stringify(manifest(entry({documents:[doc()]}))),deflate:true},{name:'originals/contrat.pdf',bytes:original,deflate:true}]);
  const parsed=await readContractZip(archive);assert.deepEqual(parsed.files.get('originals/contrat.pdf').bytes,original);
  await assert.rejects(readContractZip(archive,{inflate:(_bytes,size)=>new Uint8Array(size+1)}),/dépasse|taille/i);
  let cancelled=0;await assert.rejects(readContractZip(archive,{inflate:(_bytes,size)=>new ReadableStream({start(controller){controller.enqueue(new Uint8Array(size+1));},cancel(){cancelled++;}})}),/dépasse|taille/i);assert.equal(cancelled,1);
});
test('JSON size and batch limits are enforced, while JSON-only source absence remains explicit',()=>{
  assert.throws(()=>parseContractManifest(' '.repeat(2*1024*1024+1)),/JSON.*volumineux/i);
  assert.throws(()=>parseContractManifest({format:'dobby-contracts',version:1,contracts:Array.from({length:151},(_,i)=>({id:'c'+i,title:'Contrat'}))}),/150/);
  const parsed=parseContractManifest(manifest(entry({contract:{provenance:[{field:'notice',documentId:null,pages:[4],passage:'Trois mois.'}],uncertainties:['Document original non disponible.']}})));assert.equal(parsed.contracts[0].contract.provenance[0].documentId,null);assert.deepEqual(parsed.contracts[0].documents,[]);
});
test('raster signatures and declared dimensions are checked before decoding',()=>{
  const png=new Uint8Array(33),view=new DataView(png.buffer);png.set([137,80,78,71,13,10,26,10]);view.setUint32(8,13);png.set(encode('IHDR'),12);view.setUint32(16,1);view.setUint32(20,1);assert.equal(inspectContractFile('page.png',png).type,'image/png');view.setUint32(16,16001);assert.throws(()=>inspectContractFile('page.png',png),/grande|pixels/i);
});
test('external prompt gives exact cumulative schema and an honest downloadable ZIP/JSON fallback',()=>{
  for(const pattern of [/J'ai terminé/,/dobby-contracts/,/"version":1/,/contracts\.json/,/originals\//,/documentId/,/pages/,/passage/,/uncertainties/,/avenant/i,/null/,/ne.*invent/i,/ZIP.*réel/s,/JSON seul/,/aucun.*automatique/i])assert.match(externalPrompt,pattern);
});
