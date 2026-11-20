import {inspectRecipeImage} from './recipe-import-zip.mjs';

export const storedRecipeImageLimit=128*1024;
export const recipeImageProfiles=Object.freeze({
 cover:Object.freeze({edge:960,target:45*1024}),
 step:Object.freeze({edge:768,target:30*1024})
});

export async function optimizeRecipeImage(encode,role='step'){
 const profile=recipeImageProfiles[role];
 if(!profile)throw Error('Usage de l’image inconnu.');
 // Prefer the original aspect ratio and a readable size over reaching a target.
 // The lower quality/size are considered only when the preceding output is large.
 let smallest;
 for(const [edge,quality] of [[profile.edge,0.82],[profile.edge,0.72],[profile.edge,0.64],[Math.round(profile.edge*5/6),0.64]]){
  const bytes=await encode(edge,quality);
  const {width,height}=inspectRecipeImage('optimized.webp',bytes);
  if(Math.max(width,height)>edge)throw Error('Dimensions du WebP optimisé incohérentes.');
  if(!smallest||bytes.byteLength<smallest.bytes.byteLength)smallest={bytes,width,height};
  if(bytes.byteLength<=profile.target)return {...smallest,type:'image/webp',target:profile.target};
 }
 if(smallest.bytes.byteLength>storedRecipeImageLimit)throw Error('Image WebP supérieure à 128 Kio au niveau de lisibilité minimal. Préparez une image plus simple ou mieux cadrée.');
 return {...smallest,type:'image/webp',target:profile.target};
}

export async function compressRecipeImageInBrowser(input,type,role){
 const blob=new Blob([input],{type});
 let image,sourceURL;
 try{
  if(typeof createImageBitmap==='function')image=await createImageBitmap(blob);
  else{
   sourceURL=URL.createObjectURL(blob);
   image=new Image();
   image.src=sourceURL;
   await image.decode();
  }
  const width=image.naturalWidth??image.width,height=image.naturalHeight??image.height;
  if(!width||!height||width>16000||height>16000||width*height>40_000_000)throw Error('Dimensions de l’image non autorisées.');
  const canvas=document.createElement('canvas');
  return await optimizeRecipeImage(async (edge,quality)=>{
   const scale=Math.min(1,edge/Math.max(width,height));
   canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
   const context=canvas.getContext('2d',{alpha:false});
   if(!context)throw Error('Optimisation d’image indisponible.');
   context.fillStyle='#fff';
   context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(image,0,0,canvas.width,canvas.height);
   const output=await new Promise(done=>canvas.toBlob(done,'image/webp',quality));
   if(output?.type!=='image/webp')throw Error('Encodage WebP indisponible dans ce navigateur.');
   return new Uint8Array(await output.arrayBuffer());
  },role);
 }finally{
  image?.close?.();
  if(sourceURL)URL.revokeObjectURL(sourceURL);
 }
}
