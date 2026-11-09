# E01 — Contrat permanent de l’accueil

Périmètre : essai `essai-stitch-v7`, PR #3, branche `feat/dobby-stitch-53-source-backed-v7`. Base E01 : `cc1519b926e6e73cba14ac2659fa5df05d66dadb`. Correction E01.1 depuis la référence vérifiée `e6be2f8c367df282f8d46bc698d0cfbc2ddc1b86`. Aucun développement des fonctions secondaires, changement SQL/Supabase, effacement de données, modification de la V5 publiée ou de `essai-v7-preview`, fusion ou déploiement.

## Composition et navigation

L’accueil conserve les sections et les cartes du HTML `design/stitch-53/dobby_l_choppe_du_chemin_de_traverse/code.html`. `home.js` clone ces compositions et remplace leurs exemples par des données natives ou des états vides. Les barres sont dérivées du même HTML par `build-source.cjs` dans `chrome-source.html` ; aucune nouvelle maquette. Le cinquième onglet utilise le traitement du quatrième et le symbole `more_horiz`. Les pages gardent une largeur maximale de 480 px sur ordinateur, sans refonte de bureau.

La barre supérieure reste visible : étoile = effets visuels uniquement ; haut-parleur = sons et vibrations ; personnage = compte. Les deux préférences indépendantes sont enregistrées dans `st.stitchPreferences` par le `save()` natif, dans la clé DOBBY existante, sans second stockage. Le même bandeau indique « MAISON & QUOTIDIEN · » puis le titre réel de la section active, repris du titre affiché et sans pictogramme de texte. Sur l’accueil : « CHEMIN DE TRAVERSE ». Le nom de section occupe une ligne dédiée dans le cartouche DOBBY existant, sans ajouter de bandeau ; les longs titres gardent leur texte complet dans l’infobulle. Les cinq destinations principales sont entièrement lisibles à 390 et 1440 px. Le compte reprend le titre de son panneau natif. Le son est désactivé par défaut. Aucun microphone. `prefers-reduced-motion` prime sur les effets activés. Les vibrations sont conditionnelles à l’API du navigateur.

La barre inférieure reste visible sur les pages liées : Traverse, Missions, Taverne, Famille, Menu. La destination active porte `aria-current="page"`. Menu ouvre `famille.html#menu`. Les titres et actions contextuels du HTML source (retour, enregistrement, étape de cuisine) sont conservés au-dessus du contenu lorsqu’ils occupaient l’en-tête. Les actions fixes et la zone de conversation sont positionnées au-dessus de la navigation, avec une réserve de défilement adaptée. Les deux barres encadrent aussi le panneau natif du compte, dont la navigation V5 interne est masquée uniquement dans cette intégration. La navigation attend la fin des opérations natives déjà en cours avant de quitter une page. Les adresses réelles des cinq onglets sont restaurées après chaque rendu, y compris pour une ouverture dans un nouvel onglet.

## Journée et données

- Ouverture et retour à l’accueil : aujourd’hui, dans le fuseau local du navigateur. Un sélecteur central large avec deux flèches remplace les sept boutons. À J0 : « Aujourd'hui — » et la date complète (jour, mois, année). Pour un jour futur : jour de semaine et date complète, avec un bouton direct « Aujourd'hui ». La flèche gauche est désactivée à J0, la droite à J+6 ; aucune date hors de ces bornes. La sélection reste en mémoire de présentation seulement ; elle ne modifie pas `st.day` du planning.
- Missions manuelles : échéance égale au jour choisi ; celles sans échéance sont disponibles aujourd’hui. Automatiques : date native `due` égale au jour choisi, hors tâches obsolètes. Aucun plafond. Terminées conservées dans la liste et les compteurs. Les deux modèles restent distincts.
- Le V vert termine la mission via le gestionnaire natif et ne déclenche pas l’ouverture de la carte. Une mission terminée ne propose pas de deuxième validation. La bibliothèque conserve sa commande de réouverture manuelle.
- Repas : entrée réelle `planned[jour + '-soir']`, sauf repas annulé, et recette par identifiant réel. Sinon état vide et choix du repas pour cette date. Le Festin vide affiche uniquement « Aucun repas prévu », la date et l’accès au choix du repas : aucun bloc Temps/Feu/Difficulté, aucune note de recette, aucun nombre de convives fictif. Avec une recette réelle : nom, durée positive disponible et nombre de convives explicitement enregistré dans le repas, sans valeur par défaut empruntée au rendement de la recette. Les champs absents sont retirés ; aucun « Non renseigné » ni note artificielle. La composition, les bordures et les typographies de la carte Stitch sont conservées.
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
| Jour | accueil, sélection locale J à J+6 | Flèches bornées, retour direct Aujourd'hui ; actualise les registres sans écriture native | E01.1 : chaque pas, bornes, retour, état et stockage strictement identiques pendant la consultation |
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

## Preuves E01 de référence

Cette qualification et ses captures historiques correspondent à E01 (`e6be2f8`). La correction E01.1 ci-dessous actualise le sélecteur, le libellé de section et le Festin sans reprendre les pages secondaires.

