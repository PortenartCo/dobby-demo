-- LOCAL CANDIDATE: exclusive maintenance and separate approval required.
-- Lot 2A candidate. Apply ONLY after a separately approved hosted-catalog review.
-- No old installer is replayed. No Auth, role attribute, or Storage mutation.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE TEMP TABLE access_2a_manifest(signature text PRIMARY KEY,kind text NOT NULL) ON COMMIT DROP;
INSERT INTO access_2a_manifest VALUES
 ('public.dobby_v7_context()','read'),
 ('public.dobby_v7_update_profile(jsonb,bigint)','write'),
 ('public.dobby_v7_create_household(text,uuid)','create'),
 ('public.dobby_v7_create_invitation(integer,uuid)','write'),
 ('public.dobby_v7_preview_invitation(text)','preview'),
 ('public.dobby_v7_accept_invitation(text,uuid)','write'),
 ('public.dobby_v7_revoke_invitation(uuid)','write'),
 ('public.dobby_v7_bind_existing_member(uuid,text,uuid)','write'),
 ('public.dobby_v7_update_magic(text,jsonb,bigint,uuid)','write'),
 ('public.dobby_v7_update_member(text,jsonb,bigint,uuid)','write'),
 ('public.dobby_v7_create_child_invitation(text,integer,uuid)','write'),
 ('public.dobby_v7_preview_child_invitation(text)','preview'),
 ('public.dobby_v7_accept_child_invitation(text,uuid)','write'),
 ('public.dobby_v7_family_capabilities()','public-flags'),
 ('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)','write'),
 ('public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)','closed'),
 ('public.dobby_missions_v2_capabilities(uuid)','read'),
 ('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)','write'),
 ('public.dobby_missions_v3_capabilities(uuid)','read'),
 ('public.dobby_sync_stamper()','trigger'),
 ('public.dobby_v2_grocery_stamp()','trigger'),
 ('public.dobby_v2_modules_stamp()','trigger'),
 ('dobby_socle_private.actor_context(uuid,boolean)','context'),
 ('dobby_socle_private.is_parent(uuid)','predicate'),
 ('dobby_socle_private.can_read(uuid)','predicate'),
 ('dobby_socle_private.legacy_unlinked()','predicate'),
 ('dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)','write');

-- Body/owner fingerprints of definitions reconstructed from the published sources.
-- Any hosted drift requires review, never a best-effort patch.
CREATE TEMP TABLE access_2a_reference(signature text PRIMARY KEY,body_md5 text,owner_name name,definition_md5 text) ON COMMIT DROP;
INSERT INTO access_2a_reference VALUES
 ('public.dobby_v7_context()','ba0c44890d06743a2331c885a9739265','dobby_socle_writer','730d99915570bb5a465a2d1c8be104d1'),
 ('public.dobby_v7_update_profile(jsonb,bigint)','c4915597121f2b1ea01bf2058987481a','dobby_v7_writer','478f617c98f746586465faa0a57caf99'),
 ('public.dobby_v7_create_household(text,uuid)','05c28a810c14312cd1e85cf308ad9991','dobby_v7_writer','5b08f985d641c264395d212fdeefb08b'),
 ('public.dobby_v7_create_invitation(integer,uuid)','7284d04d29735fc60b64593001729cc7','dobby_socle_writer','188c6d1e83caf7095251b7f3ce63862d'),
 ('public.dobby_v7_preview_invitation(text)','3bec3bf1ddfde81709d7df7c56dad70a','dobby_socle_writer','d6ffdf95fa8c949a4e1ad7df178578cb'),
 ('public.dobby_v7_accept_invitation(text,uuid)','6048f22e8ddf0bf9bb504f10330f269d','dobby_socle_writer','568ed7faef5833eeb9f801010c8e1d16'),
 ('public.dobby_v7_revoke_invitation(uuid)','aafacb8a5114e64a764aa2008025c6b9','dobby_socle_writer','00a81a7c1b96420b6bcebd5cb41e5d05'),
 ('public.dobby_v7_bind_existing_member(uuid,text,uuid)','a7cfc3b4f1f8f90d15fa68beccb4194c','dobby_socle_writer','31ea09b15c4f0ae1a93b8579113d1785'),
 ('public.dobby_v7_update_magic(text,jsonb,bigint,uuid)','c16ddf78c573ffda347191c26ceb988c','dobby_socle_writer','455ccb6fb1a1cdce2262376aa3fe2abe'),
 ('public.dobby_v7_update_member(text,jsonb,bigint,uuid)','319689a81c90aa39a7c78cec26d1c3ec','dobby_socle_writer','43a7ecf25704c60cd3a7c6abdc8f7e25'),
 ('public.dobby_v7_create_child_invitation(text,integer,uuid)','3caf902bd54a142dc2d9e7694bd013b0','dobby_socle_writer','c9a4db8c82a3fff9d95a344e0045da4f'),
 ('public.dobby_v7_preview_child_invitation(text)','1ffbe92562691d9d79411a94220fe70d','dobby_socle_writer','e6476a4d52b95a56bec4864cd046088e'),
 ('public.dobby_v7_accept_child_invitation(text,uuid)','dc4a507ef23545435fb1f565e362b984','dobby_socle_writer','be4debb3177c59dd21999d154a458b6a'),
 ('public.dobby_v7_family_capabilities()','00ffdfdc9ec3b1babb6b0914ab09a188','dobby_socle_writer','01c4af6066e492aac71191b967fdf77a'),
 ('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)','8be638a0e9119929db3ea34545d8880a','dobby_missions_v2_writer','f6c1a566f7f6a66079d25cf9f4186143'),
 ('public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)','1e12a5646770f5f04ffcaa8eeb9f5b35','dobby_missions_v2_writer','648199d70c9174d67e5f4c9354a44698'),
 ('public.dobby_missions_v2_capabilities(uuid)','7319035ed773aad8af54eb6c2d7f7a9a','dobby_missions_v2_writer','0cb2938afc1c3f6784332ac1a2b23f94'),
 ('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)','e60f95219aabe2f2ca2ed4346922d6ec','dobby_socle_writer','72856125c45f273065a4c8ca075c8a94'),
 ('public.dobby_missions_v3_capabilities(uuid)','c6d9fc0c0b62c8963ac35758a93bba6d','dobby_socle_writer','d5884eb7f93a96c3895883ddb59a040e'),
 ('public.dobby_sync_stamper()','327272bd4b60d1c869558b1f4bd584fd','postgres','5004be1ada63c4fcb101dde1d24cbb2c'),
 ('public.dobby_v2_grocery_stamp()','612358e1c4bd661055818c36fb1479bd','postgres','b9769355fea53bd2ca1ed195c13d0d3d'),
 ('public.dobby_v2_modules_stamp()','5b486d3c6cdef63a32074abb1ceb9e75','postgres','943a6b127b61a0bb5e6eedfdbeb34368'),
 ('dobby_socle_private.actor_context(uuid,boolean)','d48e72bb46e5864d2bb39bde451da3dc','dobby_socle_writer','b5c7bdbecee13d0ec7151de89597be25'),
 ('dobby_socle_private.is_parent(uuid)','38dc1537cf6c738321f205db9e27f571','dobby_socle_writer','b5e0f3bd223b15925c66cd2bc7f8bb25'),
 ('dobby_socle_private.can_read(uuid)','05141408bf4ae637b333a2e6a5aafcd2','dobby_socle_writer','ae09d747b76ca165bbcc0df039b18d4a'),
 ('dobby_socle_private.legacy_unlinked()','0ba1cda9f3427d826d9673eec01605c8','dobby_socle_writer','14b41f1547e2e110b932797ac720e3c3'),
 ('dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)','c28920c783b07efe39287d6c6fefabfd','dobby_socle_writer','62eb41b65d31d4df2e1a35f3c310277d');

