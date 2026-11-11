# Revue D — contexte conversationnel déterministe

Périmètre source : `essai-stitch-v7/chat-engine.js` uniquement. Test : `essai-stitch-v7/tests/review-context-20261111.cjs`. Aucune modification CuisineList, moteur familial, E06, SQL, synchronisation ou stockage supplémentaire.

## Défaut reproduit et cause

La demande « Je voudrais que ce soit du pain gris et pas du pain blanc. », après l’ajout de pain, laissait le même article nommé « pain ». Le moteur ne conservait aucune référence d’action utilisable par une correction ; cette formulation terminait dans la réponse non comprise. `red.log` est l’échec causal avant correction ; `before-correction-390.png` montre le fil réel.

## Comportement livré

- Le chemin rapide d’ajout explicite reste actif. Les corrections, quantités et retraits passent par `interpret()`, une intention structurée versionnée, `validateIntent()` puis `executeIntent()` ; l’interpréteur seul n’écrit pas les données.
- La correction positive choisit **pain gris**, conserve l’ID, la quantité, l’unité et les champs inconnus. La proposition négative pain blanc n’est pas ajoutée.
- « Ajoute-en deux » fixe à 2 une quantité jusqu’ici non renseignée et augmente de 2 une quantité connue. La réponse expose le total obtenu. « Finalement retire-le » utilise la référence vérifiée.
- Le dernier contexte confirmé est lié au propriétaire authentifié, au foyer, au fil privé et à son échange source. Il survit au rechargement via la même enveloppe du magasin `meta` natif ; supprimer son échange source invalide la référence. Aucune migration d’anciens messages sans auteur.
- Un article dont les champs métier ont changé, terminé, en conflit, un autre foyer/compte, plusieurs cibles ou un contexte insuffisant empêchent l’écriture. Le changement explicite vers le repas de demain consulte le planning réel et retire la référence Courses.
- Les corrections utilisent exclusivement les writers `DobbyCuisineList.edit/remove`. Une ancienne préparation est convertie par son adaptateur canonique existant, après validation de la version exacte du tableau `extras`, sans effacer la liste finale ni les archives. Les références suivantes emploient les ID natifs.
- Le contexte partagé compare les champs métier canoniques ; les révisions et horodatages de transport peuvent évoluer lors d’une synchronisation sans bloquer une correction. Un ajout connecté utilise dès le départ le panier familial canonique, même si aucune liste locale n’est encore initialisée. La consultation lit aussi ce panier réel.
- L’état local complet de la liste est comparé au stockage natif avant confirmation. Un échec restaure les champs en mémoire depuis leur état persistant. Pour la branche familiale, le contrat existant `putItem()` attend la fin de transaction IndexedDB avant de mettre le cache à jour ; sa résolution puis la relecture sont attendues. Une synchronisation serveur en attente ne vaut pas réception sur un autre appareil.

## Vérification

Commandes exécutées avec le serveur local `http://127.0.0.1:8891` :

```sh
node --check essai-stitch-v7/chat-engine.js
DOBBY_TEST_ORIGIN=http://127.0.0.1:8891 node essai-stitch-v7/tests/review-context-20261111.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8891 node essai-stitch-v7/tests/e02-edge.cjs
```

Résultats : `green.log`, `results.json` et `e02-edge.log`, tous PASS. Le test ciblé exerce le DOM réel, les writers canoniques et leur stockage, avec des profils Chromium temporaires ; les requêtes externes sont bloquées, hormis les réponses de fixture interceptées sans réseau. Le parcours local simule la sortie de l’identité native ; le parcours partagé conserve le client de connexion natif avec des réponses HTTP factices. Il vérifie les groupes de cas décrits dans `results.json`, dont la correction après rechargement, la persistance, l’isolation, les champs inconnus et l’échec de sauvegarde. `after-correction-390.png` montre le résultat réel. Aucun compte réel ou donnée familiale réelle n’est utilisé. Une seconde session exécute le véritable client familial sur une fixture HTTP entièrement interceptée : passage pending→clean, correction avec ID stable, lecture IndexedDB native, refus d’une modification distante concurrente, consultation et ajout connectés avant initialisation de la liste locale. `shared-red.log` et `shared-read-red.log` reproduisent les deux défauts corrigés ; la fixture n’atteint aucun service distant.

## Interface facultative et limites

`intentContract` expose la version, les types acceptés et `provider: null`. `interpret(input)` produit une intention, et `validateIntent(candidate)` refuse notamment une cible différente de celle confirmée dans ce fil. Ce sont des fonctions locales ; aucun modèle, endpoint, SDK, clé, API payante ou transfert de données privées n’est activé. Un backend IA sécurisé et autorisé reste à raccorder ultérieurement par cette frontière de validation et d’exécution.

La compréhension reste limitée aux formulations déterministes décrites et aux repas du soir aujourd’hui/demain. Aucune compréhension générale n’est revendiquée. La quantité inconnue n’est pas supposée égale à une unité. Les ambiguïtés demandent une précision, sans sélection interactive d’un article dans ce lot. La branche familiale utilise ses writers existants ; une synchronisation avec deux comptes réels n’a pas été testée. La recette vocale et les appareils Safari/iOS relèvent du lot C. Aucune publication ou opération de production.
