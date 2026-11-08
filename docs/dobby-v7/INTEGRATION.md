# DOBBY V7 — Intégration réelle des exports Stitch

## Point de départ et statut précis

- Archive originale fournie le 8 novembre 2026 : `stitch_dobby_assistant_mobile_app(2).zip`.
- **53 HTML Stitch originaux préservés intégralement** dans `design/stitch-53/<slug>/code.html` ; **15 captures originales** et empreintes SHA-256 dans `design/stitch-53/manifest.json`.
- **4 écrans principaux intégrés visuellement et reliés aux données réellement accessibles** : Taverne, Traverse, Missions, Famille. Leurs HTML fonctionnels de départ proviennent directement des 4 sources Stitch, non d'un re-skin de l'ancienne V5. Voir `essai-stitch-v7/route-manifest.json`.
- **49 sources restantes importées mais NON INTÉGRÉES fonctionnellement**. L'import des HTML ne doit jamais être comptabilisé comme une intégration. La couverture fonctionnelle sera étendue par domaine, à partir de ce registre et des contrats V5 existants.

## Raccordement fonctionnel effectivement réalisé

Le pont `essai-stitch-v7/bridge.js` relit les données de la V5 depuis un iframe local de même origine et les présente dans la composition Stitch ; aucun nouveau stockage ni writer. L'iframe devient visible lorsqu'une action renvoie à un module métier V5 encore non refait selon Stitch, afin de conserver la fonction plutôt que d'afficher un faux formulaire. La fermeture du panneau actualise les cartes V7. Cette transition est temporaire et reste visuellement imparfaite sur ces sous-écrans.

| Écran V7 | Source Stitch | Données et actions raccordées | Limites |
|---|---|---|---|
| `index.html` | `dobby_la_taverne_gourmande_repas_menus` | repas du jour, semaine, vraies recettes, ingrédients, panier issu de `shoppingDraft`, détails recette, planning et accès courses | illustrations des plats encore emoji V5 quand aucune photographie réelle n'est associée ; sous-écrans en V5 |
| `traverse.html` | `dobby_l_choppe_du_chemin_de_traverse` | repas du jour, missions, événements familiaux, navigation, conversation | fonctions secondaires encore via moteur V5 |
| `missions.html` | `dobby_la_biblioth_que_des_missions_t_ches_magiques` | missions manuelles/automatiques distinctes, membres, formulaire de création V5, navigation | filtres Stitch fictifs neutralisés ; gestion fine via V5 |
| `famille.html` | `dobby_le_salon_des_curiosit_s_famille_organisation` | membres, agenda, rendez-vous partagés, notes, raccourcis et formulaire événement V5 | autres fiches via V5 |

Les données d'exemple inventées par Stitch ont été retirées des cartes actives. Les libellés trompeurs « AES-256 » ainsi que la météo et les nombres fictifs ont été neutralisés. La palette, le héros, la hiérarchie et les modules visuels viennent des HTML Stitch. CSS Tailwind construit localement, polices locales, aucun CDN de script requis.

## Tests

- Tests navigateur : `DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 node essai-stitch-v7/tests/smoke.cjs` après démarrage d'un serveur HTTP racine et `npm ci --ignore-scripts --prefix essai-stitch-v5-famille/tests` (Playwright est uniquement une dépendance de test).
- 4 écrans × 320 et 390 px : navigation, héros, H1 unique, absence de débordement et d'exceptions JS ; 8 captures dans `docs/dobby-v7/evidence/`.
- Mutation d'un repas dans le profil navigateur éphémère puis vérification du rafraîchissement Stitch, action détail recette (`st.detail`), formulaire mission et événement V5.
- Pas d'essai sur les comptes de la famille ni de transfert Supabase réel. Pas de modification SQL. Aucun changement de la V5 publiée.

## Progression à venir

Partir de `route-manifest.json` et de `docs/dobby-v6/ecrans-stitch.md`. Raccorder les 49 autres sources en priorité : recettes/menus/courses ; archives/contrats/équipements ; famille/santé/contacts/listes ; missions/agenda ; imports/conversation. Pour chaque page : (1) reprendre directement son vrai HTML Stitch, (2) injecter les données V5 existantes, (3) brancher les actions réelles, (4) comparer les captures, (5) garder le repli V5 explicite seulement tant que la fiche n'a pas son habillage définitif. Les variantes `_1`/`_2` restent cataloguées ; choisir explicitement la variante de référence avant d'unifier.

**Il est interdit d'annoncer « 53 pages intégrées » avant que 53 lignes du manifeste aient des preuves fonctionnelles vérifiables.**
