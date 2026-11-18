# Lot 2B Storage — checkpoint de reconstruction

18 novembre 2026. Reconstruction nouvelle, aucune récupération de versions locales anciennes.

- Dépôt vérifié : `PortenartCo/dobby-demo`.
- PR de base #29 : HEAD vérifié par API GitHub et Git à `1012d90537305fd66c3a5cf2f6d8e4ca7b1fe95a` ; branche `feat/dobby-private-access-lot2a-20261117`.
- Dépendance #28 : `f91dfde4972b20dcc5b7364d6017e56ee8a5ead9`.
- Références : issue #19 ; conception #27 à `440cc2394c2dd5e9865a9b71fcd17b43e351f034`.
- Nouveau clone et nouvelle branche dédiés, état initial propre ; aucun AGENTS.md trouvé dans le dépôt ou ses parents.
- Aucun accès à l'ancien environnement ; aucun accès à Supabase hébergé, aux comptes réels ou aux fichiers réels.

## État des preuves à ce checkpoint

Terminal, lecture GitHub et daemon Docker local fonctionnent. Aucun test du Lot 2B encore exécuté dans cette reconstruction.
Les annonces historiques 13/13 Storage HTTP, 26/26 PostgreSQL et 81/81 natifs ne sont pas des preuves de cette branche.

## Périmètre et risques à vérifier

Reconstituer les trois modules Lot 2B, adapter uniquement le point de composition du catalogue Lot 2A si nécessaire, ajouter une migration candidate Storage et son rollback. Ne modifier aucune migration des Lots 1/2A, aucun moteur applicatif ni effet saisonnier.

Vérifier Storage HTTP physique local avec données fictives : opérations normales, suspension/réactivation, familles, autres buckets, téléchargement direct, émission et réutilisation des liens signés et tokens d'upload. Les bearer déjà signés peuvent survivre à une suspension ; les SELECT étroits sur auth.sessions peuvent rester sans effet sous RLS. Ces limites doivent être démontrées et documentées, sans correction implicite des droits Auth.

Après chaque étape stable : commit, contrôle de confidentialité, push sur la seule branche dédiée. Livraison finale en PR brouillon empilée sur #29 ; aucune fusion, aucun déploiement.
