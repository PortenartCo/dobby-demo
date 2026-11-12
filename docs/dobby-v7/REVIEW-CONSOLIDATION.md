# DOBBY — Registre de revue et intégration E01–E08

État consolidé au 11 novembre 2026. Ce registre est le référentiel des décisions de revue, distinct des preuves de tests et de l'état réellement livré.

## Contrat de revue
- Référence : pages reconstruites progressivement E01–E08, **pas** le raccordement historique des 53 maquettes Stitch.
- Ne plus faire valider une interface ancienne à la place d'une page reconstruite.
- Fournir une application de démonstration **unique** assemblant les versions reconstruites E01 à E08, avec navigation et boutons testables, avant de reprendre la revue globale.
- Les tests automatisés ne remplacent ni la revue visuelle de l'utilisateur ni les essais authentifiés de partage familial.
- La condition de convergence E03/E06/E08 a été satisfaite par l'aperçu intégré publié. La revue de cet aperçu ne valide toutefois pas automatiquement les fonctionnalités métier ni les corrections ouvertes.

## Corrections et arbitrages déjà décidés
| Périmètre | Décision de revue | État |
|---|---|---|
| E01 Accueil | Harmoniser les états vides « Missions du Jour » et « Gazette des Curiosités » sur la mise en forme du « Festin du Soir » (titre mis en évidence, sous-texte, sans encadré pointillé) | À appliquer, non livré dans la démo actuelle |
| E03 Missions | Dans le hero, supprimer « Tome VII · Rayon D » et remplacer par « Grimoire des Missions » en bas à droite ; retirer l'ancien cartouche haut gauche | Intégré : cartouche bas droit « Grimoire des Missions », ancien cartouche absent |
| E03 Missions | Le vieux registre Missions montré dans l'aperçu E07.2 ne doit plus être soumis à revue ; lui substituer la branche E03 reconstruite | Vraie page E03 intégrée ; revue visuelle utilisateur E03 validée le 11/11 |
| E05 Profil magique | Le membre de démo devrait accéder naturellement à son profil sans état ambigu « aucun profil associé », tout en restant sans authentification réelle | Persona fictive explicitement associée uniquement dans le bundle de démonstration ; parcours locaux et hébergés PASS320/390/1440 |
| E05 Maison | Reprendre les blasons des quatre Maisons : animal et héraldique plus reconnaissables et détaillés ; conserver l'univers visuel retenu | À appliquer (design) |
| E05 Maison & Patronus | Ajouter une brève description narrative des caractéristiques/symboles de chaque Maison et Patronus, sans profilage psychologique | À appliquer |
| E05 / E06 | Raccorder « Refaire le test » aux questionnaires E06 pour Maison et Patronus ; aucune perte des choix avant confirmation | Raccordé aux vrais questionnaires E06 ; confirmation préserve les choix précédents, PASS local/hébergé320/390/1440 |
| E05 Runes | Retravailler la présentation : rune réellement illustrée selon le grade, jauge plus qualitative, historique lisible ; conserver les règles de gains et seuils existants | À appliquer (design) |
| E07 Courses | « 1 articles » doit être accordé en « 1 article » | À appliquer |
| E07.1 Taverne & E07.2 Courses | Deux pages à revoir en fonctionnement réel après intégration, malgré leurs tests et captures réussis | Revue utilisateur obligatoire |
| E08 Contrats | Interface acceptée en revue ; corriger plus tard « 1 contrats et assurances enregistrés » sans intervention Codex isolée | Accepté visuellement ; non-régression source contrôlée à 320/360/390/1440, revue utilisateur commune attendue |

## Limites à ne pas présenter comme validées
- L'aperçu E07.2 est un environnement fictif isolé ; il n'atteste pas la synchronisation entre deux vrais comptes familiaux.
- E06 comprend des limites documentées sur la liaison vérifiée compte–foyer–membre et certaines opérations de création/invitation ; ne pas simuler ces étapes.
- Les pages familiales de l'ancien raccordement qui n'ont pas été reconstruites ne doivent pas être affichées comme pages finales ; rendre cette limite visible sans inventer une nouvelle interface métier.
- Aucune fusion des branches applicatives dans main ni migration Supabase n'a été approuvée.

