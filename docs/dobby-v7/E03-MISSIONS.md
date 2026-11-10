# E03 — Bibliothèque des Missions

Branche GitHub : [`feat/dobby-e03-missions`](https://github.com/PortenartCo/dobby-demo/tree/feat/dobby-e03-missions). Worktree : `/workspace/dobby-e03`, dépôt bare séparé `/workspace/dobby-e03-repo.git`.
Base initiale : `258b0f923491b03d78c72ba1b1edd29ab72e6a84`. Base après raccordement : `9c73e845c7744315bdc7d03f59a09ae67572aa8e` (E02 final de la PR #3, ouverte et non fusionnée). La CI [42727078167](https://github.com/PortenartCo/dobby-demo/actions/runs/42727078167) est réussie ; l'exécution parallèle [42727070298](https://github.com/PortenartCo/dobby-demo/actions/runs/42727070298) avait échoué sur une mesure prématurée du panneau compte E01.

## Correctif graphique final après revue humaine

Base vérifiée : `9aaeaa1cfcc47e3b337492d5bdeb7390fdc7a1fb`, branche distante et worktree propres, sans évolution concurrente E03. Travail E04 laissé dans son environnement indépendant.

Le cadre de `.e03-hero` se termine désormais sous l'illustration. Le titre complet et le bouton de création sont dans une section sœur `.e03-hero-copy`, sans fond, bordure ou encadrement commun avec l'image. Image, cadrage (`50% 35%`), proportions et hauteur de scène (160 px) inchangés ; badge conservé. Espacement entre cadre et bloc titre/action : 18 px. Le sous-titre permanent affiche uniquement sur Missions « MAISON & QUOTIDIEN · MISSIONS » ; les libellés, dimensions et commandes E01/E02 restent identiques.

Fichiers produit : `missions-layout.html`, `missions.css`, `missions.html` régénéré, une ligne conditionnelle dans `chrome.js`. Générateur `build-source.cjs` inchangé et réutilisé. Adaptation des seules attentes du libellé Missions dans les tests existants `tests/e03.cjs` et `tests/e01.cjs` (navigation commune). Aucun changement métier, carte, filtre, writer, formulaire, Supabase, SQL ou source Stitch.

Tests existants E03 PASS à 320/390/1440 ; vérification rapide de géométrie/absence de débordement et comparaison des barres/sous-titres E01/E02 PASS aux trois largeurs. Test E01 de navigation/préférences PASS à 390/1440 après adaptation de cette attente. Journaux : `evidence/e03/visual-final/tests.txt`, `geometry.txt`, `e01-tests.txt`. Captures E03 actualisées ci-dessous ; références avant correctif et captures de comparaison E01/E02 dans `evidence/e03/visual-final/`. Aucun écart visuel résiduel identifié ; Safari physique non testé. Résultat/lien de la CI du SHA final dans la livraison.

## Résultat

- Header/navigation : composants communs `DobbyChrome`, cinq destinations, Missions active ; mêmes dimensions E01. Préférences étoile/son natives persistées et profil natif accessibles.
- Illustration bibliothèque Stitch conservée (`essai-v6-preview/assets/v6/missions.png`), visage/buste visibles, scène 160 px, badge inférieur unique « Grimoire des missions ». Titre et CTA conservés ; citation, signature, Note du Maître et sceau supprimés.
- À faire par défaut, Toutes, Urgentes, Terminées : grille 2 × 2, compteurs calculés sur les missions réelles du membre sélectionné. Urgence = mission ouverte dont la date civile valide est antérieure ou égale au jour local. Aucune priorité ajoutée.
- Cartes compactes : titre, responsable, date, statut ; lien entier vers `famille.html#mission-edit?record=…` pour les manuelles. Automatiques explicitement distinguées, liens vers équipement/document existant, consultation seule si source indisponible. Automatiques obsolètes exclues.
- Répartition : membres natifs et avatars, nombre réel de missions ouvertes ; « Toute la maisonnée » et « Non attribuées / ancien membre » gardent toutes les missions accessibles.
- CTA direct vers `famille.html#mission-edit`, sans identifiant ni ancienne saisie ; formulaire/writers actuels conservés.

## Fichiers

Produit : `essai-stitch-v7/missions.html`, `missions.js`, `missions.css`, fonction `missions(d)` dans `root-adapters.js` ; correction strictement nécessaire de `bridge.js` pour que son nettoyage des anciennes maquettes ne supprime plus de vrais compteurs/titres E03.

Tests : `tests/e03.cjs`, `tests/e03-counts.cjs`, `tests/ci.cjs`, `tests/register-tools.cjs`, `tests/register-missions-sync.cjs`. Les tests historiques de gros boutons retirés utilisent les mêmes actions natives ; les tests E03 couvrent leur parcours utilisateur depuis E01/E02.

`chrome.js` : seule adaptation du sous-titre de Missions (voir correctif visuel ci-dessous). Aucun changement dans `chrome.css`, `tools-register.js`, les formulaires/templates Stitch, E01/E02, V5, les HTML originaux ou SQL.

## Vérifications

Profils Playwright temporaires, réseau externe bloqué, aucune donnée familiale réelle ni compte réel utilisé. Chromium aux 320, 390 et 1440 px ; aucun test Safari/iPhone physique.

`e03.cjs` : page vide ; ouvertes/terminées/urgentes ; échéance future/absente/invalide ; affectations et ancien membre ; filtres croisés/compteurs ; rafraîchissement avec conservation des filtres ; carte au clavier ; création propre ; modification préremplie ; sauvegarde/retour/rechargement sans doublon ; sources automatiques et source supprimée ; clôture E01 et suppression E02 visibles dans Missions ; compte, préférences et barres ; contenu final accessible au-dessus de la navigation et absence de débordement horizontal.

`e03-counts.cjs` : 3 urgentes / 17 missions réelles ne masquent jamais les filtres ; un titre commençant par « Sceau de protection locale » ne supprime pas la liste. Ce défaut a été reproduit avant sa correction dans le nettoyage historique commun.

Tous les contrôles ciblés et de non-régression passent après reprise et relance ciblée. Voir `evidence/e03/test-regression.txt`, `test-regression-final.txt` et `test-register-tools-final.txt`. La première invocation `npm test` a passé E03, E02 et E01, puis s'est arrêtée car `smoke.cjs` utilisait un chemin Chrome Windows par défaut. La reprise définit explicitement `CHROMIUM_PATH=/usr/bin/chromium`. Les parcours Missions et E01/E02 sont revérifiés après la correction commune ; les suites restantes sont exécutées une fois. La continuation signale un échec de `register-tools.cjs` : son adaptation cherchait une case native absente de la vue utilisée. Le test a été corrigé pour utiliser le même événement natif qu’E01 puis relancé seul : `REGISTER_TOOLS_PASS 320/390`. Aucun échec restant. Les autres contrôles n’ont pas été relancés après ce changement limité au test.

CI distante E03 : workflow existant [Dobby V7 — Stitch functional UI](https://github.com/PortenartCo/dobby-demo/actions/workflows/dobby-stitch-v7.yml?query=branch%3Afeat%2Fdobby-e03-missions), déclenché par push de la branche E03. Le SHA final, le résultat et le lien de son exécution sont fournis dans le compte rendu de livraison. Aucune draft PR requise pour déclencher ce workflow. Aucun workflow ajouté.

## Captures comparatives

| Largeur | Source Stitch | Avant E03 | Résultat | État vide | Formulaire existant |
| --- | --- | --- | --- | --- | --- |
| 320 | [Source](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/source-320.png) | [Avant](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/before-320.png) | [Missions](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/open-320.png) | [Vide](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/empty-320.png) | [Formulaire](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/existing-form-320.png) |
| 390 | [Source](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/source-390.png) | [Avant](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/before-390.png) | [Missions](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/open-390.png) | [Vide](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/empty-390.png) | [Formulaire](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/existing-form-390.png) |
| 1440 | [Source](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/source-1440.png) | [Avant](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/before-1440.png) | [Missions](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/open-1440.png) | [Vide](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/empty-1440.png) | [Formulaire](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/existing-form-1440.png) |

Captures additionnelles : `done-*`, `urgent-alice-*`, `automatic-readonly-*`, `viewport-*`. Aux 1440 px, conserver le cadre 480 px des pages E01/E02 est intentionnel. Les originaux sont servis avec leurs styles/polices/illustration locales pour rendre la comparaison possible sans dépendance CDN ; ils ne sont pas modifiés.

## Revue et limites

Revue indépendante en lecture seule : deux défauts importants de nettoyage historique détectés, corrigés et couverts par régression (compteurs et titre de mission). Date, échappement, responsables disparus, automatiques obsolètes et liens sources vérifiés.

Limite existante du formulaire : il offre actuellement enregistrement et annulation, sans commandes Terminer/Supprimer. E03 n'ajoute aucune commande au formulaire conformément à l'interdiction explicite. Clôture par E01 et suppression avec confirmation par E02 vérifiées ; attribution/modification restent dans le formulaire actuel.

Point mineur différé : un rafraîchissement natif remplace les cartes, ce qui peut perdre le focus d'une carte et refermer une consultation automatique. Le focus des filtres est conservé. Les cartes restent des liens HTML et les consultations des éléments `details/summary` utilisables au clavier.

## Raccordement à E02 final

Le worktree était propre et contenait exactement trois commits E03. Rebase sans conflit sur `9c73e845c7744315bdc7d03f59a09ae67572aa8e`. `git range-diff` confirme les trois changements logiques identiques : `1438fa1` → `9f5a9db`, `4971dce` → `3d1f59d`, `b19a904` → `cf91b4e`.

Contrôle `bridge.js` : fichier identique entre la base initiale et E02 final ; seul ajout E03 = sortie du nettoyage de démonstration lorsque `currentScreen === 'missions'` et que `[data-e03-filters]` existe. Les parcours E01/E02 conservent leur code. Tests ciblés existants après rebase : `e03-counts.cjs`, `e03.cjs`, `e01.cjs`, `e02.cjs` ; résultat dans `evidence/e03/test-integration.txt`.

Correction causale du contrat CI : `build-source.cjs` régénérait l'ancienne page Missions, faisant échouer le contrôle existant de reproductibilité. Il reprend maintenant `missions-layout.html`, extrait sans modification de la composition E03 déjà validée, et recharge les mêmes CSS/JS Missions. Le HTML régénéré est strictement identique à celui d'E03 ; aucune modification de la maquette. Les autres fichiers générés sont inchangés. Les trois captures `open-320/390/1440.png` existent et sont conservées : les fichiers runtime E03 sont identiques avant/après rebase et reconstruction. Pas de nouvelle campagne fonctionnelle ni de nouveaux visuels.

Formulaire « Ajouter une mission », `tools-register.js`, templates, V5, sources originales, E01/E02, writers natifs, SQL et Supabase : aucun changement E03 par rapport à E02 final. Aucun accès au worktree ou aux fichiers non commités des autres sessions.

La branche E03 seule est poussée, sans force-push. Pages reste configuré sur `main` ; aucune publication d'application, aucune fusion et aucune modification de la branche de PR #3. Arrêt après vérifications Git/CI et accès aux captures ; revue visuelle humaine avant publication.
