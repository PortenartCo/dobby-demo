/* Family-only fictional fixtures, composed before the unchanged review runtime. */
(()=>{'use strict';
 const base=window.DobbyReviewConfig;
 if(!base||typeof base.initialState!=='function'||!base.storagePrefix.startsWith('dobby-review-v7-cours-14h-20261112|'))throw Error('Family review requires its isolated global configuration first.');
 window.DobbyReviewConfig=Object.freeze({...base,
  version:'V7-MENU',label:'DOBBY V7 · Menu · foyer fictif · '+(base.demoMemberId==='review-person-b'?'B':'A'),
  info:'Revue Menu ; foyer fictif : deux parents, un bébé, un enfant et un animal. Les écrans et writers sont natifs ; les droits parentaux sont limités à cette démonstration. Les portraits, Maisons et Patronus préremplis sont des exemples E05 fictifs. A et B partagent uniquement le backend simulé de cet essai dans ce navigateur. Aucun compte réel, aucune association serveur, invitation réelle, migration SQL ni appel IA payant.',
  initialState(day){
   const state=base.initialState(day);
   state.familyMembers=[
    {id:'review-person',name:'DÉMO — Camille Fictif',firstName:'DÉMO — Camille',lastName:'Fictif',memberCategory:'parent',avatar:'🧙',magicProfile:{version:1,houseId:'hufflepuff',patronusId:'otter',avatarId:'portrait-3'}},
    {id:'review-person-b',name:'DÉMO — Alex Fictif',firstName:'DÉMO — Alex',lastName:'Fictif',memberCategory:'parent',avatar:'🦊',magicProfile:{version:1,houseId:'ravenclaw',patronusId:'lynx',avatarId:'portrait-2'}},
    {id:'review-baby',name:'DÉMO — Émile Fictif',firstName:'DÉMO — Émile',lastName:'Fictif',memberCategory:'baby',birthdate:'2026-02-04',avatar:'👶',notes:'DÉMO — Fiche bébé fictive.'},
    {id:'review-child',name:'DÉMO — Louise Fictif',firstName:'DÉMO — Louise',lastName:'Fictif',memberCategory:'child',birthdate:'2018-04-22',nickname:'Petite étoile fictive',avatar:'👤',notes:'DÉMO — Aime observer les étoiles.',magicProfile:{version:1,houseId:'ravenclaw',patronusId:'fox',avatarId:'portrait-4'}},
    {id:'review-pet',name:'DÉMO — Plume',firstName:'DÉMO — Plume',memberCategory:'pet',species:'Chat fictif',birthdate:'2020-05-01',avatar:'🐈',notes:'DÉMO — Animal fictif du Logis.'}
   ];
   return state;
  }
 });
})();
