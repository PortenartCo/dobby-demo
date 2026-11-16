# CODEX — DOBBY V7 — Refonte complète de Paramètres et consolidation finale

**MODE : EXECUTION**

## 1. Mission

Finaliser DOBBY V7 en deux phases successives :

**Phase A — Refonte complète de Paramètres**
Remplacer intégralement l'interface actuelle par une page simple, cohérente avec le design system DOBBY et organisée autour de trois rubriques.

**Phase B — Consolidation générale**
Intégrer les derniers développements validés (Archives, Notes, Contacts et Paramètres), vérifier les fonctionnalités transversales et déployer une version cohérente.

Procéder de manière autonome jusqu'à la livraison vérifiée ou jusqu'à un blocage matériel clairement démontré.

Ne pas recréer les fonctionnalités natives déjà disponibles.

## 2. Références techniques

Dépôt : `PortenartCo/dobby-demo`.

Fichiers vérifiés comme points d'entrée :

- `essai-stitch-v7/tools-register.js` — fonction `settings()`, qui construit actuellement la page Paramètres.
- `essai-stitch-v7/templates/remaining/menu.html` — accès depuis le Menu.
- `essai-stitch-v7/templates/remaining/backup.html` — référence de l'interface Sauvegarde et restauration.
- `essai-stitch-v7/register.js` — routage des vues.
- `essai-stitch-v7/register-route-data.js` et `register-routes.json` — contrats de routes et limites documentées.

Repérer ensuite les seuls modules nécessaires aux préférences magiques, à la gestion du foyer, à la sauvegarde, aux documents autonomes et à la synchronisation.

Respecter les éventuels `AGENTS.md` applicables.

Ne pas modifier les moteurs natifs sans nécessité démontrée.

## 3. Nouvelle interface Paramètres

Abandonner intégralement l'organisation actuelle.

Conserver :
- Le header DOBBY officiel.
- Le profil utilisateur en haut à droite.
- Le dock fixe unique : Accueil / Tâches / Repas / Courses / Famille / Menu.
- La palette, les typographies, les composants et les effets du design system.

La page affiche uniquement le titre **« Paramètres »**, une courte description et trois cartes de navigation :

### A. Ambiance magique

Icône magique et sous-titre « Effets visuels et sons de DOBBY ».

Ouvrir une vue simple comprenant uniquement :

- Interrupteur « Effets magiques ».
- Interrupteur « Sons ».

Les deux commandes doivent agir sur les préférences natives déjà utilisées par le Menu alchimique et les contrôles sonores existants.

Garanties :
- Aucun second stockage concurrent.
- État cohérent entre Paramètres et les autres écrans.
- Conservation des préférences après navigation et rechargement.
- Effets magiques activés par défaut à la première utilisation, conformément à la décision utilisateur.
- Respect du choix ultérieur de désactivation.
- Ne pas déclencher automatiquement des sons non demandés.

### B. Gestion du foyer

Icône représentant la famille et sous-titre « Membres, invitations et accès familiaux ».

Cette rubrique doit ouvrir la gestion native existante du foyer.

Ne pas créer un deuxième module de gestion familiale.

Conserver les fonctionnalités et autorisations réellement disponibles :
- Consultation et gestion des membres.
- Invitations existantes.
- Accès et permissions parentales.
- Navigation vers Famille lorsque nécessaire.

Ne pas activer les permissions enfant actuellement bloquées ni créer de nouvelle logique d'authentification.

### C. Données et sauvegardes

Icône de sauvegarde et sous-titre « Sauvegarder, restaurer et retrouver les anciens documents ».

Cette rubrique comporte trois fonctions.

**1. Sauvegarder les données**

Réutiliser la sauvegarde native complète déjà développée.

Prévoir :
- Une explication courte.
- Un bouton « Créer une sauvegarde ».
- Un retour explicite de réussite ou d'échec.
- Un téléchargement réel du fichier.

Respecter le véritable format du système. Le registre existant documente une sauvegarde JSON `dobby-complete-backup`, et non un fichier `.dobbyarchive` chiffré.

