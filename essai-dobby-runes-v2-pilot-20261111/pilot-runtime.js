/* Native storage and real native auth are deliberately retained. No seed/reset. */
(()=>{'use strict';
 Object.defineProperty(window,'DobbyRunesPilot',{value:Object.freeze({requireMissionsV2:true,project:'pqcdkrwljgvgagzwrcmg'}),writable:false,configurable:false});
 if(window.top!==window)return;
 function mount(){
  const style=document.createElement('style');
  style.textContent='#dobby-pilot-notice{box-sizing:border-box;position:relative;z-index:10;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 16px;background:#182f28;color:#fcf7ee;border-bottom:1px solid #d49b42;font:13px/1.45 Arial,sans-serif}#dobby-pilot-notice p{margin:0;flex:1 1 210px;overflow-wrap:anywhere}#dobby-pilot-notice button{font:600 13px/1.3 Arial,sans-serif;min-height:44px;padding:8px 12px;border:1px solid #d49b42;border-radius:10px;background:#d49b42;color:#18201c;cursor:pointer;white-space:normal}';
  document.head.append(style);
  const notice=document.createElement('aside');notice.id='dobby-pilot-notice';notice.setAttribute('aria-label','Pilote Runes V2');
  const text=document.createElement('p');text.innerHTML='<strong>Pilote Runes V2</strong> · Comptes réels<br>Runes en attente des RPC V2. Recette à deux comptes après migration.';
  const button=document.createElement('button');button.type='button';button.textContent='Connexion / configuration';
  button.addEventListener('click',()=>{
   if(window.DobbyStitchV7?.ready){window.DobbyStitchV7.open('account',button);return;}
   if(window.DobbyFamilyUI){window.DobbyFamilyUI.openModal();return;}
   text.textContent='Le moteur DOBBY démarre. Réessayez la connexion dans un instant.';
  });
  notice.append(text,button);document.body.prepend(notice);
  // Stitch mounts a fixed header asynchronously. Keep the notice beneath it
  // without adding its height twice to the existing content offset.
  let header;
  const resize=new ResizeObserver(()=>position());
  function position(){const next=document.querySelector('body > header');if(next!==header){if(header)resize.unobserve(header);header=next;if(header)resize.observe(header);}const height=header&&getComputedStyle(header).position==='fixed'?header.getBoundingClientRect().height:0;notice.style.marginTop=height+'px';notice.style.marginBottom=-height+'px';}
  new MutationObserver(position).observe(document.body,{childList:true});position();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
