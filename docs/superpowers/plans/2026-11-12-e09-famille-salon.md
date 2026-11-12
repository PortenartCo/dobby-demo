# E09 Salon et mémos familiaux — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Exécution autonome déjà autorisée dans le cahier des charges.

**Goal:** Consolider le Salon, partager les nouveaux mémos et livrer un aperçu isolé.
**Architecture:** Adapter la composition au rendu dans family.js, réutiliser les formulaires de family-register.js. Le registre sharedFamilyNotes et son marqueur familyNotesVersion appartiennent au payload family et utilisent sa révision CAS, ses sauvegardes et son choix de conflit. familyNotes reste privé. Les champs familiaux inconnus sont conservés et une disparition du protocole détectée bloque la synchronisation.
**Tech Stack:** JavaScript natif, Node test, Chromium/Playwright, générateur DOBBY et GitHub Pages existants.
**Spec:** docs/superpowers/specs/2026-11-12-e09-famille-salon.md

## Global Constraints
- Base 69ef361ad139356c2d1473d825f9231e7610b0e4 ; branche feat/dobby-e09-famille-salon-20261112, worktree indépendant.
- Aucun SQL, compte réel, autre module ou maquette Stitch modifié. Aucun merge applicatif.
- Archives et sauvegardes accessibles par le menu existant. Trois sous-pages conservées pour revue ultérieure.
- Aperçu dans un nouveau dossier seulement, stockage préfixé et réseau externe bloqué.

## Review Focus
- Ancien client : perte du nouveau champ détectée par client ayant une copie ; impossibilité de l'interdire côté serveur sans migration, explicitement documentée.
- Écriture réseau en vol : une édition locale plus récente doit rester en attente.
- Activation/reprise hors ligne : préserver les mémos non envoyés et tous les autres champs family.
- Import répété ou simultané : identité déterministe et aucun effacement des locaux.
- Formulaire périmé : empêcher de sauver/supprimer une ancienne version sans avertissement.

### Task 1: Interface (checkpoint A)
**Files:** family.js, family.css (essai-stitch-v7).
- [x] Retirer l'encart long, garder illustration 220px et déplacer son badge.
- [x] Recomposer exactement trois sections, titres Taverne, sous-titres/boutons, états vides Accueil ; retirer les accès redondants après rendu dynamique.
- [x] Vérifier Chromium 320/390/1440 et menu archives/sauvegardes ; commit isolé.

### Task 2: Mémos (checkpoint B)
**Files:** essai-stitch-v5-famille/family-modules.js, tests/family-notes-sync.test.mjs ; essai-stitch-v7/family-engine.js, family-register.js, tests/e09-family.cjs.
**Interfaces:** facade saveSharedMemo(id,values,expected), deleteSharedMemo(id,expected), importLocalMemo(id) ; registre sharedFamilyNotes, version 1.
- [x] Tests RED : CRUD interclients, conflit, hors ligne/reprise, activation avec mémos en attente, payload ancien/inconnu, ancien client, CAS en compétition et édition pendant PATCH.
- [x] Ajouter préservation et validation du protocole uniquement dans les chemins family ; garder la logique des autres modules.
- [x] Raccorder création/modification/suppression au registre partagé ; anciens mémos en section locale avec import explicite et idempotent, snapshots pour formulaires périmés.
- [x] Tests GREEN ciblés et régressions du mécanisme modules ; commit isolé.

### Task 3: Aperçu (checkpoint C)
**Files:** scripts/build-dobby-review.cjs, scripts/review/e09-config.js, tests/e09-preview.test.cjs et preuves E09.
- [x] Étendre le générateur existant avec profil e09, entrée Salon, préfixe unique, données fictives explicites.
- [x] Contrôle visuel et trois parcours sur source et bundle ; revue de branche séparée.
- [x] Commits/push branche ; génération depuis source committée ; publication du seul nouveau dossier via la procédure Pages existante, en préservant le main actuel.
- [x] Vérifier HTTP/manifeste, aperçu hébergé et isolation ; consigner URL, SHAs, fichiers, résultats, limites et chevauchement family-modules.js.
