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


## E07.1 — Correctifs de revue

Suite de la branche existante `feat/dobby-e07-cuisine-courses` depuis `914780287c4545e47deed6597f93e36ae6a38647`, sans reprise depuis E05 ni intégration E06/E08. [Demande utilisateur E07.1](E07.1-SPEC.md). Le rapport, les sources et les preuves E07 ci-dessus restent conservés comme historique ; ce chapitre décrit leur correction de présentation.

### Six corrections livrées

| Correction | État et comportement vérifié |
|---|---|
| Header et illustration | Bandeau `DobbyChrome` commun, court libellé réel « Taverne » ; titre « La Taverne Gourmande » sous l’image avec classes communes. Compteur de repas et effet superposé retirés. Cartouche « Cuisine du Logis & Chaudron magique » en bas à droite. PNG, personnage et cadrage antérieurs conservés. Commandes d’effets/sons communes conservées. |
| Dîner | Un seul bouton principal, doré, pleine largeur utile : Voir la recette réelle, ou Choisir un repas si absent. Remplacement disponible depuis chaque entrée du planning ; statut préparé accessible explicitement dans les détails existants du repas (`pick`). |
| Dock | Déjà correctement fixe avant modification : même position en bas de la fenêtre après vrai défilement aux trois largeurs. Aucun changement CSS de son positionnement, de safe-area ou des cinq destinations. Dernier contenu Courses accessible au-dessus du dock. |
| Menus hebdomadaires | Sept jours visibles ; chaque repas enregistré affiche Midi/Soir, nom entier, durée/convives/portions/statut existants, consultation et modification. Deux repas dans la même journée sont deux entrées distinctes. Avec un seul repas, bouton pour ajouter le second ; journée libre, action de planification claire. |
| Grimoire | Mes Recettes et Favoris conservés. Ajouter une recette reprend la même classe source, fond doré, hauteur 52 px, arrondi 12 px, police/graisse et centrage que le bouton du dîner. Chaque bouton occupe 100 % de la zone utile de son propre conteneur. Formulaire `recipe-add` réellement ouvert. |
| Raccordements | Clics réels : recette, bibliothèque complète et filtrée, ajout, choix/remplacement pour le bon jour/créneau, préparé, préparation Courses, ajout d’article, validation, historique et retour. Cinq destinations du dock vérifiées. Aucun nouveau panneau de substitution. |

Les vignettes réutilisent le helper `recipeVisual` et ses champs existants `image`/`photo`. Sur le planning E07 uniquement, image locale de même origine, image raster embarquée ou blob local ; photo absente, externe ou échouée : pictogramme de repas/emoji existant, avec libellé explicite « photographie locale indisponible ». Aucune photographie de démonstration n’est attribuée à une recette réelle, aucun téléchargement/stockage/générateur ajouté. Les vues secondaires conservent le comportement par défaut du helper. Les photos de recette déjà enregistrées restent intactes dans le modèle ; cette mission n’ajoute pas de stockage pour l’import photo du formulaire.

### Statut préparé et contexte du planning

`cooked` réutilise le raccordement préexistant `E.mealAction('status', {date, slot, status:'préparé'})`. La commande est placée dans le bloc de détails du repas enregistré du planning, avec son nom, et devient inactive lorsqu’il est déjà préparé. Elle concerne ce repas enregistré, même si une autre recette est sélectionnée sans sauvegarde ; elle ne suppose jamais que le mode cuisson met à jour ce statut. Midi et soir sont testés séparément après rechargement, avec conservation de l’autre créneau.

Un défaut de reprise a été établi : `#pick` perdait le créneau Midi et le jour choisi au rechargement. Le contrôleur garde maintenant `date` et `slot` dans les paramètres du hash existant ; le parseur et le retour/avance les réutilisent. Aucun nouveau routeur, stockage ou changement du planning métier simplement en consultant un autre jour. Test causal RED→GREEN, incluant changement de date/créneau et retour/avance navigateur.

### Fichiers modifiés

- `cuisine-e07.js/css` : structure ciblée de Taverne, images de repas et deux créneaux, styles des deux boutons ; aucune reconstruction des écrans secondaires.
- `cuisine.js` : helper visuel réutilisé avec option locale pour les nouvelles vignettes, commande préparé dans les détails existants, paramètres de contexte du hash.
- `chrome.js` : condition de libellé court de Taverne uniquement ; géométrie et commandes communes inchangées.
- Tests `e07-1.cjs`, `e07-1-context.cjs`, adaptations de `e07.cjs` / `e07-native-actions.cjs` préservant leurs assertions à la nouvelle destination ; `e05-native.cjs` utilise DOBBY_TEST_ORIGIN pour réellement tester ce worktree. Le test partagé `e01.cjs` attend désormais « TAVERNE » pour cette seule destination ; les assertions de navigation/préférences et les autres noms de sections restent intactes. Ordonnanceur et vérifications syntaxiques CI complétés.

