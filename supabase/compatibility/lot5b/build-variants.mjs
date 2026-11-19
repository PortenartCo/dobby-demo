// Builds local candidates only. No connection, subprocess, or hosted credentials.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const directory = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(directory, '../../..');
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
export const approved = JSON.parse(readFileSync(resolve(directory, 'approved-catalogue.json'), 'utf8'));

const executionCheck = `  SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
    CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable)
    ORDER BY a.grantor,a.grantee,a.privilege_type) INTO acl
   FROM aclexplode(coalesce(f.proacl,acldefault('f',f.proowner))) a;
  acl_ok:=false;
  FOR profile IN SELECT jsonb_array_elements_text(e->'aclProfiles') LOOP
   SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
     CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable)
     ORDER BY a.grantor,a.grantee,a.privilege_type) INTO expected_acl
    FROM aclexplode(profile::aclitem[]) a;
   IF acl IS NOT DISTINCT FROM expected_acl THEN acl_ok:=true; END IF;
  END LOOP;
  IF NOT acl_ok THEN RAISE EXCEPTION 'Unapproved catalogue execution ACL: %',e->>'signature'; END IF;
  IF e->>'signature'='public.dobby_sync_stamper()' THEN
   IF f.prorettype <> 'trigger'::regtype OR f.prosecdef OR NOT EXISTS(
    SELECT 1 FROM pg_trigger t WHERE t.tgfoid=f.oid AND NOT t.tgisinternal AND t.tgenabled IN ('O','A')) THEN
    RAISE EXCEPTION 'Approved stamper must remain an attached invoker trigger';
   END IF;
  ELSIF has_function_privilege('anon',f.oid,'EXECUTE') IS DISTINCT FROM (e->>'anon')::boolean
   OR has_function_privilege('authenticated',f.oid,'EXECUTE') IS DISTINCT FROM (e->>'authenticated')::boolean THEN
   RAISE EXCEPTION 'Unapproved inherited catalogue execution: %',e->>'signature';
  END IF;`;

export function renderCataloguePreflight(entries) {
 return `-- Exact approved pairs only; no lexical normalization or business write.
DO $catalogue_5b$
DECLARE e jsonb; f record; acl jsonb; expected_acl jsonb; profile text; acl_ok boolean;
BEGIN
 IF current_user <> 'postgres' OR current_setting('server_version_num')::int < 160000
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN
  RAISE EXCEPTION 'Verified non-superuser postgres installer required for catalogue approval';
 END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(${quote(JSON.stringify(entries))}::jsonb) LOOP
  SELECT p.*,l.lanname,pg_get_userbyid(p.proowner) owner_name,
   md5(p.prosrc) body_md5,md5(pg_get_functiondef(p.oid)) definition_md5,
   pg_get_function_identity_arguments(p.oid) arguments
  INTO f FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
  WHERE p.oid=to_regprocedure(e->>'signature');
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing approved catalogue routine: %',e->>'signature'; END IF;
  IF f.owner_name IS DISTINCT FROM e->>'owner'
   OR f.prosecdef IS DISTINCT FROM (e->>'securityDefiner')::boolean
   OR f.lanname IS DISTINCT FROM e->>'language'
   OR f.provolatile::text IS DISTINCT FROM e->>'volatility'
   OR to_jsonb(f.proconfig) IS DISTINCT FROM e->'configuration'
   OR f.arguments IS DISTINCT FROM e->>'arguments'
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(e->'pairs') pair
    WHERE f.body_md5=pair->>'bodyMD5' AND f.definition_md5=pair->>'definitionMD5') THEN
   RAISE EXCEPTION 'Unapproved catalogue pair/owner/attribute drift: %',e->>'signature';
  END IF;
${executionCheck}
 END LOOP;
END $catalogue_5b$;
`;
}

export function renderMissionsPreflight(entries) {
 return `-- References from the published Missions installer; no private stub.
DO $missions_5b$
DECLARE e jsonb; f oid;
BEGIN
 FOR e IN SELECT value FROM jsonb_array_elements(${quote(JSON.stringify(entries))}::jsonb) LOOP
  f:=to_regprocedure(e->>'signature');
  IF f IS NULL OR md5(pg_get_functiondef(f)) IS DISTINCT FROM e->>'definitionMD5' THEN
   RAISE EXCEPTION 'Missing or unapproved private Missions definition: %',e->>'signature';
  END IF;
  IF has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE') THEN
   RAISE EXCEPTION 'Unapproved browser permission on private Missions helper: %',e->>'signature';
  END IF;
 END LOOP;
END $missions_5b$;
`;
}

