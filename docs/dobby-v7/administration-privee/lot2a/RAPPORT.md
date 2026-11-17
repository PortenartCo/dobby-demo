# Administration privée — Lot 2A, 17 novembre 2026

Fondations de référence : [PR #28](https://github.com/PortenartCo/dobby-demo/pull/28), commit `f91dfde4972b20dcc5b7364d6017e56ee8a5ead9`. Référentiel : [Issue #19](https://github.com/PortenartCo/dobby-demo/issues/19), [conception](https://github.com/PortenartCo/dobby-demo/blob/440cc2394c2dd5e9865a9b71fcd17b43e351f034/docs/dobby-v7/administration-privee/CONCEPTION-2026-11-17.md) et [plan](https://github.com/PortenartCo/dobby-demo/blob/440cc2394c2dd5e9865a9b71fcd17b43e351f034/docs/dobby-v7/administration-privee/PLAN-2026-11-17.md).

Branche empilée : `feat/dobby-private-access-lot2a-20261117`, cible `feat/dobby-private-access-lot1-20261117`. Aucune modification de main, des PR #26/#27/#28, des moteurs applicatifs ni des installateurs historiques. Aucun accès Supabase distant pendant cette mission.

## Résultat et périmètre de preuve

Les entrées métier reproduites dans PostgreSQL local refusent les comptes non approuvés et suspendus. Les règles familiales, identités liées, CAS, rôles, triggers et corps métier sont conservés. **Ce résultat ne valide ni HTTP/JWT, ni le catalogue hébergé, ni Storage physique.** Les écritures Missions complètes restent non vérifiées : douze définitions privées manquent dans les sources publiques. Aucun stub de ces fonctions n'a été créé.

Le harnais réutilise la migration et les fixtures du Lot 1. Il extrait les définitions publiées V7, Socle familial et Missions ; il n'exécute pas les anciens installateurs, leurs préflights ou leurs scripts de réparation. Les tables/RLS V2 proviennent du catalogue public déjà utilisé au Lot 1. La réparation documentée d'`actor()` et les deux branches de stamper V7/Socle sont reconstituées depuis les sources. Le faux `request_user_id()` et le faux guard Missions de l'ancien harnais sont exclus ; le vrai `guard_missions()` publié avec le Socle est utilisé.

La table des anciens reçus Missions est reproduite selon la forme publique du catalogue de test ; son DDL hébergé complet et les policies V2 dépendant du `request_user_id()` absent restent non vérifiés. Aucun succès de nouvelle écriture Missions n'est déduit de cette reconstruction.

## Catalogue fermé

Le [catalogue exact avant/après](preuves/catalogue-local.json) conserve signatures, ACL effectives `anon`/`authenticated`, propriétaires techniques, configuration, empreintes, tables et policies. Il contient uniquement des métadonnées locales et des noms déjà présents dans les sources publiques, aucune ligne de compte, jeton d'invitation ou secret d'installation.

| Classe | Traitement |
| --- | --- |
| 4 tables V2 : households, memberships, grocery, modules | Policy restrictive `dobby_access_active`, intersectée avec toutes les policies natives. Couvre aussi menus, recettes, maison et contrats. |
| `dobby_sync_members` V1 | Lecture de son propre enregistrement seulement si compte actif ; pas de droit d'écriture navigateur ajouté. |
| `dobby_sync_grocery_items` V1 | Privilèges navigateur révoqués, y compris privilèges de colonnes ; lignes conservées. |
| RPC V7 contexte, profil, création, modifications et invitations | Garde avant entrée dans le corps natif ; contexte conservé pour les actifs. Création : droit explicite consommé une fois, rejeu conservé. |
| Writers/capacités Missions V2/V3 | Garde avant validation, verrou métier ou retour de reçu. Chemin réel du rejeu V3 et capacités V3 testés. Graphe complet V2/V3 non certifié. |
| Alias `dobby_missions_v2_write_legacy_socle` | Déjà fermé ; migration refuse un catalogue qui l'exposerait. Aucun EXECUTE navigateur ajouté. |
| Ancien `dobby_v7_bind_existing_member` | Reste fermé au navigateur et conserve son refus natif ; garde supplémentaire avant son corps. |
| `actor_context`, prédicats familiaux, `assert_snapshot` | Vérification de l'accès actif ; prédicats retournent false en cas de suspension. Verrou d'autorisation pris avant le contexte verrouillant. |
| `dobby_v7_family_capabilities` | Liste publique de drapeaux, aucun payload familial ; identité canonique false pour un anonyme. |
| Prévisualisations d'invitation | Réponse neutre `status: invalid` sans accès actif. Refus de dévoiler un autre foyer à un compte déjà lié. L'admission nominative relève du Lot 3. |
| 3 API publiques du Lot 1 | Contexte d'accès borné et décisions propriétaire existantes conservés. |
| Vues / surcharges supplémentaires | Aucune vue exposée dans les sources reproduites. Une entrée publique, surcharge, vue accessible ou table inconnue fait échouer le préflight atomiquement. |

Le manifeste compte 27 signatures (dont 3 fonctions de trigger, non utilisables comme RPC). Les seules entrées publiques anonymes utiles restent les drapeaux et les contextes bornés ; les anciens previews restent appelables mais neutres hors approbation. `update_profile(jsonb)` utilise le défaut du même `update_profile(jsonb,bigint)`, ce n'est pas une seconde surcharge. Les deux formes sont testées.

Les corps natifs sont copiés dans `dobby_access_legacy`, sans USAGE/EXECUTE navigateur. Les wrappers gardent leurs OID, propriétaires, ACL, valeurs par défaut et dépendances RLS. Le préflight compare les empreintes du corps **et de la définition entière** ainsi que le propriétaire. Toute dérive demande une revue explicite. Les tests comparent les copies aux corps d'origine et vérifient qu'aucune policy native n'a disparu.

## Verrous, sessions et privilèges

Ordre ajouté : autorisation → verrous de compte/appartenance/foyer → lignes et reçus métier. Les écritures SQL directes passent par un trigger **BEFORE STATEMENT**, avant les verrous de lignes de l'exécuteur. Une policy ou un trigger de ligne seuls ne suffisent pas à garantir cet ordre. La création prend d'emblée le verrou exclusif d'autorisation, avant tout verrou métier, pour éviter une promotion SHARE→UPDATE concurrente lors de la consommation du droit.

Deux connexions réelles testent RPC et UPDATE direct dans les deux ordres, avec observation de `pg_stat_activity.wait_event_type='Lock'`. Si l'écriture détient déjà l'autorisation, sa transaction peut terminer avant la confirmation de suspension. Si la suspension détient le verrou, l'écriture attend puis échoue sans effet. Les requêtes de lecture déjà en cours restent soumises à leur instantané MVCC ; aucune annulation rétroactive d'une réponse en vol n'est revendiquée.

Après réactivation en deux transactions selon le Lot 1, les anciennes sessions restent refusées ; une nouvelle session fictive passe avant une nouvelle suspension. Les claims SQL simulés servent uniquement aux tests de base de données, jamais de preuve de validation cryptographique d'un JWT ou d'une requête HTTP.

Aucun rôle nouveau, BYPASSRLS, accès général à Auth, clé navigateur ou attribut privilégié n'est ajouté. Les writers existants reçoivent seulement USAGE du schéma d'autorisation et EXECUTE sur ses gardes. La consommation du droit de création appartient au writer de métadonnées du Lot 1. La maintenance suppose un ADMIN **déjà existant et fermé** sur les quatre writers : la migration vérifie cette capacité, ouvre INHERIT/SET dans sa transaction puis les referme. Le harnais modélise cette capacité ; elle n'est pas prouvée sur l'hébergement. Le BYPASSRLS préexistant du seul installateur fictif provient du harnais Lot 1, pas de cette migration.

Les droits Auth étroits du lecteur de sessions restent ceux du Lot 1. Ils sont accordés uniquement par le propriétaire Auth fictif du test ; aucune instruction de cette migration ne les crée sur un schéma géré. Toute future activation hébergée reste bloquée sans preuve de cette capacité et du catalogue exact.

## Résultats exécutés et écarts

**23/23 contrôles Lot 2A, 28/28 tests PostgreSQL Lot 1, 444/444 tests natifs ciblés passent.** Le diagnostic 42883 confirme une dépendance absente ; il ne constitue pas un succès des fonctionnalités Missions non vérifiées. Les [journaux](preuves/) contiennent les commandes de référence et leurs résultats réels. Les 28 tests PostgreSQL du Lot 1 ont été rejoués dans leur harnais livré, séparément des tests d'intégration Lot 2A. Les 444 tests natifs ciblés ont été rejoués. Les 83 tests cités par l'ancien audit ne sont pas présentés comme une exécution de cette mission.

| Scénario | Résultat local exécuté | Écart restant |
| --- | --- | --- |
| T01 | PASS SQL : deux foyers actifs, propriétaire sans lecture supplémentaire, lectures et mutations croisées, 6 modules, courses, parent/enfant et identités protégées. | HTTP, fichiers et nouvelles écritures Missions complètes EN ATTENTE. |
| T02 | PASS SQL : anciennes identités Auth non admises, zéro ligne métier, refus des RPC avant leur corps et des mutations directes. | Fermeture signup/Auth et parcours d'admission EN ATTENTE, hors lot. |
| T05 | PASS SQL : session ancienne refusée après suspension, reçu V3 non relu, réactivation en deux phases et session neuve vérifiées. | Véritables JWT, UI et Storage EN ATTENTE. |
| T06 | PASS sur les signatures reproduites : appels directs suspendus/non approuvés, arités par défaut, alias fermé, copies privées, reçus V3 et invitations ; surcharge inconnue rejetée. | Fonctions privées Missions listées au catalogue absentes : capacités V2 et mutations V2/V3 autorisées complètes NON VÉRIFIÉES. |
| T07 | PASS : deux connexions, RPC et UPDATE direct, attentes de verrous observées, aucun effet après suspension confirmée. | PATCH REST concurrent via passerelle HTTP EN ATTENTE. |
| T08 | PASS : V1 figée même pour un compte actif, lectures de membre suspendu fermées, lignes préservées ; aucune admission dérivée de V1. | Vérification du catalogue hébergé EN ATTENTE. |

Contre-tests avant correction : lecture du foyer par Auth non approuvé = 1 ligne ; contexte d'un suspendu = `active` ; relecture du reçu V3 d'un suspendu = true ; V1 non approuvé = 1 membre et 1 article. Ils montrent les accès antérieurs dans le modèle local, pas des requêtes réalisées en production. La première exécution des attentes de fermeture a échoué avant ajout de la migration ; son journal RED est conservé séparément du résultat final.

## Reprise, rollback et validations distinctes

Voir [REPRISE.md](REPRISE.md). Un échec de préflight annule toute la transaction. Le rollback local a été exécuté et la migration réappliquée ; corps, OID, ACL effectives, policies et données vérifiées reviennent à l'état initial. L'ordre textuel des entrées ACL peut changer, leurs privilèges effectifs sont comparés après normalisation. Les décisions du Lot 1 et toutes les données métier sont conservées.

Validation distincte requise avant : lecture d'un delta de catalogue hébergé privé ; obtention des définitions Missions absentes ; preuve des droits étroits de sessions et ADMIN de maintenance ; toute migration/rollback distante ou activation d'accès ; modification Auth/SMTP ; déploiement d'Edge Functions/client ; fermeture des inscriptions ; intégration/merge. Le rollback rouvre les API natives : prévoir une interruption d'accès avant toute utilisation hébergée. Rien de cela n'a été exécuté ici.

## Lot 2B préparé, non exécuté

Reconstituer le catalogue et les policies du bucket familial sans toucher aux autres buckets ; tester avec de vrais fichiers **fictifs** via Storage local, pas seulement `storage.objects`. Couvrir téléchargement, liste, upload/upsert, copie, déplacement, suppression, URL signée et token d'upload avant/après suspension/réactivation. Préparer la passerelle bornée `dobby-family-files`, contrôle familial sous JWT utilisateur et absence de lien signé ; ne donner aucun accès aux contenus à l'administration propriétaire. Inventorier les anciens liens et caches avant de décider leur extinction/purge. T09 reste intégralement EN ATTENTE. Aucun fichier, bucket, policy Storage ou Edge Function n'a été modifié.
