# Checkpoint B — diagnostic regroupé du socle familial

**Une seule exécution manuelle, aucune installation.** Ce paquet concerne exclusivement `dobby-family-sync`. Il prépare C07, M06/M07/M08 et S10/F08/F09 à partir du catalogue réellement installé. Les droits, tables et fonctions ne sont pas modifiés.

## Fichier à exécuter

1. Ouvrir le **SQL Editor du projet familial `dobby-family-sync`**, vérifier le projet sélectionné.
2. Copier **tout** [00-diagnostic-socle.sql](00-diagnostic-socle.sql), puis **Run**. Aucune valeur n'est à remplacer.
3. Le résultat attendu est **une cellule JSON `socle_diagnostic`**. Copier son contenu complet, plutôt qu'une capture tronquée. Si nécessaire, utiliser l'export des résultats proposé par le SQL Editor et conserver le fichier en privé. Transmettre le résultat complet dans la conversation privée de travail, ou l'erreur exacte.

Le fichier ouvre une transaction `READ ONLY`, exécute un seul `SELECT` de catalogue, puis termine par `ROLLBACK`. Il ne lit aucune ligne de compte, de foyer, de profil, d'invitation, de ledger, de reçu ou de secret ; aucun RPC métier n'est appelé. Le choix du projet est une vérification manuelle : le nom de la base Supabase ne permet pas à ce SQL de garantir le projet sélectionné.

**Ne relancer aucun ancien script Stitch 01, 04, 06 ou 11. Ne lancer ni `roles-01-apply.sql`, ni l'installation Courses à ce stade.** Les opérations réussies et les deux comptes/foyers actuels restent conservés. Aucun réglage Dashboard supplémentaire n'est demandé.

## Résultat attendu et confidentialité

| Champ de la cellule | Résultat / usage |
|---|---|
| `diagnostic` | `dobby-v7-family-core-checkpoint-b-v1` |
| `transactionReadOnly` | `on` |
| `applicationRowsRead` | `false` |
| `noMigrationPerformed` | `true` |
| `realAuthRlsRpcOrBrowserVerified` | `false` : l'observation ne certifie pas un parcours réel. |
| `shoppingCatalog` | Présence/type/défaut exacts de `at_home_quantity`, contraintes, trigger de révision et son corps, grants table/colonne, RLS. Une colonne absente est un résultat utile, pas une erreur à réparer immédiatement. |
| `missionsCatalog` | Writer V2 et éventuel V3, helpers privés, structure/contraintes/index des reçus, triggers, ACL/RLS, rôles fermés et dépendances. |
| `familyRolesCatalog` | Modèle des liens canoniques et rôles, RPC privilégiées, RLS, propriétaires, droits de maintenance PG17, options ADMIN/INHERIT/SET. Il ne relit pas les données familiales déjà vérifiées. |
| `missionsFunctionSourcesConfidential` | Corps techniques installés nécessaires pour adapter le writer V3 sans inventer les helpers privés manquants. |
| `familyFunctionSourcesConfidential` | Corps techniques DOBBY et dépendances personnalisées nécessaires pour les droits et invitations enfant. Les corps des schémas gérés Auth/Storage et des extensions sont exclus. |

**Tout le résultat brut est technique et confidentiel**, y compris les corps de triggers, expressions de policies et noms de rôles SQL. Aucun résultat brut dans Git public, PR, issue, journal de CI ou capture publiée. Le SQL ne demande aucune clé ni donnée familiale ; si du code installé contient exceptionnellement une valeur secrète en dur, la retirer avant transmission et signaler seulement la présence d'une valeur masquée. Ne transmettre aucun mot de passe, jeton d'invitation, clé secrète ou `service_role`.

Les limites de `pg_depend` sont explicites : les références textuelles PL/pgSQL et SQL dynamique ne sont pas toutes cataloguées. C'est pourquoi les corps privés existants sont indispensables. Une propriété de schéma ou `CREATEROLE` ne garantit pas le droit de remplacer une fonction d'un writer fermé ; aucune solution de maintenance n'est présumée.

## Suite conditionnelle, après analyse du retour

- **Courses :** réutiliser [le lot existant](../../revue-generale/supabase/shopping/README.md). Si la colonne et son contrat complet sont compatibles, **aucune réinstallation**. Sinon préparer seulement l'intervention indispensable. Le comportement réel du trigger et les refus Enfant/inter-foyers restent à vérifier, même si les métadonnées paraissent bonnes.
- **Missions et rôles :** adapter le SQL V3 et les RPC/RLS au vrai modèle, préserver tout le ledger/crédit et les fonctions déjà réparées, tester localement avec données fictives et rôles fermés. Fournir installation, vérification et retour arrière séparés. Aucun événement V3 au writer V2.
- **Enfant :** invitation ciblée au même `member_id` TEXT, sans duplication, migration de crédits ou promotion par l'âge. Le bouton reste fermé avant preuve serveur réelle.
- Attendre les résultats d'installation/vérification utilisateur et la recette serveur pertinente avant d'activer les capacités correspondantes dans le client.

Le diagnostic et sa validation locale sont **CODE_DÉVELOPPÉ / TESTS_PASS** dans le périmètre décrit par [VALIDATION-LOCALE.md](VALIDATION-LOCALE.md). Les migrations V3/F08/F09 et l'installation réelle C07 restent **BLOQUÉES par le retour du catalogue** ; elles ne sont ni appliquées ni opérationnelles par la présence de ce paquet. Voir [la matrice des dix réserves](../MATRICE-RESERVES.md).
