# Procédure unique — ordre futur, suspendu par le NO-GO

Le [rapport](RAPPORT.md) impose l’arrêt avant migration. Les scripts écrivants sont bloqués ; aucun GO humain ne suffit à remplacer la correction technique et la recette manquantes. La séquence ci-dessous prépare une future exécution distinctement autorisée.

| Ordre | Opération et prérequis | Contrôle bloquant / validation humaine |
| --- | --- | --- |
| 0 | Corriger exclusivement le chemin Lot 3 identifié, conserver V7 et les RPC STABLE. | Deux invitations valides/invalides READ ONLY et HTTP, acceptation sécurisée, concurrence et rollback réussis. Aucun changement de droits V7. **Non réalisé.** |
| 1 | Fixer SHA, manifeste et projet personnel ; vérifier l’identité du projet par son interface autorisée, PostgreSQL 17.11 rapporté, versions Auth/Storage/PostgREST et historique des migrations. | Arrêt sur un changement de HEAD, une candidate déjà installée, une empreinte/owner/ACL non admis ou une autre identité de projet. **GO humain H1 : paquet exact et correction.** |
| 2 | Exécuter `00-preflight.sql` avec l’installateur existant dans une session autorisée, sans données nominatives. | 27 paires exactes et 12 références Missions, six tables postgres/RLS, aucun accès V7 utilisable via SET/INHERIT, ADMIN fermés des autres writers, ACL/defaults. Aucun normaliseur ni corps privé exporté. |
| 3 | Compléter les contrôles non prouvables par ce SQL : visibilité Auth réelle, absence des schémas privés dans la configuration Data API effective, droits Storage gérés, locks/TEMP et maintenance. | Le préflight liste les huit policies et les empreintes des expressions ; la comparaison stricte des huit expressions et des policies supplémentaires reste dans la transaction Storage sous verrou. SMTP/Auth/Edge nécessitent des preuves de configuration expurgées. Aucun rôle géré usurpé ni support. |
| 4 | Préparer sauvegarde DB physique cohérente, octets Storage et configuration externe ; vérifier la restauration et les contrôles A/B privés. | [RESTAURATION.md](RESTAURATION.md). **GO H2 : point restaurable, fenêtre, opérateur et fermeture effective des entrées.** Aucun fichier familial ou secret dans ce dossier. |
| 5 | Fermer effectivement les entrées applicatives, API/RPC, Edge privilégié et producteurs de capacités signées ; sérialiser les DDL/rôles. | Un écran de maintenance seul est insuffisant. Choix des anciennes capacités/cache selon [DECISIONS.md](DECISIONS.md). **GO H3 : traitement signé précis et impacts acceptés.** |
| 6 | Construire hors Git l’entrée privée de la session : `pg_temp.dobby5c_input`, une ligne, voir ci-dessous. | Propriétaire explicite, deux comptes distincts du même foyer, liaisons canoniques existantes/actives. Pas d’inférence par adresse ou premier connecté, pas de réinvitation B. **GO H4 : bootstrap et invalidation des anciennes invitations non consommées.** |
| 7 | `10-install.sql`, seulement après correction et nouvelle livraison validée. | Une transaction : préflight → fondation → bootstrap → variante catalogue/Missions/garde directe V7 → administration → bridge Auth → lecteurs/activateurs raccordés → Storage. Tout échec annule rôles/DDL/DML. Quatre indicateurs false au commit ; aucun enfant activé. |
| 8 | Vérifier `30-postflight.sql`, état fermé et absence d’accès non approuvé. Préparer Edge/client/Auth compatibles sous maintenance. | Edge `dobby-access-admin`, origines, redirects/templates, clés gérées et validation JWT conformes au Lot 3 ; aucun secret navigateur. Les sources restent celles du SHA validé. **GO H5 distinct : déploiement/configuration**, absent de cette mission. |
| 9 | `20-activate.sql` après approbation : canari fictif confirmé avec vraie session courante, identité attendue et hash privé de l’e-mail normalisé. | Contrôle positif et refus sous visibilité insuffisante ; les trois lecteurs utilisent le bridge, sans privilège Auth direct aux readers. Session puis identité puis administration ; `child_delivery_enabled` reste false. **GO H6 : activation limitée pour recette.** |
| 10 | Exécuter [RECETTE.md](RECETTE.md) et le rollback sur environnement de recette autorisé ; vérifier en privé la conservation A/B. | Missions intégral, Storage réel, anciens JWT, refresh/recovery et deux onglets. Aucune suspension des vrais A/B. **GO H7 : recette/restauration acceptées.** |
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
