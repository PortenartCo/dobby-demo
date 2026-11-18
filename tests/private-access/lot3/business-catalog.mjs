// Composition only: actual GoTrue schemas/rows + exact published business catalog.
import { initializeBusinessCatalog, manifest, json, q, id } from '../local-db.mjs';
import { catalog, apply } from '../lot2a/catalog.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from '../local-db.mjs';

export async function businessCatalog(auth, { unlinkedChild = true, approvedSecondParent = true } = {}) {
 auth.sql(`SET ROLE supabase_auth_admin;
 GRANT SELECT(id),REFERENCES(id) ON auth.users TO postgres;
 RESET ROLE;`);
 catalog({executeSQL:auth.sql,startDatabase:()=>{
  const info=initializeBusinessCatalog({executeSQL:auth.sql,seedAuth:false,captureSnapshot:false});
  if(unlinkedChild)auth.sql(`DELETE FROM dobby_v7_private.account_links WHERE user_id=${q(id(4))}; DELETE FROM public.dobby_v2_memberships WHERE user_id=${q(id(4))};`);
  return info;
 }});
 apply(auth.sql);
 // These grants/policies are owned by this isolated fixture Auth owner. They
 // are explicit local capabilities, never a hosted permission assertion.
 auth.sql(`SET ROLE supabase_auth_admin;
 GRANT USAGE ON SCHEMA auth TO dobby_access_session_reader;
 GRANT SELECT(id,user_id,created_at,not_after) ON auth.sessions TO dobby_access_session_reader;
 CREATE POLICY dobby_lot3_fixture_session_reader ON auth.sessions FOR SELECT TO dobby_access_session_reader USING(true);
 RESET ROLE;
 SET ROLE postgres;
 SELECT dobby_access_private.bootstrap(${json(manifest)},${q(id(901))});
 SELECT dobby_access_private.enable_session_guard();
 RESET ROLE;`);
 if(approvedSecondParent)auth.sql(`INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by) VALUES(${q(id(3))},'active',${q(id(1))});`);
 await auth.reloadRest();
 return auth;
}

/** Install only the new candidate, then provision reviewed fictional-owner capabilities. */
export async function installAdministration(auth, { enableIdentity = true, enableChildFixture = false } = {}) {
 const files=readdirSync(resolve(root,'supabase/migrations')).filter(name=>name.endsWith('_dobby_private_access_administration.sql'));
 if(files.length!==1)throw Error('Exactly one Lot3 migration required');
 auth.sql('SET ROLE postgres;'+readFileSync(resolve(root,'supabase/migrations',files[0]),'utf8'));
 if(enableIdentity){
  auth.sql(`SET ROLE supabase_auth_admin;
   GRANT USAGE ON SCHEMA auth TO dobby_access_identity_reader;
   GRANT SELECT(id,email,email_confirmed_at) ON auth.users TO dobby_access_identity_reader;
   CREATE POLICY dobby_lot3_fixture_identity_reader ON auth.users FOR SELECT TO dobby_access_identity_reader USING(true);
   RESET ROLE; SET ROLE postgres; SELECT dobby_access_private.enable_identity_guard(); RESET ROLE;`);
 }
 if(enableChildFixture){
  auth.sql(`UPDATE dobby_access_private.settings SET child_delivery_enabled=true;
   UPDATE dobby_socle_private.install_state SET family_api_enabled=true,family_client_verified=true,storage_client_verified=true,child_link_client_verified=true;`);
 }
 await auth.reloadRest();
 return auth;
}
