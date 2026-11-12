# Recette E05

Code fonctionnel : `3e3862e`, `9457c2d`, `15c0337` ; base E04 `8bcd49c`. Les derniers changements sont des preuves/documentation et une assertion supplémentaire du contexte de foyer dans e05-edge.

| Vérification | Résultat | Preuve |
|---|---|---|
| Natif + sync V1/V2 + modules | 80/80 PASS | [native-suite.log](native-suite.log) |
| Formulaire membre natif réel | PASS ; création/édition/refus/reload/date ancienne/extension | [native-browser.log](native-browser.log) |
| Profil E05 | PASS 320/390/1440 ; quatre thèmes | [captures](README.md), `tests/e05.cjs` |
| Catalogue/états limites | PASS ; 12 Patronus, 8 portraits, choix explicite/Retour, édition distante et changement de foyer bloqués, clavier, cinq destinations | [profile-edge.log](profile-edge.log) |
| Composition E03, aucun merge | PASS 320/390/1440 | [e03-browser.log](e03-browser.log), [composition exacte](e03-composition-files.json), [adaptations QA](e03-composition-adaptations.patch) |
| Profil E05 sur composition E03 | PASS 320/390/1440 | [e03-profile.log](e03-profile.log) |
| Régression commune | 38/38 scripts couverts, PASS après corrections ciblées ; journaux joints | [première partie](browser-first.log), [reprise après correction E01](browser-remaining.log) |
| Construction déterministe | PASS ; aucun diff de templates/racines/manifeste après reconstruction | `node essai-stitch-v7/build-source.cjs` puis `git diff --exit-code` |
| CI du SHA livré | Deux workflows à attendre après push ; liens exacts dans le bilan de livraison | GitHub Actions, branche `feat/dobby-e05-magic-profile` |

La première partie réussit neuf scripts (E05 natif/profil/limites, E04, natif Runes, interface Runes, E02, limites E02, historique/voix E02), puis échoue sur le sous-titre du portail E01. Après correction de `bridge.open`, la campagne reprend à E01 et couvre les 29 scripts restants, sans relancer localement les neuf premiers. Les tests E05 touchés par les corrections de revue ont été relancés séparément et passent.

Les échecs initiaux ne sont pas masqués : contrat HTML natif adapté à l’unique extension autorisée ; défauts de revue reproduits puis corrigés ; sous-titre E01 corrigé ; composition QA E03 conservant ses propres règles et attendant le rendu terminé. Détails dans le rapport principal.

Tous les comptes des fixtures sont `.test`, les profils sont éphémères et marqués TEST ; les requêtes métier distantes sont simulées ou bloquées. Aucun test de comptes réels/RLS ou d’intégrité serveur universelle revendiqué. Photo, rôles parentaux, compte→membre et interversions : NON LIVRÉS. Référence graphique du ZIP absent : NON VÉRIFIÉE.
