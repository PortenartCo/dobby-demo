/* Bounded, local-only ZIP reader for contracts and their original documents.
   No extraction onto a filesystem, persistence, uploads or AI requests. */
import {parseContractManifest, safeContractPath} from './contracts-import-format.mjs';
export {safeContractPath};
export const CONTRACT_ZIP_LIMITS=Object.freeze({
  archiveBytes:40*1024*1024,
  totalBytes:80*1024*1024,
  fileBytes:10*1024*1024,
  jsonBytes:2*1024*1024,
  entries:200,
  expansionRatio:100,
  pixels:40_000_000,
  dimension:16000
});

const utf8=new TextDecoder('utf-8',{fatal:true});
function reject(code,message){const error=new Error(message);error.name='ContractZipError';error.code=code;throw error;}
function bytesOf(value){
  if(value instanceof Uint8Array)return value;
  if(value instanceof ArrayBuffer)return new Uint8Array(value);
  reject('INVALID_ZIP','Le fichier ZIP ne contient pas des données binaires reconnues.');
}

function extraFields(data,start,length){
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength),end=start+length;
  let at=start;
  while(at<end){
    if(at+4>end)reject('INVALID_ZIP','Champ supplémentaire ZIP tronqué.');
    const tag=view.getUint16(at,true),size=view.getUint16(at+2,true);at+=4;
    if(at+size>end)reject('INVALID_ZIP','Champ supplémentaire ZIP incohérent.');
    if([0x0001,0x7075,0x9901].includes(tag)){
      reject('UNSUPPORTED_ZIP','ZIP64, noms alternatifs et archives chiffrées ne sont pas pris en charge.');
    }
    at+=size;
  }
}

let crcTable;
function crc32(data){
  crcTable||=Uint32Array.from({length:256},(_,value)=>{let c=value;for(let bit=0;bit<8;bit++)c=c&1?(c>>>1)^0xedb88320:c>>>1;return c>>>0;});
  let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);
  return(crc^0xffffffff)>>>0;
}

async function boundedInflate(compressed,expected,inflate){
  let source;
  try{
    if(inflate){source=await inflate(compressed,expected);}
    else{
      if(typeof DecompressionStream!=='function')reject('UNSUPPORTED_ZIP','Ce navigateur ne peut pas décompresser ce ZIP. Importez le JSON seul.');
      source=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    }
  }catch(error){
    if(error?.code)throw error;
    reject('UNSUPPORTED_ZIP','Décompression ZIP indisponible ou contenu compressé invalide. Importez le JSON seul.');
  }
  if(source instanceof Uint8Array||source instanceof ArrayBuffer){
    const bytes=bytesOf(source);if(bytes.length>expected)reject('LIMIT','Le contenu décompressé dépasse la taille annoncée.');return bytes;
  }
  if(!source?.getReader)reject('INVALID_ZIP','Décompresseur ZIP incompatible.');
  const reader=source.getReader(),chunks=[];let total=0;
  try{
    for(;;){
      const{done,value}=await reader.read();if(done)break;
      const chunk=bytesOf(value);total+=chunk.byteLength;
      if(total>expected){await reader.cancel().catch(()=>{});reject('LIMIT','Le contenu décompressé dépasse la taille annoncée.');}
      chunks.push(chunk);
    }
  }catch(error){
    await reader.cancel().catch(()=>{});
    if(error?.code)throw error;
    reject('INVALID_ZIP','Le contenu compressé ZIP est endommagé.');
  }finally{reader.releaseLock();}
  const output=new Uint8Array(total);let at=0;
  for(const chunk of chunks){output.set(chunk,at);at+=chunk.length;}
  return output;
}

function checkDimensions(width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0){
    reject('IMAGE_DIMENSIONS','Les dimensions de cette image ne peuvent pas être vérifiées.');
  }
  if(width>CONTRACT_ZIP_LIMITS.dimension||height>CONTRACT_ZIP_LIMITS.dimension||width*height>CONTRACT_ZIP_LIMITS.pixels){
    reject('LIMIT','Image trop grande : maximum 40 mégapixels et 16 000 pixels par côté.');
  }
  return{width,height};
}

