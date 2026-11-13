# DOBBY V7 revue générale — Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development or executing-plans for independent lots.

**Goal:** corriger les 60 exigences sans régression, publier les corrections vérifiées et isoler les opérations serveur non validées.
**Architecture:** conserver les moteurs V5 natifs et adaptateurs V7 ; aucun catalogue/writer de substitution. Les nouvelles relations sont additives et les fonctions serveur non vérifiées restent indisponibles.
**Tech Stack:** JavaScript modules natifs, HTML/CSS dérivés reproductibles, Node tests, Playwright/Chromium, GitHub Actions/Pages.
**Spec:** `docs/dobby-v7/revue-generale/01_PROMPT_CODEX.md` et `02_REGISTRE_RECETTE.md`.

## Global Constraints
- Aucun accès ni changement distant Supabase ; aucun appel indirect depuis les tests ou la recette hébergée.
- Préserver données, fonctionnalités natives et historique ; aucun compte/membre/foyer fictif en production.
- Tests/captures largeurs 320,390,768,1024,1440,1920 ; cas erreur et reprise proportionnels.
- Aucune sollicitation utilisateur. Déploiement autorisé après contrôles CI/concurrence/livraison précédente.

## Review Focus
- Micro relâché avant autorisation : aucun démarrage tardif, arrêt sur cancel/blur.
- Récompense zéro/partage impair/double clic et occurrences : total unique, pas de clones.
- Dessert/planning/convives : modification ciblée, recette originale et plat conservés.
- Quantités maison : jamais comptées achetées, erreurs de synchronisation visibles.
- Identité enfant/animal : aucun droit partagé ajouté sans preuve serveur, même profil lors du rattachement ultérieur.

## Lots et vérification
- [x] A : inspecter SHA, précédente mission, CI/Pages ; 28 tests baseline accès/E06 et audit statique 78 ressources.
- [ ] B : D/N/H, conserver la structure et préférences natives ; tests hold/cancel/permissions, dock/scroll aux six largeurs, événement via writer natif.
- [ ] C : M01–M09, outils natifs et cartes ; tests wizard/rewards/dates/participants/idempotence/récurrence, garde partagé.
- [ ] D1 : T01–T13, cuisine native et catalogue unique ; tests onglets, repas jour/semaine, dessert, fin cuisson.
- [ ] D2 : C01–C07, module shopping extrait si utile ; tests compteur/modal/quantités/conflits, options Settings ; SQL manuel.
- [ ] E : F01–F10, accords exclusifs et fiches ; tests invariants personne/animal/droits/événement-préparation ; protocole manuel.
- [ ] F : revue indépendante de la branche, génération reproductible, suites natives/browser/CI complètes, correctifs des échecs réels.
- [ ] G : push candidat, attendre CI ; revérifier concurrence/main/livraison précédente ; PR/fusion SHA attendu ; observer Pages/CI et comparer octets hébergés + parcours sans Supabase.
- [ ] H : rapport exhaustif une ligne par ID et actions manuelles groupées ; statuts de production distincts des fixtures.

Les agents commitent leurs fichiers propres ; intégration partagée et génération séquentielles par le contrôleur. Le rapport et les preuves constituent le journal de reprise.
