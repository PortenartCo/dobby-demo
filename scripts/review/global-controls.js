/* Controls for the replayable global fixture. The application keeps its native navigation. */
(() => {
  'use strict';
  if (window !== window.top || window.DobbyGlobalLaunch !== true) return;

  function element(tag, text = '', className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, action) {
    const node = element('button', text);
    node.type = 'button';
    if (action) node.addEventListener('click', action);
    return node;
  }

  function section(title, ...contents) {
    const node = element('section');
    node.append(element('h3', title), ...contents);
    return node;
  }

  function scopeItem(title, text, details) {
    const item = element('div');
    const description = element('dd', text);
    if (details) description.append(details);
    item.append(element('dt', title), description);
    return item;
  }

  function mount() {
    const demo = window.DobbyGlobalDemo;
    const scenario = window.DobbyGlobalScenario;
    const banner = document.querySelector('[data-review-banner]');
    if (!demo || !banner) return;

    document.body.dataset.dobbyGlobalDemo = '';
    const label = element('div', '', 'global-demo-label');
    const identity = element('span', 'Préparation de la démo…', 'global-demo-identity');
    label.append(element('strong', 'DOBBY V7 · Démonstration'), identity);
    const toggle = button('Scénarios de démo', () => panel.showModal());
    toggle.dataset.globalPanel = '';
    toggle.disabled = true;
    toggle.setAttribute('aria-haspopup', 'dialog');
    toggle.setAttribute('aria-controls', 'dobby-global-panel');
    banner.replaceChildren(label, toggle);
    const resize = () => document.body.style.setProperty('--global-demo-banner-height', `${banner.offsetHeight}px`);
    new ResizeObserver(resize).observe(banner);
    resize();

    const panel = element('dialog');
    panel.id = 'dobby-global-panel';
    panel.setAttribute('aria-labelledby', 'dobby-global-title');
    const title = element('h2', 'Scénarios de démonstration');
    title.id = 'dobby-global-title';
    const close = button('Fermer', () => panel.close());
    close.autofocus = true;
    const header = element('div', '', 'global-demo-title');
    header.append(title, close);
    panel.addEventListener('close', () => toggle.focus({ preventScroll: true }));

    const profiles = element('ul', '', 'global-demo-profiles');
    const session = button('Fermer la session', () => run(() => demo.signedOut() ? demo.startSession() : demo.endSession()));
    session.dataset.globalSession = '';
    const sync = button('Synchroniser', () => run(() => demo.sync(), 'Synchronisation simulée terminée.'));
    sync.dataset.globalSync = '';
    const offline = button('Simuler le hors ligne', () => run(async () => {
      const reconnect = demo.isOffline();
      await demo.setOffline(!reconnect);
      if (reconnect && sessionActive) await demo.sync();
    }));
    offline.dataset.globalOffline = '';
    const commands = element('div', '', 'global-demo-actions');
    commands.append(sync, offline);
    const result = element('p', '', 'global-demo-result');
    result.setAttribute('role', 'status');
    const status = element('p', '', 'global-demo-status');
    status.dataset.globalStatus = '';

    const limits = element('dl', '', 'global-demo-limits');
    const healthExamples = element('ul', '', 'global-demo-health-examples');
    healthExamples.hidden = true;
    limits.append(
      scopeItem('Santé', 'Données synthétiques. Le carnet Santé essentiel reste désactivé.', healthExamples),
      scopeItem('Recettes', scenario?.recipeStatus || 'Catalogue pilote et exemples de démonstration.'),
      scopeItem('Connexion', 'Comptes fictifs et commandes simulées dans ce navigateur.'),
    );
    const reset = button('Réinitialiser la démonstration', () => {
      if (window.confirm('Réinitialiser les profils et les données fictives de cette démonstration ?')) {
        void run(() => demo.reset());
      }
    });
    reset.dataset.globalReset = '';
    panel.append(header,
      section('Profils et session', profiles, session),
      section('Commandes simulées', status, commands, result),
      section('Périmètre de la démo', limits, reset),
    );
    document.body.append(panel);

    const rows = new Map();
    let generation = 0;
    let busy = false;
    let ready = false;
    let sessionActive = false;

    function rowFor(profile) {
      const code = profile.code;
      if (rows.has(code)) return rows.get(code);
      const row = element('li');
      const name = element('strong');
      const description = element('small');
      const caption = element('div', '', 'global-demo-profile');
      caption.append(name, description);
      const choose = button('Choisir', () => run(() => demo.selectClient(code)));
      choose.dataset.globalSelectClient = code;
      const suspend = button('Suspendre', () => run(() => demo.setSuspended(code, suspend.dataset.suspended !== 'true')));
      suspend.dataset.globalSuspend = code;
      const actions = element('div', '', 'global-demo-actions');
      actions.append(choose, suspend);
      row.append(caption, actions);
      profiles.append(row);
      const controls = { name, description, choose, suspend };
      rows.set(code, controls);
      return controls;
    }

    function renderHealthExamples(active, signedOut) {
      const records = scenario?.health?.examples || [];
      const memberId = scenario?.profiles?.find(profile => profile.code === active?.code)?.memberId;
      const allowed = active && !signedOut && !active.suspended ? records.filter(record =>
        active.role === 'parent' || record.memberId === memberId) : [];
      healthExamples.replaceChildren(...allowed.map(record => {
        const owner = scenario.profiles.find(profile => profile.memberId === record.memberId);
        const example = element('li');
        example.dataset.globalHealthExample = '';
        example.append(element('strong', [owner?.name, record.title].filter(Boolean).join(' · ')), element('span', record.note));
        return example;
      }));
      healthExamples.hidden = allowed.length === 0;
    }

    async function refresh() {
      const request = ++generation;
      try {
        const available = await demo.profiles();
        if (request !== generation) return;
        const active = available.find(profile => profile.code === demo.client);
        const signedOut = demo.signedOut();
        const disconnected = demo.isOffline();
        sessionActive = Boolean(active && !signedOut && !active.suspended);
        const canSuspend = sessionActive && active.role === 'parent';
        const connection = disconnected ? 'Hors ligne simulé' : 'Simulation en ligne';
        identity.textContent = [active?.name, signedOut ? 'Session fermée' : active?.suspended ? 'Profil suspendu' : connection].filter(Boolean).join(' · ');
        status.textContent = connection;
        session.textContent = signedOut ? 'Ouvrir la session' : 'Fermer la session';
        session.disabled = Boolean(signedOut && active?.suspended);
        offline.textContent = disconnected ? 'Rétablir la connexion' : 'Simuler le hors ligne';
        offline.setAttribute('aria-pressed', String(disconnected));
        sync.disabled = disconnected || !sessionActive;

        for (const profile of available) {
          const { name, description, choose, suspend } = rowFor(profile);
          const current = profile.code === active?.code;
          name.textContent = profile.name;
          description.textContent = `${profile.role === 'parent' ? 'Parent' : 'Enfant'} ${profile.code}${profile.suspended ? ' · Suspendu' : ''}`;
          choose.textContent = current ? 'Sélectionné' : 'Choisir';
          choose.disabled = current;
          choose.setAttribute('aria-label', current ? `${profile.name}, profil sélectionné` : `Choisir ${profile.name}`);
          if (current) choose.setAttribute('aria-current', 'true');
          else choose.removeAttribute('aria-current');
          const suspensionLabel = profile.suspended ? 'Réactiver' : 'Suspendre';
          suspend.hidden = !canSuspend || profile.role !== 'child';
          suspend.disabled = disconnected;
          suspend.textContent = suspensionLabel;
          suspend.setAttribute('aria-label', `${suspensionLabel} ${profile.name}`);
          suspend.dataset.suspended = String(profile.suspended);
        }
        renderHealthExamples(active, signedOut);
        toggle.disabled = false;
      } catch (error) {
        if (request !== generation) return;
        result.textContent = error.message || 'Impossible de lire les profils de démonstration.';
        identity.textContent = 'Profils de démo indisponibles';
      }
    }

    async function run(action, message = '') {
      if (busy) return;
      busy = true;
      result.textContent = '';
      panel.setAttribute('aria-busy', 'true');
      try {
        await action();
        result.textContent = message;
      } catch (error) {
        result.textContent = error.message || 'La commande de démonstration a échoué.';
      } finally {
        await refresh();
        busy = false;
        panel.removeAttribute('aria-busy');
      }
    }

    window.addEventListener('dobby:demo-reset-blocked', () => {
      result.textContent = 'En attente de la fermeture d’un accès local. Fermez les autres onglets de cette démo si l’attente persiste.';
    });
    window.addEventListener('dobby:demo-change', () => { if (ready && !busy) void refresh(); });
    Promise.resolve(demo.ready).then(() => {
      ready = true;
      return refresh();
    }).catch(() => { identity.textContent = 'Démonstration indisponible dans ce navigateur'; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