/* Read dimension headers before any bitmap allocation. This deliberately does
   not replace the caller's full image decode before persistence. */
function imageDimensions(type,data){
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  if(type==='image/png'){
    if(data.length<33||view.getUint32(8)!==13||String.fromCharCode(...data.subarray(12,16))!=='IHDR'){
      reject('IMAGE_DIMENSIONS','En-tête PNG incomplet ou dimensions non vérifiables.');
    }
    return checkDimensions(view.getUint32(16),view.getUint32(20));
  }
  if(type==='image/jpeg'){
    let at=2;
    const startOfFrame=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
    while(at<data.length){
      if(data[at++]!==0xff)break;
      while(at<data.length&&data[at]===0xff)at++;
      if(at>=data.length)break;
      const marker=data[at++];
      if(marker===0xda||marker===0xd9||marker===0xd8||marker===0)break;
      if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
      if(at+2>data.length)break;
      const length=view.getUint16(at);
      if(length<2||at+length>data.length)break;
      if(startOfFrame.has(marker)){
        if(length<8)break;
        return checkDimensions(view.getUint16(at+5),view.getUint16(at+3));
      }
      at+=length;
    }
    reject('IMAGE_DIMENSIONS','En-tête JPEG incomplet ou dimensions non vérifiables.');
  }
  if(type==='image/webp'){
    if(view.getUint32(4,true)!==data.length-8)reject('IMAGE_DIMENSIONS','Taille du conteneur WebP incohérente.');
    let at=12,canvas=null,frame=null;
    while(at+8<=data.length){
      const kind=String.fromCharCode(...data.subarray(at,at+4)),size=view.getUint32(at+4,true),body=at+8,end=body+size;
      if(end>data.length||end+(size&1)>data.length)reject('IMAGE_DIMENSIONS','En-tête WebP tronqué.');
      if(kind==='VP8X'){
        if(canvas||size!==10)reject('IMAGE_DIMENSIONS','En-tête WebP étendu incohérent.');
        if(data[body]&2)reject('UNSUPPORTED_FILE','Les images WebP animées ne sont pas prises en charge.');
        const u24=pos=>data[pos]|(data[pos+1]<<8)|(data[pos+2]<<16);
        canvas=checkDimensions(u24(body+4)+1,u24(body+7)+1);
      }else if(kind==='VP8L'){
        if(frame||size<5||data[body]!==0x2f)reject('IMAGE_DIMENSIONS','En-tête WebP sans perte incohérent.');
        const bits=view.getUint32(body+1,true);
        if(bits>>>29)reject('IMAGE_DIMENSIONS','Version WebP sans perte non vérifiable.');
        frame=checkDimensions((bits&0x3fff)+1,((bits>>>14)&0x3fff)+1);
      }else if(kind==='VP8 '){
        if(frame||size<10||(data[body]&1)||data[body+3]!==0x9d||data[body+4]!==1||data[body+5]!==0x2a){
          reject('IMAGE_DIMENSIONS','En-tête WebP avec perte incohérent.');
        }
        frame=checkDimensions(view.getUint16(body+6,true)&0x3fff,view.getUint16(body+8,true)&0x3fff);
      }else if(kind==='ANIM'||kind==='ANMF')reject('UNSUPPORTED_FILE','Les images WebP animées ne sont pas prises en charge.');
      at=end+(size&1);
    }
    if(at!==data.length||!frame||(canvas&&(canvas.width!==frame.width||canvas.height!==frame.height))){
      reject('IMAGE_DIMENSIONS','Les dimensions réelles de cette image WebP ne peuvent pas être vérifiées.');
    }
    return frame;
  }
}

