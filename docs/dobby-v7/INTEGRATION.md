# DOBBY V7 — État réel de l’intégration Stitch

Le lot Cuisine poursuit la PR #3, branche `feat/dobby-stitch-53-source-backed-v7`, depuis `08f66ce`. La mission 2A poursuit ce travail depuis `cb440793cc04079cd472a3cd1d8fcf3e14c1f84b`. Les 53 HTML originaux et leurs empreintes restent inchangés dans `design/stitch-53/`.

## Couverture vérifiée

**13 sources Cuisine sont intégrées fonctionnellement**, avec leurs variantes de formulaire et de préparation. La Taverne appartenait déjà aux quatre racines intégrées : le lot Cuisine portait le total à 16 sources actives. La mission 2A ajoute sept compositions Famille/Agenda/Santé : **23 sources actives sur 53, dont 5 partielles**, et **30 sources importées sans raccordement fonctionnel**. Hors des parcours Cuisine et 2A, les domaines conservent leur raccordement précédent et leur repli V5 pour les sous-écrans restants. Lors du lot Cuisine, les 40 autres sources n’ont pas été réauditées. La mission 2A traite uniquement ses sept sources explicitement demandées ; elle ne réaudite pas Cuisine.

Le registre exact est [route-manifest.json](../../essai-stitch-v7/route-manifest.json) : 23 templates actifs, dont 18 fonctionnels et 5 partiels ; les adaptateurs partiels sont identifiés séparément. Les états `verified-functional` renvoient aux tests et aux captures ; une simple importation reste `source-only`. Chaque variante est une route utilisable, issue de son propre HTML, et partage les mêmes actions métier que sa variante de référence.

| Route dans `essai-stitch-v7/index.html` | HTML Stitch (identifiant abrégé) | Opérations effectivement raccordées |
|---|---|---|
| `#taverne` | `dobby_la_taverne_gourmande_repas_menus` | dîner, semaine, données des repas et recettes, statut préparé, accès choix/grimoire/courses |
| `#pick` | `dobby_choisir_un_repas_nombre_de_convives` | date, midi/soir, adultes/enfants, sélection réelle, préférences, enregistrement, déplacement et annulation |
| `#recipes` | `dobby_grimoire_des_recettes_favoris_du_logis` | bibliothèque native, recherche, filtres réels, favoris, fiche, ajout, import/export |
| `#recipe?id=…` | `dobby_fiche_d_taill_e_d_une_recette` | ingrédients et étapes, portions, vérification des ingrédients, favoris, planification, copie/édition, cuisine, TM5 |
| `#cook?id=…` | `dobby_mode_cuisine_tape_par_tape` | étapes réelles, précédent/suivant/terminer, accès direct à une étape, minuteur manuel, ingrédients |
| `#tm5?id=…` | `dobby_adaptation_thermomix_tm5` | adaptation manuelle native, instructions/accessoire/durée/température/vitesse/sens inverse, vérification obligatoire, consultation et modification |
| `#recipe-add-1` | `dobby_ajouter_une_recette_manuellement_1` | formulaire fonctionnel, ingrédients, étapes modifiables, portions, catégorie, mode ; sauvegarde native |
| `#recipe-add` | `dobby_ajouter_une_recette_manuellement_2` | même contrat, barre d’enregistrement de cette seconde source ; saisies conservées entre variantes |
| `#batch` | `dobby_importer_un_lot_de_recettes_json` | fichier, schéma DOBBY réel, validation, erreurs/avertissements, arbitrage des doublons, confirmation et import/export d’exemple |
| `#shop-1` | `dobby_pr_parer_la_liste_de_courses_1` | besoins natifs, acheter/pas nécessaire, autres achats, validation, panier commun, variante distincte |
| `#shop` | `dobby_pr_parer_la_liste_de_courses_2` | mêmes actions, filtres par rayon, ajout/retrait, historique ; retour à la liste courante si déjà validée |
| `#shop-final` | `dobby_liste_de_courses_valid_e` | liste arrêtée native, coches persistées, progression, copie/export, modification de la préparation |
| `#shop-history` | `dobby_historique_des_listes_de_courses` | archives réelles, consultation, reprise des articles, nouvelle préparation, export des archives sans purge |

## Mission 2A — Famille, Agenda et Santé

Les sept HTML demandés sont désormais utilisés dans les parcours Famille. **Deux sources ont le statut `verified-functional`** (membres et agenda) ; **cinq ont le statut `verified-partial`** (formulaire membre, rendez-vous médical, les deux carnets et historique/contacts), car les rôles/photos/notes de membre, les constantes/vaccins/antécédents cliniques structurés, rappels, pièces jointes et archivage n’ont pas tous de gestionnaire natif. Les opérations natives de lecture/CRUD sont raccordées dans leurs cadres Stitch ; les fonctions absentes restent explicitement indisponibles.

