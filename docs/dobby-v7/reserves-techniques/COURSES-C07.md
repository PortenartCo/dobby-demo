# Courses — réserve C07

Reprise limitée à C07 depuis `main b77cb9d`, le 13 novembre 2026. La recette finale B et la clôture Stitch sont conservées ; aucune nouvelle recette générale n’a été lancée. Aucun accès Supabase distant, aucune API ni installation distante. Les seuls SQL exécutés pendant cette reprise l’ont été sur PostgreSQL standard 17.7 fictif, sans réseau ni port.

**Statut : `ATTENTE_UTILISATEUR` pour le catalogue serveur réel.** Le client et son blocage explicite étaient déjà prêts. Une lacune autonome a été démontrée dans le vérificateur SQL préparé, puis corrigée et testée. Aucune autre modification applicative ou activation de gate n’est justifiée par les éléments disponibles.

## État du client conservé

- `essai-stitch-v5-famille/family-v2.js` sonde la lisibilité de `at_home_quantity`, même si la liste est vide. Les erreurs de colonne `42703`/`PGRST204` désactivent la disponibilité partagée et la lecture ordinaire conserve les articles. Une erreur réseau ou de permissions reste une erreur ; elle n’est pas transformée en absence de colonne.
- `essai-stitch-v7/cuisine-list.js` exige `homeSupported === true` pour une déclaration partagée, utilise le writer natif avec révisions et n’enregistre pas une fausse réussite locale à la place d’une écriture refusée.
- `essai-stitch-v7/cuisine-shopping.js` conserve l’erreur réelle et le message de disponibilité indisponible dans la liste et les Paramètres. Le cœur natif conserve les valeurs en attente et les conflits de révision.
- La capacité éventuellement mémorisée autorise la file hors ligne existante ; elle ne prouve pas le schéma serveur actuel. Une erreur de synchronisation ultérieure reste visible. La sonde de lecture ne certifie ni le droit UPDATE ni les contraintes, le trigger de révision ou les RLS.

Ces points ont été rapprochés du code et des tests C07 existants (`e07-p02-home-core.test.mjs`, `e07-p02-shared-home.cjs`, `e07-p02-home-race.cjs` et `review-shopping-settings.cjs`). Ils ne motivent aucune réimplémentation ni répétition de la recette B. Les gates et writers applicatifs n’ont pas été modifiés.

## Lacune prouvée et correction

Le `02-verify.sql` préparé recherchait trois sous-chaînes dans la définition de la contrainte. Sur une table fictive, la contrainte de même nom `CHECK(at_home_quantity >= 0 OR at_home_quantity <= 999999)` acceptait `-1`, mais le vérificateur renvoyait néanmoins `availability_metadata_verified`. Le candidat d’installation conservait aussi toute contrainte de même nom sans en confirmer la définition.

Les candidats [01-install.sql](../revue-generale/supabase/shopping/01-install.sql) et [02-verify.sql](../revue-generale/supabase/shopping/02-verify.sql) exigent désormais un `CHECK` validé avec l’expression complète normalisée par PostgreSQL :

```text
((at_home_quantity >= (0)::numeric) AND (at_home_quantity <= (999999)::numeric))
```

Une définition différente, un autre type de contrainte ou `NOT VALID` provoque un refus. Aucune contrainte existante n’est supprimée, remplacée ou validée automatiquement ; aucune valeur n’est réécrite. Une expression éventuellement équivalente mais différente doit être examinée manuellement. Le résultat de vérification reste limité aux métadonnées et ne certifie pas les droits ou la sémantique du trigger.

## Preuves locales de cette reprise

Environnement vérifié : image `postgres:17.7`, `NetworkMode=none`, aucun port publié. Le nouveau test crée puis supprime une base fictive au nom unique ; il ne crée ni ne modifie de rôle global. Sa préparation de fixture n’exécute aucun ancien installateur.

| Commande | Résultat observé | Portée |
|---|---|---|
| `python3 docs/dobby-v7/revue-generale/supabase/tests/run-shopping-constraint-guard-local.py` avant correction | Échec attendu : le vérificateur ne refusait pas le `OR` acceptant `-1` | Reproduction du faux positif |
| Même commande après correction | **5 tests réussis** : refus OR/type UNIQUE/NOT VALID, acceptation canonique et répétition sans changement de valeurs, ajout de la contrainte absente | [Test ciblé](../revue-generale/supabase/tests/run-shopping-constraint-guard-local.py) sur données fictives |
| `python3 docs/dobby-v7/revue-generale/supabase/tests/run-shopping-local.py` avec les candidats amendés | **PASS** : `.001`, bornes/NaN/Infinity, CAS périmé, PATCH ancien client, réinstallation, rollback sans suppression et type incompatible | Régression limitée au candidat C07 modifié |

Ces preuves ne disent rien de la présence actuelle de la colonne sur le projet personnel. Elles ne remplacent ni le catalogue réel ni une vérification des autorisations du serveur. Aucun test physique ou navigateur général n’a été relancé.

## Action manuelle strictement conditionnelle

**Seule prochaine action initiale :** l’utilisateur exécute le [diagnostic regroupé en lecture seule](serveur/00-diagnostic-regroupe.sql) selon son [mode d’emploi](serveur/README.md). Il regroupe les métadonnées nécessaires : colonne/type/précision/défaut, contrainte exacte et validation, droits effectifs, RLS et définitions des triggers de révision. Ne pas exécuter en plus l’ancien préflight C07 par défaut et ne rejouer aucun installateur Stitch.

Après examen de cette sortie :

| Constat réel | Suite conditionnelle |
|---|---|
| Colonne, contrainte et préconditions déjà conformes | **Aucune installation C07.** Si une erreur persiste, en examiner la cause effective — permissions, cache de schéma ou transport — avant toute DDL. |
| Colonne ou contrainte absente, table existante et autres préconditions confirmées | Examiner le candidat C07 **révisé** et la sauvegarde nécessaire ; l’application ciblée reste exclusivement manuelle. Utiliser ensuite sa vérification de métadonnées, sans assimiler cette réussite à une preuve des RLS. |
| Type/échelle/défaut, contrainte, droits ou trigger incompatibles ou incertains | **Arrêt de l’installation.** Adapter une proposition à la définition réellement observée ; ne pas convertir la colonne, réécrire les disponibilités ou assouplir les RLS pour forcer le passage. |

Une éventuelle vérification fonctionnelle postérieure porterait uniquement sur C07 et les comptes/données de test autorisés ; elle n’est pas une nouvelle condition imposée à la recette finale B déjà acquise. Le [rollback préparé](../revue-generale/supabase/shopping/03-rollback.sql) conserve la colonne additive et ses valeurs ; aucune suppression de colonne n’est prévue.

Le [lot C07 existant](../revue-generale/supabase/shopping/README.md) est réutilisé. Aucun deuxième paquet de diagnostic n’a été créé. Le blocage restant concerne la connaissance et, seulement si nécessaire, l’intervention manuelle sur le serveur réel ; aucune lacune cliente supplémentaire n’a été démontrée dans ce périmètre.
