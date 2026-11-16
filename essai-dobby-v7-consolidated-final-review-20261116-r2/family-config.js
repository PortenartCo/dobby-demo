/* Family-only fictional fixtures, composed before the unchanged review runtime. */
(()=>{'use strict';
 const base=window.DobbyReviewConfig;
 if(!base||typeof base.initialState!=='function'||!base.storagePrefix.startsWith('dobby-review-v7-consolidated-candidate-fb0a5a360d3dca87d5f26b4f90d0b1d616182648|'))throw Error('Family review requires its isolated global configuration first.');
 window.DobbyReviewConfig=Object.freeze({...base,
  version:'V7-CONSOLIDATED-CANDIDATE',label:'Aperçu intégré · données fictives · '+(base.demoMemberId==='review-person-b'?'B':'A'),
  info:"Candidat intégré Archives + Contacts + Notes + Paramètres ; quatre sources présentes, aucune promotion générale ni déploiement applicatif. Deux clients fictifs A/B partagent uniquement la simulation de cet aperçu dans le même navigateur ; aucun compte réel, serveur distant, invitation réelle, migration SQL ou appel IA payant. Le contexte canonique fictif utilise le contrat natif dobby_v7_context ; ses permissions restent contrôlées par les modules natifs et ne prouvent aucune autorisation serveur réelle. La recette familiale réelle reste différée.",
  initialState(day){
   const state=base.initialState(day);
   state.familyMembers=[
    {id:'review-person',name:'DÉMO — Camille Fictif',firstName:'DÉMO — Camille',lastName:'Fictif',memberCategory:'parent',avatar:'🧙',magicProfile:{version:1,houseId:'hufflepuff',patronusId:'otter',avatarId:'portrait-3'}},
    {id:'review-person-b',name:'DÉMO — Alex Fictif',firstName:'DÉMO — Alex',lastName:'Fictif',memberCategory:'parent',avatar:'🦊',magicProfile:{version:1,houseId:'ravenclaw',patronusId:'lynx',avatarId:'portrait-2'}},
    {id:'review-baby',name:'DÉMO — Émile Fictif',firstName:'DÉMO — Émile',lastName:'Fictif',memberCategory:'baby',birthdate:'2026-02-04',avatar:'👶',notes:'DÉMO — Fiche bébé fictive.'},
    {id:'review-child',name:'DÉMO — Louise Fictif',firstName:'DÉMO — Louise',lastName:'Fictif',memberCategory:'child',birthdate:'2018-04-22',nickname:'Petite étoile fictive',avatar:'👤',notes:'DÉMO — Aime observer les étoiles.',magicProfile:{version:1,houseId:'ravenclaw',patronusId:'fox',avatarId:'portrait-4'}},
    {id:'review-pet',name:'DÉMO — Plume',firstName:'DÉMO — Plume',memberCategory:'pet',species:'Chat fictif',birthdate:'2020-05-01',avatar:'🐈',notes:'DÉMO — Animal fictif du Logis.'}
   ];
   state.sharedFamilyNotes=[{id:'review-notes-stitch23',title:'DÉMO — Préparer la soirée en famille',body:'Prévoir les jeux, les couvertures et une boisson chaude.\nLe carnet des idées se trouve dans le salon.',tags:'famille, soirée, idées'}];
   return state;
  }
 });
})();
