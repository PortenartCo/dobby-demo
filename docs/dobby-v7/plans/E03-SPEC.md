# CODEX — DOBBY E03 : Finalisation de la Bibliothèque des Missions

**MODE : EXÉCUTION — Mission autonome, bornée, avec preuves.**

## 1. Contexte et références

Dépôt : `PortenartCo/dobby-demo`

Référence Git vérifiée : `258b0f923491b03d78c72ba1b1edd29ab72e6a84`

PR existante : #3 — travaux Stitch E01/E02.

Fichiers principaux :
- `essai-stitch-v7/missions.html`
- `essai-stitch-v7/root-adapters.js` — fonction `missions(d)`
- `essai-stitch-v7/chrome.js`
- `essai-stitch-v7/chrome.css`
- `essai-stitch-v7/tools-register.js` — raccordement du formulaire existant

Maquette originale :

`design/stitch-53/dobby_la_biblioth_que_des_missions_t_ches_magiques/code.html`

Formulaire Stitch existant :

`famille.html#mission-edit`

Respecter les éventuels `AGENTS.md` applicables et les contrats E01/E02.

Créer une branche ou un worktree E03 isolé, à partir du dernier état E02 vérifié. Ne pas modifier une branche utilisée simultanément pour E02.

## 2. Objectif

Finaliser la page « Bibliothèque des Missions » selon les décisions de revue validées avec l'utilisateur.

**Conserver l'identité graphique de Stitch, mais uniformiser la structure avec les pages Accueil E01 et Parler à Dobby E02.**

Ne pas redessiner librement la page. Ne pas reconstruire le système métier.

## 3. Header commun

Le header actuel de Missions n'est pas suffisamment harmonisé.

Réutiliser exclusivement le composant commun E01/E02 :

- Même hauteur et mêmes dimensions.
- Mêmes marges, espacements, couleurs et typographies.
- Étoile : activation/désactivation des effets magiques.
- Son : activation/désactivation des sons et des réponses vocales concernées.
- Profil : ouverture du compte utilisateur via l'action native.
- Sous-titre adapté à la page Missions.

Les trois commandes doivent réellement fonctionner, et les préférences doivent persister entre les pages.

Ne pas créer de second système de gestion du header.

## 4. Hero Missions

Conserver obligatoirement l'illustration originale Stitch représentant Dobby dans la bibliothèque.

Modifications validées :

- Harmoniser dimensions, cadrage et présentation avec les autres pages DOBBY.
- Préserver correctement le visage et le buste de Dobby.
- Supprimer « Tome VII · Rayon D ».
- Placer « Grimoire des missions » dans l'emplacement visuel précédemment occupé par « Tome VII · Rayon D ».
- Supprimer ou réorganiser l'ancien badge supérieur pour éviter deux cartouches identiques.
- Conserver le titre « La Bibliothèque des Missions ».

Le hero doit rester compact et ne pas repousser inutilement les missions sous la ligne de flottaison.

Aucune nouvelle illustration.

## 5. Introduction

Supprimer entièrement :

- La longue citation introductive de Dobby.
- Sa signature.

Conserver le bouton principal :

**« INSCRIRE UNE NOUVELLE MISSION »**

Il doit être immédiatement accessible après le titre.

## 6. Bouton de création — raccordement obligatoire

Le bouton « Inscrire une nouvelle mission » doit ouvrir directement la page Stitch existante :

`famille.html#mission-edit`

Comportement :

- Ouvrir le formulaire actuel en mode création.
- Ne pas préremplir la fiche avec une mission précédente.
- Réutiliser les fonctions et writers natifs existants.
- Vérifier que l'enregistrement et le retour vers Missions fonctionnent réellement.

**Interdiction de modifier l'apparence, les champs ou le fonctionnement interne du formulaire Stitch « Ajouter une mission ».**

Cette page fera l'objet d'une revue distincte avec l'utilisateur.

Aucun formulaire générique parallèle.

## 7. Filtres des missions

Remplacer les filtres actuellement partiellement masqués et nécessitant un défilement horizontal.

Conserver exactement quatre filtres :

1. À faire
2. Toutes
3. Urgentes
4. Terminées

Sur iPhone, les présenter sous forme d'une **grille 2 × 2**, avec les quatre boutons simultanément visibles.

Préserver les couleurs dorées, arrondis et pictogrammes de l'univers Stitch.

Fonctionnement :

- « À faire » sélectionné par défaut.
- « Toutes » affiche les missions ouvertes et terminées.
- « Urgentes » repose sur les échéances réellement enregistrées : missions en retard ou arrivant à échéance aujourd'hui, sans niveau de priorité inventé.
- « Terminées » affiche les missions réellement clôturées.
- Les compteurs affichent uniquement des quantités réelles.

Aucune donnée fictive.

## 8. Cartes de missions

L'adaptation actuelle présente de grandes cartes avec plusieurs boutons.

Cela ne correspond pas au fonctionnement validé.

Créer des cartes compactes inspirées de la composition Stitch originale.

Afficher uniquement les informations pertinentes réellement disponibles :

- Titre.
- Responsable.
- Échéance.
- Statut.

**Pour les missions manuelles, un clic sur la carte entière ouvre directement la page Stitch existante de modification**, avec le bon identifiant de mission et les champs préremplis.