-- Exact approved pairs only; no lexical normalization or business write.
DO $catalogue_5b$
DECLARE e jsonb; f record; acl jsonb; expected_acl jsonb; profile text; acl_ok boolean;
BEGIN
 IF current_user <> 'postgres' OR current_setting('server_version_num')::int < 160000
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN
  RAISE EXCEPTION 'Verified non-superuser postgres installer required for catalogue approval';
 END IF;
 FOR e IN SELECT value FROM jsonb_array_elements('[{"signature":"public.dobby_v7_context()","kind":"read","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"s","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,dobby_v7_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"ba0c44890d06743a2331c885a9739265","definitionMD5":"730d99915570bb5a465a2d1c8be104d1","source":"published-reference"}]},{"signature":"public.dobby_v7_update_profile(jsonb,bigint)","kind":"write","owner":"dobby_v7_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_profile jsonb, p_expected_revision bigint","anon":false,"authenticated":true,"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"pairs":[{"bodyMD5":"c4915597121f2b1ea01bf2058987481a","definitionMD5":"478f617c98f746586465faa0a57caf99","source":"published-reference"},{"bodyMD5":"34be4ec3886d86b4f50227c55f9c18d1","definitionMD5":"e9cd180c42b172de4bb6e3087d35d2e0","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_household(text,uuid)","kind":"create","owner":"dobby_v7_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_name text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"pairs":[{"bodyMD5":"05c28a810c14312cd1e85cf308ad9991","definitionMD5":"5b08f985d641c264395d212fdeefb08b","source":"published-reference"},{"bodyMD5":"54228b41c9101243098de608e9c36fba","definitionMD5":"4b92f7429be05ecae44e03965793958c","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_invitation(integer,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_expires_in_hours integer, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"7284d04d29735fc60b64593001729cc7","definitionMD5":"188c6d1e83caf7095251b7f3ce63862d","source":"published-reference"}]},{"signature":"public.dobby_v7_preview_invitation(text)","kind":"preview","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_token text","anon":true,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"3bec3bf1ddfde81709d7df7c56dad70a","definitionMD5":"d6ffdf95fa8c949a4e1ad7df178578cb","source":"published-reference"}]},{"signature":"public.dobby_v7_accept_invitation(text,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_token text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"6048f22e8ddf0bf9bb504f10330f269d","definitionMD5":"568ed7faef5833eeb9f801010c8e1d16","source":"published-reference"}]},{"signature":"public.dobby_v7_revoke_invitation(uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_invitation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"aafacb8a5114e64a764aa2008025c6b9","definitionMD5":"00a81a7c1b96420b6bcebd5cb41e5d05","source":"published-reference"},{"bodyMD5":"6ef6ac479b3683ecc8e72effd9def686","definitionMD5":"176afdf0ffb1f495aa35712f1a79917b","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_bind_existing_member(uuid,text,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_user_id uuid, p_member_id text, p_operation_id uuid","anon":false,"authenticated":false,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"a7cfc3b4f1f8f90d15fa68beccb4194c","definitionMD5":"31ea09b15c4f0ae1a93b8579113d1785","source":"published-reference"},{"bodyMD5":"f4516255573304a3e845d267288c02e4","definitionMD5":"f5122d579f0e00142d3fa9aedb504467","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_update_magic(text,jsonb,bigint,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_member_id text, p_values jsonb, p_expected_revision bigint, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"c16ddf78c573ffda347191c26ceb988c","definitionMD5":"455ccb6fb1a1cdce2262376aa3fe2abe","source":"published-reference"},{"bodyMD5":"4adbf459e416a3c237d94d7a3c97b998","definitionMD5":"5511f41b0a217af72a129b0bcbe406b3","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_update_member(text,jsonb,bigint,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_member_id text, p_values jsonb, p_expected_revision bigint, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"319689a81c90aa39a7c78cec26d1c3ec","definitionMD5":"43a7ecf25704c60cd3a7c6abdc8f7e25","source":"published-reference"},{"bodyMD5":"bc5480cd38c04443320a044df2c40505","definitionMD5":"dcee241ca6a37d9342ccdde37534250a","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_child_invitation(text,integer,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_member_id text, p_expires_in_hours integer, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"3caf902bd54a142dc2d9e7694bd013b0","definitionMD5":"c9a4db8c82a3fff9d95a344e0045da4f","source":"published-reference"},{"bodyMD5":"f23e8a78d027398c648f5079c0b7e1d9","definitionMD5":"8e137a6adc0606f964b29922835e90f5","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_preview_child_invitation(text)","kind":"preview","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_token text","anon":true,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"1ffbe92562691d9d79411a94220fe70d","definitionMD5":"e6476a4d52b95a56bec4864cd046088e","source":"published-reference"}]},{"signature":"public.dobby_v7_accept_child_invitation(text,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_token text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"dc4a507ef23545435fb1f565e362b984","definitionMD5":"be4debb3177c59dd21999d154a458b6a","source":"published-reference"}]},{"signature":"public.dobby_v7_family_capabilities()","kind":"public-flags","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"","anon":true,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"00ffdfdc9ec3b1babb6b0914ab09a188","definitionMD5":"01c4af6066e492aac71191b967fdf77a","source":"published-reference"},{"bodyMD5":"009915f94fb69d9eca749f76d6d798cc","definitionMD5":"c8946b6cc1cd45c79221fef852d18d67","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)","kind":"write","owner":"dobby_missions_v2_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_payload jsonb","anon":false,"authenticated":true,"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer,authenticated=X/dobby_missions_v2_writer}"],"pairs":[{"bodyMD5":"8be638a0e9119929db3ea34545d8880a","definitionMD5":"f6c1a566f7f6a66079d25cf9f4186143","source":"published-reference"},{"bodyMD5":"c19d7250d6d1c0170746f190cc37a91f","definitionMD5":"183463fe1a9ed008d109495eb125fb00","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)","kind":"closed","owner":"dobby_missions_v2_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_payload jsonb","anon":false,"authenticated":false,"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer}"],"pairs":[{"bodyMD5":"1e12a5646770f5f04ffcaa8eeb9f5b35","definitionMD5":"648199d70c9174d67e5f4c9354a44698","source":"published-reference"},{"bodyMD5":"fc8629bb62607cda0d0e1fb70d76606e","definitionMD5":"b4d3770d04a83a20472497cbc54d6d0b","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v2_capabilities(uuid)","kind":"read","owner":"dobby_missions_v2_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer,authenticated=X/dobby_missions_v2_writer}"],"pairs":[{"bodyMD5":"7319035ed773aad8af54eb6c2d7f7a9a","definitionMD5":"0cb2938afc1c3f6784332ac1a2b23f94","source":"published-reference"},{"bodyMD5":"dcc7672defff4a40edaa41d345bff93b","definitionMD5":"7ae3285e2ad55c7b6fe6274600fc4964","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_intent jsonb","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"e60f95219aabe2f2ca2ed4346922d6ec","definitionMD5":"72856125c45f273065a4c8ca075c8a94","source":"published-reference"},{"bodyMD5":"e08b19bb97d0b56dece38ccb45f13e4a","definitionMD5":"b08e3e6608c570db021dea360413e793","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v3_capabilities(uuid)","kind":"read","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"c6d9fc0c0b62c8963ac35758a93bba6d","definitionMD5":"d5884eb7f93a96c3895883ddb59a040e","source":"published-reference"},{"bodyMD5":"02c7e27105c537f69479c71b452b9e8c","definitionMD5":"aabcc749a98abc42b7edd0b4e68b18b7","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_sync_stamper()","kind":"trigger","owner":"postgres","securityDefiner":false,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":false,"aclProfiles":["{postgres=X/postgres}","{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"],"pairs":[{"bodyMD5":"327272bd4b60d1c869558b1f4bd584fd","definitionMD5":"5004be1ada63c4fcb101dde1d24cbb2c","source":"published-reference"},{"bodyMD5":"fa45e3e11adc285d0aea62d8d8ece43b","definitionMD5":"e26ca6808eb54035f23c083ca87b53b7","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v2_grocery_stamp()","kind":"trigger","owner":"postgres","securityDefiner":false,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":false,"aclProfiles":["{postgres=X/postgres}"],"pairs":[{"bodyMD5":"612358e1c4bd661055818c36fb1479bd","definitionMD5":"b9769355fea53bd2ca1ed195c13d0d3d","source":"published-reference"},{"bodyMD5":"ed50edec2a5405ffc2695b80ddd676f4","definitionMD5":"ee36503542de1162beba0eed99ac4874","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v2_modules_stamp()","kind":"trigger","owner":"postgres","securityDefiner":false,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":false,"aclProfiles":["{postgres=X/postgres}"],"pairs":[{"bodyMD5":"5b486d3c6cdef63a32074abb1ceb9e75","definitionMD5":"943a6b127b61a0bb5e6eedfdbeb34368","source":"published-reference"},{"bodyMD5":"797d1c401fd7794e9b11346b583a00e0","definitionMD5":"af31219b7511ffc379184c68d5b4744a","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.actor_context(uuid,boolean)","kind":"context","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household uuid, p_lock boolean","anon":false,"authenticated":false,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,dobby_missions_v2_writer=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"d48e72bb46e5864d2bb39bde451da3dc","definitionMD5":"b5c7bdbecee13d0ec7151de89597be25","source":"published-reference"},{"bodyMD5":"61404767b69ee7d011abca3b12b6a33c","definitionMD5":"637e061b764e9dce6b692bb646870c36","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.is_parent(uuid)","kind":"predicate","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"38dc1537cf6c738321f205db9e27f571","definitionMD5":"b5e0f3bd223b15925c66cd2bc7f8bb25","source":"published-reference"},{"bodyMD5":"c8ffd486d81385ea26bc087b53602c95","definitionMD5":"62e96e71a893d394948bac85c11ca35a","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.can_read(uuid)","kind":"predicate","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"05141408bf4ae637b333a2e6a5aafcd2","definitionMD5":"ae09d747b76ca165bbcc0df039b18d4a","source":"published-reference"},{"bodyMD5":"b281e880ccfabd6c6a9d8e2ceb442202","definitionMD5":"1ce26b3479aea7e992d2047cecb0006b","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.legacy_unlinked()","kind":"predicate","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"0ba1cda9f3427d826d9673eec01605c8","definitionMD5":"14b41f1547e2e110b932797ac720e3c3","source":"published-reference"},{"bodyMD5":"93e44c5b1ec3ace5a6fa4cb0be835d6c","definitionMD5":"e6228c783c43d534aae7df7406f210aa","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household uuid, p_old jsonb, p_new jsonb","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"c28920c783b07efe39287d6c6fefabfd","definitionMD5":"62eb41b65d31d4df2e1a35f3c310277d","source":"published-reference"},{"bodyMD5":"02f2de08010befdde4d85ce88e13b689","definitionMD5":"16d06586efdbfe90e4b61986c37468a4","source":"ChatGPT-reported-lexical-review-20261119"}]}]'::jsonb) LOOP
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
  SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
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
  END IF;
 END LOOP;
