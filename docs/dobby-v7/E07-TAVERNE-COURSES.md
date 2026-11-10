# E07 — Taverne Gourmande et Courses essentielles

Branche : [`feat/dobby-e07-cuisine-courses`](https://github.com/PortenartCo/dobby-demo/tree/feat/dobby-e07-cuisine-courses). Base E05 : `8418682e5094b66ee879fbf18dcd1e6a3b6d5a05`. Worktree indépendant `/workspace/dobby-e07`. Aucun AGENTS.md applicable trouvé. E06 n’a été ni modifié, ni fusionné.

## Sources et dérivation

Le ZIP fourni a été ouvert et vérifié avant modification : SHA-256 `213215ea1b74ea4798c6cd8e5abc55f0b221e895959ffd548c4c60aeacf99037`. Deux HTML, leurs captures et les deux illustrations originales sont conservés dans [design/stitch-e07](../../design/stitch-e07/manifest.json), avec leurs empreintes et chemins d’archive. Les scripts de démonstration sont retirés uniquement des dérivés. Le DESIGN.md joint reste une référence jointe, pas une consigne d’exécution.

| Composition fournie | Routes dérivées |
| --- | --- |
| `dobby_la_taverne_gourmande_version_simplifi_e_rapide/code.html` | `index.html#taverne` |
| `dobby_ma_liste_de_courses_usage_magasin_simplifi/code.html` | `index.html#shop`, `#shop-1`, `#shop-final` |

Les **treize routes Cuisine sont conservées** : quatre utilisent les nouvelles compositions, les neuf autres gardent leurs templates et opérations. Les 53 sources initiales restent intactes dans `design/stitch-53/`. Le recensement historique reste conservé ; les remplacements de présentation sont explicites dans `cuisine-routes.json`, `templates/provenance.json` et les champs `presentation`/`cuisine.e07` du manifeste. Il ne s’agit pas de treize nouvelles sources.

`build-source.cjs` dérive la racine Taverne ; `build-cuisine.cjs` dérive les templates et copie les PNG originaux vers `assets/cuisine/e07-taverne.png` et `e07-courses.png`. Les images Google des maquettes sont remplacées par ces chemins locaux. Les autres images et templates Cuisine restent inchangés. Tailwind existant est recompilé avec les nouvelles sources ; trois utilitaires déjà livrés sont conservés explicitement. Les 1 448 ensembles de règles historiques gardent leurs déclarations/valeurs, avec seulement des utilitaires supplémentaires.

## Code livré et raccordements

La nouvelle couche `cuisine-e07.js/css` clone les composants des sources et utilise les lectures et actions existantes du contrôleur Cuisine. `cuisine-engine.js`, V5, les writers et la synchronisation ne sont pas modifiés.

| Parcours | Opérations raccordées et vérifiées |
| --- | --- |
| Taverne | Dîner réel ou état vide ; durée connue ou non renseignée ; convives et portions natives ; sept journées avec midi/soir ; choix/remplacement, fiche recette, statut « préparé » persistant ; bibliothèque, favoris, ajout de recette et préparation des courses. |
| Préparation `shop` et variante `shop-1` | Ingrédients du moteur et quantités calculées ; « À acheter / Pas nécessaire » ; compléments ajoutés/retirés ; rayons et filtres alimentés par `categoryOf` existant ; validation native, historique et variante conservés. |
| Liste validée | Snapshot natif, catégories enregistrées, cases de 48 px, coche/décoche, progression réelle, rechargement, retour à la préparation, copie/export et historique. Quantité inconnue = « À préciser » ; origine d’un complément affichée séparément. |
| Panier familial | Connexion par le compte existant ; état/messages natifs affichés ; ajout/édition/suppression/coches ; transfert explicite des ingrédients ; synchronisation, hors connexion et choix de conflit existants. Pas de statut « synchronisé » déduit d’une session. |

Les contrôles de préparation ne sont pas présentés comme des achats déjà réalisés. Aucune donnée, recette, date, durée, quantité, priorité ou convive fictif n’est créé. Les rayons de démonstration ne deviennent pas une nouvelle taxonomie : les noms de catégorie proviennent du moteur existant ou du snapshot validé.

Les bandeaux communs, leurs préférences et les cinq destinations restent fournis par `DobbyChrome`. Le bandeau incomplet de la source Courses n’est pas recopié comme second header. Les cartes sont compactes, les libellés longs peuvent revenir à la ligne et les actions du dîner sont séparées du titre pour éviter les chevauchements. Les animations respectent la préférence existante de réduction des mouvements.

## Captures comparatives

Les captures utilisent des profils éphémères et des données `TEST`, jamais des comptes ou données réels. Les références sont les HTML fournis sans leurs scripts de démonstration, rendus avec les polices et illustrations locales. À 1440 px, le cadre 480 px est conservé pour une comparaison cohérente avec DOBBY. Les captures exportées originales restent également dans `design/stitch-e07/`.

| Largeur | Source Taverne | Taverne intégrée | Source Courses | Préparation | Liste validée |
| --- | --- | --- | --- | --- | --- |
| 320 | [Source](evidence/e07/source-taverne-320.png) | [DOBBY](evidence/e07/taverne-320.png) | [Source](evidence/e07/source-shop-320.png) | [DOBBY](evidence/e07/preparation-320.png) | [DOBBY](evidence/e07/validated-320.png) |
| 390 | [Source](evidence/e07/source-taverne-390.png) | [DOBBY](evidence/e07/taverne-390.png) | [Source](evidence/e07/source-shop-390.png) | [DOBBY](evidence/e07/preparation-390.png) | [DOBBY](evidence/e07/validated-390.png) |
| 1440 | [Source](evidence/e07/source-taverne-1440.png) | [DOBBY](evidence/e07/taverne-1440.png) | [Source](evidence/e07/source-shop-1440.png) | [DOBBY](evidence/e07/preparation-1440.png) | [DOBBY](evidence/e07/validated-1440.png) |

Captures complémentaires : `taverne-viewport-*`, `validated-viewport-*`, `empty-taverne-*`, `empty-preparation-*`, `empty-validated-*`, `long-list-*`, et `shop-connected/offline/conflict-320/390.png` dans [evidence/e07](evidence/e07/). [Contrôles visuels E07](evidence/e07/visual-checks.json).

## Vérifications exécutées

Serveur statique local, Chromium, profils temporaires. Trafic externe bloqué ; les parcours familiaux utilisent le client natif contre une API HTTP simulée en mémoire, sans serveur réel.

- Avant modification : `cuisine.cjs` PASS 320/390.
- `e07.cjs` : PASS 320/390/1440, compositions fournies, images locales, dîner vide/renseigné, sept journées, vraies quantités, validation, coche/décoche, rechargement, absence de header doublonné, noms longs, états vides et liste de vingt compléments accessible au-dessus de la navigation.
- `e07-native-actions.cjs` : statut préparé natif/rechargement, durée inconnue, groupes/filtres natifs et quantité inconnue des compléments. Les régressions détectées ont été reproduites avant correction.
- `cuisine.cjs` : les treize parcours natifs PASS 320/390 (recettes, portions, cuisson/TM5, import/édition/export, courses, historique et navigation).
- `cuisine-family.cjs` : PASS 320/390 sur fixture HTTP. Aucun POST dans le panier familial lors de la validation ; quantité fractionnaire, édition, coche hors ligne persistée après rechargement, conflit, choix local, reprise sans duplication de l’article modifié et import volontaire d’un nouveau repas à couvrir.
- `cuisine-visual.cjs` : première passe complète des treize routes à 320/390 et des quatre présentations E07 à 1440, sans débordement. Après corrections, seules les présentations affectées sont relancées aux trois largeurs ; sources initiales et E07 vérifiées par empreinte.
- Smoke des quatre racines PASS 320/390 ; conservation sémantique des anciennes règles Tailwind ; génération reproductible ; fichiers V5/SQL/sources initiales et autres composants E01–E05 inchangés par rapport à E05.

Les journaux sont conservés dans `evidence/e07/test-*.txt`, `review*.txt` et `css-regression.txt`. Le workflow existant est étendu aux sources/tests E07 et à la reproductibilité HTML/CSS/PNG, sans nouveau workflow. [CI de la branche E07](https://github.com/PortenartCo/dobby-demo/actions/workflows/dobby-stitch-v7.yml?query=branch%3Afeat%2Fdobby-e07-cuisine-courses) ; le résultat et le lien de l’exécution du SHA final sont fournis dans la livraison.

## Fichiers et commits

Sources/provenance : `design/stitch-e07/**`, assets locaux et `cuisine-routes.json`. Présentation : `cuisine-e07.js/css`, raccordement minimal dans `cuisine.js`. Construction : `build-source.cjs`, `build-cuisine.cjs`, configuration/CSS Tailwind et sorties générées. Tests : E07, adaptations des preuves Cuisine et des scénarios familiaux, ordonnanceur et workflow existants. Rapport/captures et manifeste d’intégrité complètent la livraison.

Commits de progression : `a0f49dd` (sources/Taverne), `6d15259` (Courses), `9d862e3` (préservation du statut natif et styles). Le commit final de livraison est indiqué dans le compte rendu et l’historique de la branche.

## Limites et intégration future

- Les deux illustrations fournies présentent une variation visible du visage et de la tenue de Dobby. Elles sont utilisées intactes, sans génération d’un troisième personnage. Leur cadrage garde visage, oreilles et buste visibles ; la liste dessinée sur le parchemin reste une illustration décorative.
- La liste des repas est distincte du panier familial. Le module Menus existant peut partager planning, `shopFinal`, historique et choix s’il est activé. La validation ne publie pas automatiquement des lignes dans le panier grocery ; le transfert d’ingrédients reste volontaire.
- Les repas déjà couverts par une liste archivée ne sont pas automatiquement remis dans les besoins par « Modifier la préparation ». C’est le contrat natif conservé, pas une nouvelle règle E07.
- Hors connexion, conflits et persistance sont vérifiés avec des fixtures compatibles. Synchronisation réelle multiappareils, comptes réels, ordre d’actions concurrentes et comportement serveur de production ne sont pas qualifiés par cette recette.
- Recette physique sur iPhone/Safari non effectuée ; les largeurs demandées sont vérifiées dans Chromium. Les adaptateurs Cuisine secondaires ne sont pas redessinés.
- E06 n’est pas intégré : il restera à vérifier l’ouverture Taverne après première connexion, les retours compte/profil et l’activation séparée des modules Menus/panier lors de la convergence. Aucun composant ou branche E06 n’a été modifié.

| Niveau de preuve | État |
| --- | --- |
| Code livré | Branche E07, basée sur E05 uniquement |
| Tests exécutés | Locaux/fixtures et CI du SHA final |
| Intégration vérifiée | Adaptateurs V7 avec moteur fourni dans E05 ; pas de composition E06 |
| Déploiement | Aucun |
| Fonctionnement réel en foyer/magasin | Non revendiqué |

Aucune fusion, publication Pages, migration ou action sur un backend réel. Arrêt pour revue humaine.
