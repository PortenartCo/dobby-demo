/* Installation and service worker updates for the four DOBBY V7 entry pages. */
(() => {
  'use strict';
  if (window.top !== window || window.DobbyReview || window.DobbyGlobalDemo) return;

  const scope = new URL('../', document.currentScript.src);
  const workerURL = new URL('pwa-sw.js', scope);
  const displayMode = window.matchMedia('(display-mode: standalone)');
  let deferredPrompt;
  let installed = false;
  let prompting = false;
  let installButton;
  let help;

  const standalone = () => installed || displayMode.matches || navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (!standalone()) deferredPrompt = event;
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = undefined;
    syncMenu();
  });

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, className) {
    const node = element('button', text, className);
    node.type = 'button';
    return node;
  }

  function installSteps() {
    const agent = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(agent) ||
      (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1);
    const safari = /Version\/[^ ]+.*Safari\//i.test(agent) &&
      !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(agent);

    if (ios) return [
      ...(!safari ? ['Ouvrez DOBBY dans Safari.'] : []),
      'Touchez « Partager » dans la barre d’outils ou dans le menu « Plus » de Safari.',
      'Choisissez « Sur l’écran d’accueil ». Au besoin, ouvrez « En voir plus » ou « Modifier les actions ».',
      'Activez « Ouvrir comme app web » si l’option apparaît, puis touchez « Ajouter ».',
    ];
    if (safari && /Macintosh/i.test(agent)) return [
      'Cliquez sur le bouton « Partager » dans la barre d’outils de Safari.',
      'Choisissez « Ajouter au Dock », puis cliquez sur « Ajouter ».',
    ];
    if (/Android/i.test(agent)) return [
      'Ouvrez le menu de votre navigateur à côté de la barre d’adresse.',
      'Dans Chrome, choisissez « Installer et créer un raccourci » (ou « Ajouter à l’écran d’accueil »), puis « Installer ».',
    ];
    if (/(Chrome|Chromium)\//i.test(agent) && !/Edg\/|OPR\//i.test(agent)) return [
      'Cliquez sur l’icône d’installation dans la barre d’adresse, si elle apparaît.',
      'Vous pouvez aussi ouvrir « Plus », puis « Caster, enregistrer et partager » et choisir « Installer la page en tant qu’appli ».',
    ];
    return [
      'Cherchez « Installer » dans la barre d’adresse ou dans le menu de votre navigateur.',
      'Si cette option est absente, ajoutez DOBBY à vos favoris pour le retrouver.',
    ];
  }

  function showHelp() {
    if (standalone() || !installButton?.isConnected) return;
    if (!help) {
      help = element('dialog', '', 'dobby-pwa-dialog');
      help.id = 'dobby-pwa-install-help';
      help.setAttribute('aria-labelledby', 'dobby-pwa-install-title');
      const title = element('h2', 'Installer DOBBY');
      title.id = 'dobby-pwa-install-title';
      const steps = element('ol');
      steps.append(...installSteps().map(step => element('li', step)));
      const close = button('Fermer', 'dobby-pwa-primary');
      close.autofocus = true;
      close.addEventListener('click', () => help.close());
      help.addEventListener('close', () => {
        if (installButton?.isConnected) installButton.focus({ preventScroll: true });
      });
      help.append(title, steps, close);
      document.body.append(help);
    }
    if (!help.open) help.showModal();
  }

  async function startInstall() {
    if (standalone() || prompting) return;
    const event = deferredPrompt;
    if (!event) {
      showHelp();
      return;
    }

    deferredPrompt = undefined;
    prompting = true;
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      showHelp();
    } finally {
      prompting = false;
    }
  }

  function syncMenu() {
    const body = document.body;
    const menu = body?.dataset.familyView === 'menu' && body.querySelector(':scope > main.rg-menu-page');
    if (!menu || standalone()) {
      installButton?.remove();
      if (help?.open) help.close();
      return;
    }
    if (!installButton) {
      installButton = button('', 'rg-menu-card dobby-pwa-install');
      installButton.id = 'dobby-pwa-install';
      installButton.setAttribute('aria-haspopup', 'dialog');
      const icon = element('span', 'install_mobile', 'rg-menu-icon material-symbols-outlined');
      icon.setAttribute('aria-hidden', 'true');
      installButton.append(icon, element('span', 'Installer DOBBY', 'rg-menu-label'));
      installButton.addEventListener('click', startInstall);
    }
    if (installButton.parentElement !== menu) menu.append(installButton);
  }

  async function registerWorker() {
    const workers = navigator.serviceWorker;
    let observedController = workers.controller;
    const registration = await workers.register(workerURL, { scope, updateViaCache: 'none' });
    let notice;
    let status;
    let update;
    let later;
    let dismissedWorker;
    let appliedWorker;
    let dismissedAppliedWorker;
    let previousController;
    let activationTimeout;

    const waiting = () => workers.controller?.scriptURL === workerURL.href ? registration.waiting : null;
    const shouldReload = () => appliedWorker && appliedWorker !== dismissedAppliedWorker;

    function showUpdate(message = 'Une mise à jour de DOBBY est disponible.') {
      if (!notice) {
        notice = element('aside', '', 'dobby-pwa-update');
        notice.id = 'dobby-pwa-update';
        notice.setAttribute('aria-label', 'Mise à jour de DOBBY');
        status = element('p', '');
        status.setAttribute('role', 'status');
        update = button('Mettre à jour', 'dobby-pwa-primary');
        update.addEventListener('click', () => {
          if (shouldReload()) window.location.reload();
          else activateUpdate();
        });
        later = button('Plus tard', 'dobby-pwa-secondary');
        later.addEventListener('click', () => {
          if (shouldReload()) dismissedAppliedWorker = appliedWorker;
          else dismissedWorker = waiting();
          syncUpdate();
        });
        const actions = element('div', '', 'dobby-pwa-update-actions');
        actions.append(update, later);
        notice.append(status, actions);
        document.body.append(notice);
      }
      notice.hidden = false;
      if (status.textContent !== message) status.textContent = message;
      const label = shouldReload() ? 'Recharger DOBBY' : 'Mettre à jour';
      if (update.textContent !== label) update.textContent = label;
      update.disabled = later.disabled = Boolean(previousController);
    }

    function syncUpdate() {
      if (previousController) return;
      const worker = waiting();
      if (shouldReload()) showUpdate('La mise à jour de DOBBY est prête.');
      else if (worker && worker !== dismissedWorker) showUpdate();
      else if (notice) notice.hidden = true;
    }

    function activationFailed() {
      previousController = undefined;
      window.clearTimeout(activationTimeout);
      if (waiting()) showUpdate('La mise à jour n’a pas abouti. Vous pouvez réessayer.');
      else syncUpdate();
    }

    function activateUpdate() {
      const worker = waiting();
      if (!worker || previousController) {
        syncUpdate();
        return;
      }
      previousController = workers.controller;
      showUpdate('Installation de la mise à jour…');
      activationTimeout = window.setTimeout(activationFailed, 15000);
      try {
        worker.postMessage({ type: 'SKIP_WAITING' });
      } catch {
        activationFailed();
      }
    }

    function onControllerChange() {
      const controller = workers.controller;
      const replaced = controller !== observedController &&
        observedController?.scriptURL === workerURL.href && controller?.scriptURL === workerURL.href;
      observedController = controller;
      if (previousController && controller !== previousController && controller?.scriptURL === workerURL.href) {
        window.clearTimeout(activationTimeout);
        previousController = undefined;
        window.location.reload();
        return;
      }
      if (replaced) appliedWorker = controller;
      syncUpdate();
    }
    workers.addEventListener('controllerchange', onControllerChange);
    onControllerChange();

    function watchInstalling() {
      registration.installing?.addEventListener('statechange', syncUpdate);
      syncUpdate();
    }
    registration.addEventListener('updatefound', watchInstalling);
    watchInstalling();

    let lastCheck = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      syncUpdate();
      if (Date.now() - lastCheck < 60000 || registration.waiting || registration.installing) return;
      lastCheck = Date.now();
      registration.update().catch(() => {});
    });
  }

  function init() {
    if (!['traverse', 'missions', 'famille', 'taverne'].includes(document.body.dataset.dv7Screen)) return;
    if (document.body.dataset.dv7Screen === 'famille') {
      new MutationObserver(syncMenu).observe(document.body, {
        childList: true,
        attributes: true,
        attributeFilter: ['data-family-view'],
      });
      displayMode.addEventListener('change', syncMenu);
      syncMenu();
    }
    if (window.isSecureContext && 'serviceWorker' in navigator) registerWorker().catch(() => {});
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
