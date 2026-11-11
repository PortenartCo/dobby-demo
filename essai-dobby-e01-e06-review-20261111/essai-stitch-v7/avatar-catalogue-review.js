/* Review G, isolated catalogue proposal. Loading this file does NOT register new
   native choices or change stored identities. Integrate after the E06 handoff. */
window.DobbyReviewAvatarCatalog=(()=>{'use strict';
 const asset='../essai-stitch-v7/assets/review-avatars-20261111/portraits-09-24.png';
 const descriptions=[
  'Enfant, cheveux crépus en deux couettes',
  'Enfant, cheveux châtains lisses',
  'Enfant, longues tresses noires',
  'Enfant, cheveux blonds ondulés et taches de rousseur',
  'Adolescente, longs cheveux noirs attachés',
  'Adolescent, cheveux courts crépus',
  'Adolescente, cheveux bruns bouclés',
  'Adolescent, cheveux auburn courts et lunettes',
  'Adulte, locs attachées en chignon',
  'Adulte, cheveux blonds vénitiens et barbe courte',
  'Adulte, carré court poivre et sel',
  'Adulte, tête rasée',
  'Adulte âgée, cheveux argentés courts',
  'Adulte âgé, boucles argentées et barbe',
  'Adulte âgée, cheveux crépus poivre et sel',
  'Adulte, cheveux ondulés et moustache'
 ];
 const additional=Object.freeze(descriptions.map((description,index)=>Object.freeze({id:'portrait-'+(index+9),name:'Portrait '+(index+9),description,index,available:true,asset,sprite:Object.freeze({columns:4,rows:4,column:index%4,row:Math.floor(index/4)})})));
 function extend(nativeRows){const seen=new Set(nativeRows.map(row=>row.id));return Object.freeze([...nativeRows,...additional.filter(row=>!seen.has(row.id))]);}
 // Presentation metadata only. Old eight portraits retain their existing crop.
 function applySprite(face,row){if(!row?.sprite)return;const {columns,rows,column,row:vertical}=row.sprite;face.style.backgroundImage='url("'+row.asset+'")';face.style.backgroundSize=(columns*100)+'% '+(rows*100)+'%';face.style.backgroundPosition=(columns>1?column/(columns-1)*100:50)+'% '+(rows>1?vertical/(rows-1)*100:50)+'%';face.style.backgroundRepeat='no-repeat';face.dataset.avatarId=row.id;}
 return Object.freeze({additional,extend,applySprite});
})();