Les commandes Modifier, Terminer, Supprimer et Réattribuer restent dans la fiche existante, selon ses capacités actuelles.

Ne pas afficher trois gros boutons sur chaque carte.

Les missions automatiques doivent être distinguées des missions manuelles. Lorsqu'elles ne disposent pas d'une fiche de modification, ouvrir leur fiche source réelle si possible ; sinon proposer une consultation sans simuler une modification.

Respecter l'accessibilité clavier et tactile des cartes cliquables.

## 9. Répartition de la Maisonnée

Conserver cette section et son esthétique Stitch.

Afficher pour chaque membre réellement enregistré :

- Avatar.
- Nom.
- Nombre réel de missions ouvertes attribuées.

Supprimer :

- Pourcentages de progression fictifs.
- Récompenses inventées.
- Statistiques sans données sous-jacentes.

Un clic sur un membre filtre les missions qui lui sont attribuées.

Les missions non attribuées doivent rester accessibles.

Le filtre par membre et les quatre filtres de statut doivent fonctionner ensemble sans incohérence.

## 10. Suppressions définitives

Supprimer complètement de la page :

**« Note du Maître des Archives »**
- Texte.
- Boutons.
- Cartes.
- Suggestions non opérationnelles.

**« Sceau de protection locale Dobby »**
- Cadenas.
- Texte technique.
- Badge AES-256.
- Conteneur graphique.

Ne pas remplacer ces éléments par d'autres encarts décoratifs ou techniques.

## 11. Navigation inférieure

Réutiliser le composant commun E01/E02.

Les cinq destinations doivent être présentes et identiques :

- Traverse
- Missions
- Taverne
- Famille
- Menu

Missions doit être visuellement actif.

Mêmes dimensions, espacements, icônes, couleurs et comportement que sur les autres pages.

La barre reste fixe sans masquer le contenu.

## 12. Cohérence fonctionnelle

Conserver les données natives existantes.

Vérifier notamment :

- Une mission créée apparaît dans la Bibliothèque.
- Les modifications sont reflétées après enregistrement.
- Une mission clôturée figure parmi les terminées.
- Les missions ouvertes sont cohérentes avec celles affichées sur E01.
- Les actions effectuées depuis E02 sont visibles dans Missions.
- Les échéances et attributions correspondent aux données réellement stockées.
- Aucun doublon ou effet métier fictif.

Ne pas ajouter de writer, de table Supabase ou de système de synchronisation.

## 13. Recette obligatoire

Réaliser des tests ciblés et captures sur :

- 320 px.
- 390 px.
- 1440 px.

Scénarios :

- Page vide.
- Missions ouvertes.
- Missions terminées.
- Missions urgentes et non urgentes.
- Plusieurs membres avec missions attribuées.
- Missions sans responsable.
- Filtre individuel combiné au filtre de statut.
- Bouton création vers le formulaire Stitch brut.
- Carte de mission vers la modification préremplie.
- Enregistrement puis retour à la Bibliothèque.
- Persistance après rechargement.
- Header, navigation et préférences communes.
- Absence de débordement horizontal et de contenu masqué.

Comparer les captures au HTML Stitch original, puis contrôler l'uniformité avec E01/E02.

Lancer les tests ciblés, puis une seule passe de non-régression pertinente. Attendre les CI du commit final si une branche/PR de contrôle est ouverte.

Ne pas répéter inutilement des tests déjà réussis sans changement causal.

## 14. Périmètre et interdictions

- Ne pas modifier les HTML originaux Stitch.
- Ne pas modifier la V5.
- Ne pas modifier E01 et E02, sauf correction strictement nécessaire d'un composant commun, avec preuve de non-régression.
- Ne pas modifier le contenu du formulaire « Ajouter une mission ».
- Ne pas modifier les données familiales réelles.
- Ne pas effectuer de migration SQL.
- Ne pas déployer.
- Ne pas fusionner de PR.
- Ne pas ajouter de fonctionnalités métier non validées.
- Ne pas commencer une autre page.

Si une dépendance externe à E03 empêche un point précis, documenter ce blocage et terminer les autres points réalisables sans élargir le périmètre.

## 15. Définition de DONE

Mission terminée lorsque :

1. Toutes les décisions graphiques E03 sont appliquées.
2. Les quatre filtres sont fonctionnels et directement visibles.
3. Les cartes ouvrent le bon formulaire existant.
4. La répartition familiale utilise les données réelles.
5. Le header et la navigation sont uniformisés.
6. Les encarts supprimés ne réapparaissent pas.
7. Les tests ciblés et la non-régression passent.
8. Les captures de référence et de résultat sont disponibles.
9. Aucun composant E01/E02 ni formulaire d'ajout n'a régressé.

## 16. Rapport final

Fournir un compte rendu synthétique :

- Branche et SHA final.
- Fichiers modifiés.
- Fonctionnalités effectivement vérifiées.
- Résultats des tests et CI.
- Liens vers les captures comparatives.
- Écarts ou limites restantes.
- Confirmation : aucune fusion, aucune publication et aucune modification du formulaire « Ajouter une mission ».

**Arrêt après E03. Attendre la revue humaine avant publication.**