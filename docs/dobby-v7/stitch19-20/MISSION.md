# DOBBY V7 — Intégration réelle, corrections transversales et déploiement

**Mode : EXÉCUTION. Mission autorisée jusqu'au déploiement vérifié, sous réserve des contrôles ci-dessous.**

Travaille sur le dépôt GitHub `PortenartCo/dobby-demo`.

Point de départ vérifié : `main` au commit `0f3131f3deb1ff63f3accca9c591521b04f4f212`. Vérifie la branche actuelle avant d'intervenir et respecte les éventuelles instructions `AGENTS.md`.

Je joins le fichier `DOBBY_V7_STITCH19_STITCH20_INTEGRATION.zip`.

**Commence par lire `00_LISEZ_MOI.md` et `01_SPECIFICATION/DOBBY_V7_SPEC_INTEGRATION.md` à l'intérieur du ZIP. Ce cahier des charges constitue la référence de cette mission.**

## Objectif

Intégrer les nouveaux écrans et les corrections dans **l'application native DOBBY V7 existante**, puis publier une version réellement utilisable.

Ne crée ni démo parallèle, ni nouvelle application indépendante.

Utilise :
- **Stitch 19** comme référence graphique du parcours d'accueil et d'inscription.
- **Stitch 20** comme référence graphique des deux cérémonies magiques.
- **Le code DOBBY V7 existant** comme source de vérité fonctionnelle pour les questionnaires, calculs, profils, données et synchronisation.

Ne copie pas les simulations, questions inventées, images cassées ou données fictives de Stitch.

## 1. Parcours d'accès à DOBBY

Implémente les parcours suivants.

**Utilisateur sans session :**

Bienvenue → Connexion / Inscription / Invitation.

**Nouveau compte sans invitation :**

Inscription → Création du profil → Création du foyer → Chemin de Traverse → Cérémonie Maison → Cérémonie Patronus → Chemin de Traverse.

**Nouveau compte avec invitation :**

Invitation → Inscription ou connexion → Profil → Confirmation du foyer invité → Chemin de Traverse → Cérémonies Maison et Patronus.

**Utilisateur existant :**

Connexion ou ouverture avec session active → **Cheminette** → téléportation → Chemin de Traverse.

Aucun utilisateur existant ne doit refaire les cérémonies déjà validées.

Supprime la sélection de membres fictifs du parcours d'authentification.

Assure une association fiable entre compte utilisateur, profil personnel et foyer.

## 2. Écrans d'inscription

Intègre les cinq écrans définitifs en respectant les références Stitch :

- Bienvenue.
- Connexion et inscription.
- Création du profil avec galerie d'avatars intégrée.
- Rejoindre un foyer.
- Créer un foyer.

Fusionne l'ancienne page Profil et la galerie séparée.

Réutilise les huit vrais avatars existants et intègre les portraits supplémentaires uniquement si leurs ressources définitives sont disponibles. Aucun portrait cassé, animal ou blason utilisé comme avatar humain par substitution.

Les invitations doivent fonctionner réellement : lien ou code, vérification de validité, expiration et confirmation du bon foyer.

## 3. Cérémonies magiques

Sur le Chemin de Traverse, après une première inscription, ouvre automatiquement :

**Fenêtre Maison :**
- Passer le questionnaire existant ou choisir directement parmi quatre Maisons.
- Réutiliser exactement les questions narratives déjà validées et leur algorithme.
- Conserver le Choixpeau cinématographique, les blasons et les révélations.
- Enregistrer le résultat et distinguer choix manuel et résultat calculé.

**Fenêtre Patronus :**
- Passer le questionnaire existant ou choisir directement parmi les douze Patronus.
- Réutiliser les questions et l'algorithme natifs, sans les versions simplifiées de Stitch.
- Corriger impérativement la taille et les proportions des illustrations.
- Enregistrer le choix, puis revenir au Chemin de Traverse.

Les deux cérémonies ne doivent pas se répéter après validation. Une interruption doit pouvoir reprendre proprement.

## 4. Cheminette et effets