END $catalogue_5b$;
-- References from the published Missions installer; no private stub.
DO $missions_5b$
DECLARE e jsonb; f oid;
BEGIN
 FOR e IN SELECT value FROM jsonb_array_elements('[{"signature":"dobby_runes_private.assert_event(jsonb,boolean)","definitionMD5":"143d7eee03b39cd641adc44d5463c98b"},{"signature":"dobby_runes_private.assert_ledger(jsonb)","definitionMD5":"97ca8fc4f7a90da7ab9424d8061eb9c7"},{"signature":"dobby_runes_private.assert_mission(jsonb)","definitionMD5":"a1a81757d2fa0083204a79ecd9f50388"},{"signature":"dobby_runes_private.assert_payload(jsonb)","definitionMD5":"fd72b697c15961425a22da79c4495d1a"},{"signature":"dobby_runes_private.event_key(jsonb)","definitionMD5":"546b184d13d15d74814a2e4a1eee09c1"},{"signature":"dobby_runes_private.has_native_text(text)","definitionMD5":"339a898b0c8c47fcb6f2ef0fd168dbb6"},{"signature":"dobby_runes_private.lock_active_membership(uuid)","definitionMD5":"fbf50ad8e900c6ca1f360038a8abce37"},{"signature":"dobby_runes_private.request_user_id()","definitionMD5":"d6c6cd4743fa2d32d6994d2bf382679c"},{"signature":"dobby_runes_private.safe_integer(jsonb,text)","definitionMD5":"0b7cf60ae2d30086d30bf036eae0e8f5"},{"signature":"dobby_runes_private.same_award(jsonb,jsonb)","definitionMD5":"e43e606d434d8b1e15fe330d83741f42"},{"signature":"dobby_runes_private.utf16_length(text)","definitionMD5":"e2570931d23e3fdbffe397c971df9a31"},{"signature":"dobby_runes_private.valid_date(text)","definitionMD5":"1b25324883b40c6d4e62c15c7a565a58"}]'::jsonb) LOOP
  f:=to_regprocedure(e->>'signature');
  IF f IS NULL OR md5(pg_get_functiondef(f)) IS DISTINCT FROM e->>'definitionMD5' THEN
   RAISE EXCEPTION 'Missing or unapproved private Missions definition: %',e->>'signature';
  END IF;
  IF has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE') THEN
   RAISE EXCEPTION 'Unapproved browser permission on private Missions helper: %',e->>'signature';
  END IF;
 END LOOP;
