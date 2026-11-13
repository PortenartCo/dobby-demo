# C07 — disponibilité à domicile : intervention adaptée au catalogue reçu

Le diagnostic familial reçu confirme que `at_home_quantity` est **absente**. Le lot Courses déjà livré convient : aucune copie ni nouvelle version de sa migration n'est nécessaire. Son installation réelle reste à effectuer personnellement par l'utilisateur, dans le seul projet `dobby-family-sync`, selon l'ordre du [lot serveur regroupé](../README.md). Aucun SQL distant n'a été exécuté par Codex.

## Décision et conservation des données

Le catalogue observé contient la table native `public.dobby_v2_grocery`, sa quantité `numeric(12,2)` nullable, ses indicateurs d'achat, révisions, tombstones et reçus d'import. `authenticated` possède SELECT/INSERT/UPDATE sur toute la table : aucun grant de colonne supplémentaire n'est nécessaire pour ce lot. La fonction `public.dobby_v2_grocery_stamp()` est invoker ; elle protège `id`, `household_id` et `import_source_id`, préserve `created_at`, augmente la révision sur tout UPDATE et renseigne `updated_by` via `auth.uid()`. La migration Courses ne la remplace pas.

L'ajout est uniquement `at_home_quantity numeric NOT NULL DEFAULT 0`, **sans échelle fixe** : `0.001 kg` reste exact. Les anciennes lignes commencent à zéro dans ce nouveau champ ; achats, quantités natives, unités, dates, révisions, reçus et états hors ligne sont conservés. La plage autorisée est 0–999999, hors NaN et infinis. Elle n'impose pas de lien à `quantity` : un ancien client peut réduire la quantité en omettant la disponibilité, sans la perdre.

Les politiques Courses observées contrôlent uniquement l'appartenance V2 active. Elles **ne suffisent pas pour les droits Enfant F09**. Le correctif de droits du lot regroupé et sa vérification doivent donc accompagner ce lot ; ne pas installer le candidat provisoire `roles-01-apply.sql`. Les contrôles visuels et transport Enfant existants ne remplacent pas les refus serveur.

L'ordre prévu est **Famille puis Courses** : [family/01-install-family.sql](../family/01-install-family.sql) apporte le helper canonique `dobby_socle_private.is_parent(household_id)` et les politiques restrictives `dobby_socle_parent_insert/update/delete` sur les Courses. Elles s'ajoutent aux politiques d'appartenance, sans changer le stamp. Les politiques Storage font l'objet d'une étape Famille distincte ; F09 global ne sera pas annoncé validé avant leurs propres vérifications. La notice du lot regroupé fixe l'ordre complet et les résultats à transmettre ensemble.

## Fichiers exacts, sans valeur à remplacer

Les liens suivants ciblent le dossier **`revue-generale/supabase/shopping/`**, et non les anciens scripts Stitch. Ne relancer aucun `stitch19-20/supabase/01`, `04`, `06` ou `11`.

| Opération | Fichier à utiliser | Résultat attendu |
|---|---|---|
| Installation additive Courses, lorsque le lot regroupé est prêt | [01-install.sql existant](../../../revue-generale/supabase/shopping/01-install.sql) | Transaction terminée sans erreur ; le schéma PostgREST est rechargé. Aucune ligne de résultat n'est exigée. |
| Vérification existante des métadonnées | [02-verify.sql existant](../../../revue-generale/supabase/shopping/02-verify.sql) | `availability_metadata_verified`. Ce résultat seul ne certifie pas les droits ni le trigger à l'exécution. |
| Vérification ciblée du catalogue constaté | [04-verify-catalog.sql](04-verify-catalog.sql) | Une cellule JSON `shopping_verification`, avec `catalogContractPassed: true`. `realRuntimeAndAuthorizationVerified` reste `false`. |
| Retour arrière conservant les valeurs | [03-rollback.sql existant](../../../revue-generale/supabase/shopping/03-rollback.sql) | `rollback_application_only_keep_availability_data` ; rétablir le client précédent testé et conserver la colonne additive. |

Conserver une sauvegarde préalable selon la procédure habituelle du projet. Le préflight regroupé déjà reçu remplace une répétition inutile de l'ancien préflight Courses ; vérifier seulement qu'aucune autre intervention n'a changé le contrat depuis ce retour. Si la colonne apparaît entre-temps et que son contrat complet est conforme, **ne pas relancer l'installation**. En cas de type, défaut, contrainte ou droit différent, arrêter le lot et transmettre l'erreur exacte : ne pas convertir, supprimer ou remplir les valeurs pour contourner le refus.

