# Revue des candidates indépendantes

Revue en lecture seule du code initial `cc39af0`, puis des correctifs, par un reviewer distinct. Aucun service, requête externe ou test n’a été exécuté par le reviewer ; les exécutions PostgreSQL et CI sont attribuées au coordinateur.

| Constat | Contre-épreuve | Correction / état |
| --- | --- | --- |
| Important : traverser séparément INHERIT et SET ignore SET → rôle intermédiaire → INHERIT writer | État accepté avant correction | Fermeture SET puis fermeture INHERIT depuis chaque rôle settable ; refus sans perdre le double grant propre légitime. |
| Important : membership entre readers donne les EXECUTE de l’autre malgré les ACL directes séparées | Installation acceptée avant correction | MEMBER interdit dans les deux sens, direct/indirect ; quatre montages physiques couverts. |
| Important : defaults de schéma peuvent accorder CREATE au reader | Installation acceptée avant correction | Validation nspacl : owner, USAGE seul des readers, sans grant option/CREATE/tiers. Tests sur les deux readers. |
| Complément : CREATE Auth sans USAGE restait accepté | Installation acceptée avant correction | Toute permission USAGE/CREATE Auth du reader fait refuser ce mode de bridge. |

Les trois premiers contre-tests sont dans [review-red.log](preuves/review-red.log), le complément dans [review-auth-create-red.log](preuves/review-auth-create-red.log). Après correction, [34/34 passent](preuves/final-green.log). Le reviewer a confirmé le traitement des trois importants et du complément, sans nouveau constat bloquant sur les deltas relus.

Les remarques de portée ont également été intégrées : le rollback compare ses corps et attributs explicitement listés, pas toute la définition ; RESTRICT protège les dépendances cataloguées, pas les consommateurs textuels PL/pgSQL/dynamiques. Le futur raccordement impose donc un rollback coordonné.

La revue ne juge pas les 21 corps inconnus, les droits gérés réels, supautils hébergé ni l’activation complète. Son avis favorable concerne des candidates indépendantes en brouillon, sans autorisation de fusion ou déploiement.

## Historique des exécutions locales

- RED rôles contre le contrôle historique : **6/11 passent, 5 échecs attendus** sur les autorités résiduelles. Le harnais a auparavant été ajusté pour utiliser les bons chemins et reconnaître le SQLSTATE P0001 du RAISE historique ; ces corrections de montage ne sont pas des défauts métier hébergés.
- RED du nouveau sélecteur : absence du schéma/fonction, erreur 3F000 ; aucun résultat positif simulé.
- Premier passage Auth implémenté : 13/16. Deux assertions d’introspection tentaient de résoudre Auth sous le reader qui n’a précisément pas USAGE ; la vérification est passée au rôle de contrôle fictif. Le consommateur du test de dépendance a été placé dans un schéma fictif autorisé plutôt que `public`. Aucun droit de production n’a été élargi pour corriger le test.
- Premier paquet complet : **30/30**. La revue a ensuite produit les contre-épreuves ci-dessus ; seul le passage final **34/34** est revendiqué pour le code livré après revue.
- Le premier prototype d’investigation a rencontré un démarrage transitoire du conteneur. Le harnais attend désormais PID 1 PostgreSQL et une vraie requête, avant les contrôles ; seules ses ressources possédées ont été retirées.

## Finalisation du catalogue — seconde revue indépendante

Revue en lecture seule du générateur, de sa liste fermée, des quatre artefacts et des tests. Le reviewer a comparé statiquement les 21 paires fournies, les 27 paires historiques et les 12 références Missions : aucune divergence de transcription relevée. Aucun runtime ni appel externe exécuté par ce reviewer.

Deux Important ont été reproduits puis corrigés :

- Le rollback historique conserve le propriétaire courant lors du CREATE OR REPLACE. Un transfert socle→V7 pouvait survivre à la restauration. Le contre-test échoue avant correction ; existence et propriétaire courant sont désormais contrôlés avant tout GRANT.
- Le rollback conservait aussi un EXECUTE ajouté après wrapping sur une fonction auparavant fermée. Le contre-test échoue avant correction ; le même contrôle des ACL décomposées, permissions effectives et exception du stamper est désormais réutilisé avant restauration.

Les deux corrections ont été relues : aucun Critical/Important restant dans ces deltas. Le nom du test précise désormais que ses deux paires sont celles d’un canari fictif. L’en-tête du rollback dit correctement qu’il **exige** un ingress fermé, sans prétendre le fermer lui-même.

Les preuves sont conservées dans `preuves/finalisation/`. Le premier passage élargi était à 12/13 uniquement parce qu’une assertion de message ne reconnaissait pas « Approved » alors que le SQL refusait correctement ; l’assertion a été corrigée. Le passage après correction des deux Important réussit 13/13. Le retrait de la garde Missions est exclusivement dans le test partiel, après refus du candidat complet, sans stub ni revendication de recette intégrale.