Ne jamais prétendre que la sauvegarde est chiffrée si elle ne l'est pas. Conserver un avertissement clair sur la confidentialité des données exportées.

**2. Restaurer une sauvegarde**

Prévoir :
- Sélection du fichier.
- Validation de son format et de son contenu.
- Présentation compréhensible des conséquences de l'opération.
- Confirmation explicite avant toute restauration potentiellement destructive.
- Résultat ou erreur visible.

Réutiliser le moteur natif et les contrôles d'intégrité existants.

Ne jamais effectuer de restauration automatiquement lors de l'ouverture de la page.

**3. Documents enregistrés**

Conserver un accès aux anciens documents autonomes enregistrés dans DOBBY.

Cette fonctionnalité est distincte du nouveau mécanisme Archives : ne pas confondre documents autonomes historiques et fiches archivées dans leurs modules d'origine.

Aucune suppression ni migration automatique des anciens documents.

### Synchronisation

La synchronisation familiale doit normalement fonctionner automatiquement.

Ne pas conserver le gros bouton permanent « Synchroniser le foyer ».

Afficher, seulement si utile, un indicateur discret et exact de l'état natif : synchronisé, hors ligne, en attente ou erreur.

Ne jamais afficher un succès fictif.

Si le système exige encore une intervention manuelle de reprise, conserver l'action nécessaire dans un état d'erreur contextualisé, sans la présenter comme un réglage quotidien.

## 4. Éléments supprimés

Retirer de la page principale :

- « Retour au Menu ».
- L'ancienne liste de boutons disparates.
- « Synchroniser le foyer » comme action permanente.
- « Options de la liste » et le texte relatif aux articles de courses.
- Les messages techniques de connexion permanents.
- Les indications de protocole ou de stockage sans intérêt pour l'utilisateur.
- Les éléments décoratifs et les descriptions longues qui encombrent les paramètres.

Ne pas ajouter une grande illustration de Dobby.

L'interface doit rester sobre, rapide et cohérente avec les autres modules.

## 5. Ergonomie et navigation

- Trois cartes principales harmonisées.
- Icônes clairement identifiables.
- Typographie lisible, texte courant à 16 px minimum.
- Surface complète de chaque carte cliquable.
- Fonctionnement clavier et mobile.
- Retour simple depuis chaque rubrique.
- Header et dock toujours visibles.
- Aucun doublon de navigation.
- Aucun débordement horizontal ni superposition des commandes.

Les boutons doivent exécuter des actions réelles : pas de contrôle décoratif ou factice.

## 6. Validation fonctionnelle de Paramètres

Effectuer des tests ciblés sur :

1. Ouverture depuis Menu.
2. Navigation dans les trois rubriques.
3. Activation et désactivation des effets magiques.
4. Activation et désactivation du son.
5. Persistance des préférences.
6. Cohérence avec les commandes globales existantes.
7. Accès réel à la gestion du foyer.
8. Création et téléchargement d'une sauvegarde.
9. Lecture et validation d'un fichier de restauration.
10. Confirmation et annulation de restauration.
11. Conservation des fichiers et données dans une restauration simulée.
12. Accès aux anciens documents enregistrés.
13. Affichage exact des états de synchronisation.
14. Fonctionnement hors ligne.
15. Absence de régression sur Famille et Courses.

Tester le rendu à 320, 390, 768 et 1440 px.

Les tests destructifs doivent s'effectuer exclusivement dans un environnement isolé avec des données fictives.

## 7. Consolidation générale DOBBY V7

Après validation du module Paramètres, préparer une branche d'intégration unique.

### Branches concernées

État GitHub précédemment constaté :

- PR #17 : Archives / Stitch 22, en brouillon, avec des correctifs récents.
- PR #18 : Notes du foyer / Stitch 23, en brouillon, commit `1913e98`.
- Contacts / Stitch 24 : développement demandé, livraison finale à retrouver et vérifier.
- Paramètres : développement de la présente mission.

