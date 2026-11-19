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
