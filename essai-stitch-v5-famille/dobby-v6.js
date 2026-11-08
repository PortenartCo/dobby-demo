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
  const pages = {
    plan: { image: 'taverne', seal: 'À la lueur du feu', kicker: 'Repas & menus du logis', title: 'La Taverne Gourmande', quote: 'Le feu crépite dans l’âtre et le chaudron mijote. Dobby vous aide à préparer les festins de la maisonnée.', action: 'Choisir un repas', attributes: 'data-st5-action="dinner"', symbol: 'restaurant' },
    home: { image: 'traverse', seal: 'Bienvenue au logis', kicker: 'Votre assistant de maison', title: 'Le Chemin de Traverse', quote: 'Chaque chose à sa place, un peu de magie au quotidien. Dobby veille sur les petites missions de votre foyer.', action: 'Parler à Dobby', attributes: 'data-action="voice"', symbol: 'auto_awesome' },
    missions: { image: 'missions', seal: 'Le grimoire du quotidien', kicker: 'Tâches & rituels du foyer', title: 'La Bibliothèque des Missions', quote: 'Chaque tâche est un petit sortilège d’ordre. Un parchemin à la fois, la maisonnée prend soin de son quotidien.', action: 'Créer une mission', attributes: 'data-fms-action="new"', symbol: 'add' },
    family: { image: 'famille', seal: 'Le cœur de la maisonnée', kicker: 'Famille & organisation', title: 'Le Salon des Curiosités', quote: 'Les rendez-vous, les souvenirs et les informations précieuses du foyer trouvent ici leur place.', action: 'Les membres de la maisonnée', attributes: 'data-extra="health"', symbol: 'groups' }
  };
  function icon(name) {
    return '<span class="dv6-icon" aria-hidden="true">' + name + '</span>';
  }
  function pageHead(page) {
    const data = pages[page];
    const head = document.createElement('section');
    head.className = 'dv6-page-head';
    head.innerHTML = '<div class="dv6-hero"><img src="./assets/v6/' + data.image + '.png" alt="Dobby dans un intérieur chaleureux" decoding="async">'
      + '<span class="dv6-hero-seal">' + icon('auto_awesome') + data.seal + '</span></div>'
      + '<div class="dv6-page-title"><div class="dv6-kicker">' + data.kicker + '</div><h1>' + data.title + '</h1>'
      + '<p>« ' + data.quote + ' »</p><button type="button" class="dv6-primary" ' + data.attributes + '>' + icon(data.symbol) + data.action + '</button>'
      + (page === 'home' ? '<button type="button" class="dv6-quiet" data-action="photo">' + icon('upload') + 'Importer une photo ou un document</button>' : '') + '</div>';
    return head;
  }
  function decorateRoot(key) {
    if (screen.querySelector('.dv6-page-head')) return;
    screen.querySelectorAll('.st5-cover, .st-hero, .st-intro').forEach(el => el.remove());
    // Existing V5 content sometimes nests an entire previous page below the hero.
    // Keep its actions and data, demote only the duplicate headings.
    screen.querySelectorAll('h1').forEach(title => {
      const heading = document.createElement('h2');
      heading.className = title.className; heading.textContent = title.textContent;
      title.replaceWith(heading);
    });
    screen.prepend(pageHead(key));
    if (key === 'plan') {
      const tabs = document.createElement('div'); tabs.className = 'dv6-route-tabs';
      tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Les registres de la Taverne');
      tabs.innerHTML = '<button type="button" class="active" data-go="plan" aria-pressed="true">' + icon('calendar_month') + 'Menus</button>'
        + '<button type="button" data-go="recipes">' + icon('menu_book') + 'Grimoire</button>'
        + '<button type="button" data-go="shop">' + icon('shopping_basket') + 'Provisions</button>';
      screen.querySelector('.dv6-page-head').after(tabs);
    }
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
    if (root) decorateRoot(key);
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
