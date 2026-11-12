# Comparaisons E01.1

Avant : runtime de référence `e6be2f8c367df282f8d46bc698d0cfbc2ddc1b86`, capturé avant les modifications. Après : les trois corrections de présentation E01.1. Les sources `design/stitch-53/` et les captures historiques E01 restent inchangées.

Profils Chromium éphémères, français belge, fuseau Europe/Paris, animations réduites ; fenêtres **390 × 900** et **1440 × 900**. Les mêmes enregistrements TEST sont utilisés dans les deux passes. Aucun compte réel, aucun accès externe ni transfert familial. Les écritures de préparation sont limitées au profil de test ; la consultation de J0/J+6/retour/J+1 ne modifie ensuite ni l’état natif ni son stockage.

| État | Avant 390 / 1440 | Après 390 / 1440 |
|---|---|---|
| Accueil aujourd’hui, fenêtre | [390](before/accueil-aujourdhui-viewport-390.png) / [1440](before/accueil-aujourdhui-viewport-1440.png) | [390](after/accueil-aujourdhui-viewport-390.png) / [1440](after/accueil-aujourdhui-viewport-1440.png) |
| Accueil J+6, fenêtre | [390](before/accueil-j6-viewport-390.png) / [1440](before/accueil-j6-viewport-1440.png) | [390](after/accueil-j6-viewport-390.png) / [1440](after/accueil-j6-viewport-1440.png) |
| Retour direct à aujourd’hui | [390](before/retour-aujourdhui-viewport-390.png) / [1440](before/retour-aujourdhui-viewport-1440.png) | [390](after/retour-aujourdhui-viewport-390.png) / [1440](after/retour-aujourdhui-viewport-1440.png) |
| Repas non planifié, carte complète | [390](before/festin-vide-390.png) / [1440](before/festin-vide-1440.png) | [390](after/festin-vide-390.png) / [1440](after/festin-vide-1440.png) |
| Bandeau supérieur, accueil | [390](before/bandeau-accueil-390.png) / [1440](before/bandeau-accueil-1440.png) | [390](after/bandeau-accueil-390.png) / [1440](after/bandeau-accueil-1440.png) |
| Bandeau supérieur, Menu | [390](before/bandeau-menu-390.png) / [1440](before/bandeau-menu-1440.png) | [390](after/bandeau-menu-390.png) / [1440](after/bandeau-menu-1440.png) |

**52 PNG** : les vues de fenêtre et recadrages ci-dessus, plus les captures longues des cinq états dans les dossiers avant/après. Les captures longues sont réalisées au défilement zéro ; les barres fixes y restent ancrées à la première fenêtre de 900 px. Sur ordinateur, le cadre mobile existant reste centré à 480 px maximum.

Le sélecteur central réutilise les couleurs, polices et bordures Stitch ; il affiche la date complète et les bornes par flèches désactivées. Le titre de section tient dans le cartouche DOBBY existant, avec une ligne dédiée à la section. Le Festin vide conserve sa carte et son lien, sans métadonnée ni note de recette. Avec une recette, seuls la durée disponible et les convives réellement enregistrés sont affichés.

Reproduction après correction : `node essai-stitch-v7/tests/e01-1-visual.cjs`. La passe `DOBBY_E011_PHASE=before` utilise les sept anciens boutons et nécessite le runtime de référence ; elle n’est pas destinée au runtime corrigé. [Contrôles avant](before/checks.json), [contrôles après](after/checks.json), [résultats ciblés](results.txt), [contrat permanent](../../E01-ACCUEIL.md).

Aucun écart visuel restant identifié dans le périmètre E01.1. Aucun développement des pages secondaires, aucune publication ou fusion.
