-- DOBBY familial uniquement : recette RPC/RLS sur le serveur réellement installé.
-- EXÉCUTION MANUELLE par le propriétaire dans dobby-family-sync, après 10/11/20.
-- Préparer un TROISIÈME compte Auth de recette confirmé, sans lien ni foyer actif.
-- Aucun e-mail, mot de passe, identifiant personnel ou jeton n'est à transmettre.
-- Les deux Parents, leurs profils, appartenances et liaisons ne sont pas modifiés.
-- Une sous-transaction annule les fixtures/reçus ; leurs empreintes sont
-- comparées APRÈS cette annulation. Le ROLLBACK FINAL ferme aussi le diagnostic.
-- Les appels métier utilisent ROLE authenticated + JWT simulé dans SQL Editor.
-- Cela ne vérifie PAS le login HTTP Auth, les e-mails ou un upload physique.
-- Ne lancer aucun reset, ni les anciens scripts Stitch 01/04/06/11.
-- En cas d'erreur interrompant le fichier : exécuter ROLLBACK; puis transmettre
-- seulement le message fixe/la référence, sans donnée personnelle ni jeton.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
CREATE TEMP TABLE dobby_runtime_context(
 household_id uuid NOT NULL,parent_a uuid NOT NULL,parent_b uuid NOT NULL,
 parent_a_member_id text NOT NULL,parent_b_member_id text NOT NULL,
 child_user uuid NOT NULL,child_member_id text NOT NULL,child_profile jsonb NOT NULL,
 other_household_id uuid NOT NULL,own_grocery_id uuid NOT NULL,other_grocery_id uuid NOT NULL,
 storage_object_id uuid NOT NULL,storage_bucket_present boolean NOT NULL DEFAULT false,
 invitation_token text
) ON COMMIT DROP;
CREATE TEMP TABLE dobby_runtime_checks(name text PRIMARY KEY,passed boolean,detail text NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE dobby_runtime_parent_baseline(profile_id text PRIMARY KEY,profile jsonb NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE dobby_runtime_baseline(kind text PRIMARY KEY,value jsonb NOT NULL) ON COMMIT DROP;
GRANT SELECT,UPDATE ON pg_temp.dobby_runtime_context TO authenticated;
GRANT SELECT,INSERT,UPDATE ON pg_temp.dobby_runtime_checks TO authenticated;

DO $preflight$
DECLARE rt_hh uuid; rt_a uuid; rt_b uuid; rt_child uuid; rt_candidates integer;
 rt_a_member text; rt_b_member text; rt_family jsonb; rt_third_count integer; rt_lock uuid; rt_required_table text;
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper)
 OR NOT pg_has_role(current_user,'authenticated','SET') THEN
  RAISE EXCEPTION 'RT-PREFLIGHT-ROLE : SQL Editor postgres non-superuser avec SET authenticated requis';
 END IF;
 IF to_regprocedure('public.dobby_v7_accept_child_invitation(text,uuid)') IS NULL
 OR to_regprocedure('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)') IS NULL
 OR NOT has_function_privilege('authenticated','public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)','EXECUTE') THEN
  RAISE EXCEPTION 'RT-PREFLIGHT-SOCLE : installation Famille/Missions vérifiée requise';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM dobby_socle_private.install_state s WHERE s.singleton AND s.family_api_enabled
  AND NOT s.family_client_verified AND NOT s.storage_client_verified AND NOT s.child_link_client_verified AND NOT s.missions_client_verified) THEN
  RAISE EXCEPTION 'RT-PREFLIGHT-GATES : état installé et capacités clientes encore fermées requis';
 END IF;
 -- These effective SELECT/USAGE rights were present in the received catalog
 -- (postgres inherits pg_read_all_data). Never grant a missing right here.
 FOREACH rt_required_table IN ARRAY ARRAY['auth.users','storage.buckets','storage.objects',
  'public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules','public.dobby_v2_grocery',
  'dobby_v7_private.account_links','dobby_v7_private.pending_profiles','dobby_v7_private.invitations','dobby_v7_private.operations',
  'dobby_runes_private.operations','dobby_socle_private.mission_operations','dobby_socle_private.install_state'] LOOP
  IF to_regclass(rt_required_table) IS NULL OR NOT coalesce(has_table_privilege(current_user,to_regclass(rt_required_table),'SELECT'),false)
   OR NOT has_schema_privilege(current_user,split_part(rt_required_table,'.',1),'USAGE') THEN
   RAISE EXCEPTION 'RT-PREFLIGHT-SELECT : accès catalogue attendu absent sur % ; aucune permission ne sera modifiée',rt_required_table;
  END IF;
 END LOOP;
 -- Exact existing household: two active canonically linked Parents, no third link.
 SELECT count(*) INTO rt_candidates FROM (
  SELECT l.household_id FROM dobby_v7_private.account_links l
  JOIN public.dobby_v2_memberships a ON a.household_id=l.household_id AND a.user_id=l.user_id AND a.active
  JOIN public.dobby_v2_modules m ON m.household_id=l.household_id AND m.module='family'
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(m.payload->'familyMembers','[]'::jsonb)) e
  WHERE e->>'id'=l.member_id AND e->>'memberCategory'='parent'
  GROUP BY l.household_id HAVING count(*)=2 AND
   (SELECT count(*) FROM dobby_v7_private.account_links x WHERE x.household_id=l.household_id)=2
 ) h;
 IF rt_candidates<>1 THEN RAISE EXCEPTION 'RT-PREFLIGHT-PARENTS : exactement un foyer avec les deux Parents canoniques actuels est requis'; END IF;
 SELECT l.household_id INTO rt_hh FROM dobby_v7_private.account_links l
  JOIN public.dobby_v2_memberships a ON a.household_id=l.household_id AND a.user_id=l.user_id AND a.active
  JOIN public.dobby_v2_modules m ON m.household_id=l.household_id AND m.module='family'
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(m.payload->'familyMembers','[]'::jsonb)) e
  WHERE e->>'id'=l.member_id AND e->>'memberCategory'='parent'
  GROUP BY l.household_id HAVING count(*)=2 AND
   (SELECT count(*) FROM dobby_v7_private.account_links x WHERE x.household_id=l.household_id)=2;
 SELECT l.user_id,l.member_id INTO rt_a,rt_a_member FROM dobby_v7_private.account_links l
  JOIN public.dobby_v2_memberships a ON a.household_id=l.household_id AND a.user_id=l.user_id
  WHERE l.household_id=rt_hh AND a.active ORDER BY (a.role='owner') DESC,l.user_id LIMIT 1;
 SELECT l.user_id,l.member_id INTO rt_b,rt_b_member FROM dobby_v7_private.account_links l
  WHERE l.household_id=rt_hh AND l.user_id<>rt_a;
 IF NOT EXISTS(SELECT 1 FROM public.dobby_v2_memberships a WHERE a.household_id=rt_hh AND a.user_id=rt_a AND a.active AND a.role='owner')
 OR NOT EXISTS(SELECT 1 FROM public.dobby_v2_memberships a WHERE a.household_id=rt_hh AND a.user_id=rt_b AND a.active AND a.role='member') THEN
  RAISE EXCEPTION 'RT-PREFLIGHT-NONOWNER : un Parent propriétaire et un Parent membre sont requis pour la preuve non-propriétaire';
 END IF;
 SELECT count(*) INTO rt_third_count FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL AND coalesce(u.encrypted_password,'')<>''
   AND NOT EXISTS(SELECT 1 FROM dobby_v7_private.account_links l WHERE l.user_id=u.id)
   AND NOT EXISTS(SELECT 1 FROM public.dobby_v2_memberships a WHERE a.user_id=u.id AND a.active)
   AND NOT EXISTS(SELECT 1 FROM dobby_v7_private.pending_profiles p WHERE p.user_id=u.id);
 IF rt_third_count<>1 THEN
  RAISE EXCEPTION 'RT-PREFLIGHT-THIRD-AUTH : exactement un compte Auth confirmé avec mot de passe, sans liaison, foyer actif ou profil provisoire, est requis ; ne modifier aucun des deux Parents';
 END IF;
 SELECT u.id INTO rt_child FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL AND coalesce(u.encrypted_password,'')<>''
   AND NOT EXISTS(SELECT 1 FROM dobby_v7_private.account_links l WHERE l.user_id=u.id)
   AND NOT EXISTS(SELECT 1 FROM public.dobby_v2_memberships a WHERE a.user_id=u.id AND a.active)
   AND NOT EXISTS(SELECT 1 FROM dobby_v7_private.pending_profiles p WHERE p.user_id=u.id);
 -- Take the existing account order before the family row; never invert RPC locks.
 FOR rt_lock IN SELECT x FROM unnest(ARRAY[rt_a,rt_b,rt_child]) x ORDER BY x LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('dobby-v7-account:'||rt_lock::text,0));
 END LOOP;
 PERFORM 1 FROM public.dobby_v2_memberships a WHERE a.household_id=rt_hh AND a.user_id IN(rt_a,rt_b) AND a.active ORDER BY a.user_id FOR SHARE;
 PERFORM pg_advisory_xact_lock(hashtextextended('dobby-family-socle:'||rt_hh::text,0));
 SELECT m.payload INTO rt_family FROM public.dobby_v2_modules m WHERE m.household_id=rt_hh AND m.module='family' FOR UPDATE;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(rt_family->'familyMembers','[]'::jsonb)) e WHERE e->>'id'='test-socle-child-v1') THEN
  RAISE EXCEPTION 'RT-PREFLIGHT-TEST-ID : identifiant de recette déjà présent ; aucun profil ne sera remplacé';
 END IF;
 INSERT INTO pg_temp.dobby_runtime_parent_baseline(profile_id,profile)
  SELECT e->>'id',e FROM jsonb_array_elements(coalesce(rt_family->'familyMembers','[]'::jsonb)) e WHERE e->>'id' IN(rt_a_member,rt_b_member);
 INSERT INTO pg_temp.dobby_runtime_baseline VALUES
  ('parentMemberships',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.user_id,a.household_id) FROM public.dobby_v2_memberships a WHERE a.user_id IN(rt_a,rt_b))),
  ('parentLinks',(SELECT jsonb_agg(to_jsonb(l) ORDER BY l.user_id) FROM dobby_v7_private.account_links l WHERE l.user_id IN(rt_a,rt_b))),
  ('flags',(SELECT to_jsonb(s) FROM dobby_socle_private.install_state s WHERE s.singleton)),
  ('missionsBefore',(SELECT coalesce(jsonb_agg(jsonb_build_object('payload',m.payload,'revision',m.revision)),'[]') FROM public.dobby_v2_modules m WHERE m.household_id=rt_hh AND m.module='missions'));
 INSERT INTO pg_temp.dobby_runtime_context(household_id,parent_a,parent_b,parent_a_member_id,parent_b_member_id,child_user,child_member_id,child_profile,other_household_id,own_grocery_id,other_grocery_id,storage_object_id,storage_bucket_present)
 VALUES(rt_hh,rt_a,rt_b,rt_a_member,rt_b_member,rt_child,'test-socle-child-v1',jsonb_build_object(
  'id','test-socle-child-v1','memberCategory','child','name','TEST SOCLE — enfant temporaire',
  'birthdate','2000-01-01','nickname','TEST conservé','notes','TEST fictif, annulé par ROLLBACK',
  'runtimeVerification',jsonb_build_object('version',1,'marker','test-socle-runtime-v1'),
  'magicProfile',jsonb_build_object('version',1,'avatarId','portrait-3','houseId','ravenclaw','patronusId','otter',
   'houseAlgorithmVersion','e06-v1','patronusAlgorithmVersion','e06-v1','ceremonyStatus','complete','runtimeOpaque','TEST retained')),
  gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),EXISTS(SELECT 1 FROM storage.buckets b WHERE b.id='dobby-family-files'));
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('preflight',true,'Troisième Auth sélectionné en interne ; aucun identifiant ni secret dans le résultat.');
END $preflight$;


