/* E06-01 presentation only. Native ceremony drafts and member writers untouched. */
window.DobbyRitual=(()=>{'use strict';
 const E=window.DobbyFamilyStitchEngine,key='dobby.e06.ritual.v1',reduced=matchMedia('(prefers-reduced-motion: reduce)');let state={},entry={},current=null,queue=Promise.resolve();
 const api=()=>E.win().DobbyFamilyUI;
 // Use the shared preference reader after bootstrap; the fallback has the same
 // defaults while the common controller finishes loading. No default is saved.
 const preferences=()=>window.DobbyChrome?.preferences?.()||({effects:true,sound:false,...E.read().state.stitchPreferences});
 const movement=()=>preferences().effects&&!reduced.matches;
 const write=patch=>(queue=queue.catch(()=>{}).then(async()=>state=await api().updateMeta(key,value=>({...value,...patch,version:1}))));
 async function prepare(ui){dispose();await window.DobbyRegister.until(()=>api()?.connectionState?.().ready);state=await api().meta(key)||{};entry={...ui};}
 function dispose(){if(!current)return;const old=current;current=null;old.attempt=(old.attempt||0)+1;clearTimeout(old.timer);old.effects?.dispose();old.stopAudio?.();old.observer.disconnect();old.preferencesObserver.disconnect();removeEventListener('pagehide',old.dispose);removeEventListener('hashchange',old.hash);document.removeEventListener('visibilitychange',old.visibility);reduced.removeEventListener('change',old.sync);}
 function render(c){dispose();const main=c.main;main.dataset.e06Main='true';main.classList.add('e06-ritual-scene');
  const member=E.read().members.find(m=>m.id===entry.person),profile=member?.magicProfile,configured=profile?.ceremonyStatus==='complete'||!!(profile?.houseId&&profile?.patronusId&&profile?.avatarId);
  if(entry.record!=='replay'&&(state.seen||state.suppressed||configured)){main.replaceChildren(Object.assign(document.createElement('p'),{textContent:'Ouverture du foyer…',className:'e06-note'}));queueMicrotask(()=>{if(main.isConnected)c.open('onboarding-foyer',{person:entry.person||null,record:null});});return;}
  main.querySelector('#home-arrival-modal')?.remove();const header=main.querySelector('#ios-status-bar');header.replaceChildren();
  const label=document.createElement('span');label.textContent='✧ DOBBY ✧';header.append(label);
  const controls=document.createElement('div');controls.className='ritual-preferences';for(const [name,text]of [['effects','✦ Effets'],['sound','♪ Son']]){const b=document.createElement('button');b.type='button';b.dataset.e01Toggle=name;b.textContent=text;b.setAttribute('aria-pressed',String(!!preferences()[name]));controls.append(b);}header.append(controls);
  const image=main.querySelector('#dobby-hearth-img');image.removeAttribute('data-e06-missing-media');image.src=new URL('./assets/onboarding/ritual-hearth-original.png',location.href).href;image.alt='Dobby devant une grande cheminée de pierre éclairée par le feu — illustration originale adaptée pour le Rituel';image.loading='eager';image.decoding='async';image.onerror=()=>{image.onerror=null;image.src=new URL('./assets/remaining/41e997ebd3dbb0da.png',location.href).href;};
  const seal=main.querySelector('#panel-security-seal span');seal.textContent=window.DobbyReview?'Parcours fictif · Préférence sur cet appareil':'Introduction · Préférence sur cet appareil';
  const cross=main.querySelector('#btn-floo-trigger'),skip=[...main.querySelectorAll('button')].find(b=>/Passer/.test(b.textContent)),never=main.querySelector('#chk-never-again');skip.id='e06-ritual-skip';never.checked=!!state.suppressed;
  const status=document.createElement('p');status.className='ritual-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');main.querySelector('#interaction-panel').append(status);
  // Project the same source sequence onto the real controls, without replacing
  // its Canvas engine or hiding the accessible Skip action during traversal.
  const crossing=enabled=>{main.classList.toggle('ritual-crossing',enabled);main.querySelector('#btn-label').textContent=enabled?'Poudre de cheminette active…':'Traverser la cheminée';main.querySelector('#badge-text').textContent=enabled?'Traversée de l’Âtre en cours…':'Chemin de Traverse · Âtre N° 7';cross.setAttribute('aria-busy',String(enabled));};
  const session={main,timer:0,effects:null,stopAudio:null,transition:false,attempt:0,awaitingWrite:false};current=session;
  const active=()=>current===session&&main.isConnected&&document.body.dataset.familyView==='onboarding-ritual';
  const stopAudio=()=>{session.stopAudio?.();session.stopAudio=null;};
  async function finish(){
   if(!active()||session.finishing)return;
   session.finishing=true;session.awaitingWrite=true;const attempt=++session.attempt;clearTimeout(session.timer);
   try{await write({seen:true,suppressed:never.checked});if(!active()||attempt!==session.attempt)return;
    session.awaitingWrite=false;session.transition=false;stopAudio();session.effects?.dispose();session.effects=null;
    await c.open('onboarding-foyer',{person:entry.person||null,record:null});
   }catch(error){if(!active()||attempt!==session.attempt)return;
    stopAudio();session.effects?.dispose();session.effects=null;session.transition=false;session.finishing=false;session.awaitingWrite=false;
    crossing(false);cross.disabled=false;skip.disabled=false;never.disabled=false;
    status.textContent='Introduction non enregistrée : '+error.message;sync();
   }
  }
  const sync=()=>{if(!active())return;session.effects?.dispose();session.effects=null;if(!preferences().sound)stopAudio();if(movement()&&!document.hidden){session.effects=window.DobbyRitualEffects.start(main);if(session.transition)session.effects.floo();}if(session.transition&&!movement())finish();};
  never.onchange=async()=>{never.disabled=true;try{await write({suppressed:never.checked});status.textContent='Préférence enregistrée sur cet appareil.';}catch(error){never.checked=!!state.suppressed;status.textContent='Préférence non enregistrée : '+error.message;}finally{never.disabled=false;}};
  cross.onclick=()=>{if(!active()||session.transition)return;session.transition=true;cross.disabled=true;never.disabled=true;status.textContent='Traversée en cours…';if(!movement()){finish();return;}crossing(true);session.effects?.floo();if(preferences().sound){try{session.stopAudio=window.DobbyRitualEffects.audio();}catch{}try{navigator.vibrate?.([16,30,12]);}catch{}}session.timer=setTimeout(finish,2500);};
  skip.onclick=()=>{if(!active())return;skip.disabled=true;finish();};
  session.dispose=dispose;session.sync=sync;session.hash=()=>{if(!location.hash.startsWith('#onboarding-ritual'))dispose();};
  session.visibility=()=>{if(!active())return;if(document.hidden){clearTimeout(session.timer);session.effects?.dispose();session.effects=null;stopAudio();if(session.transition||session.awaitingWrite){session.attempt++;session.finishing=false;session.awaitingWrite=false;session.transition=false;crossing(false);cross.disabled=false;never.disabled=false;status.textContent='Traversée interrompue. Vous pouvez réessayer ou passer.';}}else sync();};
  session.observer=new MutationObserver(()=>{if(!active())dispose();});session.observer.observe(document.body,{childList:true,attributes:true,attributeFilter:['data-family-view']});
  session.preferencesObserver=new MutationObserver(sync);session.preferencesObserver.observe(controls,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
  addEventListener('pagehide',dispose);addEventListener('hashchange',session.hash);document.addEventListener('visibilitychange',session.visibility);reduced.addEventListener('change',sync);image.decode().then(()=>{if(active())sync();}).catch(()=>{});sync();
 }
 function settings(parent,c){const section=document.createElement('section');section.dataset.e06RitualSettings='true';section.className='e06-ritual-settings';const title=document.createElement('h3');title.textContent='Introduction de la Cheminée';const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.e06RitualPref='true';input.disabled=true;label.append(input,document.createTextNode(' Autoriser le Rituel de première connexion'));const replay=document.createElement('button');replay.type='button';replay.className='fa-button';replay.dataset.magicControl='true';replay.dataset.e06RitualReplay='true';replay.textContent='Revoir le Rituel';replay.onclick=()=>c.open('onboarding-ritual',{person:c.ui.person||null,record:'replay'});const message=document.createElement('p');message.setAttribute('role','status');message.className='e06-note';section.append(title,label,replay,message);
  // Put replay in the next screen's first reading path, before long member lists.
  const intro=c.ui.view==='onboarding-foyer'?parent.querySelector('.e06-demo-intro'):null,options=c.ui.view==='onboarding-foyer'?parent.querySelector('#household-options'):null;
  if(intro)intro.after(section);else if(options)options.before(section);else parent.append(section);
  api().meta(key).then(value=>{input.checked=!value?.suppressed;input.disabled=false;message.textContent=value?.suppressed?'Introduction masquée sur cet appareil.':value?.seen?'Introduction déjà présentée ; « Revoir le Rituel » la rejoue sans modifier votre profil.':'Le Rituel apparaît à la première entrée E06, pas à chaque ouverture.';}).catch(error=>message.textContent='Préférence indisponible : '+error.message);
  input.onchange=async()=>{input.disabled=true;try{await write(input.checked?{suppressed:false,seen:false}:{suppressed:true});message.textContent=input.checked?'Introduction réactivée pour la prochaine entrée E06.':'Introduction masquée sur cet appareil.';}catch(error){input.checked=!state.suppressed;message.textContent='Préférence non enregistrée : '+error.message;}finally{input.disabled=false;}};
 }
 return Object.freeze({prepare,render,settings,dispose,get active(){return !!current;}});
})();
