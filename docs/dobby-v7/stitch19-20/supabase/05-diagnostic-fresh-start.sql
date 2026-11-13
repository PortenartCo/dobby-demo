-- DOBBY FAMILIAL SEULEMENT : diagnostic préalable à un NOUVEAU foyer de test.
-- Exécution MANUELLE par l'utilisateur, SQL Editor du projet personnel
-- dobby-family-sync / pqcdkrwljgvgagzwrcmg, sous le rôle d'installation.
-- Lecture seule : aucun reset, liaison historique, changement Auth ou contenu.
-- Renvoyer seulement la cellule JSON « fresh_start_diagnostic ».
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
-- Une visibilité RLS insuffisante doit provoquer une erreur, jamais un faux zéro.
SET LOCAL row_security=off;
DO $diagnostic$
DECLARE result jsonb; section jsonb; err text; private_helper regprocedure;
BEGIN
  result:=jsonb_build_object('diagnostic','dobby-stitch19-20-fresh-start-v1',
    'databaseVersion',current_setting('server_version'),'readOnly',true,
    'scope','personal-family-project-only','noResetPerformed',true);

  BEGIN
    SELECT jsonb_build_object(
      'households',(SELECT count(*) FROM public.dobby_v2_households),
      'membershipRows',(SELECT count(*) FROM public.dobby_v2_memberships),
      'activeMembershipRows',(SELECT count(*) FROM public.dobby_v2_memberships WHERE active),
      'distinctActiveAccounts',(SELECT count(DISTINCT user_id) FROM public.dobby_v2_memberships WHERE active),
      'moduleRows',(SELECT count(*) FROM public.dobby_v2_modules),
      'householdDetails',coalesce((SELECT jsonb_agg(jsonb_build_object(
        'householdId',h.id,
        'membershipRows',(SELECT count(*) FROM public.dobby_v2_memberships m WHERE m.household_id=h.id),
        'activeMembershipRows',(SELECT count(*) FROM public.dobby_v2_memberships m WHERE m.household_id=h.id AND m.active),
        'inactiveMembershipRows',(SELECT count(*) FROM public.dobby_v2_memberships m WHERE m.household_id=h.id AND NOT m.active),
        'activeOwners',(SELECT count(*) FROM public.dobby_v2_memberships m WHERE m.household_id=h.id AND m.active AND m.role='owner'),
        'activeMembers',(SELECT count(*) FROM public.dobby_v2_memberships m WHERE m.household_id=h.id AND m.active AND m.role='member'),
        'modules',coalesce((SELECT jsonb_agg(jsonb_build_object('module',m.module,'revision',m.revision,
          'canonicalMemberCount',CASE WHEN m.module='family' AND jsonb_typeof(m.payload->'familyMembers')='array'
            THEN jsonb_array_length(m.payload->'familyMembers') ELSE NULL END,
          'familyRegistryStatus',CASE WHEN m.module<>'family' THEN NULL
            WHEN m.payload->'familyMembers' IS NULL THEN 'absent'
            WHEN jsonb_typeof(m.payload->'familyMembers')='array' THEN 'array' ELSE 'invalid' END
        ) ORDER BY m.module) FROM public.dobby_v2_modules m WHERE m.household_id=h.id),'[]'::jsonb)
      ) ORDER BY h.id) FROM public.dobby_v2_households h),'[]'::jsonb)
    ) INTO section;
    result:=result||jsonb_build_object('v2',jsonb_build_object('status','exact','counts',section));
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err=RETURNED_SQLSTATE;
    result:=result||jsonb_build_object('v2',jsonb_build_object('status','unavailable','sqlstate',err,
      'reason','Visibilité complète non établie; aucun compte nul ne doit être déduit.'));
  END;

  -- La table historique V1 est indépendante des appartenances V2.
  IF to_regclass('public.dobby_sync_members') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT jsonb_build_object(''rows'',count(*),''activeRows'',count(*) FILTER(WHERE active),''inactiveRows'',count(*) FILTER(WHERE NOT active)) FROM public.dobby_sync_members' INTO section;
      result:=result||jsonb_build_object('legacyV1Memberships',jsonb_build_object('status','exact','counts',section));
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err=RETURNED_SQLSTATE;
      result:=result||jsonb_build_object('legacyV1Memberships',jsonb_build_object('status','unavailable','sqlstate',err));
    END;
  ELSE
    result:=result||jsonb_build_object('legacyV1Memberships',jsonb_build_object('status','absent'));
  END IF;
  result:=result||jsonb_build_object('legacyV1Catalog',jsonb_build_object('table','public.dobby_sync_members',
    'present',to_regclass('public.dobby_sync_members') IS NOT NULL,
    'columns',coalesce((SELECT jsonb_agg(jsonb_build_object('name',a.attname,
      'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull) ORDER BY a.attnum)
      FROM pg_attribute a WHERE a.attrelid=to_regclass('public.dobby_sync_members')
      AND a.attnum>0 AND NOT a.attisdropped),'[]'::jsonb)));

  BEGIN
    EXECUTE 'SELECT count(*) FROM auth.users' INTO section;
    result:=result||jsonb_build_object('authUsers',jsonb_build_object('status','exact','count',section));
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err=RETURNED_SQLSTATE;
    result:=result||jsonb_build_object('authUsers',jsonb_build_object('status','unavailable','sqlstate',err));
  END;

  -- Ne jamais compter directement les tables privées FORCE RLS sous postgres.
  -- Ce helper V2 est accordé uniquement à l'installateur et exécute ses policies
  -- writer. row_security=on est requis dans cet appel SECURITY DEFINER contrôlé.
  private_helper:=to_regprocedure('dobby_v7_private.verification_counts()');
  IF private_helper IS NULL THEN
    section:=jsonb_build_object('status','unavailable','reason','Helper absent : V7 non installé ou code retiré; aucun zéro déduit.');
  ELSIF NOT has_function_privilege(current_user,private_helper,'EXECUTE') THEN
    section:=jsonb_build_object('status','unavailable','reason','Exécuter sous le même rôle que 01-apply.sql; aucun zéro déduit.');
  ELSE
    BEGIN
      PERFORM set_config('row_security','on',true);
      EXECUTE 'SELECT dobby_v7_private.verification_counts()' INTO section;
      section:=jsonb_build_object('status','exact','counts',section,
        'coverage','bindings,pendingProfiles,invitations; global counts only');
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err=RETURNED_SQLSTATE;
      section:=jsonb_build_object('status','unavailable','sqlstate',err,'reason','Aucun zéro déduit.');
    END;
    PERFORM set_config('row_security','off',true);
  END IF;
  result:=result||jsonb_build_object('privateV7',section);

  WITH targets AS (
    SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('dobby_v2_households','dobby_v2_memberships','dobby_v2_modules','dobby_sync_members')
  ), fks AS (
    SELECT c.* FROM pg_constraint c WHERE c.contype='f'
      AND (c.conrelid IN (SELECT oid FROM targets) OR c.confrelid IN (SELECT oid FROM targets))
  ), touched AS (
    SELECT oid FROM targets UNION SELECT conrelid FROM fks UNION SELECT confrelid FROM fks
  )
  SELECT jsonb_build_object(
    'foreignKeys',coalesce((SELECT jsonb_agg(jsonb_build_object('name',f.conname,
      'fromTable',format('%I.%I',ns.nspname,src.relname),'toTable',format('%I.%I',nt.nspname,dst.relname),
      'definition',pg_get_constraintdef(f.oid,true),'validated',f.convalidated,
      'deferrable',f.condeferrable,'initiallyDeferred',f.condeferred) ORDER BY ns.nspname,src.relname,f.conname)
      FROM fks f JOIN pg_class src ON src.oid=f.conrelid JOIN pg_namespace ns ON ns.oid=src.relnamespace
      JOIN pg_class dst ON dst.oid=f.confrelid JOIN pg_namespace nt ON nt.oid=dst.relnamespace),'[]'::jsonb),
    'triggers',coalesce((SELECT jsonb_agg(jsonb_build_object('table',format('%I.%I',n.nspname,c.relname),
      'name',t.tgname,'enabled',t.tgenabled,'internal',t.tgisinternal,
      'triggerTypeFlags',t.tgtype,'function',format('%I.%I(%s)',fn.nspname,p.proname,pg_get_function_identity_arguments(p.oid)))
      ORDER BY n.nspname,c.relname,t.tgname)
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace fn ON fn.oid=p.pronamespace
      WHERE t.tgrelid IN (SELECT oid FROM touched)),'[]'::jsonb),
    'otherCatalogDependencies',coalesce((SELECT jsonb_agg(DISTINCT jsonb_build_object(
      'target',d.refobjid::regclass::text,'kind',d.deptype,
      'object',pg_describe_object(d.classid,d.objid,d.objsubid))) FROM pg_depend d
      WHERE d.refclassid='pg_class'::regclass AND d.refobjid IN (SELECT oid FROM targets)),'[]'::jsonb),
    'dependencyLimits','Catalogue déclaré seulement; les accès dynamiques dans les fonctions/SQL externes ne sont pas tous suivis par pg_depend.'
  ) INTO section;
  result:=result||jsonb_build_object('dependencies',section);
  PERFORM set_config('dobby.fresh_start_diagnostic',result::text,true);
END $diagnostic$;
SELECT jsonb_pretty(current_setting('dobby.fresh_start_diagnostic')::jsonb) AS fresh_start_diagnostic;
COMMIT;