CREATE TEMP TABLE dobby_runtime_result(value jsonb NOT NULL) ON COMMIT DROP;
DO $runtime_rollback_probe$
DECLARE rt_report jsonb; rt_before jsonb:='{}'; rt_after jsonb:='{}'; rt_table text; rt_digest text;
 rt_failure_state text; rt_rolled_back boolean:=false;
 rt_tables text[]:=ARRAY['public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules',
  'public.dobby_v2_grocery','dobby_v7_private.account_links','dobby_v7_private.pending_profiles',
  'dobby_v7_private.invitations','dobby_v7_private.operations','dobby_runes_private.operations',
  'dobby_socle_private.mission_operations','dobby_socle_private.install_state','storage.objects'];
BEGIN
 -- Server-side fingerprints only; no Auth password/hash, install secret,
 -- function backup, invitation token or family content is returned.
 FOREACH rt_table IN ARRAY rt_tables LOOP
  EXECUTE 'SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,''[]'')) FROM '||rt_table||' t' INTO rt_digest;
  rt_before:=jsonb_set(rt_before,ARRAY[rt_table],to_jsonb(rt_digest));
 END LOOP;
 BEGIN
  EXECUTE $runtime_business_sql$
DO $fixtures$
DECLARE rt_c record; rt_count integer;
BEGIN
 SELECT * INTO rt_c FROM pg_temp.dobby_runtime_context;
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',rt_c.parent_a,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 IF current_user<>'authenticated' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) THEN
  RAISE EXCEPTION 'RT-ACTOR-ROLE : appel métier hors rôle authenticated non privilégié';
 END IF;
 UPDATE public.dobby_v2_modules m SET payload=jsonb_set(m.payload,'{familyMembers}',
  coalesce(m.payload->'familyMembers','[]')||jsonb_build_array(rt_c.child_profile))
  WHERE m.household_id=rt_c.household_id AND m.module='family';
 GET DIAGNOSTICS rt_count=ROW_COUNT;
 IF rt_count<>1 THEN RAISE EXCEPTION 'RT-FIXTURE-FAMILY : ajout fictif non confirmé'; END IF;
 INSERT INTO public.dobby_v2_modules(household_id,module,payload)
  VALUES(rt_c.household_id,'menus','{}') ON CONFLICT(household_id,module) DO NOTHING;
 INSERT INTO public.dobby_v2_grocery(id,household_id,title,quantity,at_home_quantity)
  VALUES(rt_c.own_grocery_id,rt_c.household_id,'TEST SOCLE — course temporaire',2,0.001);
 RESET ROLE;
 -- A foreign test row really exists; it is invisible to household A's actors.
 INSERT INTO public.dobby_v2_households(id,name) VALUES(rt_c.other_household_id,'TEST SOCLE — foyer étranger temporaire');
 INSERT INTO public.dobby_v2_grocery(id,household_id,title,quantity,at_home_quantity)
  VALUES(rt_c.other_grocery_id,rt_c.other_household_id,'TEST SOCLE — course étrangère temporaire',1,0);
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('parent_native_fixture_write',true,'Ajout append-only du profil fictif et Courses sous authenticated ; aucun profil Parent remplacé.');
END $fixtures$;

