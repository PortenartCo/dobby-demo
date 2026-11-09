# E01 — Contrat permanent de l’accueil

Périmètre : essai `essai-stitch-v7`, PR #3, branche `feat/dobby-stitch-53-source-backed-v7`. Base : `cc1519b926e6e73cba14ac2659fa5df05d66dadb`. Aucun développement des fonctions secondaires, changement SQL/Supabase, effacement de données, modification de la V5 publiée ou de `essai-v7-preview`, fusion ou déploiement.

## Composition et navigation

L’accueil conserve les sections et les cartes du HTML `design/stitch-53/dobby_l_choppe_du_chemin_de_traverse/code.html`. `home.js` clone ces compositions et remplace leurs exemples par des données natives ou des états vides. Les barres sont dérivées du même HTML par `build-source.cjs` dans `chrome-source.html` ; aucune nouvelle maquette. Le cinquième onglet utilise le traitement du quatrième et le symbole `more_horiz`. Les pages gardent une largeur maximale de 480 px sur ordinateur, sans refonte de bureau.

La barre supérieure reste visible : étoile = effets visuels uniquement ; haut-parleur = sons et vibrations ; personnage = compte. Les deux préférences indépendantes sont enregistrées dans `st.stitchPreferences` par le `save()` natif, dans la clé DOBBY existante, sans second stockage. Le son est désactivé par défaut. Aucun microphone. `prefers-reduced-motion` prime sur les effets activés. Les vibrations sont conditionnelles à l’API du navigateur.

La barre inférieure reste visible sur les pages liées : Traverse, Missions, Taverne, Famille, Menu. La destination active porte `aria-current="page"`. Menu ouvre `famille.html#menu`. Les titres et actions contextuels du HTML source (retour, enregistrement, étape de cuisine) sont conservés au-dessus du contenu lorsqu’ils occupaient l’en-tête. Les actions fixes et la zone de conversation sont positionnées au-dessus de la navigation, avec une réserve de défilement adaptée. Les deux barres encadrent aussi le panneau natif du compte, dont la navigation V5 interne est masquée uniquement dans cette intégration. La navigation attend la fin des opérations natives déjà en cours avant de quitter une page. Les adresses réelles des cinq onglets sont restaurées après chaque rendu, y compris pour une ouverture dans un nouvel onglet.

## Journée et données

- Ouverture et retour à l’accueil : aujourd’hui, dans le fuseau local du navigateur. Sept boutons, d’aujourd’hui à J+6 inclus ; aucune date passée. La sélection reste en mémoire de présentation seulement ; elle ne modifie pas `st.day` du planning.
- Missions manuelles : échéance égale au jour choisi ; celles sans échéance sont disponibles aujourd’hui. Automatiques : date native `due` égale au jour choisi, hors tâches obsolètes. Aucun plafond. Terminées conservées dans la liste et les compteurs. Les deux modèles restent distincts.
- Le V vert termine la mission via le gestionnaire natif et ne déclenche pas l’ouverture de la carte. Une mission terminée ne propose pas de deuxième validation. La bibliothèque conserve sa commande de réouverture manuelle.
- Repas : entrée réelle `planned[jour + '-soir']`, sauf repas annulé, et recette par identifiant réel. Sinon état vide et choix du repas pour cette date. Les libellés Feu/Difficulté restent « Non renseigné », car le moteur n’enregistre pas ces deux données.
- Gazette : projection native `DobbyFamilyAgenda.upcoming()` (types événement/rendez-vous), sans limite de cartes : tous les événements familiaux et rendez-vous médicaux déjà volontairement partagés de la date sélectionnée, classés par heure (journée entière d’abord), puis titre. Les fiches médicales individuelles locales restent dans leur registre d’origine. Aucune copie ni nouveau partage. Consultation et édition passent par Agenda.
- Suppression complète du « Sceau de protection locale DOBBY », sans remplacement.
- Politique d’ouverture V7 : `engine-policy.js` renseigne uniquement le drapeau natif `demoInitialized` avant l’initialisation V5 lorsque le planning est vide et que ce drapeau manque. Cela empêche l’ajout automatique des trois repas de démonstration ; tous les champs et repas déjà enregistrés sont conservés. Les anciens repas persistés ne possèdent pas de marqueur d’origine fiable : ils ne sont ni effacés ni arbitrairement reclassés.

## Table de raccordement

