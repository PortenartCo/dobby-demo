/* E07.3 isolated review only: explicit fictional recipes, no backend settings. */
window.DobbyReviewConfig=Object.freeze({
 version:'E07.3',storagePrefix:'dobby-review-e073-20261111|',demoMemberId:'review-person',label:'Démo E07.3',
 info:'Aperçu E07.3 fictif et isolé : Taverne, calendrier, catalogue, favoris et import manuel ou JSON/ZIP préparé avec votre IA. Aucun compte réel, aucune IA appelée par DOBBY. Les photos importées restent sur cet appareil ; leur partage familial n’est pas raccordé. Les sous-pages détaillées restent à examiner. Les autres aperçus sont indépendants.',
 styles:'body.e06-active>header{top:44px!important}',
 initialState(day){
  const recipes=[{id:'e073-demo-soup',name:'DÉMO — Soupe du potager',emoji:'🥣',minutes:25,servings:2,category:'Végétarien',fav:true,ingredients:[['Carottes',300,'g'],['Pommes de terre',200,'g'],['Sel',null,'']],steps:['Laver et couper les légumes.','Cuire dans une casserole puis mixer.'],source:'Recette fictive pour la revue E07.3',reviewed:false},{id:'e073-demo-gratin',name:'DÉMO — Gratin familial',emoji:'🍲',minutes:45,servings:4,category:'Végétarien',fav:false,ingredients:[['Pommes de terre',800,'g'],['Crème',200,'ml']],steps:['Couper les pommes de terre et les placer dans un plat.','Ajouter la crème puis cuire au four en surveillant la cuisson.'],source:'Recette fictive pour la revue E07.3',reviewed:false}];
  return {demoInitialized:true,day,planned:{[day+'-midi']:{id:recipes[0].id,adult:2,children:0,status:'prévu'},[day+'-soir']:{id:recipes[1].id,adult:2,children:2,childFactor:.65,status:'prévu'}},customRecipes:recipes,extras:['DÉMO — Pain du marché'],shopFinal:null,shopHistory:{},shopChoice:{},familyMembers:[{id:'review-person',name:'DÉMO — Membre du foyer',avatar:'👤'}],manualMissions:[],autoTasks:[],runeCredits:[],runeRequests:[],familyDocs:[],houseItems:[],familyEvents:[],familyNotes:[],famContacts:[],famHealth:[],sharedHealthVisits:[]};
 }
});