- Effets magiques activés par défaut, sauf préférence explicite contraire.
- Flammes vertes et téléportation fonctionnelles **dès le premier clic ou toucher**.
- Aucun double basculement du bouton « Effets » nécessaire.
- Sons indépendants des effets visuels.
- Navigation fonctionnelle même lorsque les animations sont désactivées.

## 5. Responsive et défilement

Corrige le problème **dans toute l'application**, et pas seulement sur les nouveaux écrans.

Vérifie les largeurs 320, 390, 768, 1024, 1440 et 1920 px.

Exigences :
- Défilement naturel au doigt, à la roulette et au pavé tactile.
- Aucun contenu inaccessible dans les pages ou les fenêtres.
- Adaptation réelle aux smartphones, tablettes et ordinateurs.
- Aucun étirement ou recadrage destructeur des images.
- En-tête et dock accessibles pendant l'utilisation.
- Aucun débordement horizontal involontaire.
- Fonctionnement avec le clavier mobile affiché.

Identifie et corrige les causes des blocages de défilement, notamment `overflow`, hauteurs fixes, éléments superposés et gestion des gestes tactiles.

## 6. Comptes, foyers et Supabase

Réutilise l'architecture d'authentification et de synchronisation familiale existante.

Le projet concerné est exclusivement **`dobby-family-sync`**, pas les projets Supabase professionnels Portenart.

Préserve les données et les droits d'accès existants. Ne remplace pas les contrôles réels par des simulations.

Si une migration est indispensable, elle doit être minimale, additive, vérifiée et réversible.

**Si l'accès au véritable backend familial empêche de valider les créations de comptes et invitations, termine les développements et tests possibles, mais ne publie pas ces fonctions comme opérationnelles. Documente précisément le blocage.**

## 7. Méthode d'exécution

Travaille sur une branche isolée et avance par quatre checkpoints :

**Checkpoint A — Analyse ciblée**

Vérifie l'état du dépôt, les routes, le code E06, E09, les ressources, les composants communs et les règles de déploiement. Réutilise l'existant.

**Checkpoint B — Implémentation**

Intègre les écrans, la navigation, les comptes/foyers, les cérémonies, les avatars, les effets, le responsive et le défilement.

**Checkpoint C — Tests**

Exécute les tests ciblés, puis la non-régression nécessaire sur les modules existants, notamment Famille, Missions, Runes, Cuisine/Courses E07, E09 et PREP-01.

Teste réellement les interactions au doigt et à la roulette, les parcours d'inscription, les invitations et la persistance.

**Checkpoint D — Déploiement**

Lorsque les contrôles passent :
- Crée les commits.
- Pousse la branche.
- Intègre sur `main` selon les règles du dépôt.
- Déploie avec le workflow GitHub Pages existant.
- Vérifie les CI, le SHA effectivement publié, les ressources et les parcours sur l'URL hébergée.

**Corrige également le point d'entrée public** : la véritable version V7 doit être accessible par une URL officielle stable, sans devoir ouvrir un sous-écran de démonstration. Vérifie notamment que l'ancienne racine V2.9.2 ne reste pas le point d'entrée par erreur. Préserve les archives et liens historiques utiles.

Ne réclame pas de confirmation supplémentaire pour les opérations ordinaires comprises dans cette mission. Arrête-toi uniquement devant un véritable blocage de droits, d'intégrité, de sécurité ou de validation.

## 8. Définition de DONE

Le chantier est terminé uniquement si :

1. Les nouveaux parcours fonctionnent dans l'application native V7.
2. Maison et Patronus utilisent les vrais questionnaires et sauvegardent les résultats.
3. La Cheminette fonctionne immédiatement.
4. Le défilement et le responsive sont validés.
5. Les modules existants ne présentent pas de régression.
6. Les comptes et invitations sont réellement vérifiés avec le backend familial.
7. La version finale est déployée et testée sur son URL officielle.

Remets un rapport concis avec les commits, fichiers modifiés, tests réellement exécutés, captures, résultats de synchronisation, liens CI, SHA déployé, URL et réserves.

**Distingue code développé, tests réussis, intégration réelle, déploiement confirmé et fonctionnement opérationnel. Une CI verte ne constitue pas une certification de production.**

Poursuis jusqu'à la livraison vérifiée ou à un blocage matériel documenté.