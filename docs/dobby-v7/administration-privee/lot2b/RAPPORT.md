# Lot 2B Storage — reconstruction et livraison locale

18 novembre 2026 · [PR #30 en brouillon](https://github.com/PortenartCo/dobby-demo/pull/30), empilée sur #29. Références : issue #19, dépendance #28 et conception #27.

Le Lot 2B a été reconstruit depuis le HEAD vérifié de #29, `1012d90537305fd66c3a5cf2f6d8e4ca7b1fe95a`, dans un nouveau clone et une nouvelle branche. Aucun ancien fichier local récupéré, aucun ancien chemin réexploré pendant cette mission.

- Checkpoint initial publié : `2d14a90f85027246c4b4732d2ca9aafa9447e8d9`.
- Code testé et publié : `df440f30f1cf630013c544e0fb93e04a3f74039c`.
- Branche : `feat/dobby-private-access-lot2b-rebuild-20261118-w2m20p9r`.
- Les empreintes des sources et preuves sont dans [RESULTATS.json](RESULTATS.json). Les annonces historiques 13/13 HTTP, 26/26 PostgreSQL et 81/81 natifs ne sont pas réutilisées comme preuve.

## Résultats réellement exécutés

| Suite | Résultat final | Preuve |
|---|---|---|
| Storage physique local | **10/10 PASS**, zéro échec/omission | [Journal HTTP](preuves/storage-http.log), [runtime et scénarios](preuves/storage-local.json) |
| PostgreSQL Lot 2A | **26/26 PASS**, zéro échec/omission | [Rejeu intégral séquentiel](preuves/lot2a-final.log) |
| Natifs ciblés `family-access*.test.mjs` | **136/136 PASS**, zéro échec/omission | [Journal natif](preuves/natifs-cibles.log) |

Node.js 24.19.0 ; PostgreSQL 17.7 et Supabase Storage v1.89.12 épinglés par digest. Le service Storage officiel applique ses 80 migrations et transfère de vrais octets PDF fictifs sur un backend fichier temporaire. Réseau Docker interne, aucune connexion Supabase distante ni bind mount ; relais HTTP local vers le vrai serveur lorsque le réseau interne ne publie pas son port. Aucun mock ne remplace ces requêtes.

Auth est explicitement fictive : sessions et comptes synthétiques, clé HS256 éphémère et JWT vérifiés par le vrai serveur Storage. RLS est activée sur `auth.sessions`. Le test démontre d'abord le refus avec les seuls grants de colonnes, puis ajoute une policy du propriétaire Auth **uniquement dans la fixture**. Aucun GoTrue lancé ni droit Auth hébergé certifié.

Les scénarios couvrent lecture/liste/métadonnées/HEAD, upload/upsert/remplacement, copie/déplacement, suppression unitaire et par lot, deux foyers, Parent/Enfant, compte lié non approuvé, propriétaire DOBBY sans visibilité supplémentaire, chemins malformés et mixtes entre buckets, JWT et sessions invalides/expirés, suspension confirmée et réactivation avec nouvelle session. Le bucket témoin conserve ses propres droits, y compris pendant la suspension DOBBY.

## Candidate et rollback

La [candidate](../../../../supabase/migrations/20261118112535_dobby_private_access_storage.sql) ajoute uniquement `dobby_access_storage_native`, policy restrictive sur les opérations natives explicitement autorisées du bucket familial. Elle intersecte les huit policies existantes, interdit toute nouvelle signature de téléchargement simple/multiple ou d'upload, et refuse les opérations absentes ou inconnues. Aucun nouvel accès familial ni exception administrateur. Le client natif actuel est conservé ; aucune passerelle Edge créée.

Le préflight compare les huit policies aux expressions publiées et les helpers à leurs sources, dont le parseur `storage.foldername(text)`. Il vérifie les rôles et RLS, refuse des permissions permissives non prouvées disjointes et les possibilités navigateur de publication du bucket. Les scripts verrouillent Storage avant vérification ; un essai à deux connexions vérifie le refus d'un remplacement concurrent. Une permission DDL gérée insuffisante refuse atomiquement, sans réparation de rôle/propriétaire.

Le [rollback](../../../../supabase/rollbacks/20261118112535_dobby_private_access_storage.sql) refuse une policy altérée, retire uniquement la policy Lot 2B, conserve exactement policies natives, octets, métadonnées, propriétaires/RLS, ACL de tables/colonnes/schémas et appartenances de rôles, puis la candidate se réapplique. Le rollback rouvre les signatures natives : toute utilisation réelle exige une maintenance distincte, sérialisée, entrées applicatives fermées.

Aucune ancienne migration Lot 1 ou Lot 2A modifiée. `tests/private-access/lot2a/catalog.mjs` a pu être réutilisé tel quel ; aucune adaptation inutile. Aucun moteur applicatif, effet saisonnier ou fonction privée Missions remplacé.

## Échecs intermédiaires et revue

Un premier rejeu Lot 2A a donné 25/26 à cause d'un EPIPE pendant la fermeture d'une connexion du harnais existant. L’échec signalé concernait la fermeture du flux interactif ; les trois scénarios de concurrence ont passé isolément, puis les 26 tests ont passé intégralement en séquentiel. Le code Lot 2A est inchangé ; [premier journal](preuves/lot2a-premier-passage.log) et [rejeu isolé](preuves/lot2a-concurrence-isolee.log) sont conservés.

Les essais Storage ont d'abord révélé une collision d'alias PL/pgSQL à l'installation, puis un défaut de cadrage DELETE du relais et un préflight trop permissif. Une revue indépendante a demandé les canaris complémentaires sur le parseur de chemin, BYPASSRLS, les ACL et le verrou de maintenance. Les contre-épreuves et corrections sont détaillées dans [REVUE.md](REVUE.md) et les journaux `contrepreuve-*`. Un canari synthétique a ensuite rencontré un cycle de rôles ; son montage a été corrigé avant le dernier passage 10/10. Ces passages intermédiaires ne sont pas présentés comme des succès.

## Réserves et conditions bloquantes

**Un lien de téléchargement signé avant suspension reste utilisable. Un jeton d'upload signé inutilisé émis avant suspension écrit encore de vrais octets après suspension.** Les deux cas sont observés dans la suite et constituent des risques résiduels, pas des tests de révocation réussie. La candidate bloque l'émission future côté utilisateur ; elle ne révoque pas ces bearer privilégiés préexistants, ni une capacité émise par un autre producteur serveur privilégié.

Avant toute installation réelle : vérifier leur extinction/expiration et les producteurs de signatures, le catalogue et la version réellement hébergés, les droits autorisés de maintenance, la visibilité minimale des sessions sous Auth RLS, les schémas non exposés, l'impossibilité navigateur de rendre le bucket public et les protocoles alternatifs activés. Aucune annulation de transfert déjà engagé, aucun ordre atomique de mutation en vol, aucun effacement de copie téléchargée n'est certifié. La recette GoTrue réelle, S3/TUS/transformation d'images et la recette hébergée restent non exécutées. T09 reste donc **partiel pour l'hébergement et les anciennes capacités**, malgré les preuves HTTP locales.

Les [conditions et commandes de reprise](REPRISE.md) font partie de la livraison. Cette mission n'a effectué aucun accès Supabase distant, changement de compte réel, fusion ou déploiement. Contrôle de confidentialité des nouveaux fichiers et journaux effectué avant publication ; aucune clé, JWT, URL signée, donnée personnelle réelle ou contenu réel inclus. Les conteneurs et réseaux de la fixture ont été retirés ; le clone et la branche sont conservés.
