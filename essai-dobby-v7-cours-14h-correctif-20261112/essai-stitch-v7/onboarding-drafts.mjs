/* Temporary ceremony state in the existing native metadata store. Not a member
   registry or canonical writer. One atomic metadata record per account/household. */
export const STEPS=Object.freeze(['onboarding-foyer','onboarding-identity','onboarding-house','onboarding-house-result','onboarding-patronus','onboarding-patronus-result','onboarding-final']);
const clone=x=>JSON.parse(JSON.stringify(x)),empty=()=>({step:'onboarding-identity',index:0,house:[],patronus:[],identity:{},done:{house:false,patronus:false}});
export function createDrafts({context,meta,updateMeta}){
 let token,owner,container,current,memberId,serial=0;
 const ownerOf=c=>({user:c.user,household:c.household}),keyOf=o=>'e06-drafts:v1:'+JSON.stringify([o.user,o.household]),memberKey=id=>id===null?'new':'member:'+id;
 function guard(){if(!token||JSON.stringify(context())!==token)throw Error('Le contexte utilisateur ou foyer a changé. Aucune modification ne sera enregistrée.');}
 function validateDraft(d){if(!d||typeof d!=='object'||!STEPS.includes(d.step)||!Number.isInteger(d.index)||d.index<0||d.index>6||!d.identity||typeof d.identity!=='object'||Array.isArray(d.identity)||!d.done||typeof d.done.house!=='boolean'||typeof d.done.patronus!=='boolean')throw Error('Brouillon de cérémonie incompatible ; données conservées.');for(const[k,max]of [['house',7],['patronus',6]])if(!Array.isArray(d[k])||d[k].length>max||d[k].some(x=>!['A','B','C','D',null].includes(x)))throw Error('Réponses temporaires incompatibles ; données conservées.');for(const value of Object.values(d.identity))if(typeof value!=='string'||value.length>160)throw Error('Identité temporaire incompatible.');}
 function validate(raw,o){if(raw===null||raw===undefined)return{version:1,algorithmVersion:'e06-v1',owner:o,active:null,drafts:{}};if(raw.version!==1||raw.algorithmVersion!=='e06-v1'||JSON.stringify(raw.owner)!==JSON.stringify(o)||!raw.drafts||typeof raw.drafts!=='object'||Array.isArray(raw.drafts))throw Error('Brouillon de cérémonie incompatible ; aucune donnée remplacée.');for(const d of Object.values(raw.drafts))validateDraft(d);if(raw.active&&(!STEPS.includes(raw.active.step)||raw.active.memberId!==null&&typeof raw.active.memberId!=='string'))throw Error('Reprise de cérémonie incompatible.');return clone(raw);}
 async function load(id=null){if(id!==null&&(typeof id!=='string'||!id||id.length>120))throw Error('Identifiant de membre invalide.');const ticket=++serial,c=context(),o=ownerOf(c),captured=JSON.stringify(c),raw=await meta(keyOf(o));if(ticket!==serial||JSON.stringify(context())!==captured)throw Error('Le contexte de cérémonie a changé.');const next=validate(raw,o);token=captured;owner=o;container=next;memberId=id;current=clone(next.drafts[memberKey(id)]||empty());return read();}
 function read(){guard();return clone(current);}
 async function update(change){
  guard();const capturedSerial=serial,capturedMember=memberId,capturedOwner=clone(owner),capturedKey=memberKey(memberId),expected=clone(container.drafts[capturedKey]||empty()),draft=clone(current);
  const updated=await updateMeta(keyOf(capturedOwner),raw=>{
   guard();if(serial!==capturedSerial||memberId!==capturedMember)throw Error('Le membre du brouillon a changé.');
   const latest=validate(raw,capturedOwner);if(JSON.stringify(latest.drafts[capturedKey]||empty())!==JSON.stringify(expected))throw Error('Ce brouillon a changé dans un autre onglet. Rechargez-le avant de poursuivre.');
   change(draft);validateDraft(draft);latest.drafts[capturedKey]=draft;latest.active={memberId:capturedMember,step:draft.step};return latest;
  });
  guard();if(serial!==capturedSerial||memberId!==capturedMember)throw Error('Le membre du brouillon a changé.');container=clone(updated);current=clone(draft);return read();
 }
 async function resume(){const c=context(),o=ownerOf(c),captured=JSON.stringify(c),raw=validate(await meta(keyOf(o)),o);if(JSON.stringify(context())!==captured)throw Error('Le contexte de reprise a changé.');return raw.active?clone(raw.active):null;}
 return Object.freeze({load,read,update,resume,guard,get memberId(){return memberId;},get owner(){return owner?clone(owner):null;}});
}
