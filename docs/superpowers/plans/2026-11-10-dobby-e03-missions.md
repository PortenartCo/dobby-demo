# DOBBY E03 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans in this isolated worktree.

**Goal:** Finaliser la Bibliothèque selon les décisions E03 fournies.
**Architecture:** Présentation Missions dédiée, appelée par `root-adapters.js`. Lire exclusivement les collections natives ; utiliser les liens Stitch existants pour création/modification/source. Conserver chrome.js et le formulaire actuel.
**Tech Stack:** JavaScript DOM, CSS, Playwright/Chromium.
**Spec:** `docs/dobby-v7/plans/E03-SPEC.md` (instruction d'exécution autonome, décisions graphiques déjà validées).

## Global Constraints
- Worktree `/workspace/dobby-e03`, branche `feat/dobby-e03-missions`, base immuable `258b0f923491b03d78c72ba1b1edd29ab72e6a84`.
- Aucune fusion, publication, intégration PR #3, modification V5/source Stitch/formulaire ou donnée familiale réelle.
- Réutiliser header/navigation E01/E02 et writers natifs ; aucune migration ou synchronisation ajoutée.

## Review Focus
- Date absente/invalide : aucune urgence inventée ; calcul selon jour civil local.
- Ancien responsable inconnu : référence conservée et accessible via Non attribuées/ancien membre.
- Automatique obsolète : exclue ; source disparue : consultation en lecture seule.
- Rafraîchissement natif : conserver filtres et focus, actualiser compteurs.
- Titres longs et caractères HTML : texte échappé, aucune injection ni débordement.

### Task 1: Présentation et navigation E03
**Files:** créer `essai-stitch-v7/missions.js`, `missions.css`, `tests/e03.cjs`; modifier uniquement `missions.html`, fonction missions de `root-adapters.js`.
**Interfaces:** `DobbyMissions.render(data)` consomme manualMissions/autoTasks/familyMembers/houseItems/familyDocs ; aucune écriture.
- [ ] Écrire les assertions navigateur (quatre filtres, compteurs croisés, carte lien entier, source automatique, création propre/save/retour, rechargement, géométrie et barres communes).
- [ ] Exécuter et constater les échecs des comportements absents.
- [ ] Garder illustration Stitch, hero compact/badge inférieur/titre/CTA, supprimer citation/note/sceau ; rendre filtres et cartes compactes, répartition par membre et Non attribuées.
- [ ] Exécuter tests E03 aux 320/390/1440 et captures source/avant/après.
- [ ] Commit présentation/tests.

### Task 2: Contrats et non-régression
**Files:** adapter tests historiques root Missions aux nouvelles actions accessibles ; ajouter `e03.cjs` à la CI, rapport `docs/dobby-v7/E03-MISSIONS.md`.
**Interfaces:** formulaire Stitch inchangé ; tests de clôture via actions natives existantes et E01, suppression E02.
- [ ] Mettre à jour assertions historiques supprimées par décision E03 (boutons sur cartes).
- [ ] Une passe CI pertinente E01/E02/lot 5 ; conserver logs et décrire toute limite.
- [ ] Revue du diff, contrôle des fichiers interdits et changements E02 distants sans rebase.
- [ ] Commit preuves et rapport ; arrêt, sans push/PR/déploiement.