Le nouveau fichier `04` lit exclusivement le catalogue dans une transaction `READ ONLY`, puis `ROLLBACK`. Il ne touche ni aux comptes ni aux articles. Il vérifie le contrat ajouté, la conservation du type natif, de la PK et du reçu d'import, le trigger examiné et les droits de lecture/écriture du rôle applicatif. Il ne simule pas de JWT et ne modifie aucune ligne. Tout résultat catalogue reste dans la conversation de travail ; ne publier aucun retour technique brut dans le dépôt public.

## Vérification runtime et recette réelle

Un UPDATE de contrôle n'est **pas** une opération en lecture seule, même terminé par `ROLLBACK`. Les essais SQL de précision, révision et compatibilité sont donc limités à une fixture locale isolée contenant des comptes, foyers et articles fictifs. Aucun script de création de données de test, de reset ou d'UPDATE d'articles réels n'est demandé dans le SQL Editor familial.

Après installation et vérifications du lot serveur, recharger les clients. La sonde native doit confirmer la colonne ; seule son absence `42703`/`PGRST204` désactive cette capacité, tandis qu'un refus de permission ou une panne réseau reste une erreur visible. Une présence de colonne ne prouve pas à elle seule les droits F09.

La synchronisation ordinaire A/B a déjà été validée ; la recette restante porte sur la disponibilité :

1. Dans le foyer actuel, A déclare 200 g disponibles pour un besoin de 500 g ; B voit maison 200 / reste 300. Corriger puis annuler ; « tout disponible » ne coche pas l'article et ne crée aucun achat.
2. Vérifier la précision `0.001 kg`, les unités compatibles, le rechargement puis la reprise hors ligne/reconnexion. Deux déclarations concurrentes doivent demander une résolution explicite et conserver la dernière version serveur jusqu'à ce choix.
3. Réimporter un plat et son dessert : aucun doublon ni reçu perdu. Un client antérieur omettant `at_home_quantity` conserve sa valeur. Les suppressions/clôtures d'achats suivent le contrat existant.
4. Avec les contrôles serveur du lot F09, vérifier qu'un Enfant lit les Courses mais ne peut ni créer, modifier, cocher, supprimer, importer ni déclarer une disponibilité, même par appel direct. Un compte d'un autre foyer ne peut ni lire ni écrire ces articles. Un refus ne doit changer aucune révision.

La présence du code et les tests locaux ne valent pas `RECETTE_RÉELLE_VALIDÉE`. C07 reste en attente des résultats d'installation/vérification utilisateur, des refus F09/inter-foyers et de cette recette ciblée.

## Validation locale ciblée

Le candidat existant `01`, sa vérification `02`, le nouveau `04` et le retour `03` ont passé les contrôles sur une **copie locale fictive du catalogue réellement reçu**, PostgreSQL 17.7, réseau `none`, aucun port publié. L'installation et les vérifications reproduisent le rôle SQL Editor `postgres` non superuser, propriétaire de la table. Les tests runtime sont exécutés séparément par l'administrateur de la fixture et terminés par `ROLLBACK` ; ils ne prouvent pas les autorisations Auth/RLS.

Les [preuves structurées](evidence/local-c07.json) enregistrent les empreintes des fichiers exacts : anciennes valeurs natives inchangées, défaut zéro, `.001`, révision CAS, ancien PATCH omettant la colonne, bornes, identité du reçu, absence de faux achat et maintien de la colonne au retour applicatif. Le [scénario runtime](tests/local-only-runtime.sql) est **réservé à cette fixture locale**, jamais au projet familial. La dépendance d'accès au schéma du propriétaire Auth géré a été rétablie dans la fixture seulement ; aucune correction correspondante n'est demandée en production. La baseline partagée et les rôles globaux n'ont pas été modifiés par les tests Courses. Aucune ancienne campagne complète n'a été relancée.

## Retour arrière

Utiliser uniquement [03-rollback.sql](../../../revue-generale/supabase/shopping/03-rollback.sql) et le retour applicatif décrit ci-dessus. **Ne pas supprimer `at_home_quantity`** : cela détruirait les déclarations enregistrées et pourrait invalider des queues hors ligne. Les anciens PATCH omettent ce champ et en conservent la valeur. Un échec d'installation avant COMMIT annule sa transaction complète. Le rollback du lot F09 est distinct et suit sa propre notice ; ne pas réouvrir les droits Enfant implicitement pour revenir au client précédent.
