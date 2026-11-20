import {validV3MemberId} from './family-runes-core.mjs';

export const PARTICIPATION_ACTIONS = ['submit','approve','refuse','regularize'];
export const REWARD_ACTIONS = ['reward-set','reward-confirm'];
export const PROGRESS_KEYS = ['missionParticipation','runeGoals','runeRewards'];
export const isProgressIntent = intent => [...PARTICIPATION_ACTIONS,...REWARD_ACTIONS].includes(intent?.kind);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const missionKey = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const text = (value, max) => typeof value === 'string' && Boolean(value.trim()) && Array.from(value).length <= max;
const kindOfGoal = mode => ['announced','surprise'].includes(mode);

export function normalizeProgressIntent(intent) {
  const {kind,memberId,missionId,note,mode,threshold,title,goalId} = intent;
  if (!validV3MemberId(memberId)) throw Error('Enfant du foyer requis');
  let fields;
  if (PARTICIPATION_ACTIONS.includes(kind)) {
    fields = ['kind','memberId','missionId',...(['refuse','regularize'].includes(kind)?['note']:[])];
    if (!missionKey(missionId) || note !== undefined && !text(note,240)) throw Error('Participation ou commentaire invalide');
  } else {
    fields = ['kind','memberId','title',...(kind==='reward-set'?['mode','threshold']:['goalId'])];
    if (title !== undefined && !text(title,160) ||
        kind==='reward-set' && (!kindOfGoal(mode)||!positive(threshold)||mode==='announced'&&!text(title,160)) ||
        kind==='reward-confirm' && !uuid(goalId)) throw Error('Récompense ou seuil invalide');
  }
  if (Object.keys(intent).some(key => !fields.includes(key))) throw Error('Champ de participation ou de récompense interdit');
  return {...intent,...(note?{note:note.trim()}:{}),...(title?{title:title.trim()}: {})};
}

export function participationStatus(mission,last,today) {
  if (last?.status==='pending' || last?.status==='credited') return last.status;
  const occurrence = mission.occurrenceDate || mission.recurrence?.rules?.[0]?.start;
  if (occurrence && occurrence > today) return 'future';
  const deadline = mission.due || occurrence;
  if (deadline && deadline < today) return 'missed';
  return last?.status || 'open';
}

export function validateProgress(payload, prior, equal) {
  const entries = payload.missionParticipation ?? [];
  const rewards = payload.runeRewards ?? [];
  const goals = payload.runeGoals ?? {};
  if (!Array.isArray(entries)||!Array.isArray(rewards)||!object(goals)) throw Error('Registre de progression invalide');
  const credits = new Map(payload.runeCredits.map(row=>[row.eventId,row]));
  for (const entry of entries) {
    if (!object(entry)||!uuid(entry.id)||!missionKey(entry.missionId)||!validV3MemberId(entry.memberId)||
        !PARTICIPATION_ACTIONS.includes(entry.action)||!['pending','refused','credited'].includes(entry.status)||
        !positive(entry.revision)||!Number.isSafeInteger(entry.amount)||entry.amount<0) throw Error('Participation confirmée invalide');
    if (entry.status==='credited') {
      const row = credits.get(entry.creditId);
      if (!row||row.participationId!==entry.id||row.sourceMissionId!==entry.missionId||row.memberId!==entry.memberId||
          row.amount!==entry.amount||row.revision!==entry.revision) throw Error('Crédit de participation non confirmé');
    }
  }
  for (const [member,goal] of Object.entries(goals)) {
    if (!validV3MemberId(member)||!object(goal)||!uuid(goal.id)||!positive(goal.threshold)||!kindOfGoal(goal.mode)||
        typeof goal.unlocked!=='boolean'||(goal.mode==='announced'?!text(goal.title,160):Object.hasOwn(goal,'title')))
      throw Error('Palier confirmé invalide ou surprise exposée');
  }
  for (const reward of rewards) {
    if (!object(reward)||!uuid(reward.id)||!uuid(reward.confirmationId)||!validV3MemberId(reward.memberId)||
        !positive(reward.threshold)||!kindOfGoal(reward.mode)||!text(reward.title,160)||!positive(reward.revision))
      throw Error('Récompense confirmée invalide');
  }
  for (const [name,rows] of [['missionParticipation',entries],['runeRewards',rewards]]) {
    if (new Set(rows.map(row=>row.id)).size!==rows.length ||
        (prior?.[name]||[]).some((row,index)=>!equal(rows[index],row))) throw Error('Historique de progression réécrit');
  }
  for (const [member,goal] of Object.entries(prior?.runeGoals||{})) {
    const current = goals[member];
    if (goal.id===current?.id) {
      const {unlocked:previousUnlocked,...definition}=goal,{unlocked:nextUnlocked,...next}=current;
      if (!equal(definition,next)) throw Error('Palier confirmé réécrit');
    } else if (!rewards.some(row=>row.id===goal.id&&row.memberId===member)) {
      throw Error('Palier actif supprimé sans confirmation');
    }
  }
}

export function validateProgressReceipt(payload, intent, operationId, revision) {
  let valid;
  if (PARTICIPATION_ACTIONS.includes(intent.kind)) {
    valid=payload.missionParticipation?.some(row=>row.id===operationId&&row.revision===revision&&
      row.action===intent.kind&&row.memberId===intent.memberId&&row.missionId===intent.missionId);
  } else if (intent.kind==='reward-set') {
    valid=[payload.runeGoals?.[intent.memberId],...(payload.runeRewards||[]).filter(row=>row.memberId===intent.memberId)]
      .some(row=>row?.id===operationId&&row.threshold===intent.threshold&&row.mode===intent.mode&&
        (intent.mode!=='announced'||row.title===intent.title));
  } else {
    valid=payload.runeRewards?.some(row=>row.id===intent.goalId&&row.confirmationId===operationId&&
      row.memberId===intent.memberId&&row.revision===revision);
  }
  if (!valid) throw Error('Progression ou récompense non confirmée ; opération conservée');
}
