import { activeReminders } from './health-essential.mjs';

const titles = {
  profile: 'Informations essentielles',
  visit: 'Rendez-vous',
  instruction: 'Consignes pratiques',
  document: 'Documents privés'
};
const labels = {
  information: 'Informations utiles', allergies: 'Allergies', treatments: 'Traitements en cours',
  title: 'Intitulé privé', provider: 'Professionnel', date: 'Date du rendez-vous', time: 'Heure',
  location: 'Lieu privé', reference: 'Référence privée', note: 'Note personnelle',
  childPlace: 'Lieu publié pour l’enfant', childText: 'Consigne publiée pour l’enfant',
  childVisible: 'Publier dans la vue de cet enfant',
  agendaVisible: 'Partager la date et l’heure dans l’Agenda du foyer',
  remindDayBefore: 'Rappel la veille (J-1)', remindSameDay: 'Rappel le jour même (J0)',
  cancelled: 'Rendez-vous annulé'
};

function element(doc, tag, text, className) {
  const node = doc.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(doc, text, action) {
  const node = element(doc, 'button', text, 'fa-button');
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

function group(doc, title) {
  const panel = element(doc, 'section', '', 'fa-context health-essential-group');
  panel.append(element(doc, 'h2', title));
  return panel;
}

function when({ date, time }) {
  return date ? [new Intl.DateTimeFormat('fr-BE', {
    dateStyle: 'long', timeZone: 'UTC'
  }).format(new Date(date + 'T12:00:00Z')), time].filter(Boolean).join(' · ') : '';
}

export function renderHealthReminders(doc, rows, now = new Date()) {
  const reminders = activeReminders(rows, now);
  if (!reminders.length) return null;
  const panel = group(doc, 'Rappels de rendez-vous');
  const list = element(doc, 'ul');
  for (const row of reminders) {
    list.append(element(doc, 'li', (row.offset === 1 ? 'Demain' : 'Aujourd’hui') + ' · ' + when(row)));
  }
  panel.append(list);
  return panel;
}

function field(doc, name, value, options = {}) {
  const { type = 'text', label = labels[name], required = false, maxLength } = options;
  const wrapper = element(doc, 'label', '', type === 'checkbox' ? 'health-essential-checkbox' : 'fa-field');
  const input = element(doc, type === 'textarea' ? 'textarea' : 'input');
  if (type !== 'textarea') input.type = type;
  if (type === 'date') {
    input.min = '2000-01-01';
    input.max = '2100-12-31';
  }
  input.name = name;
  input.required = required;
  if (maxLength) input.maxLength = maxLength;
  const caption = element(doc, 'span', label);
  if (type === 'checkbox') {
    input.checked = value === true;
    wrapper.append(input, caption);
  } else {
    if (type === 'file') input.accept = 'application/pdf,image/jpeg,image/png,image/webp';
    else input.value = value ?? '';
    wrapper.append(caption, input);
  }
  return wrapper;
}

function textFields(card, doc, fields, keys) {
  const list = element(doc, 'dl');
  for (const key of keys) {
    if (fields[key]) list.append(element(doc, 'dt', labels[key]), element(doc, 'dd', fields[key]));
  }
  if (list.childElementCount) card.append(list);
}

function card(doc, label) {
  const node = element(doc, 'article', '', 'health-essential-record');
  if (label) node.append(element(doc, 'h3', label));
  return node;
}

/** Mounted by the existing Family renderer once the native session adapter is available. */
export function mountHealthEssential(root, { client, getRole, subscribe, person: initialPerson, now }) {
  const doc = root.ownerDocument;
  root.classList.add('health-essential');
  const status = element(doc, 'p', '', 'fa-note health-essential-status');
  status.setAttribute('role', 'status');
  const content = element(doc, 'div');
  root.replaceChildren(status, content);
  let revision = 0;
  let selected = initialPerson;
  let selectionAllowed = true;
  let editing = false;
  let disposed = false;

  function announce(message = '') { status.textContent = message; }
  function begin() {
    const ticket = ++revision;
    content.replaceChildren();
    editing = false;
    announce('Vérification du carnet…');
    return ticket;
  }

  async function refresh(message) {
    if (disposed) return;
    const ticket = begin();
    const valid = () => ticket === revision && !disposed;
    const role = getRole();
    try {
      if (role === 'child') {
        const [rows, reminders] = await Promise.all([client.read('practical'), client.read('reminders')]);
        if (!valid()) return;
        readOnly(rows);
        const reminderPanel = renderHealthReminders(doc, reminders, now?.());
        if (reminderPanel) content.prepend(reminderPanel);
      } else if (role === 'parent') {
        const people = await client.read('people');
        if (!valid()) return;
        if (!selected && selectionAllowed) selected = people[0]?.id;
        const person = people.find(item => item.id === selected);
        const rows = await Promise.all([
          person ? client.read('private', person.id) : [], client.read('reminders')
        ]);
        if (!valid()) return;
        const reminderPanel = renderHealthReminders(doc, rows[1], now?.());
        if (reminderPanel) content.append(reminderPanel);
        renderPeople(people, person);
        if (person) renderPrivate(person, rows[0]);
      } else {
        announce('Connectez un compte familial vérifié pour ouvrir Santé.');
        return;
      }
      announce(message);
    } catch {
      if (!valid()) return;
      content.replaceChildren();
      announce('Carnet indisponible. Vérifiez votre connexion et vos droits.');
      content.append(button(doc, 'Réessayer', () => refresh()));
    }
  }

  function renderPeople(people, person) {
    const header = group(doc, 'Carnet Santé');
    const input = element(doc, 'select');
    const empty = element(doc, 'option', 'Choisir un carnet');
    empty.value = '';
    input.append(empty);
    for (const item of people) {
      const option = element(doc, 'option', item.name);
      option.value = item.id;
      input.append(option);
    }
    input.value = person?.id || '';
    const label = element(doc, 'label', 'Personne', 'fa-field');
    label.append(input);
    input.addEventListener('change', () => {
      selected = input.value;
      selectionAllowed = false;
      void refresh();
    });
    header.append(label, element(doc, 'p', 'Les rappels s’affichent lorsque DOBBY est ouvert.', 'fa-note'));
    if (!person) header.append(element(doc, 'p', selected ? 'Carnet indisponible pour ce compte.' : 'Sélectionnez une personne.'));
    content.append(header);
  }

  function readOnly(rows) {
    const panel = group(doc, 'Mes rendez-vous et consignes');
    for (const row of rows) {
      const item = card(doc, row.kind === 'visit' ? 'Rendez-vous · ' + when(row) : 'Consigne pratique');
      if (row.place) item.append(element(doc, 'p', row.place));
      if (row.text) item.append(element(doc, 'p', row.text));
      panel.append(item);
    }
    if (!rows.length) panel.append(element(doc, 'p', 'Aucun rendez-vous ni consigne publié pour vous.'));
    content.append(panel);
  }

  function renderPrivate(person, rows) {
    const dependent = ['child', 'baby'].includes(person.category);
    for (const [kind, title] of Object.entries(titles)) {
      if (kind === 'instruction' && !dependent) continue;
      const section = group(doc, title);
      const records = rows.filter(row => row.kind === kind);
      for (const row of records) {
        const { fields } = row;
        const item = card(doc, fields.title);
        if (kind === 'profile') textFields(item, doc, fields, ['information', 'allergies', 'treatments']);
        if (kind === 'visit') {
          item.append(element(doc, 'p', when(fields)));
          item.append(element(doc, 'p', fields.cancelled ? 'Annulé' :
            fields.agendaVisible ? 'Créneau partagé dans l’Agenda' : 'Rendez-vous privé'));
          textFields(item, doc, fields, ['provider', 'location', 'reference', 'note']);
        }
        if (kind === 'instruction') {
          item.append(element(doc, 'p', fields.childText),
            element(doc, 'p', fields.childVisible ? 'Publié pour cet enfant' : 'Consigne privée'));
        }
        const actions = element(doc, 'div', '', 'health-essential-actions');
        if (kind === 'document') {
          if (fields.ready) actions.append(button(doc, 'Télécharger', () => download(row)));
          else {
            item.append(element(doc, 'p', 'Envoi à terminer'));
            if (row.canUpload) actions.append(
              button(doc, 'Reprendre l’envoi', () => edit(section, person, kind, row)),
              button(doc, 'Confirmer le fichier déjà envoyé', event => finalizeExisting(person, row, event.currentTarget))
            );
          }
        } else {
          actions.append(button(doc, 'Modifier', () => edit(section, person, kind, row)));
        }
        if (kind !== 'profile') actions.append(button(doc, 'Retirer', () => remove(section, person, row)));
        item.append(actions);
        section.append(item);
      }
      if (kind !== 'profile' || !records.length) {
        section.append(button(doc, kind === 'profile' ? 'Renseigner le carnet' :
          kind === 'visit' ? 'Ajouter un rendez-vous' :
          kind === 'instruction' ? 'Ajouter une consigne' : 'Ajouter un document',
        () => edit(section, person, kind)));
      }
      content.append(section);
    }
  }

  async function finalizeExisting(person, row, action) {
    const ticket = revision;
    action.disabled = true;
    try {
      await client.finalize(person.id, row);
      if (!disposed && ticket === revision) await refresh('Fichier envoyé confirmé.');
    } catch {
      if (!disposed && ticket === revision) await refresh('Fichier non confirmé. Vérifiez la pièce en attente.');
    }
  }

  async function download(row) {
    const ticket = revision;
    try {
      const file = await client.download(row);
      if (ticket !== revision || disposed) return;
      const url = URL.createObjectURL(file);
      const link = element(doc, 'a');
      const extension = row.path.split('.').pop();
      link.download = 'document-sante.' + extension;
      link.href = url;
      link.click();
      doc.defaultView.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (ticket === revision && !disposed) await refresh('Document indisponible pour ce compte.');
    }
  }

  function edit(section, person, kind, row) {
    if (editing) return;
    editing = true;
    const form = element(doc, 'form');
    const fields = row?.fields || {};
    const add = (name, options) => form.append(field(doc, name, fields[name], options));
    const check = (name, defaultValue = false) =>
      form.append(field(doc, name, fields[name] ?? defaultValue, { type: 'checkbox' }));
    if (kind === 'profile') {
      for (const name of ['information', 'allergies', 'treatments']) add(name, { type: 'textarea', maxLength: 4000 });
    } else if (kind === 'visit') {
      add('title', { required: true, maxLength: 160 });
      add('date', { type: 'date', required: true });
      add('time', { type: 'time' });
      for (const name of ['provider', 'location', 'reference']) add(name, { maxLength: 160 });
      add('note', { type: 'textarea', maxLength: 500 });
      check('remindDayBefore', true);
      check('remindSameDay', true);
      check('cancelled');
      check('agendaVisible');
      if (['child', 'baby'].includes(person.category)) {
        check('childVisible');
        add('childPlace', { maxLength: 160 });
        add('childText', { type: 'textarea', maxLength: 500 });
      }
    } else if (kind === 'instruction') {
      add('childText', { type: 'textarea', required: true, maxLength: 500, label: 'Consigne pratique' });
      check('childVisible');
    } else {
      if (!row) add('title', { required: true, maxLength: 160, label: 'Nom du document' });
      add('file', { type: 'file', required: true, label: 'PDF ou image (10 Mo maximum)' });
    }
    const id = row?.id || crypto.randomUUID();
    const action = kind === 'document'
      ? values => client.upload(person.id, values.file, row, values.title, {
        id, operationId: requestId, finalizeId
      })
      : values => client.write({ person: person.id, id, kind, values, revision: row?.revision, operationId: requestId });
    let requestId = crypto.randomUUID();
    const finalizeId = crypto.randomUUID();
    let submitted;
    const save = element(doc, 'button', kind === 'document' ? 'Envoyer le fichier' : 'Enregistrer', 'fa-button');
    save.type = 'submit';
    const reload = button(doc, 'Fermer le formulaire', () => refresh());
    const ticket = revision;
    form.append(save, reload);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (save.disabled || ticket !== revision) return;
      const values = Object.fromEntries(new FormData(form));
      for (const input of form.querySelectorAll('input[type=checkbox]')) values[input.name] = input.checked;
      const snapshot = JSON.stringify(values);
      if (submitted && submitted !== snapshot) requestId = crypto.randomUUID();
      submitted = snapshot;
      save.disabled = true;
      reload.disabled = true;
      announce('Enregistrement…');
      try {
        await action(values);
        if (!disposed && ticket === revision) await refresh('Enregistrement confirmé.');
      } catch (error) {
        if (ticket !== revision || disposed) return;
        if (error.status === 401 || error.status === 403 || (kind === 'document' && error.status === 409)) {
          await refresh(error.status === 409
            ? 'Vérifiez la pièce existante avant de reprendre l’envoi.'
            : undefined);
          return;
        }
        announce(error.status === 409
          ? 'Une autre modification a été enregistrée. Fermez le formulaire pour recharger.'
          : 'Enregistrement non confirmé. Vous pouvez réessayer.');
        save.disabled = false;
        reload.disabled = false;
      }
    });
    section.replaceChildren(element(doc, 'h2', titles[kind]), form);
    form.querySelector('input, textarea')?.focus();
  }

  function remove(section, person, row) {
    if (editing) return;
    editing = true;
    const confirmation = card(doc, 'Retirer cet élément ?');
    const ticket = revision;
    const operationId = crypto.randomUUID();
    const cancel = button(doc, 'Annuler', () => refresh());
    const confirm = button(doc, 'Confirmer le retrait', async () => {
      if (ticket !== revision) return;
      confirm.disabled = true;
      cancel.disabled = true;
      try {
        await client.write({ person: person.id, id: row.id, kind: row.kind, revision: row.revision,
          action: 'remove', operationId });
        if (ticket === revision && !disposed) await refresh('Élément retiré.');
      } catch {
        if (ticket === revision && !disposed) await refresh('Retrait non confirmé. Vérifiez le carnet.');
      }
    });
    confirmation.append(confirm, cancel);
    section.replaceChildren(confirmation);
    cancel.focus();
  }

  async function revalidate() {
    if (!editing) return refresh();
    const ticket = revision;
    try {
      await client.read('private', selected);
    } catch {
      if (ticket === revision && !disposed) await refresh();
    }
  }
  const onVisibility = () => { if (doc.visibilityState === 'visible') void revalidate(); };
  const invalidate = () => { selected = undefined; selectionAllowed = true; void refresh(); };
  const unsubscribe = subscribe?.(invalidate);
  doc.addEventListener('visibilitychange', onVisibility);
  void refresh();
  return Object.freeze({
    refresh,
    revalidate,
    unmount() {
      disposed = true;
      revision++;
      unsubscribe?.();
      doc.removeEventListener('visibilitychange', onVisibility);
      root.replaceChildren();
    }
  });
}
