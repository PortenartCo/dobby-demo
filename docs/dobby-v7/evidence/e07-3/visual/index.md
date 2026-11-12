# E07.3 — Comparatifs Taverne et Grimoire

Avant : application immuable du commit `66a1395bb95ff7b9a7e2d1b981f5a8773070c03e` (`http://127.0.0.1:8895`). Après : worktree E07.3 (`http://127.0.0.1:8894`), code stabilisé pour ces vues ; les commits de livraison sont référencés dans le rapport principal. Les neuf captures reçues sont conservées [sans modification](../review-input/manifest.json).

Chaque largeur possède **13 vues avant + 13 vues après**. Les images et les fontes sont décodées avant capture. Les recettes injectées portent explicitement `TEST`, dans des contextes Chromium éphémères sans compte familial réel et avec trafic extérieur bloqué. Aucune capture ne présente une photographie de fixture comme une recette privée du foyer.

Les vues « viewport » montrent le véritable bandeau et la navigation fixes. Les captures longues/sections conservent également les éléments fixes à leur position de viewport ; leur présence au milieu d’une capture longue ne signifie pas qu’ils se déplacent en navigation réelle. Les vues Calendrier et Catalogue sont alignées sous le bandeau afin que leurs contrôles soient lisibles.

| Vue | 320 px | 390 px | 1440 px |
|---|---|---|---|
| Taverne, aucun repas prévu | [avant](before/taverne-empty-320.png) / [après](after/taverne-empty-320.png) | [avant](before/taverne-empty-390.png) / [après](after/taverne-empty-390.png) | [avant](before/taverne-empty-1440.png) / [après](after/taverne-empty-1440.png) |
| Taverne, deux repas planifiés | [avant](before/taverne-planned-320.png) / [après](after/taverne-planned-320.png) | [avant](before/taverne-planned-390.png) / [après](after/taverne-planned-390.png) | [avant](before/taverne-planned-1440.png) / [après](after/taverne-planned-1440.png) |
| Carte des repas du jour | [avant](before/taverne-meals-320.png) / [après](after/taverne-meals-320.png) | [avant](before/taverne-meals-390.png) / [après](after/taverne-meals-390.png) | [avant](before/taverne-meals-1440.png) / [après](after/taverne-meals-1440.png) |
| Menus de la Semaine, viewport réel | [avant](before/taverne-week-320.png) / [après](after/taverne-week-320.png) | [avant](before/taverne-week-390.png) / [après](after/taverne-week-390.png) | [avant](before/taverne-week-1440.png) / [après](after/taverne-week-1440.png) |
| Accès Grimoire et Courses | [avant](before/taverne-links-320.png) / [après](after/taverne-links-320.png) | [avant](before/taverne-links-390.png) / [après](after/taverne-links-390.png) | [avant](before/taverne-links-1440.png) / [après](after/taverne-links-1440.png) |
| Grimoire complet | [avant](before/recipes-full-320.png) / [après](after/recipes-full-320.png) | [avant](before/recipes-full-390.png) / [après](after/recipes-full-390.png) | [avant](before/recipes-full-1440.png) / [après](after/recipes-full-1440.png) |
| Illustration et cartouche | [avant](before/recipes-hero-320.png) / [après](after/recipes-hero-320.png) | [avant](before/recipes-hero-390.png) / [après](after/recipes-hero-390.png) | [avant](before/recipes-hero-1440.png) / [après](after/recipes-hero-1440.png) |
| Introduction et bouton principal | [avant](before/recipes-intro-320.png) / [après](after/recipes-intro-320.png) | [avant](before/recipes-intro-390.png) / [après](after/recipes-intro-390.png) | [avant](before/recipes-intro-1440.png) / [après](after/recipes-intro-1440.png) |
| Recherche et filtres, viewport réel | [avant](before/recipes-catalogue-320.png) / [après](after/recipes-catalogue-320.png) | [avant](before/recipes-catalogue-390.png) / [après](after/recipes-catalogue-390.png) | [avant](before/recipes-catalogue-1440.png) / [après](after/recipes-catalogue-1440.png) |
| Première carte du catalogue | [avant](before/recipes-card-320.png) / [après](after/recipes-card-320.png) | [avant](before/recipes-card-390.png) / [après](after/recipes-card-390.png) | [avant](before/recipes-card-1440.png) / [après](after/recipes-card-1440.png) |
| Bas du catalogue et retour | [avant](before/recipes-footer-320.png) / [après](after/recipes-footer-320.png) | [avant](before/recipes-footer-390.png) / [après](after/recipes-footer-390.png) | [avant](before/recipes-footer-1440.png) / [après](after/recipes-footer-1440.png) |
| Catalogue filtré Favoris | [avant](before/recipes-favorites-320.png) / [après](after/recipes-favorites-320.png) | [avant](before/recipes-favorites-390.png) / [après](after/recipes-favorites-390.png) | [avant](before/recipes-favorites-1440.png) / [après](after/recipes-favorites-1440.png) |
| Catalogue sans résultat | [avant](before/recipes-empty-320.png) / [après](after/recipes-empty-320.png) | [avant](before/recipes-empty-390.png) / [après](after/recipes-empty-390.png) | [avant](before/recipes-empty-1440.png) / [après](after/recipes-empty-1440.png) |

