# Alternative au privilège ADMIN V7 — BLOQUÉ

19 novembre 2026 · PR #34 · Base `44bfeac06c4d64acfda6e8ac233150fe02bd1df0`.

**Verdict : BLOQUÉ pour le candidat testé.** Le passage par le contexte partagé permet les écritures et le replay sans modifier les fonctions ou les droits V7 dans la fixture propre, mais casse les prévisualisations d’invitation en lecture seule. Aucune variante activable ne remplace le préflight strict. Aucune demande de nouvelle délégation ADMIN V7 n’est effectuée.

[Dépendances](V7-DEPENDANCES.json) · [Résultats et SHA](V7-RESULTATS.json) · [Confidentialité](V7-CONFIDENTIALITE.json) · [Sources expérimentales](../../../../supabase/compatibility/lot5b/build-v7-preserved.mjs).

## Conservation et couverture étudiées

Les deux RPC restent intégralement natives : `dobby_v7_update_profile(jsonb,bigint)` et `dobby_v7_create_household(text,uuid)`. Le prototype les exclut du wrapping et des backups à restaurer. Tous les grants/revokes V7 du paquet Lot 2A sont retirés. Les tests photographient **toutes** les fonctions possédées par V7, leurs OID/définitions/owners/ACL, les attributs et memberships du rôle et ses ACL de schémas/tables/colonnes/fonctions : aucun changement dans la fixture propre.

Le graphe natif publié résolu comprend **16 fonctions** : identité issue des claims, verrou advisory du compte, validation/patch de profil, contexte canonique SOCLE, lecture/reçu d’opération, création du membre et du lien. Les appels statiques, sources et empreintes locales sont consignés sans corps SQL dans V7-DEPENDANCES.json. Les branches RLS/triggers sont examinées séparément ; cela ne certifie pas leurs définitions hébergées.

| Table détenue par postgres dans la fixture | Accès du parcours V7 / protection expérimentale |
| --- | --- |
| `pending_profiles` | INSERT/UPSERT, SELECT FOR UPDATE, DELETE ; profil avant foyer. |
| `account_links` | INSERT du lien canonique ; lecture du contexte sous SOCLE. |
| `operations` | SELECT du reçu **avant** l’appel explicite au contexte, puis INSERT du reçu ; critique pour le replay. |
| `dobby_v2_households` | INSERT ; contrôle du quota avant écriture, consommation après insertion. |
| `dobby_v2_memberships` | INSERT owner, SELECT FOR SHARE ; règles familiales existantes conservées. |
| `dobby_v2_modules` | SELECT FOR UPDATE, INSERT/UPDATE `family` ; CAS, stamp de révision et identité conservés. |

Les six policies sont `AS RESTRICTIVE FOR ALL TO dobby_v7_writer`, avec USING **et** WITH CHECK. Elles ne remplacent aucune policy native. Elles appellent le contexte public déjà exécutable par V7 : aucune nouvelle permission V7 n’est accordée. Le rôle SOCLE ne doit pas hériter de V7, pour éviter une récursion. Le préflight expérimental refuse aussi les chemins `SET* → INHERIT*` vers V7 sans supposer de fermeture de memberships.

Les contraintes FK/uniques restent natives. Le contexte lit aussi `install_state` sous SOCLE. La garde de famille reconnaît le writer V7 ; la garde Missions publiée retourne immédiatement pour `family`, sans les douze validateurs privés. Ces douze corps ne sont ni inventés ni exécutés par cette recette ; leur absence de la fixture continue de bloquer le paquet complet non amputé.

## Pourquoi des policies seules ne suffisent pas

Une policy ne consomme pas le quota du registre à la place du code natif. Le replay peut aussi retourner un reçu sans DML. Le prototype ajoute donc des triggers de tables PostgreSQL détenues par l’installateur, conditionnés par `WHEN(current_user='dobby_v7_writer')`, puis des fonctions de trigger SECURITY DEFINER détenues par le writer d’administration existant. Leur EXECUTE n’est pas accordé à V7 ; PostgreSQL exécute les triggers attachés. Les autres rôles n’exécutent pas ces nouveaux triggers.

Le verrou d’autorisation est pris avant les mutations ; la création prend UPDATE NOWAIT puis consomme le quota atomiquement après INSERT. Les conflits deviennent `40001`, car le RPC natif a déjà pris son advisory de compte : attendre le registre pourrait inverser l’ordre des autres wrappers. Une seconde garde dans le contexte partagé prend SHARE NOWAIT pour couvrir le SELECT du replay. La session réelle de la fixture et la borne de réactivation restent vérifiées par les gardes existantes, sans faire confiance à un statut contenu dans les claims.

## Chemin non couvert : les lectures existantes

Les deux prévisualisations restent STABLE. Leur wrapper Lot 2A appelle `public.dobby_v7_context()`. Le prototype a dû rendre ce contexte VOLATILE pour prendre honnêtement un verrou. En transaction READ ONLY, le chemin est :

