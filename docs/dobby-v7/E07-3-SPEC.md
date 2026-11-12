# CODEX — DOBBY E07.3 : stabilisation Taverne + Grimoire des Recettes

**MODE : EXÉCUTION AUTORISÉE — Développement, tests et déploiement d'un aperçu isolé.**

## 1. Objectif et périmètre

Dépôt : `PortenartCo/dobby-demo`

Branche source : `feat/dobby-e01-e08-review-integration`, à son dernier état distant vérifié au lancement.

Créer une branche et un worktree indépendants, par exemple :

`feat/dobby-e073-taverne-grimoire-20261111`

L'utilisateur a terminé la revue des écrans suivants :

- Page principale « La Taverne Gourmande ».
- « Menus de la Semaine ».
- « Grimoire des Recettes », catalogue et favoris.
- Accès à la création/importation de recettes.

**Livrer ces écrans corrigés et fonctionnels, puis les publier sur une URL d'essai distincte.**

Les sous-pages détaillées ne sont pas encore validées et feront l'objet d'une revue ultérieure.

### Références

Lire les instructions `AGENTS.md` applicables lorsqu'elles existent, puis consulter :

- `docs/dobby-v7/REVIEW-CONSOLIDATION.md`
- `docs/dobby-v7/INTEGRATED-REVIEW.md`
- `essai-stitch-v7/cuisine-e07.js`
- `essai-stitch-v7/cuisine.js`
- `essai-stitch-v7/cuisine-engine.js`
- `essai-stitch-v7/cuisine.css`
- `essai-stitch-v7/tests/cuisine.cjs`
- `essai-stitch-v7/tests/e07.cjs`
- `essai-stitch-v5-famille/family-modules.js`
- `scripts/build-dobby-review.cjs`

Archive jointe : `DOBBY_E07_2026-11-11_revue_premiere_tranche.zip`.

Elle contient neuf captures réelles des écrans à corriger, avec leurs commentaires et empreintes.

Ne pas réanalyser les 53 maquettes Stitch. Reprendre les composants déjà reconstruits et la logique métier existante.

Deux autres branches sont potentiellement occupées :

- `fix/dobby-e06-visual-functional`
- `feat/dobby-review-e01-e05-20261111`

Vérifier leur état réel et ne jamais écraser leurs modifications.

## 2. Page principale — La Taverne Gourmande

### E07-01 — Carte des repas du jour

Remplacer la présentation exclusive « Repas prévu ce soir » par une carte **« Les Repas du Jour »**.

Afficher les deux créneaux indépendants :

- MIDI
- SOIR

Pour chacun :

- Nom du plat.
- Illustration de la recette.
- Durée totale cohérente.
- Convives et portions du repas effectivement planifié.
- Bouton « Voir la recette ».
- En l'absence de repas, indication « Aucun repas prévu » et bouton « Choisir un repas ».

Réutiliser `recipeVisual()` et les ressources de la recette existante. Ne pas créer une seconde bibliothèque d'images.

Prévoir un repli visuel élégant lorsqu'aucune photo n'existe, sans présenter une photographie fictive comme celle du plat réel.

Conserver les identifiants et la planification native, notamment les clés `date-midi` et `date-soir`.

### E07-02 — Menus de la Semaine

Remplacer les sept grandes cartes verticales actuelles par un **calendrier hebdomadaire compact, lisible et interactif**.

Attendu :

- Vision immédiate des sept jours.
- Navigation semaine précédente/suivante.
- Sélection d'une journée.
- Distinction Midi/Soir.
- Indication claire des repas prévus et manquants.
- Détail du jour sélectionné avec accès à chacun des deux créneaux.
- Boutons de sélection ou modification d'un repas.

Aucun défilement horizontal obligatoire sur mobile.

L'ensemble doit rester utilisable à 320 px.

Réutiliser le planning natif. Ne pas créer de calendrier ou de système de planification parallèle.

### E07-03 — Grimoire et Courses depuis la Taverne

Améliorer la lisibilité des cartes :

- « Mes Recettes ».
- « Favoris ».
- « Courses du Foyer ».
- Compteurs et textes secondaires.
- Boutons d'action.

Cible : 16 px pour les titres et actions, 14–15 px pour les informations secondaires, contraste suffisant et zones tactiles d'au moins 44 px.

