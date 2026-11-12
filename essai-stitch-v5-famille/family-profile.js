/* E05 identity catalogue and validation only. No persistence, accounts or rewards. */
window.DobbyMagicIdentity=(()=>{'use strict';
 const freeze=rows=>Object.freeze(rows.map(Object.freeze));
 const houses=freeze([
 {id:'gryffindor',name:'Gryffondor',animal:'Lion',primary:'#f1bf65',accent:'#a23c3e',surface:'#2c1516'},
 {id:'slytherin',name:'Serpentard',animal:'Serpent',primary:'#d2e4d7',accent:'#67ad8e',surface:'#10281f'},
 {id:'ravenclaw',name:'Serdaigle',animal:'Aigle',primary:'#e8c798',accent:'#78a9d7',surface:'#142239'},
 {id:'hufflepuff',name:'Poufsouffle',animal:'Blaireau',primary:'#f5d270',accent:'#c69a43',surface:'#292316'}]);
 const patronuses=freeze([['stag','Cerf'],['otter','Loutre'],['fox','Renard'],['wolf','Loup'],['cat','Chat'],['owl','Hibou'],['horse','Cheval'],['hare','Lièvre'],['swan','Cygne'],['lynx','Lynx'],['badger','Blaireau'],['dolphin','Dauphin']].map(([id,name],index)=>({id,name,index,available:true,asset:'../essai-stitch-v7/assets/magic/patronuses.png'})));
 const avatars=freeze(Array.from({length:24},(_,number)=>{const index=number<8?number:number-8;return{id:'portrait-'+(number+1),name:'Portrait '+(number+1),index,available:true,asset:number<8?'../essai-stitch-v7/assets/magic/avatars.png':'../essai-stitch-v7/assets/magic/portraits-09-24.png',...(number<8?{}:{sprite:Object.freeze({columns:4,rows:4,column:index%4,row:Math.floor(index/4)})})};}));
 function patch(member,values){
  const result={...member},fields=[['magicHouseId','houseId',houses,'Maison'],['magicPatronusId','patronusId',patronuses,'Patronus'],['magicAvatarId','avatarId',avatars,'Avatar']];
  for(const [field,key]of [['profileFirstName','firstName'],['profileLastName','lastName']])if(Object.hasOwn(values,field)){const value=values[field];if(typeof value!=='string'||value.length>80)throw Error('Identité invalide.');result[key]=value.trim();}
  if(!fields.some(([name])=>Object.hasOwn(values,name))&&!['magicHouseAlgorithm','magicPatronusAlgorithm','magicCeremony'].some(name=>Object.hasOwn(values,name)))return result;
  const prior=member.magicProfile;if(prior!==undefined&&(!prior||typeof prior!=='object'||Array.isArray(prior)||prior.version!==1))throw Error('Version du profil magique incompatible. Les données restent conservées.');
  const profile={...prior,version:1};
  for(const [name,key,rows,label]of fields)if(Object.hasOwn(values,name)){const value=values[name];if(typeof value!=='string'||value!==''&&!rows.some(x=>x.id===value))throw Error(label+' invalide.');profile[key]=value;}
  for(const [field,idField,key]of [['magicHouseAlgorithm','magicHouseId','houseAlgorithmVersion'],['magicPatronusAlgorithm','magicPatronusId','patronusAlgorithmVersion']]){
   const source=key.replace('AlgorithmVersion','SelectionSource');
   if(Object.hasOwn(values,idField)){delete profile[key];if(values[idField])profile[source]='manual';else delete profile[source];}
   if(Object.hasOwn(values,field)){if(!values[idField]||values[field]!=='e06-v1')throw Error('Version ou résultat confirmé invalide.');profile[key]=values[field];profile[source]='calculated';}
  }
  if(Object.hasOwn(values,'magicCeremony')){if(!['complete','deferred'].includes(values.magicCeremony))throw Error('État de cérémonie invalide.');profile.ceremonyStatus=values.magicCeremony;}
  result.magicProfile=profile;return result;
 }
 // Only the server-bound ID may resolve a connected account's own profile.
 const linkedMember=(members,context)=>context?.identityVerified===true&&typeof context.memberId==='string'?members.find(member=>member.id===context.memberId)||null:null;
 const isCeremonyComplete=member=>houses.some(row=>row.id===member?.magicProfile?.houseId)&&patronuses.some(row=>row.id===member?.magicProfile?.patronusId);
 return Object.freeze({houses,patronuses,avatars,patch,linkedMember,isCeremonyComplete});
})();
