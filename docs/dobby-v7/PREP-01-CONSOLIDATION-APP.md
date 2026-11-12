# DOBBY V7 — intégration applicative PREP-01 finale

Date : 12 novembre 2026.

## Références
- Livraison Codex finale : `bdd48612ef23b8df1072a25409f6132ddd251344`, code `8f87a9574c616c980925aeafe231f870fdabfa19`.
- Base de consolidation : `eb1ef9b3bf9746f40fdad70c4c9c8bae9fdab09e`, avec Menu/E06 et première PREP.
- Reprise des composants PREP **finaux** : writers Famille, Agenda, Courses, module JSON E09, UI et tests, références originales et preuves.
- Ancien contrôleur et tests de la PREP préliminaire retirés pour éviter deux API rivales.
- Aucun nouveau schéma, migration SQL, RLS, serveur, writer ou secret. Pas de données factices préchargées.

## Contrôles locaux sur la combinaison réelle
- 42/42 tests des writers PREP, synchronisation et Courses.
- 8/8 tests des frontières E02, E09/mémos et héritage de source (normalisation CRLF/LF uniquement, sans changer les empreintes attendues).
- 232/232 tests natifs Famille/Agenda/E09 (normalisation CRLF/LF dans le test de comparaison littérale, sans assouplir ses exceptions).
- PREP UI 320/390/1440, protocole inconnu et synchronisation HTTP A/B avec CAS et reprise : PASS.
- 20/20 E07-P02 + Cuisine E07 partagée : PASS.
- E01 390/1440, Agenda/Mémos 320/390/1440 et Menu 320/390/1440 : PASS.
- E06 accès natif avec refus de compte absent, ambigu ou hors foyer : PASS.

## Limites et validation restante
- Les anciens parcours E06 de création de membre non authentifié échouent sur le verrou parental de l’application réelle ; ils ne doivent pas justifier un contournement des autorisations.
- E06 scoring : exécutable `python3` indisponible sous Windows ; test indépendant déjà validé dans la livraison E06 précédente, non comptabilisé ici.
- L’environnement Supabase personnel DOBBY n’est pas visible par le connecteur de projets courant. Aucune recette de synchronisation réelle sur deux comptes/appareils n’a été effectuée ; les tests A/B interceptent les appels HTTP.
- Les données locales existantes doivent être préservées lors de tout déploiement. Les anciennes versions client peuvent ne pas comprendre les nouveaux champs PREP ; un retour arrière doit préserver ces registres.
- Les sources des démos publiées sont préservées. Un déploiement du code statique ne certifie ni le serveur ni les comptes réels.

## Provenance et non-régression
- Rapport Codex original : `docs/dobby-v7/PREP-01-IMPLEMENTATION.md`.
- Les différences de ligne Windows sont normalisées **avant** les contrôles à empreintes historiques, et non neutralisées par changement des empreintes.
- Les captures et contrôles originaux sont conservés dans `docs/dobby-v7/evidence/prep01/`.