Aucun changement de `cuisine-engine.js`, V5, writers, synchronisation, SQL, sources Stitch ou PNG originaux. E06/E08 ne sont ni modifiés ni intégrés.

### Vérifications et preuves E07.1

[36 captures avant/après et persistance](evidence/e07-1/README.md), [galerie comparative](evidence/e07-1/index.html) à **320, 390 et 1440 px**, avec priorité aux fenêtres mobiles. Les captures avant reproduisent le dernier E07 au SHA 9147802 avec les mêmes fixtures ; les captures historiques `evidence/e07/` restent inchangées dans le commit livré. Les coordonnées du dock sont enregistrées dans `before/checks.json` et les preuves de navigation/persistance dans `after/checks.json`.

| Test | Résultat |
|---|---|
| `e07-1.cjs` | PASS 320/390/1440 : dîner présent/absent, vrais clics, CTA homogènes, photos locales/absentes/échouées/externes, noms longs, 7 jours et deux créneaux indépendants, ajout second repas, préparé Midi/Soir après reload, Courses et 5 destinations, dock pendant scroll |
| `e07-1-context.cjs` | PASS : date/créneau après reload et retour/avance, sans écriture des repas |
| `e07.cjs` | PASS 320/390/1440 : sources E07, états vides, quantités, validation/coches, longs compléments et contenu accessible |
| `e07-native-actions.cjs` | PASS : statut préparé natif/reload depuis sa nouvelle destination, rayons/filtres et quantités inconnues préservés |
| `cuisine.cjs` | PASS 320/390 : treize parcours Cuisine, favoris persistants, édition/import, cuisson/TM5, historique et retours |
| `cuisine-family.cjs` | PASS 320/390 : HTTP simulé, partage explicite, hors ligne, conflit et resynchronisation |
| Tests Node V1/V2/Famille | 80/80 PASS |
| Génération / sources | Reproductible, sources Stitch et PNG inchangés |

[Journaux ciblés](evidence/e07-1/logs/). Les échecs causaux ont été observés avant correction : titre encore dans l’image ; perte du créneau/jour à la reprise ; texte de repli prétendant à tort qu’aucune photo n’était enregistrée alors qu’une photo externe était renseignée. La largeur des CTA est comparée à la zone utile hors padding des parents. [Revue technique indépendante](evidence/e07-1/review.md) : aucun défaut établi, y compris le cas d’une sélection de remplacement non enregistrée avant de marquer le repas préparé.

Campagne générale : les treize premiers scripts passent, puis `e01.cjs` s’arrête sur son ancien libellé long du bandeau Taverne. Le seul nom attendu est adapté au libellé court demandé, E01 repasse, et la campagne reprend à E01 puis poursuit les contrôles restants sans répéter les treize scripts verts. La CI finale exécute les 42 scripts sur le même SHA livré. **42 scripts couverts et réussis : 13 avant l’arrêt, puis 29 après adaptation de l’attente E01 (reprise sortie 0).** [Campagne](evidence/e07-1/campaign.json), [journal initial](evidence/e07-1/logs/general-initial.log), [reprise](evidence/e07-1/logs/general-resumed.log). Aucun autre échec résiduel.

### Commits, SHA livré et CI

Commits du correctif : `76a86f7` (présentation/contexte) et `3a58eaa` (attente E01 et traces de persistance). Le [SHA final de la branche E07](https://github.com/PortenartCo/dobby-demo/commit/feat/dobby-e07-cuisine-courses) résout le commit de livraison contenant ces preuves ; sa valeur exacte et les IDs des exécutions réussies sont fournis dans le bilan final. [CI interface au SHA livré](https://github.com/PortenartCo/dobby-demo/actions/workflows/dobby-stitch-v7.yml?query=branch%3Afeat%2Fdobby-e07-cuisine-courses) · [CI native au SHA livré](https://github.com/PortenartCo/dobby-demo/actions/workflows/dobby-sync-regression.yml?query=branch%3Afeat%2Fdobby-e07-cuisine-courses). Aucun nouveau commit de métadonnées ne doit invalider le SHA après ces contrôles.

### Limites et niveau de preuve

Code livré et intégration locale avec le moteur E07 existant ; tests réussis sur profils Chromium éphémères et fixtures, sans comptes familiaux réels. Aucun comportement serveur de production, usage multiappareils réel ou recette physique iPhone/Safari revendiqué. Photos externes du planning remplacées par un pictogramme ; aucune promesse de cache privé nouveau. Commandes secondaires décoratives restantes des sources sont inactives et explicitement identifiées par le mécanisme existant.

Aucune fusion, publication Pages, modification Supabase ou donnée familiale réelle. Arrêt après livraison pour revue humaine.
