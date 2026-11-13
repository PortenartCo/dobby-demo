import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {deflateRawSync, inflateRawSync} from 'node:zlib';
import {parseEquipmentManifest, safeEquipmentPath, EQUIPMENT_FORMAT_LIMITS} from '../equipment-import-format.mjs';
import {readEquipmentZip, inspectEquipmentFile, EQUIPMENT_ZIP_LIMITS} from '../equipment-import-zip.mjs';

const encode=value=>new TextEncoder().encode(value);
const equipment=(patch={})=>({importKey:'boiler-1',name:'Chaudière fictive',category:null,brand:null,model:null,serialNumber:null,manufacturerReference:null,place:null,purchase:{date:null,amount:null,currency:null,seller:null,invoiceReference:null},warranty:{endDate:null,details:null},maintenancePlans:[],documents:[],sources:[],notes:null,missing:[],uncertain:[],...patch});
const manifest=(...items)=>({format:'dobby-equipment',version:1,equipment:items.length?items:[equipment()]});
const plan=(patch={})=>({importKey:'inspection-1',title:'Inspection',interval:{value:12,unit:'months'},lastKnownDate:null,nextDateOverride:null,overrideReason:null,usualProvider:null,notes:null,sourceRefs:[],...patch});
const source=(patch={})=>({id:'invoice-1',origin:'user_invoice',title:'Facture fictive',path:'documents/invoice.pdf',url:null,page:1,retrievedAt:null,note:null,...patch});
const document=(patch={})=>({id:'manual-1',kind:'manual',title:'Notice',path:null,url:'https://manufacturer.example/manual',official:true,sourceRefs:[],...patch});
const pdf=()=>encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}return(crc^0xffffffff)>>>0;}
function zip(files){
  const locals=[],centrals=[];let offset=0;
  for(const file of files){const name=encode(file.name),bytes=typeof file.bytes==='string'?encode(file.bytes):file.bytes,packed=file.deflate?deflateRawSync(bytes):bytes,checksum=crc32(bytes),size=file.size??bytes.length,local=new Uint8Array(30+name.length+packed.length),l=new DataView(local.buffer);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(8,file.deflate?8:0,true);l.setUint32(14,checksum,true);l.setUint32(18,packed.length,true);l.setUint32(22,size,true);l.setUint16(26,name.length,true);local.set(name,30);local.set(packed,30+name.length);const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(10,file.deflate?8:0,true);c.setUint32(16,checksum,true);c.setUint32(20,packed.length,true);c.setUint32(24,size,true);c.setUint16(28,name.length,true);c.setUint32(38,file.attributes??0,true);c.setUint32(42,offset,true);central.set(name,46);locals.push(local);centrals.push(central);offset+=local.length;}
  const out=new Uint8Array(offset+centrals.reduce((n,file)=>n+file.length,0)+22);let at=0;for(const file of [...locals,...centrals]){out.set(file,at);at+=file.length;}const end=new DataView(out.buffer,at,22);end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,at-offset,true);end.setUint32(16,offset,true);return out;
}
const bundle=(value,files=[])=>zip([{name:'equipments.json',bytes:JSON.stringify(value)},...files]);
const inflate=bytes=>new Uint8Array(inflateRawSync(bytes));
function centralStart(bytes){return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(bytes.length-6,true);}

