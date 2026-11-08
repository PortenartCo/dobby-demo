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
  const returnSelectors = '[data-v23-member="cancel"], [data-doc="cancel"], [data-doc="back"], [data-house-action="cancel"], [data-house-action="back"], [data-action="canceltm"], [data-action="back"], [data-extra="back"]';
  function returnControl() {
    // Prefer the current editor's cancel action over a recipe's parent back link.
    return screen.querySelector('[data-action="canceltm"]') || screen.querySelector(returnSelectors);
  }
  const pages = {
    plan: { image: 'taverne', seal: 'À la lueur du feu', kicker: 'Repas & menus du logis', title: 'La Taverne Gourmande', quote: 'Le feu crépite dans l’âtre et le chaudron mijote. Dobby vous aide à préparer les festins de la maisonnée.', action: 'Choisir un repas', attributes: 'data-st5-action="dinner"', symbol: 'restaurant' },
    home: { image: 'traverse', seal: 'Bienvenue au logis', kicker: 'Votre assistant de maison', title: 'Le Chemin de Traverse', quote: 'Chaque chose à sa place, un peu de magie au quotidien. Dobby veille sur les petites missions de votre foyer.', action: 'Parler à Dobby', attributes: 'data-action="voice"', symbol: 'auto_awesome' },
    missions: { image: 'missions', seal: 'Le grimoire du quotidien', kicker: 'Tâches & rituels du foyer', title: 'La Bibliothèque des Missions', quote: 'Chaque tâche est un petit sortilège d’ordre. Un parchemin à la fois, la maisonnée prend soin de son quotidien.', action: 'Créer une mission', attributes: 'data-fms-action="new"', symbol: 'add' },
    family: { image: 'famille', seal: 'Le cœur de la maisonnée', kicker: 'Famille & organisation', title: 'Le Salon des Curiosités', quote: 'Les rendez-vous, les souvenirs et les informations précieuses du foyer trouvent ici leur place.', action: 'Les membres de la maisonnée', attributes: 'data-extra="health"', symbol: 'groups' }
  };
  const destructiveLabels = {
    delete: 'Supprimer', deletenote: 'Supprimer le mémo', remove: 'Retirer du foyer',
    rmextra: 'Retirer cet achat', detach: 'Retirer la pièce jointe', removedoc: 'Supprimer la pièce jointe',
    contactdelete: 'Supprimer le contact', listdelete: 'Supprimer la liste',
    healthdelete: 'Supprimer le rendez-vous', listremove: 'Supprimer l’élément',
    'remove-demo': 'Retirer les repas préchargés'
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
  function simplifyFamily() {
    const view = screen.querySelector('.st5-family');
    const agenda = screen.querySelector('#fpAgenda');
    const health = screen.querySelector('#fhVisits');
    if (!view || !agenda || !health) return;
    const [members, local, shortcuts] = view.querySelectorAll(':scope > .st5-section');
    if (!members || !local || !shortcuts) return;
    members.querySelector('h2').textContent = 'Les membres du foyer';
    members.querySelector('.st5-sub')?.remove();
    members.querySelector('.st5-section-heading > button')?.remove();
    // Preserve every old local appointment and its original edit action, separately
    // from the shared medical register. The full local carnet remains accessible.
    if (local.querySelector('[data-extra="healthedit"]')) {
      const disclosure = document.createElement('details'); disclosure.className = 'dv6-local-records';
      const summary = document.createElement('summary'); summary.textContent = 'Rendez-vous de l’ancien carnet local';
      const records = local.querySelector('.st5-calendar-portal'); records.className = 'dv6-local-appointments';
      disclosure.append(summary, records, local.querySelector('[data-extra="health"]')); health.append(disclosure);
    }
    shortcuts.querySelector('h2').textContent = 'Les outils du foyer';
    shortcuts.querySelector('.st5-quick-grid').insertAdjacentHTML('beforeend',
      '<button type="button" data-extra="health"><strong>Carnet local</strong>Personnes et anciennes fiches</button>'
      + '<button type="button" data-go="missions"><strong>Missions</strong>Tâches du foyer et suivi automatique</button>');
    (screen.querySelector('.fv2-strip') || screen.querySelector('.dv6-page-head')).after(members);
    agenda.after(health); health.after(shortcuts);
    // The legacy organisation hub repeats these same tools and auto-task sources.
    // All domain records and handlers remain owned by their existing modules.
    view.remove();
  }
  function simplifyMissions() {
    const manual = screen.querySelector('#fmsManual');
    const automatic = screen.querySelector('.st5-missions > .st5-section');
    if (!manual || !automatic || automatic.classList.contains('dv6-auto-missions')) return;
    manual.querySelector('.fms-head small').textContent = 'Missions créées par le foyer';
    manual.querySelector('.fms-desc').textContent = 'Créez vos missions, attribuez-les à un membre et suivez leur échéance.';
    manual.querySelector('.fms-status')?.remove();
    manual.querySelectorAll('.fms-desc').forEach((note, index) => { if (index) note.remove(); });
    automatic.classList.add('fms-panel', 'dv6-auto-missions');
    automatic.querySelector('h2').textContent = 'Missions automatiques';
    automatic.querySelector('.st5-card')?.remove();
    const description = document.createElement('p'); description.className = 'fms-desc';
    description.textContent = 'Tâches issues des échéances et entretiens de Dobby. Ce registre reste distinct des missions créées par le foyer. Aucun rappel Apple n’est créé automatiquement.';
    automatic.querySelector('.st5-section-heading').after(description);
    automatic.querySelector('.st5-tabs').setAttribute('aria-label', 'Filtrer les missions automatiques');
    const tools = screen.querySelectorAll('.st5-missions > .st5-section')[1];
    if (tools) {
      const disclosure = document.createElement('details'); disclosure.className = 'dv6-local-records';
      const summary = document.createElement('summary'); summary.textContent = 'Maisonnée et listes';
      tools.querySelector('.st5-section-heading')?.remove();
      disclosure.append(summary, ...tools.childNodes); tools.replaceWith(disclosure);
    }
  }
  function presentAttachments() {
    const sharing = screen.querySelector('.fds-panel[aria-label="Partage de document"]');
    if (!sharing || sharing.hasAttribute('data-dv6-attachments')) return;
    sharing.dataset.dv6Attachments = '';
    const local = screen.querySelector('#familyDocFile');
    const shared = sharing.querySelector('[data-fds-file]');
    // Availability comes from the existing document module's controls, including
    // its permission/busy checks; presentation does not reinterpret authentication.
    const enabled = shared ? !shared.disabled : Boolean(sharing.querySelector('[data-fds]:not(:disabled)'));
    const transferring = [...sharing.querySelectorAll('.fds-notice')].some(note => note.textContent === 'Transfert en cours…');
    const hint = sharing.querySelector('.fds-hint');
    if (!enabled && !transferring && hint) hint.textContent = 'Partage familial indisponible. Connectez le foyer et activez « Documents et contrats » pour envoyer un fichier. La copie locale reste disponible sur cet appareil.';
    if (!enabled && !transferring && shared) {
      shared.closest('.fds-file').hidden = true;
      const explanation = sharing.querySelectorAll('.fds-hint')[1];
      if (explanation) explanation.textContent = 'Cette fiche est destinée au partage familial. Aucun fichier ne sera envoyé depuis cet appareil sans votre action explicite.';
    }
    if (local) {
      const card = local.closest('.card');
      const location = document.createElement('small'); location.className = 'dv6-kicker'; location.textContent = 'Sur cet appareil';
      card.querySelector('h2').before(location);
      const label = card.querySelector('label');
      if (label) label.textContent = 'Ajouter ou remplacer la copie locale';
    }
    // The connected shared renderer may retain a local backup in a disclosure.
    // Keep both original inputs/handlers, expose only the selected destination.
    if ((enabled || transferring) && local && shared) {
      const choices = document.createElement('div'); choices.className = 'dv6-file-destinations';
      choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', 'Destination du fichier');
      choices.innerHTML = '<button type="button" data-dv6-file-target="shared" aria-pressed="true">Partager au foyer</button>'
        + '<button type="button" data-dv6-file-target="local" aria-pressed="false">Sur cet appareil</button>';
      sharing.prepend(choices);
    }
    for (const input of screen.querySelectorAll('input[type="file"]')) {
      const wrapper = document.createElement('span'); wrapper.className = 'dv6-file-picker';
      const choose = document.createElement('span'); choose.className = 'dv6-file-button'; choose.textContent = 'Choisir un fichier'; choose.setAttribute('aria-hidden', 'true');
      const filename = document.createElement('span'); filename.className = 'dv6-file-name'; filename.textContent = 'Aucun fichier sélectionné'; filename.setAttribute('aria-live', 'polite');
      input.before(wrapper); wrapper.append(choose, filename, input);
      input.classList.add('dv6-native-file');
      input.setAttribute('aria-label', input === local ? 'Choisir un fichier pour cet appareil' : 'Choisir un fichier à partager au foyer');
      input.addEventListener('change', () => { filename.textContent = input.files?.[0]?.name || 'Aucun fichier sélectionné'; });
    }
    if ((enabled || transferring) && local && shared) selectAttachmentTarget('shared');
  }
  function selectAttachmentTarget(target) {
    const local = screen.querySelector('#familyDocFile');
    const shared = screen.querySelector('[data-fds-file]');
    if (!local || !shared) return;
    local.closest('.dv6-file-picker').hidden = target !== 'local';
    shared.closest('.dv6-file-picker').hidden = target !== 'shared';
    if (target === 'local') {
      const backup = local.closest('details'); if (backup) backup.open = true;
    }
    for (const button of screen.querySelectorAll('[data-dv6-file-target]')) button.setAttribute('aria-pressed', String(button.dataset.dv6FileTarget === target));
  }
  function decorateControls(container) {
    for (const button of container.querySelectorAll('button:not([data-dv6-control])')) {
      button.dataset.dv6Control = '';
      const text = button.textContent.trim();
      const actionValues = ['action','extra','doc','houseAction','v23Member','fvAction','fmAction','fmsAction','fpAction','fh','fds'].map(key => button.dataset[key]).filter(Boolean);
      const actions = actionValues.join(' ');
      const destructiveAction = actionValues.find(action => Object.hasOwn(destructiveLabels, action));
      const destructive = Boolean(destructiveAction) || /^Supprimer\b/i.test(text);
      const primary = button.matches('[type="submit"], .dv6-primary, .st5-solid, .st-primary, .fms-main, .fp-main-btn, .fh-primary, .v21-main-button, .btn:not(.secondary):not(.outline)');
      button.dataset.dv6Variant = destructive ? 'danger' : primary ? 'primary' : 'secondary';
      // Only decorate controls, never user-supplied record titles inside cards.
      if (button.children.length || button.closest('.nav, .v2-header') || button.matches('.st5-day, .v2-cal-day')) continue;
      const route = button.dataset.go || button.dataset.extra;
      const routeSymbol = roots[route]?.[1] || ({ recipes: 'menu_book', shop: 'shopping_basket', house: 'home', documents: 'description', contacts: 'person', lists: 'checklist', health: 'groups', search: 'search', chat: 'auto_awesome' })[route];
      let symbol = destructive ? 'delete' : /close/.test(actions) || text === '×' ? 'close'
        : /Retour|^[‹←]/i.test(text) ? 'arrow_back' : /^(?:＋|\+|Ajouter|Créer)/i.test(text) ? 'add'
        : /Modifier/i.test(text) ? 'edit' : /Télécharger|Exporter/i.test(text) ? 'download'
        : /Importer/i.test(text) ? 'upload' : /Enregistrer|Valider/i.test(text) ? 'check' : routeSymbol || '';
      if (!symbol) continue;
      const label = text.replace(/^[^\p{L}\p{N}]+/u, '').trim();
      button.innerHTML = icon(symbol);
      if (label) button.append(document.createTextNode(label));
      else if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', destructive ? destructiveLabels[destructiveAction] || 'Supprimer' : symbol === 'close' ? 'Fermer' : 'Ajouter');
    }
    // V5 labels often precede their controls without an explicit association.
    let labelNumber = 0;
    for (const label of container.querySelectorAll('label:not([for])')) {
      const field = label.nextElementSibling;
      if (!label.querySelector('input, select, textarea') && field?.matches('input, select, textarea')) {
        if (!field.id) {
          do { field.id = 'dv6-field-' + (++labelNumber); } while (document.querySelectorAll('[id="' + field.id + '"]').length > 1);
        }
        label.htmlFor = field.id;
      }
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
  decorateControls(menu);
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
  }, true);
  document.addEventListener('click', event => {
    if (!event.target.closest('#menu, #menubtn')) closeMenu(false);
    const target = event.target.closest('[data-dv6-file-target]');
    if (target) { selectAttachmentTarget(target.dataset.dv6FileTarget); return; }
    if (!event.target.closest('[data-dv6-back]')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const existing = returnControl();
    if (existing) { existing.click(); return; }
    const extra = String(st.extraPage || '').split(':');
    if (extra.length > 1) { st.extraPage = extra[0]; render(); return; }
    go(['recipes', 'pick', 'shop', 'import', 'batch'].includes(st.page) ? 'plan' : ['documents', 'house'].includes(st.page) || st.extraPage ? 'family' : 'home');
  }, true);
  function decorate() {
    const key = st.detail ? 'recipes' : String(st.extraPage || '').split(':')[0] || st.page;
    const root = Boolean(roots[key] && !st.detail && !st.extraPage);
    if (root) decorateRoot(key);
    if (root && key === 'family') simplifyFamily();
    if (root && key === 'missions') simplifyMissions();
    if (key === 'documents') presentAttachments();
    if (!screen.querySelector('h1')) {
      const title = document.createElement('h1');
      title.textContent = chapters[key] || 'Le foyer'; screen.prepend(title);
    }
    screen.querySelectorAll('.st5-chapter').forEach(chapter => chapter.remove());
    const existingReturn = returnControl();
    if (existingReturn) existingReturn.dataset.dv6PageBack = '';
    for (const empty of screen.querySelectorAll('.st5-empty')) {
      if (empty.textContent === 'Aucun rendez-vous médical futur enregistré dans cette démonstration.') empty.textContent = 'Aucun rendez-vous médical à venir sur cet appareil.';
    }
    if (key === 'health') {
      for (const warning of screen.querySelectorAll('.v21-health-warning')) {
        if (/synchronisation iOS|Synchronisation entre iPhone/.test(warning.textContent)) warning.textContent = 'Les anciennes fiches de ce carnet restent sur cet appareil. Pour le suivi médical commun, utilisez les rendez-vous partagés de la rubrique Famille.';
      }
    }
    if (key === 'lists') {
      for (const note of screen.querySelectorAll('p.muted')) {
        if (note.textContent === 'Liste de démonstration locale. Elle ne se synchronise pas encore entre iPhone.') note.textContent = 'Cette liste peut être partagée avec le foyer après connexion et activation du module Famille.';
      }
    }
    for (const title of [...screen.querySelectorAll('h1')].slice(1)) {
      const heading = document.createElement('h2');
      for (const attr of title.attributes) heading.setAttribute(attr.name, attr.value);
      heading.append(...title.childNodes); title.replaceWith(heading);
    }
    if (key === 'menu') {
      for (const note of screen.querySelectorAll('.v2-panel .v2-understated')) {
        if (note.textContent.includes('la synchronisation familiale ne sont pas encore raccordés')) {
          note.textContent = 'Les données du foyer peuvent être synchronisées avec Supabase après connexion et activation des modules. Certaines fonctions et pièces jointes restent locales.';
        }
      }
    }
    decorateControls(screen);
    for (const button of screen.querySelectorAll('.st5-quick-grid button, .st-shortcuts button, .v21-entry[data-extra], .v2-menu-item')) {
      const route = button.dataset.go || button.dataset.extra;
      const symbol = ({ family: 'groups', contacts: 'person', lists: 'checklist', health: 'groups', documents: 'description', house: 'home', recipes: 'menu_book', shop: 'shopping_basket', search: 'search' })[route];
      const mark = button.querySelector('.v21-entry-icon, :scope > span:first-child, :scope > strong');
      if (!symbol || !mark || mark.querySelector('.dv6-icon')) continue;
      if (mark.tagName === 'STRONG') {
        const text = mark.textContent.replace(/^[^\p{L}\p{N}]+/u, '').trim(); mark.innerHTML = icon(symbol); mark.append(document.createTextNode(text));
      } else mark.innerHTML = icon(symbol);
    }
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
  new MutationObserver(() => {
    for (const layer of document.querySelectorAll('#fv2Overlay, #fpDialogLayer, #fmsLayer, #fhDialog')) decorateControls(layer);
  }).observe(document.body, { childList: true, subtree: true });
  window.DobbyPresentation = Object.freeze({ version: 6 });
  decorate();
})();