DO $family_runtime$
DECLARE rt_c record; rt_result jsonb; rt_preview jsonb; rt_token text; rt_op uuid:=gen_random_uuid(); rt_revision bigint;
 rt_name text; rt_before jsonb; rt_after jsonb; rt_grocery_before bigint; rt_count integer; rt_state text;
BEGIN
 SELECT * INTO rt_c FROM pg_temp.dobby_runtime_context;
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',rt_c.parent_b,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 rt_result:=public.dobby_v7_context();
 IF rt_result->>'category'<>'parent' OR rt_result->>'memberId'<>rt_c.parent_b_member_id THEN RAISE EXCEPTION 'RT-PARENT-B-CONTEXT'; END IF;
 SELECT e->>'name' INTO rt_name FROM public.dobby_v2_modules m CROSS JOIN LATERAL jsonb_array_elements(m.payload->'familyMembers') e
  WHERE m.household_id=rt_c.household_id AND m.module='family' AND e->>'id'=rt_c.parent_a_member_id;
 -- Same value: probes the other-Parent target authorization without changing its JSON.
 rt_result:=public.dobby_v7_update_member(rt_c.parent_a_member_id,jsonb_build_object('name',rt_name),(rt_result->>'familyRevision')::bigint,gen_random_uuid());
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('parent_b_other_parent_target',rt_result->'module' IS NOT NULL,'Cible autre Parent autorisée avec même valeur ; son profil reste identique.');
 rt_result:=public.dobby_v7_create_child_invitation(rt_c.child_member_id,1,gen_random_uuid());
 rt_token:=rt_result->>'token';
 UPDATE pg_temp.dobby_runtime_context SET invitation_token=rt_token;
 rt_preview:=public.dobby_v7_preview_child_invitation(rt_token);
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('targeted_invitation_preview',rt_preview->>'status'='valid' AND rt_preview->>'targetMemberId'=rt_c.child_member_id,'Jeton fictif interne, jamais retourné.');
 rt_result:=public.dobby_v7_context(); rt_revision:=(rt_result->>'familyRevision')::bigint;
 SELECT jsonb_build_object('payload',m.payload,'revision',m.revision) INTO rt_before FROM public.dobby_v2_modules m WHERE m.household_id=rt_c.household_id AND m.module='family';
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',rt_c.child_user,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 rt_result:=public.dobby_v7_accept_child_invitation(rt_token,rt_op);
 SELECT jsonb_build_object('payload',m.payload,'revision',m.revision) INTO rt_after FROM public.dobby_v2_modules m WHERE m.household_id=rt_c.household_id AND m.module='family';
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_same_profile_atomic_accept',
  rt_result->>'phase'='active' AND rt_result->>'memberId'=rt_c.child_member_id AND rt_result->>'category'='child'
  AND rt_result->'profile'=rt_c.child_profile AND (rt_result->>'familyRevision')::bigint=rt_revision
  AND rt_before IS NOT NULL AND rt_after IS NOT DISTINCT FROM rt_before,
  'Même ID TEXT, JSON/avatar/Maison/Patronus/extensions et révision ; aucun profil personnel provisoire requis.');
 rt_result:=public.dobby_v7_accept_child_invitation(rt_token,rt_op);
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('targeted_exact_replay',rt_result->'replayed'='true'::jsonb AND rt_result->>'memberId'=rt_c.child_member_id,'Même opération : une seule liaison.');
 rt_result:=public.dobby_v7_context();
 rt_result:=public.dobby_v7_update_magic(rt_c.child_member_id,jsonb_build_object('magicHouseId','gryffindor'),(rt_result->>'familyRevision')::bigint,gen_random_uuid());
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_own_house_only',
  rt_result->'context'->'profile'->'magicProfile'->>'houseId'='gryffindor'
  AND rt_result->'context'->'profile'->'magicProfile'->>'patronusId'='otter'
  AND rt_result->'context'->'profile'->'magicProfile'->>'avatarId'='portrait-3'
  AND rt_result->'context'->'profile'->'runtimeVerification'=rt_c.child_profile->'runtimeVerification',
  'Maison propre modifiée via RPC ; Patronus/avatar/extensions conservés.');
 rt_result:=public.dobby_v7_context(); rt_revision:=(rt_result->>'familyRevision')::bigint;
 BEGIN
  PERFORM public.dobby_v7_update_profile(jsonb_build_object('firstName','TEST INTERDIT'),rt_revision);
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_profile_denied',false,'RPC profil acceptée à tort.');
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_profile_denied',true,'SQLSTATE 42501.');
 END;
 BEGIN
  PERFORM public.dobby_v7_update_magic(rt_c.parent_a_member_id,jsonb_build_object('magicHouseId','slytherin'),rt_revision,gen_random_uuid());
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_other_magic_denied',false,'Magie d’autrui acceptée à tort.');
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_other_magic_denied',true,'SQLSTATE 42501.');
 END;
 BEGIN
  PERFORM public.dobby_v7_create_invitation(1,gen_random_uuid());
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_invitation_denied',false,'Création invitation acceptée à tort.');
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_invitation_denied',true,'SQLSTATE 42501.');
 END;
 SELECT count(*) INTO rt_count FROM public.dobby_v2_modules m WHERE m.household_id=rt_c.household_id AND m.module='menus';
 IF rt_count<>1 THEN RAISE EXCEPTION 'RT-MENUS-READ : ligne témoin partagée absente'; END IF;
 UPDATE public.dobby_v2_modules m SET payload=m.payload WHERE m.household_id=rt_c.household_id AND m.module='menus';
 GET DIAGNOSTICS rt_count=ROW_COUNT;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_menus_direct_update_denied',rt_count=0,'Ligne existante lisible, UPDATE direct retourne zéro ligne.');
 UPDATE public.dobby_v2_modules m SET payload=m.payload WHERE m.household_id=rt_c.household_id AND m.module='family';
 GET DIAGNOSTICS rt_count=ROW_COUNT;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_family_snapshot_denied',rt_count=0,'Snapshot direct refusé, y compris propre identité/avatar.');
 SELECT count(*) INTO rt_count FROM public.dobby_v2_grocery g WHERE g.id=rt_c.own_grocery_id;
 IF rt_count<>1 THEN RAISE EXCEPTION 'RT-COURSES-READ : ligne témoin partagée absente'; END IF;
 UPDATE public.dobby_v2_grocery g SET at_home_quantity=0.5 WHERE g.id=rt_c.own_grocery_id;
 GET DIAGNOSTICS rt_count=ROW_COUNT;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_courses_update_denied',rt_count=0,'Course réelle temporaire lisible, mutation refusée.');
 BEGIN
  INSERT INTO public.dobby_v2_grocery(household_id,title,quantity) VALUES(rt_c.household_id,'TEST INTERDIT',1);
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_courses_insert_denied',false,'Insertion Course acceptée à tort.');
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_courses_insert_denied',true,'SQLSTATE 42501.');
 END;
 SELECT count(*) INTO rt_count FROM public.dobby_v2_grocery g WHERE g.id=rt_c.other_grocery_id;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_foreign_household_read_denied',rt_count=0,'Une ligne étrangère existe réellement mais reste invisible.');
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',rt_c.parent_b,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 rt_result:=public.dobby_v7_context();
 rt_result:=public.dobby_v7_update_member(rt_c.child_member_id,jsonb_build_object('nickname','TEST modifié par Parent B après liaison'),(rt_result->>'familyRevision')::bigint,gen_random_uuid());
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('parent_b_linked_child_management',
  EXISTS(SELECT 1 FROM jsonb_array_elements(rt_result->'module'->'payload'->'familyMembers') e
   WHERE e->>'id'=rt_c.child_member_id AND e->>'nickname'='TEST modifié par Parent B après liaison'),
  'Parent non propriétaire : modification du seul profil fictif déjà lié.');
 SELECT g.revision INTO rt_grocery_before FROM public.dobby_v2_grocery g WHERE g.id=rt_c.own_grocery_id;
 UPDATE public.dobby_v2_grocery g SET at_home_quantity=0.001 WHERE g.id=rt_c.own_grocery_id AND g.revision=rt_grocery_before;
 GET DIAGNOSTICS rt_count=ROW_COUNT;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('parent_courses_precision_write',rt_count=1 AND EXISTS(SELECT 1 FROM public.dobby_v2_grocery g WHERE g.id=rt_c.own_grocery_id AND g.at_home_quantity=0.001 AND g.quantity=2 AND NOT g.checked AND g.revision=rt_grocery_before+1),'Valeur .001 relue en base, quantité/achat inchangés, révision +1.');
 SELECT count(*) INTO rt_count FROM public.dobby_v2_grocery g WHERE g.id=rt_c.other_grocery_id;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('parent_foreign_household_read_denied',rt_count=0,'Ligne du foyer étranger temporaire invisible au Parent.');
 UPDATE public.dobby_v2_grocery g SET quantity=2 WHERE g.id=rt_c.other_grocery_id;
 GET DIAGNOSTICS rt_count=ROW_COUNT;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('parent_foreign_household_update_denied',rt_count=0,'UPDATE d’une ligne étrangère existante refusé.');
 RESET ROLE;
 -- Compare F08's actual Missions/credits/revision BEFORE V3 takes its own
 -- baseline. An accidental acceptance-side ledger rewrite must not pass as old.
 UPDATE pg_temp.dobby_runtime_checks SET
  passed=coalesce(passed,false) AND ((SELECT coalesce(jsonb_agg(jsonb_build_object('payload',m.payload,'revision',m.revision)),'[]')
   FROM public.dobby_v2_modules m WHERE m.household_id=rt_c.household_id AND m.module='missions')
   IS NOT DISTINCT FROM (SELECT b.value FROM pg_temp.dobby_runtime_baseline b WHERE b.kind='missionsBefore')),
  detail=detail||' Missions/crédits/révision relus identiques à la baseline avant toute opération V3.'
  WHERE name='child_same_profile_atomic_accept';
