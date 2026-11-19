# Procédure unique — ordre futur, suspendu par le NO-GO

Les scripts écrivants restent des sentinelles. La séquence ci-dessous prépare une exécution future après validation du point de reprise et des contrôles restants. [Rapport de récupération](VALIDATION-REPRISE.md)

| Ordre | Opération et prérequis | Contrôle bloquant / validation humaine |
| --- | --- | --- |
| 0 | Reprendre le code des lectures Lot 3 et la garde V7 validés localement. | Les 14 tests ciblés de lecture/acceptation sont acquis au SHA testé. Les essais HTTP intégrés restent dans la recette après installation. [Preuves](CORRECTION-LECTURES.md) |
| 1 | Fixer SHA, manifeste et projet personnel ; vérifier l’identité du projet par son interface autorisée, PostgreSQL 17.11 rapporté, versions Auth/Storage/PostgREST et historique des migrations. | Arrêt sur un changement de HEAD, une candidate déjà installée, une empreinte/owner/ACL non admis ou une autre identité de projet. **GO humain H1 : paquet exact et correction.** |
| 2 | Exécuter `00-preflight.sql` avec l’installateur existant dans une session autorisée, sans données nominatives. | 27 signatures avec leurs paires exactes, 12 références Missions déjà attestées, six tables postgres/RLS, chemins SET/INHERIT, ADMIN fermés des autres writers et ACL/defaults. Aucun normaliseur ni corps privé exporté. |
| 3 | Compléter les contrôles non prouvables par ce SQL : visibilité Auth réelle, absence des schémas privés dans la configuration Data API effective, droits Storage gérés, locks/TEMP et maintenance. | Le préflight liste les huit policies et les empreintes des expressions ; la comparaison stricte des huit expressions et des policies supplémentaires reste dans la transaction Storage sous verrou. SMTP/Auth/Edge nécessitent des preuves de configuration expurgées. Aucun rôle géré usurpé ni support. |
| 4 | Fermer les entrées applicatives/API/RPC, les écritures Auth et Storage concernées, Edge privilégié et les émetteurs de capacités signées. Sérialiser les DDL/rôles. | **GO humain H2** sur la fenêtre et la fermeture effective. **GO H3** sur le traitement des capacités existantes et de leurs caches. [Décisions](DECISIONS.md) |
| 5 | Constituer le point logique avant installation, avec les octets Storage, les configurations et le manifeste privé A/B. Vérifier sa couverture et la capacité de le restaurer. | Contrôler la cohérence du même point, le rôle/grantor réel d’importation et la voie de reprise si les OID changent. [Restauration](RESTAURATION.md) |
| 6 | Construire hors Git l’entrée privée de la session : `pg_temp.dobby5c_input`, une ligne, voir ci-dessous. | Propriétaire explicite, deux comptes distincts du même foyer, liaisons canoniques existantes/actives. Pas d’inférence par adresse ou premier connecté, pas de réinvitation B. **GO H4 : bootstrap et invalidation des anciennes invitations non consommées.** |
| 7 | `10-install.sql`, seulement après livraison autorisée et validation du point de reprise. | Une transaction : préflight → fondation → bootstrap → variante catalogue/Missions/garde directe V7 → administration → bridge Auth → lecteurs/activateurs raccordés → Storage. Tout échec annule rôles/DDL/DML. Quatre indicateurs false au commit ; aucun enfant activé. |
| 8 | Vérifier `30-postflight.sql`, état fermé et absence d’accès non approuvé. Préparer Edge/client/Auth compatibles sous maintenance. | Edge `dobby-access-admin`, origines, redirects/templates, clés gérées et validation JWT conformes au Lot 3 ; aucun secret navigateur. Les sources restent celles du SHA validé. **GO H5 distinct : déploiement/configuration**, absent de cette mission. |
| 9 | `20-activate.sql` après approbation : canari fictif confirmé avec vraie session courante, identité attendue et hash privé de l’e-mail normalisé. | Contrôle positif et refus sous visibilité insuffisante ; les trois lecteurs utilisent le bridge, sans privilège Auth direct aux readers. Session puis identité puis administration ; `child_delivery_enabled` reste false. **GO H6 : activation limitée pour recette.** |
| 10 | Exécuter la [recette intégrée](RECETTE.md), les [appels Missions](MISSIONS.md) et le rollback sur environnement de recette autorisé ; vérifier en privé la conservation A/B. | Missions intégral, Storage réel, anciens JWT, refresh/recovery et deux onglets. Aucune suspension des vrais A/B. **GO H7 : recette/restauration acceptées.** |
| 11 | Intégration Git/promotion et ouverture du service au SHA final uniquement après validations distinctes. | Pas de fusion implicite des #28–#34, ni publication automatique par ce paquet. Retarget/recontrôler la pile avant intégration autorisée. Fermeture signup, premier e-mail externe et gates enfants ont chacun leur accord distinct. **GO H8 : ouverture finale.** |

## Entrée privée future

Un fichier privé fourni par l’opérateur, hors dépôt et sans journalisation des valeurs, créera `pg_temp.dobby5c_input` dans **la même session** que le script. Schéma attendu :

```sql
CREATE TEMP TABLE dobby5c_input(
 manifest jsonb, operation_id uuid, project_ref text, package_id text,
 maintenance_confirmed boolean, backup_verified boolean,
 signed_storage_resolved boolean, open_administration boolean,
 probe_user uuid, probe_session uuid, probe_email_sha256 text
);
```

`manifest` suit le contrat historique `{ownerUserId,preservedAccounts:[{userId,householdId,memberId},{userId,householdId,memberId}]}`. `memberId` est TEXT. `package_id` doit correspondre exactement au manifeste généré ; `project_ref` est le seul projet autorisé. Les booléens sont des attestations humaines, **pas une preuve SQL de sauvegarde ou de maintenance**. Aucun défaut true n’est fourni. Le canari est distinct des vrais Parents A/B ; l’entrée ne crée ni ne modifie les comptes Auth. L’existence et la cohérence des liaisons réelles seront vérifiées par le bootstrap invoker, sous autorisation future.

L’identité de projet ne peut pas être déduite du seul nom de base PostgreSQL. Les droits SQL ne prouvent pas le déploiement Edge, SMTP, l’allowlist Auth ou l’exclusion effective de schémas privés côté gateway. Conserver les attestations privées sans secrets et ne publier que le verdict expurgé.
