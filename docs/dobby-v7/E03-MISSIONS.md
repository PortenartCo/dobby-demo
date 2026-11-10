# E03 — Bibliothèque des Missions

Branche locale : `feat/dobby-e03-missions`. Worktree : `/workspace/dobby-e03`, dépôt bare séparé `/workspace/dobby-e03-repo.git`.
Base figée : `258b0f923491b03d78c72ba1b1edd29ab72e6a84` (référence fournie et tête de PR #3 à l'ouverture). La CI [42727078167](https://github.com/PortenartCo/dobby-demo/actions/runs/42727078167) est réussie ; l'exécution parallèle [42727070298](https://github.com/PortenartCo/dobby-demo/actions/runs/42727070298) avait échoué sur une mesure prématurée du panneau compte E01.

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

Aucun changement dans `chrome.js`, `chrome.css`, `tools-register.js`, les formulaires/templates Stitch, E01/E02, V5, les HTML originaux ou SQL.

## Vérifications

Profils Playwright temporaires, réseau externe bloqué, aucune donnée familiale réelle ni compte réel utilisé. Chromium aux 320, 390 et 1440 px ; aucun test Safari/iPhone physique.

`e03.cjs` : page vide ; ouvertes/terminées/urgentes ; échéance future/absente/invalide ; affectations et ancien membre ; filtres croisés/compteurs ; rafraîchissement avec conservation des filtres ; carte au clavier ; création propre ; modification préremplie ; sauvegarde/retour/rechargement sans doublon ; sources automatiques et source supprimée ; clôture E01 et suppression E02 visibles dans Missions ; compte, préférences et barres ; contenu final accessible au-dessus de la navigation et absence de débordement horizontal.

`e03-counts.cjs` : 3 urgentes / 17 missions réelles ne masquent jamais les filtres ; un titre commençant par « Sceau de protection locale » ne supprime pas la liste. Ce défaut a été reproduit avant sa correction dans le nettoyage historique commun.

Tous les contrôles ciblés et de non-régression passent après reprise et relance ciblée. Voir `evidence/e03/test-regression.txt`, `test-regression-final.txt` et `test-register-tools-final.txt`. La première invocation `npm test` a passé E03, E02 et E01, puis s'est arrêtée car `smoke.cjs` utilisait un chemin Chrome Windows par défaut. La reprise définit explicitement `CHROMIUM_PATH=/usr/bin/chromium`. Les parcours Missions et E01/E02 sont revérifiés après la correction commune ; les suites restantes sont exécutées une fois. La continuation signale un échec de `register-tools.cjs` : son adaptation cherchait une case native absente de la vue utilisée. Le test a été corrigé pour utiliser le même événement natif qu’E01 puis relancé seul : `REGISTER_TOOLS_PASS 320/390`. Aucun échec restant. Les autres contrôles n’ont pas été relancés après ce changement limité au test.

CI distante E03 : non lancée (branche non poussée, aucune PR E03 ouverte). Les résultats locaux ne sont pas présentés comme une CI GitHub.

## Captures comparatives

| Largeur | Source Stitch | Avant E03 | Résultat | État vide | Formulaire existant |
| --- | --- | --- | --- | --- | --- |
| 320 | [Source](evidence/e03/source-320.png) | [Avant](evidence/e03/before-320.png) | [Missions](evidence/e03/open-320.png) | [Vide](evidence/e03/empty-320.png) | [Formulaire](evidence/e03/existing-form-320.png) |
| 390 | [Source](evidence/e03/source-390.png) | [Avant](evidence/e03/before-390.png) | [Missions](evidence/e03/open-390.png) | [Vide](evidence/e03/empty-390.png) | [Formulaire](evidence/e03/existing-form-390.png) |
| 1440 | [Source](evidence/e03/source-1440.png) | [Avant](evidence/e03/before-1440.png) | [Missions](evidence/e03/open-1440.png) | [Vide](evidence/e03/empty-1440.png) | [Formulaire](evidence/e03/existing-form-1440.png) |

Captures additionnelles : `done-*`, `urgent-alice-*`, `automatic-readonly-*`, `viewport-*`. Aux 1440 px, conserver le cadre 480 px des pages E01/E02 est intentionnel. Les originaux sont servis avec leurs styles/polices/illustration locales pour rendre la comparaison possible sans dépendance CDN ; ils ne sont pas modifiés.

## Revue et limites

Revue indépendante en lecture seule : deux défauts importants de nettoyage historique détectés, corrigés et couverts par régression (compteurs et titre de mission). Date, échappement, responsables disparus, automatiques obsolètes et liens sources vérifiés.

Limite existante du formulaire : il offre actuellement enregistrement et annulation, sans commandes Terminer/Supprimer. E03 n'ajoute aucune commande au formulaire conformément à l'interdiction explicite. Clôture par E01 et suppression avec confirmation par E02 vérifiées ; attribution/modification restent dans le formulaire actuel.

Point mineur différé : un rafraîchissement natif remplace les cartes, ce qui peut perdre le focus d'une carte et refermer une consultation automatique. Le focus des filtres est conservé. Les cartes restent des liens HTML et les consultations des éléments `details/summary` utilisables au clavier.

## Coexistence E02

Au contrôle intermédiaire, E02 avait avancé à `6c667cebc5f786e5c99c64b8d20008638891c849` : modifications de `tests/e01.cjs` et des documents E02, sans recouvrement avec les fichiers E03. Aucun rebase/cherry-pick/intégration effectué. Le futur rapprochement devra préserver ce correctif E01 ; un nouveau changement E02 de `bridge.js`, `root-adapters.js` ou `tests/ci.cjs` nécessiterait une revue de l'intégration.

**Aucune fusion, publication, mise en production, modification de PR #3, migration, modification du formulaire Ajouter une mission, ni accès au répertoire ou aux changements non commités de l'autre session. Arrêt après E03, revue humaine avant publication.**