END $family_runtime$;

-- MISSIONS_RUNTIME_FRAGMENT_BEGIN
-- Fragment intégré à la transaction BEGIN ... ROLLBACK du contrôle 30.
-- Simule les claims Auth sous ROLE authenticated : ne vérifie pas le fournisseur
-- Auth HTTP, la délivrance des JWT, les e-mails ou les mots de passe.
-- Aucun flag client activé ; aucune donnée de test ne sera conservée.
-- Rejeux séquentiels ici ; aucune concurrence multi-session n'est revendiquée.
DO $runtime_missions$
DECLARE
 c record; response jsonb; replay jsonb; current_payload jsonb; old_payload jsonb;
 old_credits jsonb; old_missions jsonb; original_grant jsonb; reversal jsonb;
 next_grant jsonb; preserved_prefix jsonb; participants jsonb; intent jsonb;
 mission_id text:='test-socle-mission-'||pg_catalog.gen_random_uuid()::text;
 unassigned_id text:='test-socle-unassigned-'||pg_catalog.gen_random_uuid()::text;
 operation_id uuid:=pg_catalog.gen_random_uuid(); revision bigint; first_revision bigint;
 first_applied_revision bigint; current_revision bigint; credit_count integer;
 affected integer; denied boolean; started_at timestamptz:=pg_catalog.clock_timestamp();
