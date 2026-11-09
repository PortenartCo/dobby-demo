/* Permanent E01 bars cloned from the original Traverse HTML. UI preferences
   live in native st and use native save(); no additional persistence layer. */
window.DobbyChrome=(()=>{'use strict';
const E=window.DobbyFamilyStitchEngine;
let template=null,audio=null;
const destinations=[['Traverse','explore','./traverse.html'],['Missions','history_edu','./missions.html'],['Taverne','skillet','./index.html'],['Famille','family_restroom','./famille.html'],['Menu','more_horiz','./famille.html#menu']];
const preferences=()=>E.evaluate('return {effects:false,sound:false,...st.stitchPreferences};');
function apply(){const p=preferences();document.documentElement.classList.toggle('e01-effects-off',!p.effects);document.documentElement.classList.toggle('e01-effects-on',!!p.effects);for(const name of ['effects','sound']){const b=document.querySelector(`[data-e01-toggle="${name}"]`);if(b){b.setAttribute('aria-pressed',String(!!p[name]));if(name==='effects'){const text=p.effects?'Désactiver les effets visuels':'Activer les effets visuels';b.setAttribute('aria-label',text);b.title=text;}}}const icon=document.getElementById('magic-sound-icon');if(icon)icon.textContent=p.sound?'volume_up':'volume_off';const indicator=document.getElementById('magic-sound-indicator');if(indicator)indicator.hidden=!p.sound;}
function sectionTitle(){
 const panel=document.getElementById('dv7-panel');if(panel&&!panel.hidden)return document.getElementById('dv7-panel-title').textContent.trim();
 const heading=document.querySelector('body > main h1')?.cloneNode(true);for(const icon of heading?.querySelectorAll('.material-symbols-outlined,[aria-hidden="true"]')||[])icon.remove();
 const name=(heading?.textContent||document.title).replace(/\s+/g,' ').trim();return document.body.dataset.dv7Screen==='traverse'?name.replace(/^Le /,''):name;
}
function mount(){if(!template)return;const current=document.querySelector('body > header');if(current){
 // Preserve contextual source title/actions below the permanent bar (save,
 // back, current cooking step). Global controls belong only to the bar.
 if(!current.dataset.e01Chrome&&!document.querySelector('main [data-e01-context]')){
  const meaningful=[...current.querySelectorAll('[data-fa-action],[data-cu-action]')].some(b=>!['menu','account','home','family','missions','taverne','favorite'].includes(b.dataset.faAction||b.dataset.cuAction));
  if(meaningful){const context=document.createElement('header');context.className=current.className+' e01-context';context.dataset.e01Context='true';context.append(...[...current.childNodes].map(n=>n.cloneNode(true)));for(const b of context.querySelectorAll('[data-fa-action="menu"],[data-fa-action="account"],[data-cu-action="menu"],[data-cu-action="account"]'))b.remove();document.querySelector('main')?.prepend(context);}
 }
 const header=template.querySelector('header').cloneNode(true);header.dataset.e01Chrome='true';
 const star=header.querySelector('button');star.dataset.e01Toggle='effects';star.setAttribute('aria-label','Activer ou désactiver les effets visuels');
 const sound=header.querySelector('#magic-sound-toggle');sound.dataset.e01Toggle='sound';sound.setAttribute('aria-label','Activer ou désactiver les sons et vibrations');
 const person=header.querySelector('span.material-symbols-outlined:last-child')?.closest('div.cursor-pointer');if(person){const b=document.createElement('button');b.type='button';b.className=person.className;b.innerHTML=person.innerHTML;b.dataset.e01Account='true';b.dataset.faAction='account';b.setAttribute('aria-label','Ouvrir le profil du compte');person.replaceWith(b);}
 const subtitle=header.querySelector('.whitespace-nowrap');if(subtitle){const section=sectionTitle().toLocaleUpperCase('fr'),label='MAISON & QUOTIDIEN · '+section;subtitle.dataset.e01Subtitle='true';const prefix=document.createElement('span'),name=document.createElement('span');prefix.className='e011-band-prefix';prefix.textContent='MAISON & QUOTIDIEN · ';name.className='e011-band-section';name.textContent=section;subtitle.replaceChildren(prefix,name);subtitle.title=label;}current.replaceWith(header);
 }
 let nav=document.querySelector('body > nav');if(!nav?.dataset.e01Chrome){const replacement=template.querySelector('nav').cloneNode(true);replacement.dataset.e01Chrome='true';const row=replacement.firstElementChild,source=[...row.children];row.replaceChildren();destinations.forEach(([label,icon,href],i)=>{const a=(source[i]||source[3]).cloneNode(true);a.href=href;a.dataset.e01Destination=String(i);a.removeAttribute('aria-current');a.removeAttribute('data-path');a.querySelector('.material-symbols-outlined').textContent=icon;a.lastElementChild.textContent=label;row.append(a);});if(nav)nav.replaceWith(replacement);else document.body.append(replacement);nav=replacement;}
 nav.hidden=false;const active=document.body.dataset.dv7Screen==='traverse'?0:document.body.dataset.dv7Screen==='missions'?1:document.body.dataset.dv7Screen==='taverne'?2:location.hash.startsWith('#menu')?4:3;
 for(const a of nav.querySelectorAll('a')){const index=Number(a.dataset.e01Destination),on=index===active;a.href=destinations[index][2];a.className=template.querySelectorAll('nav a')[on?0:1].className;if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');a.lastElementChild.className=template.querySelectorAll('nav a')[on?0:1].lastElementChild.className;}
 const footers=[...document.querySelectorAll('main .fixed.bottom-0,#fa-supplement .fixed.bottom-0,#cu-supplement .fixed.bottom-0')];document.documentElement.style.setProperty('--e01-footer-height',Math.max(0,...footers.map(el=>el.getBoundingClientRect().height))+'px');
 apply();
}
const ready=fetch('./chrome-source.html').then(r=>{if(!r.ok)throw Error('Barres Stitch indisponibles');return r.text()}).then(html=>{template=new DOMParser().parseFromString(html,'text/html');document.head.append(document.importNode(template.querySelector('style'),true));});
function animateSparkles(event){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const button=event.target.closest?.('button,a'),bounds=button?.getBoundingClientRect();
 const x=event.clientX>0?event.clientX:bounds?bounds.left+bounds.width/2:innerWidth/2;
 const y=event.clientY>0?event.clientY:bounds?bounds.top+bounds.height/2:innerHeight/2;
 const ripple=document.createElement('div');ripple.className='magical-ripple';ripple.style.left=x+'px';ripple.style.top=y+'px';document.body.append(ripple);setTimeout(()=>ripple.remove(),700);
 const colors=['#f9bb5f','#fabc4d','#ffdead','#afcdc0','#ffffff'];
 for(let i=0;i<7;i++){const spark=document.createElement('div'),angle=2*Math.PI*i/7,dist=24+Math.random()*25,size=3+Math.random()*3;
  spark.className='magic-sparkle-dot';spark.style.left=x+'px';spark.style.top=y+'px';spark.style.width=size+'px';spark.style.height=size+'px';spark.style.backgroundColor=colors[i%colors.length];spark.style.boxShadow='0 0 8px '+colors[i%colors.length];spark.style.setProperty('--tx',Math.round(Math.cos(angle)*dist)+'px');spark.style.setProperty('--ty',Math.round(Math.sin(angle)*dist)+'px');document.body.append(spark);setTimeout(()=>spark.remove(),650);
 }
}
function feedback(event,{visual=true,sound=true}={}){
 const p=preferences();if(visual&&p.effects)animateSparkles(event);
 if(sound&&p.sound){try{navigator.vibrate?.(20)}catch{}try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio||=new Audio();audio.resume().catch(()=>{});const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=660;gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.13);}}catch{}}
}
document.addEventListener('click',async event=>{
 const toggle=event.target.closest('[data-e01-toggle]');const account=event.target.closest('[data-e01-account]');const nav=event.target.closest('[data-e01-destination]');
 if(!toggle&&!account&&!nav){if(event.target.closest('button,a,[role=link],[role=button]'))feedback(event);return;}event.preventDefault();event.stopImmediatePropagation();
 if(toggle){const name=toggle.dataset.e01Toggle;try{E.evaluate('st.stitchPreferences={effects:false,sound:false,...st.stitchPreferences};st.stitchPreferences[p.name]=!st.stitchPreferences[p.name];save();',{name});apply();feedback(event,name==='effects'?{sound:false}:{visual:false});}catch(error){toggle.setAttribute('aria-description',error.message);}return;}
 feedback(event);
 if(window.DobbyRegister?.busy)await window.DobbyRegister.wait();
 if(account){window.DobbyStitchV7.open('account',account);mount();return;}
 const index=Number(nav.dataset.e01Destination);if(index===0&&location.pathname.endsWith('traverse.html')){window.DobbyStitchV7.close(false);window.DobbyHome.reset();return;}
 if(index===3&&window.DobbyFamilyStitch?.ready){window.DobbyStitchV7.close(false);window.DobbyFamilyStitch.open('salon').catch(console.error);return;}
 if(index===4&&window.DobbyFamilyStitch?.ready){window.DobbyStitchV7.close(false);window.DobbyFamilyStitch.open('menu').catch(console.error);return;}
 if(index===2&&window.DobbyCuisine?.ready){window.DobbyStitchV7.close(false);window.DobbyCuisine.open('taverne').catch(console.error);return;}
 location.href=destinations[index][2];
},true);
window.addEventListener('pageshow',()=>{if(window.DobbyStitchV7?.ready){window.DobbyHome?.reset();mount();}});
window.addEventListener('popstate',()=>setTimeout(mount,0));
return {ready,mount,apply};
})();