function imageType(name,data){
  const ext=name.split('.').at(-1).toLowerCase();
  const png=data.length>=8&&[137,80,78,71,13,10,26,10].every((value,i)=>data[i]===value);
  const jpeg=data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255;
  const webp=data.length>=12&&String.fromCharCode(...data.subarray(0,4))==='RIFF'&&String.fromCharCode(...data.subarray(8,12))==='WEBP';
  const type=ext==='png'&&png?'image/png':['jpg','jpeg'].includes(ext)&&jpeg?'image/jpeg':ext==='webp'&&webp?'image/webp':null;
  if(type){imageDimensions(type,data);return type;}
  reject('IMAGE_TYPE','Le contenu d’une image ne correspond pas à un fichier JPEG, PNG ou WebP autorisé.');
}

function pdfType(name,data){
  const header=new TextDecoder('ascii').decode(data.subarray(0,9));
  const tail=new TextDecoder('ascii').decode(data.subarray(Math.max(0,data.length-1024)));
  if(!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n ]/u.test(header)||!/%%EOF[\t\n\r ]*$/u.test(tail)){
    reject('FILE_TYPE','Le document PDF est tronqué ou sa signature ne correspond pas au type annoncé.');
  }
  return 'application/pdf';
}

export function inspectContractFile(name,input){
  const data=bytesOf(input);
  if(typeof name!=='string'||!data.length)reject('FILE_TYPE','Nom ou contenu de document invalide.');
  if(data.length>CONTRACT_ZIP_LIMITS.fileBytes)reject('LIMIT','Document trop volumineux : 10 Mo maximum.');
  return {type:/\.pdf$/iu.test(name)?pdfType(name,data):imageType(name,data)};
}

