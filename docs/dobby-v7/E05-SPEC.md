# CODEX — DOBBY E05 : Profil magique, Patronus et avatars

**MODE : EXÉCUTION — Mission autonome, bornée, avec preuves.**

## 1. Références et périmètre

Dépôt : `PortenartCo/dobby-demo`

Base technique : branche `feat/dobby-e04-runes`, SHA `8bcd49c1c2250879e2fd5a96641cd77747ef9ea0`.

Référence graphique E03 validée : `6a86ead6341eb2f17e7552852621c21f496ad97c`.

Créer une nouvelle branche indépendante `feat/dobby-e05-magic-profile` depuis E04 Runes. Ne pas fusionner E03 : son raccordement définitif sera traité séparément.

Consulter les éventuels `AGENTS.md` applicables.

**Fichiers techniques de référence :**
- `essai-stitch-v5-famille/family-runes-core.mjs`
- `essai-stitch-v5-famille/family-modules.js`
- `essai-stitch-v5-famille/family-v2.js`
- `essai-stitch-v7/tools-register.js`, fonction `personal()`
- `essai-stitch-v7/family.js`
- `essai-stitch-v7/family-engine.js`
- `essai-stitch-v7/member-avatar.js` et `member-avatar.css`
- `essai-stitch-v7/chrome.js`
- `docs/dobby-v7/E04-RUNES.md`

Utiliser également le dernier export Stitch « Profil magique » fourni par l'utilisateur : `stitch_dobby_assistant_mobile_app (4).zip`. Vérifier sa présence dans l'environnement Codex avant de l'exploiter.

Les quatre maquettes Stitch constituent des références graphiques, **pas quatre applications distinctes à intégrer**.

## 2. Objectif

Construire un **Profil magique unique et dynamique**, adapté à chaque membre du foyer.

L'écran reprend la composition et la direction artistique des maquettes Stitch, mais conserve les composants et comportements communs de DOBBY.

Il doit présenter :
- Avatar du membre.
- Nom et prénom.
- Maison et emblème associé.
- Patronus et illustration.
- Grade et insigne évolutif.
- Total de runes et progression.
- Historique des récompenses.
- Informations personnelles modifiables.
- Accès aux profils familiaux.
- Paramètres de connexion secondaires et repliables.

Le bouton doré en haut à droite doit ouvrir le profil du membre lié au compte connecté, lorsque cette association est établie. Ne pas attribuer arbitrairement le premier membre du foyer au compte connecté.

Réutiliser les identifiants du registre familial existant. Aucun second registre de membres.

## 3. Grades — barème V1 approuvé

Conserver le moteur déterministe E04 et ses douze insignes SVG.

Les seuils cumulés V1 sont désormais retenus :

| Forme | Cuivre | Argent | Or | Diamant |
|---|---:|---:|---:|---:|
| Pastille | 0 | 50 | 100 | 200 |
| Étoile 4 branches | 350 | 550 | 800 | 1 100 |
| Étoile 8 branches | 1 500 | 2 000 | 2 600 | 3 300 |

Ces seuils correspondent déjà à la configuration E04. Ne pas réécrire inutilement ce moteur : vérifier les valeurs, retirer l'indication « provisoire » des seuils validés et adapter leurs mentions dans l'interface.

Les noms de grades restent descriptifs et modifiables ultérieurement.

Les runes sont cumulatives et non dépensables. Le grade est calculé depuis l'historique confirmé, jamais modifié manuellement.

Conserver exactement les récompenses par mission :
- Légère : 10 runes.
- Régulière : 25 runes.
- Majeure : 50 runes.

Ne pas modifier le protocole de crédit E04.

## 4. Catalogue de douze Patronus

Créer un catalogue centralisé avec identifiants stables et noms français :

1. Cerf
2. Loutre
3. Renard
4. Loup
5. Chat
6. Hibou
7. Cheval
8. Lièvre
9. Cygne
10. Lynx
11. Blaireau
12. Dauphin

