# Reprise locale — Lot 2A

Base : PR #28, `f91dfde4972b20dcc5b7364d6017e56ee8a5ead9`. Branche : `feat/dobby-private-access-lot2a-20261117`. Lire les limites du [rapport](RAPPORT.md) avant toute extrapolation à l'hébergement.

## Rejouer les preuves

Prérequis : Node.js 24 (version exécutée : 24.19.0), Docker local disponible sur `/var/run/docker.sock`, image PostgreSQL 17.7 déjà en cache au digest fixé par `tests/private-access/local-db.mjs`. Le harnais utilise `--pull=never`, `--network none`, aucun port, aucun bind mount et un volume de données tmpfs ; il ne lit aucun `.env`, fichier de credentials Supabase ou projet lié. Il supprime seulement son propre conteneur à la fin. Ne pas utiliser `supabase db push`, `db reset` ou un ancien installateur pour ces tests.

Depuis la racine du worktree :

```bash
mkdir -p /tmp/dobby-lot2a-evidence
DOBBY_EVIDENCE_DIR=/tmp/dobby-lot2a-evidence node --test tests/private-access/lot2a/*.test.mjs
node --test tests/private-access/admission.test.mjs tests/private-access/reactivation-boundary.test.mjs
node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs
git diff --check
```

Les identités de test ont exclusivement des UUID réservés au harnais et des adresses `example.invalid`. Les deux parents fictifs ne sont pas les vrais comptes familiaux. Le contexte de claims est injecté dans PostgreSQL sans prétendre simuler une session HTTP vérifiée.

Le test catalogue reconstitue uniquement les définitions SQL pertinentes, refuse les entrées inconnues, applique la **nouvelle** migration, exécute le rollback puis la réapplique. Les autres tests utilisent une base indépendante et testent les refus et parcours actifs. Aucune intervention manuelle sur des comptes n'est nécessaire.

## Migrations candidates

- [Migration Lot 2A](../../../../supabase/migrations/20261117215619_dobby_private_access_tables_rpc.sql).
- [Rollback Lot 2A](../../../../supabase/rollbacks/20261117215619_dobby_private_access_tables_rpc.sql).
- La migration du Lot 1 reste inchangée. Son amorçage et ses droits de sessions sont réutilisés uniquement dans les fixtures locales.

Avant une exécution hébergée, une mission distincte devra comparer le catalogue complet et les empreintes privées, confirmer que les schémas internes ne sont pas exposés par PostgREST, résoudre les dépendances Missions manquantes et vérifier les capacités de maintenance réellement disponibles. Le préflight refuse les corps/propriétaires/configurations inattendus et les rôles ouverts ; ne pas le contourner en modifiant les empreintes sans revue.

## Rollback / interruption

1. En local, laisser le test catalogue exécuter le script de rollback et vérifier l'égalité des données, définitions, policies et privilèges effectifs.
2. Pour l'hébergement, obtenir une validation distincte et fermer l'entrée de l'application avant toute restauration : retirer Lot 2A rouvre les chemins natifs. Aucune recette hébergée n'est autorisée par ce document.
3. Le script vérifie les sauvegardes, restaure les corps sur leurs OID existants et les ACL V1 sauvegardées, retire les seuls objets ajoutés par Lot 2A avec `RESTRICT`, referme INHERIT/SET, puis notifie le cache de schéma. Pas de suppression de données métier, de décisions ou de migration Lot 1.
4. Si sauvegarde absente/modifiée, dépendance inattendue ou privilège insuffisant : rollback de transaction et arrêt ; conserver le refus et reprendre depuis le catalogue privé vérifié. Aucun `CASCADE`, ajout BYPASSRLS ou octroi général sur Auth.

Un compte suspendu conserve ses liaisons familiales et ses données. Pour les futurs essais d'administration, réactiver via les deux phases du Lot 1 dans des transactions distinctes, puis créer une nouvelle session fictive ; ne pas effacer le seuil de session pour faire passer un test.
