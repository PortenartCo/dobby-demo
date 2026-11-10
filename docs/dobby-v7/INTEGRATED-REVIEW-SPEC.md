# CODEX — DOBBY : intégration complète E01 à E08

**MODE : EXÉCUTION — Mission prioritaire de convergence.**

## Objectif

Assembler toutes les pages DOBBY reconstruites E01 à E08 dans **une seule application interactive**, permettant enfin une revue visuelle et fonctionnelle globale.

Ne jamais réintroduire l'ancien raccordement insatisfaisant des 53 maquettes Stitch comme substitut aux pages reconstruites.

## Branche de travail

Dépôt : `PortenartCo/dobby-demo`

Branche d'intégration déjà créée :
`feat/dobby-e01-e08-review-integration`

SHA de départ :
`e0e88a06485018f5e94eb4aeae886cacbf41c67b`

Lire en priorité :
`docs/dobby-v7/REVIEW-CONSOLIDATION.md`

Consulter les éventuels `AGENTS.md` applicables.

### Versions à réunir

- E01/E02 : socle déjà présent.
- E03 Missions : `6a86ead6341eb2f17e7552852621c21f496ad97c`
- E04 Nouvelle Mission + runes : déjà dans la filiation d'E05.
- E05 Profil magique : déjà présent.
- E06 Onboarding : `1a71f9608dd29514e8fdc5743f7041aeccf5c4ab`
- E07.2 Taverne et Courses : base `bba5b0255acc4834dbd54303df66c61decbed546`
- E08 Contrats : `cb937d48d136561c826a2adc707692fb00c6faf1`

Ne pas modifier les branches sources.

## Phase 1 — Intégration du code

Porter les changements spécifiques d'E03, E06 et E08 sur la branche d'intégration.

Attention aux fichiers communs, notamment :

- `chrome.js`
- `family.js`
- `family-engine.js`
- `bridge.js`
- `build-source.cjs`
- `register.css`
- `documents-register.js`
- `missions.js`
- `root-adapters.js`
- `index.html` et `famille.html`

Ne pas appliquer aveuglément des versions complètes de ces fichiers depuis les anciennes branches.

Résoudre les conflits par fonctionnalité, en préservant les comportements existants.

Effectuer des checkpoints après chaque module, avec tests ciblés.

## Phase 2 — Vérification des parcours

Vérifier que les véritables pages reconstruites sont accessibles et fonctionnelles :

1. Accueil → Missions → Nouvelle Mission → attribution → enregistrement → runes.
2. Famille → Profil magique → Maison → questionnaire E06 → résultat → confirmation.
3. Profil magique → Patronus → questionnaire E06 → résultat → confirmation.
4. Taverne → menus → recettes → liste de courses unique → retour.
5. Famille → Contrats et Assurances → fiche → consultation/modification.
6. Parler à Dobby → commandes natives prises en charge → destination réelle.

Chaque bouton visible doit avoir une destination ou une action vérifiable.

Pour les fonctions volontairement indisponibles, afficher un état explicite sans simuler une réussite.

Vérifier les liens directs, l'historique navigateur, le rechargement et les données persistantes.

**Ne pas afficher une ancienne page générique lorsqu'une page reconstruite existe.**

Les fonctionnalités familiales ne faisant pas encore partie du montage page par page doivent rester clairement identifiées comme non validées, sans être présentées comme terminées.

## Phase 3 — Démonstration intégrée

Produire un nouvel aperçu autonome dans :

`essai-dobby-integrated-review/`

Réutiliser le mécanisme d'aperçu isolé E07.2.

Données fictives, stockage séparé, aucune connexion ni mutation Supabase de production.

L'aperçu doit permettre :

- La navigation complète entre E01 et E08.
- La création et la modification de données fictives.
- La persistance après rechargement.
- La réinitialisation de la démonstration.
- Le test des boutons et formulaires.

Ne pas remplacer l'aperçu E07.2 existant.

Après réussite des contrôles, publier exclusivement ce nouveau dossier statique via le mécanisme GitHub Pages existant. Si une modification d'infrastructure ou des réglages est nécessaire, arrêter cette seule étape.

Aucune fusion des branches applicatives dans `main`.

## Phase 4 — Recette

Tester les parcours précédents à 320, 390 et 1440 px.

Exiger :

- Navigation effective, et pas seulement liens présents.
- Aucun écran reconstruit remplacé par une ancienne interface.
- Formulaires et données persistants.
- Absence de doublons ou d'écrasement.
- Aucune erreur JavaScript bloquante.
- Compatibilité des boutons et du dock.
- Conservation des versions validées d'E07 et E08.
- Contrôle de l'isolation des données fictives.

Commencer par les tests d'intégration ciblés, puis une campagne finale de non-régression. Ne pas relancer inutilement les tests déjà valides sans changement pertinent.

Vérifier ensuite l'URL hébergée : chargement, ressources, navigation et clics réels.

Une CI verte seule ne constitue pas une validation de l'aperçu publié.

## Livrables

1. Branche d'intégration poussée avec SHA final.
2. Inventaire des pages réellement intégrées.
3. Liste des fonctionnalités encore indisponibles.
4. Résultats des tests et CI.
5. Nouvelle URL interactive vérifiée.
6. Captures à trois largeurs.
7. Rapport court des conflits résolus et éventuels écarts.

Conserver le registre de revue existant. Les corrections graphiques qui y figurent ne doivent pas être oubliées, mais elles ne doivent pas retarder l'assemblage s'il ne s'agit pas de défauts bloquants.

**DONE : une seule URL permettant de parcourir et de tester toutes les pages reconstruites E01 à E08, sans anciennes interfaces substituées.**

Arrêt pour revue utilisateur après livraison. Aucune publication officielle, migration SQL ou modification des données familiales réelles.