END $missions_5b$;
-- Additive READ-ONLY preflight candidate, not a migration or a role repair.
-- Run before the reviewed maintenance transaction. Existing migrations stay
-- unchanged and must still pass their own catalogue/permission checks.
-- The historical closing statements update only grants made by postgres.
-- Do not reject its own temporary grant if that closing removes all authority.
DO $lot5b_roles$
DECLARE
 installer oid;
 role_name text;
 target oid;
 targets oid[];
 authority_after_close boolean;
BEGIN
 IF current_setting('server_version_num')::integer<160000 OR current_user<>'postgres'
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Verified non-superuser PostgreSQL installer required';
 END IF;
 SELECT oid INTO installer FROM pg_roles WHERE rolname=current_user;
 IF EXISTS(SELECT 1 FROM (VALUES ('dobby_v7_writer'),('dobby_socle_writer'),('dobby_missions_v2_writer')) expected(name)
  WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=expected.name)) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Existing business writer roles required';
 END IF;
 -- The access writer does not exist before Lot 1; check it too when present.
 SELECT array_agg(oid) INTO targets FROM pg_roles WHERE rolname IN
  ('dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer','dobby_access_writer');
 FOREACH target IN ARRAY targets LOOP
  SELECT rolname INTO role_name FROM pg_roles WHERE oid=target;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE oid=target AND
   (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
   OR NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=target AND member=installer
    AND admin_option AND NOT inherit_option AND NOT set_option)
   OR pg_has_role('anon',target,'MEMBER') OR pg_has_role('authenticated',target,'MEMBER') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE=format('Existing closed ADMIN capability required for %s',role_name);
  END IF;
  -- Project the exact post-state: only the installer's own direct grants to
  -- these writers will be closed. Other grantors and indirect paths survive.
  WITH RECURSIVE can_set(roleid) AS (
   SELECT installer
   UNION
   SELECT m.roleid FROM pg_auth_members m JOIN can_set p ON p.roleid=m.member
   WHERE m.set_option AND NOT(m.member=installer AND m.grantor=installer AND m.roleid=ANY(targets))
  ), can_use(roleid) AS (
   -- A SET-able intermediate role may inherit a writer even when the
   -- installer cannot directly inherit or SET that writer itself.
   SELECT roleid FROM can_set
   UNION
   SELECT m.roleid FROM pg_auth_members m JOIN can_use p ON p.roleid=m.member
   WHERE m.inherit_option AND NOT(m.member=installer AND m.grantor=installer AND m.roleid=ANY(targets))
  ) SELECT EXISTS(SELECT 1 FROM can_use WHERE roleid=target) INTO authority_after_close;
  IF authority_after_close THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE=format('Maintenance would leave active membership for %s',role_name);
  END IF;
 END LOOP;
END $lot5b_roles$;

