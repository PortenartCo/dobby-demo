# DOBBY V7 · Installation GSM et mise à jour

## Preuves du candidat #54

La CI **Installation et hors ligne** est verte sur `0f51fb76ffe95f54c5e2b5e4493b2fc149ad39f6`. Ce résultat porte sur le manifeste, l’empreinte `6819e3fd4db51fcc660b7a54` et les 223 ressources publiques du cache, ainsi que sur les parcours suivants. [Exécution CI au SHA candidat](https://github.com/PortenartCo/dobby-demo/actions/runs/46019563246/job/140575366412) · [Guide PWA](../pwa/README.md)

| Contrôle | Preuve acquise |
| --- | --- |
| Installation et démarrage | Chromium à 320, 390, 768 et 1440 px sous un sous-répertoire. Manifeste, icônes, installabilité CDP et vraie fenêtre autonome Chromium ouverte depuis `essai-stitch-v7/famille.html#access`. La proposition native Chrome est simulée dans la recette. L’installation Android depuis l’écran d’accueil reste à vérifier sur téléphone. |
| Aide iOS | Instructions Safari contrôlées avec l’identité Safari/iOS simulée dans Chromium. L’ajout et l’ouverture par l’icône restent à vérifier sous Safari sur iPhone. |
| Hors ligne et compte | Au rechargement hors ligne, le shell et les écrans Cuisine prévus restent accessibles. Un contact de recette est créé puis modifié hors ligne. Avec GoTrue, PostgreSQL et PostgREST locaux à 390 px, le passage Parent A → Parent B → Enfant préserve les identités et droits attendus. La file Courses reprend au retour réseau. Les réponses privées restent hors du cache du worker. |
| Mise à jour | Préparation interrompue puis reprise. « Plus tard » conserve le worker actif. « Mettre à jour » active la version prête avec les données locales intactes. L’autre onglet demande son propre rechargement et le cache témoin hors portée est conservé. |

## Raccordements après #54

- **Console privée.** `admin-access.js` et `admin-access.css` rejoignent les ressources publiques du shell. `access-config.js` et `family-v2.js` y figurent déjà. Les requêtes `POST` authentifiées vers Edge restent réseau et les données de la console restent hors CacheStorage. Le drapeau public reste fermé. Les quatre contrôles locaux du transport passent, dont le rejet d’une réponse issue d’une session remplacée. [Administration privée](administration-privee.md)
- **Catalogue.** `cuisine.js` et `cuisine-p01.js` restent précachés. À 390 px avec 36 fiches fictives, la couverture témoin hors écran dans le Grimoire et dans le choix de repas se charge au défilement. L’index éditorial et les WebP du catalogue restent hors de l’inventaire du worker.
- **Cache après raccordement.** La sonde Chromium porte sur 225 ressources. Après ajout du refus explicite en démo, l’empreinte `394736099ab6ed94d00dfe89` passe le contrôle du générateur avec le même inventaire. Le contrôle Chromium sous un sous-répertoire retrouve les fichiers publics de la console et `cuisine-p01.js` hors ligne. CacheStorage contient zéro entrée de catalogue et son index, lu auparavant en ligne, reste inaccessible hors ligne. Le contrôle `node scripts/build-dobby-v7-pwa.cjs --check` passe. [Guide PWA](../pwa/README.md)

## Actions sur les téléphones lors de la recette familiale autorisée

1. **Android, Chrome.** Ouvrir l’URL HTTPS approuvée. Dans le Menu, toucher **Installer DOBBY** et accepter la proposition du navigateur. Si l’aide s’ouvre, suivre le menu d’installation de Chrome. Relever le choix offert par Chrome et vérifier le nom et l’icône sur l’écran d’accueil.
2. **iPhone, Safari.** Ouvrir la même URL. Vérifier l’aide dans le Menu, puis utiliser **Partager → Sur l’écran d’accueil → Ajouter**. Activer **Ouvrir comme app web** si l’option est proposée. Vérifier le nom et l’icône.
3. **Sur les deux appareils.** Fermer le navigateur et ouvrir depuis l’icône. Vérifier la fenêtre autonome et le retour à l’accès. Avec un compte de la recette, contrôler la première connexion et le retour du courriel de confirmation ou de récupération. Confirmer à chaque ouverture l’identité affichée, y compris si le navigateur et l’application installée séparent leurs sessions. Faire le passage A → B → Enfant sur l’appareil partagé. Après chargement, couper le réseau, rouvrir l’app et reprendre une modification locale autorisée au retour en ligne. La vérifier une fois, dans le bon foyer, depuis l’autre appareil.
4. **Sur le prochain build de l’environnement de recette.** Garder une donnée locale témoin et deux onglets ou contextes ouverts. Vérifier **Plus tard**, puis **Mettre à jour**. Contrôler la persistance de la donnée après relance depuis l’icône, le bon compte et la reprise de synchronisation. Relever pour chaque appareil le modèle, la version système et navigateur, le SHA servi et le résultat. Garder les adresses et liens Auth hors des captures partagées.

L’installation physique et la recette hébergée restent à renseigner avant le GO de publication. [Préparation de la mise en service](README.md)
