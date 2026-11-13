# F09 — Droits serveur Parent / Enfant : réserve technique ciblée

Périmètre repris depuis `origin/main` **b77cb9d**. La recette réelle finale du compte B est consignée et le chantier Stitch est clos. Ce travail n'a effectué **aucune lecture ni écriture distante**, aucun appel API/CLI de production, aucune connexion à Supabase. Aucun ancien installateur `01`, rattachement `04`, reset `06` ou correctif `11` n'a été rejoué. Aucun gate n'est activé.

**Conclusion : F09 complet reste en attente de vérification serveur et de développements ciblés.** Les sources permettent de corriger une vraie faiblesse du vérificateur du candidat restrictif et de tester ses limites. Elles ne permettent pas de certifier les guards privés Missions absents, ni d'inventer leur remplacement.

## Éléments établis par les sources

| Sujet | Preuve disponible | Conséquence exacte |
|---|---|---|
| Filtrage des écritures directes | `revue-generale/supabase/roles-01-apply.sql` crée neuf policies restrictives, toutes `TO authenticated`, sur modules, courses V2 et objets du bucket DOBBY | Elles ajoutent une condition aux écritures SQL sous ce rôle. Les policies permissives initiales restent nécessaires ; le candidat n'accorde aucun nouveau droit. |
| Faux positif de vérification | L'ancienne version de `roles-02-verify.sql` vérifiait seulement neuf noms restrictifs et le refus anon | Une policy nommée correctement mais `UPDATE USING(true) WITH CHECK(true)` passait. Ce cas a été reproduit avant correction. La vérification compare maintenant commande/table/rôle/expressions exactes, helper et prérequis. |
| Writers privilégiés | Le catalogue historique décrit `public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)` en SECURITY DEFINER sous `dobby_missions_v2_writer`, avec ses propres policies. Le corps public contrôle une appartenance active, puis appelle des helpers privés | Les policies `TO authenticated` ne suffisent pas à couvrir ce chemin. SECURITY DEFINER exécute sous son propriétaire ; **NOBYPASSRLS n'impose pas les policies d'un autre rôle**. Il faut lire les guards effectifs avant de conclure à une permission ou à une faille réelle. |
| Source privée Missions absente | `stitch19-20/supabase/tests/catalog-fixture.sql` annonce explicitement un stub de `guard_missions`. Les corps réels de `assert_payload`, `assert_ledger` et dépendances ne sont pas fournis | Impossible de certifier le filtrage parent/enfant ou de produire une migration complète compatible. Aucun stub nouveau n'est posé ; le test d'un writer fictif montre seulement la limite du candidat. |
| Gestion d'un autre parent | `stitch19-20/supabase/01-apply.sql`, `dobby_v7_update_member`, refuse une cible différente du profil canonique de l'acteur sauf dépendant `baby/child/pet` **non lié**. `assert_snapshot` protège aussi les profils liés et les autres adultes | La gestion complète des données du foyer par un parent n'est pas encore fournie pour un autre parent lié ou un enfant déjà lié. C'est un refus explicite connu du contrat source, pas une invitation à retirer la garde. |
| Exception enfant : magie personnelle | `dobby_v7_context` distingue la catégorie du profil canonique ; `dobby_v7_update_magic` exige `canMagic`, cible son propre profil ou un dépendant explicitement autorisé, verrouille et contrôle la révision | Un contrat ciblé existe pour sa propre Maison / son propre Patronus. Le comportement des définitions réellement installées doit être rapproché du diagnostic, sans changer le statut de la recette B déjà terminée. |
| Exception enfant : mission autorisée | Le contrat `missions-00-contract.md` décrit la complétion contrôlée avec participants et total unique ; l'application conserve le gate V3 fermé | Le candidat de policies ne fournit pas cette RPC. Un enfant ne doit pas être autorisé à écrire un snapshot Missions pour obtenir cette exception. |
| Ancien endpoint Courses | Le catalogue historique expose aussi `dobby_sync_grocery_items`, avec des règles historiques d'appartenance ; les neuf policies du candidat ne le ciblent pas | Cet endpoint et ses déclencheurs/ACL doivent être inclus dans l'examen du diagnostic. Il ne faut pas confondre protection des Courses V2 et fermeture de tous les anciens chemins. |
| Storage | Le SQL source `sql-proposals/dobby-family-files.sql` sélectionne le bucket privé et un préfixe foyer lié à une appartenance active ; le candidat ajoute une restriction parent pour ses écritures directes | Les chemins racine/autre foyer/déplacement sont testés localement. Cela ne valide ni le service Storage réel, ni sa configuration de bucket, ni les liens signés ou les RPC techniques. |

Les clauses citées décrivent les **sources du dépôt**. Aucun résultat de catalogue de production n'a été déduit d'une fixture, d'une CI verte ou de la recette fonctionnelle du compte B.

## Correctifs autonomes livrés

Le candidat reste partiel et non appliqué :