Conserver les destinations et le panier unique.

## 3. Grimoire des Recettes — Présentation

### E07-04 — Illustration principale

Déplacer le cartouche « GRIMOIRE & FORMULES DU LOGIS » en bas à droite du visuel.

Conserver l'image actuelle de Dobby, son cadrage et les dimensions générales du bandeau.

### E07-05 — Effets et son

Les effets visuels et sonores semblent inopérants sur les pages du Grimoire.

Rendre les effets réellement perceptibles lorsque leurs préférences communes sont activées :

- Particules et scintillements discrets.
- Transitions légères.
- Retour visuel lors de la sélection d'une recette ou d'un favori.
- Retours sonores brefs lors des actions principales.

Réutiliser le mécanisme commun de DOBBY.

Ne pas modifier les valeurs par défaut des préférences, actuellement traitées par la mission E06.

Respecter Son OFF, Effets OFF et `prefers-reduced-motion`.

Ne pas ajouter de musique permanente ni de lecture sonore automatique au chargement.

### E07-06 — Suppression des éléments inutiles

Supprimer de la présentation :

- « Sanctuaire culinaire — Conservation locale ».
- « Mémoire iPhone ».
- Les compteurs fictifs de ce cadre.
- « Guide des Fourneaux du Logis », lorsqu'il s'agit de l'encart informatif.
- « Sauvegarder ou enrichir le Grimoire ».
- Les indications techniques sur la fusion, le stockage et la confidentialité qui ne correspondent pas à un état réellement vérifié.
- Les cartouches et informations techniques redondants en bas de page.

Ne supprimer aucune donnée, recette, archive ou fonctionnalité utile sous-jacente.

Conserver l'export JSON existant, mais le déplacer vers un espace approprié de gestion/sauvegarde, sans le laisser encombrer le catalogue.

### E07-07 — Retour à la Taverne

Conserver un bouton « Retour à la Taverne Gourmande » :

- Pleine largeur.
- Doré.
- Texte gras 16–18 px.
- Hauteur 52–56 px.
- Flèche visible.
- Navigation effective et compatible avec le retour navigateur.

## 4. Catalogue — Mes recettes

### E07-08 — Recherche et filtres

Ajouter le titre **« Mes recettes »** avant le champ de recherche.

Conserver la recherche par nom, ingrédient ou mot-clé.

Conserver les filtres utiles : Toutes, Favoris, Thermomix TM5, Traditionnelles, rapides et catégories.

Tous les filtres doivent être directement visibles, en passant sur plusieurs lignes si nécessaire. Supprimer le défilement horizontal obligatoire.

Une recette pouvant disposer des deux modes de préparation, elle peut correspondre à la fois au filtre Traditionnel et au filtre TM5, mais ne doit apparaître qu'une seule fois dans le catalogue.

### E07-09 — Cartes recettes

Conserver :

- L'illustration principale.
- Le nom.
- La catégorie.
- Une durée totale.
- « Consulter ».
- « Planifier ».

Supprimer les informations redondantes et le nombre de convives du catalogue.

Corriger les durées contradictoires. Exemple signalé : « Poulet mijoté aux légumes et riz » affiche 45 minutes puis 40 minutes.

Utiliser une seule valeur totale cohérente et conserver les durées détaillées dans les données de recette lorsqu'elles existent.

Ne pas inventer de durée manquante.

Le nombre d'adultes et d'enfants reste choisi au moment de la planification. Préserver cette fonction sans modifier son sous-écran au-delà du raccordement indispensable.

### E07-10 — Favoris

Utiliser une étoile :

- Contour lorsque la recette n'est pas favorite.
- Pleine et dorée lorsqu'elle est favorite.

Un premier clic ajoute immédiatement aux favoris avec confirmation visuelle.

Un clic de retrait demande confirmation avant de supprimer le statut favori.

Conserver la recette et les autres données dans tous les cas.

Vérifier la persistance après navigation et rechargement.

## 5. Création de recettes — Parcours unique

### E07-11 — Simplifier l'accès

Supprimer du catalogue les deux boutons secondaires :

- « Inscription Manuelle ».
- « Importer lot JSON ».

Conserver un seul bouton principal :

**« Inscrire une nouvelle recette »**

