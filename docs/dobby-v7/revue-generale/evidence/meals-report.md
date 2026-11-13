# DOBBY V7 — lot repas, recettes et desserts

Base `b327aa5`, worktree partagé isolé `/workspace/dobby-v7-review`. Baseline avant code : `/workspace/dobby-meals-baseline.md`. Aucun accès ni changement Supabase distant, aucun push/merge/déploiement effectué par ce lot.

## Résultat par identifiant

Les statuts ci-dessous qualifient le code local et ses fixtures natives ; ils ne certifient pas les comptes ni la synchronisation réelle. Commit repas : `3196d28` (`Consolidate native Tavern meals and independent desserts`), 14 fichiers détenus uniquement.

| ID | Statut | Fichiers | Test concret / preuve | Réserve / étape humaine |
|---|---|---|---|---|
| T01 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine.js, cuisine-e07.js, cuisine-p01.css | v7-meals-ui : 2 tabs exacts, Repas défaut, un panneau par route ; captures 320/390/768/1024/1440/1920 | Publication à intégrer par root |
| T02 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-e07.js | v7-meals-ui : aucune carte courses dans Taverne ; native-actions et P02 conservent imports | Courses migrées par lot shopping |
| T03 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-e07.js, cuisine-e074.js, cuisine.js | Jour ouvre directement cook, choix explicite plat/dessert, absence cook-mode-btn de fiche | Recette réelle familiale non testée |
| T04 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-e07.js, cuisine-engine.js | P01 : rejet/acceptation confirmation déplacement et annulation, cascade native, snapshots périmés rejetés | Aucun effacement recette |
| T05 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-e07.js, cuisine-p01.js | P01/Taverne : créneau vide choisir, enregistrement et reload natif | Réutilise planSelectedMeal |
| T06 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-e07.js | v7-meals-ui : zéro cook dans semaine | — |
| T07 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-e07.js, cuisine-engine.js | +/- convives ; recette source byte-identique ; Voir recette poulet passe de 400 à 500g dans le créneau | Ne réécrit pas recette modèle |
| T08 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-engine.js, cuisine-e07.js, cuisine-p01.js | v7-meals-model : ajout dessert conserve plat exact ; déplacement dessert seul, annulation plat préserve dessert ; UI sélection/remplacement/retrait | Synchronisation A/B réelle à recetter |
| T09 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-engine.js, cuisine-e074.js | Modèle : portions, états et progression distincts même même recette sur deux services ; préparation ne consomme aucune portion ; fin périmée et erreur quota refusées | Les portions disponibles peuvent couvrir plusieurs services, sans consommation automatique ; aucun moteur d'inventaire de restes ajouté |
| T10 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine.js, cuisine-p01.js | Desserts toujours présent ; catégorie éditeur/import natif ; recherche cacao + Desserts + rapide ; Ajouter dessert ouvre même catalogue filtré | Catégories Dessert et Desserts reconnues |
| T11 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-engine.js + cuisine-list.js (lot shopping) | v7-meals-model : draft dessert400g ; e07-p02-model : 3 sources dont Dessert → groupe600g, réimport0, provenance conservée | Test local31/31 annoncé par lot shopping ; pas de recette réelle serveur |
| T12 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-p01.js, cuisine-p01.css | Accordion replié par défaut, compteur critères, conserve dessert+diet au repli ; P01 viande/poisson/végétarien/légumes/féculents/recherche | — |
| T13 | FAIT_TESTÉ_NON_DÉPLOYÉ | cuisine-engine.js, cuisine-e074.js, cuisine.js | dernière étape exigée ; seul composant terminé devient préparé ; Bon appétit puis Traverse2200ms, bouton immédiat ; rechargement conserve132,5g au lieu de réinitialiser400g | Matériel mobile réel non utilisé |

## Modèle et préservation

Les desserts sont des **repas natifs supplémentaires** dans le même `st.planned`, clés `YYYY-MM-DD-midi-dessert` / `soir-dessert`, avec le contrat existant `id/adult/children/childFactor/status/_e072ImportRef`. Les clés plat d'origine restent inchangées. Pas de table, catalogue, stockage métier ou RPC supplémentaire. Le module menus existant synchronise le JSON planned ; validation A/B réelle non faite.

`componentAction` réutilise `mealAction` pour le plat. Les mutations dessert/portions restent transactionnelles, avec refus des snapshots périmés et restauration de l'état/stockage en cas d'erreur. Les mouvements dessert décalent uniquement les desserts occupés du même créneau. `finishCook` vérifie la dernière étape et le snapshot du seul composant.

