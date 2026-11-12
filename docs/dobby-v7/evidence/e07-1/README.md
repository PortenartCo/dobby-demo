# E07.1 — Preuves comparatives

Avant : E07 exact `914780287c4545e47deed6597f93e36ae6a38647`, capturé avant modification avec les mêmes recettes/repas TEST. Après : correctif E07.1, moteur et writers natifs inchangés. Aucun compte familial réel. La photo de plat illustrant un enregistrement TEST vient d’un asset local existant : aucune association fictive avec une recette réelle du foyer.

[Galerie comparative](index.html) · [Anciennes preuves E07](../e07/) · [Journaux](logs/).

| Cas | 320 px avant / après | 390 px avant / après | 1440 px avant / après |
|---|---|---|---|
| Taverne complète : midi + soir, photo et pictogrammes | [avant](before/taverne-320.png) / [après](after/taverne-320.png) | [avant](before/taverne-390.png) / [après](after/taverne-390.png) | [avant](before/taverne-1440.png) / [après](after/taverne-1440.png) |
| Fenêtre : header et dîner | [avant](before/viewport-top-320.png) / [après](after/viewport-top-320.png) | [avant](before/viewport-top-390.png) / [après](after/viewport-top-390.png) | [avant](before/viewport-top-1440.png) / [après](after/viewport-top-1440.png) |
| Fenêtre après vrai défilement | [avant](before/viewport-scroll-320.png) / [après](after/viewport-scroll-320.png) | [avant](before/viewport-scroll-390.png) / [après](after/viewport-scroll-390.png) | [avant](before/viewport-scroll-1440.png) / [après](after/viewport-scroll-1440.png) |
| Dîner absent | [avant](before/dinner-empty-320.png) / [après](after/dinner-empty-320.png) | [avant](before/dinner-empty-390.png) / [après](after/dinner-empty-390.png) | [avant](before/dinner-empty-1440.png) / [après](after/dinner-empty-1440.png) |
| Courses longues, dernier contenu accessible | [avant](before/shop-scroll-320.png) / [après](after/shop-scroll-320.png) | [avant](before/shop-scroll-390.png) / [après](after/shop-scroll-390.png) | [avant](before/shop-scroll-1440.png) / [après](after/shop-scroll-1440.png) |

36 captures : 15 avant, 21 après. La navigation fixe apparaît à la hauteur de la fenêtre dans les captures pleine page : sa position est vérifiée séparément par scroll réel et captures de fenêtre.

| Persistance native après rechargement | 320 | 390 | 1440 |
|---|---|---|---|
| Soir marqué préparé, midi conservé | [preuve](after/prepared-reload-320.png) | [preuve](after/prepared-reload-390.png) | [preuve](after/prepared-reload-1440.png) |
| Midi marqué préparé, soir conservé | [preuve](after/prepared-midi-reload-320.png) | [preuve](after/prepared-midi-reload-390.png) | [preuve](after/prepared-midi-reload-1440.png) |

[Contrôles avant](before/checks.json) : coordonnées du dock avant/après défilement. [Contrôles après](after/checks.json) : clics des cinq destinations, état préparé rechargé pour chaque créneau, autre créneau préservé. Le test `e07-1-context.cjs` vérifie également date/créneau après rechargement et retour/avance navigateur, sans modifier les repas.

Écarts voulus : titre déplacé sous l’image, compteur/effet superposés retirés, cartouche en bas à droite ; un bouton principal dans le dîner ; bouton Ajouter une recette de même classe/hauteur ; pictogramme quand aucune photo locale n’est disponible ; ajout du second créneau dans sa journée ; commande préparé déplacée dans les détails existants du planning. Aucun changement de positionnement du dock, qui était déjà fixe.
