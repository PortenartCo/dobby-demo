/* E09: fictional demonstration only. Real account and network remain disabled. */
window.DobbyReviewConfig=Object.freeze({
 version:'E09',storagePrefix:'dobby-review-e09-20261112|',demoMemberId:'e09-demo-member',label:'Démo E09',
 info:'Aperçu E09 autonome : Salon des Curiosités et mémos familiaux. Données fictives isolées sur cet appareil ; compte réel et réseau externe désactivés. Le partage utilise le module Famille dans l’application et a été testé entre deux clients simulés ; cet aperçu reste local/en attente. Les trois sous-pages restent à revoir en détail.',
 styles:'body.fa-active>header[data-e01-chrome]{top:44px!important}',
 initialState(day){return{demoInitialized:true,day,planned:{},customRecipes:[],extras:[],shopFinal:null,shopHistory:{},shopChoice:{},familyMembers:[{id:'e09-demo-member',name:'DÉMO — Membre du foyer',avatar:'👤'}],familyEvents:[],sharedFamilyNotes:[{id:'e09-demo-memo',title:'DÉMO — Pense-bête du foyer',body:'Exemple fictif : préparer les affaires pour la sortie familiale.',tags:'démo, famille'}],familyNotes:[{id:'e09-demo-local',title:'DÉMO — Ancien mémo local',body:'Exemple fictif conservé localement. L’import familial nécessite une action explicite.',tags:'démo, historique'}],manualMissions:[],autoTasks:[],runeCredits:[],runeRequests:[],familyDocs:[],houseItems:[],famContacts:[],famLists:[],famHealth:[],sharedHealthVisits:[]};}
});