BEGIN
 BEGIN
  SELECT * INTO STRICT c FROM pg_temp.dobby_runtime_context;
  IF c.parent_a_member_id=c.child_member_id THEN
   RAISE EXCEPTION 'Participants de recette non distincts';
  END IF;
  -- Read and mutate through the same role and claims as the Data API actor.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.parent_b::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.parent_b,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF current_user<>'authenticated' OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname=current_user AND NOT rolsuper AND NOT rolbypassrls) THEN
   RAISE EXCEPTION 'Rôle de recette authenticated sans bypass requis';
  END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_execution_role',true,'current_user authenticated, non superuser, sans BYPASSRLS ; claims simulées');
  SELECT payload,public.dobby_v2_modules.revision INTO old_payload,revision
   FROM public.dobby_v2_modules WHERE household_id=c.household_id AND module='missions';
  old_payload:=coalesce(old_payload,pg_catalog.jsonb_build_object('autoTasks','[]'::jsonb,'manualMissions','[]'::jsonb,'runeCredits','[]'::jsonb,'runeRequests','[]'::jsonb));
  revision:=coalesce(revision,0);
  old_credits:=coalesce(old_payload->'runeCredits','[]'::jsonb);
  old_missions:=coalesce(old_payload->'manualMissions','[]'::jsonb);
  participants:=pg_catalog.jsonb_build_array(c.parent_a_member_id,c.child_member_id);
  intent:=pg_catalog.jsonb_build_object('kind','snapshot','payload',old_payload||pg_catalog.jsonb_build_object(
   'manualMissions',old_missions||pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('id',mission_id,'title','TEST temporaire socle — partage','status','open','completedAt','',
     'category','Famille','due','','effort','regular','rewardVersion',1,'assigneeId','',
     'assigneeIds',participants,'allFamily',false,'participantVersion',1,'opaqueRuntime',pg_catalog.jsonb_build_object('keep',true)),
    pg_catalog.jsonb_build_object('id',unassigned_id,'title','TEST temporaire socle — sans attribution','status','open','completedAt','',
     'category','Famille','due','','effort','regular','rewardVersion',1,'assigneeId','',
     'assigneeIds','[]'::jsonb,'allFamily',false,'participantVersion',1))));
  -- Parent B performs management although its V2 membership need not be owner.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.parent_b::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.parent_b,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  response:=public.dobby_missions_v3_write(c.household_id,revision,pg_catalog.gen_random_uuid(),intent);
  first_revision:=(response->'module'->>'revision')::bigint;
  IF response->'protocol' IS DISTINCT FROM '3'::jsonb
    OR response->'module'->'payload'->'runeCredits' IS DISTINCT FROM old_credits THEN
   RAISE EXCEPTION 'Historique modifié pendant la préparation';
  END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_parent_b_snapshot',true,'Deux missions temporaires ajoutées par le parent B, crédits antérieurs identiques');

  -- Child can complete an assigned mission, with two explicitly selected people.
  intent:=pg_catalog.jsonb_build_object('kind','complete','missionId',mission_id,'participantIds',participants);
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  response:=public.dobby_missions_v3_write(c.household_id,first_revision,operation_id,intent);
  first_applied_revision:=(response->'operation'->>'revision')::bigint;
  SELECT value INTO STRICT original_grant FROM pg_catalog.jsonb_array_elements(response->'module'->'payload'->'runeCredits')
   WHERE value->>'missionId'=mission_id;
  IF response->'protocol' IS DISTINCT FROM '3'::jsonb
    OR original_grant->'amount' IS DISTINCT FROM '25'::jsonb OR original_grant->>'kind' IS DISTINCT FROM 'grant'
    OR original_grant->'cycle' IS DISTINCT FROM '0'::jsonb
    OR original_grant->>'eventId' IS DISTINCT FROM mission_id||'~0~grant'
    OR pg_catalog.jsonb_array_length(original_grant->'allocations')<>2
    OR original_grant->'allocations'->0->'amount' IS DISTINCT FROM '13'::jsonb
    OR original_grant->'allocations'->1->'amount' IS DISTINCT FROM '12'::jsonb
    OR original_grant->>'memberId' IS DISTINCT FROM original_grant->'allocations'->0->>'memberId'
    OR (SELECT count(DISTINCT part->>'memberId') FROM pg_catalog.jsonb_array_elements(original_grant->'allocations') part)<>2
    OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(original_grant->'allocations') part
      WHERE part->>'memberId' NOT IN(c.parent_a_member_id,c.child_member_id))
    OR (SELECT sum((part->>'amount')::numeric) FROM pg_catalog.jsonb_array_elements(original_grant->'allocations') part)<>25
    OR original_grant->>'date' IS NULL
    OR (original_grant->>'date')::timestamptz<started_at-interval '1 second'
    OR (original_grant->>'date')::timestamptz>pg_catalog.clock_timestamp()+interval '1 second'
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(response->'module'->'payload'->'manualMissions') m
      WHERE m->>'id'=mission_id AND m->>'status'='done') THEN
   RAISE EXCEPTION 'Partage serveur ou participants incorrects';
  END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_child_assigned_25_split',true,'Un événement total 25, deux humains explicites, allocations 13 + 12 et date serveur');

  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  replay:=public.dobby_missions_v3_write(c.household_id,first_revision,operation_id,intent);
  IF replay->'replayed' IS DISTINCT FROM 'true'::jsonb
    OR replay->'module'->'payload' IS DISTINCT FROM response->'module'->'payload' THEN
   RAISE EXCEPTION 'Rejeu exact non reconnu';
  END IF;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  replay:=public.dobby_missions_v3_write(c.household_id,(response->'module'->>'revision')::bigint,pg_catalog.gen_random_uuid(),intent);
  IF replay->'operation'->'changed' IS DISTINCT FROM 'false'::jsonb
    OR replay->'module'->'revision' IS DISTINCT FROM response->'module'->'revision'
    OR replay->'module'->'payload' IS DISTINCT FROM response->'module'->'payload' THEN
   RAISE EXCEPTION 'Deuxième complétion a changé le module ou ses crédits';
  END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_replay_and_second_completion',true,'Même UUID rejoué et nouvelle validation sans crédit ni révision supplémentaire');

  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   PERFORM public.dobby_missions_v3_write(c.household_id,first_revision,pg_catalog.gen_random_uuid(),intent);
   RAISE EXCEPTION 'Révision périmée acceptée avec une nouvelle opération';
  EXCEPTION WHEN serialization_failure THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Conflit CAS non refusé'; END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_stale_revision_rejected',true,'UUID neuf et révision périmée refusés avec SQLSTATE 40001');

  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.parent_a::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.parent_a,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   PERFORM public.dobby_missions_v3_write(c.household_id,first_revision,operation_id,intent);
   RAISE EXCEPTION 'UUID accepté sous un autre acteur';
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Réutilisation acteur non refusée'; END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_operation_actor_scope',true,'Même UUID avec un autre acteur refusé, SQLSTATE 22023');

  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.parent_a::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.parent_a,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  response:=public.dobby_missions_v3_write(c.household_id,(response->'module'->>'revision')::bigint,pg_catalog.gen_random_uuid(),
   pg_catalog.jsonb_build_object('kind','reopen','missionId',mission_id));
  SELECT value INTO STRICT reversal FROM pg_catalog.jsonb_array_elements(response->'module'->'payload'->'runeCredits')
   WHERE value->>'missionId'=mission_id AND value->>'kind'='reversal';
  IF reversal->>'reverses' IS DISTINCT FROM original_grant->>'eventId'
    OR reversal->'allocations' IS DISTINCT FROM original_grant->'allocations'
    OR reversal->'amount' IS DISTINCT FROM original_grant->'amount'
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(response->'module'->'payload'->'runeCredits') e WHERE e=original_grant)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(response->'module'->'payload'->'manualMissions') m
      WHERE m->>'id'=mission_id AND m->>'status'='open') THEN
   RAISE EXCEPTION 'Compensation différente du gain complet';
  END IF;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  response:=public.dobby_missions_v3_write(c.household_id,(response->'module'->>'revision')::bigint,pg_catalog.gen_random_uuid(),
   pg_catalog.jsonb_build_object('kind','complete','missionId',mission_id,'participantIds',pg_catalog.jsonb_build_array(c.child_member_id)));
  SELECT value INTO STRICT next_grant FROM pg_catalog.jsonb_array_elements(response->'module'->'payload'->'runeCredits')
   WHERE value->>'missionId'=mission_id AND value->>'kind'='grant' AND value->'cycle'='1'::jsonb;
  IF next_grant->'amount' IS DISTINCT FROM '25'::jsonb
    OR next_grant->'allocations' IS DISTINCT FROM pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('memberId',c.child_member_id,'amount',25))
    OR (SELECT count(*) FROM pg_catalog.jsonb_array_elements(response->'module'->'payload'->'runeCredits') e WHERE e->>'missionId'=mission_id)<>3 THEN
   RAISE EXCEPTION 'Nouveau cycle ou total solo incorrect';
  END IF;
  current_revision:=(response->'module'->>'revision')::bigint;
  current_payload:=response->'module'->'payload';
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  replay:=public.dobby_missions_v3_write(c.household_id,first_revision,operation_id,intent);
  IF replay->'replayed' IS DISTINCT FROM 'true'::jsonb
    OR (replay->'operation'->>'revision')::bigint<>first_applied_revision
    OR (replay->'module'->>'revision')::bigint<>current_revision
    OR replay->'module'->'payload' IS DISTINCT FROM current_payload THEN
   RAISE EXCEPTION 'Ancien reçu ne renvoie pas le module courant';
  END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_reversal_cycle_and_current_replay',true,'Compensation entière, cycle suivant solo 25, ancien reçu renvoyant le module courant');

  -- Child mutations outside eligible completion remain denied, even by RPC.
  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   PERFORM public.dobby_missions_v3_write(c.household_id,current_revision,pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('kind','complete','missionId',unassigned_id,'participantIds',pg_catalog.jsonb_build_array(c.child_member_id)));
   RAISE EXCEPTION 'Enfant accepté sur mission non attribuée';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Refus attribution enfant absent'; END IF;
  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   PERFORM public.dobby_missions_v2_write(c.household_id,current_revision,pg_catalog.gen_random_uuid(),'{}'::jsonb);
   RAISE EXCEPTION 'Enfant accepté par ancien writer V2';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Ancien writer non protégé'; END IF;
  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   PERFORM public.dobby_missions_v3_write(c.household_id,current_revision,pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('kind','snapshot','payload',current_payload));
   RAISE EXCEPTION 'Snapshot parent accepté sous enfant';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Snapshot enfant non refusé'; END IF;
  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   PERFORM public.dobby_missions_v3_write(c.household_id,current_revision,pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('kind','reopen','missionId',mission_id));
   RAISE EXCEPTION 'Réouverture acceptée sous enfant';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Réouverture enfant non refusée'; END IF;
  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   PERFORM public.dobby_missions_v3_write(c.household_id,current_revision,pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('kind','complete','missionId',mission_id,'participantIds',participants,'amount',999,'date','1900-01-01T00:00:00Z'));
   RAISE EXCEPTION 'Montant ou date client accepté';
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Champs crédits arbitraires non refusés'; END IF;
  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.child_user::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.child_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   UPDATE public.dobby_v2_modules SET payload=pg_catalog.jsonb_set(payload,'{runeCredits}','[]'::jsonb)
    WHERE household_id=c.household_id AND module='missions';
   GET DIAGNOSTICS affected=ROW_COUNT;
   IF affected<>0 THEN RAISE EXCEPTION 'Écriture directe de crédit enfant acceptée'; END IF;
   denied:=true;
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Écriture directe enfant non refusée'; END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_child_boundaries',true,'Mission non attribuée, V2, snapshot, réouverture, montant/date arbitraires et écriture directe refusés');

  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.parent_a::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.parent_a,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   PERFORM public.dobby_missions_v3_write(c.other_household_id,0,pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('kind','snapshot','payload',pg_catalog.jsonb_build_object('manualMissions','[]'::jsonb)));
   RAISE EXCEPTION 'Parent accepté dans un autre foyer';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Portée foyer non refusée'; END IF;
  denied:=false;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',c.parent_a::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('sub',c.parent_a,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
   UPDATE public.dobby_v2_modules SET payload=pg_catalog.jsonb_set(payload,'{runeCredits}','[]'::jsonb)
    WHERE household_id=c.household_id AND module='missions';
   GET DIAGNOSTICS affected=ROW_COUNT;
   IF affected<>0 THEN RAISE EXCEPTION 'Écriture directe de crédit parent acceptée'; END IF;
   denied:=true;
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Crédit direct parent non refusé'; END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_household_and_ledger_boundaries',true,'Parent limité à son foyer et writer dédié requis pour les crédits');

  SELECT payload,public.dobby_v2_modules.revision INTO response,revision FROM public.dobby_v2_modules
   WHERE household_id=c.household_id AND module='missions';
  IF response IS DISTINCT FROM current_payload OR revision<>current_revision THEN
   RAISE EXCEPTION 'Un refus a modifié les Missions';
  END IF;
  IF current_user<>'authenticated'
    OR (response-'manualMissions'-'runeCredits'-'runeRequests'-'runeLedgerVersion') IS DISTINCT FROM
       (old_payload-'manualMissions'-'runeCredits'-'runeRequests'-'runeLedgerVersion') THEN
   RAISE EXCEPTION 'Rôle final, autoTasks ou extensions du module altérés';
  END IF;
  SELECT coalesce(pg_catalog.jsonb_agg(value ORDER BY n),'[]'::jsonb) INTO preserved_prefix
   FROM pg_catalog.jsonb_array_elements(response->'runeCredits') WITH ORDINALITY x(value,n)
   WHERE n<=pg_catalog.jsonb_array_length(old_credits);
  IF preserved_prefix IS DISTINCT FROM old_credits THEN RAISE EXCEPTION 'Ancien ledger réécrit'; END IF;
  SELECT coalesce(pg_catalog.jsonb_agg(value ORDER BY n),'[]'::jsonb) INTO preserved_prefix
   FROM pg_catalog.jsonb_array_elements(response->'manualMissions') WITH ORDINALITY x(value,n)
   WHERE n<=pg_catalog.jsonb_array_length(old_missions);
  IF preserved_prefix IS DISTINCT FROM old_missions THEN RAISE EXCEPTION 'Anciennes missions réécrites'; END IF;
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_history_and_failed_operation_atomicity',true,'Anciens crédits, missions, autoTasks et extensions identiques ; aucun effet des refus');
 EXCEPTION WHEN OTHERS THEN
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('missions_runtime_failure',false,'Contrôle Missions interrompu, SQLSTATE='||SQLSTATE);
 END;
 EXECUTE 'RESET ROLE';
