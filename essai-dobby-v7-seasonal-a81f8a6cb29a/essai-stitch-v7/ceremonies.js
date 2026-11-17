/* Traverse ceremonies host the existing E06 engine, catalogue and native writers.
   No account creation, inferred identity, alternative scoring or remote transport. */
window.DobbyCeremonies=(()=>{'use strict';
 const E=window.DobbyFamilyStitchEngine,G=window.DobbyOnboardingEngine,M=window.DobbyMagicIdentity;
 let current=null,opening=null;
 const make=(tag,text='',className='')=>Object.assign(document.createElement(tag),{textContent:text,className});
 const catalogue=kind=>kind==='house'?M.houses:M.patronuses;
 const hasChoice=(member,kind)=>catalogue(kind).some(row=>row.id===member?.magicProfile?.[kind==='house'?'houseId':'patronusId']);
 const api=()=>E.win().DobbyFamilyUI;
 const contextToken=()=>JSON.stringify(G.context());
 function close(){if(!current||current.busy)return false;const session=current;current=null;session.dialog.close();session.dialog.remove();removeEventListener('pagehide',session.dispose);session.previousFocus?.focus?.({preventScroll:true});return true;}
 function action(label,task,className='dc-button'){
  const button=make('button',label,className);button.type='button';
  button.onclick=event=>{event.preventDefault();event.stopImmediatePropagation();run(task);};return button;
 }
 async function run(task){
  const session=current;if(!session||session.busy)return;
  session.busy=true;session.dialog.setAttribute('aria-busy','true');
  for(const control of session.dialog.querySelectorAll('button,input'))control.disabled=true;
  try{
   if(contextToken()!==session.context)throw Error('Le compte ou le foyer a changé. Fermez cette fenêtre avant de reprendre.');
   await window.DobbyRegister.lock(task);
   if(current===session)render();
  }catch(error){if(current===session&&contextToken()===session.context){session.error=error.message;render();}}
  finally{
   session.dialog.removeAttribute('aria-busy');
   if(current===session&&contextToken()!==session.context){session.busy=false;close();}
   // Native writes notify while DobbyRegister is locked, when Family correctly
   // defers repainting. Refresh once that lock has settled, including a House
   // confirmation that keeps the automatic Patronus modal open.
   if(session.refreshPending&&contextToken()===session.context){
    session.refreshPending=false;
    try{await window.DobbyStitchV7?.refresh();}
    catch(error){if(current===session){session.error=error.message;render();}}
   }
   session.busy=false;
   if(session.confirmed&&contextToken()===session.context)document.dispatchEvent(new CustomEvent('dobby:ceremony-confirmed',{detail:session.confirmed}));
  }
 }
 function illustration(row,kind){
  const art=kind==='house'?window.DobbyMagicProfile.houseEmblem(row):window.DobbyMagicProfile.sprite(row,'patronus');
  art.classList.add('dc-art');return art;
 }
 function header(kind,title){
  const top=make('header','','dc-header'),brand=make('span','✧ DOBBY ✧','dc-brand'),pause=action('Reprendre plus tard',()=>{current.busy=false;close();},'dc-pause');
  top.append(brand,pause);
  const heading=make('h1',title,'dc-title');heading.id='dobby-ceremony-title';
  const kicker=make('p',kind==='house'?'LE MYSTÈRE DES QUATRE MAISONS':'LE MIROIR DES ÂMES','dc-kicker');
  current.panel.append(top,kicker,heading);
 }
 function intro(kind){
  header(kind,kind==='house'?'La cérémonie de la Maison':'Découvrir mon Patronus');
  const art=make('div','','dc-intro-art');
  if(kind==='house'){
   const image=make('img');image.src=window.DobbyCeremonyArt.sortingHat.src;image.alt=window.DobbyCeremonyArt.sortingHat.alt;image.width=1376;image.height=768;art.append(image);
  }else{
   art.classList.add('dc-bestiaire');
   for(const id of ['stag','otter','fox'])art.append(illustration(M.patronuses.find(row=>row.id===id),kind));
  }
  const copy=make('p',kind==='house'?'Le Choixpeau écoute tes histoires. Découvre ta Maison grâce au questionnaire narratif, ou choisis celle qui te ressemble.':'Un gardien singulier t’attend parmi les douze Patronus. Laisse les questions révéler le tien, ou choisis-le dans le bestiaire.','dc-copy');
  const choices=make('div','','dc-paths');
  choices.append(action('Passer le test',async()=>{await G.drafts.update(d=>{d.selection=null;d[kind]=[];d.done[kind]=false;d.index=0;d.step='onboarding-'+kind;});},'dc-button dc-primary'),action('Choisir directement',()=>G.go('onboarding-'+kind+'-gallery')));
  current.panel.append(art,copy,choices,make('p',kind==='house'?'Six questions narratives · une question complémentaire si nécessaire':'Cinq questions narratives · une question complémentaire si nécessaire','dc-caption'));
 }
 function gallery(kind){
  header(kind,kind==='house'?'Choisir ma Maison':'Le bestiaire des douze Patronus');
  current.panel.append(make('p','Sélectionne une illustration pour lire sa description. Ton choix attendra ta confirmation.','dc-copy'));
  const grid=make('div','','dc-gallery dc-gallery-'+kind);grid.setAttribute('aria-label',kind==='house'?'Les quatre Maisons':'Les douze Patronus');
  for(const row of catalogue(kind)){
   const choose=action('',()=>G.select(kind,row.id),'dc-choice');choose.dataset.ceremonyChoice=row.id;choose.setAttribute('aria-label',row.name);
   choose.append(illustration(row,kind),make('span',row.name,'dc-choice-name'));grid.append(choose);
  }
  current.panel.append(grid,action('Retour',()=>G.go('onboarding-'+kind+'-intro'),'dc-button dc-secondary'));
 }
 function question(kind,draft){
  const rules=G.scoring.config[kind],index=Math.min(draft.index,rules.questions.length-1),item=rules.questions[index];
  header(kind,item.title);
  const progress=make('p',index>=rules.baseQuestionCount?'Question complémentaire':'Question '+(index+1)+' sur '+rules.baseQuestionCount,'dc-progress');progress.setAttribute('role','status');
  const prompt=make('p',item.prompt,'dc-prompt');prompt.id='dobby-ceremony-prompt';
  const form=make('form','','dc-question'),fieldset=make('fieldset'),legend=make('legend','Choisis une réponse','dc-caption');fieldset.append(legend);
  const next=action('Continuer',()=>G.next(kind),'dc-button dc-primary');next.disabled=!draft[kind][index];
  for(const answer of item.answers){
   const label=make('label','','dc-answer'),radio=make('input');radio.type='radio';radio.name='dobby-ceremony-answer';radio.value=answer.id;radio.checked=draft[kind][index]===answer.id;radio.required=true;
   radio.onchange=()=>run(()=>G.answer(kind,index,answer.id));label.append(radio,make('span',answer.text));fieldset.append(label);
  }
  form.onsubmit=event=>{event.preventDefault();if(!next.disabled)run(()=>G.next(kind));};
  const controls=make('div','','dc-actions');controls.append(action('Retour',()=>index?G.previous(kind):G.go('onboarding-'+kind+'-intro'),'dc-button dc-secondary'),next);
  form.append(fieldset,controls);current.panel.append(progress,prompt,form);
 }
 function reveal(kind,draft){
  const manual=draft.selection?.kind===kind;
  let id=manual?draft.selection.id:null;
  if(!manual){try{const result=G.result(kind);if(result.result)id=G.scoring.catalogueId(kind,result.result);}catch{}}
  const row=catalogue(kind).find(item=>item.id===id);
  if(!row){intro(kind);return;}
  header(kind,row.name);
  const figure=make('div','','dc-revelation');figure.append(illustration(row,kind));
  current.panel.append(make('p',manual?'Choix direct · confirmation manuelle':'Résultat du questionnaire natif','dc-progress'),figure,make('p',window.DobbyMagicContent[kind==='house'?'houses':'patronuses'][id].description,'dc-description'),make('p','Ce résultat sera enregistré uniquement après ta confirmation.','dc-caption'));
  const controls=make('div','','dc-actions');
  controls.append(action('Revenir à mon choix',()=>manual?G.go('onboarding-'+kind+'-gallery'):G.go('onboarding-'+kind,Math.max(0,draft[kind].length-1)),'dc-button dc-secondary'),action(kind==='house'?'Confirmer ma Maison':'Confirmer mon Patronus',async()=>{
   if(manual)await G.confirmChoice(kind);else await G.confirm(kind);
   current.refreshPending=true;
   if(current.auto&&kind==='house'&&!hasChoice(G.member(),'patronus'))await G.go('onboarding-patronus-intro');
   else{
    await G.finish();
    const session=current;session.busy=false;close();
    session.confirmed={memberId:session.memberId,kind};
   }
  },'dc-button dc-primary'));
  current.panel.append(controls);
 }
 function render(){
  if(!current)return;
  const session=current,draft=G.drafts.read(),kind=draft.step.includes('patronus')?'patronus':'house';
  session.kind=kind;session.dialog.dataset.ceremonyKind=kind;session.panel.replaceChildren();
  if(draft.step.endsWith('-gallery'))gallery(kind);else if(draft.step==='onboarding-'+kind)question(kind,draft);else if(draft.step.endsWith('-result'))reveal(kind,draft);else intro(kind);
  if(session.error){const error=make('p',session.error,'dc-error');error.setAttribute('role','alert');session.panel.append(error);session.error='';}
  session.dialog.scrollTop=0;
  session.panel.querySelector('h1')?.setAttribute('tabindex','-1');session.panel.querySelector('h1')?.focus({preventScroll:true});
 }
 async function open({memberId,kind='house',auto=false}={}){
  if(opening)return opening;
  opening=(async()=>{
   if(!['house','patronus'].includes(kind))throw Error('Cérémonie invalide.');
   if(current){if(current.memberId===memberId&&current.context===contextToken())return true;if(!close())return false;}
   if(window.DobbyRegister.busy)await window.DobbyRegister.wait();
   await G.load(memberId);
   const member=G.member();if(!member)throw Error('Le profil canonique est introuvable.');
   const rights=E.memberPermissions(memberId);if(!rights.canMagic)throw Error(rights.reason);
   let draft=G.drafts.read();
   if(auto&&(member.magicProfile?.ceremonyStatus==='complete'||M.isCeremonyComplete(member))){if(draft.pending)await G.drafts.complete();return false;}
   if(auto){
    const next=hasChoice(member,'house')?'patronus':'house';
    if(!draft.pending||!draft.step.startsWith('onboarding-'+next)||draft.step==='onboarding-final')draft=await G.drafts.update(d=>{d.pending=true;d.selection=null;d.index=0;d.step='onboarding-'+next+'-intro';});
   }else draft=await G.drafts.update(d=>{d.pending=false;d.selection=null;d.index=0;d.step='onboarding-'+kind+'-intro';});
   const dialog=make('dialog','','dc-dialog');dialog.id='dobby-ceremonies';dialog.setAttribute('aria-labelledby','dobby-ceremony-title');
   const panel=make('section','','dc-panel');dialog.append(panel);
   const session={dialog,panel,memberId,kind,auto,busy:false,context:contextToken(),previousFocus:document.activeElement};
   session.dispose=()=>{session.busy=false;close();};
   dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
   current=session;document.body.append(dialog);addEventListener('pagehide',session.dispose);dialog.showModal();render();return true;
  })().finally(()=>{opening=null;});return opening;
 }
 async function openPending(){
  const access=api()?.access?.state?.(),context=api()?.getContext?.();
  if(!access?.verified||!context?.identityVerified||access.userId!==context.userId||access.householdId!==context.householdId||access.memberId!==context.memberId){if(current)close();return false;}
  if(current)return current.memberId===context.memberId&&current.context===contextToken()?true:close();
  if(!access.pendingCeremony)return false;
  return open({memberId:context.memberId,auto:true});
 }
 return Object.freeze({open,openPending,close,get active(){return !!current;}});
})();