## Correspondance avec les neuf observations reçues

| Capture de revue | Preuves correspondantes |
|---|---|
| 01 — repas du soir | Carte des repas du jour ; Taverne vide et planifiée |
| 02 — semaine | Menus de la Semaine, sept jours visibles dans le viewport après correction |
| 03 — liens Grimoire/Courses | Accès Grimoire et Courses ; mesures typographiques et contraste |
| 04 — illustration Grimoire | Illustration et cartouche, mêmes dimensions et cadrage |
| 05 — bouton principal | Introduction et bouton principal |
| 06 — sanctuaire culinaire | Grimoire complet et introduction : encart absent après correction |
| 07 — boutons secondaires | Recherche et filtres : accès manuel/JSON redondants absents |
| 08 — catalogue | Première carte ; recherche/filtres ; favoris ; état vide |
| 09 — pied de page | Bas du catalogue et retour ; encart technique de sauvegarde retiré |

## Mesures et contrôles exécutés

| Largeur | Débordement document | Filtres | Actions Grimoire/Courses | Contraste minimal mesuré | Pixels de l’étoile pleine / contour |
|---|---|---|---|---|---|
| 320 | Aucun | 11 visibles, hauteur 44 px, sans zone horizontale | Police 16 px, compteurs ≥14 px, hauteur ≥52 px | 9.18:1 | 194 / 64 |
| 390 | Aucun | 11 visibles, hauteur 44 px, sans zone horizontale | Police 16 px, compteurs ≥14 px, hauteur ≥52 px | 9.18:1 | 194 / 63 |
| 1440 | Aucun | 11 visibles, hauteur 44 px, sans zone horizontale | Police 16 px, compteurs ≥14 px, hauteur ≥52 px | 9.18:1 | 194 / 63 |

Les contrastes sont calculés sur les couleurs CSS réellement peintes : remplissage solide ou minimum des arrêts des gradients dorés. Les icônes décoratives sont exclues des libellés. Le retour à la Taverne est contrôlé à 52–56 px de hauteur, police 16–18 px, gras, pleine largeur utile avec les gouttières de page. Les signatures du jour natif, des repas, des recettes et des adaptations TM5 restent strictement identiques après consultation, recherche, filtres et captures.

Le test d’étoile utilise les pixels de véritables captures DOM, puis les analyse dans un Canvas : il ne se limite ni à une classe ni à un réglage de police. [Pleine 390 px](after/favorite-on-icon-390.png) / [contour 390 px](after/favorite-off-icon-390.png). Les six petites captures d’icônes sont conservées en plus des 78 vues comparatives.

### Conservation de l’illustration du Grimoire

| Largeur | Dimensions avant = après | Centre de l’illustration hors cartouches |
|---|---|---|
| 320 | 296 × 220 px | Identique pixel pour pixel |
| 390 | 366 × 220 px | Identique pixel pour pixel |
| 1440 | 456 × 220 px | Identique pixel pour pixel |

[Résultats avant](before/results.json) · [résultats après](after/results.json) · [journal avant](before/run.log) · [journal après](after/run.log) · [conservation du cadrage](hero-preservation.json).

## Écarts détectés puis corrigés

- Le premier contrôle après correction a détecté un bouton de retour de 66,8 px à 320 px, dû au passage du libellé sur deux lignes ; padding/hauteur corrigés, contrôle final PASS. [Premier échec conservé](after-first-return-320.log). L’assertion de pleine largeur tient compte des gouttières communes de 16 px.
- La revue des images a ensuite détecté une étoile active qui restait en contour : la police Material Symbols locale est statique et ignore l’axe `FILL`. Une vraie forme SVG pleine/contour remplace cet effet inopérant ; le contrôle final porte sur les pixels réellement rendus.
- Avant correction, la bande de filtres mesure 825 px pour des zones de 320/390/480 px ; boutons de 10 px et 30 px de haut. Après correction, les filtres s’enroulent dans la largeur disponible, restent tous présents et mesurent 44 px de haut.

La recette native « Poulet mijoté aux légumes et riz » affiche désormais une seule durée de 40 min ; les 45 min fixes de la composition ont disparu. La recette TEST sans durée n’affiche aucune valeur inventée. Les repas de Midi et Soir sont distincts et les replis sans photo restent illustratifs.

## Limites de cette preuve

Cette série vérifie les vues source Taverne/catalogue et leur présentation responsive, pas une publication ni un compte Supabase réel. Les interactions métier, l’import JSON/ZIP, les effets/sons et le parcours hébergé ont leurs tests et preuves séparés. Aucun essai physique Safari/iPhone n’est déduit de Chromium responsive. Les sous-pages détaillées restent réservées à la prochaine revue utilisateur.
