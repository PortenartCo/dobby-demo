# DOBBY V7 - Cahier des charges d'integration et de recette

Date de consolidation : 12 novembre 2026. Projet personnel familial DOBBY (distinct des projets metier Portenart).
Depot : `PortenartCo/dobby-demo`. Base observee avant preparation : `main` au commit `0f3131f3deb1ff63f3accca9c591521b04f4f212` (reverifier avant tout developpement).

## 1. Ordre de priorite des sources

1. **Regles du present cahier des charges et decisions utilisateur** : comportements exiges et parcours.
2. **Application native DOBBY V7** : code, vrais modeles de donnees, tests, API, referentiel de questions Maison/Patronus, calcul des resultats, images deja validees, navigation et synchronisation.
3. **Stitch 19** : inspiration visuelle des ecrans Bienvenue, Connexion, Profil, Rejoindre un foyer, Creer un foyer. L'archive contient **six** HTML : le profil et la galerie doivent etre fusionnes en un seul ecran.
4. **Stitch 20** : inspiration visuelle pour les **deux fenetres introductives** Maison et Patronus (et galeries de choix directs). Ne PAS reprendre les questions, calculs ou mecanismes de persistance inventes par Stitch.

Les ZIP Stitch sont des **references graphiques**, ni des sources d'autorite fonctionnelles ni du code a coller dans l'application. Corriger les images manquantes, les liens externes, les faux etats, les commandes de simulation et les variantes non raccordees.

## 2. Parcours exact a implementer

### A - Aucune session active / deconnexion
- Afficher d'abord **Bienvenue dans DOBBY** : illustration Dobby immersive, texte tres bref sur missions, repas, courses, evenements, contrats/assurances et organisation du foyer, bouton Continuer.
- Puis **connexion / creation de compte / rejoindre un foyer par invitation**. Connexion via e-mail + mot de passe ; mot de passe oublie ; inscription et acces a la saisie d'un code/lien d'invitation.
- L'ecran de Bienvenue peut etre court ; pas de membres fictifs a choisir.

### B - Compte existant se connectant / session deja active au demarrage
- **Cheminette** comme portail initial obligatoire a la connexion et au lancement avec session existante ; flammes magiques vertes et teleportation a la premiere interaction, sans avoir a manipuler le bouton Effets.
- Puis **Chemin de Traverse** ; pas de nouvelle inscription ni de questionnaire deja termine.
- Ne pas rerouter sur la Cheminette a chaque navigation interne : uniquement au point d'entree reel, et sans boucle.

### C - Premier compte sans invitation
Bienvenue -> Inscription / confirmation si requise -> Profil personnel -> **Creation d'un nouveau foyer** (nom obligatoire, sans valeur fictive) -> Chemin de Traverse -> fenetre Maison -> fenetre Patronus -> retour au Chemin de Traverse.

### D - Premier compte avec invitation
Bienvenue -> saisie/lecture du lien ou code -> Inscription / authentification -> Profil personnel -> **Confirmation de rejoindre le foyer** (nom du foyer et invitant authentiques) -> Chemin de Traverse -> fenetre Maison -> fenetre Patronus -> retour au Chemin de Traverse.
Si l'utilisateur dispose deja d'un compte, il doit pouvoir accepter l'invitation apres connexion sans creer un doublon de profil.

### E - Maison et Patronus (une seule premiere fois par profil)
- Sur le Chemin de Traverse apres la creation effective du profil/foyer, afficher **automatiquement** la fenetre Maison, puis la fenetre Patronus apres confirmation de la Maison ; retour au Chemin de Traverse apres confirmation du Patronus.
- Pour chacun, proposer 2 choix : **Passer le test** OU **Choisir directement** dans la galerie.
- Test Maison : reutiliser exactement les questions narratives indirectes validees (**6 + eventuelle question complementaire**) et l'algorithme natif.
- Test Patronus : reutiliser exactement les questions validees (**5 + eventuelle question complementaire**) et l'algorithme natif (12 Patronus possibles).
- Choix direct Maison : 4 Maisons + leurs blasons reels. Choix direct Patronus : 12 Patronus existants. Revelations soignees avec description ; choix directs enregistres comme **manuels**, non comme resultat calcule.
- La taille/ratio des illustrations Patronus doit etre correcte, sans recadrage destructeur, meme a faible largeur.
- Ne pas ecraser les preferences existantes ; ne pas rouvrir la ceremonie a chaque reconnexion. Si parcours interrompu, reprendre proprement l'etape non terminee.
- Les choix Maison/Patronus restent modifiables depuis le vrai profil selon les regles deja autorisees.

## 3. Donnees, authentification, foyers et invitations