| Élément | Route exacte | Comportement | Vérification |
|---|---|---|---|
| Étoile | page courante | Bascule les effets seulement, mémorisation native | E01 : indépendance, rechargement, changement de page, réduction des animations |
| Haut-parleur | page courante | Bascule sons et vibrations seulement | E01 : indépendance et mémorisation ; aucun accès micro |
| Personnage | panneau natif « Compte et foyer » | Compte existant ; retour à l’écran précédent, barres visibles | E01 : ouverture/fermeture, état déconnecté |
| Traverse | `traverse.html` | Aujourd’hui à chaque retour | E01 : onglet et retour navigateur |
| Missions | `missions.html` | Bibliothèque Stitch existante | E01 : destination, état actif et retour |
| Taverne | `index.html` | Taverne Stitch existante | E01 : destination, état actif et retour |
| Famille | `famille.html` / `famille.html#salon` | Salon Stitch existant | E01 : destination, état actif et retour |
| Menu | `famille.html#menu` | Menu global Stitch existant | E01 : destination, état actif et retour |
| Jour | accueil, sélection locale J à J+6 | Actualise les trois registres sans changer le planning natif | E01 : bornes, filtrage, états vides |
| Mission manuelle | `famille.html#mission-edit?record=<id>` | Fiche/formulaire Stitch de la mission réelle | E01 : identifiant, titre et retour |
| Mission automatique équipement | `famille.html#equipment?record=<originId>` | Fiche Stitch de la source native de cette mission | E01 : source/identifiant ; écart ci-dessous |
| Mission automatique document | `famille.html#document?record=<originId>` | Fiche Stitch du document source | E01 : source/identifiant ; écart ci-dessous |
| V vert | accueil | Validation native, persistance, aucun changement de route | E01 : manuelle et automatique ; rechargement |
| Ajouter | `famille.html#mission-edit` | Création existante | E01 : formulaire sans identifiant |
| Festin prévu | `index.html#recipe?id=<id>` | Fiche Stitch de la recette réelle | E01 : identifiant et contenu |
| Festin vide | `index.html#pick?date=<jour>` | Choix existant pour le jour sélectionné | E01 : date reçue |
| Gazette | `famille.html#agenda?day=<jour>` | Agenda existant ; aucune édition dans l’accueil | E01 : chronologie, filtrage et route |
| Parler à Dobby | `famille.html#chat` | Commandes textuelles existantes ; aucune écoute automatique | E01 : route et contrôle vocal inactif |

## Écarts explicites

Aucune maquette Stitch dédiée au profil de compte n’existe parmi les 53 sources. Le personnage ouvre donc la vue native Compte et foyer, adaptée aux réglages et à la connexion existants ; aucune page de profil inventée.

Il n’existe pas de fiche autonome de mission automatique dans le moteur ou les sources. Sa carte ouvre la fiche Stitch de l’équipement ou du document qui l’a produite, par `originId`. La validation se fait dans l’accueil ou la bibliothèque. Aucune fiche métier supplémentaire n’est simulée.

## Preuves et résultats

- `node essai-stitch-v7/tests/e01.cjs` : PASS à 390 × 900 et 1440 × 900, plus un contexte sans réduction des animations. Les contrôles comparent aussi les classes des véritables cartes HTML originales et vérifient les deux barres sur chaque route visitée.
- Missions : huit manuelles et deux automatiques natives dans la journée de test, terminées incluses ; validation séparée de l’ouverture, compteurs, rechargement et persistance. Jour J/J+1/J+6, reset par onglet/retour navigateur, repas vide/renseigné et date transmise au sélecteur et à l’Agenda.
- Navigation : cinq destinations, véritables `href`, recette/missions par identifiant, Agenda, chat sans micro, compte déconnecté. Un véritable enregistrement local de fichier via le gestionnaire natif est retardé : la navigation attend, puis sa métadonnée persiste après le retour à l’accueil.
- Préférences : indépendance, changements de page, rechargement, effet `magicPulse` provenant du CSS source sur une destination et absence d’effet lorsque le système demande une réduction des animations.
- `node essai-stitch-v7/tests/e01-visual.cjs` : dix références source, cinq pages × deux largeurs. **30 captures PNG** au total avec les états, destinations, vues de fenêtre et deux captures du runtime avant E01. [Index comparatif](evidence/e01/README.md).
- 54 tests natifs : PASS ; syntaxe JavaScript : PASS ; dérivation reproductible de 60 fichiers : PASS. Les 25 scripts navigateur existants ont été parcourus, avec reprise des contrôles concernés après correction ; les quatorze cas de revue existants passent à 320 et 390 px. [Résultats locaux](evidence/e01/results.txt).
- Revue indépendante E01 : un défaut de liens réécrits en `#` après rendu Cuisine a été corrigé et couvert par une assertion des cinq adresses. Les contrôles ont aussi conduit à conserver l’en-tête source contextuel et à placer les notifications au-dessus des actions fixes. Aucun échec local restant.

La CI finale complète (`tests/ci.cjs`, qui inclut E01) et le SHA exact sont publiés dans le bilan de la [PR #3](https://github.com/PortenartCo/dobby-demo/pull/3) et son onglet Checks. Les captures historiques des lots précédents restent inchangées ; les preuves E01 sont regroupées séparément.

Les tests utilisent exclusivement des profils éphémères et des enregistrements explicitement préfixés TEST ; les synchronisations des régressions utilisent des réponses HTTP simulées. Aucun compte réel n’est testé. Mission arrêtée après E01 : aucune page secondaire nouvelle, aucune fusion ni publication.