Pleine largeur, fond doré, texte lisible et icône adaptée.

Ce bouton ouvre une page de choix :

**Option 1 : Saisie manuelle**

Ouvrir le formulaire natif existant, sans perdre ses fonctions de création et d'édition.

**Option 2 : Importer avec l'IA**

Ouvrir un nouveau parcours guidé d'importation externe.

Conserver le retour au Grimoire et les brouillons existants.

## 6. Importer avec l'IA personnelle de l'utilisateur

### E07-12 — Parcours sans API IA DOBBY

L'utilisateur utilisera ChatGPT, Gemini, Claude ou une autre IA de son choix pour convertir ses recettes photographiées.

DOBBY ne doit pas appeler une API IA payante pour cette fonctionnalité.

Prévoir une page contenant :

1. Une explication courte du processus.
2. Un bouton « Copier le prompt pour mon IA ».
3. Une explication sur la transmission successive des photos.
4. Une zone « Importer mes recettes » acceptant un fichier JSON et, lorsque les images sont présentes, une archive ZIP.
5. Un aperçu des recettes reconnues.
6. Un contrôle des doublons, avertissements et erreurs.
7. Une validation explicite avant enregistrement.

Ne pas prétendre qu'une IA tierce transmet automatiquement ses fichiers à DOBBY : l'utilisateur doit récupérer puis sélectionner le fichier.

### E07-13 — Contenu du prompt externe

Le prompt intégré à DOBBY doit être complet, réutilisable et copiable en un clic.

Il doit demander à l'IA :

- D'accepter des photographies successives.
- De regrouper correctement plusieurs photos d'une même recette.
- De distinguer plusieurs recettes différentes.
- De conserver toutes les recettes au cours de la conversation.
- De demander après chaque lot : **« Avez-vous encore une recette à me fournir ? »**
- De ne créer le fichier final qu'après confirmation explicite de l'utilisateur.
- De transcrire les recettes fidèlement.
- De ne pas inventer les ingrédients, quantités ou durées absents ou illisibles.
- De signaler les informations incertaines.
- De produire un JSON conforme au contrat DOBBY.
- De fournir les images disponibles et, si l'outil le permet, des illustrations culinaires nouvelles, sans inventer de fichier ou d'URL inexistants.
- De proposer une adaptation Thermomix TM5 pour chaque recette lorsque cela est possible.

La sortie finale doit comprendre toutes les recettes collectées, pas seulement le dernier lot de photographies.

### E07-14 — Contrat JSON

Partir du format natif actuel :

`format: "dobby-recipes"`

`version: 1`

`recipes: [...]`

Conserver l'import des fichiers V1.

Prévoir une évolution versionnée compatible permettant de conserver, pour chaque recette :

- Identifiant stable ou clé d'import.
- Nom et catégorie.
- Origine/source.
- Portions de référence.
- Temps de préparation.
- Temps de cuisson.
- Temps de repos.
- Durée totale.
- Ingrédients structurés : nom, quantité, unité.
- Étapes classiques ordonnées.
- Matériel nécessaire.
- Conseils et notes.
- Image ou référence locale de média.
- Informations manquantes/incertaines.
- Adaptation Thermomix TM5 associée.

Inspecter le vrai `validateBatch()` et les modèles natifs avant de figer l'extension.

Ne pas introduire un JSON enrichi incompatible avec le validateur existant.

### E07-15 — Adaptation Thermomix TM5

**Une seule recette doit pouvoir posséder deux modes de préparation.**

- Classique.
- Thermomix TM5.

Conserver la recette originale.

Pour la variante TM5, enregistrer lorsque disponibles :

- Étapes.
- Durées.
- Températures.
- Vitesses.
- Sens inverse.
- Accessoires.
- Instructions de préparation au four ou autres opérations externes.
- Avertissements et incertitudes.
- Statut de vérification humaine.

Réutiliser le mécanisme `tmAdaptations` existant plutôt que dupliquer la recette.

Une adaptation générée par IA doit rester **« À vérifier »** avant utilisation, surtout si certains réglages ou contraintes de sécurité ne sont pas établis.

Ne jamais inventer des paramètres TM5 pour obtenir artificiellement une adaptation complète.

Prévoir un mécanisme compatible avec l'ajout ultérieur d'une variante TM5 à une recette déjà enregistrée.