- Le compte authentifie doit correspondre a une identite/personne canonique, distincte des autres profils d'un meme foyer. Ne jamais deduire un lien de nom, ordre dans un tableau ou simple selection UI.
- Les comptes, foyers, membres, appartenances et invitations doivent etre reels et persistants, sans donnees de demonstration injectees.
- Invitations : lien et/ou code opaque, controle cote serveur (validite, expiration, appartenance, acceptation idempotente) ; ne montrer qu'un etat a la fois : valide / expire / invalide.
- Privileges : les membres ne voient que leurs foyers autorises. Conserver les controles RLS et les regles existantes ; ne pas contourner la securite pour obtenir une demonstration.
- Reutiliser au maximum la structure et les API **E09 / Supabase familial `dobby-family-sync`** si reellement accessibles. Projet personnel uniquement : ne jamais modifier les projets Supabase professionnels Portenart.
- Si de nouvelles structures/migrations sont indispensables : changements minimaux, additifs, reproductibles, avec verification et procedure de retour arriere, sans supprimer ni migrer silencieusement les donnees existantes.
- Ne pas exposer de cle de service/secret ou de jeton d'invitation dans les captures, les logs ou le bundle public. L'authentification doit respecter le parcours de verification e-mail si le fournisseur l'impose.
- Conserver la synchronisation et le fonctionnement hors ligne existants ; aucune simulation A/B ne peut etre presentee comme verification de deux comptes reels.

## 4. Cheminette, reglages, sons

- **Effets ON par defaut** lorsque l'utilisateur n'a pas encore choisi de preference. Le controle visuel doit refleter l'etat effectif, sans double bascule pour le demarrer.
- Une preference explicitement desactivee reste respectee ; l'action de navigation doit fonctionner meme sans animation ou si l'appareil active une reduction des mouvements.
- Flammes vertes + teleportation au premier clic/toucher, pas d'action multiple necessaire ; nettoyer les interruptions et restaurer la navigation.
- Son et effets restent **independants**. Aucun son impose automatiquement si desactive ou si le navigateur ne l'autorise pas.

## 5. Adaptation responsive et defilement (TOUS les modules)

- Largeurs de reference : **320, 390, 768, 1024, 1440, 1920 px** ; smartphone, tablette et PC, portrait et paysage. Il ne suffit pas de centrer une maquette etroite sur PC.
- Composants et disposition s'adaptent intelligemment sans deformation d'images (Dobby, Choixpeau, maisons, Patronus, avatars). Les ressources importantes restent visibles en entier.
- Defilement **au doigt**, **a la roulette** et **au pave tactile**, y compris quand le formulaire ou la modale excede la hauteur de l'ecran ou quand le clavier mobile est ouvert.
- Corriger localement les conflits de `overflow`, `touch-action`, `position: fixed`, hauteur `vh` et evenements de gestes ; ne pas imposer un `overflow: auto` global aveugle.
- En-tete et dock visibles durant l'utilisation normale (adapter l'apparence aux ecrans d'inscription, ou le dock connecte n'a pas a apparaitre) ; les contenus restent accessibles avec les zones de securite iPhone.
- Aucun debordement horizontal involontaire ; boutons et textes lisibles ; pas de masquage d'actions par header/dock.
- Tester le geste de defilement reel et la roulette (pas seulement les captures responsives).

## 6. Integrite graphique et avatars

- Stitch 19 contient une galerie de 24 **emplacements**, mais pas 24 portraits definitifs exploitables ; la derniere livraison affichait des images cassees ou animaux/blasons. Ne jamais copier ces erreurs.
- **Un seul ecran Profil**, integrant la selection. Les **8 avatars existants** dans le code natif sont la base. Integrer les nouveaux portraits seulement si les fichiers definitifs sont disponibles et coherents ; sinon presenter une galerie propre avec uniquement les choix reelement disponibles, et signaler explicitement que les 16 portraits supplementaires manquent. Ne pas inventer des portraits ou produire des images cassees.
- Utiliser les ressources graphiques locales valides du depot (ex. `essai-stitch-v7/assets/ceremony-v2/sorting-hat-cinematic.png`, blasons des Maisons, planche Patronus/avatars). Localiser, lorsque possible, les nouvelles illustrations retenues et eviter les URL temporaires externes pour les illustrations essentielles.
- Ne pas reprendre la version d'essai des questions de Stitch 20, les emojis de substitution, les resultats aleatoires ou la persistance par `sessionStorage`.
- Eliminer tous les marqueurs de test/simulation (« valide/expire/invalide » en boutons, profils fictifs, faux champs remplis, faux avis de verification).

## 6 bis. Point d'entree public unique

