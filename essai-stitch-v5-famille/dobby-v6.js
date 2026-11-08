/* DOBBY V6 presentation. No storage, network client, authentication or domain writer. */
(function () {
  'use strict';
  if (window.DobbyPresentation) return;
  const screen = document.getElementById('screen');
  const header = document.querySelector('.v2-header');
  const nav = document.querySelector('.nav');
  const menu = document.getElementById('menu');
  if (!screen || !header || !nav || !menu) return;
  const roots = {
    home: ['Traverse', 'home'], missions: ['Missions', 'menu_book'],
    plan: ['Taverne', 'restaurant'], family: ['Famille', 'groups']
  };
  const chapters = {
    recipes: 'Grimoire des recettes', pick: 'Choisir un repas', shop: 'Panier & provisions',
    documents: 'Archives & documents', house: 'Maison & équipements', chat: 'Parler à Dobby',
    menu: 'Tous les outils', import: 'Inscrire une recette', batch: 'Importer des recettes',
    health: 'Carnet de santé', contacts: 'Répertoire du foyer', lists: 'Listes du foyer',
    contracts: 'Contrats & échéances', search: 'Rechercher', 'smart-import': 'Importer un document'
  };
  function icon(name) {
    return '<span class="dv6-icon" aria-hidden="true">' + name + '</span>';
  }
  header.innerHTML = '<button type="button" id="menubtn" class="dv6-header-button" aria-label="Ouvrir le menu" aria-controls="menu" aria-expanded="false">' + icon('menu') + '</button>'
    + '<button type="button" class="v2-brand dv6-brand" data-go="home" aria-label="Accueil Dobby"><strong>DOBBY</strong><small id="dv6Chapter">Traverse</small></button>'
    + '<button type="button" class="dv6-header-button dv6-profile" data-fv-action="open" aria-label="Compte et foyer">' + icon('person') + '</button>';
  const back = document.createElement('button');
  back.type = 'button'; back.className = 'dv6-header-button';
  back.dataset.dv6Back = ''; back.setAttribute('aria-label', 'Retour');
  back.innerHTML = icon('arrow_back'); back.hidden = true;
  header.prepend(back);
  nav.innerHTML = Object.entries(roots).map(([route, [label, symbol]]) =>
    '<button type="button" data-go="' + route + '">' + icon(symbol) + '<span class="dv6-nav-label">' + label + '</span></button>').join('');
  for (const button of menu.querySelectorAll('button')) button.setAttribute('role', 'menuitem');
  function closeMenu(restoreFocus) {
    menu.classList.add('hidden');
    if (restoreFocus) document.getElementById('menubtn').focus();
  }
  new MutationObserver(() => {
    const expanded = !menu.classList.contains('hidden');
    document.getElementById('menubtn').setAttribute('aria-expanded', String(expanded));
  }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.classList.contains('hidden')) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('#menu, #menubtn')) closeMenu(false);
    if (!event.target.closest('[data-dv6-back]')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const existing = screen.querySelector('[data-doc="cancel"], [data-doc="back"], [data-house-action="cancel"], [data-house-action="back"], [data-action="back"]');
    if (existing) { existing.click(); return; }
    const extra = String(st.extraPage || '').split(':');
    if (extra.length > 1) { st.extraPage = extra[0]; render(); return; }
    go(['recipes', 'pick', 'shop', 'import', 'batch'].includes(st.page) ? 'plan' : ['documents', 'house'].includes(st.page) || st.extraPage ? 'family' : 'home');
  }, true);
  function decorate() {
    const key = String(st.extraPage || '').split(':')[0] || st.page;
    const root = Boolean(roots[key] && !st.detail && !st.extraPage);
    document.getElementById('dv6Chapter').textContent = roots[key]?.[0] || chapters[key] || 'Le foyer';
    back.hidden = root;
    document.getElementById('menubtn').hidden = !root;
    header.dataset.view = root ? 'root' : screen.querySelector('form') ? 'form' : 'detail';
    const activeRoot = root ? key : st.detail || ['recipes','pick','shop','import','batch'].includes(st.page) ? 'plan' : ['health','contacts','lists','contracts','documents','house'].includes(key) ? 'family' : '';
    for (const button of nav.querySelectorAll('button')) {
      const active = button.dataset.go === activeRoot;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    }
  }
  document.body.classList.add('dobby-v6');
  const previousRender = render;
  render = function () { previousRender(); decorate(); };
  // Documents and equipment also have direct DOM renderers in V5.
  new MutationObserver(decorate).observe(screen, { childList: true, subtree: true });
  window.DobbyPresentation = Object.freeze({ version: 6 });
  decorate();
})();