Hors preuve : comparaison lexicale hébergée rapportée, exécution des corps hébergés, recette Missions intégrale, autorité V7 distante, droits Auth/Storage réels, capacités signées et restauration hébergée. Le rollback ne détecte pas tout hotfix du corps courant et peut le remplacer par la sauvegarde approuvée : revue préalable, maintenance à ingress fermé et coordination des consommateurs obligatoires avant une future exécution validée. Avis favorable au brouillon, aucune autorisation de fusion ou mise en service.

## Alternative sans ADMIN V7 — revue du diagnostic bloqué

La revue a identifié la branche de replay sans DML, le besoin de router V7 hors de la garde statement invoker historique (sans nouveau grant V7), et l’impasse des appelants STABLE du contexte verrouillant. Les tests locaux ont confirmé cette dernière avec SQLSTATE 25006. Elle reste un défaut fonctionnel explicite du prototype, sans variante activable livrée.

Le chemin SET*→INHERIT* manqué par des tests USAGE/SET séparés a été reproduit puis refusé dans le préflight expérimental. Le RAISE 0A000 est placé après BEGIN, avant DDL, dans les deux fichiers ouvrables : l’avortement a été testé même avec ON_ERROR_STOP désactivé. Aucun flag CLI de déblocage. Les snapshots du test couvrent toutes les fonctions et ACL/memberships V7 de la fixture propre.

Les montages intermédiaires défectueux sont conservés et séparés des preuves : retrait ADMIN nécessitant CASCADE des seuls grants fictifs dépendants ; table temporaire créée par root sans droit pour postgres ; attente de deux memberships alors que le RLS natif n’en expose qu’un. Le contre-test du chemin mixte n’est probant qu’après correction du montage temporaire. Aucun droit de production n’a été élargi pour corriger ces montages.

Réserves explicites : le retour est une quarantaine partielle conservant le défaut READ ONLY ; les droits induits par DEFAULT PRIVILEGES inattendus ne sont pas couverts par l’invariant de seules fonctions V7 ; aucune preuve hébergée/HTTP ou Missions intégrale ajoutée. La piste USAGE/EXECUTE sur une nouvelle garde privée exige une exception utilisateur au périmètre de privilèges V7 et n’est pas appliquée.

La relecture finale n’identifie aucun Critical/Important empêchant **la livraison diagnostique BLOQUÉE uniquement**. L’en-tête généré a été précisé « BLOCKED EXPERIMENT / diagnostic only ». Aucun runtime ni appel externe exécuté par le reviewer, aucun avis d’activation, fusion ou déploiement.

## Correction 25006 — garde privée directe

Nouvelle revue indépendante en lecture seule du candidat/générateur, journal, préflight, rollback et tests. Le périmètre autorise désormais les deux nouveaux droits USAGE/EXECUTE sur la garde dédiée. Le reviewer n’a exécuté aucun runtime ni appel externe.

Trois Important et un complément ont donné des contre-épreuves locales :

- Le rollback ne vérifiait pas l’activation RLS/owner des six tables. RLS désactivée, il acceptait le retrait et un profil non autorisé retournait un foyer dans la transaction fictive. Contrôle owner/RLS/absence d’héritage ajouté avant mutation et après retrait ; état FORCE également photographié.
- Le writer d’administration pouvait hériter de V7 pendant son ouverture temporaire. Le préflight l’acceptait. Le contrôle partagé d’isolation transitive le refuse désormais avant toute ouverture.
- Un couplage SOCLE → intermédiaire → V7 ajouté après installation échappait au snapshot des seules attributions directes V7. Le rollback l’acceptait. Même contrôle MEMBER transitif à l’installation et au rollback, y compris pour les rôles clients et les autres writers.
- Complément : journal privé sans réattestation RLS/ACL. Contrôle owner postgres, RLS activée, FORCE désactivé, ACL table/colonnes strictes avant confiance dans ses sept snapshots.

[RED de revue](preuves/v7-garde-directe/v7-direct-review-red.log) : 3 groupes, 1 succès et 2 échecs réels avant correction ; quatre dérives acceptées dans le groupe rollback. [Après correction](preuves/v7-garde-directe/v7-direct-after-review.log) puis [final local](preuves/v7-garde-directe/v7-direct-final-local.log) : 23/23. Les quatre dérives sont refusées avant mutation, le quota/replay et les lectures restent fonctionnels. Le reviewer a relu les correctifs : aucun Critical/Important restant dans les deltas relus. Deux assertions supplémentaires (collision d’idempotence 22023 et profil autorisé HTTP) ont ensuite été ajoutées, sans changement SQL.

Le premier RED de cette mission reproduit 25006 avec une attente de lecture réussie. Le premier passage implémenté avait 7/15 réussis et 8 échecs : les OID JSON revenaient en texte et l’assertion attendait des nombres ; l’assertion corrigée n’a élargi aucun droit SQL. Les échecs suivants de ce passage dépendaient de la préparation interrompue. Les journaux intermédiaires sont conservés, sans les attribuer au code final.

L’avis concerne la faisabilité locale et le retrait complet **de la nouvelle garde**, avec fences false et socle Lot 2A conservés. Il ne vaut ni désinstallation totale du dispositif, ni preuve des définitions/permissions hébergées ou des douze corps privés Missions, ni autorisation de bascule.
