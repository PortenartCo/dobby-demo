/* Dobby Stitch V5: adaptation non destructive des quatre ecrans fournis.
   Le code fonctionnel d'origine s'execute avant celui-ci. Aucun stockage ni writer nouveau. */
(function(){
  'use strict';
  const images={
    missions:'https://lh3.googleusercontent.com/aida-public/AB6AXuBDXsXuZ2p3tNIWB3WSYinQYyHF5QweAKaXHozcfdpMspqdTzfCJuJYEkTGbsFYaolqrb6nf665cX38aBcX7IqnTxWEre6GV_3GgtV3TwdhUPEYGHbQXwJmTgy6p5DbFuGpjBlPBi_bTOAJUVa5Vv9Zr-_9-o0adJVqT3DPw1KIRJL2t79g8UR2S9b2gHF9I44QuBMP1-jVvLMfBtd--jv_0Nq3d002TnPfQ97dwgPk',
    meals:'https://lh3.googleusercontent.com/aida-public/AB6AXuBIvteT5Eb3pIkai-hg5r37oVZWGHpVSMUFEfSCQ1ouxyx4bkjcYFt_o9mBtuBFvM1PAqS8KYNRJHm1D35zvjzrvkrGsV-QcRFH5z2ZiLFtRcuxM8b5TUfdFrruzSPcVEFH0dHDIuw0AN4aWD-3ow_oA8D1t62TWVIqhIRoaB4wCbVBhli5ULluP4dspL2Xr_wCZg8n6d_oB1W-xdGEetMKKKqXY3OrgG3hoopC-Si6',
    family:'https://lh3.googleusercontent.com/aida-public/AB6AXuCwdrfKP8fXErVeDtitVL0iD7B82UvQM8NssjBHUEWq--Er5EC9-AMbtMDgcFQu6j9bagb8Cf0tyUGCZGfF0pVyzgb1dco57gI-b2Xj8IvDgduTav6EAswyXgzVpdz_6X_5myagKwFNkk5uxUJTIY3EK64Ss-GCzVxst7WQL9HA66PfPqZiX3-efTiFim5oB8M18vMyp4ZNnJcvropdkBVvbVG5QBEG5ENkegQ-Vmru'
  };
  function cover(id,top,seal,title,quote){
    return '<section class="st5-cover" aria-label="'+safe(title)+'">'
      +'<img src="'+images[id]+'" alt="" loading="eager" decoding="async">'
      +'<div class="st5-cover-top"><span class="st5-seal">'+top+'</span><span class="st5-seal">'+seal+'</span></div>'
      +'<div class="st5-cover-bottom"><span class="st5-kicker">✧ Dobby · Maison &amp; famille</span>'
      +'<h1>'+title+'</h1><p>'+quote+'</p></div></section>';
  }
  function heading(title,desc,button){
    return '<div class="st5-section-heading"><div><h2>'+title+'</h2>'+(desc?'<div class="st5-sub">'+desc+'</div>':'')+'</div>'+(button||'')+'</div>';
  }
  drawMissions=function(){
    const all=Array.isArray(st.autoTasks)?st.autoTasks:[];
    const active=all.filter(t=>t.state==='open').sort((a,b)=>String(a.due||'').localeCompare(String(b.due||'')));
    const done=all.filter(t=>t.state==='done').slice(-30).reverse();
    const recurring=active.filter(t=>t.recurrence||t.repeat||t.frequency);
    const tab=st.st5TaskTab||'open';
    const shown=tab==='done'?done:tab==='recurring'?recurring:active;
    const rows=shown.map(t=>'<label class="st5-task">'
      +'<input type="checkbox" data-autotask="'+safe(t.key)+'" '+(t.state==='done'?'checked disabled':'')+' aria-label="Terminer la mission">'
      +'<span><strong>'+safe(t.title)+'</strong><small>'+safe(t.sourceLabel||'Dobby')
      +' · '+safe(t.due||'Sans échéance')+(t.recurrence?' · Récurrent':'')+'</small></span></label>').join('');
    const people=(st.familyMembers||[]).slice(0,6).map(m=>
      '<button type="button" class="st5-member" data-extra="health"><span class="avatar">'+safe(m.avatar||'♡')+'</span>'+safe(m.name)+'</button>'
    ).join('');
    return '<div class="st5-view st5-missions">'
      +cover('missions','📜 GRIMOIRE DES MISSIONS','Plume enchantée','La Bibliothèque des Missions','« Chaque tâche est un petit sortilège d’ordre. Dobby veille à ce que rien ne soit oublié. »')
      +'<section class="st5-section">'+heading('Missions prioritaires',active.length+' mission(s) actives',
      '<button type="button" class="st5-outline" data-action="voice">✧ Parler à Dobby</button>')
      +'<div class="st5-card"><h3>Le registre de la maisonnée</h3>'
      +'<div class="st5-summary"><span>Missions à accomplir</span><strong>'+active.length+'</strong></div>'
      +'<p>Ce registre reprend vos tâches internes. Les rappels Apple restent séparés tant que leur connexion n’est pas effective.</p>'
      +'</div>'
      +'<div class="st5-tabs" role="group" aria-label="Filtrer les missions">'
      +'<button class="st5-tab '+(tab==='open'?'active':'')+'" data-st5-tasktab="open">Parchemins actifs ('+active.length+')</button>'
      +'<button class="st5-tab '+(tab==='recurring'?'active':'')+'" data-st5-tasktab="recurring">Rituels récurrents</button>'
      +'<button class="st5-tab '+(tab==='done'?'active':'')+'" data-st5-tasktab="done">Archives ('+done.length+')</button>'
      +'</div>'
      +(rows||'<div class="st5-empty">Aucune mission dans cette catégorie.</div>')
      +'</section>'
      +'<section class="st5-section">'+heading('Répartition de la maisonnée','Personnes enregistrées dans Dobby') 
      +(people?'<div class="st5-member-row">'+people+'</div>':'<div class="st5-empty">Les membres pourront être ajoutés dans la rubrique Famille et santé.</div>')
      +'<div class="st5-two"><button class="st5-outline" data-go="family">♡ Famille</button><button class="st5-outline" data-extra="lists">☑ Listes du foyer</button></div>'
      +'</section></div>';
  };
  const legacyPlan=st4PrevPlan;
  drawPlan=function(){
    const day=todayISO(),dinner=meal(day,'soir'),r=dinner?getR(dinner.id):null;
    const thumb=r&&typeof v21Icon==='function'?v21Icon(r):'';
    const dinnerImage=thumb?'<img src="'+safe(thumb)+'" alt="'+safe(r.name)+'">':'<span class="emoji">'+safe(r?.emoji||'🍽')+'</span>';
    const dayCard='<div class="st5-recipe-hero">'
      +'<div class="st5-dish-image">'+dinnerImage+'</div>'
      +'<div class="st5-dish-body"><div class="st5-kicker">♨ Le festin de ce soir</div>'
      +'<h3>'+(r?safe(r.name):'Aucun dîner prévu')+'</h3>'
      +'<div class="st5-meta">'+(r?safe(r.minutes+' min · '+countLabel(dinner)):'Préparez un menu dans le calendrier')+'</div>'
      +'<div class="st5-row" style="margin-top:13px">'
      +(r?'<button class="st5-solid" data-action="detail" data-id="'+safe(r.id)+'">Voir la recette</button>':'<button class="st5-solid" data-st5-action="dinner">Choisir un repas</button>')
      +'<button class="st5-outline" data-st5-action="dinner">Modifier ›</button></div></div></div>';
    const days=[0,1,2,3,4,5,6].map(n=>addDays(day,n));
    const week=days.map(d=>{
      const evening=meal(d,'soir'),mid=meal(d,'midi'),planned=evening?getR(evening.id):mid?getR(mid.id):null;
      return '<button type="button" data-caldate="'+safe(d)+'" class="st5-day '+(d===st.day?'selected':'')+'">'
        +'<b>'+safe(new Intl.DateTimeFormat('fr-BE',{weekday:'short',day:'numeric'}).format(parseDate(d)))+'</b>'
        +'<strong>'+(planned?safe(planned.name):'Repas à prévoir')+'</strong>'
        +'<small>'+(evening?'Dîner planifié':mid?'Midi planifié':'Aucun repas planifié')+'</small></button>';
    }).join('');
    const missing=summary().length+(Array.isArray(st.extras)?st.extras.length:0);
    return '<div class="st5-view st5-meals">'
      +cover('meals','♨ FOURNEAU ALLUMÉ','Le chaudron','L’Auberge & le Foyer Gourmand','« Le feu crépite et le chaudron mijote. Dobby vous accompagne pour organiser les repas. »')
      +'<section class="st5-section">'+heading('Le Festin de ce Soir','Le repas prévu dans votre planning',
      '<button class="st5-outline" data-go="recipes">♧ Grimoire</button>')+dayCard+'</section>'
      +'<section class="st5-section">'+heading('La Semaine de Festins','Sélectionnez un jour pour consulter ou modifier ses repas')
      +'<div class="st5-week">'+week+'</div></section>'
      +'<section class="st5-section">'+heading('Calendrier des repas','Planning réel de votre foyer')
      +'<div class="st5-legacy-extra">'+legacyPlan()+'</div></section>'
      +'<section class="st5-card"><h3>▣ Le Panier de Dobby</h3><p>'+missing+' élément(s) proposés à la préparation des courses selon les repas et ajouts internes.</p>'
      +'<button class="st5-solid block" data-go="shop">Voir les provisions ›</button></section>'
      +'</div>';
  };
  const legacyFamily=st4PrevFamily;
  drawFamily=function(){
    const members=Array.isArray(st.familyMembers)?st.familyMembers:[];
    const people=members.slice(0,8).map(m=>
      '<button class="st5-member" data-extra="health"><span class="avatar">'+safe(m.avatar||'♡')+'</span>'+safe(m.name)+'</button>'
    ).join('');
    const upcoming=(st.famHealth||[]).filter(x=>x.date&&x.date>=todayISO())
      .sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,5);
    const events=upcoming.map(e=>{
      let date=String(e.date||'');
      let dd=date?new Intl.DateTimeFormat('fr-BE',{day:'2-digit',month:'short'}).format(parseDate(date)):'—';
      return '<button class="st5-agenda-row" style="width:100%;background:none;border-left:0;border-top:0;border-right:0;text-align:left" data-extra="healthedit" data-id="'+safe(e.id)+'">'
      +'<span class="st5-date-medal">'+safe(dd)+'</span><span><strong>'+safe(e.name||'Rendez-vous')+'</strong>'
      +'<small>'+safe(e.person||'Famille')+(e.provider?' · '+safe(e.provider):'')+'</small></span></button>';
    }).join('');
    return '<div class="st5-view st5-family">'
      +cover('family','✧ CABINET DES CURIOSITÉS','Foyer familial','Le Salon des Curiosités','« Dobby veille sur la famille, ses événements et les informations importantes de la maisonnée. »')
      +'<section class="st5-section">'+heading('L’Horloge Enchantée','Les membres de votre foyer',
      '<button class="st5-outline" data-extra="health">Gérer les membres ›</button>')
      +(people?'<div class="st5-member-row">'+people+'</div>':'<div class="st5-empty">Aucun membre n’a encore été enregistré.</div>')+'</section>'
      +'<section class="st5-section">'+heading('La Gazette & Agenda','Rendez-vous médicaux enregistrés')
      +'<div class="st5-calendar-portal">'
      +(events||'<div class="st5-empty">Aucun rendez-vous médical futur enregistré dans cette démonstration.</div>')
      +'</div><div class="st5-two"><button class="st5-outline" data-extra="health">♡ Carnet de santé</button>'
      +'<button class="st5-outline" data-go="family">♧ Vie familiale</button></div>'
      +'<p class="st5-sub">Le calendrier Apple n’est pas encore connecté à Dobby. Aucun événement extérieur n’est inventé.</p></section>'
      +'<section class="st5-section">'+heading('Archives & Accès Rapides','Les registres de la maisonnée')
      +'<div class="st5-quick-grid"><button data-extra="contacts"><strong>♧ Répertoire</strong>Contacts et coordonnées</button>'
      +'<button data-extra="lists"><strong>☑ Listes</strong>Organisation commune</button>'
      +'<button data-go="documents"><strong>▤ Documents</strong>Contrats et garanties</button>'
      +'<button data-go="house"><strong>⌂ Maison</strong>Équipements et entretiens</button></div></section>'
      +'<section class="st5-section">'+heading('Organisation familiale','Accès aux fonctions existantes')
      +'<div class="st5-legacy-extra">'+legacyFamily()+'</div></section>'
      +'</div>';
  };
  document.addEventListener('click',function(ev){
    const tab=ev.target.closest('[data-st5-tasktab]');
    if(tab){st.st5TaskTab=tab.dataset.st5Tasktab;save();render();return;}
    const dinner=ev.target.closest('[data-st5-action="dinner"]');
    if(dinner){st.day=todayISO();st.slot='soir';st.page='pick';st.detail=null;save();render();}
  });
  const previousRender=render;
  const chapterMap={
    'recipes':'Grimoire des recettes','pick':'Choisir un festin','shop':'Panier & provisions',
    'house':'Registre de la maison','documents':'Archives & contrats','chat':'Parler à Dobby',
    'import':'Importer un document','batch':'Importer des recettes','search':'Recherche dans les archives',
    'health':'Carnet de santé familial','contacts':'Répertoire de la maisonnée','lists':'Listes du foyer'
  };
  render=function(){
    previousRender();
    const key=String(st.extraPage||'').split(':')[0]||st.page;
    const screen=document.getElementById('screen');
    if(!screen||!chapterMap[key]||((key==='documents')&&st.detail))return;
    if(!screen.querySelector('.st5-chapter')){
      screen.insertAdjacentHTML('afterbegin','<div class="st5-chapter">'+chapterMap[key]+'</div>');
    }
  };
  render();
})();
/* Isolated V5 family preview: legacy HTML remains unchanged. */
(function(){
 const css=document.createElement('link');css.rel='stylesheet';css.href='./family-v2.css?v=20261108-7';document.head.append(css);
 const agendaCss=document.createElement('link');agendaCss.rel='stylesheet';agendaCss.href='./family-agenda.css?v=20261108-7';document.head.append(agendaCss);
 const js=document.createElement('script');js.src='./family-v2.js?v=20261108-7';js.defer=true;
 js.onload=function(){
   const modules=document.createElement('script');modules.src='./family-modules.js?v=20261108-7';
   modules.onload=function(){
     const missionsCss=document.createElement('link');missionsCss.rel='stylesheet';missionsCss.href='./family-missions.css?v=20261108-7';document.head.append(missionsCss);
     const agenda=document.createElement('script');agenda.src='./family-agenda.js?v=20261108-7';
     agenda.onload=function(){
       const missions=document.createElement('script');missions.src='./family-missions.js?v=20261108-7';
       missions.onload=function(){
         const filesCss=document.createElement('link');filesCss.rel='stylesheet';filesCss.href='./family-files.css?v=20261108-9';document.head.append(filesCss);
         const files=document.createElement('script');files.src='./family-files.js?v=20261108-9';
         files.onload=function(){
           const healthCss=document.createElement('link');healthCss.rel='stylesheet';healthCss.href='./family-health.css?v=20261108-7';document.head.append(healthCss);
           const health=document.createElement('script');health.src='./family-health.js?v=20261108-7';
           health.onload=function(){
             const presentationCss=document.createElement('link');presentationCss.rel='stylesheet';presentationCss.href='./dobby-v6.css?v=20261108-1';
             const presentation=document.createElement('script');presentation.src='./dobby-v6.js?v=20261108-1';
             // Presentation is additive; failed assets never block the functional V5 loader.
             presentationCss.onload=presentationCss.onerror=function(){document.body.append(presentation);};
             document.head.append(presentationCss);
           };
           document.body.append(health);
         };
         document.body.append(files);
       };
       document.body.append(missions);
     };
     document.body.append(agenda);
   };
   document.body.append(modules);
 };
 document.body.append(js);
})();

/* DOBBY_STARTUP_ROUTE_RESTORE_V1: resume after screen handlers are initialized. */
(function(){
  const route = window.__dobbyStartupRoute;
  delete window.__dobbyStartupRoute;
  if (!route || (route.page === 'home' && !route.detail)) return;
  const allowed = new Set(['home','plan','pick','recipes','family','house','documents','chat','missions','menu','import','batch','shop']);
  if (!allowed.has(route.page)) return;
  try {
    st.page = route.page;
    st.detail = route.detail ?? null;
    render();
  } catch (error) {
    console.error('[Dobby] Saved screen could not be rendered; keeping user data and returning home.', error);
    st.page = 'home';
    st.detail = null;
    try { render(); }
    catch (recoveryError) {
      console.error('[Dobby] Home screen could not be rendered.', recoveryError);
      const screen = document.getElementById('screen');
      if (screen) screen.textContent = 'Affichage temporairement indisponible. Les données locales sont préservées. Rechargez cette page.';
    }
  }
})();