- L'application V7 doit disposer d'une **URL officielle stable**, communiquee comme entree dans DOBBY, sans devoir ouvrir un lien profond vers les pages de preparation ou des repertoires d'essai.
- Verifier si la racine de GitHub Pages sert encore un ancien `index.html` DOBBY V2.9.2. Corriger le routage ou la redirection canonique pour que cette URL ouvre V7 avec les etats session/non-session attendus, sans effacer les archives ni les liens historiques utiles.
- Tester directement l'URL canonique en navigation privee, apres deconnexion, avec session active, et au retour de l'authentification. Les captures d'un sous-chemin de maquette ne prouvent pas que l'entree de l'application est correcte.

## 7. Ancrages techniques identifies (verifier au checkout actuel)

- `essai-stitch-v7/index.html` : shell / point d'entree existant.
- `essai-stitch-v7/ritual.js`, `ritual-effects.js`, `ritual.css` : Cheminette / animations.
- `essai-stitch-v7/onboarding.js`, `onboarding-engine.js`, `onboarding-route-data.js`, `onboarding-scoring.mjs` : questionnaire et ceremonie.
- `design/e06/references/scoring/dobby-e06-scoring-v1.json` : grille de questions/score native observee.
- `essai-stitch-v7/family.js`, `magic-profile.js`, `member-avatar.js` : integration navigation et profil.
- `essai-stitch-v5-famille/family-profile.js` : catalogue actuel de 8 avatars et valeurs Maison/Patronus.
- `essai-stitch-v5-famille/family-v2.js` : authentification/synchronisation familiales existantes.
- Verifier l'emplacement exact de l'invitation, des appartenances et des regles de securite avant d'etendre les fonctions.

## 8. Non-regression et criteres DONE

Verifier au minimum :
1. Premier compte sans invitation -> foyer cree, membre relie, Chemin de Traverse et deux ceremonies successives ; reouverture sans reprise forcee.
2. Premier compte avec invitation -> invitation valide, confirmation du bon foyer/invitant, compte lie au bon foyer, aucun doublon ; invitations expirees/invalides bloquees.
3. Utilisateur existant -> login/reouverture -> Cheminette avec flammes vertes a la premiere interaction -> Traverse, sans nouvelles ceremonies deja completees.
4. Mots de passe et deconnexion ; refus d'acces croise entre comptes/foyers ; profils enfants toujours distincts des comptes de connexion.
5. Maison test (bonnes questions, calcul, departage) + Maison manuelle ; Patronus test (12 resultats possibles, calcul) + Patronus manuel ; enregistrer et recharger les choix.
6. Effets ON par defaut, interrupteur coherent, option OFF et son independant ; aucun double clic necessaire.
7. Touch scroll et wheel scroll sur accueil, login, formulaire, gallery, modal Maison, modal Patronus, Cuisine et pages longues ; aucun element inaccessible. Toutes les largeurs prevues.
8. Non regression ciblee puis globale des modules existants, notamment Missions, Runes, Famille, Agenda, Cuisine/Courses E07, Preparations PREP-01, E09 ; ne pas perdre les donnees creees.
9. Verification avec deux sessions/comptes familiaux reels **si acces au projet familial et autorisation de test effectifs** ; relever clairement si impossible.
10. Production : GitHub CI vert, publication Pages au commit exact, URL publique verifiee, ressources locales en HTTP 200, recette navigable post-deploiement, pas seulement tests simules.

Le manque d'acces au vrai projet Supabase familial est un **blocage de certification/deploiement des fonctions comptes-invitations** : poursuivre le travail local possible, mais ne jamais les declarer operationnelles ni les mettre en production sans verification du controle d'acces reel. Les simulations passent au statut tests, pas production.

## 9. Livrables Codex

- Commits cibles sur une branche isolee, aucun changement non relie.
- Inventaire des fichiers changes ; migrations si necessaires ; tests et observations avec preuves.
- Captures 320/390/768/1024/1440/1920 ; comparaison visuelle Stitch -> natif ; parcours navigateur et verification touch/wheel.
- URLs des CI, SHA pousse, SHA deploye, URL publique exacte et verification des fichiers servis.
- Statut final par gate : **code**, **tests**, **integration donnees reelles**, **deploiement**, **usage reel confirme**. Ne pas confondre ces niveaux.
- Blocages precis et solution/rollback si un gate echoue.

## Hors perimetre

Pas de refonte graphique des autres modules, pas de faux comptes, pas de nouveau moteur d'agent, pas de publication sur un autre hebergeur, pas de modification des projets professionnels, pas de generation de fausses images definitives, pas de suppression de donnees existantes pour faciliter les tests.