La revue détaillée de l'écran TM5 et du mode Cuisine est réservée au prochain lot.

### E07-16 — Images et import ZIP

Le JSON ne doit pas contenir de photographies encodées en base64 de grande taille.

Pour les recettes illustrées, accepter un ZIP regroupant :

- Un fichier JSON descriptif.
- Les images réelles dans un sous-dossier.
- Des références relatives vers ces images.

Refuser les chemins dangereux, fichiers non autorisés, références externes trompeuses et volumes excessifs.

Adapter les limites aux usages raisonnables sans dégrader le comportement existant pour les fichiers JSON.

Si l'IA ne peut fournir que le JSON, autoriser l'import sans images et permettre leur ajout ultérieur.

Préserver les photos originales et leurs liens avec les recettes.

## 7. Enregistrement et synchronisation

Réutiliser les mécanismes existants :

- Writer natif Cuisine.
- Validation des lots.
- Contrôle des doublons.
- Module familial `recipes`.
- Mécanisme de synchronisation Supabase existant.
- `tmAdaptations`.

Ne pas créer un deuxième registre de recettes.

Avant import :

- Vérifier les données.
- Présenter les éventuels doublons.
- Permettre de conserver, ignorer ou remplacer une recette compatible.
- Éviter tout écrasement silencieux.
- Conserver les variantes et annotations existantes.

Après confirmation, enregistrer via le mécanisme natif et vérifier le résultat.

Si un foyer authentifié utilise déjà le partage Recettes, respecter ce contrat et son mécanisme de synchronisation.

Ne jamais afficher « Enregistré dans Supabase » sans confirmation serveur vérifiable.

Pour les photos, utiliser un stockage privé autorisé lorsqu'il existe et que son contrat est vérifié. Sinon, signaler précisément le blocage sans prétendre que les images sont synchronisées.

**Aucune migration SQL, création de bucket ou modification Supabase réelle n'est autorisée par cette mission.**

Ne pas introduire de nouvelle API, nouvelle infrastructure, service payant, secret ou clé côté navigateur.

L'aperçu public reste fictif et isolé : il ne doit pas exposer de comptes, recettes privées ou photos familiales réelles.

## 8. Sous-pages hors périmètre

Ne pas redessiner ni refaire pour le moment :

- Fiche Recette détaillée.
- Choisir un repas.
- Planification détaillée.
- Mode Cuisine.
- Mode Thermomix pendant la cuisson.
- Pages complètes des Courses.
- Gestion approfondie des ingrédients des menus.

Conserver leurs routes et comportements existants.

Modifier uniquement les raccordements strictement nécessaires depuis la Taverne, le catalogue et le nouvel import.

## 9. Exécution et checkpoints

### Checkpoint A — Présentation

Corriger la page principale de la Taverne, le calendrier, le Grimoire et le catalogue.

Preuves : captures avant/après et tests ciblés à 320, 390 et 1440 px.

### Checkpoint B — Interactions

Vérifier recherche, filtres, favoris, navigation, illustrations, sons et effets.

Preuves : interactions réelles et contrôles de persistance.

### Checkpoint C — Création et import IA

Raccorder le bouton unique, le choix manuel/IA, le prompt externe et l'import JSON/ZIP.

Vérifier :

- Recette manuelle.
- Lot de plusieurs recettes.
- Ancien fichier V1.
- JSON enrichi.
- Images manquantes ou présentes.
- Recettes incomplètes.
- Doublons.
- Variante TM5.
- Annulation.
- Réimport du même fichier sans doublon ni écrasement.
- Rechargement et conservation.

Aucun test ne doit appeler une IA payante. Utiliser des fixtures déterministes.

### Checkpoint D — Non-régression

Exécuter les tests E07 utiles, puis les tests ciblés des parcours communs concernés.

Élargir à une campagne globale uniquement lorsque le changement de composants partagés le justifie.

Ne pas répéter les campagnes complètes sans modification causale.

Contrôler la préservation de E01 à E08, des sources Stitch et des mécanismes de stockage.

## 10. Déploiement autorisé

**L'utilisateur autorise la publication d'un nouvel aperçu E07, pas la mise en production générale de DOBBY.**

Réutiliser le générateur existant :

`scripts/build-dobby-review.cjs`

