/* Shared presentation of native member avatars and confirmed rune grades. */
window.DobbyMemberAvatar=(()=>{'use strict';
 const E=window.DobbyFamilyStitchEngine,NS='http://www.w3.org/2000/svg';let sequence=0;
 const palette={copper:['#f4c29b','#b66c3c','#704129'],silver:['#dde5e8','#96a8af','#52646d'],gold:['#fff0b2','#e7b44e','#98641d'],diamond:['#ffffff','#e0eaf0','#8faeb9']};
 const text=(tag,value,className='')=>{const el=document.createElement(tag);el.className=className;el.textContent=value;return el;};
 const node=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;};
 function emblem(grade){
  const svg=node('svg',{viewBox:'0 0 20 20','aria-hidden':'true',focusable:'false'}),id='rune-material-'+(++sequence),clip=id+'-clip',defs=node('defs'),gradient=node('linearGradient',{id,x1:'0',y1:'0',x2:'1',y2:'1'});
  palette[grade.material].forEach((color,index)=>gradient.append(node('stop',{offset:(index*50)+'%','stop-color':color})));defs.append(gradient);
  const shape=()=>{if(grade.shape==='point')return node('circle',{cx:10,cy:10,r:7.5});const count=grade.shape==='star4'?4:8,points=Array.from({length:count*2},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/count,r=i%2?(count===4?3.6:5):9;return[(10+Math.cos(angle)*r).toFixed(3),(10+Math.sin(angle)*r).toFixed(3)].join(',');}).join(' ');return node('polygon',{points});};
  const clipping=node('clipPath',{id:clip});clipping.append(shape());defs.append(clipping);svg.append(defs);const body=shape();body.setAttribute('fill','url(#'+id+')');body.setAttribute('stroke',palette[grade.material][0]);body.setAttribute('stroke-width','.65');svg.append(body);
  if(grade.material==='diamond'){const facets=node('g',{'clip-path':'url(#'+clip+')'});facets.append(node('path',{d:'M0 0L10 8L20 0L10 20Z',fill:'#ffffff',opacity:'.7'}),node('path',{d:'M0 20L10 8L20 20Z',fill:'#8eb6c4',opacity:'.35'}),node('path',{d:'M0 0L10 8L0 20Z',fill:'#e4d7f4',opacity:'.65'}),node('path',{d:'M4 4L10 8L16 4M10 8L6 16M10 8L15 15',fill:'none',stroke:'#607f90','stroke-width':'.7',opacity:'.7'}));svg.append(facets);}else svg.append(node('path',{d:'M5 6L8 4',stroke:'#fff','stroke-width':'.8','stroke-linecap':'round',opacity:'.65'}));
  return svg;
 }
 function create(member,{className=''}={}){
  const wrap=text('span','','dobby-member-avatar '+className),face=text('span',member?.avatar||'👤','dobby-avatar-face');face.setAttribute('aria-hidden','true');const portrait=window.DobbyMagicIdentity?.avatars.find(a=>a.id===member?.magicProfile?.avatarId&&a.available);if(portrait){face.textContent='';face.classList.add('dobby-avatar-portrait');face.dataset.avatarId=portrait.id;face.style.backgroundImage='url("'+portrait.asset+'")';face.style.backgroundPosition=(portrait.index%4/3*100)+'% '+(Math.floor(portrait.index/4)?83.333333:16.666667)+'%';
   // The recovered 4×4 atlas has its own cells; legacy eight keep their exact crop.
   if(portrait.sprite){const{columns,rows,column,row}=portrait.sprite;face.style.backgroundSize=(columns*100)+'% '+(rows*100)+'%';face.style.backgroundPosition=(columns>1?column/(columns-1)*100:50)+'% '+(rows>1?row/(rows-1)*100:50)+'%';}
  }wrap.append(face);wrap.setAttribute('role','img');wrap.setAttribute('aria-label',member?.name||'Avatar du membre');
  if(!member?.id)return wrap;wrap.dataset.dobbyAvatar=member.id;
  try{const summary=E.rewardSummary(member.id);if(!summary){wrap.title='Grade en cours de chargement';return wrap;}const grade=summary.grade,badge=text('span','','dobby-rune-badge');badge.setAttribute('aria-hidden','true');badge.append(emblem(grade));wrap.append(badge);wrap.dataset.runeShape=grade.shape;wrap.dataset.runeMaterial=grade.material;wrap.dataset.runeGrade=String(grade.index);wrap.dataset.runeTotal=String(summary.total);const label=(member.name||'Membre')+' · '+grade.label+' · '+summary.total+' runes'+(grade.provisional?' · grade provisoire':'');wrap.setAttribute('aria-label',label);wrap.title=label;}catch{wrap.title='Historique de runes indisponible';}
  return wrap;
 }
 function runeAction(member,transport,target=null){
  const action=text('button',target?'Corriger cette attribution':'Accorder un bonus exceptionnel','dobby-rune-entry-action');
  action.type='button';
  action.addEventListener('click',()=>{
   const dialog=text('dialog','','dv7-participant-dialog dobby-rune-entry-form'),form=text('form',''),status=text('p','');
   const heading=text('h2',target?'Corriger cette attribution':'Accorder un bonus exceptionnel');
   heading.id='dobby-rune-entry-title';dialog.setAttribute('aria-labelledby',heading.id);
   status.setAttribute('role','status');
   const amountLabel=text('label',target?'Montant correct en Runes':'Montant du bonus en Runes');
   const amount=text('input','');amount.type='text';amount.inputMode='numeric';amount.pattern='[0-9]+';amount.required=true;
   if(target)amount.value=String(target.amount);
   amountLabel.append(amount);
   const reasonLabel=text('label','Motif'),reason=text('textarea','');
   reason.required=true;reason.maxLength=240;reasonLabel.append(reason);
   const submit=text('button',target?'Enregistrer la correction':'Accorder le bonus');submit.type='submit';
   const cancel=text('button','Annuler');cancel.type='button';cancel.addEventListener('click',()=>dialog.close());
   form.append(heading,amountLabel,reasonLabel,submit,cancel,status);
   dialog.append(form);document.body.append(dialog);
   dialog.addEventListener('close',()=>{dialog.remove();action.focus();},{once:true});
   dialog.addEventListener('cancel',event=>{if(submit.disabled)event.preventDefault();});
   form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(submit.disabled)return;
    const intent={kind:target?'correction':'bonus',memberId:member.id,amount:Number(amount.value),reason:reason.value};
    if(target)Object.assign(intent,{targetEventId:target.eventId,expectedAmount:target.amount});
    submit.disabled=true;cancel.disabled=true;
    try{
     const commit=()=>transport.recordRunes(intent);
     await (window.DobbyStitchV7?.withMissionSound?.(commit,target?'confirm':'reward')??commit());
     dialog.close();
     const current=[...document.querySelectorAll('[data-rune-profile]')].find(el=>el.dataset.runeProfile===member.id);
     if(!current)return;
     const updated=profile(member),confirmation=text('p',target?'Correction enregistrée.':'Bonus accordé.');
     confirmation.setAttribute('role','status');confirmation.tabIndex=-1;
     updated.append(confirmation);current.replaceWith(updated);confirmation.focus();
    }catch(error){status.textContent=error.message;submit.disabled=false;cancel.disabled=false;}
   });
   dialog.showModal();
  });
  return action;
 }
 function rewardAction(member,transport,goal){
  const action=text('button',goal?'Confirmer la récompense':'Définir le prochain palier','dobby-rune-entry-action');
  action.type='button';
  action.addEventListener('click',()=>{
   const dialog=text('dialog','','dv7-participant-dialog dobby-rune-entry-form'),form=text('form',''),notice=text('p','');
   const heading=text('h2',action.textContent);heading.id='dobby-reward-heading';dialog.setAttribute('aria-labelledby',heading.id);
   notice.setAttribute('role','alert');
   const titleLabel=text('label','Récompense'),title=text('input','');title.type='text';title.maxLength=160;titleLabel.append(title);
   const threshold=text('input',''),mode=text('select','');
   form.append(heading);
   if(goal){
    if(goal.mode==='announced')form.append(text('p',goal.title));
    else{titleLabel.firstChild.textContent='Récompense à révéler (facultatif si déjà préparée)';form.append(titleLabel);}
   }else{
    const minimum=text('label','Seuil de Runes cumulées');threshold.type='text';threshold.inputMode='numeric';threshold.pattern='[0-9]+';threshold.required=true;
    const display=text('label','Visibilité');mode.append(new Option('Annoncée','announced'),new Option('Surprise','surprise'));
    minimum.append(threshold);display.append(mode);form.append(minimum,display,titleLabel);
    function visibility(){title.required=mode.value==='announced';titleLabel.firstChild.textContent=title.required?'Récompense annoncée':'Surprise à préparer (facultatif)';}
    mode.addEventListener('change',visibility);visibility();
   }
   const submit=text('button',goal?'Confirmer':'Enregistrer le palier'),cancel=text('button','Annuler');
   submit.type='submit';cancel.type='button';cancel.onclick=()=>dialog.close();
   form.append(submit,cancel,notice);dialog.append(form);document.body.append(dialog);
   dialog.addEventListener('close',()=>{dialog.remove();action.focus();},{once:true});
   dialog.addEventListener('cancel',event=>{if(submit.disabled)event.preventDefault();});
   form.addEventListener('submit',async event=>{
    event.preventDefault();if(submit.disabled)return;
    submit.disabled=true;cancel.disabled=true;
    const description=title.value.trim();
    const intent=goal?{kind:'reward-confirm',memberId:member.id,goalId:goal.id}:
     {kind:'reward-set',memberId:member.id,threshold:Number(threshold.value),mode:mode.value};
    if(description)intent.title=description;
    try{
     const commit=()=>transport.recordProgress(intent);
     await (window.DobbyStitchV7?.withMissionSound?.(commit,goal?'reward':'confirm')??commit());
     dialog.close();
     const current=[...document.querySelectorAll('[data-rune-profile]')].find(el=>el.dataset.runeProfile===member.id);
     if(current)current.replaceWith(profile(member));
     window.DobbyStitchV7?.refresh();
    }catch(error){notice.textContent=error.message;submit.disabled=false;cancel.disabled=false;}
   });
   dialog.showModal();
  });
  return action;
 }
 function rewardPanel(member,transport,summary){
  const state=transport?.readProgress?.();
  if(member.memberCategory!=='child'||!state||state.category==='child'&&state.memberId!==member.id)return null;
  const goal=Object.hasOwn(state.goals,member.id)?state.goals[member.id]:null;
  const box=text('section','','dobby-rune-reward');box.append(text('h3','Récompense'));
  if(!goal){
   box.append(text('p','Aucun palier actif.'));
   if(state.category==='parent')box.append(rewardAction(member,transport,null));
  }else{
   box.append(text('strong',goal.mode==='surprise'?'Récompense mystère':goal.title));
   if(goal.unlocked){
    box.append(text('p','Débloquée · En attente de confirmation parentale'));
    if(state.category==='parent')box.append(rewardAction(member,transport,goal));
   }else{
    const bar=document.createElement('progress');bar.max=goal.threshold;bar.value=Math.min(summary.total,goal.threshold);
    bar.setAttribute('aria-label','Progression vers la récompense');box.append(bar,text('p',summary.total+' / '+goal.threshold+' Runes cumulées'));
   }
  }
  const past=state.rewards.filter(row=>row.memberId===member.id);
  if(past.length){
   const history=text('details','');history.open=true;history.append(text('summary','Récompenses accordées'));
   const items=text('ul','');for(const row of past)items.append(text('li',row.title+' · '+row.threshold+' Runes · '+new Date(row.date).toLocaleDateString('fr-BE')));
   history.append(items);box.append(history);
  }
  return box;
 }
 function profile(member){
  const box=text('section','','dobby-rune-profile');box.dataset.runeProfile=member.id;box.append(text('h2','Runes & progression','font-headline-sm text-primary'));
  try{const summary=E.rewardSummary(member.id);if(!summary){box.append(text('p','Runes en cours de chargement.'));return box;}const {grade}=summary;box.append(text('strong',summary.total+' runes','dobby-rune-total'),text('p',grade.label));if(grade.provisional)box.append(text('small','Grades et seuils provisoires','dobby-rune-provisional'));
   if(grade.next){const progress=document.createElement('progress');progress.max=grade.progress.max;progress.value=grade.progress.value;progress.setAttribute('aria-label',grade.progress.remaining+' runes avant '+grade.next.label);box.append(progress,text('p',grade.progress.remaining+' runes avant '+grade.next.label));}else box.append(text('p',grade.provisional?'Dernier grade provisoire atteint.':'Dernier grade atteint.'));
   if(summary.pending)box.append(text('p',summary.pending+' runes en attente de synchronisation','dobby-rune-pending'));
   if(summary.settledElsewhere)box.append(text('p','Une mission a déjà reçu sa récompense avec une autre attribution.'));
   if(!summary.shared)box.append(text('small','Gains conservés sur cet appareil.'));else box.append(text('small',summary.syncStatus));
   const transport=E.win().DobbySharedRunesV3,canManage=transport?.canManageRunes?.()===true;
   if(canManage&&member.memberCategory==='child')box.append(runeAction(member,transport));
   const rewards=rewardPanel(member,transport,summary);if(rewards)box.append(rewards);
   const history=text('details','');history.append(text('summary','Historique des gains et annulations'));
   const list=text('ul',''),correctable=new Map((summary.correctable||[]).map(entry=>[entry.eventId,entry]));
   const actors=summary.credits.some(row=>row.actorMemberId)?E.read().members:[];
   for(const credit of [...summary.credits].sort((a,b)=>b.date.localeCompare(a.date)||String(a.eventId||a.missionId).localeCompare(String(b.eventId||b.missionId)))){
    const labels={reversal:'Annulation',bonus:'Bonus exceptionnel',correction:'Correction'};
    const item=text('li',(labels[credit.kind]||'Gain')+(credit.title?' — '+credit.title:''));
    const eventId=credit.eventId||credit.missionId;item.dataset.runeEvent=eventId;
    const amount=credit.kind==='correction'?credit.previousAmount+' → '+credit.amount:(credit.kind==='reversal'?'−':'+')+credit.amount;
    item.append(text('span',amount+' runes · '+new Date(credit.date).toLocaleDateString('fr-BE')));
    if(credit.actorMemberId){
     const actor=actors.find(person=>person.id===credit.actorMemberId);
     item.append(text('p',[credit.reason,actor?.name||credit.actorMemberId].filter(Boolean).join(' · ')));
    }
    if(credit.targetEventId)item.append(text('small','Attribution corrigée '+credit.targetEventId));
    const target=correctable.get(eventId);
    if(canManage&&target)item.append(runeAction(member,transport,target));
    list.append(item);
   }
   if(!list.children.length)list.append(text('li','Aucun gain enregistré.'));
   history.append(list);box.append(history);
  }catch{box.append(text('p','Historique de runes indisponible. Les données sont conservées.'));}return box;
 }
 return Object.freeze({create,profile});
})();