DO $preflight$
DECLARE f record; r text;
BEGIN
 IF current_user<>'postgres' OR to_regnamespace('dobby_access_legacy') IS NOT NULL
  OR to_regprocedure('dobby_access_private.assert_active()') IS NULL THEN
  RAISE EXCEPTION 'Verified installer, Lot 1 and unapplied Lot 2A required';
 END IF;
 IF EXISTS(SELECT 1 FROM access_2a_manifest WHERE to_regprocedure(signature) IS NULL) THEN
  RAISE EXCEPTION 'Incomplete business catalog; no replacement stubs allowed';
 END IF;
 IF EXISTS(SELECT 1 FROM access_2a_reference r JOIN pg_proc p ON p.oid=to_regprocedure(r.signature) WHERE pg_get_userbyid(p.proowner)<>r.owner_name OR NOT EXISTS(
  SELECT 1 FROM jsonb_array_elements('[{"signature":"public.dobby_v7_context()","kind":"read","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"s","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,dobby_v7_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"ba0c44890d06743a2331c885a9739265","definitionMD5":"730d99915570bb5a465a2d1c8be104d1","source":"published-reference"}]},{"signature":"public.dobby_v7_update_profile(jsonb,bigint)","kind":"write","owner":"dobby_v7_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_profile jsonb, p_expected_revision bigint","anon":false,"authenticated":true,"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"pairs":[{"bodyMD5":"c4915597121f2b1ea01bf2058987481a","definitionMD5":"478f617c98f746586465faa0a57caf99","source":"published-reference"},{"bodyMD5":"34be4ec3886d86b4f50227c55f9c18d1","definitionMD5":"e9cd180c42b172de4bb6e3087d35d2e0","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_household(text,uuid)","kind":"create","owner":"dobby_v7_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_name text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"pairs":[{"bodyMD5":"05c28a810c14312cd1e85cf308ad9991","definitionMD5":"5b08f985d641c264395d212fdeefb08b","source":"published-reference"},{"bodyMD5":"54228b41c9101243098de608e9c36fba","definitionMD5":"4b92f7429be05ecae44e03965793958c","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_invitation(integer,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_expires_in_hours integer, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"7284d04d29735fc60b64593001729cc7","definitionMD5":"188c6d1e83caf7095251b7f3ce63862d","source":"published-reference"}]},{"signature":"public.dobby_v7_preview_invitation(text)","kind":"preview","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_token text","anon":true,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"3bec3bf1ddfde81709d7df7c56dad70a","definitionMD5":"d6ffdf95fa8c949a4e1ad7df178578cb","source":"published-reference"}]},{"signature":"public.dobby_v7_accept_invitation(text,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_token text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"6048f22e8ddf0bf9bb504f10330f269d","definitionMD5":"568ed7faef5833eeb9f801010c8e1d16","source":"published-reference"}]},{"signature":"public.dobby_v7_revoke_invitation(uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_invitation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"aafacb8a5114e64a764aa2008025c6b9","definitionMD5":"00a81a7c1b96420b6bcebd5cb41e5d05","source":"published-reference"},{"bodyMD5":"6ef6ac479b3683ecc8e72effd9def686","definitionMD5":"176afdf0ffb1f495aa35712f1a79917b","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_bind_existing_member(uuid,text,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_user_id uuid, p_member_id text, p_operation_id uuid","anon":false,"authenticated":false,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"a7cfc3b4f1f8f90d15fa68beccb4194c","definitionMD5":"31ea09b15c4f0ae1a93b8579113d1785","source":"published-reference"},{"bodyMD5":"f4516255573304a3e845d267288c02e4","definitionMD5":"f5122d579f0e00142d3fa9aedb504467","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_update_magic(text,jsonb,bigint,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_member_id text, p_values jsonb, p_expected_revision bigint, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"c16ddf78c573ffda347191c26ceb988c","definitionMD5":"455ccb6fb1a1cdce2262376aa3fe2abe","source":"published-reference"},{"bodyMD5":"4adbf459e416a3c237d94d7a3c97b998","definitionMD5":"5511f41b0a217af72a129b0bcbe406b3","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_update_member(text,jsonb,bigint,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_member_id text, p_values jsonb, p_expected_revision bigint, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"319689a81c90aa39a7c78cec26d1c3ec","definitionMD5":"43a7ecf25704c60cd3a7c6abdc8f7e25","source":"published-reference"},{"bodyMD5":"bc5480cd38c04443320a044df2c40505","definitionMD5":"dcee241ca6a37d9342ccdde37534250a","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_child_invitation(text,integer,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_member_id text, p_expires_in_hours integer, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"3caf902bd54a142dc2d9e7694bd013b0","definitionMD5":"c9a4db8c82a3fff9d95a344e0045da4f","source":"published-reference"},{"bodyMD5":"f23e8a78d027398c648f5079c0b7e1d9","definitionMD5":"8e137a6adc0606f964b29922835e90f5","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_preview_child_invitation(text)","kind":"preview","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_token text","anon":true,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"1ffbe92562691d9d79411a94220fe70d","definitionMD5":"e6476a4d52b95a56bec4864cd046088e","source":"published-reference"}]},{"signature":"public.dobby_v7_accept_child_invitation(text,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_token text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"dc4a507ef23545435fb1f565e362b984","definitionMD5":"be4debb3177c59dd21999d154a458b6a","source":"published-reference"}]},{"signature":"public.dobby_v7_family_capabilities()","kind":"public-flags","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"","anon":true,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"00ffdfdc9ec3b1babb6b0914ab09a188","definitionMD5":"01c4af6066e492aac71191b967fdf77a","source":"published-reference"},{"bodyMD5":"009915f94fb69d9eca749f76d6d798cc","definitionMD5":"c8946b6cc1cd45c79221fef852d18d67","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)","kind":"write","owner":"dobby_missions_v2_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_payload jsonb","anon":false,"authenticated":true,"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer,authenticated=X/dobby_missions_v2_writer}"],"pairs":[{"bodyMD5":"8be638a0e9119929db3ea34545d8880a","definitionMD5":"f6c1a566f7f6a66079d25cf9f4186143","source":"published-reference"},{"bodyMD5":"c19d7250d6d1c0170746f190cc37a91f","definitionMD5":"183463fe1a9ed008d109495eb125fb00","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)","kind":"closed","owner":"dobby_missions_v2_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_payload jsonb","anon":false,"authenticated":false,"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer}"],"pairs":[{"bodyMD5":"1e12a5646770f5f04ffcaa8eeb9f5b35","definitionMD5":"648199d70c9174d67e5f4c9354a44698","source":"published-reference"},{"bodyMD5":"fc8629bb62607cda0d0e1fb70d76606e","definitionMD5":"b4d3770d04a83a20472497cbc54d6d0b","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v2_capabilities(uuid)","kind":"read","owner":"dobby_missions_v2_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer,authenticated=X/dobby_missions_v2_writer}"],"pairs":[{"bodyMD5":"7319035ed773aad8af54eb6c2d7f7a9a","definitionMD5":"0cb2938afc1c3f6784332ac1a2b23f94","source":"published-reference"},{"bodyMD5":"dcc7672defff4a40edaa41d345bff93b","definitionMD5":"7ae3285e2ad55c7b6fe6274600fc4964","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_intent jsonb","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"e60f95219aabe2f2ca2ed4346922d6ec","definitionMD5":"72856125c45f273065a4c8ca075c8a94","source":"published-reference"},{"bodyMD5":"e08b19bb97d0b56dece38ccb45f13e4a","definitionMD5":"b08e3e6608c570db021dea360413e793","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v3_capabilities(uuid)","kind":"read","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"c6d9fc0c0b62c8963ac35758a93bba6d","definitionMD5":"d5884eb7f93a96c3895883ddb59a040e","source":"published-reference"},{"bodyMD5":"02c7e27105c537f69479c71b452b9e8c","definitionMD5":"aabcc749a98abc42b7edd0b4e68b18b7","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_sync_stamper()","kind":"trigger","owner":"postgres","securityDefiner":false,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":false,"aclProfiles":["{postgres=X/postgres}","{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"],"pairs":[{"bodyMD5":"327272bd4b60d1c869558b1f4bd584fd","definitionMD5":"5004be1ada63c4fcb101dde1d24cbb2c","source":"published-reference"},{"bodyMD5":"fa45e3e11adc285d0aea62d8d8ece43b","definitionMD5":"e26ca6808eb54035f23c083ca87b53b7","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v2_grocery_stamp()","kind":"trigger","owner":"postgres","securityDefiner":false,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":false,"aclProfiles":["{postgres=X/postgres}"],"pairs":[{"bodyMD5":"612358e1c4bd661055818c36fb1479bd","definitionMD5":"b9769355fea53bd2ca1ed195c13d0d3d","source":"published-reference"},{"bodyMD5":"ed50edec2a5405ffc2695b80ddd676f4","definitionMD5":"ee36503542de1162beba0eed99ac4874","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v2_modules_stamp()","kind":"trigger","owner":"postgres","securityDefiner":false,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":false,"aclProfiles":["{postgres=X/postgres}"],"pairs":[{"bodyMD5":"5b486d3c6cdef63a32074abb1ceb9e75","definitionMD5":"943a6b127b61a0bb5e6eedfdbeb34368","source":"published-reference"},{"bodyMD5":"797d1c401fd7794e9b11346b583a00e0","definitionMD5":"af31219b7511ffc379184c68d5b4744a","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.actor_context(uuid,boolean)","kind":"context","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household uuid, p_lock boolean","anon":false,"authenticated":false,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,dobby_missions_v2_writer=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"d48e72bb46e5864d2bb39bde451da3dc","definitionMD5":"b5c7bdbecee13d0ec7151de89597be25","source":"published-reference"},{"bodyMD5":"61404767b69ee7d011abca3b12b6a33c","definitionMD5":"637e061b764e9dce6b692bb646870c36","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.is_parent(uuid)","kind":"predicate","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"38dc1537cf6c738321f205db9e27f571","definitionMD5":"b5e0f3bd223b15925c66cd2bc7f8bb25","source":"published-reference"},{"bodyMD5":"c8ffd486d81385ea26bc087b53602c95","definitionMD5":"62e96e71a893d394948bac85c11ca35a","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.can_read(uuid)","kind":"predicate","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"05141408bf4ae637b333a2e6a5aafcd2","definitionMD5":"ae09d747b76ca165bbcc0df039b18d4a","source":"published-reference"},{"bodyMD5":"b281e880ccfabd6c6a9d8e2ceb442202","definitionMD5":"1ce26b3479aea7e992d2047cecb0006b","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.legacy_unlinked()","kind":"predicate","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"0ba1cda9f3427d826d9673eec01605c8","definitionMD5":"14b41f1547e2e110b932797ac720e3c3","source":"published-reference"},{"bodyMD5":"93e44c5b1ec3ace5a6fa4cb0be835d6c","definitionMD5":"e6228c783c43d534aae7df7406f210aa","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household uuid, p_old jsonb, p_new jsonb","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"c28920c783b07efe39287d6c6fefabfd","definitionMD5":"62eb41b65d31d4df2e1a35f3c310277d","source":"published-reference"},{"bodyMD5":"02f2de08010befdde4d85ce88e13b689","definitionMD5":"16d06586efdbfe90e4b61986c37468a4","source":"ChatGPT-reported-lexical-review-20261119"}]}]'::jsonb) e,
   LATERAL jsonb_array_elements(e->'pairs') pair
  WHERE e->>'signature'=r.signature AND md5(p.prosrc)=pair->>'bodyMD5'
   AND md5(pg_get_functiondef(p.oid))=pair->>'definitionMD5')) THEN
  RAISE EXCEPTION 'Business definition/owner drift; source review required';
 END IF;
 IF EXISTS(SELECT 1 FROM access_2a_manifest WHERE kind='closed'
  AND (has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') OR has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE'))) THEN
  RAISE EXCEPTION 'Legacy Missions alias must already be closed';
 END IF;
 -- Names alone are insufficient: an unexpected overload is a new API entry.
 FOR f IN SELECT p.oid,p.oid::regprocedure::text sig,n.nspname,p.proname,p.prorettype
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') LOOP
  IF f.sig NOT IN (SELECT to_regprocedure(signature)::text FROM access_2a_manifest)
   AND f.sig NOT IN ('dobby_access_context()','dobby_access_set_status(uuid,text,bigint,uuid,boolean)','dobby_access_finalize_reactivation(uuid,bigint)')
   THEN
   RAISE EXCEPTION 'Unreviewed public routine: %',f.sig;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('v','m','f')
  AND (has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
   OR has_table_privilege('anon',c.oid,'DELETE,TRIGGER,TRUNCATE') OR has_table_privilege('authenticated',c.oid,'DELETE,TRIGGER,TRUNCATE'))) THEN
  RAISE EXCEPTION 'Exposed view/foreign relation requires separate source review';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname NOT IN
  ('dobby_sync_members','dobby_sync_grocery_items','dobby_v2_households','dobby_v2_memberships','dobby_v2_modules','dobby_v2_grocery')
  AND (has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
   OR has_table_privilege('anon',c.oid,'DELETE,TRUNCATE,TRIGGER') OR has_table_privilege('authenticated',c.oid,'DELETE,TRUNCATE,TRIGGER'))) THEN
  RAISE EXCEPTION 'Unreviewed exposed public table';
 END IF;
 FOREACH r IN ARRAY ARRAY['dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer','dobby_access_writer'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
   OR NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=r::regrole AND member=current_user::regrole AND admin_option AND NOT inherit_option AND NOT set_option)
   OR pg_has_role('anon',r,'MEMBER') OR pg_has_role('authenticated',r,'MEMBER') THEN
   RAISE EXCEPTION 'Existing closed maintenance ADMIN capability required for %',r;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('dobby_v7_private','dobby_socle_private','dobby_runes_private')
  AND (has_schema_privilege('anon',n.oid,'USAGE') AND has_function_privilege('anon',p.oid,'EXECUTE')
    OR has_schema_privilege('authenticated',n.oid,'USAGE') AND has_function_privilege('authenticated',p.oid,'EXECUTE'))
  AND p.oid NOT IN (SELECT to_regprocedure(signature) FROM access_2a_manifest)) THEN
  RAISE EXCEPTION 'Unreviewed accessible private routine';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('dobby_v7_private','dobby_socle_private','dobby_runes_private') AND c.relkind IN ('r','p','v','m','f')
  AND (has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
    OR has_table_privilege('anon',c.oid,'DELETE,TRUNCATE,TRIGGER') OR has_table_privilege('authenticated',c.oid,'DELETE,TRUNCATE,TRIGGER'))) THEN
  RAISE EXCEPTION 'Exposed private business relation';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
  AND c.relname IN ('dobby_sync_members','dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules')
  AND (has_table_privilege('authenticated',c.oid,'TRUNCATE,TRIGGER,REFERENCES')
   OR has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege('anon',c.oid,'DELETE,TRUNCATE,TRIGGER'))) THEN
  RAISE EXCEPTION 'Unexpected browser business privileges';
 END IF;