La progression cuisine devient propre au créneau+composant+recette+méthode ; la progression historique par recette reste conservée pour une ouverture sans contexte de repas. La quantité préparée n'est jamais décrémentée automatiquement ni présentée comme consommée.

Les enfants canoniquement identifiés ont les mutations désactivées dans l'UI, et les writers/adaptateurs les refusent aussi via le getter familial commun ; inconnus/hors ligne conservent le fonctionnement local existant. `v7-meals-child.cjs` est une fixture d'identité vérifiée, **pas une preuve RPC/RLS**. Les restrictions serveur réelles relèvent des scripts F09 manuels transversaux.

Le bloc UI courses de cuisine-e07.js a été extrait par coordination vers cuisine-shopping.js (lot shopping), sans changer ses fonctions dans ce lot. cuisine-list.js et cuisine-e07.css shopping sont exclusivement modifiés par l'agent shopping.

## Vérifications exécutées

- RED avant développement : v7-meals-model échouait sur l'absence de composant dessert (expectedMeal null comparé au plat) ; UI échouait0 tabs au lieu de2.
- RED puis correction : finishCook prématuré acceptait une préparation non terminée ; exige désormais dernière étape.
- RED puis correction : reload cuisine dessert rétablissait400g contre132,5g ; reprise du contexte et des portions du repas.
- RED puis correction : enfant canonique voyait Commencer activé ; UI et adaptateur rejettent les mutations désormais.
- `DOBBY_TEST_ORIGIN=http://127.0.0.1:8897 node tests/v7-meals-model.cjs` : PASS (dessert, quantités, stale, mêmes recettes sur services distincts, annulation/déplacement, quota rollback, reload).
- `... node tests/v7-meals-child.cjs` : PASS (enfant canonique readonly, recipe steps lisibles, mutation directe refusée sans altérer données).
- `... node tests/e07-p01.cjs` : PASS12 vérifications (calendrier, filtres, convives, création/remplacement, déplacement/cascade, statuts, stale, rollback).
- `... node tests/e07-native-actions.cjs` : PASS (statut préparé/reload, catégories, quantités inconnues, import).
- `... node tests/e07-4-cook-progress.cjs` : PASS (classique/TM5/recette, reload, absences, quota rollback).
- `... node tests/e07-4-engine.cjs` : PASS (édition/médias, suppression/restauration, référence repas, snapshots, rollback).
- `... node tests/e07-4-b-editor.cjs` : PASS320/390/1440.
- `... node tests/e07-4-c-ui.cjs` : PASS320/390/1440 (étapes, minuteurs, TM5, festin et retour immédiat).
- P01 CI historique : ses7 scripts passent ; première campagne rejetée correctement car source engine modifiée pendant le contrôle d'empreinte. Deuxième rejetée sur le test tactile initial dans un contexte nonmobile ; remplacé par contexte mobile dédié et vrais événements CDP tactiles. Campagne finale **PASS10/10**, empreintes des sources inchangées : `E07_P01_TARGETED_CI_PASS 10 browser scripts; source fingerprints unchanged`. Les scénarios V7 et enfant font partie de cette campagne.
- `npm test` exécuté : premier arrêt hors repas menu-build.test.cjs ligne37 (53 réels contre63 attendu). Root a corrigé la faute63→53 et contrôle l'agrégat final.
- `node --check` et `git diff --check` fichiers détenus : PASS.

Captures locales : `/workspace/dobby-meals-evidence/taverne-{320,390,768,1024,1440,1920}.png`. Wheel réellement envoyé aux six largeurs ; série touchStart/touchMove/touchEnd réellement envoyée à Chromium en contexte mobile dédié et scrollY>0 vérifié. Cela reste une simulation navigateur, pas un geste sur iPhone physique. Preuves de la campagne : `docs/dobby-v7/evidence/e07-p01/ci/results.json` et logs par script. Captures historiques natives supplémentaires déplacées hors dépôt vers `/workspace/dobby-meals-legacy-evidence`.

## Actions manuelles / limites

Aucun SQL repas nécessaire au modèle JSON existant, et aucun SQL repas exécuté. Après le lot manuel F09 global et avant de certifier la synchronisation : sur deux comptes de test, parent ajoute un plat et dessert avec portions distinctes, autre session constate les deux clés et statuts ; enfant lit mais ne peut ni planifier ni éditer ni importer en envoyant directement des requêtes ; préparation du dessert laisse le plat prévu et les portions inchangées ; déplacement/remplacement conserve les autres clés et l'origine courses. Retour arrière code : revert du commit repas ; ne jamais supprimer en masse les clés dessert ou recettes déjà enregistrées.

Ne pas attribuer à ce lot une preuve de publication ni une certification serveur/compte/microphone/mobile physique. Aucune question utilisateur posée.