## Références techniques de départ
- Intégration : branche feat/dobby-e01-e08-review-integration créée depuis E07.2 bba5b0255acc4834dbd54303df66c61decbed546.
- E03 : feat/dobby-e03-missions @ 6a86ead6341eb2f17e7552852621c21f496ad97c.
- E04 runes : feat/dobby-e04-runes @ 8bcd49c1c2250879e2fd5a96641cd77747ef9ea0 ; intégrée à E05.
- E05 : feat/dobby-e05-magic-profile @ 8418682e5094b66ee879fbf18dcd1e6a3b6d5a05.
- E06 : feat/dobby-e06-onboarding @ 1a71f9608dd29514e8fdc5743f7041aeccf5c4ab.
- E07.2 : feat/dobby-e07-cuisine-courses @ bba5b0255acc4834dbd54303df66c61decbed546.
- E08 : feat/dobby-e08-contrats @ cb937d48d136561c826a2adc707692fb00c6faf1.

## Assemblage de revue
[Rapport commun E01–E08](INTEGRATED-REVIEW.md). Le Salon signale les rubriques hors revue, et les autres vues familiales historiques portent « non validé ». Les corrections graphiques ouvertes ci-dessus ne sont pas déclarées terminées. La publication du seul nouveau dossier de démonstration est autorisée par la demande de convergence actuelle ; aucune fusion applicative dans main.

Aperçu commun publié et vérifié : <https://portenartco.github.io/dobby-demo/essai-dobby-integrated-review/>. Les huit lots sont réunis, les six parcours passent aux trois largeurs. Les états graphiques encore ouverts et les limites E06 restent applicables ; revue utilisateur attendue.


---

## Revue utilisateur — consolidée le 11 novembre 2026

Ce complément prend le pas sur les mentions « revue attendue » lorsqu'une décision plus récente existe. Il **ne constitue ni une correction de code ni une certification de fonctionnement**. Les décisions sont formulées pour être réutilisées dans des missions Codex sans demander de répéter les retours.

### Légende d'avancement
- **VALIDÉ** : page ou décision explicitement acceptée par l'utilisateur.
- **À CORRIGER** : changement souhaité, pas encore prouvé intégré.
- **À DÉVELOPPER** : fonctionnalité non disponible ou incomplète.
- **À RECONSTRUIRE** : ancienne interface écartée, pas de revue utile du rendu historique.
- **À VÉRIFIER** : symptôme observé, cause ou effet réel à confirmer.
- **LIMITE SERVEUR** : démonstration isolée ne permet pas la recette réelle.

### E01 — Accueil / Chemin de Traverse

| Repère | Décision ou symptôme | Suite | État |
|---|---|---|---|
| E01-01 | Harmoniser les états vides Missions et Gazette sur le style du « Festin du Soir » : titre mis en évidence, courte description, sans encadré pointillé. | Réutiliser le composant et les espacements du Festin. | À CORRIGER |
| E01-02 | Une mission « À faire » ne doit **jamais présenter une coche d'état terminé**. Demander confirmation de réalisation ; afficher la coche seulement après réussite. | Même sémantique sur l'accueil et E03. | À CORRIGER |
| E01-03 | Décocher une mission terminée pour la rouvrir ; état persistant après rechargement. Distinguer les missions automatiques, dont le statut peut dépendre d'un module source. | Préserver l'intégrité des crédits de runes : aucune double attribution en recochant ; documenter et vérifier les règles de réouverture natives. | À DÉVELOPPER / VÉRIFIER |
| E01-04 | Ajouter une illustration/vignette du plat prévu, avec nom, durée et ouverture de fiche ; repli visuel lorsque la photo locale manque. | Réutiliser images/fallback E07, sans créer une deuxième photothèque. | À CORRIGER |
| E01-05 | Afficher **les repas de midi ET du soir** du jour sélectionné, indépendants ; remplacer « Festin du Soir » par « Les Repas du Jour » ou équivalent. | Réutiliser la même planification que la Taverne : jour, créneau, portions, photographie et recette. | À DÉVELOPPER |
| E01-06 | Ajouter un accès **rapide aux courses hors menus** sur l'accueil : champ de saisie, action Ajouter, liste unique E07 et accès à la liste complète. | Pas de deuxième panier ; informer sur doublons, persistance et statut de synchronisation réel. | À DÉVELOPPER |

### E02 — Parler à Dobby

