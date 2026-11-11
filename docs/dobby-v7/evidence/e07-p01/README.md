# Preuves ciblées E07-P01

Ces parcours utilisent les écrans réels et le writer Cuisine natif dans Chromium, avec un foyer et cinq recettes explicitement fictifs. Aucun compte réel, appel Supabase ou API IA n’est utilisé. Les ressources externes des sources Stitch sont bloquées par le navigateur de test ; les assertions distinguent les références de médias bloquées des appels API.

## Reproduction

Depuis la racine du dépôt, avec un serveur HTTP local et `DOBBY_TEST_ORIGIN` défini si son port diffère de 8898 :

```sh
node essai-stitch-v7/tests/e07-p01.cjs
node essai-stitch-v7/tests/e07-p01-visual.cjs
```

La fixture commune est `e07-p01-fixture.cjs`. L’horloge est fixée au 12 novembre 2026, fuseau Europe/Brussels, locale fr-BE. Les contextes navigateur sont neufs et leurs stockages éphémères.

## Résultats locaux

- [12 scénarios fonctionnels PASS](functional/results.json), [journal](functional/console.log), [empreintes des sources et tests figés](functional/sources.json).
- [Contrôles visuels PASS](visual/results.json) à 320, 390 et 1440 px ; un bandeau haut, un dock fixe, pas de débordement horizontal et aucune recette visible avant choix d’un mode.
- [État avant](visual/before-results.json) : module P01 absent aux trois largeurs. [Échec initial](baseline-red.txt) : le nouveau calendrier manque avant implémentation.
- Captures comparables : `visual/before-pick-{320,390,1440}.png`, `visual/after-pick-{320,390,1440}.png` et `visual/after-recipes-{320,390,1440}.png`.

Le dernier contrôle visuel replace le défilement en haut, attend les fontes et deux frames avant chaque capture. Cela conserve le bandeau fixe en haut des images complètes après le clic sur le mode Recettes. Seules les trois largeurs visuelles ont été rejouées ; le produit, les douze scénarios fonctionnels et les cinq frontières E07.4 n’ont pas changé. Les anciennes et nouvelles empreintes du script de capture sont consignées dans `functional/sources.json`.

Les scénarios couvrent calendrier lundi–dimanche, navigation et retour à la semaine courante, absence d’écriture pendant la consultation, créneaux indépendants, convives du foyer avec bébé exclu, facteur 0,65 pour un nouveau repas et préservation d’un ancien facteur 0,5. Recherche et filtres vérifient les métadonnées structurées, `bœuf`/`boeuf`, les légumes multiples, féculents et Diététique. Le choix aléatoire reste dans les résultats filtrés ; la réserve rapproche uniquement des recettes enregistrées contenant des ingrédients réellement disponibles.

La planification future préserve les anciens repas et les courses. Les deux noms de plats affichés dans la Taverne sont comparés à ceux de l’Accueil à J0, y compris après une planification future. La comparaison attend le véritable état prêt et la visibilité du titre après défilement, sans remplacer les assertions de valeur par de simples comptes DOM.

Les contrôles de remplacement, déplacement vers une destination occupée, cascade native, préparation et annulation passent par les actions réelles. Ils vérifient confirmations refusées puis acceptées, snapshots périmés, conservation des portions, notes et extensions inconnues, puis restauration exacte de la mémoire et du stockage après un refus de sauvegarde. `_e072ImportRef` est conservé lors d’un déplacement ou d’une même recette ; une nouvelle recette ne reprend pas la provenance d’ingrédients de l’ancienne.

Deux défauts métier révélés par ces contrôles ont été corrigés avant le résultat final : la Taverne affichait la date future du curseur natif au lieu des repas du jour de l’Accueil ; le remplacement d’un repas perdait des extensions et sa note. Les comportements des autres pages E07.4 sont vérifiés séparément par le runner ciblé du lot. Ces preuves locales ne constituent pas une preuve de publication ; celle-ci relève de la recette de l’aperçu hébergé.
