# Santé essentiel — lot indépendant

Le lot prépare le service Santé de [#43](https://github.com/PortenartCo/dobby-demo/issues/43) et son composant V7. Il se vérifie sur des fixtures fictives. Le branchement aux routes DOBBY et la recette de lancement de [#35](https://github.com/PortenartCo/dobby-demo/issues/35) restent ouverts.

## Précontrôle du 20 novembre 2026

La branche dédiée part de `main` à `424ae01815b7392dff1b3e5da9c51f4a734b4140`. La tête de #41 est huit commits au-dessus de cette base. Les quatre PR sont en brouillon.

| PR #41 | Tête examinée | Fondations communes |
| --- | --- | --- |
| [#38](https://github.com/PortenartCo/dobby-demo/pull/38) | `c4005809680d8533e1496ff08bef1747400fa741` | Transport V5, writer des modules, routeur Famille, recherche et export V7 |
| [#42](https://github.com/PortenartCo/dobby-demo/pull/42) | `bf3936e9301a8cf25bc76ba781b691b87f341457` | Writer des modules, pont V7, rappels internes Runes, outils transversaux |
| [#44](https://github.com/PortenartCo/dobby-demo/pull/44) | `e4388442253788e04afd92ee9f099ec67dec81df` | Writer des modules et synchronisation des images de recettes |
| [#45](https://github.com/PortenartCo/dobby-demo/pull/45) | `75966dd3b68f417be69536f44d9bedd4218a12ee` | Cuisine V7, au-dessus des trois lots précédents |

Le diff cumulé inclut notamment `family-modules.js`, `family-v2.js`, `essai-stitch-v7/family.js`, `bridge.js` et `tools-register.js`. #36 touche également le transport et les outils. La série Administration #28–#34 propose d'autres changements au socle Famille et Storage. Les fichiers existants de ces séries et leurs migrations sont hors du diff Santé. L'activation ne suppose ni la fermeture des invitations ni la reprise des PR Administration en bloc.

## Contrat livré

- Le serveur vérifie `auth.uid()`, le foyer actif, le lien canonique et la catégorie de membre par le résolveur Famille. Chaque adulte gère son propre carnet. La gestion d'un enfant ou d'un bébé exige une autorisation individuelle associant le compte parent, son identifiant canonique et celui de l'enfant. Le provisionnement de ces autorisations appartient à l'administration habilitée.
- Le carnet privé comprend les informations essentielles, allergies, traitements, rendez-vous, consignes et documents. Le compte enfant reçoit uniquement ses rendez-vous à venir et consignes publiés élément par élément. Les champs pratiques sont saisis séparément des champs privés. Un refus est renvoyé sur la lecture d'un carnet ou une mutation tentée avec le compte enfant.
- La projection Agenda renvoie la date et l'heure du créneau explicitement partagé. Le titre générique « Rendez-vous » vient du client. Le compte enfant reçoit uniquement son propre créneau si la publication enfant est aussi active. Les projections et le carnet reposent sur le même identifiant et la même fiche.
- Les rappels sont dérivés à la lecture, avec deux options par défaut et un jour civil Europe/Brussels. L'annulation, le retrait, le changement de date et la révocation se répercutent à la prochaine lecture. Une projection par rendez-vous et par fenêtre suffit à l'affichage interne. Le composant ne propose pas d'état « lu » persistant.
- Les métadonnées et les octets des documents sont privés. Le serveur réserve un chemin opaque, puis confirme l'objet après vérification du type, de la taille et de la directive de cache. Le service Storage vérifie les droits sur l'objet à chaque téléchargement authentifié. Les URL signées sont refusées. Le retrait bloque les lectures et conserve l'objet pour la reprise.
- La révision empêche deux parents d'écraser une même modification. Une écriture attend la fin d'une révocation parentale concurrente et revérifie les droits avant de publier. L'identifiant stable et l'identifiant de la dernière opération rendent le rejeu immédiat sûr. Le client utilise la session native pour les RPC, rejette les réponses d'une session remplacée et ne persiste aucune donnée Santé dans le stockage navigateur. La migration installe les accès fermés par défaut. Les réponses HTTP privées portent `Cache-Control: private, no-store`.

## Raccordement après stabilisation de #41

1. Garantir côté registre que l'identifiant canonique d'un enfant retiré reste non réutilisable, y compris pour un enfant sans compte Auth. Le registre actuel protège la disparition des membres liés. Un profil sans compte peut être retiré puis recréé via un snapshot. Vérifier le retrait, la tentative de réutilisation de l'identifiant et le rattachement tardif à un compte Auth. Toute activation des accès Santé dépend de cette garantie. Monter ensuite le composant dans les routes Santé et la fiche membre existantes, puis réutiliser les événements natifs de connexion, navigation et rafraîchissement pour actualiser et vider les vues.
2. Raccorder les téléchargements et envois au transport Storage natif avec le bucket `dobby-health-files`, le contrôle d'époque du compte, `cache: 'no-store'` à la lecture, `Cache-Control: private, no-store` à l'envoi et sans écrasement. Le client du lot définit ce contrat via les méthodes `upload` et `download`. Le transport V5 actuel fixe le bucket des documents partagés et exige cette adaptation.
3. Raccorder la projection à l'Agenda natif et le même rappel à Aujourd'hui, Agenda et Santé. Ne pas recopier de fiche dans `familyEvents` ou `sharedHealthVisits`. Les anciennes entrées de `sharedHealthVisits` ont leur propre périmètre. Examiner leur visibilité actuelle et leur éventuelle reprise avant activation du nouveau comportement. Vérifier le rendu depuis des liens directs, le retour navigateur, la reconnexion, la recherche, les aperçus et l'export existants.
4. Conserver les données locales historiques. Avant toute copie, produire une sauvegarde locale à accès restreint, inventorier les associations de membre et établir l'origine de chaque donnée sur les appareils partagés. Faire valider par le titulaire le rattachement des anciennes lignes `famHealth` et pièces en cas d'ambiguïté. Importer seulement les entrées sélectionnées vers un carnet privé, avec un identifiant stable par ligne et un état de rapprochement. Les partages doivent rester désactivés par défaut. Vérifier les nombres, champs et empreintes des octets avant de considérer la copie comme reprise. Le lot ne déplace aucune donnée historique.
5. Avant un DDL hébergé autorisé, obtenir les délégations limitées du résolveur Famille et de Storage. La lecture du catalogue DOBBY du 20 novembre 2026 confirme la présence des deux aides d'identité et de `storage.allow_only_operation`. Elle confirme aussi que `postgres` ne peut pas déléguer l'exécution de `dobby_socle_private.actor_context` et ne dispose pas des droits du propriétaire de `storage.objects`, `supabase_storage_admin`. Le script vérifie les délégations du résolveur et exige la création des politiques dans la même transaction. Rejouer l'installation avec un rôle d'essai représentatif et préparer une sauvegarde séparée des tables privées et des octets du bucket.
6. Après accord de mise en service, essayer le parcours #35 avec les deux nouveaux comptes parents et le compte enfant lié via l'invitation ciblée, selon [#46](https://github.com/PortenartCo/dobby-demo/issues/46). Vérifier les cas de révocation parentale et enfant, le second appareil et les refus d'un autre foyer. Laisser `dobby_health_private.install_state.enabled` à `false` jusqu'à la validation du raccordement et l'autorisation distincte. Une suspension remet ce paramètre à `false` pour fermer les nouvelles lectures et écritures, y compris au bucket. Elle conserve tables, politiques restrictives, autorisations et octets pour la reprise.

## Commandes de vérification

Depuis la racine du dépôt, servir les fichiers avec `python3 -m http.server 8765 --bind 127.0.0.1`. Installer Playwright avec `npm ci --ignore-scripts --prefix essai-stitch-v7/tests`.

```sh
node --test essai-stitch-v7/tests/health-essential.test.mjs
docker pull postgres:17.11
python3 docs/dobby-v7/sante-essentielle/test-postgres.py
docker pull supabase/storage-api:v1.89.12@sha256:8526956cb462e9f7d392e9848ec77133b2769982ed614e9753cc687e8e4339a6
docker pull postgrest/postgrest:v14.8@sha256:4173b72e0be29cf15349dc827798c3e464c5f2cc7f9c1697022f9cd1874b4c36
python3 docs/dobby-v7/sante-essentielle/test-postgres.py --storage
CHROMIUM_PATH=/usr/bin/chromium node essai-stitch-v7/tests/health-essential-ui.cjs
```

Le test SQL exerce le résolveur canonique du dépôt avec un catalogue synthétique. Le mode HTTP utilise PostgreSQL, PostgREST et Storage locaux avec des identités fictives, sur un réseau Docker interne sans port publié. Les captures Chromium montrent le composant seul, avec l'API simulée, aux trois largeurs demandées. Le mode HTTP et la suite de l'interface sont reproductibles indépendamment.

L'intervention sur Supabase hébergé s'est limitée à une requête de catalogue en lecture seule. Les comptes réels et la publication restent hors recette.

### Résultats observés

| Vérification | Résultat |
| --- | --- |
| JavaScript Santé et suites natives Sync V1, Sync V2 et Famille V5 | 450 tests réussis, dont 6 Santé |
| PostgreSQL 17.11 | 7 groupes réussis, dont installation fermée, droits, projections, rappels, concurrence des parents, révocation concurrente et politiques Storage |
| PostgREST 14.8 et Storage 1.89.12 | JWT fictifs, refus directs par compte, en-têtes de cache, téléchargements PDF/PNG et révocation vérifiés par HTTP |
| Composant Chromium | 320, 390 et 1440 px. Saisie, rappel, PDF, deux profils, rechargement, révocation d'un droit pendant une édition et projection enfant |
| Vérifications natives V7 | `npm test` du checkpoint courant, `fam-agenda-memos-sync.cjs` et `family-visual.cjs` réussis |
| Tests historiques Famille V7 | `test:family` et `family-edge.cjs` expirent sur le sélecteur masqué `#member-category`. `family-review.cjs` échoue sur ses attentes d'affichage et `family-shared.cjs` sur l'attente du mode partagé. Ces tests chargent le code natif inchangé de `main`. |
| Routes natives Santé et recette avec les nouveaux comptes | En attente de raccordement et de la mise en service #35 |
