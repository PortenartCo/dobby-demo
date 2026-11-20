/* Santé V7 uses the iframe's authenticated Family transport. Nothing is written to the shared state. */
window.DobbyHealthRuntime = (() => {
  'use strict';
  let native = null;
  let modules;
  let pendingProbe;
  let publicationKey = null;
  let authChannel;
  let suspended = false;
  const parts = new Map();
  const healthRoutes = new Set(['health', 'health-person', 'health-history', 'medical-edit']);
  const load = () => modules ||= Promise.all([import('./health-essential.mjs'), import('./health-essential-view.mjs')]);

  function session() {
    const actor = native?.getContext();
    const access = native?.access?.state?.();
    const category = access?.profile?.memberCategory;
    if (!actor?.identityVerified || access?.verified !== true || access.phase !== 'active' ||
        actor.userId !== access.userId || actor.householdId !== access.householdId ||
        actor.memberId !== access.memberId || !['parent', 'child'].includes(category)) return null;
    const epoch = native.connectionState().epoch;
    return { category, memberId: actor.memberId, householdId: actor.householdId,
      key: JSON.stringify([actor.userId, actor.householdId, actor.memberId, category, epoch]) };
  }

  function legacyDemo() {
    const engine = document.getElementById('dv7-engine')?.contentWindow;
    const demo = engine?.DobbyReview?.demoMemberId;
    const access = native?.access?.state?.();
    return Boolean(demo && !access?.userId && !access?.authenticated);
  }

  function filterHistoricalState(state) {
    if (legacyDemo()) return state;
    state.famHealth = [];
    state.sharedHealthVisits = [];
    if (Array.isArray(state.familyDocs)) state.familyDocs = state.familyDocs.filter(row => row?.category !== 'Santé');
    return state;
  }

  function capabilities(actor) {
    if (window.DobbyPublicConfig?.healthEssentialAvailable !== true) return Promise.resolve({});
    if (pendingProbe?.key === actor.key) return pendingProbe.promise;
    const params = new URLSearchParams({ p_household_id: actor.householdId });
    const probe = { key: actor.key };
    probe.promise = native.authorized('GET', 'rpc/dobby_health_capabilities?' + params)
      .then(result => session()?.key === actor.key ? result || {} : {}, () => ({}))
      .finally(() => { if (pendingProbe === probe) pendingProbe = null; });
    pendingProbe = probe;
    return probe.promise;
  }

  function element(tag, text, box) {
    const node = box.ownerDocument.createElement(tag);
    node.textContent = text;
    return node;
  }

  function attach(root, render, unavailable = () => {}) {
    prune();
    let generation = 0;
    const part = {
      handle: null,
      clear() {
        generation++;
        part.handle?.unmount();
        part.handle = null;
        root.replaceChildren();
      },
      async refresh(recheck = true) {
        if (suspended || !root.isConnected) return;
        if (part.handle && !recheck) return;
        const ticket = ++generation;
        const actor = session();
        if (!part.handle) root.replaceChildren();
        const current = () => !suspended && root.isConnected && ticket === generation &&
          session()?.key === actor?.key;
        try {
          if (!actor || (await capabilities(actor)).enabled !== true) {
            if (current()) { part.clear(); unavailable(root, actor); }
            return;
          }
          if (!current()) return;
          const [model, view] = await load();
          if (!current()) return;
          const client = model.createHealthClient(native, native.healthStorage);
          await render({ client, model, view, actor, current, part });
        } catch {
          if (current()) { part.clear(); unavailable(root, actor); }
        }
      }
    };
    parts.set(root, part);
    void part.refresh();
    return part;
  }

  function prune() {
    for (const [root, part] of parts) {
      if (!root.isConnected) { part.clear(); parts.delete(root); }
    }
  }

  function refreshAll({ reset = false, recheck = true } = {}) {
    prune();
    for (const part of parts.values()) {
      if (reset) part.clear();
      void part.refresh(recheck);
    }
  }

  function connect(api, engine) {
    if (!api || native === api) return;
    native = api;
    if (window.DobbyPublicConfig?.healthEssentialAvailable === true) {
      engine.DobbyHealthLegacyClosed = () => publicationKey !== null && publicationKey === session()?.key;
      engine.DobbyVerifyHealthLegacyClosure = async () => {
        const actor = session();
        if (!actor) return false;
        const result = await capabilities(actor);
        if (session()?.key !== actor.key) return false;
        if (result.legacyClosed === true || result.enabled === true) publicationKey = actor.key;
        return publicationKey === actor.key;
      };
    }
    engine.addEventListener('dobby:access-change', () => {
      if (publicationKey !== session()?.key) publicationKey = null;
      refreshAll({ reset: true });
    });
    if (window.DobbyPublicConfig?.healthEssentialAvailable === true &&
        !authChannel && typeof BroadcastChannel === 'function') {
      authChannel = new BroadcastChannel('dobby-auth-session-v7');
      authChannel.addEventListener('message', event => {
        if (event.data?.type === 'auth-session-change') refreshAll({ reset: true });
      });
    }
    refreshAll({ reset: true });
  }

  function mountCarnet(root, person) {
    return attach(root, ({ client, view, actor, part }) => {
      if (part.handle) return part.handle.revalidate();
      part.handle = view.mountHealthEssential(root, {
        client,
        getRole: () => session()?.category,
        person: actor.category === 'parent' ? person : undefined
      });
    }, (box, actor) => {
      box.append(element('p', actor
        ? 'Santé est actuellement indisponible pour ce foyer.'
        : 'Connectez un compte familial vérifié pour ouvrir Santé.', box));
      if (actor?.category !== 'child') box.append(element('p',
        'Les anciens carnets restent sur leur appareil en attendant une reprise contrôlée.', box));
    });
  }

  function mountMenu(root, link) {
    attach(root, ({ current }) => { if (current()) root.replaceChildren(link()); });
  }

  function mountMember(root, memberId, link) {
    attach(root, async ({ client, actor, current }) => {
      if (actor.category === 'child' && memberId !== actor.memberId) return;
      if (actor.category === 'parent' && !(await client.read('people')).some(person => person.id === memberId)) return;
      if (current()) root.replaceChildren(link());
    });
  }

  function mountAgenda(root, day, { filtered = false, embedded = false } = {}) {
    if (legacyDemo()) return;
    attach(root, async ({ client, model, view, current }) => {
      const [slots, reminders] = await Promise.all([
        filtered ? [] : client.read('agenda'), embedded ? [] : client.read('reminders')
      ]);
      if (!current()) return;
      const content = [];
      const seen = new Set();
      for (const slot of model.agendaSlots(slots)) {
        if (slot.date !== day || seen.has(slot.id)) continue;
        seen.add(slot.id);
        const card = element('article', '', root);
        card.className = 'fam-review-record';
        card.dataset.healthAgendaSlot = '';
        card.append(element('h3', slot.title, root), element('p', slot.time || 'Toute la journée', root));
        content.push(card);
      }
      const reminder = view.renderHealthReminders(root.ownerDocument, reminders);
      if (reminder) content.push(reminder);
      root.replaceChildren(...content);
    });
  }

  function mountToday(root) {
    if (legacyDemo()) return;
    attach(root, async ({ client, view, current }) => {
      const rows = await client.read('reminders');
      if (!current()) return;
      const reminder = view.renderHealthReminders(root.ownerDocument, rows);
      if (reminder) root.replaceChildren(reminder);
    });
  }

  window.addEventListener('pagehide', () => {
    suspended = true;
    publicationKey = null;
    authChannel?.close();
    authChannel = null;
    for (const part of parts.values()) part.clear();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && window.DobbyPublicConfig?.healthEssentialAvailable === true) {
      // Reboot native Auth from its durable session before restoring any private view.
      window.location.reload();
    }
  });
  window.addEventListener('online', () => refreshAll());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshAll({ recheck: false });
  });

  return Object.freeze({ connect, legacyDemo, filterHistoricalState,
    handles: view => healthRoutes.has(view) && !legacyDemo(),
    mountCarnet, mountMenu, mountMember, mountAgenda, mountToday });
})();