Les personnes utilisent le registre `familyMembers` existant. Les fiches `famHealth` restent locales, les `familyEvents` restent ordinaires et les `sharedHealthVisits` restent volontaires avec activation native du module Famille. Aucune fiche individuelle n’est copiée dans les deux registres partagés. Les tests inspectent aussi les écritures du client natif contre une API uniquement simulée en mémoire.

Les contrats exacts, règles de compatibilité, limites et tests sont dans [FAMILY-2A.md](FAMILY-2A.md). Preuves : [index des comparaisons](evidence/family-2a/README.md), [galerie](evidence/family-2a/index.html), [contrôles](evidence/family-2a/checks.json). Il y a 28 captures source/interface, 14 états vides et 6 états de partage/hors ligne/conflit ; les illustrations originales inaccessibles et les substituts sont déclarés.

Les changements du pont partagé justifient les 54 régressions communes, le smoke des quatre racines et la CI existante. Les nouveaux parcours disposent de `npm run test:family --prefix essai-stitch-v7/tests`. Aucun réaudit Cuisine, aucune manipulation des comptes réels, aucune modification des fichiers V5/SQL/Supabase, fusion ou publication.

## Sources et moteur

`build-source.cjs` appelle `build-cuisine.cjs`, qui dérive les templates des vrais HTML Stitch. La structure, les classes, les scènes et les cartes proviennent de ces sources. Les scripts de démonstration et les handlers inline sont remplacés par les adaptateurs V7. Les composants répétables sont clonés depuis chaque template puis alimentés par le moteur, plutôt que réinventés dans une nouvelle interface. Les empreintes originales sont conservées dans `templates/provenance.json`. La génération est contrôlée en CI.

L’iframe V5 de même origine reste le **moteur masqué unique** : état `st`, bibliothèque `BASE + custom`, calculs de portions/quantités, `shoppingDraft`, validation de recettes/imports, actions et writer `save()`, modules familiaux et gestion des conflits. Aucun nouveau stockage, aucune nouvelle base, aucun framework ajouté. Les saisies transitoires et le minuteur restent en mémoire de l’interface. Les modifications de recettes personnalisées réutilisent la validation native puis le writer existant, en conservant l’identité et les favoris.

Aucun écran Cuisine ne rend le panneau V5 visible pour ses opérations. Le compte/foyer et les domaines hors lot peuvent encore l’utiliser. Les liens directs et l’historique navigateur restent dans le parcours Cuisine. Une destination Cuisine choisie dans un menu V5 secondaire revient également à son écran Stitch. La navigation générale de la Taverne demeure accessible ; les sous-écrans conservent leurs retours et barres d’action Stitch.

Le panier local des repas et le panier familial restent deux périmètres distincts. Le second utilise les vrais handlers familiaux : connexion, ajout, édition, suppression existante, coche, import volontaire des ingrédients, synchronisation, états d’attente et choix de conflit. La validation locale ne publie pas automatiquement les courses. Aucun writer familial ni règle de transfert n’a été remplacé.

## Fidélité et écarts explicites

Les comparaisons de chaque écran sont dans [l’index des preuves](evidence/cuisine/README.md), avec une [galerie avant/après](evidence/cuisine/index.html) et [les contrôles navigateur](evidence/cuisine/checks.json). « Avant » désigne le HTML Stitch de référence rendu sans ses scripts fictifs, avec CSS/polices et ressources locales ; « après » désigne le parcours intégré utilisant un profil de test éphémère. Les données affichées dans ces preuves sont des fixtures identifiées, **pas les données ni les comptes réels du foyer**.

Écarts significatifs et assumés :