| Repère | Décision ou symptôme | Suite | État |
|---|---|---|---|
| E02-01 | Dobby apparaît trop petit dans le bandeau. Il doit être **visuellement prédominant**, largement visible, sans buste coupé. | Refaire la composition du hero et tester les dimensions mobiles. | À CORRIGER |
| E02-02 | Dictée vocale interrompue et envoyée dès un premier segment final, parfois après environ une seconde de silence. | Passer à un mode de saisie permettant des pauses naturelles et un **envoi explicite**, sans autosend à la première pause ; traiter fins de session/pertes de micro sans perte de transcription ; respecter limites Safari/iOS. | À DÉVELOPPER |
| E02-03 | Le vrai comportement des commandes conversationnelles reste à vérifier lors d'une recette ciblée, sans supposer que toutes les demandes libres sont prises en charge. | Tester au moins ajout Courses, consultation et navigation vers modules compatibles. | À VÉRIFIER |

### E03 — Bibliothèque des Missions

- **VALIDÉ par l'utilisateur** : page reconstruite E03, ne plus réclamer de revue de cette page ni la remplacer par l'ancien registre.
- Cartouche hero « Grimoire des Missions » en bas à droite, avec suppression de « Tome VII · Rayon D » : déjà intégré dans l'aperçu commun ; préserver.
- Les changements de statut issus d'E01/E04 doivent rester cohérents avec E03, sans entraîner de refonte visuelle non demandée.

### E04 — Nouvelle Mission

| Repère | Décision ou symptôme | Suite | État |
|---|---|---|---|
| E04-01 | Supprimer les suggestions prédéfinies « Balai & poussière », « Étendre la lessive », « Arroser les plantes », « Ranger l'entrée ». | Conserver formulaire libre, catégorie, consignes et attribution. | À CORRIGER |
| E04-02 | La « Récurrence de quête » est visible mais non sélectionnable. | Implémenter Unique/Quotidien/Hebdomadaire/Mensuel ; occurrences indépendantes, échéances, modification/arrêt, crédit de runes idempotent par occurrence ; ne pas seulement dégriser l'interface. | À DÉVELOPPER |
| E04-03 | L'onglet Famille est activé dans la navigation pendant « Nouvelle Mission ». | Mission doit rester active dans le dock, même si l'éditeur est techniquement hébergé dans famille.html. Retour/X vers le parcours Missions, y compris depuis l'accueil. | À CORRIGER |
| E04-04 | Attribution : conserver les avatars liés au véritable profil du membre. | Ne pas multiplier les registres d'identité. | DÉCISION À CONSERVER |

### E05 — Profil magique

| Repère | Décision ou symptôme | Suite | État |
|---|---|---|---|
| E05-01 | Blasons actuels trop génériques ; l'utilisateur souhaite les **blasons officiels** des quatre Maisons, non des pictogrammes redessinés. | Distinguer fichiers autorisés pour une version familiale privée et assets exposés dans une URL GitHub Pages publique ; aucune republication des visuels officiels sans droits adéquats. | À CORRIGER / DROITS À VÉRIFIER |
| E05-02 | Ajouter sous chaque Maison ses origines/fondateur, caractéristiques et valeurs. Ajouter sous chacun des **12 Patronus** une courte présentation de l'animal et de sa symbolique protectrice. | Un catalogue unique de textes partagé par E05 et résultats E06 ; mise à jour selon le profil, symbolique ludique sans profilage réel. | À CORRIGER |
| E05-03 | « Runes & progression » trop abstrait : rune/insigne central illustré selon grade, total et grade lisibles, jauge valorisante, palier suivant, historique façon grimoire. | Préserver barème, grades et ledger natifs ; amélioration graphique, sans changement gratuit des règles. | À CORRIGER |
| E05-04 | Refaire les tests Maison et Patronus depuis le profil. | Déjà raccordé aux questionnaires E06 dans l'aperçu intégré, avec confirmation ; préserver la version précédente tant que le nouveau résultat n'est pas confirmé. | INTÉGRÉ — NON-RÉGRESSION |
| E05-05 | Les profils et avatars de démonstration ne doivent pas donner une fausse impression de compte relié au foyer réel. | Persona fictive en démo ; liaison réelle compte–foyer–membre reste une limite serveur E06. | À CONSERVER |

### E06 — Première connexion / cérémonie magique

