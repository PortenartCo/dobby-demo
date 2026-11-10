# DOBBY — Revue intégrée E01 à E08

Branche `feat/dobby-e01-e08-review-integration`, départ `e0e88a06485018f5e94eb4aeae886cacbf41c67b`. Contrat : [demande utilisateur](INTEGRATED-REVIEW-SPEC.md), [registre conservé](REVIEW-CONSOLIDATION.md). Les sources jointes sont des références ; les limites de la demande actuelle régissent cette convergence.

Aperçu destiné à la revue : <https://portenartco.github.io/dobby-demo/essai-dobby-integrated-review/>. Données explicitement fictives, persona Camille Démo, aucune authentification réelle. Publication isolée réalisée et vérifiée le 10 novembre 2026 : [reçu de publication](evidence/integrated-review/publication.json). Source applicative `1f0fa32deb3fd64b178148f09cc8e449ac5ca165`, commit statique `beff93cebe2ec558c9b8d3cd345045b22e0c816e`. [CI applicative complète réussie](https://github.com/PortenartCo/dobby-demo/actions/runs/42904244391).

## Inventaire réellement assemblé

| Lot | Écrans et opérations présents | Origine |
|---|---|---|
| E01 | Traverse, sélection J0–J+6, missions/comptage/complétion, repas, Gazette, ambiance et chrome permanent | Filiation E07.2 |
| E02 | Parler à Dobby, commandes natives prises en charge, confirmations, liens effectifs vers les modules ; voix selon disponibilité navigateur | Filiation E07.2 + raccord liste unique |
| E03 | Page Missions reconstruite, quatre filtres de statut et responsables, sources automatiques, ouverture du véritable éditeur E04 | `6a86ead6341eb2f17e7552852621c21f496ad97c` |
| E04 | Formulaire Nouvelle Mission et modification, attribution, échéance, niveaux d’effort, crédits natifs de runes | Filiation E05/E07.2 |
| E05 | Profil magique, avatars, Maison, Patronus, runes et historique, changements manuels et retakes | `8418682e5094b66ee879fbf18dcd1e6a3b6d5a05` dans la filiation |
| E06 | Sept compositions : foyer, identité, questionnaire Maison, résultat Maison, questionnaire Patronus, résultat Patronus, identité consacrée | `1a71f9608dd29514e8fdc5743f7041aeccf5c4ab` |
| E07.1/E07.2 | Taverne, menus/choix repas, recettes et ajouts, liste unique, imports confirmés, édition/coches/archives ; treize routes Cuisine conservées | `bba5b0255acc4834dbd54303df66c61decbed546` |
| E08 | Contrats & Assurances canonique, illustration locale validée, filtres/recherche/échéances, consultation et édition natives | `cb937d48d136561c826a2adc707692fb00c6faf1` |

Les sept compositions E06 ne représentent pas sept capacités serveur terminées : cinq scènes fonctionnelles et deux partielles selon le [contrat E06](E06-PREMIERE-CONNEXION.md). Le questionnaire Maison reste partiel graphiquement faute de Choixpeau original. Les treize routes Cuisine ne sont pas treize nouvelles sources. Le Salon reste un point d’accès explicitement hors revue graphique ; les autres anciens écrans familiaux portent un avertissement visible « non validé ». Aucun de ces écrans historiques n’est compté comme reconstruction E01–E08.

## Convergence et corrections causales

- `3df771a` : E03 ajouté par fonctionnalité ; générateur, chrome, bridge et adaptateur racine conservent E05 et E07.2. La protection contre le nettoyage des nombres natifs est rétablie pour E03.
- `0c8fe9c` : E06 ajouté sans remplacer les API grocery E07.2. Métadonnées/connexion natives ajoutées ; aucune liaison réelle compte–membre inventée. Chrome léger de cérémonie puis retour du dock.
- `0318913` : E08 conservé dans le registre canonique, image et styles propres à Contrats, libellés partagés conservés.
- Contrôle du parcours global : E02 utilisait encore `editshop`, incompatible avec une liste E07.2 active indépendante des archives. La branche E07.2 utilise désormais `DobbyCuisineList.snapshot/add`, préserve articles/imports/archives et empêche le doublon ; l’ancien format garde son chemin historique. Aucun nouveau writer.
- Revue technique indépendante : suppression IDB bloquée par un deuxième onglet. L’enveloppe ferme ses connexions sur `versionchange`, ne traite plus `onblocked` comme succès et recharge les autres onglets après réussite, via un canal propre au préfixe de démo.

## Enveloppe de démonstration

`scripts/build-dobby-review.cjs --profile integrated` génère exclusivement `essai-dobby-integrated-review/`. Le profil historique E07.2 demeure disponible ; son dossier publié ne change pas. Préfixe Storage/IndexedDB : `dobby-review-integrated-v1|`. Réinitialisation limitée à ce préfixe. CSP et garde-fous fetch/XHR interdisent les connexions externes ; connexion native explicitement désactivée dans les copies de démo.

La seule association de profil est la persona fictive `review-person`, injectée dans la copie générée du profil. Le fichier applicatif conserve sa liaison réelle indisponible (`linkedMember=()=>null`). Ce mécanisme n’est ni un compte ni une autorisation familiale.

