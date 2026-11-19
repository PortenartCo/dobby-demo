import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { catalog } from '../lot2a/catalog.mjs';
import { run, raw, stop, businessSnapshot } from '../local-db.mjs';
import { approved, renderCataloguePreflight, renderMissionsPreflight, buildArtifacts } from '../../../supabase/compatibility/lot5b/build-variants.mjs';

const candidatePath = new URL('../../../supabase/compatibility/lot5b/catalogue.preflight.sql', import.meta.url);
const historical = readFileSync(new URL('../../../supabase/migrations/20261117215619_dobby_private_access_tables_rpc.sql', import.meta.url), 'utf8');
// RED comparison uses only the original read-only preflight, never its writes.
const preflight = () => existsSync(candidatePath) ? readFileSync(candidatePath, 'utf8') : historical.slice(0, historical.indexOf('-- Temporary, existing ADMIN')).replace(/^BEGIN;$/m, '');
const check = (setup = '') => raw(`BEGIN; ${setup} SET ROLE postgres; ${preflight()} ROLLBACK;`);
function passes(result) { assert.equal(result.status, 0, result.stderr); }
function refuses(result) { assert.notEqual(result.status, 0, 'Unapproved catalogue change was accepted'); assert.match(result.stderr, /catalogue|catalog|drift|approv/i); }
before(() => { const info = catalog(); console.log('LOT5B_CATALOGUE_RUNTIME ' + info.version); });
after(stop);

test('published catalogue passes without modifying business functions or data', () => {
 const before = businessSnapshot(); passes(check()); assert.equal(businessSnapshot(), before);
});
test('an unapproved browser EXECUTE grant is refused without any business write', () => {
 const before = businessSnapshot();
 refuses(check('GRANT EXECUTE ON FUNCTION public.dobby_v7_update_profile(jsonb,bigint) TO anon;'));
 assert.equal(businessSnapshot(), before);
});
test('an unapproved grant option is refused even when effective EXECUTE was already allowed', () => {
 refuses(check('GRANT EXECUTE ON FUNCTION public.dobby_v7_update_profile(jsonb,bigint) TO authenticated WITH GRANT OPTION;'));
});
test('the narrowly reported stamper ACL is accepted without changing the trigger or its body', () => {
 passes(check('GRANT EXECUTE ON FUNCTION public.dobby_sync_stamper() TO anon,authenticated;'));
});
test('a modified SQL literal is refused rather than normalized into approval', () => {
 refuses(check(`CREATE OR REPLACE FUNCTION public.dobby_v7_context() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT '{"changed":true}'::jsonb $$;`));
});
test('a changed owner is refused even though pg_get_functiondef excludes ownership', () => {
 refuses(check(`GRANT CREATE ON SCHEMA public TO service_role; ALTER FUNCTION public.dobby_v7_update_profile(jsonb,bigint) OWNER TO service_role;`));
});
test('SECURITY DEFINER and configuration drift are refused independently', () => {
 for (const mutation of [
  'ALTER FUNCTION public.dobby_v7_context() SECURITY INVOKER;',
  "ALTER FUNCTION public.dobby_v7_context() SET search_path=public;",
  'ALTER FUNCTION public.dobby_v7_context() VOLATILE;'
 ]) refuses(check(mutation));
});
test('PUBLIC or delegated browser rights on the stamper are outside its two approved ACL profiles', () => {
 for (const mutation of [
  'GRANT EXECUTE ON FUNCTION public.dobby_sync_stamper() TO PUBLIC;',
  'GRANT EXECUTE ON FUNCTION public.dobby_sync_stamper() TO anon,authenticated WITH GRANT OPTION;',
  'GRANT EXECUTE ON FUNCTION public.dobby_sync_stamper() TO service_role;'
 ]) refuses(check(mutation));
});
test('the stamper exception requires its existing active trigger attachment', () => {
 refuses(check('ALTER TABLE public.dobby_sync_grocery_items DISABLE TRIGGER dobby_sync_grocery_stamp;'));
});

test('real PostgreSQL matching accepts both fictional canary pairs and refuses mixed or unknown pairs', () => {
 const definition = body => `CREATE OR REPLACE FUNCTION public.lot5b_pair_canary() RETURNS integer LANGUAGE sql IMMUTABLE SET search_path='' AS $fixture$${body}$fixture$;`;
 const hashes = () => JSON.parse(run(`SELECT jsonb_build_object('bodyMD5',md5(prosrc),'definitionMD5',md5(pg_get_functiondef(oid))) FROM pg_proc WHERE oid='public.lot5b_pair_canary()'::regprocedure;`));
 try {
  run(definition('SELECT 1;') + 'ALTER FUNCTION public.lot5b_pair_canary() OWNER TO postgres; REVOKE ALL ON FUNCTION public.lot5b_pair_canary() FROM PUBLIC;');
  const first = hashes();
  run(definition(' SELECT 1; ')); const second = hashes();
  // Fictional canary only: no hosted or private Missions body is reconstructed.
  const entry = { signature:'public.lot5b_pair_canary()',owner:'postgres',securityDefiner:false,language:'sql',volatility:'i',configuration:['search_path=""'],arguments:'',anon:false,authenticated:false,aclProfiles:['{postgres=X/postgres}'],pairs:[first,second] };
  const probe = entries => raw(`BEGIN; SET ROLE postgres; ${renderCataloguePreflight(entries)} ROLLBACK;`);
  passes(probe([entry]));
  run(definition('SELECT 1;')); passes(probe([entry]));
  refuses(probe([{...entry,pairs:[{bodyMD5:first.bodyMD5,definitionMD5:second.definitionMD5},{bodyMD5:second.bodyMD5,definitionMD5:first.definitionMD5}]}]));
  run(definition('SELECT 2;')); refuses(probe([entry]));
  // Same boundary, separate dependency checker: approved definition then drift.
  run(definition('SELECT 1;'));
  passes(raw(`BEGIN; SET ROLE postgres; ${renderMissionsPreflight([{signature:entry.signature,definitionMD5:first.definitionMD5}])} ROLLBACK;`));
  run(definition('SELECT 2;'));
  const rejected=raw(`BEGIN; SET ROLE postgres; ${renderMissionsPreflight([{signature:entry.signature,definitionMD5:first.definitionMD5}])} ROLLBACK;`);
  assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/unapproved private Missions/i);
 } finally { run('DROP FUNCTION IF EXISTS public.lot5b_pair_canary();'); }
});

