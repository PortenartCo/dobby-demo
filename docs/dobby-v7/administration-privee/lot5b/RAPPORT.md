# Lot 5B — Réconciliation et correctifs indépendants

> Rapport de la première phase, conservé comme preuve historique. Les nouveaux résultats et la levée du blocage de qualification des 21 sont dans [RAPPORT-FINALISATION.md](RAPPORT-FINALISATION.md).

19 novembre 2026 · Base PR #33 : `f4d18eb532e8ab3a9aa6eb6b5f4feaaec41db764`.

**Paquet partiel préparé et testé ; migration/mise en service toujours BLOQUÉES.** Les nouveaux constats hébergés sont utilisés comme preuves **rapportées par l’utilisateur**, sans les attribuer à CODEX. Le connecteur DOBBY dédié n’est pas disponible dans cette session ; l’unique lecture du projet `pqcdkrwljgvgagzwrcmg` via `supabase_get_project` retourne encore `MCP error -32600: You do not have permission to perform this action`. Aucun autre appel au projet, SQL hébergé, ligne personnelle, credential ou projet de substitution n’a été utilisé.

[Matrice des 27 signatures](MATRICE-FONCTIONS.md) · [Données de réconciliation](RECONCILIATION.json) · [Résultats et empreintes](RESULTATS.json) · [Lectures nécessaires](LECTURES-REQUISES.md) · [Revue](REVUE.md) · [Confidentialité](CONFIDENTIALITE.json).

## A — Fonctions métier : limites exactes de réconciliation

| Point | Preuve reçue / qualification |
| --- | --- |
| PostgreSQL 17.11 | Rapporté par l’utilisateur ; satisfait le minimum PG16 des candidates. Le blocage de version conditionnel Lot 5A est donc levé pour ce constat, sans nouvelle connexion CODEX. |
| 27 signatures, propriétaires et SECURITY DEFINER | Présence et correspondances rapportées pour les 27. Cela ne démontre pas l’équivalence de leurs corps, defaults, configuration ou ACL. |
| 21 corps différents, 6 identiques | Compte agrégé reçu ; **liste des 21 et définitions non transmises**. Chaque ligne des 27 est marquée BLOQUÉE pour sa qualification de corps, sans affirmer que les 27 divergent. Impossible de classer honnêtement une ligne comme normalisation, correction métier ou défaut de sécurité. |
| Stamper | Écart EXECUTE rapporté pour `public.dobby_sync_stamper()`. Référence locale : `anon=false`, `authenticated=false`, owner `postgres`, SECURITY INVOKER. Retour, ACL effectives/héritées et triggers attachés à obtenir ; aucune révocation aveugle. La signature d’un trigger ne prouve pas une RPC ordinaire exploitable ni l’innocuité du corps lorsqu’il est déclenché. |
| 12 dépendances Missions | Présentes selon la lecture rapportée ; **elles ne sont plus à considérer absentes du projet**. Leurs corps restent indisponibles pour la fixture CODEX ; le graphe autorisé complet ne peut pas être certifié. Aucun stub ajouté. |

Les références publiées sont conservées dans la matrice et [la requête de métadonnées](LECTURE-CATALOGUE.sql). Aucune empreinte des quatre migrations historiques n’est modifiée. Les 21 divergences ne sont pas assimilées à des erreurs métier : leur qualification est **bloquée faute de preuve individuelle**, conformément à la mission. Le [Lot 5A](../lot5a/RAPPORT.md) reste intact ; le présent rapport actualise ses réserves à partir des faits reçus.

## B — Rôles et Auth/RLS

### Writers existants

La condition du Lot 2A demande une attribution directe ADMIN, INHERIT=false et SET=false pour chaque writer. L’absence rapportée sur `dobby_v7_writer` suffit donc à faire refuser ce préflight en l’état ; `CREATEROLE` seul ne permet pas à `postgres` de se donner ADMIN. La capacité fermée rapportée sur `dobby_socle_writer` correspond à cette condition.

