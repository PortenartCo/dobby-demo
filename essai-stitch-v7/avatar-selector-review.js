/* Review G. Explicit mount only: no register hooks, storage, writers or account
   inference. The existing profile form/select and its submit handler own saves. */
window.DobbyReviewAvatarSelector=(()=>{'use strict';let sequence=0;
 const element=(tag,text='',className='')=>Object.assign(document.createElement(tag),{textContent:text,className});
 function mount({form,member,catalogue,trigger}={}){
  if(!(form instanceof HTMLFormElement)||!member)throw Error('Le formulaire canonique et le membre sont requis.');
  const select=form.querySelector('select[name="magicAvatarId"]');
  if(!select)throw Error('Le champ canonique magicAvatarId est requis.');
  if(form.querySelector('[data-review-avatar-selector]'))throw Error('Le sélecteur est déjà présent.');
  const nativeRows=window.DobbyMagicIdentity?.avatars||[],rows=catalogue||window.DobbyReviewAvatarCatalog?.extend(nativeRows)||nativeRows;
  const focusWasInside=form.contains(document.activeElement),label=select.closest('label')||select,priorHidden=label.hidden,id='review-avatar-'+(++sequence),root=element('div','','review-avatar-selector');root.dataset.reviewAvatarSelector='';
  const title=element('p','Choisir mon avatar','review-avatar-title');title.id=id+'-title';
  const hint=element('p','Choisissez un portrait, puis Enregistrer pour confirmer. Votre nom, votre Maison et votre Patronus restent inchangés.','review-avatar-hint');hint.id=id+'-hint';
  const group=element('div','','review-avatar-grid');group.setAttribute('role','radiogroup');group.setAttribute('aria-labelledby',title.id);group.setAttribute('aria-describedby',hint.id);
  const preview=element('div','','review-avatar-preview');preview.dataset.avatarPreview='';
  const announcement=element('p','','review-avatar-status');announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');announcement.setAttribute('aria-atomic','true');
  const pending=element('p','16 nouveaux portraits sont prêts. Leur sélection attend le raccordement au catalogue natif après E06.','review-avatar-pending');
  const options=[{id:'',name:'Mon avatar emoji',available:true},...rows],buttons=[];
  // A visible atlas is not proof that the native writer accepts its IDs. Only
  // native rows already offered by this exact canonical form become selectable.
  const enabled=row=>row.available!==false&&[...select.options].some(option=>option.value===row.id&&!option.disabled)&&(row.id===''||nativeRows.some(native=>native.id===row.id&&native.available!==false));
  function avatar(row){const visual=window.DobbyMemberAvatar.create({...member,magicProfile:{...member.magicProfile,avatarId:row.id}},{className:'review-avatar-face'});visual.setAttribute('aria-hidden','true');visual.removeAttribute('aria-label');const face=visual.querySelector('.dobby-avatar-face');if(row.sprite){face.textContent='';face.classList.add('dobby-avatar-portrait');window.DobbyReviewAvatarCatalog?.applySprite(face,row);}return visual;}
  function sync(announce=false){
   const selected=options.find(row=>row.id===select.value),supported=selected&&enabled(selected),active=buttons.find(button=>button.dataset.avatarChoice===select.value&&button.getAttribute('aria-disabled')!=='true');
   for(const button of buttons){button.setAttribute('aria-checked',String(button===active));button.tabIndex=button===active?0:-1;}
   if(!active)buttons.find(button=>button.getAttribute('aria-disabled')!=='true')?.setAttribute('tabindex','0');
   preview.replaceChildren();const current=selected||{id:select.value,name:'Choix enregistré non pris en charge'};preview.append(avatar(current),element('p',(supported?'Aperçu : ':'')+current.name));
   if(!supported){announcement.textContent='Le choix enregistré est non pris en charge. Il reste conservé tant que vous ne choisissez pas explicitement un autre avatar.';}
   else if(announce)announcement.textContent=current.name+' sélectionné pour l’aperçu. Enregistrez pour confirmer.';
   else announcement.textContent='Aperçu du choix enregistré. Aucun changement avant Enregistrer.';
  }
  function choose(button){if(button.getAttribute('aria-disabled')==='true')return;select.value=button.dataset.avatarChoice;select.dispatchEvent(new Event('change',{bubbles:true}));}
  for(const row of options){const button=element('button','','review-avatar-choice');button.type='button';button.dataset.avatarChoice=row.id;button.setAttribute('role','radio');button.setAttribute('aria-checked','false');button.setAttribute('aria-label',row.name+(row.description?' — '+row.description:''));button.tabIndex=-1;const ready=enabled(row);button.setAttribute('aria-disabled',String(!ready));if(!ready)button.title='Raccordement au catalogue natif en attente';button.append(avatar(row));const check=element('span','✓','review-avatar-check');check.setAttribute('aria-hidden','true');button.append(check,element('span',row.name,'review-avatar-name'));button.onclick=()=>choose(button);button.onkeydown=event=>{
    const activeButtons=buttons.filter(item=>item.getAttribute('aria-disabled')!=='true'),index=activeButtons.indexOf(button);let target;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')target=activeButtons[(index+1)%activeButtons.length];
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')target=activeButtons[(index-1+activeButtons.length)%activeButtons.length];
    else if(event.key==='Home')target=activeButtons[0];else if(event.key==='End')target=activeButtons.at(-1);else return;
    event.preventDefault();target.focus();choose(target);
   };buttons.push(button);group.append(button);}
  root.append(title,hint,preview,group,announcement);const unavailable=options.filter(row=>!enabled(row));if(unavailable.length){pending.textContent=unavailable.length+' nouveaux portraits sont prêts. Leur sélection attend le raccordement au catalogue natif après E06.';root.append(pending);}
  const focus=()=>buttons.find(button=>button.tabIndex===0)?.focus(),opened=()=>queueMicrotask(focus),changed=()=>sync(true),reset=()=>queueMicrotask(()=>sync());select.addEventListener('change',changed);form.addEventListener('reset',reset);trigger?.addEventListener('click',opened);label.hidden=true;label.before(root);sync();if(focusWasInside&&!form.hidden)focus();
  return Object.freeze({root,focus,destroy(){select.removeEventListener('change',changed);form.removeEventListener('reset',reset);trigger?.removeEventListener('click',opened);label.hidden=priorHidden;root.remove();}});
 }
 return Object.freeze({mount});
})();
