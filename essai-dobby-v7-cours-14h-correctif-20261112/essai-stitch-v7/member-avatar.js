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
  const wrap=text('span','','dobby-member-avatar '+className),face=text('span',member?.avatar||'👤','dobby-avatar-face');face.setAttribute('aria-hidden','true');const portrait=window.DobbyMagicIdentity?.avatars.find(a=>a.id===member?.magicProfile?.avatarId&&a.available);if(portrait){face.textContent='';face.classList.add('dobby-avatar-portrait');face.dataset.avatarId=portrait.id;face.style.backgroundImage='url("'+portrait.asset+'")';face.style.backgroundPosition=(portrait.index%4/3*100)+'% '+(Math.floor(portrait.index/4)?83.333333:16.666667)+'%';}wrap.append(face);wrap.setAttribute('role','img');wrap.setAttribute('aria-label',member?.name||'Avatar du membre');
  if(!member?.id)return wrap;wrap.dataset.dobbyAvatar=member.id;
  try{const summary=E.rewardSummary(member.id);if(!summary){wrap.title='Grade en cours de chargement';return wrap;}const grade=summary.grade,badge=text('span','','dobby-rune-badge');badge.setAttribute('aria-hidden','true');badge.append(emblem(grade));wrap.append(badge);wrap.dataset.runeShape=grade.shape;wrap.dataset.runeMaterial=grade.material;wrap.dataset.runeGrade=String(grade.index);wrap.dataset.runeTotal=String(summary.total);const label=(member.name||'Membre')+' · '+grade.label+' · '+summary.total+' runes'+(grade.provisional?' · grade provisoire':'');wrap.setAttribute('aria-label',label);wrap.title=label;}catch{wrap.title='Historique de runes indisponible';}
  return wrap;
 }
 function profile(member){
  const box=text('section','','dobby-rune-profile');box.dataset.runeProfile=member.id;box.append(text('h2','Runes & progression','font-headline-sm text-primary'));
  try{const summary=E.rewardSummary(member.id);if(!summary){box.append(text('p','Runes en cours de chargement.'));return box;}const {grade}=summary;box.append(text('strong',summary.total+' runes','dobby-rune-total'),text('p',grade.label));if(grade.provisional)box.append(text('small','Grades et seuils provisoires','dobby-rune-provisional'));
   if(grade.next){const progress=document.createElement('progress');progress.max=grade.progress.max;progress.value=grade.progress.value;progress.setAttribute('aria-label',grade.progress.remaining+' runes avant '+grade.next.label);box.append(progress,text('p',grade.progress.remaining+' runes avant '+grade.next.label));}else box.append(text('p',grade.provisional?'Dernier grade provisoire atteint.':'Dernier grade atteint.'));
   if(summary.pending)box.append(text('p',summary.pending+' runes en attente de synchronisation','dobby-rune-pending'));
   if(summary.settledElsewhere)box.append(text('p','Une mission a déjà reçu sa récompense avec une autre attribution.'));
   if(!summary.shared)box.append(text('small','Gains conservés sur cet appareil.'));else box.append(text('small',summary.syncStatus));
   const history=document.createElement('details');history.append(text('summary','Historique des gains et annulations'));const list=document.createElement('ul');for(const credit of [...summary.credits].sort((a,b)=>b.date.localeCompare(a.date)||a.missionId.localeCompare(b.missionId))){const cancellation=credit.kind==='reversal',item=text('li',(cancellation?'Annulation — ':'Gain — ')+credit.title);item.dataset.runeEvent=credit.eventId||credit.missionId;item.append(text('span',(cancellation?'−':'+')+credit.amount+' runes · '+new Date(credit.date).toLocaleDateString('fr-BE')));list.append(item);}if(!list.children.length)list.append(text('li','Aucun gain enregistré.'));history.append(list);box.append(history);
  }catch{box.append(text('p','Historique de runes indisponible. Les données sont conservées.'));}return box;
 }
 return Object.freeze({create,profile});
})();