**Vérifier les HEAD, commits, PR et états réels au moment de l'intégration.** Ne pas réutiliser aveuglément d'anciens SHA.

Ne jamais supposer qu'une PR est prête parce que des tests ciblés ont été annoncés comme réussis.

### Intégration

Procéder dans cet ordre :

1. Vérifier que les développements finaux des quatre modules existent.
2. Vérifier leur état et leurs preuves.
3. Intégrer proprement les changements dans une branche unique.
4. Résoudre les conflits, particulièrement sur les routes, le Menu, les vues familiales, la synchronisation et les composants partagés.
5. Contrôler que les illustrations Stitch 22, 23 et 24 validées ont été préservées.
6. Régénérer les artefacts nécessaires depuis les sources, sans modifier directement un bundle généré comme unique source de correction.
7. Exécuter les tests ciblés, puis une non-régression transversale complète justifiée par l'intégration.
8. Exécuter des parcours navigateur réels sur la version intégrée.
9. Publier un aperçu intégré vérifiable.

Ne pas écraser les corrections des autres branches par une version plus ancienne.

### Parcours de recette intégrée

Contrôler notamment :

- Archives : consultation native des fiches, archivage et réactivation avec confirmation.
- Notes : création, édition, recherche et anciens mémos conservés.
- Contacts : création par le bouton principal, formulaire simplifié, fiche détaillée, édition, suppression et archivage lorsque disponible.
- Paramètres : les trois rubriques et leurs fonctions réelles.
- Menu : navigation vers les différents modules.
- Famille : membres, agenda et permissions préservés.
- Contrats et Maison : conservation des fiches, des documents et des fonctionnalités validées.
- Courses et Repas : fonctionnement normal.
- Header, dock, profil et préférences magiques.
- Persistance, sauvegarde, restauration, synchronisation simulée et fonctionnement hors ligne.

Distinguer les tests simulés des vérifications réelles.

Ne pas reprendre les tests HTTP avec les deux vrais comptes familiaux : cette recette reste différée à la phase finale dédiée.

## 8. Déploiement

Le principe d'un **déploiement général consolidé** a été autorisé.

Il est néanmoins conditionné à :
- La disponibilité effective de toutes les branches requises.
- L'absence de conflit non résolu.
- La réussite des tests d'intégration essentiels.
- La conservation des données et des autorisations.
- La validation du comportement de l'aperçu intégré.
- L'absence de migration distante ou d'action risquant de modifier les données familiales réelles.

Si tous les critères sont satisfaits, préparer et réaliser le déploiement de la version consolidée suivant le processus de publication existant, en conservant la possibilité de revenir au dernier état stable.

Si une branche manque, si une fonctionnalité essentielle échoue ou si une validation humaine indispensable manque, **ne pas fusionner prématurément**. Livrer les travaux terminés, l'aperçu intégré disponible et une liste précise des seuls blocages.

Ne pas créer de nouveaux services, agents ou infrastructures.

## 9. Livrables et critères DONE

Fournir :

- Commit(s) et branche Paramètres.
- PR et branche d'intégration.
- Liste des fichiers réellement modifiés.
- Résultats des tests ciblés et transversaux.
- Captures à 320, 390, 768 et 1440 px.
- Preuves de conservation des données, des routes et des permissions.
- URL de l'aperçu intégré.
- SHA de publication, si déploiement réalisé.
- Rapport bref séparant clairement : code développé, tests exécutés, intégration validée, déploiement confirmé et recette réelle non encore effectuée.

**DONE Paramètres :** trois rubriques opérationnelles, sauvegardes et préférences fonctionnelles, aucune perte de données.

**DONE Intégration :** tous les modules attendus réunis, contrôles transversaux réussis, aperçu intégré accessible.

**DONE Déploiement :** publication réellement vérifiée, version identifiable et retour arrière disponible.

Ne pas déclarer la mission totalement terminée si l'un de ces niveaux reste non vérifié.

Exécuter les étapes autorisées sans questions intermédiaires inutiles, tout en respectant les conditions d'arrêt ci-dessus.