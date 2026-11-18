# Rejouer le Lot 2B Storage local

Reconstruction depuis la PR #29 à `1012d90537305fd66c3a5cf2f6d8e4ca7b1fe95a`. Les fichiers Lot 2B ont été recréés, aucune ancienne version locale n'a été récupérée.

## Préparation

Node.js 24, Docker local sur `/var/run/docker.sock`. Les essais n'installent aucun paquet applicatif et ne lisent aucun `.env`, projet Supabase lié ou credential utilisateur. Tirer explicitement les deux images épinglées si elles ne sont pas déjà présentes :

```sh
docker --host unix:///var/run/docker.sock pull postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4
docker --host unix:///var/run/docker.sock pull supabase/storage-api:v1.89.12@sha256:8526956cb462e9f7d392e9848ec77133b2769982ed614e9753cc687e8e4339a6
```

Si des variables DOCKER désignent un autre daemon, les retirer pour ces commandes comme le fait le harnais. Ne pas modifier ni redémarrer le daemon partagé.

Depuis le nouveau checkout :

```sh
mkdir -p /tmp/dobby-lot2b-evidence
DOBBY_EVIDENCE_DIR=/tmp/dobby-lot2b-evidence node --test tests/private-access/lot2b/storage.test.mjs
node --test --test-concurrency=1 tests/private-access/lot2a/*.test.mjs
node --test essai-stitch-v5-famille/tests/family-access*.test.mjs
git diff --check
```

Le mode `DOBBY_LOT2B_PHASE=red` n'applique pas la candidate ; le test `new signed capabilities` doit alors échouer car le serveur émet une signature. Ce mode fournit une contre-épreuve, pas un résultat attendu vert.

## Modèle de preuve

Le service Supabase Storage officiel crée son schéma et transfère réellement les octets via HTTP, dans un réseau Docker interne, avec backend fichier et données PostgreSQL jetables. Le transport du harnais est strictement local. Sur cette machine, le réseau interne Docker ne publie pas son port : un relais HTTP sur `127.0.0.1` transmet méthodes, en-têtes, corps, statuts et octets au vrai serveur via `docker exec`. Ce relais de test ne simule aucune réponse Storage et n'est pas une passerelle applicative. Aucun appel au projet hébergé n'est nécessaire.

Les comptes, liens familiaux et sessions Auth sont fictifs. Les JWT HS256 sont générés avec une clé aléatoire éphémère, conservée dans le processus et dans les variables du conteneur Docker jusqu’à son retrait puis vérifiés cryptographiquement par Storage. Aucun service GoTrue n'est lancé : cette preuve ne certifie pas une connexion ou un refresh Auth réel, ni les droits Auth hébergés.

Le harnais active RLS sur `auth.sessions`, démontre que les seuls grants de colonnes du Lot 1 ne rendent aucune session visible, puis ajoute une policy de lecture **exclusivement dans la fixture**, sous le propriétaire Auth fictif. La candidate ne contient aucun changement Auth, rôle, propriétaire ou grant.

## Candidate et rollback

- Candidate : `supabase/migrations/20261118112535_dobby_private_access_storage.sql`.
- Rollback : `supabase/rollbacks/20261118112535_dobby_private_access_storage.sql`.

Le fichier candidate a été créé avec `supabase migration new` via le CLI épinglé `3.2.0`, commande locale uniquement.

Le test installe uniquement la nouvelle candidate après reconstruction des définitions publiques nécessaires. Il exécute le rollback, compare les policies, ACL/attributs Auth, métadonnées et octets, puis réapplique la candidate. Les anciens installateurs ne sont pas rejoués intégralement ; aucun stub privé Missions n'est créé.

L'absence de droits CREATE POLICY sur la table gérée doit provoquer un refus atomique. Ne changer ni propriétaire, ni rôle géré, ni RLS pour contourner un refus. Les opérations de maintenance doivent être sérialisées, entrées applicatives fermées ; les scripts prennent un verrou sur les tables Storage avant de vérifier les policies et la candidate protège le bucket privé pendant sa transaction. Un rollback réel rouvrirait la signature native : il exige une mission distincte et la fermeture préalable des entrées applicatives.

## Conditions bloquantes avant tout déploiement

1. Validation distincte du catalogue Storage hébergé, des huit policies familiales, des fonctions et versions réellement installées. Tout écart au préflight exige revue ; ne pas remplacer aveuglément les empreintes. Inclure `storage.foldername(text)` et les droits de publication du bucket, ainsi que les attributs et appartenances des rôles navigateur.
2. Droits de maintenance autorisés sur `storage.objects`, visibilité effective des seules colonnes nécessaires de `auth.sessions` sous RLS et activation des gardes Lot 1 ; aucune promotion technique implicite.
3. Extinction vérifiée de toutes les anciennes URLs de téléchargement **et** capacités d'upload signées, y compris celles émises par un service privilégié. RLS ne les révoque pas. La simple suspension ne suffit pas.
4. Vérification des caches et liens préexistants, des autres producteurs de signatures, de l’incapacité des navigateurs à publier ou remplacer le bucket familial, des schémas privés non exposés et des protocoles alternatifs éventuellement activés. S3/TUS/transformation d'images ne sont pas certifiés par cette suite.
5. Recette hébergée expressément autorisée après les prérequis ; aucune fusion ni publication applicative n'est réalisée par cette mission.

Les requêtes commencées après le commit de suspension sont la borne testée. Aucune annulation d'un transfert déjà en cours, aucun ordre atomique d'une écriture en vol et aucun effacement de copie déjà téléchargée ne sont promis.