// Removing normalization would invent values or lose documented zero/unknown facts.
test('manifest preserves unknowns and zero, normalizes all documented fields and 0..N plans',()=>{
  const parsed=parseEquipmentManifest(JSON.stringify(manifest(equipment({purchase:{date:'2024-02-29',amount:0,currency:'EUR',seller:'Marchand',invoiceReference:'A-01'},serialNumber:'SN 42/7',manufacturerReference:'REF/1',documents:[document()]}))));
  assert.equal(parsed.format,'dobby-equipment');assert.equal(parsed.equipment[0].purchase.amount,0);assert.equal(parsed.equipment[0].purchase.date,'2024-02-29');assert.equal(parsed.equipment[0].brand,null);assert.equal(parsed.equipment[0].serialNumber,'SN 42/7');assert.equal(parsed.equipment[0].documents[0].path,null);assert.deepEqual(parsed.equipment[0].maintenancePlans,[]);
  const partial=parseEquipmentManifest(manifest({importKey:'unknown',name:'Appareil'})).equipment[0];assert.equal(partial.notes,null);assert.equal(partial.purchase.currency,null);assert.deepEqual(partial.sources,[]);
  const multiple=parseEquipmentManifest(manifest(equipment({maintenancePlans:[plan(),plan({importKey:'filter',title:'Filtre',interval:null})]}))).equipment[0];assert.equal(multiple.maintenancePlans.length,2);assert.deepEqual(multiple.maintenancePlans[1].interval,{value:null,unit:null});assert.match(multiple.uncertain.join(' '),/Inspection.*À vérifier/u);assert.match(multiple.uncertain.join(' '),/Filtre.*À vérifier/u);
});
test('the supplied original example remains compatible without inventing history',async()=>{
  const raw=await readFile(new URL('../../docs/dobby-v7/maison/examples/equipments.json',import.meta.url),'utf8'),parsed=parseEquipmentManifest(raw).equipment[0];assert.equal(parsed.name,'TEST - Chaudière de démonstration');assert.equal(parsed.maintenancePlans.length,2);assert.equal(parsed.maintenancePlans[1].interval.value,36);assert.equal(parsed.maintenancePlans[0].lastKnownDate,null);assert.ok(parsed.uncertain.length>=3);assert.equal('history' in parsed,false);
});
test('malformed JSON, wrong format/version, unexpected native storage keys and duplicate identifiers fail',()=>{
  for(const value of ['{',null,[],{},manifest({...equipment(),name:''}),{...manifest(),format:'dobby-contracts'},{...manifest(),version:'1'},{...manifest(),version:2},{...manifest(),equipment:[]},manifest(equipment(),equipment()),manifest(equipment({cloudPath:'private'})),manifest(equipment({purchase:{amount:2,key:'secret'}})),JSON.parse('{"format":"dobby-equipment","version":1,"equipment":[{"importKey":"x","name":"X","__proto__":{"polluted":true}}]}')])assert.throws(()=>parseEquipmentManifest(value));
  assert.equal({}.polluted,undefined);
  for(const importKey of ['',null,'../secret','clé avec espace','a/b','a'.repeat(121)])assert.throws(()=>parseEquipmentManifest(manifest(equipment({importKey}))));
  for(const patch of [{maintenancePlans:[plan(),plan()]},{sources:[source(),source()]},{documents:[document(),document()]},{maintenancePlans:[plan({sourceRefs:['no-such-source']})]},{documents:[document({sourceRefs:['no-such-source']})]}])assert.throws(()=>parseEquipmentManifest(manifest(equipment(patch))));
});
test('strict dates, finite nonnegative amounts, currency, booleans and integer intervals refuse coercions',()=>{
  for(const date of ['2027-02-29','1900-02-29','2026-13-01','2026-00-01','0000-01-01','2026-04-31','2026-1-01','2026-01-01T00:00:00Z',''])assert.throws(()=>parseEquipmentManifest(manifest(equipment({purchase:{date}}))));
  assert.equal(parseEquipmentManifest(manifest(equipment({warranty:{endDate:'2000-02-29'}}))).equipment[0].warranty.endDate,'2000-02-29');
  for(const amount of [-1,NaN,Infinity,true,'2'])assert.throws(()=>parseEquipmentManifest(manifest(equipment({purchase:{amount}}))));
  for(const currency of ['eur','EURO','ZZZ',3])assert.throws(()=>parseEquipmentManifest(manifest(equipment({purchase:{currency}}))));
  for(const interval of [{value:0,unit:'months'},{value:1.5,unit:'years'},{value:-1,unit:'years'},{value:12,unit:'days'},{value:12},{value:'12',unit:'months'}])assert.throws(()=>parseEquipmentManifest(manifest(equipment({maintenancePlans:[plan({interval})]}))));
  for(const patch of [{official:'yes'},{official:0},{kind:'script'},{url:'javascript:alert(1)'},{url:'data:text/html,x'},{url:'file:///etc/passwd'},{url:'https://user:password@example.com/manual'},{path:null,url:null}])assert.throws(()=>parseEquipmentManifest(manifest(equipment({documents:[document(patch)]}))));
  for(const patch of [{page:0},{page:1.2},{retrievedAt:'2026-02-30'},{origin:'invented'}])assert.throws(()=>parseEquipmentManifest(manifest(equipment({sources:[source(patch)]}))));
});
test('sources are scoped to their equipment; real references suppress only the corresponding uncertainty',()=>{
  const parsed=parseEquipmentManifest(manifest(equipment({sources:[source({path:null,url:'https://maker.example/model',origin:'manufacturer'})],documents:[document({sourceRefs:['invoice-1']})],maintenancePlans:[plan({sourceRefs:['invoice-1'],lastKnownDate:'2026-01-01'})]}))).equipment[0];assert.deepEqual(parsed.maintenancePlans[0].sourceRefs,['invoice-1']);assert.deepEqual(parsed.uncertain,[]);assert.equal(parsed.maintenancePlans[0].lastKnownDate,'2026-01-01');
  assert.throws(()=>parseEquipmentManifest(manifest(equipment({sources:[source()]}),equipment({importKey:'other',maintenancePlans:[plan({sourceRefs:['invoice-1']})]}))));
  assert.throws(()=>parseEquipmentManifest(manifest(equipment({sources:[source()],documents:[document({sourceRefs:['invoice-1','invoice-1']})]}))));
});
test('canonical paths reject traversal, encodings, invisible names and Windows special files',()=>{
  assert.equal(safeEquipmentPath('documents/Cafe\u0301.pdf'),'documents/Café.pdf');
  for(const path of ['../a.pdf','/a.pdf','documents/../a.pdf','documents//a.pdf','documents/a\\b.pdf','documents/%2e%2e/a.pdf','documents/.hidden.pdf','documents/a?.pdf','documents/a#.pdf','documents/a:.pdf','documents/\u202ea.pdf','documents/\uff0e\uff0e/a.pdf','documents/CON.pdf','documents/a./x.pdf',' documents/a.pdf','documents/a.pdf '])assert.throws(()=>safeEquipmentPath(path),undefined,path);
  for(const path of ['originals/a.pdf','a.pdf','documents/a.svg','documents/'])assert.throws(()=>parseEquipmentManifest(manifest(equipment({sources:[source({path})]}))));
});
test('stored and deflated ZIP return checked PDF bytes; source-only shared originals and URL-only documents work',async()=>{
  const original=pdf(),data=manifest(equipment({documents:[document()],sources:[source()],maintenancePlans:[plan({sourceRefs:['invoice-1']})]}),equipment({importKey:'boiler-2',sources:[source()]}));
  for(const deflate of [false,true]){const parsed=await readEquipmentZip(zip([{name:'equipments.json',bytes:JSON.stringify(data),deflate},{name:'documents/',bytes:new Uint8Array()},{name:'documents/invoice.pdf',bytes:original,deflate}]),{inflate});assert.equal(parsed.manifest.equipment.length,2);assert.equal(parsed.files.size,1);assert.equal(parsed.files.get('documents/invoice.pdf').type,'application/pdf');assert.deepEqual(parsed.files.get('documents/invoice.pdf').bytes,original);}
  assert.equal((await readEquipmentZip(bundle(manifest(equipment({documents:[document()]}))))).files.size,0);
});
test('missing, unused, duplicate, fake and wrong-root binary documents are refused',async()=>{
  for(const archive of [bundle(manifest(equipment({sources:[source()]}))),bundle(manifest(),[{name:'documents/invoice.pdf',bytes:pdf()}]),bundle(manifest(equipment({documents:[document({path:'documents/invoice.pdf',url:null})]}))),bundle(manifest(equipment({sources:[source()]})),[{name:'documents/invoice.pdf',bytes:encode('<html>Fake PDF</html>')}]),bundle(manifest(equipment({sources:[source()]})),[{name:'documents/invoice.pdf',bytes:pdf()},{name:'documents/INVOICE.pdf',bytes:pdf()}]),zip([{name:'contracts.json',bytes:'{}'}]),zip([{name:'EQUIPMENTS.JSON',bytes:JSON.stringify(manifest())}]),zip([{name:'equipments.json',bytes:JSON.stringify(manifest())},{name:'other.json',bytes:'{}'}])])await assert.rejects(readEquipmentZip(archive));
});
test('hostile ZIP paths, symlinks, encryption, metadata disagreement, CRC and trailing bytes fail',async()=>{
  for(const name of ['../a.pdf','/a.pdf','documents/a\\b.pdf','documents/a?.pdf','documents/.a.pdf','documents/a.svg','documents/\u202ea.pdf'])await assert.rejects(readEquipmentZip(bundle(manifest(),[{name,bytes:pdf()}])));
  for(const attributes of [0xa0000000,0x10000000,0x2,0x4])await assert.rejects(readEquipmentZip(bundle(manifest(),[{name:'documents/link.pdf',bytes:pdf(),attributes}])));
  const wrongName=bundle(manifest());wrongName[30]^=1;await assert.rejects(readEquipmentZip(wrongName),/concordent/i);
  const corrupt=bundle(manifest());corrupt[30+encode('equipments.json').length]^=1;await assert.rejects(readEquipmentZip(corrupt),/CRC|empreinte/i);
  const mismatch=bundle(manifest()),m=new DataView(mismatch.buffer);m.setUint32(22,m.getUint32(22,true)+1,true);await assert.rejects(readEquipmentZip(mismatch),/incohérent/i);
  const encrypted=bundle(manifest()),e=new DataView(encrypted.buffer);e.setUint16(6,0x801,true);e.setUint16(centralStart(encrypted)+8,0x801,true);await assert.rejects(readEquipmentZip(encrypted),/chiffré|compression/i);
  const foreign=new Uint8Array(bundle(manifest()).length+1);foreign.set(bundle(manifest()));await assert.rejects(readEquipmentZip(foreign));
  await assert.rejects(readEquipmentZip(bundle(manifest()).subarray(0,20)));await assert.rejects(readEquipmentZip(new Uint8Array([80,75])));
});
test('all transport limits reject oversized declarations and bombs before decompression',async()=>{
  let inflated=0;const options={inflate:()=>{inflated++;throw Error('unexpected inflation');}};
  await assert.rejects(readEquipmentZip(bundle(manifest(),[{name:'documents/large.pdf',bytes:pdf(),size:EQUIPMENT_ZIP_LIMITS.fileBytes+1,deflate:true}]),options),/volumineu/i);
  await assert.rejects(readEquipmentZip(zip([{name:'equipments.json',bytes:' '.repeat(100000),deflate:true}]),options),/compression|expansion/i);
  await assert.rejects(readEquipmentZip(zip(Array.from({length:EQUIPMENT_ZIP_LIMITS.entries+1},(_,i)=>({name:'documents/'+i+'.pdf',bytes:pdf()}))),options),/200|fichiers/i);
  await assert.rejects(readEquipmentZip(new Uint8Array(EQUIPMENT_ZIP_LIMITS.archiveBytes+1)),/volumineu/i);assert.equal(inflated,0);
  assert.throws(()=>parseEquipmentManifest(' '.repeat(EQUIPMENT_FORMAT_LIMITS.jsonBytes+1)),/JSON.*volumineux/i);
  assert.throws(()=>parseEquipmentManifest(manifest(...Array.from({length:EQUIPMENT_FORMAT_LIMITS.equipment+1},(_,i)=>equipment({importKey:'e'+i})))),/150/);
  assert.throws(()=>parseEquipmentManifest(manifest(equipment({documents:Array.from({length:21},(_,i)=>document({id:'d'+i}))}))),/20/);
});
test('deflate streams work and stop on output beyond the declared size',async()=>{
  const archive=zip([{name:'equipments.json',bytes:JSON.stringify(manifest()),deflate:true}]);assert.equal((await readEquipmentZip(archive)).manifest.equipment[0].name,'Chaudière fictive');
  await assert.rejects(readEquipmentZip(archive,{inflate:(_bytes,size)=>new Uint8Array(size+1)}),/dépasse|taille/i);
  let cancelled=0;await assert.rejects(readEquipmentZip(archive,{inflate:(_bytes,size)=>new ReadableStream({start(controller){controller.enqueue(new Uint8Array(size+1));},cancel(){cancelled++;}})}),/dépasse|taille/i);assert.equal(cancelled,1);
});
test('PDF, PNG, JPEG and WebP signatures/dimensions are verified and other types cannot masquerade as allowed files',()=>{
  assert.equal(inspectEquipmentFile('a.pdf',pdf()).type,'application/pdf');
  const png=new Uint8Array(33),p=new DataView(png.buffer);png.set([137,80,78,71,13,10,26,10]);p.setUint32(8,13);png.set(encode('IHDR'),12);p.setUint32(16,1);p.setUint32(20,1);assert.equal(inspectEquipmentFile('a.png',png).type,'image/png');p.setUint32(16,16001);assert.throws(()=>inspectEquipmentFile('a.png',png),/grande|pixels/i);
  const jpeg=new Uint8Array([255,216,255,192,0,11,8,0,1,0,1,1,1,17,0,255,217]);assert.equal(inspectEquipmentFile('a.jpeg',jpeg).type,'image/jpeg');
  const webp=new Uint8Array(26),w=new DataView(webp.buffer);webp.set(encode('RIFF'));w.setUint32(4,18,true);webp.set(encode('WEBPVP8L'),8);w.setUint32(16,5,true);webp[20]=0x2f;assert.equal(inspectEquipmentFile('a.webp',webp).type,'image/webp');
  for(const [name,bytes] of [['a.svg',encode('<svg/>')],['a.exe',pdf()],['a.html',pdf()],['a.png',pdf()],['a.jpg',encode('not a JPEG')],['a.pdf',encode('%PDF-1.4\ntruncated')],['a.gif',encode('GIF89a')],['a.pdf',new Uint8Array()]])assert.throws(()=>inspectEquipmentFile(name,bytes));
  const animated=new Uint8Array(30),a=new DataView(animated.buffer);animated.set(encode('RIFF'));a.setUint32(4,22,true);animated.set(encode('WEBPVP8X'),8);a.setUint32(16,10,true);animated[20]=2;assert.throws(()=>inspectEquipmentFile('animated.webp',animated),/animé/i);
});

