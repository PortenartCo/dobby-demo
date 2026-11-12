# DOBBY — Consolidation du Salon des Curiosités et mémos familiaux

**MODE : EXÉCUTION AUTORISÉE**

Dépôt : `PortenartCo/dobby-demo`

Référence : commit E07.4 `69ef361ad139356c2d1473d825f9231e7610b0e4`

Créer une branche dédiée `feat/dobby-e09-famille-salon-20261112` et un worktree indépendant. Vérifier leur disponibilité avant création.

**Deux autres sessions Codex travaillent actuellement dans le dépôt.** Ne modifier ni leurs worktrees, ni leurs branches, ni leurs commits.

## 1. Mission

Implémenter **toutes les corrections validées du Salon des Curiosités** lors de la revue utilisateur du 12 novembre 2026.

Livrer un aperçu autonome et fonctionnel, puis s'arrêter pour la revue approfondie des trois sous-pages :
- Gérer les membres
- Ajouter un événement
- Ajouter un mémo

Ces sous-pages doivent rester accessibles et fonctionnelles. Leur refonte détaillée est hors périmètre de la présente mission.

Ne pas reconstruire les maquettes Stitch ni modifier les autres modules.

## 2. Références existantes

Lire les éventuelles instructions `AGENTS.md` applicables.

Fichiers principaux vérifiés :
- `essai-stitch-v7/famille.html`
- `essai-stitch-v7/family.js`
- `essai-stitch-v7/family.css`
- `essai-stitch-v7/family-register.js`
- `essai-stitch-v7/family-engine.js`
- `essai-stitch-v5-famille/family-modules.js`
- `essai-stitch-v7/home.js`
- `essai-stitch-v7/home-consolidation.css`

Le fichier `family.js` contient `renderSalon()`. Le fichier `family-register.js` contient les fonctions existantes des mémos.

Réutiliser le générateur et la procédure de publication des aperçus déjà employés par DOBBY.

## 3. Corrections du Salon

### A. Illustration principale

Conserver l'image existante de Dobby devant l'Horloge Enchantée.

- Déplacer « CABINET DES CURIOSITÉS » en bas à droite de l'image.
- Supprimer entièrement « Cheminée allumée ».
- Conserver le cadrage et la hauteur générale de l'illustration.
- Ne pas masquer Dobby ou l'horloge avec le cartouche.

### B. Bandeau d'introduction

Remplacer le grand encart actuel par une présentation compacte, cohérente avec la Taverne Gourmande.

Contenu à conserver :
- Surtitre discret : « FAMILLE & SYNCHRONISATION »
- Titre : « Le Salon des Curiosités »
- Description courte : « Organisation familiale, rituels et événements du foyer. »

Supprimer :
- La longue citation de Dobby.
- La signature « Note manuscrite de Dobby ».
- Le bouton « Programmer un rituel ou événement ».

Le dernier bouton fait double emploi avec « Ajouter un événement » dans l'Agenda Enchanté.

Objectif : réduction significative de la hauteur du bandeau et meilleure cohérence entre modules.

### C. Les trois rubriques

Conserver exactement trois rubriques principales, dans cet ordre.

**1. L'Horloge Enchantée**
- Sous-titre : « Les membres de notre foyer »
- Bouton à droite : « Gérer les membres »
- Afficher les membres réellement enregistrés.
- Ne pas inventer de membre, de portrait ou de rôle.

**2. L'Agenda Enchanté**
- Renommer l'ancien titre « La Gazette & Agenda Rituel ».
- Sous-titre : « Rendez-vous et événements familiaux »
- Bouton à droite : « Ajouter un événement »
- Conserver l'agenda et le writer d'événements existants.

**3. La Volière aux Messages**
- Sous-titre : « Notes et pense-bêtes du foyer »
- Ajouter le bouton « Ajouter un mémo » à droite du titre.
- Afficher les mémos familiaux enregistrés.
- Ouvrir le parcours de création de mémo depuis le bouton.

Les trois titres doivent utiliser exactement le même système typographique que les sections de la Taverne : police, taille, graisse, couleur, interlignage et marges.

Harmoniser également les sous-titres et les trois boutons.

À 320 px, autoriser une disposition sur deux lignes pour éviter les coupures ou chevauchements.

### D. Encadrés vides

Remplacer les encadrés pointillés actuels :

- « Aucun membre du foyer enregistré »
- « Aucun événement partagé à venir »
- « Aucun mémo familial enregistré »

Réutiliser le traitement des états vides de l'Accueil E01, notamment « Festin du Soir ».

Attendu :
- Carte brune cohérente.
- Bordures discrètes, sans pointillés.
- Message principal doré.
- Petite explication secondaire.
- Espacement compact.

Ne pas créer une nouvelle famille de styles si les composants existants conviennent.

### E. Archives et accès rapides

Supprimer entièrement du Salon la section « Archives & Accès Rapides », y compris ses cartes et boutons ajoutés dynamiquement.

Ne supprimer aucune fonctionnalité sous-jacente.

Les accès rapides existent déjà dans le menu secondaire « … ».

Vérifier que les fonctions d'archives et de sauvegardes restent accessibles depuis ce menu ; ajouter seulement le point d'accès manquant, le cas échéant.

Ne pas dupliquer le menu ni ses destinations.

## 4. Mémos partagés — Correction fonctionnelle obligatoire

