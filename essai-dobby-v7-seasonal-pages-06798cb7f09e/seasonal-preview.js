/* Included only in the generated, isolated seasonal review directory. */
(()=>{
 'use strict';
 if(window!==top||!window.DobbyReview)return;
 const storageKey='seasonal-review-date';let selected='';
 try{selected=sessionStorage.getItem(storageKey)||'';}catch{}
 function valid(value){if(!value)return true;try{window.DobbySeasonalCalendar.resolve(value);return true;}catch{return false;}}
 window.DobbySeasonalReview=Object.freeze({civilDate:()=>valid(selected)?selected:''});
 document.addEventListener('DOMContentLoaded',()=>{
  if(!window.DobbySeasonalCalendar)return;
  const style=document.createElement('style');style.textContent='[data-seasonal-review]{position:fixed;left:8px;top:50px;z-index:12010;max-width:calc(100vw - 16px);border:1px solid #b99354;border-radius:10px;background:#241813;color:#f8e3c4;font:13px/1.4 sans-serif;box-shadow:0 3px 12px #0008}[data-seasonal-review] summary{padding:10px;cursor:pointer;min-height:24px}[data-seasonal-review] label{display:block;margin:8px 10px}[data-seasonal-review] input,[data-seasonal-review] select,[data-seasonal-review] button{box-sizing:border-box;max-width:250px;min-height:40px;padding:6px;margin:4px;color:#f8e3c4;background:#38291e;border:1px solid #b99354;border-radius:5px;font:inherit}[data-seasonal-review] output{display:block;max-width:250px;margin:10px}[data-seasonal-review] p{max-width:250px;margin:10px}';document.head.append(style);
  const panel=document.createElement('details');panel.dataset.seasonalReview='';
  panel.innerHTML='<summary>Revue des saisons</summary><label>Date fictive (Bruxelles)<br><input type="date" data-seasonal-review-date min="0001-01-01" max="9999-12-31"></label><label>Accès rapide<br><select aria-label="Période à prévisualiser"><option value="">Choisir une période</option></select></label><button type="button">Revenir à la date réelle</button><output aria-live="polite"></output><p>La date des tâches et l’horloge restent réelles. Fermez ce volet pour naviguer.</p>';
  const input=panel.querySelector('input'),presets=panel.querySelector('select'),output=panel.querySelector('output'),summary=panel.querySelector('summary');
  const dates={'Hiver':'2026-01-15','Magie · 31 janvier':'2027-01-31','Saint-Valentin':'2027-02-14','Carnaval':'2027-02-08','Printemps':'2027-03-20','Pâques':'2027-03-28','Été':'2027-06-15','Fête belge':'2027-07-21','Automne':'2026-09-15','Halloween':'2026-10-31','Thanksgiving':'2026-11-26','Saint-Nicolas':'2026-12-05','Noël 2026':'2026-12-25','Nouvel An':'2026-12-31','Chevauchement 14/02/2021':'2021-02-14'};
  for(const [label,date]of Object.entries(dates)){const option=document.createElement('option');option.value=date;option.textContent=label;presets.append(option);}
  function update(value){
   if(!valid(value)){output.textContent='Date civile invalide.';return;}
   selected=value;try{if(value)sessionStorage.setItem(storageKey,value);else sessionStorage.removeItem(storageKey);}catch{}
   input.value=value;presets.value=Object.values(dates).includes(value)?value:'';
   const result=window.DobbySeasonalCalendar.resolve(value||window.DobbySeasonalCalendar.civilDate());
   summary.textContent='Revue · '+result.label;output.textContent=(value?'Date fictive : ':'Date réelle : ')+result.date+' · '+result.label;
   window.DobbySeasonal?.refresh();
  }
  input.addEventListener('change',()=>update(input.value));presets.addEventListener('change',()=>{if(presets.value)update(presets.value);});panel.querySelector('button').addEventListener('click',()=>update(''));
  document.body.append(panel);update(valid(selected)?selected:'');
 });
})();
