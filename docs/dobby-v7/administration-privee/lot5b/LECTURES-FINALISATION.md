# Réserves après qualification du catalogue

> La mission suivante a étudié une [alternative locale sans nouvelle délégation ADMIN V7](V7-SANS-ADMIN.md). Son verdict est BLOQUÉ ; la demande ADMIN ci-dessous reste historique et n’est pas exécutée ni relancée dans cette mission.

Les 21 divergences textuelles sont désormais identifiées et qualifiées par la preuve rapportée de ChatGPT. Les 12 références Missions sont également validées selon cette preuve. Aucune nouvelle lecture distante n’a été effectuée par CODEX. Aucun corps privé n’est publié.

## Prochaine action exacte : autorité V7

**Demande à transmettre par le propriétaire du seul projet personnel `dobby-family-sync` au canal administrateur/support Supabase légitime**, sans l’exécuter depuis CODEX :

1. Identifier le grantor ayant légitimement ADMIN sur le writer V7 et les attributions actuelles vers `postgres`, avec la requête de métadonnées [déjà préparée](LECTURES-COMPLEMENTAIRES.sql). Ne pas se contenter de CREATEROLE ou du nom d’un rôle. Confirmer les flags du writer et l’absence de chemins runtime supplémentaires.
2. Si une voie administrée supportée existe, soumettre ce **delta minimal à validation humaine** :

```sql
-- Proposition non exécutée ; délégant légitime possédant déjà ADMIN uniquement.
GRANT dobby_v7_writer TO postgres
  WITH ADMIN TRUE, INHERIT FALSE, SET FALSE;
```

3. Faire attester le résultat par une lecture de `pg_auth_members` : writer inchangé, ligne ADMIN=true/INHERIT=false/SET=false pour `postgres`, grantor identifié ; aucun accès effectif USAGE/SET résiduel par d’autres lignes/chemins. Rejouer ensuite le préflight de rôles existant et vérifier les postconditions. Aucune migration métier dans cette étape.

`postgres` ne doit pas s’auto-attribuer ADMIN sans délégant autorisé ; aucun `GRANTED BY supabase_admin`, SET ROLE géré, changement d’owner ou élargissement de privilèges de substitution. Si Supabase ne fournit aucune voie supportée, maintenir BLOQUÉ.

## Autres preuves encore nécessaires

| Point | État / prochaine preuve |
| --- | --- |
| Les 27 fonctions | Paires et attributs approuvés selon les preuves rapportées. Les six sans nouvelle définition MD5 ne sont acceptées que sous la paire publiée. Toute différence future impose une nouvelle revue. |
| Douze Missions | Présence et MD5 de définition rapportés conformes ; pas de corps privés disponibles dans la fixture CODEX. Recette intégrale BLOQUÉE, sans stub. |
| ACL stamper | Retour trigger/attache et exception EXECUTE qualifiés. Conserver les deux seuls profils approuvés. Une révocation directe optionnelle peut être soumise séparément ; ne pas révoquer une permission héritée à l’aveugle. |
| Grants Missions | Identifier les grantors. La ligne temporaire propre à postgres peut être refermée ; un grant actif d’un autre grantor ou chemin résiduel doit être refusé. |
| Auth | Visibilité effective `auth.sessions/users` du propriétaire et voie supportée encore non démontrées ; bridge candidat non raccordé. Pas de BYPASSRLS ajouté, policy Auth fictive ou rôle géré approprié. |
| Storage | Autorité owner ou délégation gérée active `supautils.policy_grants`, autres accès/locks/TEMP/helpers à démontrer. CREATE du schéma ne remplace pas cette autorité. Aucun owner, bucket, policy ou transport modifié. |
| Signatures/caches | Réserve distincte sur téléchargements et uploads déjà signés. Décision future sur extinction/invalidation/clé URL Storage et caches ; aucune opération exécutée. |
| Sauvegarde/restauration | DB et octets Storage privés, conservation du foyer et A/B, exercice de restauration, maintenance et rollback coordonné avant toute mise en service. |

Les deux fichiers SQL de lectures documentaires restent des demandes non exécutées et ne retournent ni lignes Auth/familiales/Storage ni corps de fonctions. Le premier compare les anciennes références pour diagnostic ; les candidats exécutables utilisent désormais la liste fermée des paires approuvées. La permission de lecture passée ne constitue aucune autorisation d’écriture future.