END $preflight$;

-- Temporary, existing ADMIN maintenance only; no runtime membership is added.
GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT TRUE, SET TRUE;
CREATE SCHEMA dobby_access_legacy;
REVOKE ALL ON SCHEMA dobby_access_legacy FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE,CREATE ON SCHEMA dobby_access_legacy TO dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
GRANT USAGE ON SCHEMA dobby_access_private TO dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
GRANT EXECUTE ON FUNCTION dobby_access_private.is_active(),dobby_access_private.assert_active() TO dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
CREATE TABLE dobby_access_legacy.function_backups(signature text PRIMARY KEY,definition text NOT NULL,definition_md5 text NOT NULL,owner_name name NOT NULL);
REVOKE ALL ON dobby_access_legacy.function_backups FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO dobby_access_legacy.function_backups
 SELECT m.signature,pg_get_functiondef(p.oid),md5(pg_get_functiondef(p.oid)),pg_get_userbyid(p.proowner)
 FROM access_2a_manifest m JOIN pg_proc p ON p.oid=to_regprocedure(m.signature);
CREATE TABLE dobby_access_legacy.v1_acl_backups(column_name name,grantee_name name,privilege_type text,grantable boolean);
REVOKE ALL ON dobby_access_legacy.v1_acl_backups FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO dobby_access_legacy.v1_acl_backups
 SELECT NULL,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
 WHERE c.oid='public.dobby_sync_grocery_items'::regclass AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole)
 UNION ALL
 SELECT c.attname,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a
 WHERE c.attrelid='public.dobby_sync_grocery_items'::regclass AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole);

