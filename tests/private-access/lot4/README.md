# Lot 4 — aperçu et recette navigateur locaux

Depuis la racine du dépôt :

```sh
node tests/private-access/lot4/preview-server.mjs
node essai-stitch-v7/tests/admin-access.cjs
```

L’aperçu reste disponible sur `http://127.0.0.1:3214/` jusqu’à l’arrêt du processus (`Ctrl+C`). Le port peut être changé avec `DOBBY_LOT4_PREVIEW_PORT`. Les images Docker épinglées et le démon local employés par le Lot 3 sont requis. La recette utilise Chromium physique (`/usr/bin/chromium`) et le module Playwright installé ; les deux chemins peuvent être fournis par `CHROMIUM_PATH` et `PLAYWRIGHT_MODULE`.

Le serveur ne sert que les pages et ressources de l’application. Il ne publie pas son code, les tests, les configurations serveur ou le dépôt complet. Il écoute uniquement sur loopback. Les trois profils de revue — propriétaire H1, Parent H2 et compte non approuvé — ont des espaces locaux distincts. Tous les comptes et demandes sont fictifs (`example.invalid`) ; le transport de cet aperçu refuse les adresses hors `.invalid`. Les messages sont absorbés par le Mailpit jetable du Lot 3, sur un réseau Docker interne sans relais externe.

Les pages sont les véritables pages V7 avec leur header, les six rubriques du dock, les styles, polices et modules natifs. Les appels Auth et SQL vont au GoTrue/PostgREST local réel, et la route d’administration emploie `createAdminHandler` du Lot 3. Aucun résultat d’autorisation propriétaire n’est simulé. Le navigateur reçoit uniquement la session Auth ordinaire du personnage choisi ; les clés serveur restent dans le processus Node.

Chaque instance du serveur et chaque personnage ont leur propre espace local. Le premier accès crée une session fictive une seule fois ; une déconnexion suivie d’un rechargement reste une déconnexion. Le sélecteur du bandeau permet de choisir explicitement un personnage et d’obtenir une nouvelle session Auth locale. Les événements `storage` entre deux onglets restent ceux du navigateur ; seul leur préfixe de clé propre à la fixture est retiré avant les écouteurs natifs, et les autres personnages ne reçoivent pas ces signaux.

Deux substitutions sont appliquées uniquement à la réponse du fichier natif `family-v2.js` : l’origine fixe devient l’origine loopback du serveur, et son initialisation attend l’écriture de la session fictive. La configuration publique de la réponse utilise une valeur factice. Les fichiers de production et leur validation du projet de confiance restent inchangés. Une CSP `connect-src 'self'` bloque aussi toute connexion externe dans un navigateur utilisateur, sans dépendre d’interceptions Playwright. Les médias distants du HTML sont remplacés par une illustration fictive locale.

Il s’agit d’un aperçu de revue, pas d’une application de production. Les capacités minimales accordées au propriétaire des tables Auth dans cette fixture n’établissent pas celles du Supabase hébergé. Les réserves concernant la lecture d’`auth.sessions` sous RLS et les anciens liens Storage signés restent applicables. Aucune gate enfant de production n’est ouverte.

`startLot4Preview({port:0,longRequests:0})` permet à la recette de posséder et fermer sa propre fixture. Les contrôles `control.fault='network'`, `control.fault='delivery-record'` et `control.delayMs` ne modifient que le transport du serveur local pour tester les erreurs, l’incertitude après une tentative SMTP réelle et les réponses en vol. Le journal ne conserve que méthode et chemin, sans JWT, callback ou contenu de message.
