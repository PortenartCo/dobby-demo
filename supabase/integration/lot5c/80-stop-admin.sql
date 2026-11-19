-- NO-GO SENTINEL ONLY. No mutable assembly follows this error.
-- Local validation and rollout reservations: docs/dobby-v7/administration-privee/lot5c/RAPPORT.md
BEGIN;
DO $lot5c_blocked$ BEGIN RAISE EXCEPTION USING ERRCODE='0A000',MESSAGE='LOT5C NO-GO: hosted, Missions and restoration validations remain required'; END $lot5c_blocked$;
COMMIT;
