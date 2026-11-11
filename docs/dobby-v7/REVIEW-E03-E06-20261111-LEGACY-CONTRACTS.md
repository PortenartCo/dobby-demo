# Revue intégrée E03–E06 — Adaptation causale des contrats historiques

Date : 11 novembre 2026. Périmètre : cinq scripts de tests sous `essai-stitch-v7/tests/`. Aucun changement produit dans ce sous-lot. Référence : `REVIEW-E03-E06-20261111-SPEC.md`, §§4, 5, 8 et 10.

## Attentes effectivement invalidées et preuves RED

| Script | Attente historique | Cause vérifiée et adaptation |
|---|---|---|
| `e01-consolidation.cjs` | Une seule ligne de crédit après réouverture puis reclôture | §5 exige une annulation auditable et un nouveau gain. RED fourni par la revue : `e01-contract-red.txt`, `2 !== 1`. Vérifier désormais le solde exact 25 → 0 → 25, le gain V1 initial inchangé, l'annulation référencée et l'unique gain actif du cycle suivant. |
| `review-home-20261111.cjs` | La totalité du registre reste identique après réouverture | RED `legacy-contracts/home-red.log` : l'assertion « reopening preserves earned runes » reçoit le nouveau `review-manual~0~reversal`. Le gain V1 reste identique ; sa compensation doit être conservée. |
| `review-recurrence-20261111.cjs` | Une seule ligne après clôture, réouverture et reclôture d'une occurrence | RED `legacy-contracts/recurrence-red.log` : `3 !== 1`. Trois événements doivent subsister ; seule l'occurrence choisie porte un gain actif, sans modification du statut des autres occurrences. |
| `e03.cjs` | Le registre complet est visible avec les filtres initiaux | RED `legacy-contracts/e03-red.log` : 4 cartes contre 7. Le défaut « 7 prochains jours » demandé au §4 écarte les échéances 2027/2099. Le scénario historique du registre complet sélectionne explicitement « Toutes les missions ». |
| `integrated-preview.cjs` | La configuration de scoring de référence constitue la formulation affichée courante ; la mission sans date est immédiatement cliquable | §8 désigne le JSON applicatif comme source canonique pour la nouvelle q2. `cfg` charge désormais `../data/onboarding-scoring-v1.json`, tandis que les vecteurs QA historiques restent inchangés. La mission créée sans échéance s'édite après ouverture explicite de la section « Sans échéance reconnue » introduite au §4. |

Toutes les preuves citées sont sous `docs/dobby-v7/evidence/integrated-e03-e06-20261111/`, sauf indication contraire.

## Garanties maintenues dans les assertions

Les scénarios de runes conservent leurs fixtures historiques V1 et leurs writers natifs. L'API native existante est `DobbyFamilyMissions.summary(memberId).total`. La fonction `activeCredits` est importée du module pur canonique `family-runes-core.mjs` par les tests.

La réouverture vérifie une annulation de montant positif 25, avec une identité déterministe `missionId~0~reversal` et une référence `reverses` égale à la clé du gain V1. Le gain initial est comparé intégralement. La reclôture vérifie exactement trois lignes, la conservation intégrale des deux événements précédents et exactement un crédit actif, `missionId~1~grant`. Les rechargements préservent l'historique exact ; ils ne créent ni nouveau gain ni nouvelle annulation. Pour le contrôle de l'accueil, crédits et demandes sont comparés après rechargement.

Les contrôles métier existants restent actifs : confirmations acceptées/refusées, sources automatiques, absence de récompense automatique, compteurs, filtres statut/membre, focus, échappement HTML, éditeur et navigation clavier, persistance, suppression par conversation, panier natif unique et dédoublonné, synchronisation des vues E01/E03/E05, récurrences indépendantes, pause/reprise/arrêt, années bissextiles et rejouage mensuel.

E03 conserve les comptes du registre historique en sélectionnant l'option `all` du **select** `[data-e03-period]`. Les sections `details[data-e03-section]` sont ouvertes par leur `summary` afin que les cartes restent accessibles aux actions du scénario. Cela ne modifie pas le défaut applicatif de sept jours, contrôlé séparément par les tests dédiés de la revue.

## Borne géométrique E03

Une seconde attente historique, `cardTop < 700`, est devenue trop spécifique à l'ancienne composition dépourvue de filtre temporel. Le RED supplémentaire `legacy-contracts/e03-geometry.log` mesure à 320 px : première carte à 729,89 px, début de navigation fixe à 819 px et panneau Période de 123,5 px. La première carte offre donc encore 89,11 px dans la surface utile de l'écran de 900 px.

La vérification est désormais relative à la navigation réellement mesurée : au moins 44 px de la première carte restent visibles avant la navigation fixe. Les bornes sur le CTA, la taille tactile des filtres, leur disposition, l'absence de débordement et les actions clavier/clic restent actives. La composition E03 validée n'a pas été modifiée pour satisfaire un test. Mesures reproductibles : `legacy-contracts/e03-green/geometry-<largeur>.json` et captures `viewport-<largeur>.png`.

## Exécution et preuves

Origine locale : `http://127.0.0.1:8893`, Chromium `/usr/bin/chromium`, profils Playwright éphémères, requêtes externes bloquées. Captures et journaux sont isolés sous `legacy-contracts/` ; les captures des revues historiques ne sont pas écrasées. Deux variables de sortie ont été ajoutées aux scripts dont le chemin était figé : `DOBBY_REVIEW_HOME_EVIDENCE` et `DOBBY_REVIEW_RECURRENCE_EVIDENCE`.

| Test ciblé | Résultat |
|---|---|
| `e01-consolidation.cjs` | PASS 320, 390, 1440 ; exit 0 ; `legacy-contracts/e01-green.log` |
| `review-home-20261111.cjs` | PASS 320, 390, 1440 ; exit 0 ; `legacy-contracts/home-green.log` |
| `review-recurrence-20261111.cjs` | PASS 320, 390, 1440 ; exit 0 ; `legacy-contracts/recurrence-green.log` |
| `e03.cjs` | PASS 320, 390, 1440 ; exit 0 ; `legacy-contracts/e03-green.log` |
| `integrated-preview.cjs` | Syntaxe vérifiée ; parcours complet réservé à la campagne intégrée `ci.cjs` du coordinateur afin d'éviter une répétition. Aucune assertion de sentinelle de stockage historique n'a été retirée. |

`node --check` des cinq scripts et `git diff --check` du périmètre : PASS. Aucun commit, stage ou push réalisé dans ce sous-lot. Aucune validation serveur ou publication n'est revendiquée.
