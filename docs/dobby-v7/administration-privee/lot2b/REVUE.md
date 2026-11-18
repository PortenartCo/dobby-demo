# Revue et contre-épreuves — Lot 2B

Revue indépendante en lecture seule du code, des contraintes de la mission et des sources du serveur officiel épinglé. Le réviseur n'a exécuté aucun test ni accédé à Supabase hébergé. Les résultats de correction relèvent des essais locaux du [rapport](RAPPORT.md).

| Point constaté | Contre-épreuve / correction |
|---|---|
| Une policy supplémentaire `FOR ALL` peut avoir un `USING` implicite ouvert et un `WITH CHECK` limité à un autre bucket. | L'installation était acceptée par le préflight initial : échec observé du canari. Le préflight vérifie désormais les prédicats effectifs selon la commande et refuse cette forme. |
| Les empreintes des huit policies ne protègent pas une modification de `storage.foldername(text)`. | Canari réel de corps détourné : l'installation initiale était acceptée. La définition courante de la migration officielle `0060` a été vérifiée indépendamment dans l'image épinglée ; la candidate contrôle corps, langage, propriétaire, signature et attributs d'exécution. |
| Un rôle navigateur BYPASSRLS ou membre du propriétaire ignore la protection des policies. | Canari BYPASSRLS accepté avant correction. Refus explicite des attributs dangereux et de l'appartenance au propriétaire ; canari de rôle propriétaire uniquement dans la fixture puis restauration. |
| La confidentialité du bucket dépend aussi des droits de modification de sa ligne. | Contrôle de RLS et du propriétaire de `storage.buckets`, refus des policies permissives de mutation non prouvées disjointes, essai HTTP de publication par navigateur et vérification du maintien du flag privé. |
| Une policy peut être remplacée entre sa vérification et son retrait. | Deux connexions ont démontré le remplacement avant correction. Les scripts prennent un verrou transactionnel sur Storage avant la vérification ; la candidate protège aussi le bucket privé. Maintenance sérialisée et entrées fermées restent requises. |
| Le snapshot initial ne comparait pas réellement les ACL annoncées. | Snapshot complété : ACL de tables, colonnes et schémas, propriétaires, RLS et appartenances de rôles, en plus des sessions, policies et attributs de rôles vérifiés. |
| Copie/déplacement testés seulement à l'intérieur d'un bucket. | Ajout des chemins mixtes avec le vrai champ `destinationBucket`, vérifiant séparément source et destination familiales interdites. |
| Une erreur d'écriture de preuve pouvait sauter la destruction de la fixture. | `stopStorage()` placé dans un `finally`, même si l'écriture du journal échoue. Les clés locales sont éphémères mais présentes dans les variables du conteneur et les métadonnées Docker jusqu'au retrait ; la documentation le précise. |

Le premier rejeu intégral avait aussi exposé une collision entre le nom d'une variable record PL/pgSQL et un alias de catalogue, corrigée sans toucher aux anciennes migrations. La suppression par lot HTTP avait révélé une erreur de plomberie du harnais : le relais retirait `Content-Length` sur DELETE. Une sonde HTTP locale indépendante a reproduit HTTP 400 sans cadrage puis HTTP 200 avec les 30 octets attendus ; le relais transmet maintenant la longueur exacte. Les assertions finales vérifient les effets et les octets, pas seulement un statut de refus.

Un premier canari de membre propriétaire a rencontré une interdiction de cycle dans les rôles synthétiques : le test inverse temporairement l'arête fictive nécessaire puis restaure exactement la capacité SET d'origine. Ce changement n'est ni une procédure de déploiement ni un octroi de rôle géré réel.

## Décisions et limites retenues

- Transport natif conservé : SQL/RLS suffit aux opérations courantes autorisées et au refus des nouvelles signatures. Une Edge Function ne révoquerait pas les anciens bearer déjà utilisables sur le serveur natif ; aucune passerelle applicative créée.
- Le catalogue Lot 2A est réutilisé tel quel : aucune adaptation de son fichier n'a été nécessaire. Les migrations Lots 1/2A restent inchangées.
- Auth réelle/GoTrue, visibilité des sessions et privilèges gérés hébergés, anciens liens et caches, producteurs privilégiés de signatures, protocoles S3/TUS/transformation et transferts déjà engagés ne sont pas certifiés ici. Ces limites et conditions bloquantes sont détaillées dans la [reprise](REPRISE.md).
- Les anciennes annonces 13/13 HTTP, 26/26 PostgreSQL et 81/81 natifs ne servent jamais de preuve à cette reconstruction.

Aucun point mineur laissé en attente dans le périmètre de code relu. Cette revue concerne une candidate locale à livrer en brouillon, pas une autorisation de fusion ou de déploiement.