**Les deux attributions Missions ne prouvent pas un échec.** PostgreSQL distingue les grantors : si l’attribution active est celle créée par `postgres`, les instructions existantes la referment et conservent l’ADMIN fermé du grantor d’origine. C’est physiquement vérifié. Si elle vient d’un autre grantor, ou d’un chemin indirect restant actif, la même fermeture ne suffit pas. Les grantors et chemins effectifs manquent pour choisir le cas réel. [Documentation Supabase sur ces memberships](https://supabase.com/kb/troubleshooting/cant-revoke-a-role-membership-granted-by-supabase_admin-d08922).

Correctif indépendant livré : [préflight de rôles](../../../../supabase/compatibility/lot5b/maintenance-roles.preflight.sql), en lecture seule. Il garde les conditions fermées, projette la fermeture des seuls grants directs propres, calcule les rôles atteignables par SET puis leurs privilèges INHERIT et refuse l’autorité résiduelle. Il accepte le double grant normal. Il ne répare aucun rôle et n’accorde aucun ADMIN. Comme tout préflight, il décrit un instantané : la future maintenance doit sérialiser les changements de rôles et vérifier les postconditions, sans supposer ce contrôle permanent.

### Auth

Avec RLS et zéro policy applicable, les readers NOLOGIN/NOBYPASSRLS ne voient aucune ligne même après des grants de colonnes. De plus, Supabase documente que le `USAGE(auth)` accordé par `postgres` à un rôle personnalisé peut n’avoir aucun effet. La voie proposée par [la documentation officielle](https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7) est une fonction SECURITY DEFINER étroite, détenue par `postgres` dans un schéma contrôlé non exposé, utilisant ses droits **déjà existants**.

Un [candidat indépendant](../../../../supabase/compatibility/lot5b/auth-bridge.candidate.sql) et son [rollback](../../../../supabase/compatibility/lot5b/auth-bridge.rollback.sql) sont livrés :

- Booléen de session lié à `user_id`, `session_id`, création non future, borne de réactivation et `not_after` ; même prédicat temporel que le contrat publié.
- Identité réduite à UUID/adresse normalisée/confirmation, page bornée à 100 ; aucune clé, session complète, refresh token, donnée de foyer ou SQL arbitraire retourné.
- EXECUTE distinct pour les deux readers, memberships croisés interdits, schéma limité à USAGE sans CREATE/grant option, defaults inattendus refusés ; aucun grant direct Auth, changement d’owner/RLS, nouveau BYPASSRLS ou rôle géré approprié.

**Ce candidat n’est pas raccordé aux helpers ou activateurs Lots 1/3 et n’active aucun mécanisme.** Les contrôles historiques attendent encore les grants directs, et Storage épingle le corps du helper de session historique. Leur adaptation coordonnée reste à produire après réconciliation du catalogue. Aucun simple changement de MD5 n’est proposé pour contourner cette dépendance.

La preuve locale positive donne à l’installateur des policies SELECT **fictives**, sans donner de droits Auth aux readers ; elle teste le contrat et la séparation. Elle ne reproduit pas les zéro policies rapportées du projet et ne propose pas d’y ajouter ces policies. Tous les rôles non-superuser de la fixture sont NOBYPASSRLS. La visibilité Auth réelle de `postgres`, les capacités gérées et l’activation hébergée restent **NON VÉRIFIÉES / BLOQUÉES**. Si aucun mécanisme supporté ne permet les lectures requises, arrêter ; aucun privilège général n’est une solution de repli.

## C — Storage : autorité requise et verdict

En PostgreSQL ordinaire, [CREATE POLICY](https://www.postgresql.org/docs/17/sql-createpolicy.html) exige l’autorité du propriétaire de la table (ou superuser). **CREATE sur le schéma Storage n’est pas cette autorité et n’est pas requis pour créer une policy sur une table existante.** Trois essais PostgreSQL le montrent : les locks réussissent sous droits DML, CREATE POLICY échoue pour un non-owner ; ajouter CREATE au schéma ne répare rien ; l’owner peut créer la policy sans ce CREATE.

Supabase fournit aussi une [délégation gérée `supautils.policy_grants`](https://github.com/supabase/supautils#manage-policies), permettant la gestion de policies sans appropriation de table. L’absence de membership `supabase_storage_admin` et de CREATE Storage **ne suffit donc pas à déclarer la migration impossible sur DOBBY**. La présence/version active de supautils et la délégation effective vers `storage.objects` restent à lire. Aucun réglage de plateforme n’est changé ou proposé à activer aveuglément.

La candidate nécessite en outre : USAGE et accès de lecture nécessaires, TEMP pour ses références temporaires, EXECUTE sur les helpers référencés, et un privilège autorisant ses locks sur `objects` **et** `buckets`. Sur [PG17](https://www.postgresql.org/docs/17/sql-lock.html), MAINTAIN, UPDATE, DELETE ou TRUNCATE permettent le mode demandé ; ce constat ne justifie aucun nouveau grant TRUNCATE. Une délégation de policy ne confère pas automatiquement ces autres droits.

**Verdict : faisabilité conditionnelle, non démontrée pour le rôle réel ; pas de correction de Storage déployable sans ces lectures.** Le bucket privé, ses MIME/10 Mo, les huit policies et trois helpers conformes sont des faits rapportés acceptés ; aucun octet, ACL, owner, policy ou transport natif n’est modifié. Pas de passerelle Edge ajoutée. Les essais d’autorité utilisent huit sentinelles fictives, pas une reproduction des huit policies hébergées ; ni le module supautils ni Storage HTTP ne sont certifiés par ces essais.

Les anciens liens et uploads signés restent une réserve distincte : geler les émissions, établir TTL/caches et preuve d’extinction, ou soumettre une invalidation ciblée/rotation-révocation **de la clé URL Storage** et une purge contrôlée. Impacts sur les autres utilisateurs/buckets, aucune révocation par seule suspension et aucune absence de lien déduite d’une recherche vide ; voir [le comparatif Lot 5A](../lot5a/RAPPORT.md). Aucun de ces gestes n’est exécuté.

## D — Vérifications et sauvegardes effectuées

**34/34 tests locaux passent**, zéro échec/omission : 19 groupes Auth, 12 rôles, 3 autorité Storage. PostgreSQL réel **17.7**, distinct du 17.11 hébergé rapporté ; image épinglée, conteneurs possédés et retirés, réseau `none`, tmpfs, aucun port/bind mount. Aucun test A/B réel, GoTrue, Storage HTTP ou SMTP lancé. [Journal final](preuves/final-green.log).

Les preuves RED puis GREEN sont conservées, ainsi que les quatre contre-épreuves de revue. Les trois constats importants et le complément CREATE Auth ont été corrigés et relus ; voir [REVUE.md](REVUE.md). Deux requêtes de métadonnées ont également passé une vérification syntaxique sur la fixture locale, sans catalogue métier hébergé : ce n’est pas leur exécution sur DOBBY.

Code sauvegardé : `be11bbaa1536b28e65fe95ea2814b5699554a60d`. Checkpoint initial `3b27177` ; étape rôles `e39da1c` ; candidat Auth initial `cc39af0`. La [CI dédiée finale](https://github.com/PortenartCo/dobby-demo/actions/runs/44532957773) est verte et observe elle aussi **34/34**. Les CI intermédiaires et empreintes exactes sont consignées dans RESULTATS.json. Les anciens tests et CI des Lots 1–4 ne sont pas revendiqués comme rejoués. Aucun fichier applicatif existant, migration historique, effet saisonnier ou gate enfant modifié.

La livraison documentaire finale porte `[skip ci]` : les huit fichiers de code/test/workflow sont identiques au commit testé ci-dessus. Le SHA documentaire n’est pas présenté comme une nouvelle exécution CI ; les preuves historiques sont conservées.

## E — Ordre avant toute migration

1. Obtenir par la connexion DOBBY autorisée la liste exacte des 21, les métadonnées complémentaires puis les définitions nécessaires par canal privé. Qualifier chaque écart et valider les versions effectives, sans publication automatique des corps.
2. Identifier les grantors/chemins des writers et la voie légitime de maintenance V7. Aucun `GRANTED BY supabase_admin`, prise de rôle géré ou réparation automatique. Conserver l’ADMIN fermé et seulement les droits temporaires explicitement nécessaires.
3. Vérifier les capacités Auth préexistantes de `postgres` et la délégation Storage/locks/TEMP/helpers. Sans mécanisme supporté, maintenir BLOQUÉ plutôt qu’élargir les permissions.
4. Composer et recetter sur fixture privée le paquet exact : définitions natives approuvées, gardes conservées, préflight rôles, éventuel bridge Auth, activateurs adaptés et manifeste cohérent Storage. Gardes fermées pendant les états intermédiaires ; aucun des fichiers indépendants n’est une migration complète prête à appliquer.
5. Reprendre ensuite le [plan Lot 5A](../lot5a/PLAN-BASCULE.md) : sauvegarde privée DB **et octets Storage**, manifeste propriétaire/A/B inchangé, maintenance, traitement des capacités signées, recette fictive et rollback conservateur. Le retour du bridge protège les dépendances cataloguées seulement ; les consommateurs textuels doivent être coordonnés. Ne pas rouvrir les anciennes ACL, inscriptions ou signatures lors d’un retour normal.

Toute écriture hébergée, intégration/fusion, permission/activation, rotation/purge, déploiement, SMTP externe ou ouverture reste soumise à une **validation humaine ultérieure du paquet exact**. Le Lot 5B s’arrête à cette livraison partielle vérifiable ; aucune mise en service engagée.