- Prérequis transactionnels : RLS activée, type foyer UUID connu, rôle client non privilégié et sans appartenance au propriétaire des tables/writer de contexte, contexte sous propriétaire technique fermé et exécutable par le bon rôle. Un objet déjà présent n'est pas remplacé silencieusement.
- Condition parent renforcée : protocole/phase/foyer, cohérence `memberId` ↔ `profile.id`, catégorie canonique parent et `permissions.canEdit=true`. Le helper est INVOKER, `search_path=''`, PUBLIC/anon exclus.
- Vérificateur exact : une policy restrictive mal nommée, sur la mauvaise cible/commande/rôle, avec une expression affaiblie, ou un helper altéré, privilégié ou exposé ne passe plus par simple comptage. Les espaces à l'intérieur des littéraux sont conservés : les mutants `dobby- family-files` dans USING/WITH CHECK et `per missions` dans le helper sont rejetés. Le résultat indique toujours `scope=direct-authenticated-only`, `completeF09=false` et les domaines non vérifiés.
- Ancien `roles-00-preflight.sql` retiré : il redirige vers l'unique diagnostic regroupé sans lancer une seconde collecte.
- Test PG17.7 reconstruit : conteneur unique éphémère, image locale stock, réseau `none`, aucun port, aucun paramètre d'URL distante, liaisons canoniques fictives protégées et nettoyage final. Il ne réutilise pas le cluster de tests d'un autre lot.

Le rollback retire seulement ces neuf policies et leur helper. Il conserve les données, mais **réouvre les droits directs antérieurs** ; il ne doit pas être présenté comme une correction ni servir à activer les parcours enfant.

## Ce qui dépend du diagnostic unique

Prochaine collecte éventuelle, ultérieurement et manuellement : [serveur/00-diagnostic-regroupe.sql](serveur/00-diagnostic-regroupe.sql), selon [son README](serveur/README.md). Aucune autre collecte `roles-00` ni requête métier n'est nécessaire.

Les métadonnées utiles sont les corps et dépendances des RPC/guards, owners/SECURITY DEFINER/search_path/ACL effectives, appartenances des rôles writers, grants/RLS/policies et triggers des tables/modules/anciens endpoints/Storage. Une définition inaccessible doit rester « inconnue », sans la remplacer par un stub. Les propriétés du bucket sont des lignes applicatives exclues du diagnostic initial de catalogue ; leur éventuelle vérification restera une action distincte précisément justifiée.

Ce retour permettra de déterminer si le writer Missions privé bloque déjà les enfants, si un chemin privilégié reste ouvert et quel delta exact préparer. Avant cela, il n'existe pas de fondement suffisant pour un installateur F09 global. **Ne pas exécuter le candidat `roles-01` comme prochaine étape automatique.**

## Évolutions serveur à préparer après cet examen

1. **Parent et autres profils du même foyer.** Un delta ciblé doit autoriser les champs ordinaires autorisés sur les profils du foyer, y compris déjà liés, avec acteur parent canonique, appartenance active, verrouillage, CAS et reçu idempotent. Il doit conserver les identifiants, liens Auth, historique, magie, missions et Runes. Ni réaffectation de compte/foyer, ni promotion/déclassement parent, ni suppression de parent ne doivent devenir un effet d'un simple PATCH de fiche. Ne pas desserrer globalement `assert_snapshot` pour contourner le refus actuel.
2. **Complétion enfant.** Une RPC étroite doit recevoir l'occurrence, les participants et l'opération/révision, vérifier l'attribution de l'enfant et recalculer le total/répartition côté serveur. Pas de barème, crédit arbitraire, réattribution, réouverture ou mutation annexe envoyée par l'enfant. L'ancien writer et les écritures directes ne doivent pas contourner cette exception. Le lot Missions conserve son contrat et son gate fermé.
3. **Écritures privilégiées et Storage.** Rapprocher chaque writer effectif et ses policies, sans généraliser « SECURITY DEFINER ignore toute RLS ». Préparer seulement les restrictions dont le rôle et les dépendances réels sont connus. Ne pas toucher à d'autres buckets, aux fichiers existants ou aux rôles de service pour forcer un test.

L'installation d'un delta futur et la recette réelle Parent / Enfant / autre foyer restent manuelles et distinctes de ces tests locaux. Aucun accès ou résultat n'est demandé pendant cette mission.

## Preuves et reproduction

```sh
python3 docs/dobby-v7/revue-generale/supabase/tests/run-role-guard-local.py
```

Le test refuse de tirer une image depuis le réseau et n'accepte aucune URL distante. Sortie : `/workspace/dobby-roles-evidence/results.json` par défaut, déplaçable via `DOBBY_ROLE_EVIDENCE_DIR`. Le JSON conserve la version/image, `network=none`, `fictionalOnly=true`, `liveBackendVerified=false`, `completeF09=false` et les cas exécutés.

Résultat local final : **PASS, 13 groupes de contrôles**, PostgreSQL 17.7 stock ; la [preuve JSON et ses empreintes de sources](evidence/f09-local-pg17.7.json) est jointe.

Cas : enfant/animal/acteur absent ou révoqué/parent sans droit ; INSERT/UPDATE/DELETE des trois cibles ; `user_metadata` sans autorité ; parent limité au foyer ; Storage sans dossier ou déplacé hors foyer ; policies/ACL/helper/client altérés refusés par le vérificateur ; prérequis RLS/propriétaire refusés sans pose partielle ; rollback sans perte de lignes. Un writer SECURITY DEFINER fictif volontairement non protégé réussit aussi son écriture sous un rôle distinct : **limite reproduite**, pas certification ni accusation de la base réelle.

Statut de F09 : **PARTIEL / ATTENTE_UTILISATEUR pour les inconnues serveur**, sans réouverture du chantier Stitch ni activation de droits non vérifiés.
