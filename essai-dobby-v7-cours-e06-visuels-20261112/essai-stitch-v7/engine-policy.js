/* V7 loading policy: reuse the native key, preserve every recorded field.
   Suppress only V5's synthetic first-run menu, before its initialization. */
(()=>{'use strict';try{const key='dobby-v5-familial-preview-20261108',raw=localStorage.getItem(key),state=raw?JSON.parse(raw):{};if(state&&typeof state==='object'&&!state.demoInitialized&&!Object.keys(state.planned||{}).length){state.demoInitialized=true;localStorage.setItem(key,JSON.stringify(state));}}catch(error){console.error('Initialisation locale DOBBY indisponible',error);}})();