END $runtime_missions$;

-- MISSIONS_RUNTIME_FRAGMENT_END

DO $storage_runtime$
DECLARE rt_c record; rt_count integer;
BEGIN
 SELECT * INTO rt_c FROM pg_temp.dobby_runtime_context;
 IF NOT rt_c.storage_bucket_present THEN
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('storage_metadata_runtime',NULL,'NON EXÉCUTÉ : bucket familial absent, aucune création automatique.');
  RETURN;
 END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',rt_c.parent_b,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 -- Metadata only: no Storage HTTP upload, no physical object/content created.
 INSERT INTO storage.objects(id,bucket_id,name,metadata) VALUES(rt_c.storage_object_id,'dobby-family-files',
  rt_c.household_id::text||'/test-socle-runtime-'||rt_c.storage_object_id::text||'.txt',jsonb_build_object('dobbyRuntime',1));
 UPDATE storage.objects o SET metadata=o.metadata||jsonb_build_object('parentUpdated',true) WHERE o.id=rt_c.storage_object_id;
 GET DIAGNOSTICS rt_count=ROW_COUNT;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('parent_storage_metadata_insert_update',rt_count=1,'Métadonnées du seul objet fictif créées et modifiées sous authenticated.');
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',rt_c.child_user,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO rt_count FROM storage.objects o WHERE o.id=rt_c.storage_object_id AND o.metadata->'parentUpdated'='true'::jsonb;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_storage_shared_read',rt_count=1,'Objet de métadonnées fictif du foyer lisible.');
 UPDATE storage.objects o SET metadata=o.metadata WHERE o.id=rt_c.storage_object_id;
 GET DIAGNOSTICS rt_count=ROW_COUNT;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_storage_update_denied',rt_count=0,'Objet existant lisible ; UPDATE direct refusé.');
 BEGIN
  INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('dobby-family-files',rt_c.household_id::text||'/test-interdit-'||gen_random_uuid()::text,jsonb_build_object('dobbyRuntime',1));
  INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_storage_insert_denied',false,'Insertion Storage acceptée à tort.');
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.dobby_runtime_checks VALUES('child_storage_insert_denied',true,'SQLSTATE 42501.');
 END;
 RESET ROLE;
 -- No DELETE statement: managed protect_delete() is not inspected/bypassed.
