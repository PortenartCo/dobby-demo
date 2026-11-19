-- UNEXECUTED read-only catalogue request. No Auth/user rows or function bodies.
-- Reference hashes diagnose a difference; they do not approve hosted bodies.
BEGIN READ ONLY;
WITH expected(signature,body_md5,definition_md5,owner_name,definer) AS (VALUES
 ('public.dobby_v7_context()','ba0c44890d06743a2331c885a9739265','730d99915570bb5a465a2d1c8be104d1','dobby_socle_writer',true),
 ('public.dobby_v7_update_profile(jsonb,bigint)','c4915597121f2b1ea01bf2058987481a','478f617c98f746586465faa0a57caf99','dobby_v7_writer',true),
 ('public.dobby_v7_create_household(text,uuid)','05c28a810c14312cd1e85cf308ad9991','5b08f985d641c264395d212fdeefb08b','dobby_v7_writer',true),
 ('public.dobby_v7_create_invitation(integer,uuid)','7284d04d29735fc60b64593001729cc7','188c6d1e83caf7095251b7f3ce63862d','dobby_socle_writer',true),
 ('public.dobby_v7_preview_invitation(text)','3bec3bf1ddfde81709d7df7c56dad70a','d6ffdf95fa8c949a4e1ad7df178578cb','dobby_socle_writer',true),
 ('public.dobby_v7_accept_invitation(text,uuid)','6048f22e8ddf0bf9bb504f10330f269d','568ed7faef5833eeb9f801010c8e1d16','dobby_socle_writer',true),
 ('public.dobby_v7_revoke_invitation(uuid)','aafacb8a5114e64a764aa2008025c6b9','00a81a7c1b96420b6bcebd5cb41e5d05','dobby_socle_writer',true),
 ('public.dobby_v7_bind_existing_member(uuid,text,uuid)','a7cfc3b4f1f8f90d15fa68beccb4194c','31ea09b15c4f0ae1a93b8579113d1785','dobby_socle_writer',true),
 ('public.dobby_v7_update_magic(text,jsonb,bigint,uuid)','c16ddf78c573ffda347191c26ceb988c','455ccb6fb1a1cdce2262376aa3fe2abe','dobby_socle_writer',true),
 ('public.dobby_v7_update_member(text,jsonb,bigint,uuid)','319689a81c90aa39a7c78cec26d1c3ec','43a7ecf25704c60cd3a7c6abdc8f7e25','dobby_socle_writer',true),
 ('public.dobby_v7_create_child_invitation(text,integer,uuid)','3caf902bd54a142dc2d9e7694bd013b0','c9a4db8c82a3fff9d95a344e0045da4f','dobby_socle_writer',true),
 ('public.dobby_v7_preview_child_invitation(text)','1ffbe92562691d9d79411a94220fe70d','e6476a4d52b95a56bec4864cd046088e','dobby_socle_writer',true),
 ('public.dobby_v7_accept_child_invitation(text,uuid)','dc4a507ef23545435fb1f565e362b984','be4debb3177c59dd21999d154a458b6a','dobby_socle_writer',true),
 ('public.dobby_v7_family_capabilities()','00ffdfdc9ec3b1babb6b0914ab09a188','01c4af6066e492aac71191b967fdf77a','dobby_socle_writer',true),
 ('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)','8be638a0e9119929db3ea34545d8880a','f6c1a566f7f6a66079d25cf9f4186143','dobby_missions_v2_writer',true),
 ('public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)','1e12a5646770f5f04ffcaa8eeb9f5b35','648199d70c9174d67e5f4c9354a44698','dobby_missions_v2_writer',true),
 ('public.dobby_missions_v2_capabilities(uuid)','7319035ed773aad8af54eb6c2d7f7a9a','0cb2938afc1c3f6784332ac1a2b23f94','dobby_missions_v2_writer',true),
 ('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)','e60f95219aabe2f2ca2ed4346922d6ec','72856125c45f273065a4c8ca075c8a94','dobby_socle_writer',true),
 ('public.dobby_missions_v3_capabilities(uuid)','c6d9fc0c0b62c8963ac35758a93bba6d','d5884eb7f93a96c3895883ddb59a040e','dobby_socle_writer',true),
 ('public.dobby_sync_stamper()','327272bd4b60d1c869558b1f4bd584fd','5004be1ada63c4fcb101dde1d24cbb2c','postgres',false),
 ('public.dobby_v2_grocery_stamp()','612358e1c4bd661055818c36fb1479bd','b9769355fea53bd2ca1ed195c13d0d3d','postgres',false),
 ('public.dobby_v2_modules_stamp()','5b486d3c6cdef63a32074abb1ceb9e75','943a6b127b61a0bb5e6eedfdbeb34368','postgres',false),
 ('dobby_socle_private.actor_context(uuid,boolean)','d48e72bb46e5864d2bb39bde451da3dc','b5c7bdbecee13d0ec7151de89597be25','dobby_socle_writer',true),
 ('dobby_socle_private.is_parent(uuid)','38dc1537cf6c738321f205db9e27f571','b5e0f3bd223b15925c66cd2bc7f8bb25','dobby_socle_writer',true),
 ('dobby_socle_private.can_read(uuid)','05141408bf4ae637b333a2e6a5aafcd2','ae09d747b76ca165bbcc0df039b18d4a','dobby_socle_writer',true),
 ('dobby_socle_private.legacy_unlinked()','0ba1cda9f3427d826d9673eec01605c8','14b41f1547e2e110b932797ac720e3c3','dobby_socle_writer',true),
 ('dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)','c28920c783b07efe39287d6c6fefabfd','62eb41b65d31d4df2e1a35f3c310277d','dobby_socle_writer',true)
)
SELECT e.signature,p.oid IS NOT NULL AS present,pg_get_userbyid(p.proowner) AS owner,
 p.prosecdef AS security_definer,format_type(p.prorettype,NULL) AS result_type,
 p.provolatile,p.proisstrict,p.proleakproof,p.proparallel,p.pronargdefaults,
 md5(pg_get_expr(p.proargdefaults,0)) AS argument_defaults_md5,
 md5(p.proconfig::text) AS configuration_md5,
 (SELECT setting FROM unnest(p.proconfig) setting WHERE setting LIKE 'search_path=%') AS search_path,
 (SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(a.grantor),
   'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
   'privilege',a.privilege_type,'grantable',a.is_grantable)
   ORDER BY a.grantee,a.grantor,a.privilege_type)
  FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a) AS execution_acl,
 md5(p.prosrc) AS body_md5,md5(pg_get_functiondef(p.oid)) AS definition_md5,
 md5(p.prosrc)=e.body_md5 AS reference_body_matches,
 md5(pg_get_functiondef(p.oid))=e.definition_md5 AS reference_definition_matches,
 pg_get_userbyid(p.proowner)=e.owner_name AS reference_owner_matches,
 p.prosecdef=e.definer AS reference_definer_matches,
 has_schema_privilege('anon',p.pronamespace,'USAGE') AND has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_schema_privilege('authenticated',p.pronamespace,'USAGE') AND has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
ORDER BY e.signature;
ROLLBACK;
