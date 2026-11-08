# DOBBY V6 — Mission 1 : plan d’exécution

**Objectif :** harmoniser la présentation de la V5 familiale autour de la Taverne Stitch, sans toucher aux writers, à l’authentification, aux schémas ou aux données connectées.

**Architecture :** HTML/JavaScript/CSS existants, complétés par une feuille centrale et un adaptateur DOM de présentation chargé après les modules. Les références d’événements, identifiants et gestionnaires métier restent ceux de la V5. Aucun framework ajouté.

**Spécification :** mission fournie dans « Texte collé.txt » ; référentiel graphique fourni et écran maître `dobby_la_taverne_gourmande_repas_menus`.

**Base vérifiée :** `94dfdd5ce1af177a5a07b2425344f2c3f1d280f6`, branche isolée `codex/dobby-v6-mission-1` ; aucun AGENTS.md dans ce dépôt. Le dépôt Portenart-Platform présent à côté est indépendant.

## Contraintes communes

- Préserver intégralement `index.html` et les modules family-* ; charger la présentation depuis le chargeur Stitch.
- Une seule palette, une échelle typographique, des composants partagés ; quatre racines Traverse/Missions/Taverne/Famille.
- Scènes explicitement fournies dans les HTML Stitch, téléchargées comme ressources locales ; aucun contenu de démonstration ajouté aux données.
- Animation cheminée et Maison/Patronus exclus. Aucun déploiement, fusion ou accès à un vrai foyer pendant les contrôles.

## Points de revue

- Les rendus directs de documents/équipements doivent recevoir la même présentation que `render()`.
- Les formulaires ouverts en modale conservent leurs champs, validation et actions Annuler/Enregistrer.
- Les titres longs et les actions passent sur plusieurs lignes à 320 px, sans masquer le contenu.
- Les quatre illustrations affichent leur cadrage complet ; un seul titre H1 par vue, aucun hero sur formulaire.
- Réouverture Documents/Missions, stockage local et conflits de synchronisation : suites existantes inchangées.

## A — Audit et fondations

- [ ] Inventorier les 53 HTML : routes existantes, variante retenue et capacités absentes.
- [ ] Capturer la V5 avant modification à 390/430 px et quelques formulaires.
- [ ] Créer `dobby-v6.css`, tokens et ressources locales avec provenance.
- [ ] Vérifier les 54 tests existants ; commit A.

## B — Coquille commune

- [ ] Ajouter `dobby-v6.js` après le dernier module, sans changer `index.html`.
- [ ] En-tête partagé : menu/retour à gauche, cartouche DOBBY/rubrique au centre, accès au compte familial à droite.
- [ ] Barre de navigation commune à quatre entrées et menu général existant.
- [ ] Contrôler ouverture/fermeture menu, compte et retour ; commit B.

## C — Écrans principaux

- [ ] Taverne, puis Traverse, Missions et Famille : hero partagé, titre et citation séparés, actions réelles conservées.
- [ ] Conserver les panneaux dynamiques Agenda/Missions/Santé et leurs branchements.
- [ ] Vérifier 390/430 px et l’absence de titre/illustration en double ; commit C.

## D — Vues secondaires

- [ ] Appliquer les tokens partagés aux cartes, onglets, champs, messages et boutons de toutes les vues et modales.
- [ ] Uniformiser icônes et variantes primaire/secondaire/destructive sans modifier les attributs métier.
- [ ] Vérifier recettes/cuisine/TM5, documents/mémos, équipements/historique, contacts/listes/santé, imports, recherche et compte.
- [ ] Tests navigateur des formulaires et rendus directs ; commit D.

## E — Recette et livraison

- [ ] Exécuter le workflow local : syntaxe, tests Node, browser-smoke, bootstrap-smoke.
- [ ] Exécuter `node essai-stitch-v5-famille/tests/visual-audit.cjs` à 320/390/430 px et desktop 1280 px ; examiner les captures et corriger.
- [ ] Publier preuves avant/après, couverture des vues, limites et retour arrière dans `docs/dobby-v6/`.
- [ ] Revue du diff, commit E, push de la branche et PR de revue ; observer CI. Aucune fusion ni publication.

## Journal

- Cadrage : exécution directe autorisée explicitement par la mission ; pas de nouvelle validation du design.
- Baseline : 54/54 tests Node passent. HEAD conforme à la référence fournie.
- Choix : couche additive pour préserver l’égalité de `index.html` contrôlée par le test d’intégration existant.
