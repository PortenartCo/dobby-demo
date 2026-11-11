# DOBBY — Consolidation exhaustive Implementation Plan

> **For agentic workers:** exécuter les lots indépendants en parallèle ; root conserve les composants communs. Revue indépendante finale du registre et des effets réels.

**Goal:** appliquer chaque arbitrage courant E01–E08 réalisable, sans modifier les écrans protégés ni anticiper E07.3/Menu/Famille ; documenter explicitement les blocages.
**Architecture:** branche intégrée a84f67a, moteurs et writers natifs existants. Catalogues de présentation partagés ; aucune nouvelle architecture ni base. Root seul responsable chrome/build/runtime et matrice ; agents propriétaires de fichiers par module.
**Tech Stack:** JS DOM/CSS et générateurs existants, Chromium/Playwright, tests Node, GitHub Pages isolé existant.
**Spec:** docs/dobby-v7/CONSOLIDATION-SPEC.md ; référentiel docs/dobby-v7/REVIEW-CONSOLIDATION.md à a84f67a.

## Global Constraints
Aucune branche source modifiée ; aucun code applicatif fusionné dans main. Aucun serveur/Supabase/SQL/donnée réelle. E03 et E08 protégés. Publier seulement le sous-arbre isolé déjà autorisé après tests ; tous les autres aperçus et arbres main préservés. Aucun DONE global si un point courant est non vérifié ou bloqué.

## Review Focus
- Rouvrir puis terminer manuel conserve un seul gain ; automatique lié à la source n'est pas réouvert en contournant une maintenance achevée.
- Dictée conserve résultats partiels/finals après pause/erreur ; callback ancien/contexte changé n'envoie rien.
- Import plage inclusive Midi/Soir ne modifie pas achats manuels ni unités incompatibles ; confirmer un ancien aperçu refuse modifications.
- Fichiers officiels sans droits et source Cheminée absente restent bloqués, jamais remplacés silencieusement par imitations.
- Démo complète crée un seul membre natif, reload/reprise/reset restent isolés des sessions réelles ; préférences uniques aussi en cérémonie.

## GATE 0
- [x] Registre entier et spécification lus, matrice JSON/MD95 lignes dont41IDs avantcode ; toutes décisions sansID gardées.
- [x] Seconde lecture de couverture par relecteur indépendant.

## Checkpoints par propriétaire
- [x] E02 (agent): chat.js/css, tests/e02-consolidation.cjs et adaptations E02. RED autosend/crop → dictée brouillon durable / envoi explicite → tests SpeechRecognition simulés, géométrie3largeurs et commandes natives → checkpoint.
- [x] E07 (agent): cuisine-list.js/cuisine-e07.js/css/cuisine.js seulement, tests ciblés de plage/fin/accords/historique ; RED bornes et manuel → API preview(E,{start,end}), confirmation conservantrange/provenance → native modèle/famille et UI3largeurs → checkpoint.
- [x] E05 (agent): magic-content.js, magic-profile.js/css, tests catalogue/profil. Catalogue4+12 partagé ; insignes SVG natifs depuis DobbyMemberAvatar.create, ledger inchangé. Droits officiels bloqués avec provenance, aucun pictogramme substitué comme conforme. Root injecte loader dans build-source.
- [x] E06 (agent): onboarding.js/css et asset/provenance substitutive du chapeau. API catalogue DobbyMagicContent.{houses,patronuses}[id].description. Mode DobbyReview local explicite, questionnaire lisible et numéro unique, résultats sans artefacts ; tests nouveau membre/dossiers4+12/confirmation/final/reload. Source Cheminée bloquée précise ; pas de faux original.
- [x] E01/E04 (agent, chrome partagé root): home.js/chrome.css et tools-register.js mission() ; rendu repasMidi/Soir avec recipeVisual existant exporté, ajoutCourses snapshot/add, confirmation/reopen natif. Suppression suggestions, Retour/X et dockMissions ; récurrences bloquées dépendance protocole natif documentée.
- [x] E08/T (root): accords documents-register.js ; img.decode avantpreuve sans redesign ; chrome.js préférences en E06 + reduced-motion et sons natifs ; build-source.cjs loaderscatalogue, sorties générées seulement après réconciliation.

## Vérification / publication / contrôle de conformité
- [x] Captures avant/après toutes corrections320/390/1440, nouveau dossier evidence/consolidation ; garder les preuves historiques.
- [x] Tester chaque checkpoint ciblé une fois, isoler/reprendre au seul échec ; campagne finale complète et CI checkpoint c147 réussies ; workflow de contrôle au SHA final configuré, conclusion à constater après le commit de clôture.
- [x] Matrice mise à jour avec preuves exactes pour chaque ligne, relecture indépendante registre → effets réels, jamais seule présence d'un bouton.
- [x] Build propre du bundle isolé, empreintes sources/fichiers testés ; mise à jour du seul dossier public existant, anciens arbres/données conservés.
- [x] Recette réelle hébergée (pas mocks), captures et octets servis comparés, rapport final avant/après/blocages/reportés/CI/commits.

## Clôture

Matrice finale : 95/95 lignes, 41 IDs ; 32 vérifiés, 4 bloqués, 5 reportés. Relecture indépendante des effets, de la matrice et des preuves finales réussie ; réserve de capture E06 levée après diagnostic causal et inspection des trois portraits réellement peints. Sept suites hébergées PASS 320/390/1440, 151 captures et 263 fichiers HTTP comparés. CI complète checkpoint c147 PASS ; le contrôle de conclusion au SHA final suit le commit de preuves et sera fourni dans la livraison, sans modifier ensuite cet artefact immuable. Aucun DONE global (dépendances bloquées explicites).
