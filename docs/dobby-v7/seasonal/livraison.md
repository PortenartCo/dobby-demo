# Livraison — Ambiances saisonnières DOBBY V7

## Révisions et périmètre

- Base vérifiée : `2f2f38b197a96ee2ae3593545f822002a452e859` (`main`, issue #21).
- Source applicative : `a81f8a6cb29a0876486ced626bb7966c6eeb0831`.
- Branche de travail : `feat/dobby-v7-seasonal-20261117` ; PR en brouillon, aucune fusion applicative.
- Publication additive de l’aperçu : `a637b8f9208a44479ccd87b82ba9d09d66cec75e` sur `main`, avec accord explicite du propriétaire. Ce commit ajoute exclusivement les 354 fichiers du répertoire `essai-dobby-v7-seasonal-a81f8a6cb29a/` ; aucun fichier antérieur modifié.
- [Aperçu interactif](https://portenartco.github.io/dobby-demo/essai-dobby-v7-seasonal-a81f8a6cb29a/) · [Manifeste](https://portenartco.github.io/dobby-demo/essai-dobby-v7-seasonal-a81f8a6cb29a/review-manifest.json) · [Construction Pages](https://github.com/PortenartCo/dobby-demo/actions/runs/44161272144).

Le volet **Revue des saisons** permet de choisir **Noël 2026**, chacune des autres périodes ou une date libre. Le bouton **Revenir à la date réelle** annule la prévisualisation. Fermer le volet laisse les contrôles habituels disponibles.

## Résultats vérifiés

| Vérification | Résultat et preuve |
| --- | --- |
| Calendrier pur | 7 tests réussis : 14 ambiances, toutes les limites fixes, fêtes mobiles 2026/2027/2028/2038/2100, bissextiles, Saint-Valentin/Carnaval, Saint-Nicolas/Thanksgiving 2024 et 2030, jours de 2000 à 2100. [Journal](evidence/logs/calendar.log) |
| Europe/Brussels | Minuit hiver/été, changement d’année, DST mars/octobre ; indépendance du fuseau local. Vérification de changement de fête par timer, sans clic ni retour d’onglet. |
| Intégration navigateur | Chromium 154 sous Linux, largeurs 320/390/768/1440 : toutes les périodes, clic traversant les décors, aucune largeur débordante, illustration inchangée, un header/dock permanent, population native bornée. [Résultats](evidence/results.json) |
| Préférences | Décorations ON par défaut ; réglages clavier et persistance après rechargement ; décorations OFF conserve l’ambiance dorée ; effets OFF et animations réduites sans animation saisonnière ; aucun son déclenché par les décorations même si Sons est ON. |
| Cycle de vie | Retour via focus/pageshow/visibilitychange, page masquée, minuit 6→7 décembre et 31 décembre→1er janvier→2 janvier, absence d’accumulation après rafraîchissements. |
| 31 janvier | Huit runes, cinq secondes maximum, une seule séquence par session/année ; rechargement sans répétition ; changement rapide d’année sans calque orphelin. |
| Hors ligne | Recalcul des dates et décors dans l’application déjà ouverte, sans transport réseau ; aucune dépendance distante ajoutée. |
| Campagne standard | `CHROMIUM_PATH=/usr/bin/chromium npm test --prefix essai-stitch-v7/tests` : code de sortie 0, `E07_P01_P02_TARGETED_CI_PASS`. Menu, Paramètres, sauvegarde, Contacts/Archives, Notes et campagne Cuisine/Courses configurée dans le dépôt. [Journal complet](evidence/logs/npm-test.log) |
| Aperçu isolé | Constructeur historique réutilisé ; test de fixture jetable réussi ; 353 ressources vérifiées par SHA-256, plus le manifeste ; namespace propre, données fictives et connexions externes bloquées. [Journal fixture](evidence/logs/preview-ci.log) |
| Artefact figé | Reconstruction sans `--allow-dirty`, `sourceState: committed`, SHA source `a81f8a6`; test du sélecteur et vérification de tous les fichiers. La date des tâches et les deux horloges restent indépendantes de la date de revue. [Journal](evidence/logs/immutable-preview.log) |
| Régénération et syntaxe | Génération native relancée, aucun écart résiduel des sources générées ; JavaScript vérifié et `git diff --check` sans erreur. |

Les tests ciblés ont précédé la campagne standard. La revue indépendante a relevé deux défauts : chevauchement du 1er décembre et nettoyage de la séquence magique entre deux années. Chacun a été reproduit par un test en échec puis corrigé et revérifié. Les tests finaux de calendrier et de l’artefact figé couvrent ces corrections ; aucun nouveau moteur métier ni préférence parallèle.

## Comparaisons et décisions

[Rapport visuel avec comparaisons à quatre largeurs](README.md#captures-comparatives). Les paires Référence/Noël utilisent la même date, les mêmes réglages Effets ON et Sons OFF, et l’illustration native. Seul le réglage Décorations diffère. Les captures supplémentaires montrent les 14 ambiances, les paramètres, les effets OFF, les animations réduites et les runes.

Saint-Valentin prévaut sur Carnaval du 12 au 14 février. Saint-Nicolas prévaut sur Thanksgiving le 1er décembre ; Thanksgiving est donc raccourci d’un jour les années où ces fenêtres se recoupent. C’est la seule exception supplémentaire nécessaire pour respecter une unique fête prioritaire et le contexte belge.

## Limites de la vérification

- Vérification sur Chromium Linux avec quatre tailles d’écran ; aucune recette physique Safari/iPhone annoncée.
- Le test hors ligne concerne l’application déjà chargée. Ce chantier ne crée pas de service worker ni de mécanisme d’installation pour garantir un premier chargement à froid sans réseau.
- La campagne standard correspond au `ci-scope.json` existant (`e07p01p02Only: true`) ; la campagne historique `test:all` n’a pas été demandée ni exécutée.
- Aucun compte familial réel, appel IA, changement Supabase ou migration. La présence des modules métier dans la démonstration ne constitue pas une nouvelle validation de leurs connexions réelles.

## Publication

Déploiement Pages terminé avec succès : run `44161272144`, commit publié `a637b8f9208a44479ccd87b82ba9d09d66cec75e`. Le manifeste servi publiquement est strictement identique au fichier local ; empreinte SHA-256 `953697f01fa9ecad89c3359083ed0a650c700ae8fe9c1228597091b30c790ef0`.

Le parcours Chromium a également réussi sur l’URL publique : choix Noël, date libre, chevauchement Saint-Valentin, bascule entre deux années magiques et nettoyage, navigation, persistance, retour à la date réelle, horloges métier inchangées et aucune erreur JavaScript. [Journal public](evidence/logs/live-preview.log).

Le code applicatif demeure sur la branche dédiée, avec PR en brouillon, jusqu’à revue de cet aperçu. Aucun fichier de l’application principale n’a été promu.
