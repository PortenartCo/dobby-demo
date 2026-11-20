const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../chat-engine.js'), 'utf8');
const location = new URL('http://127.0.0.1:8767/essai-stitch-v7/famille.html#chat');

function fixture() {
  const state = {
    familyDocs: [
      { category: 'Santé', id: 'hidden-file', title: 'SECRET ancien PDF' },
      { category: 'Contrat', id: 'normal-file', title: 'Document d’entretien' }
    ],
    sharedHealthVisits: [{ id: 'legacy-visit', title: 'SECRET ancien motif' }]
  };
  const engine = {
    read: () => ({ state }),
    evaluate: code => vm.runInNewContext(`(function(){${code}})()`, { st: state }),
    win: () => ({
      DobbyFamilyUI: { getContext: () => ({}) },
      DobbyFamilyAgenda: { upcoming: () => [
        { kind: 'medical', date: '2026-11-20', title: 'SECRET ancien motif' },
        { kind: 'event', date: '2026-11-20', title: 'Événement ordinaire' }
      ] }
    })
  };
  const window = { DobbyFamilyStitchEngine: engine };
  vm.runInNewContext(source, { window, location, URL, URLSearchParams });
  return window.DobbyChatEngine;
}

test('native chat queries only general documents and ordinary agenda events', async () => {
  const chat = fixture();
  const docs = await chat.reply('documents');
  assert.match(docs.text, /Document d’entretien/);
  assert.doesNotMatch(JSON.stringify(docs), /SECRET|hidden-file/);
  const agenda = await chat.reply('agenda');
  assert.match(agenda.text, /Événement ordinaire/);
  assert.doesNotMatch(JSON.stringify(agenda), /SECRET|legacy-visit/);
});

test('a historical reply that points to a private record remains stored and is hidden in display and replay', async () => {
  const chat = fixture();
  await chat.load();
  const doc = { id: 'one', input: 'documents', answer: 'SECRET ancien PDF', links: [
    { label: 'SECRET ancien PDF', href: './famille.html#document?record=hidden-file' }
  ] };
  const agenda = { id: 'two', input: 'agenda', answer: 'SECRET ancien motif', links: [
    { label: 'Ouvrir l’Agenda', href: './famille.html#agenda' }
  ] };
  const ordinary = { id: 'three', input: 'documents', answer: 'Ordinaire', links: [] };
  for (const row of [doc, agenda, ordinary]) await chat.append(row);
  assert.doesNotMatch(JSON.stringify(chat.visibleHistory()), /SECRET|hidden-file/);
  assert.equal(chat.visibleHistory()[2].answer, 'Ordinaire');
  assert.equal(JSON.stringify(chat.current()), JSON.stringify([doc, agenda, ordinary]));
});
