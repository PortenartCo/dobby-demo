import {spawn} from 'node:child_process';
import {optimizeRecipeImage} from './recipe-media.mjs';

const decoder={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'};

export function compressCatalogueImage(input,type,role){
 return optimizeRecipeImage((edge,quality)=>new Promise((resolve,reject)=>{
  const tool=spawn(process.env.DOBBY_IMAGE_CONVERT||'convert',[
   '-limit','memory','384MiB','-limit','map','512MiB','-limit','disk','0',
   decoder[type]+':-','-auto-orient','-resize',edge+'x'+edge+'>',
   '-background','white','-alpha','remove','-alpha','off','-strip',
   '-quality',String(Math.round(quality*100)),'webp:-'
  ],{stdio:['pipe','pipe','pipe'],timeout:15000});
  const chunks=[];
  let bytes=0,failed=false;
  tool.on('error',()=>reject(Error('Encodeur local ImageMagick avec WebP indisponible.')));
  tool.stdin.on('error',()=>{ /* The exit status reports a refused input. */ });
  tool.stderr.resume();
  tool.stdout.on('data',chunk=>{
   bytes+=chunk.length;
   if(bytes>2*1024*1024){failed=true;tool.kill();}
   else chunks.push(chunk);
  });
  tool.on('close',code=>{
   if(code!==0||failed||!bytes)reject(Error('Décodage ou conversion WebP impossible dans les limites autorisées.'));
   else resolve(Buffer.concat(chunks,bytes));
  });
  tool.stdin.end(input);
 }),role);
}
