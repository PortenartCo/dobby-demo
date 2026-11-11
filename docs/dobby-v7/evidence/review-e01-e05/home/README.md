# Revue du 11 novembre 2026 — E01 A/B

Périmètre : accueil, réouverture des missions et bandeau Courses. Base : `66a1395`. Aucune écriture dans le moteur Missions, E03, E06, le registre commun ou les générateurs.

## Diagnostic vérifié

La capture utilisateur comporte une mission manuelle et une automatique terminées. Leurs règles diffèrent :

- **Manuelle** : le bouton natif `fmsAction=toggle` permettait déjà la réouverture dans la base testée. Le défaut d'impossibilité de réouverture manuelle n'a pas été reproduit dans les profils temporaires. À 320, 390 et 1440 px, le parcours réel clôture → réouverture → rechargement → E03 → seconde clôture passe avant et après. Les 25 runes restent attribuées une seule fois. Le writer natif est conservé, et le bouton indique maintenant son action au survol.
- **Automatique** : le writer `change[data-autotask]` du moteur V5 Famille (`index.html`, bloc `inline auto-tasks.js`) autorise uniquement `open` → `done`. `reconcile()` projette les échéances des équipements et documents ; il ne rouvre pas un historique terminé. Aucun writer natif de réouverture n'a été trouvé. La coche terminée reste désactivée ; l'accueil explique explicitement que la réouverture y est indisponible et propose un vrai lien vers l'équipement ou le document source. Une source supprimée est annoncée indisponible, sans lien cassé ni mutation simulée.
- **Courses** : le titre était directement dans le corps rembourré, sans bandeau ni icône, avec une typographie et un fond spécifiques. Il utilise maintenant le bandeau iconographique natif des Repas et les mêmes classes de cadre/en-tête que la Gazette. Le statut existant devient le badge du bandeau. Formulaire, message et lien complet sont conservés ; le writer `DobbyCuisineList.add()` et le panier natif restent identiques.

Le document `E03-MISSIONS.md` n'existe pas dans ce worktree d'intégration. Sa référence a été lue avec `git show 6a86ead:docs/dobby-v7/E03-MISSIONS.md`, ainsi que `REVIEW-CONSOLIDATION.md`, `E01-ACCUEIL.md` et `INTEGRATED-REVIEW.md`. Les deux annexes E01 ont été inspectées.

## Fichiers

- `essai-stitch-v7/home.js` : `quickCourses()` et rendu des cartes de missions dans `render()` ; writers existants inchangés.
- `essai-stitch-v7/home-consolidation.css` : suppression du cadre et du titre spécifiques Courses ; lien source visible et focus clavier.
- `essai-stitch-v7/tests/review-home-20261111.cjs` : vérification causale navigateur, profils temporaires, fuseau `Europe/Brussels`, réseau externe bloqué.

## Vérification causale

Avant correction, le test complet a échoué sur 30 vérifications attendues (10 par largeur) : accès source explicite, explication de non-réouverture automatique, suppression de la route cassée, bandeau/icône et styles communs. Le parcours manuel et les runes passaient déjà. Les captures avant ont ensuite été reproduites sans modifier le worktree, en servant au navigateur les deux sources E01 immuables de `66a1395`.

```sh
DOBBY_REVIEW_BASELINE=1 DOBBY_REVIEW_BASELINE_REF=66a1395 DOBBY_TEST_ORIGIN=http://127.0.0.1:8891 node essai-stitch-v7/tests/review-home-20261111.cjs
# sortie 1 attendue : 30 écarts E01 A/B

DOBBY_TEST_ORIGIN=http://127.0.0.1:8891 node essai-stitch-v7/tests/review-home-20261111.cjs
# sortie 0 : REVIEW_HOME_AFTER 320, 390 et 1440
```

Après correction, les trois largeurs passent : statut, coche, texte barré, compteurs, persistance locale, cohérence des filtres E03, crédits/demandes de runes immuables lors de la seconde clôture, deux liens sources réellement ouverts, source disparue en consultation seule. L'ajout rapide conserve l'identifiant du panier existant ; l'article survit au rechargement, apparaît dans E07 et n'est pas ajouté deux fois.

Le rendu compare les couleurs, bordures, padding et fontes calculés des trois bandeaux. À 1440 px, leur hauteur commune est 51 px ; à 320 px, Courses et Gazette passent à 83 px pour laisser leurs badges revenir à la ligne. Aucun débordement horizontal. Les captures Courses aux trois largeurs ont été inspectées.

`node --check essai-stitch-v7/home.js` et `git diff --check` ciblé : sortie 0. La campagne générale appartient à la vérification finale du lot ; aucune publication ni recette avec des comptes réels n'est impliquée.

## Preuves

| Largeur | Accueil avant / après | Courses avant / après |
| --- | --- | --- |
| 320 | [Avant](before-home-320.png) · [Après](after-home-320.png) | [Avant](before-courses-320.png) · [Après](after-courses-320.png) |
| 390 | [Avant](before-home-390.png) · [Après](after-home-390.png) | [Avant](before-courses-390.png) · [Après](after-courses-390.png) |
| 1440 | [Avant](before-home-1440.png) · [Après](after-home-1440.png) | [Avant](before-courses-1440.png) · [Après](after-courses-1440.png) |

Résultats détaillés : [avant](before-results.json), [après](after-results.json). Les captures représentent uniquement des données `TEST` dans des profils éphémères.

Limites : aucune réouverture automatique artificielle ; aucune validation de partage familial réel ; aucun essai sur Safari/iPhone physique. Le défaut manuel rapporté demeure non reproduit sur la base vérifiée et doit être réexaminé avec une reproduction précise s'il persiste en revue utilisateur.