```text
preview_invitation / preview_child_invitation (STABLE)
  → public.dobby_v7_context()
    → assert_active_nowait()
      → SELECT authorizations FOR SHARE NOWAIT
        → SQLSTATE 25006
```

**Erreur observée sur PostgreSQL 17.7**, pour les deux RPC, avec un compte fictif approuvé. Ce n’est pas un résultat HTTP simulé : les tests utilisent de vraies transactions PostgreSQL READ ONLY. La documentation [PostgREST — Access Mode on Functions](https://docs.postgrest.org/en/v13/references/transactions.html#access-mode-on-functions) indique qu’un appel POST à une fonction STABLE est READ ONLY ; GET/HEAD restent aussi READ ONLY. Le contexte public lui-même ne conserve donc pas son contrat GET. Aucun serveur PostgREST/HTTP n’a été lancé ici.

Marquer toutes les lectures VOLATILE ou contourner le mode READ ONLY changerait les contrats existants. Aucune de ces voies n’est retenue. Le verdict porte sur ce mécanisme et ces contraintes ; d’autres architectures restent à concevoir et valider.

## Preuves et retour arrière

Les tests diagnostiques couvrent : écriture autorisée, profil provisoire puis foyer, quota unique/replay, refus non approuvé/suspendu avec anciens claims, disparition de session/borne de réactivation, CAS/Parent-Enfant/autre foyer, verrou SHARE sur replay, conflit quota `40001`, droits V7 inchangés, autres ADMIN toujours requis, chemin mixte refusé, et la régression READ ONLY. Un passage diagnostique vert **confirme le blocage**, sans valider une alternative fonctionnelle complète.

Résultat local : **14/14 contrôles diagnostiques**, zéro omission. La [CI ciblée](https://github.com/PortenartCo/dobby-demo/actions/runs/44558697430) du code `e36254f4d3f472c00fa8ead649ebcf4208acf5a6` observe **61/61** : les 14 nouveaux contrôles et les 47 du workflow existant, avec fraîcheur des artefacts vérifiée. La campagne UI déclenchée automatiquement sur la PR est annulée ; aucun PASS UI revendiqué. Le commit documentaire final porte `[skip ci]`, sans nouvelle CI revendiquée ; les sept fichiers code/test/workflow sont identiques à ce code testé.

Le candidat et son fragment autonome portent un **RAISE `0A000` inconditionnel juste après BEGIN**, avant toute DDL. Cela avorte la transaction même si le client poursuit après erreur. Aucun flag CLI ne le désactive. Les tests retirent exclusivement en mémoire ce bloc et la garde des douze empreintes Missions pour examiner le prototype ; les artefacts publiés restent bloqués.

Le rollback expérimental est une **quarantaine partielle** : les six policies deviennent false avant retrait des triggers. Données et fonctions/droits V7 sont conservés ; les anciens RPC V7 restent fermés. La lecture tabulaire des memberships par authenticated reste limitée à sa propre ligne. Une policy altérée fait refuser la quarantaine. Le contexte/helper verrouillants sont conservés : **la régression READ ONLY subsiste**. Ce fichier n’est pas un retour à un état fonctionnel compatible.

La préservation des droits face à des DEFAULT PRIVILEGES inattendus n’est pas prouvée ; une future version activable devra refuser ces ACL ou vérifier l’invariant global avant/après. La fixture réutilise l’installateur fictif BYPASSRLS de l’ancien harnais, sans aucune modification de rôle dans le candidat ; cela ne prouve pas Auth hébergé.

## Correction architecturale minimale proposée

Créer une garde dans un **nouveau schéma privé dédié**, puis accorder à V7 uniquement USAGE de ce schéma et EXECUTE de cette garde. Les policies pourraient alors verrouiller/vérifier directement l’autorisation et la session, y compris le replay, sans détour par le contexte public. Le contexte et les prévisualisations resteraient STABLE ; les triggers de quota resteraient ciblés sur V7.

Cette piste ne demande **aucun ADMIN, SET, membership, BYPASSRLS, accès direct Auth ou modification des fonctions V7 existantes**. Elle demande toutefois un nouveau privilège d’appel au writer : c’est une exception explicite à la contrainte actuelle « sans […] modification de privilèges du writer ». Elle est donc **proposée uniquement**, sans GRANT ni garde de ce type créés dans cette mission. Avant toute variante activable : validation de cette exception limitée, nouvelle recette et revue, invariant des ACL/defaults, puis preuves hébergées Auth/Storage, sauvegarde/restauration et capacités signées selon les réserves existantes.

**Aucun appel Supabase distant, aucune écriture hébergée, modification de compte réel, migration historique, déploiement, fusion ou ouverture des gates enfants.** Les fixtures sont locales et fictives ; les claims SQL ne constituent pas un nouveau test cryptographique JWT/HTTP.