test('revoking optional stamper EXECUTE preserves existing trigger writes and blocks direct calls', () => {
 const result=raw(`BEGIN;
  GRANT EXECUTE ON FUNCTION public.dobby_sync_stamper() TO anon,authenticated;
  SET ROLE authenticated;
  SET LOCAL request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000005"}';
  INSERT INTO public.dobby_sync_grocery_items(id,title) VALUES('00000000-0000-4000-8000-000000000599','FICTIONAL TRIGGER CHECK');
  RESET ROLE; REVOKE EXECUTE ON FUNCTION public.dobby_sync_stamper() FROM anon,authenticated;
  SET ROLE authenticated;
  UPDATE public.dobby_sync_grocery_items SET title='FICTIONAL UPDATED' WHERE id='00000000-0000-4000-8000-000000000599';
  SELECT revision FROM public.dobby_sync_grocery_items WHERE id='00000000-0000-4000-8000-000000000599';
  ROLLBACK;`);
 passes(result);assert.equal(result.stdout.trim(),'2');
 const direct=raw(`BEGIN; GRANT EXECUTE ON FUNCTION public.dobby_sync_stamper() TO authenticated; SET ROLE authenticated; SELECT public.dobby_sync_stamper(); ROLLBACK;`);
 assert.notEqual(direct.status,0);assert.match(direct.stderr,/trigger functions can only be called as triggers/);
});

test('the complete candidate refuses absent private dependencies before business changes', () => {
 const before=businessSnapshot();
 const result=raw('SET ROLE postgres;'+buildArtifacts()['lot2a-compatible.candidate.sql']);
 assert.notEqual(result.status,0);assert.match(result.stderr,/Missing or unapproved private Missions definition/);
 assert.equal(businessSnapshot(),before);
 assert.equal(run("SELECT to_regnamespace('dobby_access_legacy') IS NULL;"),'t');
});

test('partial wrapping core preserves native bodies/data and rollback refuses forged backups', () => {
 const artifacts=buildArtifacts();const before=JSON.parse(businessSnapshot());
 // Test only the unchanged wrapping core and compatibility restore guard.
 // The full candidate above MUST refuse first. No private dependency stubs.
 const partial=artifacts['lot2a-compatible.candidate.sql'].replace(artifacts['missions.preflight.sql'],'-- TEST-ONLY: absent private dependency gate excluded for partial wrapping drill.');
 assert.notEqual(partial,artifacts['lot2a-compatible.candidate.sql']);
 run('SET ROLE postgres;'+partial);
 assert.deepEqual(JSON.parse(businessSnapshot()).rows,before.rows);
 for(const entry of approved.functions) {
  const target=['trigger','closed','public-flags'].includes(entry.kind)?entry.signature:'dobby_access_legacy.'+entry.signature.replace('.','__');
  assert.equal(run(`SELECT md5(prosrc) FROM pg_proc WHERE oid='${target}'::regprocedure;`),entry.pairs[0].bodyMD5,entry.signature);
 }
 const stripOuter=sql=>sql.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
 const bad=raw(`BEGIN; UPDATE dobby_access_legacy.function_backups SET definition=definition||E'\n-- forged',definition_md5=md5(definition||E'\n-- forged') WHERE signature='public.dobby_v7_context()'; SET ROLE postgres; ${stripOuter(artifacts['lot2a-compatible.rollback.sql'])} ROLLBACK;`);
 assert.notEqual(bad.status,0);assert.match(bad.stderr,/Unapproved compatibility restore/);
 assert.equal(run("SELECT to_regnamespace('dobby_access_legacy') IS NOT NULL;"),'t');
 const wrongOwner=raw(`BEGIN; GRANT CREATE ON SCHEMA public TO dobby_v7_writer;
  ALTER FUNCTION public.dobby_v7_context() OWNER TO dobby_v7_writer;
  REVOKE CREATE ON SCHEMA public FROM dobby_v7_writer;
  SET ROLE postgres; ${stripOuter(artifacts['lot2a-compatible.rollback.sql'])} ROLLBACK;`);
 assert.notEqual(wrongOwner.status,0,'Rollback accepted a changed native owner');
 assert.match(wrongOwner.stderr,/Unapproved current compatibility owner/);
 const wrongAcl=raw(`BEGIN; GRANT EXECUTE ON FUNCTION public.dobby_v7_bind_existing_member(uuid,text,uuid) TO authenticated;
  SET ROLE postgres; ${stripOuter(artifacts['lot2a-compatible.rollback.sql'])} ROLLBACK;`);
 assert.notEqual(wrongAcl.status,0,'Rollback accepted an extra native EXECUTE grant');
 assert.match(wrongAcl.stderr,/Unapproved.*execution/i);
 run('SET ROLE postgres;'+artifacts['lot2a-compatible.rollback.sql']);
 const restored=JSON.parse(businessSnapshot());
 for(const snapshot of [before,restored]) for(const row of snapshot.acl) row[2]?.sort();
 assert.deepEqual(restored,before);
});
