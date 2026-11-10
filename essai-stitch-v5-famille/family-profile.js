/* E05 identity catalogue and validation only. No persistence, accounts or rewards. */
window.DobbyMagicIdentity=(()=>{'use strict';
 const freeze=rows=>Object.freeze(rows.map(Object.freeze));
 const houses=freeze([
 {id:'gryffindor',name:'Gryffondor',animal:'Lion',primary:'#f1bf65',accent:'#a23c3e',surface:'#2c1516'},
 {id:'slytherin',name:'Serpentard',animal:'Serpent',primary:'#d2e4d7',accent:'#67ad8e',surface:'#10281f'},
 {id:'ravenclaw',name:'Serdaigle',animal:'Aigle',primary:'#e8c798',accent:'#78a9d7',surface:'#142239'},
 {id:'hufflepuff',name:'Poufsouffle',animal:'Blaireau',primary:'#f5d270',accent:'#c69a43',surface:'#292316'}]);
 const patronuses=freeze([['stag','Cerf'],['otter','Loutre'],['fox','Renard'],['wolf','Loup'],['cat','Chat'],['owl','Hibou'],['horse','Cheval'],['hare','Lièvre'],['swan','Cygne'],['lynx','Lynx'],['badger','Blaireau'],['dolphin','Dauphin']].map(([id,name],index)=>({id,name,index,available:false,asset:null})));
 const avatars=freeze(Array.from({length:8},(_,index)=>({id:'portrait-'+(index+1),name:'Portrait '+(index+1),index,available:false,asset:null})));
 function patch(member,values){
  const result={...member},fields=[['magicHouseId','houseId',houses,'Maison'],['magicPatronusId','patronusId',patronuses,'Patronus'],['magicAvatarId','avatarId',avatars,'Avatar']];
  if(!fields.some(([name])=>Object.hasOwn(values,name)))return result;
  const prior=member.magicProfile;if(prior!==undefined&&(!prior||typeof prior!=='object'||Array.isArray(prior)||prior.version!==1))throw Error('Version du profil magique incompatible. Les données restent conservées.');
  const profile={...prior,version:1};
  for(const [name,key,rows,label]of fields)if(Object.hasOwn(values,name)){const value=values[name];if(typeof value!=='string'||value!==''&&!rows.some(x=>x.id===value))throw Error(label+' invalide.');profile[key]=value;}
  result.magicProfile=profile;return result;
 }
 // The native model has no trustworthy account/member association yet. Do not
 // infer it from names, email, member order or a locally selected profile.
 const linkedMember=()=>null;
 return Object.freeze({houses,patronuses,avatars,patch,linkedMember});
})();