| Repère | Décision ou symptôme | Suite | État |
|---|---|---|---|
| E06-01 | L'entrée « Rituel de la Cheminée » (Cheminette) manque avant « Mon foyer magique ». | Une archive Stitch supplémentaire a été fournie pendant la revue. Importer/identifier ses HTML et animations, vérifier les médias externes, restituer le rituel/transition, « Traverser la cheminée », possibilité de passer et préférence « Ne plus afficher ». | CORRIGÉ — HTML Stitch reçu, traversée réelle, passage et préférence locale réversible ; tests ciblés PASS 320/390/1440. Revue visuelle utilisateur attendue. |
| E06-02 | Le parcours d'inscription est bloqué dans l'aperçu public. | Proposer un **parcours complet de démonstration fictive** (foyer/membre locaux, questionnaire, final, reset) et distinguer clairement les comptes réels indisponibles. Ne pas inventer une validation serveur. | À DÉVELOPPER |
| E06-03 | Cadre du Choixpeau vide + message technique « Illustration originale ... indisponible ». | Retrouver asset fiable ou illustration substitutive de qualité ; supprimer le message utilisateur ; une seule indication cohérente « Question n/6 ». | À CORRIGER |
| E06-04 | Résultat Maison : masque/bande verticale noire et nom SERDAIGLE coupé sur mobile. | Supprimer artefacts, corriger lisibilité responsive et montrer **grand blason** ; ajouter fondateur/origine, valeurs et caractéristiques propres à chaque Maison. | BUG À CORRIGER |
| E06-05 | Textes d'ambiance des questions en italique trop difficiles à lire. | Corps de texte en romain avec interligne/contraste suffisants ; italique réservé aux accents courts. | À CORRIGER |
| E06-06 | Résultat Patronus : illustration appréciée, explication de l'animal insuffisante ; exemple Renard. | Conserver grand visuel, ajouter qualités, comportement et symbolique protectrice des 12 Patronus, avec textes E05 communs ; retirer du bloc principal les mentions techniques sur les runes. | À CORRIGER |
| E06-07 | Dernier écran d'identité magique après Patronus. | Vérifier une fois le parcours démonstration déverrouillé : Maison, Patronus, avatar, runes et entrée Traverse. | À VÉRIFIER |
| E06-08 | Création vraie de compte/foyer, invitations, rattachement vérifié, autorisations parentales. | Non fonctionnel dans aperçu isolé ; chantier serveur distinct, validation réelle ultérieure avec comptes autorisés. | LIMITE SERVEUR |

### E07 — Taverne, recettes, menus et courses

| Repère | Décision ou symptôme | Suite | État |
|---|---|---|---|
| E07-01 | Le planning sur sept grandes cartes est encombrant. | Créer **un calendrier hebdomadaire compact, cliquable par date**, navigation entre semaines et accès futur à dates plus éloignées ; détail Midi et Soir séparés pour chaque jour, même lorsque les deux sont vides. | À DÉVELOPPER |
| E07-02 | Revoir largement trois pages : **Grimoire des Recettes**, **Choisir un repas**, **Fiche Recette** (lot E07.3). | Navigation fluide, photos, filtres, favoris, sélection et planification, portions, ingrédients, instructions, actions utiles ; conserver jour/créneau/contexte entre pages sans planifier implicitement à la consultation. | À RECONSTRUIRE/AMÉLIORER |
| E07-03 | Mode Cuisine et adaptation Thermomix. | Recette ciblée ultérieure des étapes, portions, minuteur si disponible, navigation et éventuel mode TM5, sur le moteur existant. | À VÉRIFIER |
| E07-04 | Lors de « Ajouter les ingrédients des menus », pouvoir choisir **jusqu'à quelle date** couvrir les repas. | Date début (aujourd'hui par défaut) et fin incluse, raccourcis 3/7/14 jours, prise en compte Midi+Soir, aperçu des ingrédients et confirmation avant ajout, déduplication/quantités compatibles. | À DÉVELOPPER |
| E07-05 | Le bouton « Terminer les courses » ne produit aucun effet apparent ; dans le code actuel, il est désactivé lorsqu'aucun achat n'est coché. | Expliquer cet état ; **bouton doré pleine largeur**, icône, texte lisible, confirmation, retrait des articles cochés, conservation de ceux non achetés, retour de succès. | À CORRIGER |
| E07-06 | L'historique des courses n'apporte pas de valeur à l'utilisateur. | Supprimer bouton et page de la navigation courante, **sans détruire les archives techniques nécessaires** à la déduplication, au suivi ou à la compatibilité des données. | VALIDÉ — À CORRIGER |
| E07-07 | Textes « Ajouter un article » et « Ajouter les ingrédients des menus » trop petits. | CTA pleine largeur, typographie principale lisible (cible 16 px), icônes proportionnées, vérifier à 320/390/1440 ; idem pour Terminer. | À CORRIGER |
| E07-08 | Libellé « 1 articles » incorrect ; conserver le hero de Courses avec cartouche en bas à droite et sans textes superflus. | Accord singulier/pluriel ; ne pas régresser E07.1/E07.2. | À CORRIGER / NON-RÉGRESSION |
| E07-09 | Bouton de fiche « Ajouter les vivres manquants au Panier » semble mener à la planification, plutôt qu'à un ajout direct. | Vérifier ce qu'autorise la logique E07.2 ; rendre le libellé et l'effet cohérents, sans contourner la confirmation des ingrédients. | À VÉRIFIER |
| E07-10 | Taverne E07.1 et Courses E07.2 ont été techniquement testées, mais l'utilisateur a demandé une revue finale commune ; plusieurs évolutions sont désormais décidées. | Ne pas considérer la présence de la route ou le succès CI comme validation de l'UX. | REVUE EN COURS |

