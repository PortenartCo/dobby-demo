import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as runes from '../family-runes-core.mjs';

const source = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const bridge = source('../family-v2.js');
const modules = source('../family-modules.js');
const sql = source('../../sql-proposals/dobby-v2-modules.sql');

test('preview V5 source matches original except isolated storage and explicitly approved E05/E07.3/E07.4/FAM/PREP native extensions', () => {
  const original=source('../../essai-stitch-v5/index.html').replaceAll('\r\n','\n');
  const preview=source('../index.html').replaceAll('\r\n','\n');
  const preparationScript='<script src="./family-preparations.js"></script>';
  assert.equal(preview.split(preparationScript).length-1,1,'Preparation native writer has one exact script inclusion');
  // E05 deliberately extends this one existing writer. Browser e05-native.cjs
  // verifies its preservation, validation and atomic failure behavior.
  const originalMemberWriter=original.match(/  const member=\{id:existing\?\.id\|\|xuid\(\),name,[\s\S]*?st\.v23HealthMemberId=member\.id;v23MemberEdit=null;save\(\);render\(\);return;/)?.[0];
  assert.ok(originalMemberWriter,'Original native member writer boundary');
  const extendedMemberWriter=/  let member;\n  try\{member=window\.DobbyMagicIdentity\.patch[\s\S]*?  render\(\);return;/;
  // FAM operations extend those same native writers. Each literal amendment is
  // pinned to the immutable starting commit; no function or module is skipped.
  const fam=JSON.parse(source('./fixtures/fam-native-extensions.json'));
  assert.equal(fam.baseCommit,'faf89d50555a3201385eae51f9ef5f93c5bf0499');
  let familyNormalized=preview.replace(preparationScript,'');
  for(const amendment of [...fam.patches].reverse()){
    assert.equal(familyNormalized.split(amendment.after).length-1,1,'Exact FAM amendment occurs once: '+amendment.label);
    familyNormalized=familyNormalized.replace(amendment.after,amendment.before);
  }
  assert.match(familyNormalized,extendedMemberWriter);
  // Fixed literal amendments, not broad function skips: every byte outside the
  // reviewed E07.3 amendments must still match the original V5 source.
  const amendments=JSON.parse(source('./fixtures/e07-3-native-extensions.json'));
  const sharedTaskRetention={before:"if(t.state==='open'&&!current.has(t.key)){",after:"if(t.state==='open'&&!current.has(t.key)&&!s.runeSyncRequired&&!window.DobbySharedRunesV2?.available?.()){"};
  assert.equal(preview.split(sharedTaskRetention.after).length-1,1,'Shared task retention has one native boundary');
  let e073Normalized=familyNormalized.replace(sharedTaskRetention.after,sharedTaskRetention.before);
  const e074=JSON.parse(source('./fixtures/e07-4-native-extensions.json'));
  for(const amendment of [...e074.patches].reverse()){assert.equal(e073Normalized.split(amendment.after).length-1,amendment.occurrences||1,'Each E07.4 amendment occurs exactly once');e073Normalized=e073Normalized.replaceAll(amendment.after,amendment.before);}
  for(const amendment of amendments.patches){assert.equal(e073Normalized.split(amendment.after).length-1,1,'Each approved amendment occurs exactly once');e073Normalized=e073Normalized.replaceAll(amendment.after,amendment.before);}
  const normalized=e073Normalized.replace(extendedMemberWriter,originalMemberWriter).replace('<script src="./family-profile.js?v=20261110-e06-1"></script>\n','').replaceAll('\r\n','\n').replaceAll('dobby-v5-familial-preview-20261108','dobby-stitch-preview-20261105')
    .replaceAll('dobby-v5-familial-files-20261108','dobby-stitch-preview-files-20261105')
    .replaceAll('./stitch-v5.js?v=20261110-e06-1','./stitch-v5.js?v=20261107-1')
    .replace("/* DOBBY_BOOT_ROUTE_SAFE_V1 */\nwindow.__dobbyStartupRoute = { page: st.page, detail: st.detail };\nst.page = 'home';\nst.detail = null;\n", '');
  assert.equal(normalized===original.replaceAll('\r\n','\n'),true,'Every native source byte outside the exact approved amendments is preserved');
  assert.match(preview,/dobby-v5-familial-preview-20261108/);
  assert.match(preview,/dobby-v5-familial-files-20261108/);
  assert.doesNotMatch(preview,/indexedDB\.open\('dobby-stitch-preview-files-20261105'/);
  assert.match(preview,/stitch-v5\.js\?v=20261110-e06-1/);
  const loader=source('../stitch-v5.js');
  assert.match(loader,/family-v2\.js\?v=20261110-e06-1/);
  assert.match(loader,/family-modules\.js\?v=20261110-runes-1/);
  assert.match(loader,/family-agenda\.js\?v=20261108-7/);
  assert.match(loader,/family-agenda\.css\?v=20261108-7/);
  assert.match(loader,/family-missions\.js\?v=20261110-runes-1/);
  assert.match(loader,/family-missions\.css\?v=20261108-7/);
  assert.match(loader,/family-files\.js\?v=20261108-9/);
  assert.match(loader,/family-files\.css\?v=20261108-9/);
  assert.match(loader,/family-health\.js\?v=20261108-7/);
  assert.match(loader,/family-health\.css\?v=20261108-7/);
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
    window:{DobbyRunesReady:Promise.resolve(runes),DobbyFamilyUI:{
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


test('family events and selected medical visits share the household without uploading private famHealth',()=>{
  assert.match(modules,/keys:\['familyMembers','famContacts','famLists','familyEvents','sharedHealthVisits','sharedFamilyNotes','familyPreparationTemplates','familyEventPreparations'\]/);
  assert.doesNotMatch(modules,/keys:\[[^\]]*'famHealth'/);
});


test('manual missions remain separate from automatic tasks',()=>{
  assert.match(modules,/keys:\['autoTasks','manualMissions','runeCredits'\]/);
});

test('binary file uploads do not use the JSON modules API',()=>{
  const files=source('../family-files.js');
  const bucketSql=source('../../sql-proposals/dobby-family-files.sql');
  assert.match(bridge,/storageFetch/);
  assert.match(bridge,/storage\/v1\/object/);
  assert.match(files,/api\.storageFetch\('POST',path,file\)/);
  assert.match(files,/api\.storageFetch\('GET',d\.cloudPath\)/);
  assert.match(files,/api\.storageFetch\('DELETE',d\.cloudPath\)/);
  assert.match(bucketSql,/dobby-family-files/);
  assert.match(bucketSql,/m\.household_id::text=\(storage\.foldername\(name\)\)\[1\]/);
  assert.match(bucketSql,/public=false/);
  assert.doesNotMatch(files,/\bservice_role\b/);
});

test('shared health visits do not automatically upload previous local health records',()=>{
  assert.match(modules,/keys:\['familyMembers','famContacts','famLists','familyEvents','sharedHealthVisits','sharedFamilyNotes','familyPreparationTemplates','familyEventPreparations'\]/);
  assert.doesNotMatch(modules,/keys:\[[^\]]*'famHealth'/);
  const health=source('../family-health.js');
  assert.match(health,/sharedHealthVisits/);
  assert.doesNotMatch(health,/st\.famHealth\s*=/);
});


test('a health document remains local until the user chooses household sharing', () => {
  const files = source('../family-files.js');
  const sandbox = {
    st: {page:'documents', familyDocs:[
      {id:'private-health', title:'Fiche privée', category:'Santé'},
      {id:'shared-health', title:'Fiche santé choisie', category:'Santé', sharedToHousehold:true},
      {id:'shared-insurance', title:'Contrat maison', category:'Assurances'}
    ]},
    window: {DobbyFamilyUI: {esc:String, getContext:()=>null, isModuleActive:()=>false}},
    drawDocuments:()=>'<div>Vue V5 initiale</div>',
    docEdit:null, docNoteEdit:null, docDetail:null,
    document: {addEventListener:()=>{}},
    render:()=>{}, save:()=>{}, console
  };
  vm.runInNewContext(files, sandbox);
  assert.equal(sandbox.window.DobbyFamilyFiles.sharedCount(), 2);
  const html = sandbox.drawDocuments();
  assert.match(html, /Fiche santé choisie/);
  assert.match(html, /Contrat maison/);
  assert.doesNotMatch(html, /Fiche privée/);
  assert.match(html, /Vue V5 initiale/);
});
