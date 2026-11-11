# DOBBY E07.4 — Implementation Plan

> **For agentic workers:** Use the existing scoped implementation/review workflow. Execute checkpoints A, B, C, then D; keep one implementation aide and no delegated sub-agents.

**Goal:** Consolider les61décisions de revue puis publier uniquement un nouvel aperçu statique isolé.

**Architecture:** Réutiliser le moteur natif Cuisine, le validateur/import JSON-ZIP et le store binaire existants. Étendre les métadonnées compatibles des recettes ; une identité par recette et méthodes attachées. UI Stitch réelle, modales DOM accessibles, minuteurs locaux à deadlines persistantes, préférences partagées existantes.

**Tech Stack:** JavaScript/MJS, HTML/CSS Stitch, Node test runner, Playwright/Chromium, générateur statique et GitHub Pages existants.

**Spec:** `design/e07-4-consolidation/references/PROMPT_CODEX.md`, `SPEC_E07_CONSOLIDATION.md`, `MATRICE_DECISIONS_E07.csv`, `SCENARIOS_ACCEPTATION.md`, `NOTES_TECHNIQUES_ET_ARBITRAGES.md` (tous lus intégralement).

## Contraintes communes

- Branche `feat/dobby-e074-consolidation-20261111`, worktree `/workspace/dobby-e074`, depuis le SHA testé exact `c121027e53b335800d1559a39481c774a137a3fa`. Le HEAD E07.3 distant0f410ee est documentaire et reste intact.
- Préserver E07.3, E01–E06/E08, 53sources Stitch, V5historique, brouillons/recettes/variantes/médias/plannings/courses/historiques et tous aperçus publiés.
- Aucune refonte Choisir un repas/Préparer la liste de courses ; seuls garde-fous de calcul et raccordement modal autorisés.
- Aucune API IA payante, Supabase réel, migration ou synchronisation photographique prétendue.
- Annexes originales et22captures inspectées ; illustration/maquette Festin locales intactes. Ne pas utiliser une capture comme interface.
- Publication autorisée après contrôles verts : ajout du seul sous-arbre `essai-dobby-e07-consolidation-review-20261111/` sur main via checkout de publication distinct, aucune fusion des sources.

## Risques à vérifier

- Champs culinaires absents vs fichier/type dangereux : enregistrer incomplet, garder la sécurité et les transactions.
- Portions inconnues : aucun défaut4, aucune division par null ; demander la référence avant les calculs dépendants.
- Correspondances image/ingrédient/étape/méthode : aucune association déduite ou fausse provenance ; legacy lisible.
- Édition/retrait : identité stable, BASE non destructif, références de planning et médias conservées ; annulation sans mutation.
- Minuteurs : horodatages persistants, reprise après suspension, fins acquittables sans doublon ; aucune notification iOS garantie.

## Checkpoint A — Grimoire et import

**Files:** `recipe-import-format.mjs`, `recipe-import.js`, `cuisine-engine.js`, garde ciblée `cuisine-list.js`, amendements minimaux du noyau `essai-stitch-v5-famille/index.html` et garde d’intégrité explicite ; UI `cuisine.js`, styles `cuisine-e073.css`/`recipe-import.css` si nécessaires.
**Interfaces:** conserver `normalizePayload`, `prepare(file,{E})`, `commitRecipeImport(plan)`, `steps:string[]`, `customRecipes`, `tmAdaptations`, `localMedia/localMediaArchive`. Ajouter métadonnées versionnées de lacunes, identifiants ingrédients et liaisons étape/méthode. La version source reste tracée ; aucun blob URL persisté.

- [x] Corpus RED : recette sans nom/portions/temps/quantités/étapes, deux entrées incomplètes sauvegardables, V1/V2/ZIP, trois images/deux étapes, mapping absent/présent, TM5 incomplet et types dangereux.
- [x] Assouplir les seules absences culinaires dans le writer V2 ; adapter normalisation, prompt cumulatif exact et associations. Garder les limites ZIP et les contrôles avant écriture.
- [x] Préserver RAW/médias, contexte/epoch, doublons et rollback ; garde des calculs lorsque la référence manque, sans refonte Courses.
- [x] Accès direct IA, CTA16–18px pleine largeur ; création manuelle et choix retirés, ancien brouillon intact ; export JSON déplacé dans un repli de paramètres cohérent et honnête.
- [x] Tests ciblés, avant/après320/390/1440, contrat de métadonnées documenté, revue et commit A.

