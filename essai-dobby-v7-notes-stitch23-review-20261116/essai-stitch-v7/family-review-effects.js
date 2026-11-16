/* FAM-01: extend the native E01 ambience to Family templates. Preferences,
   controls, feedback and persistence remain owned by DobbyChrome. */
window.DobbyFamilyReviewEffects = (() => {
 'use strict';
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 const particleCount = 22;
 let layer = null, mounted = false, pageAway = false;
 const root = document.documentElement;
 function removeLayer() {
  layer?.remove();
  layer = null;
 }
 function refresh() {
  // E01's root classes are derived from its single native st.stitchPreferences
  // record, including the default ON. Never read or write a second preference.
  const family = document.body.classList.contains('fa-active') && !!document.body.dataset.familyView;
  const effects = root.classList.contains('e01-effects-on');
  const sharedAmbience = document.getElementById('e013-ambience');
  if (!family || !effects || reducedMotion.matches || sharedAmbience) {
   removeLayer();
   return;
  }
  if (!layer?.isConnected) {
   layer = document.createElement('div');
   layer.id = 'fam01-ambience';
   layer.dataset.theme = 'standard-gold';
   layer.setAttribute('aria-hidden', 'true');
   layer.inert = true;
   // Reuse the native gold palette, particle shape and compositor animation.
   for (let index = 0; index < particleCount; index++) {
    const mote = document.createElement('span'), size = 2 + Math.random() * 3;
    mote.className = 'e013-particle e013-mote';
    mote.style.left = ((index + .2 + Math.random() * .6) / particleCount * 100) + '%';
    mote.style.top = ((index * 37.3 + Math.random() * 15) % 100) + '%';
    mote.style.width = mote.style.height = size + 'px';
    mote.style.setProperty('--e013-dx', Math.round((Math.random() - .5) * 55) + 'px');
    mote.style.setProperty('--e013-dy', -Math.round(45 + Math.random() * 95) + 'px');
    mote.style.setProperty('--e013-alpha', (.5 + Math.random() * .45).toFixed(2));
    mote.style.animationDuration = `calc(var(--e013-drift-speed) * ${(.7 + Math.random() * .7).toFixed(2)})`;
    mote.style.animationDelay = -Math.random() * 14 + 's';
    layer.append(mote);
   }
   document.body.append(layer);
  }
  const panel = document.getElementById('dv7-panel');
  const paused = document.hidden || pageAway || (panel && !panel.hidden) || root.classList.contains('dv7-loading');
  layer.classList.toggle('fam01-effects-paused', !!paused);
 }
 const rootObserver = new MutationObserver(refresh);
 const bodyObserver = new MutationObserver(refresh);
 const panelObserver = new MutationObserver(refresh);
 function visibility() { refresh(); }
 function leave() { pageAway = true; refresh(); }
 function arrive() { pageAway = false; refresh(); }
 function mount() {
  if (!mounted) {
   mounted = true;
   rootObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
   // Templates and the native shared ambience are mounted dynamically.
   bodyObserver.observe(document.body, { childList: true, attributes: true, attributeFilter: ['data-family-view', 'class'] });
   const panel = document.getElementById('dv7-panel');
   if (panel) panelObserver.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
   reducedMotion.addEventListener('change', refresh);
   document.addEventListener('visibilitychange', visibility);
   window.addEventListener('pagehide', leave);
   window.addEventListener('pageshow', arrive);
  }
  refresh();
 }
 function dispose() {
  mounted = false;
  rootObserver.disconnect();
  bodyObserver.disconnect();
  panelObserver.disconnect();
  reducedMotion.removeEventListener('change', refresh);
  document.removeEventListener('visibilitychange', visibility);
  window.removeEventListener('pagehide', leave);
  window.removeEventListener('pageshow', arrive);
  removeLayer();
 }
 return Object.freeze({ mount, refresh, dispose });
})();
