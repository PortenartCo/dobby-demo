/* E06 deterministic rules only, from the immutable supplied JSON. No storage,
   clock, random source, user identity or presentation order participates. */
const catalogue=Object.freeze({house:Object.freeze({gryffondor:'gryffindor',serpentard:'slytherin',serdaigle:'ravenclaw',poufsouffle:'hufflepuff'}),patronus:Object.freeze({cerf:'stag',loutre:'otter',renard:'fox',loup:'wolf',chat:'cat',hibou:'owl',cheval:'horse',lievre:'hare',cygne:'swan',lynx:'lynx',blaireau:'badger',dauphin:'dolphin'})});
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function createScoring(raw){
 const cfg=freeze(JSON.parse(JSON.stringify(raw))),H=cfg.house,P=cfg.patronus;
 function indices(kind,ids){const rules=cfg[kind];if(!Array.isArray(ids)||ids.length!==rules.baseQuestionCount)throw Error('Nombre de réponses incomplet.');return ids.map((id,i)=>{const n=rules.questions[i].answers.findIndex(a=>a.id===id);if(n<0)throw Error('Identifiant de réponse invalide.');return n;});}
 function extra(rules,id){const n=rules.questions[rules.baseQuestionCount].answers.findIndex(a=>a.id===id);if(n<0)throw Error('Réponse complémentaire invalide.');return n;}
 function winner(scores,weighted,picks,allowed=scores.map((_,i)=>i)){let top=Math.max(...allowed.map(i=>scores[i])),possible=allowed.filter(i=>scores[i]===top);if(possible.length===1)return possible[0];top=Math.max(...possible.map(i=>weighted[i]));possible=possible.filter(i=>weighted[i]===top);return possible[picks.reduce((sum,answer,q)=>sum+(q+1)*(answer+1),0)%possible.length];}
 function house(ids,optional){
  const picks=indices('house',ids),scores=H.labels.map(()=>0),secondary=H.labels.map(()=>0);
  function add(q,n){const answer=H.questions[q].answers[n];H.labels.forEach((label,k)=>{const weights=H.weights[label],v=H.axisPoints.primary*weights[answer.primary]+H.axisPoints.secondary*weights[answer.secondary];scores[k]+=v;secondary[k]+=H.secondaryTieWeights[q]*v;});}
  picks.forEach((v,q)=>add(q,v));const top=[...scores].sort((a,b)=>b-a),need=top[0]-top[1]<=H.extraQuestionIfTopGapAtMost,allowed=need?scores.map((s,i)=>s>=top[0]-1?i:-1).filter(i=>i>=0):H.labels.map((_,i)=>i);
  if(need&&optional===undefined)return {needs_extra:true,possible:allowed.map(i=>H.labels[i])};
  if(need){const n=extra(H,optional);picks.push(n);add(H.baseQuestionCount,n);}return {needs_extra:need,result:H.labels[winner(scores,secondary,picks,allowed)]};
 }
 function patronus(ids,optional){
  const picks=indices('patronus',ids),m=P.modes.map(()=>0),u=P.nuances.map(()=>0),mt=P.modes.map(()=>0),ut=P.nuances.map(()=>0);
  function add(q,n){const row=P.questions[q].answers[n];for(const [scores,weighted,labels,pre,sec]of [[m,mt,P.modes,'modePrimary','modeSecondary'],[u,ut,P.nuances,'nuancePrimary','nuanceSecondary']]){const a=labels.indexOf(row[pre]),b=labels.indexOf(row[sec]);scores[a]+=P.axisPoints.primary;scores[b]+=P.axisPoints.secondary;weighted[a]+=P.secondaryTieWeights[q]*P.axisPoints.primary;weighted[b]+=P.secondaryTieWeights[q]*P.axisPoints.secondary;}}
  picks.forEach((v,q)=>add(q,v));const tie=s=>s.filter(x=>x===Math.max(...s)).length>1,need=tie(m)||tie(u);if(need&&optional===undefined)return {needs_extra:true};if(need){const n=extra(P,optional);picks.push(n);add(P.baseQuestionCount,n);}const im=winner(m,mt,picks),ju=winner(u,ut,picks);return {needs_extra:need,result:P.animalGrid[im][ju],mode:P.modes[im],nuance:P.nuances[ju]};
 }
 function catalogueId(kind,label){const id=catalogue[kind]?.[label];if(!id)throw Error('Résultat non pris en charge.');return id;}
 return Object.freeze({house,patronus,catalogueId,version:cfg.globalRules.algorithmVersion,config:cfg});
}
