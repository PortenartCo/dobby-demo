/* Fictitious acceptance directory; shared runtime isolates storage and network. */
window.DobbyReviewConfig=Object.freeze({
 version:'CONTACTS-STITCH24',storagePrefix:'dobby-review-v7-contacts-stitch24-20261116|',demoMemberId:'contacts-demo-parent',label:'Contacts · Stitch 24',
 info:'Recette Contacts : données fictives et stockage propre à cet aperçu. Aucun compte réel ni connexion Supabase. Créez, consultez, modifiez et supprimez un contact ; les changements restent sur cet appareil. Archivage en attente du mécanisme natif de la PR #17, non fusionnée.',
 initialState(day){return{demoInitialized:true,day,planned:{},customRecipes:[],extras:[],shopFinal:null,shopHistory:{},shopChoice:{},familyMembers:[{id:'contacts-demo-parent',name:'Camille Démo',memberCategory:'parent',avatar:'👤'}],familyEvents:[],sharedFamilyNotes:[],familyNotes:[],manualMissions:[],autoTasks:[],runeCredits:[],runeRequests:[],familyDocs:[],houseItems:[],famLists:[],famHealth:[],sharedHealthVisits:[],famContacts:[
  {id:'contacts-demo-clinic',name:'DÉMO — Cabinet des Érables',category:'Santé',role:'Médecine familiale',phone:'+32 0 000 00 00',email:'cabinet@example.test',address:'12 rue Fictive\n1000 Ville Démo',note:'Exemple fictif. Accueil sur rendez-vous.'},
  {id:'contacts-demo-school',name:'DÉMO — École du Jardin',category:'École',role:'Secrétariat',phone:'',email:'ecole@example.test',address:'',note:'Coordonnées fictives pour tester le répertoire.'},
  {id:'contacts-demo-legacy',name:'DÉMO — Proche du foyer',role:'Proche',phone:'',email:'',note:'Exemple conservé dans l’ancien format à cinq champs.'}
 ]};}
});
