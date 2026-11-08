import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const bridge = source('../family-v2.js');
const modules = source('../family-modules.js');
const sql = source('../../sql-proposals/dobby-v2-modules.sql');

test('preview V5 source matches original except isolated browser storage names', () => {
  const original=source('../../essai-stitch-v5/index.html');
  const preview=source('../index.html');
  const normalized=preview.replaceAll('dobby-v5-familial-preview-20261108','dobby-stitch-preview-20261105')
    .replaceAll('dobby-v5-familial-files-20261108','dobby-stitch-preview-files-20261105')
    .replaceAll('./stitch-v5.js?v=20261108-3','./stitch-v5.js?v=20261107-1');
  assert.equal(normalized,original);
  assert.match(preview,/dobby-v5-familial-preview-20261108/);
  assert.match(preview,/dobby-v5-familial-files-20261108/);
  assert.doesNotMatch(preview,/indexedDB\.open\('dobby-stitch-preview-files-20261105'/);
  assert.match(preview,/stitch-v5\.js\?v=20261108-3/);
  const loader=source('../stitch-v5.js');
  assert.match(loader,/family-v2\.js\?v=20261108-3/);
  assert.match(loader,/family-modules\.js\?v=20261108-3/);
});


test('Stitch V5 integration adds shared panier without removing original preparation UI', async () => {
  const listeners = [];
  const sandbox = {
    st:{page:'shop',extraPage:'',planned:{},shopFinal:null,extras:[]},
    drawShop:()=>'<div id="original-v5-shopping">Préparation V5 originale</div>',
    render:()=>{},save:()=>{},
    document:{
      addEventListener:(type,handler)=>listeners.push(type),
      getElementById:()=>null,
      createElement:()=>({id:'',hidden:false,innerHTML:''}),
      body:{append:()=>{}},activeElement:null
    },
    window:{addEventListener:()=>{}},
    setInterval:()=>0,
    queueMicrotask:fn=>Promise.resolve().then(fn),
    console
  };
  vm.runInNewContext(bridge,sandbox);
  const html = sandbox.drawShop();
  assert.match(html,/Le panier commun/);
  assert.match(html,/original-v5-shopping/);
  assert.match(html,/Connecter mon foyer/);
  assert.ok(listeners.includes('submit'));
  assert.ok(listeners.includes('change'));
});

test('module adapter fails closed when Supabase modules table is missing', async () => {
  let provider;
  const sandbox={
    st:{page:'family',familyDocs:[],famHealth:[{id:'test',name:'privé'}]},
    document:{addEventListener:()=>{}},
    window:{DobbyFamilyUI:{
      getContext:()=>({userId:'u1',householdId:'h1'}),
      meta:async()=>null,
      putMeta:async()=>{},
      authorized:async()=>{ const error=Error('Table absent'); error.status=404;throw error; },
      esc:String,repaint:()=>{},showMessage:()=>{},openModal:()=>{},
      registerModules:x=>{provider=x;}
    }},
    clearTimeout:()=>{},setTimeout:()=>0,localStorage:{setItem:()=>{}},confirm:()=>true,
    save:()=>{},render:()=>{},console
  };
  vm.runInNewContext(modules,sandbox);
  assert.ok(provider);
  await provider.start();
  const html=provider.html();
  assert.match(html,/Erreur HTTP 404 sur les modules familiaux/);
  assert.match(html,/Données locales \(non synchronisées\)/);
  assert.match(html,/Rendez-vous médicaux et santé/);
  assert.doesNotMatch(html,/data-fm-action="activate"/);
});

test('module schema enforces household isolation and excludes health and attachments', () => {
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/WITH CHECK \(/);
  assert.match(sql,/household_id = dobby_v2_modules\.household_id/);
  assert.doesNotMatch(sql,/module IN \([^)]*'health'/s);
  assert.doesNotMatch(sql,/module IN \([^)]*'documents'/s);
  assert.match(modules,/attachmentName/);
});

test('preview denies cross-household browser reuse and drops unauthorized session', () => {
  assert.match(bridge,/deviceHouseholdId/);
  assert.match(bridge,/deviceHousehold !== hh/);
  assert.match(bridge,/profil de navigateur distinct/);
  assert.match(bridge,/await delMeta\('session'\)/);
});
