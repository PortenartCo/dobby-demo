-- Lecture seule, aucun fichier/personne/foyer lu ou modifié.
BEGIN TRANSACTION READ ONLY;
SELECT jsonb_pretty(jsonb_build_object('verification','dobby-socle-storage-v1','readOnly',true,'dataRowsRead',false,
 'runtimeOrRealAuthVerified',false,
 'policies',(SELECT jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'restrictive',NOT p.polpermissive,
  'roles',p.polroles,'using',pg_get_expr(p.polqual,p.polrelid),'withCheck',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname)
  FROM pg_policy p WHERE p.polrelid=to_regclass('storage.objects') AND p.polname IN
  ('dobby_socle_parent_insert','dobby_socle_parent_update','dobby_socle_parent_delete','dobby_socle_canonical_read','dobby_socle_parent_update_allow')),
 'fourRestrictiveAuthenticatedPolicies',(SELECT count(*)=4 FROM pg_policy p WHERE p.polrelid=to_regclass('storage.objects')
  AND p.polname IN ('dobby_socle_parent_insert','dobby_socle_parent_update','dobby_socle_parent_delete','dobby_socle_canonical_read')
  AND NOT p.polpermissive AND p.polroles=ARRAY['authenticated'::regrole::oid]),
 'parentUpdateAllowPolicy',(SELECT count(*)=1 FROM pg_policy p WHERE p.polrelid=to_regclass('storage.objects')
  AND p.polname='dobby_socle_parent_update_allow' AND p.polpermissive AND p.polcmd='w' AND p.polroles=ARRAY['authenticated'::regrole::oid]),
 'next','Vérifier les refus Enfant/autre foyer et succès Parent réels avant activation F09/F08.'
)) AS storage_verification;
ROLLBACK;