GRANT CREATE ON SCHEMA dobby_access_private TO dobby_access_writer;
CREATE FUNCTION dobby_access_private.lock_household_creation() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid; allowed boolean;
BEGIN
 IF NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active authorized session required'; END IF;
 u:=(dobby_access_private.request_identity()->>'userId')::uuid;
 -- Exclusive from the outset: no SHARE -> UPDATE upgrade after business locks.
 SELECT can_create_household INTO allowed FROM dobby_access_private.authorizations WHERE user_id=u FOR UPDATE;
 IF NOT FOUND OR NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Authorization changed'; END IF;
 RETURN allowed;
END $$;
CREATE FUNCTION dobby_access_private.consume_household_creation() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE dobby_access_private.authorizations SET can_create_household=false
  WHERE user_id=dobby_access_private.assert_active() AND can_create_household;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Approved household quota required'; END IF;
END $$;
ALTER FUNCTION dobby_access_private.lock_household_creation() OWNER TO dobby_access_writer;
ALTER FUNCTION dobby_access_private.consume_household_creation() OWNER TO dobby_access_writer;
REVOKE ALL ON FUNCTION dobby_access_private.lock_household_creation(),dobby_access_private.consume_household_creation() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION dobby_access_private.lock_household_creation(),dobby_access_private.consume_household_creation() TO dobby_v7_writer;
REVOKE CREATE ON SCHEMA dobby_access_private FROM dobby_access_writer;