### E08 — Contrats & Assurances

- **VALIDÉ visuellement par l'utilisateur** ; ne pas rouvrir le design accepté, sauf régression.
- Corriger le singulier « 1 contrats et assurances enregistrés » dans le prochain lot.
- Capture de la version intégrée : l'illustration du hero est vide à 320/390 mais présente à 1440. Le fichier existe dans le bundle ; **vérifier chargement réel sur mobile / timing de capture** avant de qualifier la cause. Aucune certification visuelle mobile prématurée.

### Transversal E01–E08

| Repère | Décision | État |
|---|---|---|
| T-01 | Bouton **Effets** : préférence unique partout, état visible, persistante à la navigation/rechargement, prise en compte reduced-motion ; distinguer « peu d'effets prévus » de « bouton cassé ». | À VÉRIFIER / CORRIGER |
| T-02 | Bouton **Son** : préférence unique partout, icône cohérente, persistance, commande de lecture vocale Dobby conforme au réglage ; limites réelles des navigateurs. | À VÉRIFIER / CORRIGER |
| T-03 | Une seule branche d'intégration et **une URL d'aperçu de revue** tenue à jour ; les pages reconstruites priment sur les anciens écrans. Les fonctions non livrées doivent être explicites, jamais simulées comme opérationnelles. | RÈGLE PERMANENTE |
| T-04 | Réutiliser les moteurs/writers existants. Réparer les causes des boutons inopérants, pas seulement le style ; contrôler persistance, liens réels et non-régression à la frontière des modules. | RÈGLE PERMANENTE |
| T-05 | Mode de revue isolé sans écriture sur les vrais comptes, photos, Supabase et foyers ; distinguer tests en fixture, livraison intégrée et synchronisation familiale réelle. | RÈGLE PERMANENTE |

### Ordre de développement **validé le 11 novembre 2026**

**Étape 0 : consolider les corrections recensées E01–E08** (cette section constitue le cahier des corrections, pas leur réalisation). Travailler par lots responsables des fichiers communs ; une seule intégration continue et un seul aperçu utilisateur. Priorité aux blocages fonctionnels, puis UX sans oublier les corrections différées. Ne pas répéter toutes les campagnes de tests à chaque retouche mineure.

**1 — Écrans complémentaires de la Taverne :** calendrier, Grimoire des Recettes, Choisir un repas, Fiche Recette, Mode Cuisine et continuité des actions vers les Courses. Construire E07.3 avec le moteur natif, pas un nouveau backend.

**2 — Menu :** réorganisation et reconstruction de la navigation. Définir les destinations exactes et les états non disponibles ; l'étape Menu ne prétend pas finir les futurs modules Famille.

**3 — Famille :** reconstruire le Salon des Curiosités et ses sous-parcours familiaux. Les anciennes interfaces génériques ne constituent pas des écrans validés.

**4 — Autres pages :** périmètre à définir après examen des besoins restants. Ne pas inventer une liste de lots non approuvés.

### Règles de livraison

1. Les **modifications de code** se font par missions bornées et preuves ciblées, pas par la seule mise à jour de ce registre.
2. Aucune correction visuelle E05/E06 ne doit supprimer les fonctions E07/E08 ni les liens E03/E04.
3. E03 reste validé ; E08 reste accepté ; ne les redessiner que sur anomalie de non-régression prouvée.
4. La revue utilisateur est séparée de « tests PASS », « intégré », « publié » et « fonctionnel sous compte réel ».
5. L'URL publique de démonstration ne doit pas exposer d'assets officiels protégés sans autorisation ; les souhaits d'emblèmes officiels concernent la version privée tant que les droits de publication ne sont pas établis.
6. Aucune fusion des branches applicatives dans main, migration SQL ni publication officielle implicite.


