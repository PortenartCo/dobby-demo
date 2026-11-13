/* Valid local PDF and ZIP bytes for browser acceptance. */
const {deflateRawSync}=require('node:zlib');
const encode=value=>new TextEncoder().encode(value);
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

module.exports={pdf,zip};
