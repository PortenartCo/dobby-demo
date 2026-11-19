-- NO-GO SENTINEL ONLY. No mutable assembly follows this error.
-- Review source and failed local contract: docs/dobby-v7/administration-privee/lot5c/RAPPORT.md
BEGIN;
DO $lot5c_blocked$ BEGIN RAISE EXCEPTION USING ERRCODE='0A000',MESSAGE='LOT5C NO-GO: Lot3 invitation requester lock fails READ ONLY with 25006'; END $lot5c_blocked$;
COMMIT;
