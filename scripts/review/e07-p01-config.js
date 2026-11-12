/* E07-P01 isolated preview: the same two explicit E07.4 demo recipes, no backend. */
window.DobbyReviewConfig=Object.freeze({
 version:'E07-P01',storagePrefix:'dobby-review-e07-p01-20261112|',demoMemberId:'review-person',label:'Démo E07-P01',
 info:'Aperçu E07-P01 fictif et isolé : choix des repas et calendrier du foyer. Aucun compte réel ni appel IA par DOBBY. Le catalogue de référence et Préparer la liste de courses restent réservés à des missions distinctes. Les autres aperçus sont indépendants.',
 styles:'body.e06-active>header{top:44px!important}',
 initialState(day){
  const recipes=[{id:'e074-demo-soup',name:'DÉMO — Soupe du potager',emoji:'🥣',minutes:25,servings:2,category:'Végétarien',fav:true,ingredients:[['Carottes',300,'g'],['Pommes de terre',200,'g'],['Sel',null,'']],steps:['Laver et couper les légumes.','Cuire dans une casserole puis mixer.'],source:'Recette fictive pour la revue E07.4',reviewed:false},{id:'e074-demo-gratin',name:'DÉMO — Gratin familial',emoji:'🍲',minutes:45,servings:4,category:'Végétarien',fav:false,ingredients:[['Pommes de terre',800,'g'],['Crème',200,'ml']],steps:['Couper les pommes de terre et les placer dans un plat.','Ajouter la crème puis cuire au four en surveillant la cuisson.'],source:'Recette fictive pour la revue E07.4',reviewed:false}];
  return {demoInitialized:true,day,planned:{[day+'-midi']:{id:recipes[0].id,adult:2,children:0,status:'prévu'},[day+'-soir']:{id:recipes[1].id,adult:2,children:2,childFactor:.65,status:'prévu'}},customRecipes:recipes,extras:['DÉMO — Pain du marché'],shopFinal:null,shopHistory:{},shopChoice:{},familyMembers:[{id:'review-person',name:'DÉMO — Membre du foyer',avatar:'👤'}],manualMissions:[],autoTasks:[],runeCredits:[],runeRequests:[],familyDocs:[],houseItems:[],familyEvents:[],familyNotes:[],famContacts:[],famHealth:[],sharedHealthVisits:[]};
 }
});
