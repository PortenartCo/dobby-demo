# Inventaire vérifié — Code et risques de régression

Ce document est un raccourci de précontrôle, **pas une architecture supposée**. Codex doit regarder la révision courante de ces fichiers avant tout changement.

## GitHub au 13/11/2026

- `main`: `54d74b9448a1c518d8a3c483cd4deaea1e493748`.
- PR #13 Contrats + import IA externe **fusionnée**, PR #12 socle familial **fusionnée** ; PR #11 Famille/Runes et PR #15 recette HTTP en lecture seule encore ouvertes au dernier contrôle.
- Aucune occurrence de `AGENTS.md` dans l'arbre `main` à cet instant. Les instructions peuvent changer.

## Fichiers canoniques inspectés sur `main`

- `essai-stitch-v7/documents-register.js` : `views` inclut `documents`, `documents-1`, `document`, `document-edit`, `contracts...`; la liste documents affiche actuellement `familyDocs` (toutes les fiches) et le formulaire de recherche, un bloc de **facettes**, puis un bloc `Archives` et `scope()` « Enregistrement et partage ». Les catégories sont liées à `familyDocs` et les vrais records. Attention : les routes `contracts` sont désormais traitées par `contracts-register.js`, ne pas réactiver l'ancien contenu E08 en parallèle.
- `essai-stitch-v7/contracts-register.js` : version canonique E08, liste active et détail ; travaille avec `DobbyFamilyContracts` et `contracts-model.mjs`. Les PDF originaux et les pièces multiples sont déjà gérés ; ne pas les refondre.
- `essai-stitch-v5-famille/family-contracts.js` : writer natif des contrats ; expose `snapshot`, `save`, `attachments`, `delete`. Évite les pertes de champs et vérifie le changement de foyer/édition concurrente.
- `essai-stitch-v5-famille/family-modules.js` : DEFINITIONS : `recipes` = `customRecipes, tmAdaptations`; `house` = `houseItems, houseLogs`; `family` = `familyMembers, famContacts, famLists, familyEvents, sharedHealthVisits, sharedFamilyNotes...`; `contracts` = `familyDocs` sous forme de payload versionné. `contractMetadata()` préserve les champs JSON extensibles hors références locales. Aucun nouveau module "archives" requis si le statut vit dans les sources.
- `essai-stitch-v7/house-register.js` : fournit `views=['house','house-1','equipment','equipment-edit','maintenance','house-backup','backup']`. Les détails s'appuient sur `houseItems`, `houseLogs`, `houseDocs` ; faire évoluer ce composant avec précaution, car un **chantier Maison & Équipements** est déjà spécifié séparément.
- `essai-stitch-v7/family.js`, `family-engine.js`, `register.js` : routes/bindings, moteur natif et gardes. Éviter d'introduire une deuxième commande de sauvegarde hors du writer existant.
- `essai-stitch-v7/register-routes.json` : `documents` et `documents-1` reconnus comme routes vérifiées ; `memos` et `memo-edit` sont `verified-partial`, archivage natif **absent** d'après les notes de version. Ne pas transformer une case vide en promesse de fonctionnalité.
- `essai-stitch-v7/tests/contracts-archives-permissions.cjs`, `register-documents.cjs`, `register-documents-sync.cjs`, `register-house.cjs`, `register-navigation.cjs` : tests existants à adapter/étendre. `tests/ci.cjs` utilise `DOBBY_TEST_ORIGIN`, le serveur statique local et la suite transversale selon `ci-scope.json`.
- Workflow CI : `.github/workflows/dobby-stitch-v7.yml`. La dernière CI `main` vérifiée était verte. Un test simulé ne prouve pas les accès serveur A/B.

## Pièges à éviter

1. Supprimer les anciens boutons peut casser les tests historiques `register-documents.cjs` qui les utilisaient. **Adapter les assertions** pour valider la préservation/relocation des opérations, pas supprimer les tests.
2. Ne pas copier les pièces de contrats dans un nouveau stockage `archives` : les PDF restent dans le module Contracts et ses accès existants.
3. Ne pas supprimer les enregistrements qui n'ont jamais été archivés lorsque Archives devient une vue exclusivement archivés : les fiches autonomes existantes exigent un point d'accès conservé.
4. Ne pas archiver les logs d'entretien, reçus Runes, paiements, tâches récurrentes en changeant leur signification : l'archivage est un cycle de vie d'une **fiche**, pas une réécriture des opérations déjà effectuées.
5. Vérifier les droits enfant et le contexte du foyer **au moment du write**, pas seulement à l'affichage du bouton.
6. Ne pas passer de l'absence de preuve réelle A/B à une affirmation de sync réelle en production.