Publier un dossier d'aperçu distinct, par exemple :

`essai-dobby-e07-review-20261111/`

Le nom définitif doit être vérifié comme disponible avant publication.

Le déploiement doit :

- Être autonome et utilisable sur téléphone.
- Intégrer les écrans E07 corrigés issus de la nouvelle branche.
- Conserver un environnement de démonstration fictif, sans backend réel ni données privées.
- Ne pas écraser l'aperçu intégré E01–E08 existant.
- Ne pas modifier les autres dossiers publiés.
- Ne pas fusionner les branches applicatives.
- Ne pas modifier la production Supabase.
- Ne pas introduire de secrets.

Si GitHub Pages nécessite un commit statique sur la branche de publication, autorisation limitée à l'ajout du **nouveau dossier d'aperçu**, après vérification des arbres et de l'absence de conflit.

Aucun force-push ni remplacement d'un dossier existant.

En cas de conflit avec une publication concurrente, conserver la branche validée et arrêter uniquement la publication concernée.

Après publication :

1. Vérifier le résultat du workflow de déploiement.
2. Vérifier que l'URL retourne réellement les ressources attendues.
3. Tester le parcours hébergé sur des données fictives.
4. Comparer le manifeste/les empreintes de l'aperçu avec la version source validée.
5. Fournir l'URL exacte de l'aperçu.

Une CI verte seule ne constitue pas une recette hébergée.

## 11. Conditions de réussite

La mission est terminée lorsque :

- La Taverne affiche Midi et Soir avec des illustrations ou replis cohérents.
- Le calendrier hebdomadaire compact est opérationnel.
- Les textes du Grimoire et des Courses sont lisibles.
- Le bandeau Grimoire est correctement composé.
- Les effets visuels et sonores respectent les préférences communes.
- Les encarts techniques inutiles ont disparu.
- Le catalogue dispose d'une recherche et de filtres visibles sans défilement horizontal.
- Chaque carte présente une durée cohérente, un favori fonctionnel et les actions Consulter/Planifier.
- Un seul bouton principal ouvre le choix d'ajout de recettes.
- La saisie manuelle fonctionne toujours.
- Le prompt IA est copiable et complet.
- L'import JSON existant reste compatible.
- Les fichiers enrichis/ZIP pris en charge sont validés avant écriture.
- Les adaptations TM5 sont associées à la recette sans duplication.
- Les données existantes, favoris, recettes, variantes et historiques sont préservés.
- Les tests ciblés et de non-régression sont documentés.
- L'aperçu isolé est publié et son fonctionnement hébergé vérifié.

En cas de blocage objectif, ne pas inventer de réussite : livrer les éléments effectivement terminés, avec une liste précise des fonctionnalités bloquées et des preuves correspondantes.

## 12. Livrables obligatoires

Produire un rapport compact sous `docs/dobby-v7/` comprenant :

1. Branche et commits.
2. Fichiers modifiés.
3. Décisions fonctionnelles et format JSON retenu.
4. Tests exécutés, PASS/FAIL et preuves.
5. Captures avant/après aux trois largeurs.
6. Vérification des données après import/rechargement.
7. Statut réel de la synchronisation Supabase.
8. URL de l'aperçu publié, commit et workflow.
9. Vérification de préservation des autres pages.
10. Liste des points restant à examiner lors de la prochaine revue des sous-pages.

Distinguer strictement :

- `CODE_MODIFIÉ`
- `TESTS_EXÉCUTÉS`
- `INTÉGRATION_VÉRIFIÉE`
- `DÉPLOIEMENT_APERÇU_CONFIRMÉ`
- `FONCTIONNEMENT_HÉBERGÉ_VÉRIFIÉ`
- `SYNCHRONISATION_RÉELLE_NON_VÉRIFIÉE`, lorsque pertinent.

Ne pas réécrire le registre de décisions historique ni perdre les révisions précédentes.

Ne pas déclarer E07 entièrement terminé : seules les pages examinées dans cette mission sont concernées.

**Exécuter la mission jusqu'à la publication de l'aperçu vérifié ou jusqu'à un blocage réel. Ne pas interrompre le développement pour demander une validation entre les checkpoints ordinaires. Arrêter ensuite pour la revue utilisateur des sous-pages.**