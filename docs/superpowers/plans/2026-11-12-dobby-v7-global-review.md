# DOBBY V7 Global Review Implementation Plan

**Goal:** intégrer E01–E09 et publier puis vérifier un unique aperçu fictif GitHub Pages.
**Architecture:** base E07 c510ded, réconciliation séquentielle des commits E09 et Runes, génération canonique. Le client familial natif conserve ses writers; un transport HTTP fictif local sérialise les échanges A/B sans serveur réel.
**Tech Stack:** JavaScript natif, Node, Playwright/Chromium, GitHub Pages.
**Spec:** docs/dobby-v7/MISSION-GLOBALE-20261112.md (instruction complète utilisateur, exécution et publication autorisées sans nouvelle validation de conception).

## Contraintes globales
- Branche feat/dobby-v7-global-review-20261112; ne modifier aucune source distante ni autre aperçu.
- Aucun SQL, aucune écriture Supabase, aucune authentification réelle, aucun appel IA payant.
- Publication limitée à essai-dobby-v7-global-review-20261112/ sur main, sans fusion applicative.
- Writers, champs inconnus, historiques, CAS, conflits et reprise préservés; ressources dérivées régénérées.

## Revue ciblée
- Collision E09/Missions/Runes dans family-modules: état inconnu et historique conservés.
- Clients A/B en concurrence: gain unique, conflit explicite, reprise hors ligne.
- Reset: aucun stockage ni base des autres aperçus effacés.
- Navigation/rechargement: persona et contexte conservés, panier unique.
- Petits écrans: dock/header visibles, formulaires utilisables sans débordement.

## Tâche 1 — Sources consolidées (root)
- [x] Relever tous les HEAD et comparer aux SHA fournis; consigner les écarts.
- [x] Intégrer séquentiellement E09 puis les seuls commits Runes nécessaires après audit d’ascendance; documenter chaque conflit réel.
- [x] Régénérer build-source/build-family et vérifier les diffs dérivés.
- [x] Exécuter tests natifs family/sync, E09 memos, runes et E07-P01/P02 pertinents.

## Tâche 2 — Aperçu global isolé (agent harness)
Fichiers créés: scripts/build-dobby-global-review.cjs, scripts/review/global-config.js, scripts/review/global-demo.js, essai-stitch-v7/tests/global-build.test.cjs.
Interface: node scripts/build-dobby-global-review.cjs --output <nouveau dossier>; manifest sourceSha + SHA256 de tous les fichiers; DobbyGlobalDemo expose sync/reset/ready/clients fictifs.
- [x] Adapter le builder existant sans writer métier supplémentaire; source propre obligatoire pour publication.
- [x] Config fictive E01–E09, préfixe exclusif et transport simulé A/B pour Courses/Runes/Mémos.
- [x] Réutiliser tests isolation/CAS et ajouter seulement preuves des nouvelles garanties.

## Tâche 3 — Recette et revue (root + agent tests)
- [x] Parcours transversal réel Chromium: membre → mission attribuée/terminée → gain unique → profil → repas → ingrédients → disponibilité → événement → mémo.
- [x] Tester A/B, attente/conflit/reprise, reset/stockage, navigation/historique et rechargement.
- [x] Captures 320/390/1440 et contrôle formulaires/header/dock/défilement.
- [x] Une campagne globale finale DOBBY_FINAL=1, puis revue indépendante du diff.

## Tâche 4 — Publication vérifiée (root)
- [x] Commit source, worktree propre, bundle/manifeste reproductible puis CI source vérifiée.
- [x] Checkout publication isolé depuis HEAD main actuel; ajouter seulement nouveau dossier, commit/push sans force.
- [x] Vérifier Pages puis toutes les empreintes HTTP et recette Chromium hébergée.
- [x] Rapport docs/dobby-v7/REVIEW-GLOBALE-20261112.md avec URL, SHA, CI, captures, anomalies P0–P3 et réserves Safari/Supabase.

## Journal
- 2026-11-12: mission explicite fournit choix d’architecture, base, périmètre et autorisation de publication; aucune clarification nécessaire.
- HEAD Courses final a avancé dbb61df→f31659e: uniquement documentation et preuves hébergées, aucun delta applicatif.

- Sources intégrées : E09 a4adc45, Runes990c486 (deltas821acbf/ed1585f/fff0c8e/f1aff5a; aucun SQL). Génération canonique/CSS sans écart.
- Revue native indépendante990c486 : aucun défaut actionnable; 186 tests + trois writers/presets Chromium réussis.
- Builder global8982c83 : complet286 fichiers, préfixe A/B et domaine .invalid; config agenda696b5df.
- Recette locale globale1650d15 : 320/390/1440 réussis; reprise, CAS, A/B, gain unique et réseau isolé.
- Revue harness : P1 reset incomplet (pièces jointes/timers/backups). Correction déléguée avec reproduction native houseStore/houseRead et régression dédiée; publication bloquée jusqu’à vert.
- CI43130740616 sync réussie. CI43130740640 échec historique e01-consolidation (compteur de crédits antérieur aux compensations); adaptation des assertions sous contrôle exact de l’historique/net, campagne finale après corrections.

## Résultat final vérifié

- Source propre `6a6fcd9bcee522da7342de391e5c3d7bfe1955b3`, branche `feat/dobby-v7-global-review-20261112`.
- Raccord E02 découvert lors du contrôle complémentaire : lecture/ajout via la liste native partagée, entrée directe avant E07, sans writer ni stockage supplémentaire. RED/GREEN et revue indépendante sans constat substantiel.
- CI applicative `43145552456` réussie : les 62 checkpoints historiques ont été réellement relancés et réussis, ainsi que tous les parcours globaux/historique/reset. Aucune réutilisation historique pour ce correctif natif. CI sync `43145553693` réussie sur le même SHA.
- Première publication `9625705` puis mise à jour finale `bce17c82ef42fefb2790203a19732665f8c8203d` : dossier statique neuf uniquement, 287 ajouts cumulés ; dernier commit limité à deux fichiers de ce dossier.
- Pages construit sur `bce17c8` ; 287 ressources publiques HTTP200 et empreintes conformes au manifeste `1575b76e2f4d271224afb6b293e36920533445ab1d3dae10c5a7d2ec7a105a5e`.
- Chromium156 hébergé : 320/390/1440 réussis, E02 natif partagé, parcours transversal, A/B, hors ligne, CAS, navigation, reset approfondi et six captures après décodage. Zéro erreur navigateur/console, requête externe, écriture réseau réelle ou ressource manquante.
- Rapport final et preuves : `docs/dobby-v7/REVIEW-GLOBALE-20261112.md`. Réserves P2/P3, synchronisation fictive, Supabase et Safari/iPhone explicitement distingués.