function frozen(path, sha256) {
 const source = readFileSync(resolve(root, path), 'utf8');
 assert.equal(createHash('sha256').update(source).digest('hex'), sha256, 'Historical source changed: ' + path);
 return source;
}
function replaceOnce(source, before, after) {
 assert.equal(source.split(before).length, 2, 'Unique historical anchor required');
 return source.replace(before, after);
}
export function buildArtifacts() {
 assert.equal(approved.functions.length, 27); assert.equal(approved.missions.length, 12);
 const historical = frozen('supabase/migrations/20261117215619_dobby_private_access_tables_rpc.sql', 'b491737bbb9c45fb7be5b1677b19f1dda4c7488980f8636d7d076635376f5c81');
 const oldRollback = frozen('supabase/rollbacks/20261117215619_dobby_private_access_tables_rpc.sql', '4cba8f95402b15f811008c641f9d0b10ca6664bfcdc28f0f4d8ce81ef4c27cd2');
 const catalogue = renderCataloguePreflight(approved.functions);
 const missions = renderMissionsPreflight(approved.missions);
 const roles = readFileSync(resolve(directory, 'maintenance-roles.preflight.sql'), 'utf8');
 const oldCondition = 'md5(p.prosrc)<>r.body_md5 OR md5(pg_get_functiondef(p.oid))<>r.definition_md5 OR pg_get_userbyid(p.proowner)<>r.owner_name';
 const pairCondition = `pg_get_userbyid(p.proowner)<>r.owner_name OR NOT EXISTS(
  SELECT 1 FROM jsonb_array_elements(${quote(JSON.stringify(approved.functions))}::jsonb) e,
   LATERAL jsonb_array_elements(e->'pairs') pair
  WHERE e->>'signature'=r.signature AND md5(p.prosrc)=pair->>'bodyMD5'
   AND md5(pg_get_functiondef(p.oid))=pair->>'definitionMD5')`;
 let candidate = replaceOnce(historical, oldCondition, pairCondition);
 candidate = replaceOnce(candidate, 'DO $preflight$', catalogue + missions + roles + '\nDO $preflight$');
 const backups = approved.functions.map(entry => ({ signature: entry.signature, owner: entry.owner, definitions: entry.pairs.map(pair => pair.definitionMD5), aclProfiles: entry.aclProfiles, anon: entry.anon, authenticated: entry.authenticated }));
 const rollbackGuard = `-- Validate the exact approved restore set before any maintenance grant.
${roles}
DO $restore_approval_5b$
DECLARE e jsonb; b record; f record; acl jsonb; expected_acl jsonb; profile text; acl_ok boolean;
BEGIN
 IF (SELECT count(*) FROM dobby_access_legacy.function_backups)<>27 THEN
  RAISE EXCEPTION 'Incomplete approved compatibility backup set';
 END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(${quote(JSON.stringify(backups))}::jsonb) LOOP
  SELECT * INTO b FROM dobby_access_legacy.function_backups WHERE signature=e->>'signature';
  IF NOT FOUND OR b.owner_name::text IS DISTINCT FROM e->>'owner'
   OR md5(b.definition) IS DISTINCT FROM b.definition_md5
   OR NOT (e->'definitions' ? b.definition_md5) THEN
   RAISE EXCEPTION 'Unapproved compatibility restore definition: %',e->>'signature';
  END IF;
  SELECT * INTO f FROM pg_proc WHERE oid=to_regprocedure(e->>'signature');
  IF NOT FOUND OR pg_get_userbyid(f.proowner) IS DISTINCT FROM e->>'owner' THEN
   RAISE EXCEPTION 'Unapproved current compatibility owner: %',e->>'signature';
  END IF;
${executionCheck}
 END LOOP;
END $restore_approval_5b$;
`;
 const grant = 'GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT TRUE, SET TRUE;';
 const rollback = replaceOnce(oldRollback, grant, rollbackGuard + grant);
 return { 'catalogue.preflight.sql': catalogue, 'missions.preflight.sql': missions,
  'lot2a-compatible.candidate.sql': '-- LOCAL CANDIDATE: exclusive maintenance and separate approval required.\n' + candidate,
  'lot2a-compatible.rollback.sql': '-- LOCAL CANDIDATE: requires closed ingress before restoring native APIs.\n' + rollback };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const artifacts = buildArtifacts();
 if (process.argv.includes('--check')) {
  for (const [name, source] of Object.entries(artifacts)) assert.equal(readFileSync(resolve(directory, name), 'utf8'), source, 'Stale generated artifact: ' + name);
 } else {
  for (const [name, source] of Object.entries(artifacts)) writeFileSync(resolve(directory, name), source);
 }
}