Chaque Patronus doit pouvoir être sélectionné manuellement et associé durablement à un membre.

Prévoir également une action « Refaire le test » destinée au futur parcours de découverte. Ne pas développer le questionnaire dans cette mission.

Le Patronus est indépendant de la Maison et du grade.

**Illustrations :**
- Prévoir un visuel original par Patronus.
- Direction artistique commune : animal lumineux, argenté ou bleu spectral, fantastique, semi-transparent, sans texte incrusté.
- Inventorier et récupérer les véritables assets exploitables de l'export Stitch.
- Ne pas dépendre d'URL Google temporaires ni utiliser les captures complètes des écrans comme illustrations.
- Si un outil de création d'images approprié est disponible, produire les illustrations homogènes comme assets locaux.
- Sinon, préparer le catalogue et les raccordements, identifier les illustrations manquantes et déclarer explicitement ce livrable visuel incomplet.

Ne pas remplacer des illustrations absentes par des images aléatoires ou prétendre que le catalogue graphique est terminé.

## 5. Catalogue de huit avatars

Prévoir huit portraits illustrés prédéfinis, variés et compatibles avec les membres adultes et enfants du foyer.

Style homogène : portraits fantasy premium, chaleureux, compatibles avec DOBBY.

Créer un catalogue local à identifiants stables et un sélecteur d'avatar.

Réutiliser les portraits appropriés déjà présents dans l'export Stitch lorsqu'ils sont réellement disponibles et exploitables.

Pour les autres, appliquer la même règle que pour les Patronus : générer de véritables assets si les outils le permettent ; sinon préparer le raccordement et signaler les ressources à produire.

Conserver la compatibilité avec les avatars emoji actuels tant que l'utilisateur n'a pas choisi un nouvel avatar.

**L'insigne de grade E04 doit apparaître en bas à droite de tous les types d'avatars**, sans masquer le visage, notamment dans le Profil, la liste familiale et l'attribution des missions.

## 6. Photo personnelle

L'objectif est de permettre à chaque membre de choisir :
- Un avatar prédéfini.
- Une photo personnelle importée depuis son appareil.

Avant de développer l'import photo, vérifier les capacités de stockage existantes et la possibilité d'un partage privé entre les comptes du foyer.

Si un stockage d'images privé et correctement autorisé est déjà disponible, intégrer un import simple avec validation du type et de la taille, recadrage circulaire, remplacement et suppression.

Ne pas stocker les photos en base64 dans le JSON familial, ni exposer des photos privées via une URL publique.

**Si cette capacité nécessite une migration, un nouveau bucket ou des règles serveur non encore autorisées : ne pas les créer.** Livrer les avatars prédéfinis, conserver la compatibilité des profils et documenter exactement l'étape nécessaire pour activer les photos ultérieurement.

Aucune photo réelle ne doit être utilisée pour les tests.

## 7. Maison magique et thème dynamique

Quatre Maisons :
- Gryffondor : rouge et or.
- Serpentard : vert et argent.
- Serdaigle : bleu et bronze.
- Poufsouffle : jaune ambré et noir.

Conserver une seule structure de Profil. Utiliser des variables de thème et des emblèmes originaux.

La Maison est enregistrée au niveau du membre et peut être modifiée manuellement.

**Supprimer tout sélecteur de Maison situé en haut de la page.**

Le seul endroit permettant de changer de Maison est la carte « Ma Maison », avec « Modifier » et « Refaire le test ».

Changer la Maison ne modifie ni les runes, ni le grade, ni le Patronus.

## 8. Membres de la famille et connexion

Le Profil magique est rattaché à un membre du foyer, pas directement à une adresse e-mail.

Les parents doivent pouvoir consulter et modifier les profils des enfants, y compris sans compte enfant personnel.

