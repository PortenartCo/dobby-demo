# Notes techniques, limites et arbitrages de la consolidation E07

## Ancrage du code source

- Repo : `PortenartCo/dobby-demo`
- Branche E07.3 : `feat/dobby-e073-taverne-grimoire-20261111`
- SHA code eprouve : `c121027e53b335800d1559a39481c774a137a3fa`
- Publication E07.3 statique : `84e254f485a22ac4f5b880217c02902c22b39c73`
- Rapport : `docs/dobby-v7/E07-3-TAVERNE-GRIMOIRE.md`
- Contrat import : `docs/dobby-v7/E07-3-IMPORT.md`
- Matrice historique : `docs/dobby-v7/CONSOLIDATION-MATRIX.*` (ne pas ecraser)

Points d'entree verifies dans le code E07.3 :

- `essai-stitch-v7/cuisine.js` : `renderRecipes`, `renderRecipeEntry`, `renderRecipe`, `renderCook`, `renderAdd`, `readRecipeDraft`, `act`, navigation `open`, recette `recipe-shop`, onglets `ingredients`/`steps`, variantes `tm5`, `edit-recipe`, `plan-recipe` et favoris. Les cases ingredients y sont actuellement un Set UI ; `recipe-shop` renvoie a `pick`, il n'ajoute rien lui-meme.
- `essai-stitch-v7/cuisine-e07.js` : Taverne et listes des courses deja implementes, `e072-preview` et `e072-confirm` pour l'import depuis le planning.
- `essai-stitch-v7/cuisine-list.js` : `preview`/`confirmImport`, provenance et recu d'imports pour eviter le re-ajout des memes contributions de recettes au panier. Proteger ces garanties.
- `essai-stitch-v7/cuisine-engine.js` : writer natif de recettes, planification, TM5 et listes.
- `essai-stitch-v7/recipe-import-format.mjs` : `externalPrompt`, `normalizePayload`, conversion V1/V2 et references image ; les portions/etapes peuvent aujourd'hui declencher des erreurs qui bloquent une entree.
- `essai-stitch-v7/recipe-import.js` : preparation/import ZIP, `houseStore`/`houseRead`, photos originales, apercu, confirmation. Photos de la demo LOCALES.
- `essai-stitch-v7/recipe-import-zip.mjs` : verifications fichiers et securite du ZIP.
- `essai-stitch-v7/chrome.js` : preference E07.3 de base `effects:false, sound:false`, alors que l'evolution E06 a retenu effets ON. Ne pas fusionner E06 hors perimetre ; mais concevoir une seule convention compatible et tester.
- `essai-stitch-v5-famille/index.html` : noyau natif V5, deja amende en E07.3 sur quelques points ; modifier localement et avec preuve uniquement si l'integrite fonctionnelle le rend indispensable.
- Generateur : `scripts/build-dobby-review.cjs` profil `e073` ; tests : voir `essai-stitch-v7/tests/`. Ne pas inventer des commandes ; consulter `--help` ou fichiers existants.

## Decisions remplac ees (NE PAS REFAIRE)

1. Une premiere demande visait a **simplifier le haut du formulaire manuel** : retirer l'image Dobby, badges, note, « iPhone securise » et explications. Cette demande est rendue caduque par la **suppression totale du parcours Saisie manuelle**. L'editeur de recettes existantes reste obligatoire.
2. La section manuelle « Piece de reference » permettait de choisir une photo avec l'iPhone ou un PDF ; on voulait des libelles simples et une vraie conservation. Le formulaire manuel disparaissant, ce bloc ne doit pas etre reintroduit en E07.4. Garder la cible de photo source accessible en edition/import, sans promettre une fonction absente.
3. Le texte « Rangement direct : ... aucun OCR ... » devait etre simplifie et parler de synchronisation. Il disparait avec la page manuelle. **Ne pas afficher comme deja synchronise dans Supabase.**
4. Le bouton « Ajouter les vivres manquants au panier » devait etre clarifie ; l'utilisateur a finalement CHOISI sa **suppression**, ainsi que les cases et compteur. La creation de courses se fait exclusivement dans la section Courses du Foyer.
5. Un premier arbitrage sur les favoris supprimait seulement le badge inferieur droit de la photo ; l'arbitrage final supprime **les deux badges** photo, la commande de bandeau et ne garde qu'**une etoile de commande** a droite de « Fiche Recette ».
6. Une premiere idee consistait a conserver un ecran de choix Saisie manuelle/Importer IA ; la decision finale est **acces direct a l'IA**.

## Decisions explicitement reportees

- Refonte de **« Choisir un repas »** : prochaine revue. Il existe une exception tres bornee : le bouton « Planifier ce repas » depuis une fiche doit utiliser son propre calendrier hebdomadaire en modal et le writer de planification existant. Cela n'autorise pas de modifier l'UI globale Choisir un repas.
- Refonte de **« Preparer la liste de courses »** : prochaine revue. L'import depuis menus existe deja ; il doit rester fonctionnel, et les doublons/provenances deja geres doivent etre preserves. N'ajouter aucune nouvelle creation de liste depuis une recette.
- **Supabase** reel : cible de centralisation familiale des photographies, fichiers sources, recettes et illustrations. Non raccorde dans l'apercu E07.3, non autorise a etre migre ou ecrit par ce prompt. Garder les fichiers locaux avec une indication honnete de sync non effectuee.
- Tests **Safari/iPhone physique** : utiles et a realiser au moment de la validation reelle ; Chromium responsive ne les remplace pas. Ne pas surpromettre une notification systeme si Safari suspend les timers.

## Politique des actifs et de la maquette Stitch

- `assets/STITCH_FESTIN_ORIGINAL.zip` est une piece utilisateur intacte. Elle contient `dobby_le_festin_est_pr_t/code.html`, sa capture `screen.png`, ainsi qu'une illustration cinematographique de Dobby. Ne pas confondre maquette et code directement publiable.
- La vignette de la maquette est presente dans `assets/STITCH_FESTIN_preview.png`.
- A la fin de la cuisson, l'animation se joue dans une MODAL temporaire. **Ne pas fabriquer un message d'enregistrement effectue** : la completion du mode cuisson n'est pas une nouvelle creation de recette.
- Respecter les fichiers localement fournis et eviter d'ajouter un lien CDN externe non fiable. Le plat affiche par Dobby peut rester generique si la photo de cette recette n'est pas disponible ; n'affirmer qu'il s'agit du vrai plat que si l'image vient bien de cette recette.
- Les images transcrites d'une recette et leurs illustrations creees par IA doivent avoir une provenance distincte. Si l'IA ne sait pas creer de ZIP ou d'image, c'est une limite externe, pas un pretexte pour inventer des chemins ou telechargements.

## Contrainte de granularite

Un seul chantier E07.4, mais decoupe en checkpoints :

A. Creation/import et compatibilite.
B. Fiche recette (favoris, methodes, edition, suppression, modal planning).
C. Mode Cuisine (images/ingredients d'etape, minuteurs, modal finale).
D. Integration, regression, publication d'un nouveau sous-repertoire statique.

Les 61 lignes de la matrice sont un gate de completude. La livraison doit presenter 42 corrections a faire, 10 obligations de preservation, 4 decisions remplacees, 5 decisions reportees, avec IDs et preuves. Une ligne en statut BLOQUE ne devient jamais PASS par une simple capture.