**Décision utilisateur : tous les nouveaux mémos familiaux doivent être synchronisés entre les membres du foyer.**

Constat de l'existant :
- Les mémos sont stockés dans `familyNotes` localement.
- Le module synchronisé `family` contient actuellement `familyMembers`, `famContacts`, `famLists`, `familyEvents` et `sharedHealthVisits`.
- Les mémos ne sont pas inclus dans ce partage.

### Comportement attendu

Implémenter les mémos familiaux partagés en réutilisant **le module `family` existant** et ses mécanismes de synchronisation.

- Ajouter un registre dédié aux mémos partagés dans le module familial existant, sans remplacer les anciens mémos locaux.
- Réutiliser autant que possible les champs et formulaires déjà en place : titre, contenu, mots-clés.
- Chaque nouveau mémo familial possède un identifiant stable.
- Création, modification et suppression synchronisables entre membres connectés au même foyer.
- Un mémo créé hors ligne reste disponible localement et doit être synchronisé à la reconnexion.
- Préserver la résolution des conflits et la révision des modules déjà implémentées.
- Ne pas écraser silencieusement un mémo modifié sur un autre appareil.
- Aucun nouveau système d'authentification, service externe ou tableau de bord d'administration.

**Compatibilité historique :**
- Conserver les anciens `familyNotes` locaux.
- Ne jamais les partager automatiquement.
- Prévoir une action explicite permettant leur importation dans les mémos familiaux partagés.
- Ne pas introduire de doublons lors de cet import.
- Ne pas effacer les anciens mémos après une simple tentative de partage.
- Préserver les autres champs du module `family`, y compris lors de la lecture d'anciennes versions du payload.

Vérifier particulièrement le risque qu'un ancien client, ne connaissant pas le nouveau champ des mémos, puisse écraser celui-ci lors d'une mise à jour du module familial.

Si le module n'est pas connecté ou activé, afficher honnêtement l'état local/en attente. Ne jamais afficher « Synchronisé avec le foyer » sans confirmation.

Ne pas intégrer les mémos à Missions, Runes ou Contrats.

Aucune migration SQL ni modification directe du Supabase réel n'est autorisée dans cette mission. Réutiliser l'infrastructure familiale existante.

## 5. Contraintes de coexistence

Les deux autres sessions travaillent en parallèle.

- Aucune modification des branches ou worktrees voisins.
- Aucun force-push.
- Aucune modification des traitements Runes, Missions, Cuisine ou Courses.
- Ne pas réécrire les composants communs de navigation ou d'effets.
- Limiter `family-modules.js` aux modifications strictement nécessaires au module `family`.

**Attention : `family-modules.js` contient aussi la logique des Runes.** Une autre session peut le modifier.

Conserver les changements sous forme de commits isolés. Ne pas fusionner automatiquement les branches. Signaler le chevauchement pour l'intégration finale.

La publication de l'aperçu ne doit jamais remplacer un dossier d'essai existant.

## 6. Exécution par checkpoints

**Checkpoint A — Interface**

Réaliser les corrections visuelles du Salon.

Vérifier :
- Illustration.
- Bandeau compact.
- Trois rubriques.
- Boutons.
- États vides.
- Suppression des accès rapides redondants.

**Checkpoint B — Mémos familiaux**

Implémenter et raccorder le registre partagé.

Vérifier par tests ciblés :
- Création et relecture d'un mémo.
- Modification et suppression.
- Propagation entre deux clients de test.
- Conservation des mémos locaux historiques.
- Import explicite sans doublons.
- Édition concurrente sans écrasement silencieux.
- Préservation des autres données du module Famille.

Utiliser des comptes et données de test. Ne pas modifier le foyer réel.

**Checkpoint C — Aperçu**

Effectuer une vérification visuelle à 320, 390 et 1440 px et un parcours léger des trois boutons.

Ne pas lancer une campagne exhaustive E01–E08 sans régression détectée.

Créer les commits et pousser la branche.

Publier un **nouvel aperçu indépendant sur GitHub Pages**, avec stockage et données de démonstration isolés, en utilisant le générateur existant.

Ne pas fusionner dans la version principale.

## 7. Définition de DONE

La mission est terminée lorsque :

1. Toutes les corrections visuelles validées sont implémentées.
2. Les trois boutons sont présents, correctement positionnés et ouvrent leurs parcours.
3. Les mémos familiaux sont implémentés dans le module partagé, sans destruction des mémos locaux.
4. Les scénarios ciblés de synchronisation et de non-écrasement sont réussis en environnement de test.
5. L'aperçu indépendant fonctionne sur GitHub Pages.
6. Les autres modules sont préservés.

Fournir :
- URL de revue.
- Branche et SHA des commits.
- Liste des fichiers modifiés.
- Résultats des tests ciblés.
- Preuves de publication et fonctionnement hébergé.
- Limites restantes, notamment toute validation réelle sur deux appareils encore non effectuée.
- Éventuels conflits avec les branches parallèles.

**Poursuivre l'exécution jusqu'à la livraison de l'aperçu ou à un blocage réellement démontré. Ne pas s'arrêter après le simple diagnostic ou la préparation d'une PR.**

La prochaine mission, après revue utilisateur, portera sur les trois sous-pages : Gérer les membres, Ajouter un événement et Ajouter un mémo.