Vérifier les rôles et liens compte/membre réellement disponibles. S'ils ne sont pas encore représentés de façon fiable, ne pas inventer d'autorisation parentale effective : fournir le parcours de consultation et préparer le raccordement des droits manquants en signalant le blocage.

Conserver les informations de connexion dans « Compte et paramètres », section secondaire repliable.

Éviter toute duplication des données familiales et respecter le writer natif existant.

Tester la conservation des nouveaux champs lors des sauvegardes et synchronisations, y compris les conflits de révision et l'interaction avec des clients anciens. Ne pas présenter une compatibilité non prouvée comme acquise.

## 9. Intégration visuelle

Prendre la composition verticale de la maquette Serpentard comme référence, tout en reprenant les meilleures finitions des autres variantes.

Créer un seul écran dynamique.

Ne pas recopier les bandeaux supérieurs et inférieurs de Stitch : utiliser les composants DOBBY existants, validés sur E01/E03.

Respecter :
- Typographies existantes.
- Mise en page mobile.
- Bouton doré de profil.
- Navigation Traverse / Missions / Taverne / Famille / Menu.
- Titres et boutons harmonisés avec E03.
- Absence de statistiques fictives ou de fausses mentions de sécurité.
- Accessibilité clavier, tactile et contrastes lisibles.

Ne pas intégrer les noms fictifs, grades, missions ou données médicales des maquettes comme données réelles.

## 10. Exécution et vérifications

Procéder par trois checkpoints :

**A — Identité et règles**
- Seuils E04 confirmés.
- Catalogue des Maisons et des Patronus.
- Modèle d'identité magique par membre.
- Persistance native et compatibilité vérifiées.

**B — Profil graphique**
- Écran unique.
- Quatre thèmes.
- Avatar et insigne réutilisés.
- Patronus, Maison, progression et historique.
- Paramètres repliables et profils familiaux.

**C — Médias et recette**
- Catalogues d'illustrations raccordés.
- Photo personnelle seulement si le stockage autorisé existe.
- Captures et tests ciblés.
- Liste des éventuels assets et dépendances manquants.

Définition de DONE :
1. Aucun deuxième moteur de grade ou de runes.
2. Douze seuils et douze Patronus correctement définis.
3. Huit emplacements d'avatars avec de véritables assets pour chaque portrait déclaré disponible.
4. Maison et Patronus modifiables et persistés, sans altérer les récompenses.
5. Profil rattaché à l'identifiant du membre.
6. Insigne cohérent sur toutes les vues concernées.
7. Une seule interface et quatre thèmes, sans sélecteur de Maison supérieur.
8. Navigation et bandeaux communs préservés.
9. Tests à 320, 390 et 1440 px ; tests ciblés de persistance et des droits réellement implémentés.
10. Régression E04 et compatibilité E03 vérifiées sur composition temporaire, sans fusion.
11. Les éléments bloqués (images, stockage photo, permissions, intégrité interversions) sont explicitement déclarés NON LIVRÉS, et non considérés PASS.

Exécuter les tests ciblés, puis une seule passe de non-régression adaptée aux fichiers modifiés. Attendre les CI du SHA final.

## 11. Restrictions et livraison

Ne pas :
- Modifier les HTML Stitch originaux.
- Réécrire E04 ou ses mécanismes de synchronisation sans nécessité démontrée.
- Fusionner E03 ou les autres branches.
- Modifier Supabase ou lancer de migration SQL en production.
- Créer un nouveau writer ou une infrastructure parallèle.
- Développer la Cheminette, les questionnaires ou l'onboarding.
- Publier l'application sur GitHub Pages.

Livrer :
- Branche poussée et commits.
- Rapport synthétique des fonctionnalités réellement opérationnelles.
- Captures à 320/390/1440 px, pour les quatre thèmes.
- Inventaire des 12 Patronus et 8 avatars avec statut de chaque illustration.
- Résultats des tests et CI.
- Écarts et dépendances bloquantes avec propositions ciblées.

**Arrêt pour revue humaine avant fusion ou publication.**