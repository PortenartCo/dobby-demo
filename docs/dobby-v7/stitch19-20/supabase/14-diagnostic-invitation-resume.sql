-- DOBBY familial uniquement : dobby-family-sync / pqcdkrwljgvgagzwrcmg.
-- LECTURE SEULE. Aucun reset, aucune création de profil, aucun rejeu d'invitation.
-- Résultat agrégé : aucun nom, e-mail, identifiant ou jeton n'est renvoyé.
-- Les tables privées restent protégées : une visibilité refusée est indiquée,
-- jamais interprétée comme un compte nul.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='30s';
SET LOCAL row_security=off;

DO $diagnostic$
DECLARE result jsonb; section jsonb; err text;
  account_ids uuid[]; account_id uuid; context_result jsonb; phase text;
  phases jsonb:='{}'::jsonb; errors jsonb:='{}'::jsonb; active_contexts jsonb:='[]'::jsonb;
  saved_sub text:=current_setting('request.jwt.claim.sub',true);
  saved_claims text:=current_setting('request.jwt.claims',true);
BEGIN
  result:=jsonb_build_object('diagnostic','dobby-v7-invitation-resume-readonly-v1',
    'scope','personal-family-project-only','readOnly',true,'noResetPerformed',true,
    'realAuthOrBrowserAdoptionVerified',false);

  BEGIN
    SELECT coalesce(array_agg(id),ARRAY[]::uuid[]) INTO account_ids FROM auth.users;
    result:=result||jsonb_build_object('authUsers',jsonb_build_object('status','exact','count',cardinality(account_ids)));
  EXCEPTION WHEN OTHERS THEN
    result:=result||jsonb_build_object('authUsers',jsonb_build_object('status','unavailable','sqlstate',SQLSTATE));
  END;

  IF account_ids IS NOT NULL THEN
    PERFORM set_config('row_security','on',true);
    FOREACH account_id IN ARRAY account_ids LOOP
      PERFORM set_config('request.jwt.claim.sub',account_id::text,true);
      PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',account_id,'role','authenticated')::text,true);
      BEGIN
        context_result:=public.dobby_v7_context(); phase:=context_result->>'phase';
        IF phase IS NULL OR phase NOT IN ('profile','household','active','rejected') THEN phase:='other'; END IF;
        phases:=jsonb_set(phases,ARRAY[phase],to_jsonb(coalesce((phases->>phase)::integer,0)+1),true);
        IF phase='active' THEN
          active_contexts:=active_contexts||jsonb_build_array(jsonb_build_object(
            'household',context_result->>'householdId','member',context_result->>'memberId'));
        END IF;
      EXCEPTION WHEN OTHERS THEN
        errors:=jsonb_set(errors,ARRAY[SQLSTATE],to_jsonb(coalesce((errors->>SQLSTATE)::integer,0)+1),true);
      END;
    END LOOP;
    PERFORM set_config('request.jwt.claim.sub',coalesce(saved_sub,''),true);
    PERFORM set_config('request.jwt.claims',coalesce(saved_claims,''),true);
    SELECT coalesce(jsonb_agg(jsonb_build_object('activeAccounts',g.accounts,
      'distinctCanonicalProfiles',g.profiles) ORDER BY g.accounts DESC,g.profiles DESC),'[]'::jsonb)
      INTO section FROM (
        SELECT count(*) AS accounts,count(DISTINCT e->>'member') AS profiles
        FROM jsonb_array_elements(active_contexts) e GROUP BY e->>'household'
      ) g;
    result:=result||jsonb_build_object('contextDatabaseProbe',jsonb_build_object(
      'status','exact','probedAccountCount',cardinality(account_ids),'phaseCounts',phases,
      'errorSqlstateCounts',errors,'activeHouseholdGroups',section,
      'callerCanExecuteContext',has_function_privilege(current_user,'public.dobby_v7_context()','EXECUTE')));
    PERFORM set_config('row_security','off',true);
  ELSE
    result:=result||jsonb_build_object('contextDatabaseProbe',jsonb_build_object('status','unavailable'));
  END IF;

  BEGIN
    PERFORM set_config('row_security','on',true);
    section:=dobby_v7_private.verification_counts();
    result:=result||jsonb_build_object('privateV7',jsonb_build_object('status','exact','counts',section,
      'coverage','bindings,pendingProfiles,invitations; existing installer-only aggregate helper'));
  EXCEPTION WHEN OTHERS THEN
    result:=result||jsonb_build_object('privateV7',jsonb_build_object('status','unavailable','sqlstate',SQLSTATE));
  END;
  PERFORM set_config('row_security','off',true);

  BEGIN
    SELECT jsonb_build_object('rows',count(*),'activeRows',count(*) FILTER(WHERE active),
      'inactiveRows',count(*) FILTER(WHERE NOT active),'distinctActiveAccounts',count(DISTINCT user_id) FILTER(WHERE active),
      'activeOwners',count(*) FILTER(WHERE active AND role='owner'),
      'activeMembers',count(*) FILTER(WHERE active AND role='member')) INTO section
      FROM public.dobby_v2_memberships;
    result:=result||jsonb_build_object('memberships',jsonb_build_object('status','exact','counts',section));

    WITH households AS (
      SELECT h.id,CASE WHEN m.household_id IS NULL THEN 'missing'
        WHEN jsonb_typeof(m.payload->'familyMembers')='array' THEN 'array' ELSE 'invalid_or_missing_members' END AS registry_status,
        CASE WHEN jsonb_typeof(m.payload->'familyMembers')='array' THEN m.payload->'familyMembers' ELSE '[]'::jsonb END AS members
      FROM public.dobby_v2_households h LEFT JOIN public.dobby_v2_modules m ON m.household_id=h.id AND m.module='family'
    ), shapes AS (
      SELECT jsonb_build_object('canonicalRegistryStatus',h.registry_status,
        'canonicalProfiles',jsonb_array_length(h.members),
        'distinctCanonicalProfileIds',(SELECT count(DISTINCT e->>'id') FROM jsonb_array_elements(h.members) e WHERE jsonb_typeof(e->'id')='string'),
        'activeOwners',(SELECT count(*) FROM public.dobby_v2_memberships m WHERE m.household_id=h.id AND m.active AND m.role='owner'),
        'activeMembers',(SELECT count(*) FROM public.dobby_v2_memberships m WHERE m.household_id=h.id AND m.active AND m.role='member'),
        'inactiveMemberships',(SELECT count(*) FROM public.dobby_v2_memberships m WHERE m.household_id=h.id AND NOT m.active)
      ) AS shape FROM households h
    ) SELECT coalesce(jsonb_agg(jsonb_build_object('shape',shape,'households',n) ORDER BY n DESC),'[]'::jsonb)
      INTO section FROM (SELECT shape,count(*) AS n FROM shapes GROUP BY shape) grouped;
    result:=result||jsonb_build_object('householdShapes',jsonb_build_object('status','exact','groups',section));
  EXCEPTION WHEN OTHERS THEN
    result:=result||jsonb_build_object('publicHouseholdData',jsonb_build_object('status','unavailable','sqlstate',SQLSTATE));
  END;

  result:=result||jsonb_build_object('invitationDispositions',jsonb_build_object('status','unavailable',
    'reason','Private FORCE RLS visibility remains closed; only the existing global invitation count is read.'));

  PERFORM set_config('request.jwt.claim.sub',coalesce(saved_sub,''),true);
  PERFORM set_config('request.jwt.claims',coalesce(saved_claims,''),true);
  PERFORM set_config('dobby.invitation_resume_diagnostic',result::text,true);
END $diagnostic$;
SELECT current_setting('dobby.invitation_resume_diagnostic')::jsonb AS invitation_resume_diagnostic;
ROLLBACK;
