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