END $storage_runtime$;

DO $invariants$
DECLARE rt_c record; rt_profiles_same boolean; rt_memberships jsonb; rt_links jsonb; rt_flags jsonb;
BEGIN
 SELECT * INTO rt_c FROM pg_temp.dobby_runtime_context;
 SELECT count(*)=2 AND bool_and(e=base.profile) INTO rt_profiles_same
  FROM pg_temp.dobby_runtime_parent_baseline base JOIN public.dobby_v2_modules m ON m.household_id=rt_c.household_id AND m.module='family'
  CROSS JOIN LATERAL jsonb_array_elements(m.payload->'familyMembers') e WHERE e->>'id'=base.profile_id;
 SELECT jsonb_agg(to_jsonb(a) ORDER BY a.user_id,a.household_id) INTO rt_memberships FROM public.dobby_v2_memberships a WHERE a.user_id IN(rt_c.parent_a,rt_c.parent_b);
 SELECT jsonb_agg(to_jsonb(l) ORDER BY l.user_id) INTO rt_links FROM dobby_v7_private.account_links l WHERE l.user_id IN(rt_c.parent_a,rt_c.parent_b);
 SELECT to_jsonb(s) INTO rt_flags FROM dobby_socle_private.install_state s WHERE s.singleton;
 INSERT INTO pg_temp.dobby_runtime_checks VALUES
  ('parents_profiles_unchanged_during_tests',coalesce(rt_profiles_same,false),'Les deux JSON Parent sont identiques aux originaux pendant la transaction.'),
  ('parents_memberships_unchanged_during_tests',rt_memberships=(SELECT b.value FROM pg_temp.dobby_runtime_baseline b WHERE b.kind='parentMemberships'),'Aucun rôle, foyer actif ou appartenance des Parents modifié.'),
  ('parents_links_unchanged_during_tests',rt_links=(SELECT b.value FROM pg_temp.dobby_runtime_baseline b WHERE b.kind='parentLinks'),'Aucune liaison Auth des Parents modifiée.'),
  ('child_single_binding_confirmed_in_database',(SELECT count(*)=1 FROM dobby_v7_private.account_links l WHERE l.user_id=rt_c.child_user AND l.household_id=rt_c.household_id AND l.member_id=rt_c.child_member_id),'Une liaison canonique unique relue en base, aucune duplication.'),
  ('publication_flags_unchanged',rt_flags=(SELECT b.value FROM pg_temp.dobby_runtime_baseline b WHERE b.kind='flags'),'Aucun flag client activé par cette recette.');
