/* UI-agnostic local cooking timers. No intervals, audio, network or app globals. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DobbyCuisineTimers=api;})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
 const MAX_SECONDS=86400,STATES=['idle','running','paused','finished'];let sequence=0;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const seconds=x=>{if(typeof x!=='number'||!Number.isFinite(x)||x<=0||x>MAX_SECONDS)throw Error('Durée invalide : plus de zéro et 24 heures maximum.');return x;};
 const text=(x,label)=>{if(typeof x!=='string'||!x.trim()||x.length>300)throw Error(label+' invalide.');return x.trim();};
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 function parseDurations(input){
  if(typeof input!=='string')return [];const inputText=input.toLocaleLowerCase('fr').replace(/\u00a0/g,' '),n='(\\d+(?:[.,]\\d+)?)',u='(heures?|h|minutes?|mins?\\.?|mn|secondes?|secs?\\.?|s)',found=[],spans=[];
  const factor=unit=>/^(h|heure)/.test(unit)?3600:/^(min|mn)/.test(unit)?60:1,number=x=>Number(x.replace(',','.'));
  const add=(match,value)=>{const start=match.index,end=start+match[0].length;if(start>0&&/[\d.,−–—-]/.test(inputText[start-1])||spans.some(([a,b])=>start<b&&end>a))return;spans.push([start,end]);if(typeof value==='number'?value>0&&value<=MAX_SECONDS:value.min>0&&value.min<=value.max&&value.max<=MAX_SECONDS)found.push({start,value});};
  const range=new RegExp('(?:entre\\s+)?\\b'+n+'\\s*'+u+'?\\s*(à|a|[-–—]|et)\\s*'+n+'\\s*'+u+'\\b','g');
  for(const m of inputText.matchAll(range)){if(m[3]==='et'&&!/^entre\s/.test(m[0]))continue;add(m,{min:number(m[1])*factor(m[2]||m[5]),max:number(m[4])*factor(m[5])});}
  const compounds=[
   {regex:new RegExp('\\b'+n+'\\s*(?:heures?|h)\\s*'+n+'\\s*(?:secondes?|secs?\\.?|s)\\b','g'),value:m=>number(m[1])*3600+number(m[2])},
   {regex:new RegExp('\\b'+n+'\\s*(?:heures?|h)\\s*'+n+'\\s*(?:minutes?|mins?\\.?|mn)?(?!\\s*(?:secondes?|secs?|s)\\b)(?:\\s*'+n+'\\s*(?:secondes?|secs?\\.?|s)\\b)?(?![\\p{L}\\p{N}.,])','gu'),value:m=>number(m[1])*3600+number(m[2])*60+(m[3]?number(m[3]):0)},
   {regex:new RegExp('\\b'+n+'\\s*(?:minutes?|mins?\\.?|mn)\\s*'+n+'\\s*(?:secondes?|secs?\\.?|s)\\b','g'),value:m=>number(m[1])*60+number(m[2])}
  ];
  for(const {regex,value}of compounds)for(const m of inputText.matchAll(regex))add(m,value(m));
  for(const m of inputText.matchAll(new RegExp('\\b'+n+'\\s*'+u+'\\b','g')))add(m,number(m[1])*factor(m[2]));
  return found.sort((a,b)=>a.start-b.start).map(x=>x.value);
 }
 function createStore({storage,key,now=Date.now,max=32}={}){
  if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||typeof storage.removeItem!=='function')throw Error('Stockage local indisponible.');text(key,'Clé de stockage');if(typeof now!=='function'||!Number.isInteger(max)||max<1||max>256)throw Error('Configuration des minuteurs invalide.');
  const time=()=>{const t=now();if(!finite(t)||t<0)throw Error('Horloge invalide.');return t;};
  function load(){const raw=storage.getItem(key);if(raw===null)return {raw,data:{format:'dobby-cuisine-timers',version:1,revision:0,timers:[]}};let data;try{data=JSON.parse(raw);}catch{throw Error('Les minuteurs locaux sont illisibles ; aucune donnée n’a été remplacée.');}
   if(!data||data.format!=='dobby-cuisine-timers'||data.version!==1||!Array.isArray(data.timers)||data.timers.length>max||!Number.isInteger(data.revision)||data.revision<0)throw Error('Registre de minuteurs invalide ; aucune donnée n’a été remplacée.');
   const ids=new Set();for(const t of data.timers){if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.name!=='string'||typeof t.recipeId!=='string'||!['classic','tm5'].includes(t.method)||!Number.isInteger(t.stepIndex)||t.stepIndex<0||t.stepIndex>=80||!STATES.includes(t.state)||!finite(t.seconds)||t.seconds<=0||t.seconds>MAX_SECONDS||!finite(t.remainingSeconds)||t.remainingSeconds<0||t.remainingSeconds>MAX_SECONDS||typeof t.notified!=='boolean'||typeof t.acknowledged!=='boolean'||!Number.isInteger(t.run)||t.run<0||t.state==='running'&&(!finite(t.deadline)||t.deadline<0))throw Error('Minuteur local invalide ; aucune donnée n’a été remplacée.');ids.add(t.id);}return{raw,data};
  }
  const remaining=(t,at)=>t.state==='running'?Math.max(0,(t.deadline-at)/1000):t.remainingSeconds;
  const view=(t,at)=>({...t,remainingSeconds:remaining(t,at),state:t.state==='running'&&t.deadline<=at?'finished':t.state,eventId:t.id+':'+t.run});
  function finish(t,at){if(t.state==='running'&&t.deadline<=at){t.finishedAt=t.deadline;t.state='finished';t.remainingSeconds=0;t.deadline=null;}}
  function persist(data,raw){try{storage.setItem(key,JSON.stringify(data));}catch(error){let restored=false;try{if(storage.getItem(key)!==raw){if(raw===null)storage.removeItem(key);else storage.setItem(key,raw);}restored=storage.getItem(key)===raw;}catch{}if(!restored)throw Error('Enregistrement des minuteurs refusé ; la restauration locale ne peut pas être confirmée : '+error.message);throw error;}}
  function mutate(operation){const {raw,data}=load(),before=JSON.stringify(data),at=time(),result=operation(data,at);if(JSON.stringify(data)!==before){data.revision++;persist(data,raw);}return copy(result);}
  function change(id,operation){return mutate((data,at)=>{const t=data.timers.find(t=>t.id===id);if(!t)throw Error('Minuteur introuvable.');operation(t,at);return view(t,at);});}
  function list(){const {data}=load(),at=time();return data.timers.map(t=>view(t,at));}
  function add(values){const name=text(values?.name,'Nom du minuteur'),recipeId=text(values?.recipeId,'Recette'),duration=seconds(values?.seconds),method=values.method,stepIndex=values.stepIndex;if(!['classic','tm5'].includes(method)||!Number.isInteger(stepIndex)||stepIndex<0||stepIndex>=80)throw Error('Contexte d’étape invalide.');
   return mutate((data,at)=>{if(data.timers.length>=max)throw Error('Nombre maximum de minuteurs atteint ('+max+').');const random=typeof crypto==='object'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():'timer-'+at.toString(36)+'-'+(++sequence).toString(36)+'-'+Math.random().toString(36).slice(2);let id=random;while(data.timers.some(t=>t.id===id))id=random+'-'+(++sequence).toString(36);const t={id,name,recipeId,method,stepIndex,seconds:duration,remainingSeconds:duration,state:'idle',deadline:null,notified:false,acknowledged:false,run:0};data.timers.push(t);return view(t,at);});
  }
  function start(id){return change(id,(t,at)=>{finish(t,at);if(t.state==='running')return;if(t.state==='finished')t.remainingSeconds=t.seconds;if(t.state!=='paused')t.run++;t.state='running';t.deadline=at+t.remainingSeconds*1000;t.notified=false;t.acknowledged=false;delete t.finishedAt;});}
  function pause(id){return change(id,(t,at)=>{finish(t,at);if(t.state!=='running')return;t.remainingSeconds=remaining(t,at);t.state='paused';t.deadline=null;});}
  function resume(id){return change(id,(t,at)=>{if(t.state!=='paused')return;t.state='running';t.deadline=at+t.remainingSeconds*1000;});}
  function reset(id){return change(id,t=>{t.state='idle';t.remainingSeconds=t.seconds;t.deadline=null;t.notified=false;t.acknowledged=false;delete t.finishedAt;});}
 function adjust(id,delta){if(!finite(delta))throw Error('Ajustement de durée invalide.');return change(id,(t,at)=>{finish(t,at);const left=Math.max(0,remaining(t,at)+delta);if(left>MAX_SECONDS)throw Error('Durée maximale de 24 heures dépassée.');if(delta===0||t.state==='finished'&&left===0)return;const revived=t.state==='finished'&&left>0;t.remainingSeconds=left;if(left===0){t.state='finished';t.deadline=null;}else if(t.state==='running')t.deadline=at+left*1000;else if(revived){t.state='paused';t.run++;}t.notified=false;t.acknowledged=false;});}
  function setDuration(id,duration){seconds(duration);return change(id,(t,at)=>{t.seconds=duration;t.remainingSeconds=duration;if(t.state==='running')t.deadline=at+duration*1000;else{t.deadline=null;if(t.state==='finished')t.state='idle';}t.notified=false;t.acknowledged=false;delete t.finishedAt;});}
  function remove(id){return mutate(data=>{const at=data.timers.findIndex(t=>t.id===id);if(at<0)return false;data.timers.splice(at,1);return true;});}
  function ack(id){return change(id,(t,at)=>{finish(t,at);if(t.state==='finished'){t.notified=true;t.acknowledged=true;}});}
  function tick(){return mutate((data,at)=>{const ended=[];for(const t of data.timers){finish(t,at);if(t.state==='finished'&&!t.notified&&!t.acknowledged){t.notified=true;ended.push(view(t,at));}}return ended;});}
  return Object.freeze({list,add,start,pause,resume,reset,remove,adjust,setDuration,ack,tick});
 }
 return Object.freeze({createStore,parseDurations});
});