test('empty provenance records cannot make an unsourced plan appear verified',()=>{
  const parsed=parseEquipmentManifest(manifest(equipment({sources:[source({path:null,url:null,title:null,note:null,origin:'unknown'})],maintenancePlans:[plan({sourceRefs:['invoice-1']})]}))).equipment[0];
  assert.match(parsed.uncertain.join(' '),/Inspection.*À vérifier/u);
});
test('duplicate local document paths are refused while one original can justify several sources',()=>{
  assert.throws(()=>parseEquipmentManifest(manifest(equipment({documents:[document({path:'documents/a.pdf'}),document({id:'doc-2',path:'documents/A.pdf'})]}))),/doublon/i);
  assert.equal(parseEquipmentManifest(manifest(equipment({sources:[source(),source({id:'source-2'})]}))).equipment[0].sources.length,2);
});

test('ZIP catches normalized duplicates, file/directory collisions and overlaps before extracting bytes',async()=>{
  for(const files of [[{name:'documents/Café.pdf',bytes:pdf()},{name:'documents/Cafe\u0301.pdf',bytes:pdf()}],[{name:'documents/a.pdf',bytes:pdf()},{name:'documents/a.pdf/x.pdf',bytes:pdf()}],[{name:'documents/a/x.pdf',bytes:pdf()},{name:'documents/A/y.pdf',bytes:pdf()}]])await assert.rejects(readEquipmentZip(bundle(manifest(),files)),/doublon|même chemin|casse|dossier/i);
  const overlap=bundle(manifest(),[{name:'documents/invoice.pdf',bytes:pdf()}]),v=new DataView(overlap.buffer),second=centralStart(overlap)+46+encode('equipments.json').length;v.setUint32(second+42,0,true);await assert.rejects(readEquipmentZip(overlap),/concordent|incohérent|Chevauchement/i);
  const zip64=bundle(manifest()),z=new DataView(zip64.buffer);z.setUint32(zip64.length-6,0xffffffff,true);await assert.rejects(readEquipmentZip(zip64),/ZIP64/);
});
test('total expanded bytes are bounded before inflation and bad UTF-8 JSON is refused',async()=>{
  let calls=0;const files=Array.from({length:9},(_,i)=>({name:'documents/large'+i+'.pdf',bytes:new Uint8Array(105000),size:EQUIPMENT_ZIP_LIMITS.fileBytes}));await assert.rejects(readEquipmentZip(bundle(manifest(),files),{inflate:()=>{calls++;}}),/80 Mo|décompressé.*volumineux/i);assert.equal(calls,0);
  await assert.rejects(readEquipmentZip(zip([{name:'equipments.json',bytes:new Uint8Array([0xff,0xfe])}])),/UTF-8/);
});
test('normalization is idempotent and leaves the input untouched',()=>{
  const input=manifest(equipment({maintenancePlans:[plan()]})),before=JSON.stringify(input),parsed=parseEquipmentManifest(input);assert.equal(JSON.stringify(input),before);assert.deepEqual(parseEquipmentManifest(parsed),parsed);
});

test('a BOM hidden in a ZIP filename cannot masquerade as the root manifest',async()=>{
  await assert.rejects(readEquipmentZip(zip([{name:'\ufeffequipments.json',bytes:JSON.stringify(manifest())}])));
});
test('automatic uncertainty cannot produce a manifest that fails its own list bounds',()=>{
  assert.throws(()=>parseEquipmentManifest(manifest(equipment({maintenancePlans:[plan()],uncertain:Array.from({length:100},(_,i)=>'Question '+i)}))),/Incertitudes|100/);
});
