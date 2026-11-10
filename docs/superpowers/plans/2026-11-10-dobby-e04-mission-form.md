# DOBBY E04 — Implementation Plan

> Execution native dans le worktree E04 ; la demande détaillée autorise l’implémentation sans validation intermédiaire. Aucun travail E03, aucune publication.

**Goal:** restaurer les trois panneaux du HTML Stitch « Créer et attribuer une mission » et conserver les writers DOBBY.
**Architecture:** adapter le DOM de `templates/remaining/mission-edit.html` dans `tools-register.js`, sans réécriture du template ni du formulaire natif. Styles exclusivement sous `body[data-family-view="mission-edit"]` dans `register.css`. Contrôles membres/catégories accessibles via radios sur les cartes/pastilles Stitch ; champs natifs titre/note/date conservés.
**Tech:** JavaScript DOM existant, CSS existant, Playwright/Chromium existants.
**Spec:** demande E04 fournie dans le texte utilisateur ; source `design/stitch-53/dobby_cr_er_et_attribuer_une_mission/code.html`.

## Constraints

Branche indépendante `feat/dobby-e04-mission-form`, base `9c73e845c7744315bdc7d03f59a09ae67572aa8e`. Aucun changement V5, stockage, Supabase/SQL, sources Stitch, E03 ou publication Pages. Réutiliser le writer natif et les barres E01/E02.

## Review focus

Membre absent/ancien identifiant : aucune attribution inventée, ancienne référence conservée. Brouillon après navigation : contrôles visuels synchronisés avec les valeurs natives. Dates locales : frontières de mois/année, année bissextile, DST et week-end en cours. Ancienne mission aux champs non pris en charge : modification toujours bloquée. Radios/champs accessibles à 320 px, footer de validation au-dessus de la navigation.

## 1. Restauration et parcours natifs

- [x] Capturer source et avant à 320/390/1440 ; exécuter `register-tools.cjs` sur la base.
- [x] Écrire `tests/e04.cjs` : trois panneaux numérotés, cartes réelles, options indisponibles, dates locales, création/édition/rechargement sans doublon, brouillon, garde ancien format, header/nav/retour. Constater l’échec de fidélité avant correction.
- [x] Restaurer les compositions dans `mission()` ; ne vider que la liste fictive des membres, conserver les trois sections et leurs habillages. Réutiliser le bouton doré original et la barre contextuelle commune. Adapter uniquement les sélecteurs des tests existants affectés par le remplacement du select par des cartes.
- [x] Vérifier `e04.cjs`, `register-tools.cjs`, `register-missions-sync.cjs` (HTTP simulé exclusivement). Captures après vides/préremplies aux trois largeurs.

## 2. Revue et livraison

- [x] Vérifier les autres vues de `tools-register.js` via `register-tools.cjs`, les nouvelles captures et l’absence de débordement.
- [x] Documenter fichiers, résultats et limites dans `docs/dobby-v7/E04-NOUVELLE-MISSION.md` ; aucune réévaluation des 53 sources.
- [x] Vérifier syntaxe/diff et sources protégées, commiter/pousser uniquement la branche E04 ; attendre la revue visuelle, sans fusion ni publication.