Le manifeste du bundle porte le SHA source, les empreintes source et transformées de chaque ressource, ainsi que celles de l’enveloppe et de la configuration. Le bundle de publication est généré après commit propre ; un contrôle compare ses sources à l’arbre Git puis tous les octets HTTP aux octets locaux.

## Recette et preuves

- Checkpoints E03, E06, E08 : preuves séparées dans [evidence/integrated-review](evidence/integrated-review/). Les captures historiques ne sont pas remplacées par celles de cette mission.
- `tests/integrated-preview.cjs` : six parcours à 320/390/1440, clics réels, édition/enregistrement, runes, deux retakes avec réponses exactes/confirmation, rechargement, historique, liens directs, aucun doublon, reset deux onglets. Sentinelles de stockage réel et E07.2 conservées ; aucune requête de mutation backend.
- Captures des treize étapes (questions et résultats séparés pour chaque questionnaire) : `local/*-{320,390,1440}.png`, puis `hosted/*-{320,390,1440}.png` sous `evidence/integrated-review/`.
- 80 tests unitaires natifs/sync et 12 tests scoring/identité/build de démonstration ; scoring exhaustif Python/JS : 25 600 comparaisons.
- Campagne finale source : terminée, sortie 0, 150 traces de réussite dans `logs/final-source-passes.log` (ce nombre compte des groupes d’assertions, pas 150 tests unitaires). Les reprises ciblées et leurs causes sont conservées dans les journaux complets. CI : résultats et éventuelles adaptations causales consignés dans `evidence/integrated-review/logs/` ; références CI et publication dans le reçu final.

Les premiers échecs de recette distinguent défauts réels (pont E02 vers E07.2, reset multionglet) et synchronisation de test (attendre navigation/écriture asynchrone avant assertions/reload). Un test E05 utilisait encore le port 8765 en dur : il respecte maintenant `DOBBY_TEST_ORIGIN`, avec le même port par défaut pour la CI. La campagne locale reprend au test interrompu ; les tests déjà verts ne sont pas recommencés. La CI a également révélé que le test de reprise E06 rechargeait avant la fin de l’écriture IDB : il attend désormais le brouillon confirmé avant reload, sans changer le code applicatif. Le test ciblé corrigé passe. Les tests historiques de Missions vérifient la suppression annulée par son gestionnaire natif, la complétion automatique par E01, et la resynchronisation par l’action globale native `fvAction=sync` (qui revérifie le foyer après rechargement hors ligne). Les anciennes commandes de l’ancien registre ne sont plus supposées visibles sur la page E03 de consultation. Le test intégré attend également l’URL effective après chaque changement de document, avant de lire le moteur ; la CI avait révélé une lecture pendant la sortie de cérémonie. La confirmation locale des trois largeurs passe après cet alignement. Sur le site hébergé, 320/390 passent d’emblée ; la dernière assertion de 1440 attend désormais le marqueur propre à Santé, plutôt que le marqueur transitoire du Salon. La seule largeur interrompue a été reprise et passe aussi. Aucune assertion métier n’est supprimée.

## Limites conservées pour la revue

Pas de preuve de synchronisation avec deux comptes réels : cet aperçu n’utilise aucun compte réel. Inscription/création de foyer, invitations, liaison vérifiée compte–membre et autorisations parentales ne sont pas simulées. Voix/sons dépendent des capacités et permissions du navigateur. Le fil de conversation anonyme reste éphémère selon les règles E02 ; les modifications métier fictives, profils, brouillons et courses persistent.

Les retouches visuelles non bloquantes restent dans le registre : états vides E01, blasons/descriptions/présentation des runes E05, singulier Courses et Contrats. Aucune publication officielle, migration SQL ou modification des données familiales. La publication autorisée ajoute seulement le nouveau sous-arbre statique à main, sans fusion de la branche applicative.

## Reçu public et préservation

Les six parcours passent sur l’URL publique à **320, 390 et 1440 px**, avec **39 captures hébergées** et 39 captures locales. Les **258 fichiers HTTP sont identiques octet par octet** au dossier testé ([empreintes](evidence/integrated-review/hosted-bytes.json)). Aucun mock de ressource ou de moteur dans cette recette hébergée. Aucun appel de mutation backend, aucune erreur JavaScript bloquante, reset multionglet et sentinelles isolées vérifiés.

Le commit statique ajoute seulement le nouveau dossier, avec un seul parent `d7c53e5`. Les 18 entrées préexistantes de main ont les mêmes arbres/blobs ; l’ancien aperçu garde l’arbre `a458170cb0ff68bd0465a2274eaf56ee27eb17d1`. Les cinq témoins HTTP préexistants sont inchangés (dont l’absence historique, HTTP404, de la racine V7 non publiée). Les huit branches sources protégées gardent leurs SHA. La branche applicative n’est pas fusionnée dans main et aucun réglage Pages n’a changé.

Les commits suivant `1f0fa32` contiennent les preuves et des attentes de test ; le contrôle des blobs applicatifs et de l’enveloppe confirme leur identité avec le bundle publié. Le registre graphique reste ouvert pour la revue utilisateur ; cette mission s’arrête après livraison de l’aperçu commun.
