# DOBBY E01–E08 Integrated Review Implementation Plan

> Exécution native autonome via executing-plans/TDD ; revue technique indépendante finale via requesting-code-review. Checkpoints par module, sans demande de validation intermédiaire.

**Goal:** une URL isolée regroupant les vraies pages reconstruites E01–E08 et leurs opérations, sans anciennes pages de substitution.
**Architecture:** branche d’intégration existante e0e88a0, filiation E07.2 bba5b02 conservée. Porter les modules E03/E06/E08 et leurs adaptations communes par fonctionnalité. Réutiliser le builder/enveloppe de démonstration E07.2 avec un profil de configuration distinct pour le nouveau dossier. Aucun second moteur métier, authentification fictive ou stockage applicatif supplémentaire.
**Tech Stack:** JS DOM/CSS/builders existants, moteur V5, IndexedDB/Storage natifs préfixés pour démonstration, Playwright Chromium, GitHub Pages existant.
**Spec:** docs/dobby-v7/INTEGRATED-REVIEW-SPEC.md.
**Review registry:** docs/dobby-v7/REVIEW-CONSOLIDATION.md, décisions graphiques non bloquantes gardées visibles.

## Global constraints
Ne modifier aucune branche source E03/E06/E07/E08 ; aucun merge applicatif dans main. Aucun backend/SQL/donnée réelle. Publication explicitement autorisée pour le seul nouveau dossier essai-dobby-integrated-review via Pages existant, après tests ; conserver essai-dobby-review et tous les arbres préexistants de main. Arrêter la seule publication si infrastructure/réglages requis. Distinguer UI native, fixture, aperçu fictif et production.

## Review Focus
- E06 updateMeta/connectionState ne doit pas effacer l’API grocery/list E07.2 ni ses garde-fous.
- Accès Missions réel E03, formulaire/runes E04 et profils E05/E06 : pas de retour au panneau V5 générique, pas de double writer.
- Démo personne liée explicitement fictive, comptes réels désactivés ; stockage/caches ne lisent pas les sessions d’autres aperçus.
- Reload/back/deep link et confirmation des questionnaires : contexte/membre conservé, abandons sans attribution.
- Publication : seul nouveau sous-arbre ajouté, bundle testé identique à publié, URL et vrais clics vérifiés aux trois largeurs.

## Task 1 — E03 checkpoint
- [x] RED via tests E03 contre base non intégrée.
- [x] Ajouter missions.js/css/layout et reporter petits patches build/chrome/bridge/root-adapters par fonction, conserver E07.2/E04.
- [x] Adapter seulement sélecteurs/formulaires E04 et titre court attendus dans tests E03 ; contrôle compteurs/sources de tâches/attribution/retours.
- [x] Tests E03 et création E04 ciblés PASS ; commit.

## Task 2 — E06 checkpoint
- [x] Porter fichiers neufs et références immuables E06, scoring exhaustif, brouillons, templates. Patchs communs via diff base E05 et résolution fonctionnelle.
- [x] Conserver API liste E07.2 de family-v2 ; ajouter façade Auth/metadata E06, provenance profil, retakes sans moteur parallèle.
- [x] Tests E06 calcul/identité/reprise et UI ; test E07.2 boot/modèle après API commune ; commit.

## Task 3 — E08 checkpoint
- [ ] Porter le rendu canonique contrats, image/provenance et styles scoped sans écraser chrome/family E06.
- [ ] Test E08 0/1/10/50 et test liste E07.2 ciblé ; commit.

## Task 4 — Isolated integrated preview and journeys
- [ ] Paramétrer builder/enveloppe E07.2 (defaults historiques conservés), nouveau profil et préfixe isolé, seul nouveau dossier généré.
- [ ] Persona DÉMO explicitement fictive accessible naturellement ; aucune fausse association réelle ni création/invitation simulée.
- [ ] Annoter les vues familiales non reconstruites/non validées ; conserver les contrôles indisponibles explicites.
- [ ] Tester six parcours, formulaires/CRUD/reload/history/deep links, 320/390/1440 ; sentinelles Storage/IDB E072 et réel intactes après reset, aucune mutation réseau externe.
- [ ] Registre mis à jour ; corrections graphiques complexes restent à revoir et ne retardent pas l’assemblage. Revue indépendante, une campagne générale finale adaptée + CI.
- [ ] Bundle final reproductible et manifesté, branche poussée, CI exacte SHA.

## Task 5 — Publish only the static preview
- [ ] Lire configuration Pages et parent main actuel ; snapshot arbres et empreintes HTTP existants.
- [ ] Commit statique isolé ajoutant exclusivement essai-dobby-integrated-review ; aucun fichier applicatif main modifié, aucun merge. Push normal, jamais force.
- [ ] Attendre Pages, puis URL réelle aux trois largeurs : ressources/clics/CRUD/persistance/reset/isolation. Manifestes identiques aux octets testés.
- [ ] Rapport, inventaire réel/indisponibilités, SHA/CI/URL/captures et conflits ; arrêt pour revue humaine.

## Ledger / checkpoints
- E03 RED : filtres E03 absents sur e0e88a0, test des 3/17 vrais compteurs échoue comme attendu.
- E03 conflits : build-source conserve les scripts avatars/profil E05 et le chargement cuisine-list E07.2 ; ajoute seulement layout/CSS/JS Missions. chrome conserve libellé Taverne, ajoute Missions. bridge conserve garde-fou E03 contre nettoyage des données réelles ; root-adapters délègue à DobbyMissions.
- E03 tests adaptés aux vrais radios/date E04 et au Profil E05 depuis le bouton compte (plus de panneau V5 attendu), sans retirer les assertions métier. Tests des anciens registres utilisent la carte E03 et les actions natives de synchronisation/statut quand ces contrôles n’appartiennent plus à la page de lecture E03.
- Task 1 complete: e03-counts PASS3/17, e03.cjs PASS320/390/1440, e04.cjs PASS320/390/1440. Cartouche Grimoire des Missions bas droit déjà dans la composition E03, libellé harmonisé au registre.
- E06 conflits : fusion additive dans family-v2 (grocery E07.2 conservé octet pour octet, connexion/meta E06 ajoutés), générateur garde branches E03/E07.2 et ajoute loaders/versionnements E06. Délégation de chrome à la cérémonie ajoutée après test UI rouge sur dock visible.
- Task 2 complete: E06 11/11 tests dont25 600 comparaisons Python/JS, isolation native10/10, parcours7scènes PASS320/390/1440, edge et revue causale PASS, E07.2 boot/modèle PASS. Références historiques E06 restaurées exactes depuis1a71f96 ; nouvelles captures checkpoint séparées.
