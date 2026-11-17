# Livraison visuelle — PR #26

- Base CI verte : `fa37fd2967b84b2e3caf50198f75391d41370afd`.
- Source de l’aperçu : `37a83f687826899c1d635b15392cbd9757f582f5`.
- [Nouvel aperçu indépendant](https://portenartco.github.io/dobby-demo/essai-dobby-v7-seasonal-visual-37a83f687826/).
- [Manifeste de cet aperçu](https://portenartco.github.io/dobby-demo/essai-dobby-v7-seasonal-visual-37a83f687826/review-manifest.json).
- [PR #26 — conserver en brouillon](https://github.com/PortenartCo/dobby-demo/pull/26).

Ouvrir « Revue des saisons », choisir Noël 2026, Halloween ou Nouvel An, puis refermer le volet. Paramètres > Ambiance magique permet de désactiver les animations tout en gardant le décor, ou de retirer intégralement les décorations.

[Comparaisons avant/après](README.md) : quatre événements à 320/390/768/1440, versions sans badge, huit comparaisons saisonnières identiques et captures des autres fêtes.

Les tests ciblés existants ont été exécutés avant les modifications. Les tests visuels ont d’abord échoué sur l’absence de SVG structuré, puis réussi après l’habillage. Le contrôle supplémentaire de typographie saisonnière a également été observé en échec avant correction. Les 14 tests transversaux réussissent sans changement de leurs assertions ni des manifestes historiques.

La campagne standard configurée est exécutée après intégration. Les résultats sont consignés dans `logs/`, et les deux CI push/pull request du HEAD final sont suivies jusqu’à leur résultat final dans la PR. La publication ajoute exclusivement un nouveau dossier d’aperçu ; les fichiers de l’application principale et les aperçus précédents ne sont pas remplacés.

## Récupération de l’environnement

L’exécuteur a perdu sa liaison pendant le dernier parcours de la campagne standard locale. Le disque et les deux worktrees ont été retrouvés intacts ; les commits `37a83f6` et `c1962f6` ont été exportés dans un bundle Git complet, restaurés dans un dépôt de vérification et contrôlés par `git fsck`. Les fichiers non commités et les journaux ont été archivés séparément (194 fichiers de travail). Aucune réinitialisation ni suppression n’a été nécessaire.

Le journal local montre la réussite des tests saisonniers, visuels, Menu, Paramètres, Contacts/Archives, Notes et des parcours Cuisine/Courses jusqu’au test de course partagé. Le dernier script interrompu est repris séparément ; la campagne complète est ensuite vérifiée par les workflows du nouveau HEAD. Le journal interrompu n’est pas présenté comme une commande ayant terminé avec un code de sortie 0.

La publication préparée `c1962f63b2e82fb124074c1770decbddbe198476` ajoute uniquement les 354 fichiers de `essai-dobby-v7-seasonal-visual-37a83f687826/` à `main`. Aucun fichier applicatif antérieur n’est modifié. Les nouvelles ressources de décor sont intégralement dans les deux fichiers JS/CSS existants, environ 9,5 Kio compressés ensemble.

Reprise ciblée : `CHROMIUM_PATH=/usr/bin/chromium node essai-stitch-v7/tests/e07-p02-shared-home.cjs` — code de sortie 0, `CUISINE_SHARED_HOME_PASS`. [Journal](logs/resumed-shared-home.log).