- `node essai-stitch-v7/tests/e01.cjs` : PASS à 390 × 900 et 1440 × 900, plus un contexte sans réduction des animations. Les contrôles comparent aussi les classes des véritables cartes HTML originales et vérifient les deux barres sur chaque route visitée.
- Missions : huit manuelles et deux automatiques natives dans la journée de test, terminées incluses ; validation séparée de l’ouverture, compteurs, rechargement et persistance. Jour J/J+1/J+6, reset par onglet/retour navigateur, repas vide/renseigné et date transmise au sélecteur et à l’Agenda.
- Navigation : cinq destinations, véritables `href`, recette/missions par identifiant, Agenda, chat sans micro, compte déconnecté. Un véritable enregistrement local de fichier via le gestionnaire natif est retardé : la navigation attend, puis sa métadonnée persiste après le retour à l’accueil.
- Préférences : indépendance, changements de page, rechargement, effet `magicPulse` provenant du CSS source sur une destination et absence d’effet lorsque le système demande une réduction des animations.
- `node essai-stitch-v7/tests/e01-visual.cjs` : dix références source, cinq pages × deux largeurs. **30 captures PNG** au total avec les états, destinations, vues de fenêtre et deux captures du runtime avant E01. [Index comparatif](evidence/e01/README.md).
- 54 tests natifs : PASS ; syntaxe JavaScript : PASS ; dérivation reproductible de 60 fichiers : PASS. Les 25 scripts navigateur existants ont été parcourus, avec reprise des contrôles concernés après correction ; les quatorze cas de revue existants passent à 320 et 390 px. [Résultats locaux](evidence/e01/results.txt).
- Revue indépendante E01 : un défaut de liens réécrits en `#` après rendu Cuisine a été corrigé et couvert par une assertion des cinq adresses. Les contrôles ont aussi conduit à conserver l’en-tête source contextuel et à placer les notifications au-dessus des actions fixes. Aucun échec local restant.

La CI finale complète (`tests/ci.cjs`, qui inclut E01) et le SHA exact sont publiés dans le bilan de la [PR #3](https://github.com/PortenartCo/dobby-demo/pull/3) et son onglet Checks. Les captures historiques des lots précédents restent inchangées ; les preuves E01 sont regroupées séparément.

Les tests utilisent exclusivement des profils éphémères et des enregistrements explicitement préfixés TEST ; les synchronisations des régressions utilisent des réponses HTTP simulées. Aucun compte réel n’est testé. Mission arrêtée après E01 : aucune page secondaire nouvelle, aucune fusion ni publication.


## E01.1 — Corrections finales ciblées

Les seules modifications applicatives concernent `home.js`, `chrome.js` et `chrome.css`. Aucun changement des cinq destinations, des gestionnaires natifs, des sources Stitch, du moteur V5, du stockage ou des essais publiés. Aucun nouveau moteur, dépendance ou développement de la page Missions.

Vérifications ciblées :

- `DOBBY_E01_EVIDENCE_DIR=/tmp/e011-flows node essai-stitch-v7/tests/e01.cjs` : PASS à 390 × 900 et 1440 × 900. Chaque pas de J0 à J+6 puis retour, flèches désactivées et inopérantes aux limites, retour direct Aujourd'hui et reset après navigation. L’état natif **et sa représentation persistée** restent strictement identiques pendant la consultation des dates ; un compteur temporaire en profil de test confirme **zéro appel au gestionnaire natif `save()`**.
- Les données de missions, événements et repas changent avec la date. La validation native des missions, les liens Agenda/recette/choix de repas, les préférences, le retour navigateur et les cinq liens inférieurs restent vérifiés. Le Festin vide et les métadonnées manquantes n’affichent ni valeur de remplacement ni note fictive.
- Noms exacts des cinq sections, lisibilité et absence de débordement des bandeaux, rechargement, transition Salon → Menu → Salon sans rechargement et titre du compte natif : PASS. Effets avec et sans réduction des animations : PASS.
- `node essai-stitch-v7/tests/e01-1-visual.cjs` : PASS à 390 et 1440 px. Les mêmes enregistrements TEST natifs servent aux comparaisons avant/après, dans des profils éphémères sans compte réel et sans accès réseau externe.

[Comparaisons E01.1 : aujourd’hui, J+6, retour, repas vide, bandeaux accueil/autre section](evidence/e01-1/README.md). Les captures avant proviennent du runtime `e6be2f8`, prises avant modification. Les captures E01 historiques restent intactes. Les résultats CI du SHA livré sont reportés dans la PR #3 ; les tests E01.1 rejoignent le même contrôle automatique existant.

Aucun écart E01.1 restant identifié dans les vérifications ciblées. Les écarts de source décrits pour E01 restent inchangés. Arrêt après E01.1 : aucune fusion, publication ou migration.


## E01.2 — Conteneur du compte et effets visuels

Correction ciblée de deux défauts observés sur l'essai E01.1 :
- Le panneau natif « Compte et foyer » et son iframe sont désormais limités à la largeur 480 px et centrés dans le même cadre que les pages Stitch, entre les deux barres permanentes. Il reste une vue native, faute de maquette Stitch du profil.
- Les effets visuels sont désactivés par défaut pour un nouveau profil ; toute préférence déjà enregistrée est conservée. L'étoile active le halo visuel persistant et un bref effet d'onde + étincelles provenant du CSS original Stitch. Elle ne joue aucun son et ne déclenche aucune vibration ; le bouton son reste indépendant.
- Si l'appareil demande une réduction des animations, les particules animées sont évitées mais l'état activé reste visible sur le bouton.
- Aucune modification des sources Stitch, des données ni de la navigation principale.

Vérifications : tests E01 à 390 et 1440 px sur la géométrie du compte, le fonctionnement des cinq onglets, l'indépendance des préférences, la persistance, les particules avec animation autorisée et leur absence lorsque le système réduit les mouvements. Toute recette en conditions réelles reste à confirmer par l'utilisateur.
