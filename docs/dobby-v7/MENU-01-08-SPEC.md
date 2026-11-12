# DOBBY V7 — Reconstruction du Menu général

## Mission

Reconstruire entièrement la page « Menu » conformément aux arbitrages MENU-01 à MENU-08.

L'objectif est un Menu compact, élégant, directement utilisable et parfaitement harmonisé avec les autres écrans de DOBBY.

Il ne s'agit pas de créer de nouvelles fonctionnalités métier.

### 1. Isolation du chantier

Dépôt : `PortenartCo/dobby-demo`.

Vérifier l'état actuel des branches, notamment le déploiement global E01–E09 et les corrections Famille FAM-01 à FAM-24.

Créer une branche et un worktree indépendants pour cette mission, par exemple :

`feat/dobby-v7-menu-simplification`

Ne pas modifier le worktree ou les commits d'une autre session Codex.

Partir de la dernière source V7 validée accessible, en relevant son SHA. Si l'intégration Famille est déjà disponible et vérifiée, privilégier cette base afin de limiter les conflits futurs.

### 2. Nouvelle présentation

La page doit commencer immédiatement par :

**Menu**

Utiliser exactement les conventions graphiques DOBBY : typographie, couleur, espacement, fonds et composants.

Supprimer :
- La grande illustration de Dobby.
- « Index & Clés du Logis ».
- « Grand Sommaire & Outils du Logis ».
- « Tous les Outils de Dobby ».
- La citation et la note d'intendant.
- Les encadrés d'introduction.
- Les boutons décoratifs de réduction des sections.

Conserver le header global et le dock inférieur, tous deux fixes et uniques.

### 3. Recherche du Menu

Conserver une barre de recherche immédiatement sous le titre.

Placeholder :

« Rechercher dans le menu… »

Son rôle est exclusivement de filtrer les cinq rubriques affichées.

La recherche doit :
- fonctionner immédiatement à la saisie ;
- ignorer les différences de majuscules et d'accents ;
- afficher un résultat vide explicite ;
- permettre d'effacer facilement la saisie.

Ne pas utiliser ni réintroduire l'ancien moteur de recherche transversale.

### 4. Les cinq rubriques définitives

Présenter uniquement ces cinq entrées, dans cet ordre :

**1. Maison & Équipements**
- Conserver le lien vers le module existant.
- Ne pas modifier son fonctionnement.

**2. Archives documentaires**
- Conserver le lien vers le registre documentaire existant.
- Ne pas modifier les données ni les pièces jointes.

**3. Contrats & Assurances**
- Conserver le lien vers le module existant.
- Préserver les contrats, échéances et informations enregistrées.

**4. Contacts**
- Conserver le lien vers l'annuaire existant.
- Ne pas supprimer les fiches ou coordonnées.

**5. Paramètres**
- Prévoir une entrée dédiée.
- Y intégrer l'accès à la fonctionnalité existante de sauvegarde et restauration.
- Ne pas recréer de mécanisme de sauvegarde.
- Conserver les commandes globales Effets et Son dans le header, sans duplication.

Aucune autre rubrique n'est autorisée dans le Menu principal.

### 5. Présentation graphique

Utiliser cinq cartes compactes et homogènes :

- Icône à gauche.
- Nom de la rubrique.
- Chevron à droite.
- Toute la carte cliquable.
- Espacements réguliers.
- Typographie et palette DOBBY.
- Bonne lisibilité sur smartphone.

Supprimer les badges artificiels « HUB », « CARNET », « VEILLE », « OCR », « OMNISCIENT », etc.

Supprimer les descriptions longues et tronquées.

Ne pas utiliser de grandes illustrations ni de cartouches supplémentaires.

Les cinq cartes doivent apparaître directement sous la recherche.

### 6. Suppressions obligatoires

Retirer du Menu :

- Traverse / Accueil.
- Missions.
- Taverne gourmande.
- Famille.
- Grimoire des recettes.
- Courses.
- Listes familiales.
- Carnets de santé.
- Recherche locale / Omniscient.
- Importer un fichier / OCR.
- Sanctuaire privé & local / Entrer en Audience.
- Le bloc « Autres accès ».
- Le cartouche inférieur de sécurité.
- Le bouton « Revenir à l'Accueil du Logis ».

Ces suppressions concernent **exclusivement les accès redondants ou inutiles de la page Menu**.

Ne supprimer ni les modules existants, ni leurs données, ni les moteurs natifs dont d'autres écrans dépendent.

Préserver les liens profonds et routes existants nécessaires aux autres écrans.

### 7. Listes familiales et Carnets de santé

Décision d'architecture validée :

**Listes familiales → Famille**
- Destination future : Salon des Curiosités.
- Les listes de courses restent dans la Taverne gourmande.

**Carnets de santé → Famille**
- Destination future : fiche individuelle du membre.
- Le carnet doit rester associé à la bonne identité.

**Important : leur reconstruction et leur intégration définitive sont exclues de cette mission.**

Nous devons d'abord revoir avec l'utilisateur les deux fiches existantes pour sélectionner les informations et actions à conserver.

À ce stade :
- retirer leurs cartes du Menu ;
- préserver les pages, routes, données et writers existants ;
- ne pas créer de nouvelles fiches ;
- ne pas déplacer les données ;
- ne pas fusionner les deux modules ;
- documenter les points d'entrée qui devront être créés ou ajustés lors de leur intégration future à Famille.

Ne pas faire disparaître silencieusement des données ou fonctionnalités.

### 8. Périmètre technique

Modifier uniquement les sources canoniques nécessaires à la page Menu, son routage, ses styles et ses tests.

Le menu est notamment raccordé dans `essai-stitch-v7/tools-register.js`. Vérifier aussi la source des templates et le processus de génération avant toute modification.

Ne pas corriger le problème en modifiant uniquement une copie générée de démonstration.

Aucune migration SQL ou modification Supabase.

Aucune modification fonctionnelle de Missions, Cuisine, Famille, Runes ou Synchronisation.

Ne pas ajouter de nouveaux services, moteurs de recherche, systèmes de stockage ou dépendances superflues.

### 9. Tests

Vérifier :

1. Exactement cinq rubriques visibles.
2. Fonctionnement des cinq liens, y compris Paramètres.
3. Filtre de recherche avec mots partiels, accents et absence de résultats.
4. Header et dock uniques et toujours visibles.
5. Absence de superposition du dock avec les dernières cartes.
6. Rendu à 320, 390 et 1440 px.
7. Navigation aller-retour.
8. Conservation des routes et des données des modules masqués.
9. Absence de régression avec la version Famille et la source globale.

Aucun bouton décoratif ou inerte présenté comme opérationnel.

### 10. Livraison attendue

Créer un rapport :

`docs/dobby-v7/MENU-01-08-IMPLEMENTATION.md`

Y consigner :
- SHA de départ et SHA final ;
- fichiers modifiés ;
- captures des trois résolutions ;
- tests exécutés et résultats ;
- fonctionnement effectif des cinq rubriques ;
- éventuelles dépendances avec la branche Famille ;
- points conservés pour la future revue des Listes familiales et Carnets de santé.

Enregistrer le travail dans un commit local.

**Ne pas publier ni fusionner automatiquement.** L'intégration et le déploiement nécessiteront une revue après livraison.

## Critère DONE

Une page Menu compacte, conforme à DOBBY, présentant exactement cinq rubriques fonctionnelles avec un filtre de recherche simple, sans perte de données, sans nouveau moteur métier et sans régression sur les autres modules.

Exécute cette mission de manière autonome jusqu'aux tests et au commit local.