END $invariants$;

  $runtime_business_sql$;
  -- NULL is a failed normal probe, never an implicit success. The sole explicit
  -- skip is a missing Storage bucket, reported separately as not executed.
  UPDATE pg_temp.dobby_runtime_checks SET passed=coalesce(passed,false) WHERE name<>'storage_metadata_runtime';
  SELECT jsonb_build_object(
   'checksPassed',count(*) FILTER(WHERE passed IS TRUE),
   'checksFailed',count(*) FILTER(WHERE passed IS FALSE),
   'checksNotExecuted',count(*) FILTER(WHERE passed IS NULL),
   'allExecutedChecksPassed',NOT coalesce(bool_or(passed IS FALSE),false),
   'allRequiredSqlChecksPassed',coalesce(bool_and(passed IS TRUE),false),
   'checks',jsonb_agg(jsonb_build_object('name',name,'passed',passed,'detail',detail) ORDER BY name)
  ) INTO rt_report FROM pg_temp.dobby_runtime_checks;
  -- PL/pgSQL variables survive this exception, transactional fixture writes do
  -- not. No transaction control is attempted inside the anonymous block.
  RAISE EXCEPTION USING ERRCODE='ZX030',MESSAGE='DOBBY_RUNTIME_EXPECTED_INNER_ROLLBACK';
 EXCEPTION WHEN SQLSTATE 'ZX030' THEN
  rt_rolled_back:=true;
 WHEN OTHERS THEN
  rt_failure_state:=SQLSTATE;
  rt_report:=jsonb_build_object('checksPassed',0,'checksFailed',1,'checksNotExecuted',0,
   'allExecutedChecksPassed',false,'allRequiredSqlChecksPassed',false,
   'checks',jsonb_build_array(jsonb_build_object('name','runtime_probe_interrupted','passed',false,
    'detail','Contrôle interrompu puis annulé ; SQLSTATE='||rt_failure_state)));
  rt_rolled_back:=true;
 END;
 RESET ROLE;
 IF current_user<>'postgres' OR session_user<>'postgres' THEN RAISE EXCEPTION 'RT-RESTORE-ROLE : rôle SQL Editor non restauré'; END IF;
 FOREACH rt_table IN ARRAY rt_tables LOOP
  EXECUTE 'SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,''[]'')) FROM '||rt_table||' t' INTO rt_digest;
  rt_after:=jsonb_set(rt_after,ARRAY[rt_table],to_jsonb(rt_digest));
 END LOOP;
 -- This comparison is genuinely AFTER the inner rollback, before the final
 -- outer rollback that only removes temporary evidence tables and locks.
 INSERT INTO pg_temp.dobby_runtime_result(value) VALUES(rt_report||jsonb_build_object(
  'verification','dobby-socle-runtime-rollback-v1','scope','personal-family-project-only',
  'databaseRuntimeProbes',true,'jwtClaimsSimulatedInSqlEditor',true,'realAuthHttpVerified',false,
  'storagePhysicalUploadVerified',false,'storageDeleteVerified',false,
  'innerRollbackCompleted',rt_rolled_back,'postRollbackStateObserved',true,
  'postRollbackObservationScope','Après annulation de la sous-transaction métier, avant nettoyage final des tables temporaires.',
  'historicalDataAfterRollbackPreserved',rt_rolled_back AND rt_before=rt_after,
  'observedTablesAfterRollback',cardinality(rt_tables),'sqlEditorRoleRestored',current_user='postgres',
  'finalOuterRollbackStillFollows',true,
  'thirdAuthAccount','Le compte Auth de recette est conservé ; sa liaison/appartenance et les fixtures métier sont annulées.',
  'limits',jsonb_build_array('Aucune connexion HTTP/Auth, réception e-mail ou navigation réelle vérifiée par cette simulation SQL.',
   'Métadonnées Storage uniquement ; aucun DELETE ni contournement du guard géré.',
   'Les comparaisons après annulation sont calculées sur le serveur, sans retourner contenu, identifiant ou secret.',
   'Ne pas activer les capacités clientes à partir de ce seul JSON.')
 ));
END $runtime_rollback_probe$;
SELECT jsonb_pretty(value) AS runtime_verification FROM pg_temp.dobby_runtime_result;
ROLLBACK;
