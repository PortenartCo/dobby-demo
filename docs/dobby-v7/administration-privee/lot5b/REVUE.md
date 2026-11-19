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