---

## Compléments de revue E06 après publication du Rituel — 11 novembre 2026

Cette section consigne les retours utilisateur **postérieurs** à la consolidation initiale et au correctif E06-01 \`f60f9f8\`. Ces observations ne sont **pas** des corrections déjà réalisées. Elles sont prioritaires sur les anciennes descriptions de rendu pour les points concernés, sans réécrire ni renuméroter la matrice historique.

| Référence | Demande utilisateur et contrat de conformité | État |
|---|---|---|
| E06-03 — nouvelle référence Choixpeau | **Remplacer le Choixpeau dessiné/cartoon par le visuel cinématographique explicitement fourni** dans \`stitch_dobby_assistant_mobile_app (10).zip\` (pièce jointe de la conversation du 11/11). L'archive contient \`cinematic_photorealistic_dark_fantasy_still_of_the_ancient_magical_sorting_hat/screen.png\` (1376 × 768) : chapeau textile/cuir patiné réaliste, visage expressif, vieux tabouret sculpté, grande salle gothique, chandelles, braises, éclairage de cinéma. Une deuxième \`screen.png\` (582 × 1600) illustre son insertion dans \`dobby_la_c_r_monie_du_choixpeau_visuel_cin_matographique/code.html\`. **Source artistique choisie : image 1376 × 768 ; mise en page mobile seulement à titre de référence.** Vérifier la disponibilité/traçabilité de la pièce jointe avant exécution et sa publication dans l'aperçu. L'image de référence n'est pas encore importée dans GitHub par cette mise à jour du registre. | À INTÉGRER, revue utilisateur requise |
| E06-03 — logique questionnaire protégée | Le nouveau HTML Stitch contient un **autre questionnaire à 10 questions**. Il ne faut **pas** le recopier dans DOBBY : conserver impérativement le questionnaire existant à 6 questions, ses réponses, son scoring, la reprise, les confirmations, les contenus Maison/Patronus et le modèle natif. Adapter uniquement le visuel du Choixpeau et son cadrage responsive, sans régression fonctionnelle. | RÈGLE IMPÉRATIVE |
| T-01 — défaut Effets initiaux | L'utilisateur a constaté une traversée sans feu vert, car \`stitchPreferences.effects\` est à \`false\` par défaut. **Effets = true lors de la première utilisation / sans préférence existante**, sur tous les écrans, **Son = false** par défaut ; conserver toute décision explicite \`effects:false\` après rechargement ; respecter \`prefers-reduced-motion\`. La correction doit agir sur la source canonique des préférences et non forcer \`true\` à chaque montage. La traversée spectaculaire verte de la Cheminée doit être effectivement visible lorsque les effets sont actifs. | À CORRIGER |
| E06-01 — accessibilité du replay | Après première traversée, \`seen\` entraîne le saut de l'introduction pour les ouvertures ordinaires, ce qui a donné l'impression d'être bloqué sur le Foyer. Prévoir un chemin « Revoir le Rituel » clairement découvrable et exploitable depuis la page suivante, avec relecture même si \`seen=true\`, sans réinitialiser membre ou réponses. Le paramètre interne de relecture existe : l'enjeu est l'accès utilisateur et sa compréhension. | À VÉRIFIER / AMÉLIORER |
| E06-04 et E05-01 — blasons | L'utilisateur constate **un cadre vide « Blason officiel indisponible dans cette démonstration »** au résultat Gryffondor et exige un **grand blason visible** conforme à la Maison sélectionnée, cohérent avec E05. L'exigence antérieure de blasons officiels demeure. Ne pas présenter un placeholder ni un pictogramme générique comme solution définitive ; les droits de redistribution des blasons officiels pour une URL publique restent à établir, distincts d'un usage familial privé. Rechercher une solution autorisée sans changer silencieusement le choix artistique de l'utilisateur. | TOUJOURS BLOQUÉ / REVUE VISUELLE NON VALIDÉE |

**Ne pas confondre maquette et fonctionnalité :** le ZIP \`(10)\` est une **référence visuelle du Choixpeau**, pas l'autorisation de remplacer les questionnaires E06, ni de remodeler E05/E07. L'ordre de développement antérieurement approuvé reste : consolidation et corrections de revue → écrans complémentaires Taverne E07.3 → Menu → Famille → reste à définir. Le prochain lot de corrections devra tracer ces nouvelles exigences explicitement, sans les englober dans les 95 lignes historiques comme déjà vérifiées.
