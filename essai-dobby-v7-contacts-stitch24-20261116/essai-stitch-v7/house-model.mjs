/* Pure Maison compatibility and UTC calendar calculations. No persistence. */
const copy = value => Array.isArray(value) ? value.map(copy) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).filter(([key]) => !['__proto__','constructor','prototype'].includes(key)).map(([key,child]) => [key,copy(child)])) : value;
const absent = value => value === undefined || value === null || value === '';
function utc(year,month,day) {
  const date = new Date(0);
  date.setUTCFullYear(year,month,day); date.setUTCHours(12,0,0,0);
  return date;
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year,month,day] = value.split('-').map(Number), date = utc(year,month-1,day);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && date.getUTCFullYear() === year && date.getUTCMonth() === month-1 && date.getUTCDate() === day;
}
/** Add calendar months directly; only clamp a day absent in the target month. */
export function addMonths(value,months) {
  if (!validDate(value) || !Number.isSafeInteger(months) || months < 0) return null;
  const [year,month,day] = value.split('-').map(Number), target = year*12+month-1+months;
  if (!Number.isSafeInteger(target) || target > 9999*12+11) return null;
  const y = Math.floor(target/12), m = target%12, last = utc(y,m+1,0).getUTCDate();
  return utc(y,m,Math.min(day,last)).toISOString().slice(0,10);
}
/** A legacy declaration is a display plan, never an invented historical log. */
export function plans(row = {}) {
  if (Array.isArray(row.maintenancePlans)) return copy(row.maintenancePlans);
  if (!['lastMaintenance','nextMaintenance','interval'].some(key => !absent(row[key]))) return [];
  const amount = Number(row.interval);
  return [{id:'legacy-'+row.id,title:'Entretien',lastKnownDate:row.lastMaintenance||'',
    interval:{value:Number.isSafeInteger(amount)&&amount>0?amount:null,unit:'months'},
    nextDateOverride:row.nextMaintenance||'',usualProvider:row.provider||'',notes:'',sourceRefs:[],legacy:true}];
}
export function due(row,plan,logs = []) {
  let lastDate = validDate(plan?.lastKnownDate) ? plan.lastKnownDate : null;
  for (const log of logs) {
    if (!row?.id || !plan?.id || log?.itemId !== row.id || log?.planId !== plan.id || log.performed === false || !validDate(log.date)) continue;
    if (!lastDate || log.date > lastDate) lastDate = log.date;
  }
  if (!absent(plan?.nextDateOverride)) return {date:validDate(plan.nextDateOverride)?plan.nextDateOverride:null,source:validDate(plan.nextDateOverride)?'explicit':null,lastDate};
  const interval = plan?.interval, amount = interval?.value;
  const months = Number.isSafeInteger(amount) && amount > 0 && ['months','years'].includes(interval.unit) ? amount*(interval.unit==='years'?12:1) : null;
  const date = lastDate && months !== null ? addMonths(lastDate,months) : null;
  return {date,source:date?'calculated':null,lastDate};
}
