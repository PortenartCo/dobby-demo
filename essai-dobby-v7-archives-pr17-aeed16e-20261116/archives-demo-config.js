/* Fictional seed only. Archive actions remain the unmodified PR17 native writers. */
(()=>{'use strict';const base=window.DobbyReviewConfig;
 if(!base?.storagePrefix.startsWith('dobby-review-v7-archives-pr17-aeed16e-20261116|'))throw Error('Isolated Archives namespace required.');
 window.DobbyReviewConfig=Object.freeze({...base,version:'V7-ARCHIVES-PR17',
  label:'Archives PR17 · données fictives',reviewEntry:null,
  info:'Aperçu isolé de la PR17, source aeed16e. Fiches entièrement fictives et stockage propre à cet aperçu. Depuis Menu, ouvrez Contrats, Maison ou les recettes personnelles pour archiver une fiche après confirmation ; consultez-la et réactivez-la depuis Archives. Réinitialiser restaure seulement cette démonstration. Aucun compte familial réel, serveur Supabase ou droit enfant étendu.',
  mount(){},
  initialState(day){const state=base.initialState(day),after=n=>{const date=new Date(day+'T12:00:00');date.setDate(date.getDate()+n);return date.toLocaleDateString('en-CA');},archive={version:1,archivedAt:after(-2)+'T08:00:00.000Z',updatedAt:after(-2)+'T08:00:00.000Z'};
   state.previewFixture='archives-pr17-aeed16e-20261116';state.manualMissions=[];state.runeCredits=[];state.runeRequests=[];state.runeSyncRequired=false;
   state.familyMembers[0].name='DÉMO — Camille Fictif';state.familyMembers[0].firstName='Camille Fictif';
   state.familyDocs=[
    {id:'demo-contract',title:'DÉMO — Contrat entretien',category:'Contrats',provider:'DÉMO — Atelier fictif',reference:'DEMO-PR17-001',date:day,deadline:after(30),note:'Fiche fictive à archiver puis réactiver. Archiver ne résilie pas ce contrat.',contract:{version:1,type:'maintenance',scope:'equipment',equipmentIds:['demo-equipment']}},
    {id:'demo-insurance',title:'DÉMO — Assurance fictive',category:'Assurances',provider:'DÉMO — Assureur fictif',reference:'DEMO-PR17-002',deadline:after(60),note:'Aucune police réelle ni donnée familiale.'},
    {id:'demo-document',title:'DÉMO — Notice archivée',category:'Autre',note:'Document fictif sans pièce jointe. Utilisez Réactiver pour retrouver cette même fiche.',archive:{...archive}}
   ];
   state.houseItems=[{id:'demo-equipment',name:'DÉMO — Chaudière fictive',category:'Chauffage',place:'Atelier fictif',serialNumber:'DEMO-PR17-001',notes:'Équipement fictif ; ses programmes et son historique sont conservés par l’archivage.',maintenancePlans:[{id:'demo-plan-a',title:'Entretien fictif annuel',interval:{value:12,unit:'months'},lastKnownDate:after(-20)},{id:'demo-plan-b',title:'Contrôle fictif',interval:{value:2,unit:'years'},lastKnownDate:after(-10)}]},{id:'demo-archived-equipment',name:'DÉMO — Lampe archivée',category:'Éclairage',place:'Bureau fictif',archive:{...archive}}];
   state.houseLogs=[{id:'demo-log',itemId:'demo-equipment',planId:'demo-plan-a',date:after(-20),note:'DÉMO — Entretien fictif conservé',type:'Entretien fictif',performed:true}];state.houseDocs=[];
   state.famContacts=[{id:'demo-contact',name:'DÉMO — Artisan fictif',role:'Prestataire fictif',email:'artisan@example.test',phone:'',note:'Contact de démonstration uniquement.'}];
   state.familyNotes=[{id:'demo-note',title:'DÉMO — Mémo du Logis',body:'Mémo fictif à consulter et archiver ; aucun contenu familial réel.',tags:'démo'}];state.sharedFamilyNotes=[];
   return state;
  }
 });
})();