## Checkpoint B — Fiche et writers de recette

**Files:** `cuisine.js`, CSS bornée E07.4 ; `cuisine-engine.js` et noyau natif pour les seules opérations nouvelles ; tests dédiés.
**Interfaces:** même ID user ; surcharge BASE rattachée au même ID, résolution unique via read/getR ; retrait récupérable avec restauration et conservation des références. Planning via `choose`/writer natif, `planned[date+'-'+slot]`.

- [x] RED titre90caractères, étoile unique/confirmation/catalogue, métriques3colonnes, onglets exclusifs et méthodes localement commutées sans mutation ingrédients/portions/courses.
- [x] Retirer blocs/badges/actions remplacés ; liste ingrédients simple avec calculs justes ou À compléter.
- [x] Modale semaine7jours/14créneaux, navigation, convives, remplacement confirmé, annulation/Escape/focus et Taverne/reload ; aucun ajout panier.
- [x] Édition complète sans clone, images/étapes/TM5 conservées ou associations explicitement corrigées ; retrait récupérable et avertissement planning, sans perte.
- [x] Tests writers/deltas/persistance et captures3largeurs ; revue et commit B.

## Checkpoint C — Mode Cuisine

**Files:** `cuisine.js`, composant de minuteurs borné, CSS E07.4, actif Festin fourni et provenance ; adaptateur natif uniquement si requis.
**Interfaces:** consommer liaisons étape/méthode de A ; instructions classiques et TM5 attachées. Un seul registre local de minuteurs identifiés, deadlines en millisecondes et contexte recette/étape/méthode.

- [x] RED visuel encombré, image/mapping de mauvaise étape, chronomètre unique/perdu, navigation et fin de cuisson.
- [x] Hero avec seul badge Étape ; photo exacte ou repli neutre, ingrédients de l’étape fiables ; supprimer les deux encarts et déplacer parcours complet tout en bas.
- [x] Liste minuteurs indépendants : durée explicite/fourchette choisie ou saisie, ±1min, start/pause/reprise/reset/suppression ; aucun démarrage implicite.
- [x] Deadlines persistantes, changement écran/méthode/recette et reload, rattrapage reprise, fin visible/acquittable et son selon préférence ; limites iOS explicites.
- [x] Festin Stitch modal sur la fiche, image locale, message exact, unique Retour à la recette, focus/Escape, aucun faux enregistrement/route/son automatique.
- [x] Tests ciblés et captures3largeurs ; revue et commit C.

## Checkpoint D — Intégration et publication

**Files:** `chrome.js/css` adaptations compatibles, générateur/profil E07.4 et tests/CI existants si requis ; rapport `docs/dobby-v7/E07-4-CONSOLIDATION.md`, matrice indépendante61IDs et preuves.

- [x] Effets ON/SonOFF sans préférence, OFF explicite conservé ; pixels/classes sur Taverne/Grimoire/Fiche/Cuisine/Import/Courses, réduction système et absence de son automatique.
- [x] Réutiliser tests E07.3 concernés, adapter uniquement attentes devenues caduques avec preuve ; frontières natives et un vrai parcours E07 complet aux3largeurs, sans répétition sans cause.
- [x] Rapprocher les61IDs :42corrections,10préservations,4remplacements,5reports. Chaque résultat a code/test/preuve ou vrai blocage ; vérifier conservation des arbres historiques.
- [x] Source/build propres et reproductibles, nouveau profil `e074`, nouveau préfixe `dobby-review-e074-20261111|`, CI sur SHA réel et aperçu local sans backend.
- [x] Revue finale et corrections causales, pousser seule branche source ; si tous contrôles verts, checkout publication indépendant depuis main récent et ajout du seul sous-arbre statique autorisé.
- [x] Vérifier commit publication, Pages, octets HTTP et parcours hébergés/sentinelles ; rapport des cinq niveaux d’état et URL. E07 reste partiel pour les deux pages reportées. Arrêt après publication vérifiée ou blocage réel.
