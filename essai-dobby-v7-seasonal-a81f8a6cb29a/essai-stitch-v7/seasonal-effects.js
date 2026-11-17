/* Visual adapter for the native E01/FAM ambience. Preferences stay in DobbyChrome. */
window.DobbySeasonal=(()=>{
 'use strict';
 const C=window.DobbySeasonalCalendar,root=document.documentElement;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const motifs=Object.freeze({winter:'❄',spring:'✿',summer:'☀',autumn:'❧',magic:'🪄',valentine:'♥',carnival:'🎭',easter:'🥚',belgium:'🇧🇪',halloween:'🎃',thanksgiving:'🍁','saint-nicholas':'🎁',christmas:'❄','new-year':'✦'});
 let preferences=null,timer=null,queued=null,pageAway=false,disposed=false,burst=null,burstTimer=null;
 const seen=new Set();
 function clearBurst(){clearTimeout(burstTimer);burstTimer=null;burst?.remove();burst=null;}
 function removeDecorations(){
  clearBurst();document.querySelectorAll('[data-seasonal-decoration]').forEach(node=>node.remove());
  delete root.dataset.seasonalTheme;delete root.dataset.seasonalSeason;delete root.dataset.seasonalDate;
  root.style.removeProperty('--seasonal-glyph');
 }
 function ornament(parent,attribute,result){
  let node=parent.querySelector(':scope > ['+attribute+']');
  if(node?.dataset.theme===result.theme)return node;
  node?.remove();node=document.createElement('div');node.setAttribute(attribute,'');node.dataset.seasonalDecoration='';node.dataset.theme=result.theme;
  const glyph=document.createElement('span');glyph.className='seasonal-motif';glyph.textContent=motifs[result.theme];glyph.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='seasonal-caption';label.textContent=result.label;
  node.append(glyph,label);parent.append(node);return node;
 }
 function celebrate(scene,result,paused){
  if(!scene||result.theme!=='magic'||!preferences.effects||reduced.matches||paused){clearBurst();return;}
  const key='dobby-seasonal-magic-seen-'+location.pathname.replace(/[^/]+$/,'')+'-'+result.year;
  // A transient viewing marker, never a second preference store. Session storage
  // also prevents repeated bursts after navigation/reload; memory handles denial.
  let played=seen.has(key);try{played||=sessionStorage.getItem(key)==='1';}catch{}
  if(played)return;clearBurst();seen.add(key);try{sessionStorage.setItem(key,'1');}catch{}
  burst=document.createElement('div');burst.dataset.seasonalDecoration='';burst.dataset.seasonalBurst='';burst.setAttribute('aria-hidden','true');burst.inert=true;
  for(const [index,glyph]of ['ᚱ','✧','ᛟ','✦','ᚨ','✧','ᛞ','✦'].entries()){
   const rune=document.createElement('span');rune.textContent=glyph;rune.style.setProperty('--rune-angle',index*45+'deg');burst.append(rune);
  }
  scene.append(burst);burstTimer=setTimeout(clearBurst,5000);
 }
 function arm(){
  clearTimeout(timer);timer=null;
  if(disposed||document.hidden||pageAway||!preferences)return;
  const now=new Date();timer=setTimeout(()=>{refresh();arm();},Math.max(1,C.nextMidnight(now).getTime()-now.getTime()+20));
 }
 function refresh(nextPreferences=preferences){
  if(disposed||!nextPreferences)return;preferences=nextPreferences;
  // Only the separately generated review wrapper provides this date source.
  // Native routes have no query parameter, setting, or clock override.
  const date=window.DobbySeasonalReview?.civilDate?.()||C.civilDate();
  const result=C.resolve(date);
  if(preferences.seasonalDecorations===false){removeDecorations();arm();return;}
  root.dataset.seasonalTheme=result.theme;root.dataset.seasonalSeason=result.season;root.dataset.seasonalDate=result.date;
  root.style.setProperty('--seasonal-glyph',JSON.stringify({magic:'✧',carnival:'▰',belgium:'✦'}[result.theme]||motifs[result.theme]));
  const panel=document.getElementById('dv7-panel');
  const paused=document.hidden||pageAway||root.classList.contains('dv7-loading')||!!(panel&&!panel.hidden);
  root.classList.toggle('seasonal-paused',paused);
  const header=document.querySelector('body > header[data-e01-chrome]');if(header)ornament(header,'data-seasonal-header',result);
  const home=document.body.dataset.dv7Screen==='traverse'&&!document.body.dataset.familyView;
  const scene=home?document.querySelector('main img[alt*="Dobby"]')?.parentElement:null;
  if(scene)ornament(scene,'data-seasonal-scene',result);
  else document.querySelectorAll('[data-seasonal-scene]').forEach(node=>node.remove());
  celebrate(scene,result,paused);arm();
 }
 function schedule(){if(queued!==null||disposed)return;queued=requestAnimationFrame(()=>{queued=null;refresh();});}
 const observer=new MutationObserver(schedule);
 // Reconcile only when templates/chrome change, never poll or add an emitter.
 observer.observe(document.body,{childList:true,attributes:true,attributeFilter:['data-family-view']});
 const loadingObserver=new MutationObserver(schedule);
 loadingObserver.observe(root,{attributes:true,attributeFilter:['class']});
 const panelObserver=new MutationObserver(schedule),panel=document.getElementById('dv7-panel');
 if(panel)panelObserver.observe(panel,{attributes:true,attributeFilter:['hidden']});
 function visibility(){if(document.hidden)clearBurst();refresh();}
 function leave(){pageAway=true;clearTimeout(timer);timer=null;clearBurst();refresh();}
 function arrive(){pageAway=false;refresh();}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',leave);
 window.addEventListener('pageshow',arrive);window.addEventListener('focus',arrive);reduced.addEventListener('change',schedule);
 function dispose(){
  disposed=true;clearTimeout(timer);cancelAnimationFrame(queued);observer.disconnect();loadingObserver.disconnect();panelObserver.disconnect();
  document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',arrive);window.removeEventListener('focus',arrive);reduced.removeEventListener('change',schedule);
  removeDecorations();root.classList.remove('seasonal-paused');
 }
 return Object.freeze({refresh,dispose});
})();
