-- LOCAL FICTIONAL FIXTURE ONLY. NEVER RUN IN SUPABASE OR A REAL PROJECT.
-- Requires the unchanged shopping/01-install.sql already applied to an isolated
-- copy of the observed catalog. Executes as its local fixture owner, NOT as an
-- Auth user: this proves precision/stamping/CAS/legacy behavior, not Auth/RLS.
-- All fictional account/household/article writes are rolled back.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $test$
DECLARE
 actor constant uuid := '00000000-0000-4000-8000-000000071001';
 household constant uuid := '00000000-0000-4000-8000-000000071002';
 item constant uuid := '00000000-0000-4000-8000-000000071003';
 receipt constant uuid := '00000000-0000-4000-8000-000000071004';
 before_row public.dobby_v2_grocery%ROWTYPE;
 after_row public.dobby_v2_grocery%ROWTYPE;
 changed integer;
 bad text;
 rejected boolean;
BEGIN
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',actor::text,true);
 PERFORM pg_catalog.set_config('request.jwt.claims',jsonb_build_object('sub',actor)::text,true);
 INSERT INTO auth.users(id) VALUES(actor);
 INSERT INTO public.dobby_v2_households(id,name) VALUES(household,'TEST C07 LOCAL ONLY');
 INSERT INTO public.dobby_v2_memberships(household_id,user_id,role)
 VALUES(household,actor,'owner');
 INSERT INTO public.dobby_v2_grocery(id,household_id,title,quantity,unit,checked,import_source_id)
 VALUES(item,household,'TEST C07 LOCAL ONLY',1,'kg',false,receipt)
 RETURNING * INTO before_row;
 ASSERT before_row.at_home_quantity=0 AND NOT before_row.checked AND before_row.revision=1,
  'Initial additive default/purchase/revision mismatch';

 UPDATE public.dobby_v2_grocery SET at_home_quantity=.001
 WHERE id=item AND revision=1 RETURNING * INTO after_row;
 ASSERT after_row.id=item AND after_row.at_home_quantity=.001,
  '.001 kg availability was rounded/lost';
 ASSERT NOT after_row.checked AND after_row.revision=2
  AND after_row.created_at=before_row.created_at AND after_row.import_source_id=receipt
  AND after_row.updated_by=actor AND after_row.quantity=before_row.quantity,
  'Availability-only UPDATE changed purchase/identity/imports/quantity or did not stamp revision/actor';

 UPDATE public.dobby_v2_grocery SET at_home_quantity=.002 WHERE id=item AND revision=1;
 GET DIAGNOSTICS changed=ROW_COUNT;
 ASSERT changed=0,'Stale revision unexpectedly accepted';

 UPDATE public.dobby_v2_grocery SET at_home_quantity=.5 WHERE id=item AND revision=2;
 -- Historical client PATCH deliberately omits the new column.
 UPDATE public.dobby_v2_grocery SET quantity=.01 WHERE id=item AND revision=3
 RETURNING * INTO after_row;
 ASSERT after_row.at_home_quantity=.5 AND after_row.quantity=.01 AND after_row.revision=4
  AND NOT after_row.checked AND after_row.import_source_id=receipt,
  'Legacy quantity-only PATCH lost availability/purchase/import state';

 FOREACH bad IN ARRAY ARRAY['-1','1000000','NaN','Infinity','-Infinity'] LOOP
  rejected:=false;
  BEGIN
   UPDATE public.dobby_v2_grocery SET at_home_quantity=bad::numeric WHERE id=item;
  EXCEPTION WHEN check_violation THEN rejected:=true;
  END;
  ASSERT rejected,'Invalid availability not rejected: '||bad;
 END LOOP;

 rejected:=false;
 BEGIN
  UPDATE public.dobby_v2_grocery
  SET import_source_id='00000000-0000-4000-8000-000000071005' WHERE id=item;
 EXCEPTION WHEN raise_exception THEN rejected:=true;
 END;
 ASSERT rejected,'Native immutable import identity was not preserved';
 SELECT * INTO after_row FROM public.dobby_v2_grocery WHERE id=item;
 ASSERT after_row.revision=4 AND after_row.at_home_quantity=.5
  AND after_row.import_source_id=receipt AND NOT after_row.checked,
  'Refused updates changed row/revision/purchase/import state';
END;
$test$;
SELECT 'local_c07_runtime_pass_precision_revision_legacy_bounds_no_purchase' AS local_fixture_result;
ROLLBACK;