export async function readContractZip(input,{inflate}={}){
  const data=bytesOf(input),limit=CONTRACT_ZIP_LIMITS;
  if(data.length>limit.archiveBytes)reject('LIMIT','Archive trop volumineuse : 40 Mo maximum.');
  if(data.length<22)reject('INVALID_ZIP','Archive ZIP tronquée ou invalide.');
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength),u16=at=>view.getUint16(at,true),u32=at=>view.getUint32(at,true);
  let end=-1;
  for(let at=data.length-22;at>=Math.max(0,data.length-22-65535);at--){
    if(u32(at)===0x06054b50&&at+22+u16(at+20)===data.length){end=at;break;}
  }
  if(end<0)reject('INVALID_ZIP','Fin d’archive ZIP absente ou données ajoutées non reconnues.');
  const count=u16(end+10),centralSize=u32(end+12),centralStart=u32(end+16);
  if(u16(end+4)||u16(end+6)||u16(end+8)!==count||count===0xffff||centralSize===0xffffffff||centralStart===0xffffffff){
    reject('UNSUPPORTED_ZIP','Les ZIP multiparties et ZIP64 ne sont pas pris en charge.');
  }
  if(count>limit.entries)reject('LIMIT','Maximum 200 fichiers et dossiers dans une archive.');
  if(centralStart+centralSize!==end||centralStart>end)reject('INVALID_ZIP','Répertoire central ZIP incohérent.');
  const entries=[],seen=new Set(),prefixes=new Map();let at=centralStart,total=0;
  for(let i=0;i<count;i++){
    if(at+46>end||u32(at)!==0x02014b50)reject('INVALID_ZIP','Répertoire central ZIP tronqué.');
    const required=u16(at+6),flags=u16(at+8),method=u16(at+10),checksum=u32(at+16),compressedSize=u32(at+20),size=u32(at+24),nameLength=u16(at+28),extraLength=u16(at+30),commentLength=u16(at+32),disk=u16(at+34),attributes=u32(at+38),offset=u32(at+42),next=at+46+nameLength+extraLength+commentLength;
    if(next>end||!nameLength)reject('INVALID_ZIP','Nom de fichier ZIP tronqué ou manquant.');
    if(required<10||required>20||flags&~0x080e||![0,8].includes(method)||disk||[compressedSize,size,offset].includes(0xffffffff)){
      reject('UNSUPPORTED_ZIP','Format ZIP chiffré, compression ou version non pris en charge.');
    }
    if(method===0&&(flags&6))reject('UNSUPPORTED_ZIP','Options ZIP incompatibles avec un fichier non compressé.');
    let rawName;
    try{rawName=utf8.decode(data.subarray(at+46,at+46+nameLength));}catch{reject('UNSAFE_PATH','Les noms des fichiers ZIP doivent utiliser UTF-8.');}
    const name=safeContractPath(rawName),directory=name.endsWith('/'),key=name.replace(/\/$/,'').toLowerCase();
    if(seen.has(key))reject('DUPLICATE_PATH','Deux fichiers ou dossiers de l’archive portent le même chemin.');
    seen.add(key);
    const parts=name.replace(/\/$/,'').split('/');
    for(let j=1;j<=parts.length;j++){
      const prefix=parts.slice(0,j).join('/'),lower=prefix.toLowerCase(),prior=prefixes.get(lower);
      if(prior&&prior!==prefix)reject('DUPLICATE_PATH','Des chemins de l’archive diffèrent seulement par la casse.');
      prefixes.set(lower,prefix);
    }
    const mode=(attributes>>>16)&0xf000,dos=attributes&0xffff;
    if((dos&6)||(mode&&mode!==(directory?0x4000:0x8000))||(!directory&&(dos&0x10))){
      reject('UNSUPPORTED_FILE','Lien symbolique, fichier spécial, caché ou système non autorisé.');
    }
    if(directory&&(size!==0||checksum!==0))reject('INVALID_ZIP','Un dossier ZIP contient des données inattendues.');
    const ext=name.split('.').at(-1).toLowerCase();
    if(!directory&&name!=='contracts.json'&&!/^originals\/.+\.(pdf|png|jpe?g|webp)$/iu.test(name))reject('UNSUPPORTED_FILE','Le ZIP doit contenir contracts.json à la racine et des PDF, JPEG, PNG ou WebP dans originals/.');
    if(directory&&name!=='originals/'&&!name.startsWith('originals/'))reject('UNSUPPORTED_FILE','Seuls les dossiers originals/ sont autorisés.');
    if(!directory&&size>(ext==='json'?limit.jsonBytes:limit.fileBytes))reject('LIMIT',ext==='json'?'JSON trop volumineux : 2 Mo maximum.':'Document trop volumineux : 10 Mo maximum.');
    if(size>Math.max(1024,compressedSize*limit.expansionRatio))reject('LIMIT','Taux de compression excessif : expansion maximale 100:1.');
    total+=size;if(total>limit.totalBytes)reject('LIMIT','Contenu décompressé trop volumineux : 80 Mo maximum.');
    extraFields(data,at+46+nameLength,extraLength);
    entries.push({name,rawName,directory,required,flags,method,checksum,compressedSize,size,offset,time:u16(at+12),date:u16(at+14)});at=next;
  }
  if(at!==end)reject('INVALID_ZIP','Données inattendues après le répertoire central ZIP.');
  if(entries.filter(entry=>!entry.directory&&entry.name.toLowerCase().endsWith('.json')).length!==1){
    reject('JSON_COUNT','Le ZIP doit contenir exactement un fichier JSON descriptif.');
  }
  const filePaths=new Set(entries.filter(entry=>!entry.directory).map(entry=>entry.name.toLowerCase()));
  for(const entry of entries){const parts=entry.name.replace(/\/$/,'').split('/');for(let j=1;j<parts.length;j++)if(filePaths.has(parts.slice(0,j).join('/').toLowerCase()))reject('DUPLICATE_PATH','Un chemin de fichier est également utilisé comme dossier.');}
  const regions=[];
  for(const entry of entries){
    const start=entry.offset;
    if(start+30>centralStart||u32(start)!==0x04034b50)reject('INVALID_ZIP','En-tête de fichier ZIP absent ou mal placé.');
    const nameLength=u16(start+26),extraLength=u16(start+28),body=start+30+nameLength+extraLength;
    if(body>centralStart||body+entry.compressedSize>centralStart||u16(start+4)!==entry.required||u16(start+6)!==entry.flags||u16(start+8)!==entry.method||u16(start+10)!==entry.time||u16(start+12)!==entry.date){
      reject('INVALID_ZIP','Les métadonnées locales et centrales du ZIP ne concordent pas.');
    }
    let localName;try{localName=utf8.decode(data.subarray(start+30,start+30+nameLength));}catch{reject('UNSAFE_PATH','Nom local ZIP illisible.');}
    if(localName!==entry.rawName)reject('INVALID_ZIP','Les noms locaux et centraux du ZIP ne concordent pas.');
    extraFields(data,start+30+nameLength,extraLength);
    const descriptor=!!(entry.flags&8),localCrc=u32(start+14),localCompressed=u32(start+18),localSize=u32(start+22);
    if(descriptor){
      if((localCrc&&localCrc!==entry.checksum)||(localCompressed&&localCompressed!==entry.compressedSize)||(localSize&&localSize!==entry.size))reject('INVALID_ZIP','Tailles locales ZIP incohérentes.');
    }else if(localCrc!==entry.checksum||localCompressed!==entry.compressedSize||localSize!==entry.size){reject('INVALID_ZIP','Tailles ou empreintes locales ZIP incohérentes.');}
    let finish=body+entry.compressedSize;
    if(descriptor){
      const signed=finish+16<=centralStart&&u32(finish)===0x08074b50&&u32(finish+4)===entry.checksum&&u32(finish+8)===entry.compressedSize&&u32(finish+12)===entry.size;
      const unsigned=finish+12<=centralStart&&u32(finish)===entry.checksum&&u32(finish+4)===entry.compressedSize&&u32(finish+8)===entry.size;
      if(!signed&&!unsigned)reject('INVALID_ZIP','Descripteur de données ZIP absent ou incohérent.');
      finish+=signed?16:12;
    }
    regions.push({start,finish});entry.body=body;
  }
  regions.sort((a,b)=>a.start-b.start);let cursor=0;
  for(const region of regions){if(region.start!==cursor)reject('INVALID_ZIP','Chevauchement ou données étrangères dans l’archive ZIP.');cursor=region.finish;}
  if(cursor!==centralStart)reject('INVALID_ZIP','Données étrangères avant le répertoire central ZIP.');
  const files=new Map();let jsonText='';
  for(const entry of entries){
    const compressed=data.subarray(entry.body,entry.body+entry.compressedSize);
    let output;
    if(entry.method===0){if(entry.compressedSize!==entry.size)reject('INVALID_ZIP','Taille d’un fichier ZIP non compressé incohérente.');output=compressed.slice();}
    else output=await boundedInflate(compressed,entry.size,inflate);
    if(output.length!==entry.size)reject('INVALID_ZIP','La taille réelle décompressée ne correspond pas au ZIP.');
    if(crc32(output)!==entry.checksum)reject('CRC_MISMATCH','Une empreinte CRC du ZIP est incorrecte ; fichier endommagé.');
    if(entry.directory)continue;
    if(entry.name.toLowerCase().endsWith('.json')){
      try{jsonText=utf8.decode(output).replace(/^\ufeff/,'');}catch{reject('INVALID_JSON','Le JSON doit être enregistré en UTF-8.');}

    }else files.set(entry.name,{bytes:output,...inspectContractFile(entry.name,output),name:entry.name.split('/').at(-1),size:output.length});
  }
  const manifest=parseContractManifest(jsonText),referenced=new Set();
  for(const contract of manifest.contracts)for(const document of contract.documents){
    if(!files.has(document.path))reject('MISSING_SOURCE','Un document source référencé est absent du ZIP : '+document.path);
    referenced.add(document.path);
  }
  for(const path of files.keys())if(!referenced.has(path))reject('UNREFERENCED_SOURCE','Un document du ZIP n’est associé à aucun contrat : '+path);
  return{manifest,files};
}
