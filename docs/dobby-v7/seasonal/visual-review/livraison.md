# Livraison visuelle — PR #26

- Base CI verte : `fa37fd2967b84b2e3caf50198f75391d41370afd`.
- Source de l’aperçu : `73fbdc90cf8ad921878f0487be836209fc887631`.
- [Nouvel aperçu indépendant](https://portenartco.github.io/dobby-demo/essai-dobby-v7-seasonal-visual-73fbdc90cf8a/).
- [Manifeste de cet aperçu](https://portenartco.github.io/dobby-demo/essai-dobby-v7-seasonal-visual-73fbdc90cf8a/review-manifest.json).
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

## Vérification publique et reproductibilité

La première prévisualisation visuelle `37a83f6` a passé le parcours sur l’URL publique ; son journal historique reste disponible dans `logs/hosted-preview.log`. L’aperçu final `73fbdc9`, intégrant la correction de géométrie décrite ci-dessous, est reconstruit depuis des sources commitées et ses 353 ressources sont vérifiées localement. La vérification du déploiement public final et les CI du HEAD final sont consignées dans la PR.

La première CI du HEAD de documentation a relevé une différence de génération Tailwind : le mot anglais `inline` dans le commentaire de la bibliothèque SVG déclenchait une classe inutilisée `.inline { display: inline }`. Seul ce commentaire a été reformulé. La régénération exacte du workflow (`build-source.cjs`, `npm run build:css`, puis comparaison Git stricte de tous les fichiers générés) réussit désormais sans aucun écart. La feuille compilée attendue et les sources protégées restent intactes. [Journal de génération](logs/derivation.log). Les 14 tests transversaux ont également été relancés avec succès.

Un contrôle supplémentaire compare désormais le header de chaque fête à l’apparence native avec Décorations OFF, et pas uniquement les fêtes entre elles. Il a reproduit une différence de 1 px due à la bordure inférieure de l’habillage. La bordure a été retirée ; le test renforcé réussit aux quatre largeurs et les huit captures des saisons restent identiques. L’aperçu final `73fbdc9` contient cette correction. Le calendrier, les préférences et le constructeur sont inchangés.

Publication finale : `fc7a6eda638dca78790c2e9c98937ce9621253cd`, ajout exclusif des 354 fichiers du nouveau dossier. La précédente prévisualisation est conservée comme historique ; utiliser l’URL finale en tête de ce document.