- **Deux URL d’illustration Stitch sont inaccessibles** : elles redirigent vers une page de connexion Google, pas une image. Elles sont utilisées par choix repas, ajout variante 2, import JSON, préparation variante 2 et liste validée. Une illustration originale disponible de la Taverne les remplace, dans les références rendues comme dans l’interface. La provenance indique les URL manquantes et la substitution (`assets/cuisine/provenance.json`). Cela constitue une limite visuelle, pas un chargement réussi de l’illustration manquante. Les scènes originales disponibles sont conservées localement, y compris celle de TM5. L’image d’origine du mode Cuisine contient des instructions fictives déjà incrustées dans ses pixels : un cadrage CSS central masque ces inscriptions, sans modifier le fichier source.
- Les photos fictives des plats ne sont pas présentées comme photos des recettes DOBBY : image réellement associée si disponible, sinon visuel emoji du moteur. Les grands cadres photo Stitch sont conservés. La bibliothèque native inclut les recettes déjà présentes dans DOBBY ; aucun nom ou ingrédient inventé par Stitch n’y est ajouté.
- Coût, difficulté, stocks disponibles, délais et réglages TM5 ne sont pas inventés. Les badges et promesses de chiffrement, de stockage exclusivement local ou de certification sont neutralisés. Le moteur ne contient qu’une durée totale : le formulaire additionne préparation et cuisson dans ce champ existant ; il ne crée pas deux durées persistées.
- Les étapes classiques préremplissent l’éditeur d’adaptation TM5, sans conversion automatique. Les paramètres sont saisis et vérifiés par l’utilisateur. Une recette déjà destinée au TM5 se modifie depuis sa fiche ; elle n’est pas soumise au writer natif d’adaptation des recettes classiques. Le minuteur Cuisine est manuel, sans durée de cuisson déduite arbitrairement.
- La pièce jointe du formulaire manuel reste une référence temporaire explicitement non enregistrée : aucun OCR, stockage ou transfert supplémentaire n’est simulé. Le format JSON illustratif de Stitch a été remplacé par le véritable format validé par DOBBY.
- Le moteur natif renvoie un résultat JSON invalide sans tableau `warnings`, alors que sa vue le suppose présent. L’adaptateur réutilise ce validateur et normalise le tableau manquant avant le rendu natif. Le fichier V5 n’est pas modifié.
- Les puces décoratives sans contrat métier sont masquées ; les contrôles réellement raccordés demeurent utilisables. Le bouton de purge de la maquette devient un export explicite sans effacement. Les contrôles supplémentaires de modification et de partage reprennent les cartes et la palette Stitch. Les champs sont adaptés à 320 px ; les animations respectent `prefers-reduced-motion`.

## Vérification et reproduction

Depuis la racine, démarrer `python3 -m http.server 8765 --bind 127.0.0.1`, puis :

```sh
npm ci --ignore-scripts --prefix essai-stitch-v7/tests
node essai-stitch-v7/build-source.cjs
node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs
CHROMIUM_PATH=/usr/bin/chromium npm test --prefix essai-stitch-v7/tests
```

`CHROMIUM_PATH` peut pointer vers le Chrome/Chromium local. Playwright reste une dépendance de test uniquement.

- **54 tests existants : 54 réussis, aucun échec.** Couverture des modules, menus/recettes, persistance, synchronisation, conflits, accès et protection des données précédentes.
- `smoke.cjs` : les quatre racines à 320/390 px, données et rafraîchissement réels, navigation Cuisine, accès aux formulaires Missions/Famille, pas d’exception JS.
- `cuisine.cjs` : à 320/390 px, repas → recette → courses ; coefficient enfant natif `0,65`, quantité inconnue, favoris et recharge, export de la seule recette sélectionnée au format natif réimportable, vraies étapes sans étapes fictives résiduelles, TM5 et confirmation, choix acheter/pas nécessaire, variantes de préparation et de saisie, ajout/édition persistés, import JSON invalide/valide, historique et modification, déplacement et annulation d’un repas.
- `cuisine-family.cjs` : vrai client familial et vrai stockage natif dans un profil éphémère, API simulée uniquement en mémoire ; connexion, ajout, quantité décimale, édition, coche hors ligne, conflit concurrent et résolution, reprise de synchronisation, import volontaire des ingrédients, à 320/390 px. Modules optionnels absents de cette fixture signalés par la réponse simulée, sans service réel.
- `cuisine-visual.cjs` : 13 sources × 2 largeurs, 52 captures comparatives ; origine du DOM et empreintes, H1 unique, chargement des illustrations disponibles/substituées, absence des données fictives identifiées, absence de contrôles débordants et d’exception JS. Six captures supplémentaires documentent le panier connecté, hors ligne et en conflit.
- CI V7 : syntaxe, génération reproductible, les 54 régressions et les quatre scripts navigateur, puis archivage des preuves. Le workflow ne déploie rien.

Les échecs intermédiaires de raccordement (soumission interceptée par l’ancien pont, sélecteur de structure TM5, étapes fictives imbriquées, collisions des barres fixes, assertions asynchrones et illustrations indisponibles) ont été corrigés et les suites relancées. Les deux illustrations originales indisponibles restent l’écart non résolu ; leur remplacement exact nécessite les fichiers sources accessibles. Aucun test sur les comptes réels, aucune modification Supabase/SQL, aucun effacement de données, aucune modification de la V5 publiée, aucune fusion ni aucun déploiement.