-- Keep original OIDs, ACLs, owners, defaults and RLS dependencies. Copy bodies
-- to a non-exposed schema, then replace the original body with the guard.
-- The copied bodies retain the exact native CAS/idempotence/role checks.
DO $wrap$
DECLARE m record; f record; def text; head text; legacy text; body text; args text; decl text;
BEGIN
 FOR m IN SELECT * FROM access_2a_manifest WHERE kind NOT IN ('closed','trigger','public-flags') ORDER BY signature LOOP
  SELECT p.*,n.nspname,l.lanname,pg_get_functiondef(p.oid) definition INTO f
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=to_regprocedure(m.signature);
  IF f.proretset OR f.proargmodes IS NOT NULL OR f.proargnames IS NULL AND f.pronargs>0 OR f.lanname NOT IN ('sql','plpgsql') THEN RAISE EXCEPTION 'Unsupported signature: %',m.signature; END IF;
  legacy:=format('dobby_access_legacy.%I',f.nspname||'__'||f.proname);
  def:=f.definition;
  def:=replace(def,format('FUNCTION %I.%I(',f.nspname,f.proname),'FUNCTION '||legacy||'(');
  EXECUTE def;
  EXECUTE format('ALTER FUNCTION %s(%s) OWNER TO %I',legacy,pg_get_function_identity_arguments(f.oid),pg_get_userbyid(f.proowner));
  EXECUTE format('REVOKE ALL ON FUNCTION %s(%s) FROM PUBLIC,anon,authenticated,service_role',legacy,pg_get_function_identity_arguments(f.oid));
  SELECT string_agg(format('%I',a),',') INTO args FROM unnest(f.proargnames) WITH ORDINALITY t(a,n) WHERE n<=f.pronargs;
  args:=coalesce(args,'');decl:='';
  body:=CASE m.kind
   WHEN 'predicate' THEN 'IF NOT dobby_access_private.is_active() THEN RETURN false; END IF;'
   WHEN 'preview' THEN 'IF NOT dobby_access_private.is_active() THEN RETURN jsonb_build_object(''status'',''invalid''); END IF;'
   WHEN 'context' THEN 'IF p_lock THEN PERFORM dobby_access_private.assert_active(); ELSIF NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''Active authorized session required''; END IF;'
   WHEN 'read' THEN 'IF NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''Active authorized session required''; END IF;'
   WHEN 'create' THEN 'allowed:=dobby_access_private.lock_household_creation(); IF NOT allowed AND public.dobby_v7_context()->>''phase'' IS DISTINCT FROM ''active'' THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''Owner-approved household creation required''; END IF;'
   ELSE 'PERFORM dobby_access_private.assert_active();' END;
  IF m.kind='create' THEN
   decl:='DECLARE allowed boolean; result jsonb;';
   body:=body||format(' result:=%s(%s); IF result->>''replayed'' IS DISTINCT FROM ''true'' THEN PERFORM dobby_access_private.consume_household_creation(); END IF; RETURN result;',legacy,args);
  ELSIF m.kind='preview' THEN
   decl:='DECLARE result jsonb; c jsonb;';
   body:=body||format(' c:=public.dobby_v7_context(); IF c->>''phase'' IS NULL OR c->>''phase'' NOT IN (''profile'',''household'',''active'') THEN RETURN jsonb_build_object(''status'',''invalid''); END IF; result:=%s(%s); IF c->>''phase''=''active'' AND result->''household''->>''id'' IS DISTINCT FROM c->>''householdId'' THEN RETURN jsonb_build_object(''status'',''invalid''); END IF; RETURN result;',legacy,args);
  ELSIF f.prorettype='void'::regtype THEN body:=body||format(' PERFORM %s(%s); RETURN;',legacy,args);
  ELSE body:=body||format(' RETURN %s(%s);',legacy,args); END IF;
  head:=left(f.definition,strpos(f.definition,'AS $function$')-1);
  IF head='' THEN RAISE EXCEPTION 'Unexpected function serialization'; END IF;
  head:=replace(head,'LANGUAGE sql','LANGUAGE plpgsql');
  EXECUTE head||'AS '||quote_literal(decl||' BEGIN '||body||' END')||';';
 END LOOP;
END $wrap$;

-- Read predicates use a current registry/session lookup, never a JWT status claim.
-- The native permissive AND restrictive family policies remain in place.
DO $tables$
DECLARE t text; r text;
BEGIN
 FOREACH t IN ARRAY ARRAY['dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules','dobby_sync_members'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=('public.'||t)::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'Native RLS required: %',t; END IF;
  EXECUTE format('CREATE POLICY dobby_access_active ON public.%I AS RESTRICTIVE FOR ALL TO authenticated,dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer USING(dobby_access_private.is_active()) WITH CHECK(dobby_access_private.is_active())',t);
 END LOOP;
 -- V1 has no verified canonical household mapping. Preserve data, close API.
 REVOKE ALL ON public.dobby_sync_grocery_items FROM PUBLIC,anon,authenticated;
 FOR r IN SELECT attname FROM pg_attribute WHERE attrelid='public.dobby_sync_grocery_items'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE SELECT(%I),INSERT(%I),UPDATE(%I),REFERENCES(%I) ON public.dobby_sync_grocery_items FROM PUBLIC,anon,authenticated',r,r,r,r);
 END LOOP;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_any_column_privilege(r,'public.dobby_sync_grocery_items','SELECT,INSERT,UPDATE,REFERENCES')
   OR has_table_privilege(r,'public.dobby_sync_grocery_items','DELETE,TRUNCATE,TRIGGER') THEN
   RAISE EXCEPTION 'Unexpected inherited privileges on V1 grocery; explicit ACL review required';
  END IF;
 END LOOP;
END $tables$;

-- A statement trigger runs before the executor takes any business row locks.
-- An RLS predicate/row trigger alone would be too late for this lock order.
CREATE FUNCTION dobby_access_private.guard_business_statement() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF current_user IN ('anon','authenticated','dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer') THEN
  PERFORM dobby_access_private.assert_active();
 ELSIF NOT (current_user='postgres' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper)) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unrecognized business writer';
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION dobby_access_private.guard_business_statement() FROM PUBLIC,anon,authenticated,service_role;
DO $triggers$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules','dobby_sync_members','dobby_sync_grocery_items'] LOOP
  EXECUTE format('CREATE TRIGGER dobby_access_statement_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION dobby_access_private.guard_business_statement()',t);
 END LOOP;
END $triggers$;
REVOKE CREATE ON SCHEMA dobby_access_legacy FROM dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
DO $closure$
BEGIN
 IF has_schema_privilege('anon','dobby_access_legacy','USAGE') OR has_schema_privilege('authenticated','dobby_access_legacy','USAGE')
  OR EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='dobby_access_legacy'::regnamespace
    AND (has_function_privilege('anon',oid,'EXECUTE') OR has_function_privilege('authenticated',oid,'EXECUTE'))) THEN
  RAISE EXCEPTION 'Unexpected inherited/default privileges expose native copies';
 END IF;
END $closure$;
GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT FALSE, SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;
