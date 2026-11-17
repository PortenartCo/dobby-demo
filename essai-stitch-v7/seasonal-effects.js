/* Visual adapter for the native E01/FAM ambience. Preferences stay in DobbyChrome. */
window.DobbySeasonal=(()=>{
 'use strict';
 const C=window.DobbySeasonalCalendar,root=document.documentElement;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const motifs=Object.freeze({winter:'❄',spring:'✿',summer:'☀',autumn:'❧',magic:'🪄',valentine:'♥',carnival:'🎭',easter:'🥚',belgium:'🇧🇪',halloween:'🎃',thanksgiving:'🍁','saint-nicholas':'🎁',christmas:'❄','new-year':'✦'});
 // One shared vector library for all ornaments. No image replacement,
 // asset request, filter animation or second particle emitter.
 const eventMotifs=Object.freeze({christmas:['fir','holly','gift'],'halloween':['bat','pumpkin','lantern'],'new-year':['ribbon','star','ribbon'],magic:['wand','star','wand'],valentine:['rose','letter','rose'],easter:['blossom','egg','egg'],carnival:['mask','star','mask'],'saint-nicholas':['mitre','gift','mitre'],thanksgiving:['wheat','leaf','wheat'],belgium:['flag','star','flag']});
 const major=new Set(['christmas','halloween','new-year','magic']);
 const symbol=(id,body)=>`<symbol id="dsv-${id}" viewBox="0 0 100 100">${body}</symbol>`;
 const use=(id,x,y,w,h,turn=0)=>`<use href="#dsv-${id}" x="${x}" y="${y}" width="${w}" height="${h}"${turn?` transform="rotate(${turn} ${x+w/2} ${y+h/2})"`:''}/>`;
 function library(){
  if(document.getElementById('seasonal-symbol-library'))return;
  const node=document.createElementNS('http://www.w3.org/2000/svg','svg');node.id='seasonal-symbol-library';node.dataset.seasonalDecoration='';node.setAttribute('aria-hidden','true');node.setAttribute('width','0');node.setAttribute('height','0');node.inert=true;
  node.innerHTML=`<defs>
   <linearGradient id="dsv-gold" x2="1" y2="1"><stop stop-color="#fff0bb"/><stop offset=".38" stop-color="#b98231"/><stop offset=".65" stop-color="#f4d687"/><stop offset="1" stop-color="#936329"/></linearGradient>
   <linearGradient id="dsv-pine" x2="1" y2="1"><stop stop-color="#679276"/><stop offset=".5" stop-color="#284f3c"/><stop offset="1" stop-color="#112f26"/></linearGradient>
   <radialGradient id="dsv-red" cx=".3" cy=".2"><stop stop-color="#d67866"/><stop offset=".5" stop-color="#9b3535"/><stop offset="1" stop-color="#461b29"/></radialGradient>
   <radialGradient id="dsv-orange" cx=".4" cy=".3"><stop stop-color="#f1b356"/><stop offset=".65" stop-color="#b75c2d"/><stop offset="1" stop-color="#50233b"/></radialGradient>
   <radialGradient id="dsv-light"><stop stop-color="#fff1a9"/><stop offset="1" stop-color="#e2a04d"/></radialGradient>
   ${symbol('fir','<path d="M7 94Q35 44 88 6" fill="none" stroke="#a2824a" stroke-width="3"/>'+Array.from({length:7},(_,i)=>{const x=14+i*9,y=82-i*10;return `<path d="M${x-12} ${y-15}L${x+4} ${y+3}L${x+27} ${y+1}M${x-6} ${y-22}L${x+10} ${y-5}L${x+32} ${y-6}" fill="none" stroke="${i%2?'#66846a':'#2e5c43'}" stroke-width="3" stroke-linecap="round"/>`;}).join(''))}
   ${symbol('tree','<path d="M46 86h8v13h-8" fill="#a37a48"/><path d="M50 5L26 35h10L17 61h14L8 88h84L69 61h14L64 35h10Z" fill="url(#dsv-pine)" stroke="#62816a"/><path d="M32 38Q56 49 66 36M23 63Q48 75 77 62" fill="none" stroke="url(#dsv-gold)" stroke-width="2"/><g fill="#e4be6e"><circle cx="37" cy="32" r="3"/><circle cx="61" cy="58" r="3"/><circle cx="35" cy="76" r="3"/></g><path d="M50 0l2 5 6 1-5 3 1 6-4-3-4 3 1-6-5-3 6-1Z" fill="#f5d992"/>')}
   ${symbol('holly','<path d="M49 58C24 60 30 40 5 32L17 27 14 11 30 20 40 7Q60 28 49 58M51 58Q52 27 87 20L82 35 97 40 82 48 87 62Q64 72 51 58" fill="url(#dsv-pine)" stroke="#8b995e"/><path d="M15 25L49 60 86 36" fill="none" stroke="#a39b62"/><g fill="url(#dsv-red)" stroke="#d7a184" stroke-width=".6"><circle cx="44" cy="65" r="9"/><circle cx="60" cy="66" r="9"/><circle cx="52" cy="79" r="9"/></g>')}
   ${symbol('bauble','<path d="M50 0v21" stroke="#eacb83"/><path d="M40 21h20v8H40Z" fill="url(#dsv-gold)"/><circle cx="50" cy="57" r="32" fill="url(#dsv-red)" stroke="#b58b51"/><path d="M21 52Q51 73 79 52M27 71Q50 47 73 71" fill="none" stroke="url(#dsv-gold)" stroke-width="2"/><path d="M34 34l-5 15" stroke="#f9d6aa" stroke-width="3" stroke-linecap="round" opacity=".6"/>')}
   ${symbol('gift','<rect x="13" y="37" width="74" height="56" rx="4" fill="url(#dsv-red)" stroke="#d0ab6b"/><path d="M10 32h80v14H10Z" fill="#6e2930" stroke="#d0ab6b"/><path d="M44 32h12v61H44Z" fill="url(#dsv-gold)"/><path d="M50 32C6 26 24 0 43 16L50 32C98 29 77 0 59 16Z" fill="none" stroke="url(#dsv-gold)" stroke-width="6"/><path d="M49 32L32 58M53 32L70 56" stroke="#e0ba76" stroke-width="3"/>')}
   ${symbol('pumpkin','<path d="M47 23Q42 7 59 5L57 25" fill="#6e8060" stroke="#c3ae73"/><ellipse cx="50" cy="59" rx="43" ry="34" fill="url(#dsv-orange)" stroke="#c98046"/><path d="M35 29Q14 60 36 90M49 26Q34 60 48 93M61 28Q80 57 62 91" fill="none" stroke="#763f31" stroke-width="2" opacity=".75"/><path d="M23 53l17-10-3 16ZM61 44l17 11-15 4ZM29 68l10 4 7-5 9 8 10-6 10-2-8 14-11-2-10 4-12-5Z" fill="url(#dsv-light)" stroke="#6d3a2e" stroke-width="2"/>')}
   ${symbol('bat','<path d="M49 42L43 28l-7 9C18 29 8 12 1 23Q8 40 3 59Q18 44 24 65Q39 53 50 76Q61 53 76 65Q82 44 97 59Q92 40 99 23C92 12 82 29 64 37L57 28 51 42Z" fill="#251b36" stroke="#a18cb3" stroke-width="1.3"/><path d="M46 46l2 2m5-2l-2 2" stroke="#e9c181"/>')}
   ${symbol('lantern','<path d="M40 19Q28 2 50 2T60 19M26 27h48L66 87H34Z" fill="none" stroke="url(#dsv-gold)" stroke-width="4"/><path d="M23 20h54l5 11H18ZM29 86h42l8 9H21Z" fill="#45343f" stroke="#b39767"/><path d="M35 33h30l-5 48H40Z" fill="url(#dsv-light)"/><path d="M50 35v46M28 30l12 53M72 30L60 83" stroke="#624b3d" stroke-width="2"/>')}
   ${symbol('star','<path d="M50 3L59 37 93 50 59 60 50 97 40 60 7 50 40 37Z" fill="url(#dsv-gold)" stroke="#f9e1a0" stroke-width=".7"/><path d="M50 16v68M22 50h56" stroke="#fff2c6" opacity=".6"/>')}
   ${symbol('ribbon','<path d="M14 2Q85 17 29 39T61 75Q91 86 65 98" fill="none" stroke="#5e462e" stroke-width="13"/><path d="M14 2Q85 17 29 39T61 75Q91 86 65 98" fill="none" stroke="url(#dsv-gold)" stroke-width="9"/><path d="M16 3Q75 17 29 37" fill="none" stroke="#f7e5b2" stroke-width="1.2"/>')}
   ${symbol('wand','<path d="M20 85L76 24" stroke="#342434" stroke-width="9" stroke-linecap="round"/><path d="M20 85L76 24" stroke="url(#dsv-gold)" stroke-width="4" stroke-linecap="round"/><path d="M65 34l11-10" stroke="#f2e8ff" stroke-width="6"/><path d="M79 2l4 12 13 5-13 4-4 14-5-14-13-4 13-5Z" fill="#dbc5f4"/><path d="M20 34l4 6 8 1-8 4-2 7-3-7-7-3 7-2Z" fill="#d5b1ee"/>')}
   ${symbol('letter','<path d="M8 26h84v57H8Z" fill="#dfc4ad" stroke="#a77d65" stroke-width="2"/><path d="M8 26l42 35 42-35M8 83l31-28m53 28L61 55" fill="none" stroke="#ad7d75" stroke-width="2"/><path d="M50 55c-18-14-21 8 0 18 21-10 18-32 0-18" fill="url(#dsv-red)"/>')}
   ${symbol('rose','<path d="M52 98Q53 56 31 35M52 78Q24 82 21 62Q39 61 52 78M51 69Q78 69 83 49Q63 51 51 69" fill="url(#dsv-pine)" stroke="#768565"/><path d="M50 16C22-1 4 31 25 43C10 63 44 72 54 51C78 64 90 33 66 26C79 6 51-5 50 16Z" fill="#a9586b" stroke="#e4adb1"/><path d="M49 23C26 20 26 47 46 48C67 50 69 22 49 23Q38 28 43 39Q54 49 59 33" fill="none" stroke="#f0b7b4" stroke-width="2"/>')}
   ${symbol('egg','<path d="M50 4C31 4 13 44 13 65C13 106 88 106 88 65C88 44 69 4 50 4Z" fill="#a3b9a0" stroke="#e4dab6" stroke-width="2"/><path d="M18 48l12 9 13-9 13 9 13-9 14 9M16 75h69" fill="none" stroke="#f2d99c" stroke-width="5"/><g fill="#dfb1b7"><circle cx="36" cy="69" r="4"/><circle cx="62" cy="33" r="4"/><circle cx="62" cy="85" r="4"/></g>')}
   ${symbol('blossom','<path d="M11 90Q30 40 80 15" fill="none" stroke="#8a7859" stroke-width="3"/><g fill="#ecc3b8" stroke="#b68c7b"><circle cx="32" cy="52" r="12"/><circle cx="51" cy="36" r="12"/><circle cx="71" cy="20" r="11"/></g><g fill="#e9c976"><circle cx="32" cy="52" r="4"/><circle cx="51" cy="36" r="4"/><circle cx="71" cy="20" r="4"/></g>')}
   ${symbol('mask','<path d="M7 24Q27 10 50 30Q73 10 93 24L83 68Q65 99 50 74Q35 99 17 68Z" fill="#695177" stroke="url(#dsv-gold)" stroke-width="3"/><path d="M50 31v42" stroke="#bea275"/><path d="M19 40q15-17 25 5-14 10-25-5M57 44q11-20 25-5-7 15-25 5" fill="#251b31" stroke="#e2bf7c" stroke-width="2"/><path d="M32 63l9 6m20 0l9-6" stroke="#dfb5ac" stroke-width="3"/>')}
   ${symbol('mitre','<path d="M20 86V37L48 2 80 37v49Z" fill="url(#dsv-red)" stroke="url(#dsv-gold)" stroke-width="3"/><path d="M45 25h9v53h-9ZM30 43h39v9H30ZM19 76h62v12H19Z" fill="url(#dsv-gold)"/><path d="M23 88l-5 11m57-11l7 11" stroke="#d9b46a" stroke-width="7"/>')}
   ${symbol('leaf','<path d="M50 5l8 20 18-9-3 23 22 1-15 20 9 15-31 2-8 21-8-21-28-2 9-15L6 40l23-1-3-23 18 9Z" fill="#bc8150" stroke="#e2b976"/><path d="M50 93V22M50 62L29 43m21 19l22-20" fill="none" stroke="#704d38" stroke-width="2"/>')}
   ${symbol('wheat','<path d="M50 99V10" stroke="#be9d61" stroke-width="3"/>'+Array.from({length:5},(_,i)=>`<path d="M50 ${24+i*12}Q21 ${18+i*12} 32 ${6+i*12}Q51 ${10+i*12} 50 ${24+i*12}Q78 ${18+i*12} 68 ${6+i*12}Q50 ${10+i*12} 50 ${24+i*12}" fill="url(#dsv-gold)"/>`).join(''))}
   ${symbol('flag','<path d="M20 6v90" stroke="url(#dsv-gold)" stroke-width="4"/><path d="M24 13q34-13 66 0v50q-34-13-66 0Z" fill="#c54d43"/><path d="M24 13q13-5 22-5v50q-12 0-22 5Z" fill="#242127"/><path d="M46 8q12-2 22 0v50q-13-2-22 0Z" fill="#dfbc60"/>')}
  </defs>`;document.body.append(node);
 }
 const svg=(content,cls,box='0 0 180 260')=>`<svg class="${cls}" viewBox="${box}" aria-hidden="true" focusable="false">${content}</svg>`;
 function artwork(theme,place){
  let lowerLeft='',lowerRight='';
  const [branch,centre,foot]=eventMotifs[theme];
  let left=use(branch,0,0,108,108,place==='header'?-38:0),right=use(branch,65,0,108,108,place==='header'?38:0);
  if(theme==='christmas'){
   left+=use('bauble',60,42,49,65)+use('holly',0,92,72,72);
   right+=use('bauble',70,34,52,70)+use('holly',105,100,72,72);
   if(place==='scene'){lowerLeft=use('tree',0,150,100,110)+use('gift',43,211,58,48);lowerRight=use('gift',98,193,78,57)+use('bauble',127,150,41,58);}
  }else if(theme==='halloween'){
   left=use('bat',3,9,92,56,-12)+use('lantern',4,67,53,78);right=use('bat',69,11,102,65,16)+use('bat',127,81,45,35,-15);
   if(place==='scene'){lowerLeft=use('pumpkin',0,173,112,87);lowerRight=use('pumpkin',80,170,100,90)+use('lantern',135,150,40,65);}
  }else if(theme==='new-year'){
   left=use('ribbon',0,-8,66,148)+use('star',64,12,44,44)+use('star',5,124,29,29);right=use('ribbon',115,-5,64,150,-12)+use('star',80,20,44,44)+use('star',136,132,29,29);
   if(place==='scene'){lowerLeft=use('star',9,192,64,64)+use('ribbon',47,171,38,85,55);lowerRight=use('star',117,188,61,61)+use('ribbon',87,172,36,86,-65);}
  }else if(theme==='magic'){
   left=use('wand',0,15,92,116)+use('star',65,4,31,31);right=use('wand',92,19,92,118,-65)+use('star',90,155,35,35);
  }else{
   left=use(branch,0,3,90,110,-12);right=use(branch,93,5,87,108,14);lowerLeft=use(centre,0,155,85,92);lowerRight=use(foot,105,165,72,87);
  }
  if(theme==='new-year'){
   const confetti=(mirror=false)=>Array.from({length:10},(_,i)=>`<path d="M${mirror?150-i%3*18:12+i%3*18} ${24+i*12}l${i%2?5:-4} ${i%2?8:5}" stroke="${i%3?'#d6b46a':'#f0dec0'}" stroke-width="${i%3?2:3}"/>`).join('');
   left+=confetti();right+=confetti(true);
  }
  const node=document.createElement('div');node.className='seasonal-art';node.setAttribute('aria-hidden','true');node.inert=true;
  node.innerHTML=svg(left,'seasonal-art-left','0 0 180 155')+svg(right,'seasonal-art-right','0 0 180 155');
  if(place==='scene')node.innerHTML+=svg(lowerLeft,'seasonal-art-bottom-left','0 150 180 110')+svg(lowerRight,'seasonal-art-bottom-right','0 150 180 110');
  if(place==='header'||place==='welcome')node.innerHTML+=svg((theme==='christmas'?'<path d="M0 35Q125 94 250 35T500 35T750 35T1000 35" fill="none" stroke="#31573f" stroke-width="15"/><path d="M0 29Q125 88 250 29T500 29T750 29T1000 29" fill="none" stroke="#759064" stroke-width="2"/>':'')+'<path d="M0 35Q125 94 250 35T500 35T750 35T1000 35" fill="none" stroke="currentColor" stroke-width="2"/>'+Array.from({length:17},(_,i)=>`<circle class="seasonal-bulb" cx="${i*62.5}" cy="${i%4===0?35:i%2===0?64:56}" r="${theme==='christmas'?7:2}" fill="${theme==='halloween'?'#d99b52':'#f1d493'}"/>`).join(''),'seasonal-garland','0 0 1000 100');
  return node;
 }

 let preferences=null,timer=null,queued=null,pageAway=false,disposed=false,burst=null,burstTimer=null;
 const seen=new Set();
 function clearBurst(){clearTimeout(burstTimer);burstTimer=null;burst?.remove();burst=null;}
 function removeDecorations(){
  clearBurst();document.querySelectorAll('[data-seasonal-decoration]').forEach(node=>node.remove());
  document.querySelectorAll('[data-seasonal-panel-host]').forEach(node=>delete node.dataset.seasonalPanelHost);
  delete root.dataset.seasonalLevel;delete root.dataset.seasonalTheme;delete root.dataset.seasonalSeason;delete root.dataset.seasonalDate;
  root.style.removeProperty('--seasonal-glyph');
 }
 function ornament(parent,attribute,result){
  let node=parent.querySelector(':scope > ['+attribute+']');
  if(node?.dataset.theme===result.theme)return node;
  node?.remove();node=document.createElement('div');node.setAttribute(attribute,'');node.dataset.seasonalDecoration='';node.dataset.theme=result.theme;
  const glyph=document.createElement('span');glyph.className='seasonal-motif';glyph.textContent=motifs[result.theme];glyph.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='seasonal-caption';label.textContent=result.label;
  node.append(glyph,label);if(eventMotifs[result.theme]){library();node.append(artwork(result.theme,attribute==='data-seasonal-header'?'header':attribute==='data-seasonal-welcome'?'welcome':'scene'));}
  parent.append(node);return node;
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
  root.dataset.seasonalLevel=eventMotifs[result.theme]?(major.has(result.theme)?'3':'2'):'1';
  if(!eventMotifs[result.theme])document.getElementById('seasonal-symbol-library')?.remove();
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
  const welcome=scene&&major.has(result.theme)?document.querySelector('main h1')?.parentElement.parentElement:null;
  document.querySelectorAll('[data-seasonal-panel-host]').forEach(node=>{if(node!==welcome){delete node.dataset.seasonalPanelHost;node.querySelector('[data-seasonal-welcome]')?.remove();}});
  if(welcome){welcome.dataset.seasonalPanelHost='';ornament(welcome,'data-seasonal-welcome',result);}
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
