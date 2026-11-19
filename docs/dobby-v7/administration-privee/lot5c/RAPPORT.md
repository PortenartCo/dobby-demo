# Lot 5C — NO-GO : assemblage arrêté sur un nouveau chemin 25006

> **Reprise et Missions.** Le [rapport de validation de la reprise](VALIDATION-REPRISE.md) consigne les exercices de restauration locale, les métadonnées hébergées communiquées et les conditions restantes.

> **Mise à jour locale du 19 novembre :** le [correctif ciblé des lectures](CORRECTION-LECTURES.md) résout ce chemin, avec 14/14 contrôles réussis dont les neuf initiaux. Le corps ci-dessous conserve le diagnostic au SHA `69c69c7`. La mise en service reste NO-GO pour les validations Missions, restauration et hébergement ; les scripts restent neutralisés.

19 novembre 2026 · PR #34 en brouillon · base `afb09873b39e533d433c72a436ab3cbcfc043bbc`.

**NO-GO pour la mise en service et pour la validation fonctionnelle du paquet.** L’assemblage révèle un défaut Lot 3 distinct du contexte V7 corrigé : les invitations nominatives valides prennent un verrou de demandeur dans leur chemin STABLE. Les deux prévisualisations échouent réellement en READ ONLY avec `SQLSTATE 25006`. Les mêmes invitations renvoient `valid` en lecture-écriture. Conformément à la consigne d’arrêt sur blocage nouveau démontré, aucun correctif métier exploratoire n’est ajouté.

[Procédure et ordre](PROCEDURE.md) · [Restauration et rollback](RESTAURATION.md) · [Recette future](RECETTE.md) · [Décisions Storage/sessions](DECISIONS.md) · [Résultats et SHA](RESULTATS.json) · [Revue](REVUE.md) · [Confidentialité](CONFIDENTIALITE.json) · [Scripts et manifeste](../../../../supabase/integration/lot5c/README.md).

## Blocage nouveau, preuve précise

```text
public.dobby_v7_preview_invitation / preview_child_invitation (STABLE)
 → copie native Lot 2A
 → dobby_socle_private.preview_invitation (Lot 3, STABLE)
 → dobby_access_private.assert_invitation_admission
 → dobby_access_private.assert_requester(uuid,bigint)
 → SELECT authorizations ... FOR SHARE
 → 25006 en transaction READ ONLY
```

Sources historiques : [appel de la garde d’admission](../../../../supabase/migrations/20261118120207_dobby_private_access_administration.sql#L340), [appel de la garde du demandeur](../../../../supabase/migrations/20261118120207_dobby_private_access_administration.sql#L316), [verrou du demandeur](../../../../supabase/migrations/20261118120207_dobby_private_access_administration.sql#L149). Elles sont inchangées. `public.dobby_v7_context()` demeure STABLE et la garde directe RLS V7 reste identique au SHA de base. Les erreurs ne passent pas par `dobby_access_v7_gate.check_access()`.

La recette positive utilise deux invitations fictives liées à une admission, au bon utilisateur confirmé, avec demandeur actif. Les gates de livraison enfant sont ouvertes **uniquement dans la base fictive jetable** pour atteindre cette branche ; aucun gate réel ou code de déploiement n’est modifié. Les invitations invalides quittent la garde plus tôt et ne démontrent pas le bon fonctionnement du chemin valide.

La correction minimale à examiner consiste à garder la validation de lecture de l’admission/demandeur sans verrou, tout en conservant les verrous et les contrôles de génération/session sur les mutations et acceptations. Elle doit préserver le binding nominatif, le statut courant, l’époque d’approbation, les gates et les confirmations. Aucun changement de volatilité des RPC publiques, aucun ADMIN V7, aucun nouveau droit V7 ou autre architecture n’est proposé. **Cette correction n’est pas implémentée ici.**

## Effectivement vérifié localement

- Assemblage partiel disponible : fondation → bootstrap fictif A/B → catalogue/garde directe V7 → administration sans grant de maintenance V7 → bridge Auth → raccordement des trois lecteurs/deux activateurs → Storage avec l’empreinte du lecteur raccordé. Installation transactionnelle, quatre indicateurs fermés à la fin.
- Fonctions détenues par V7 inchangées ; aucun membership postgres→V7 utilisable ; readers sans USAGE/SELECT Auth direct ; deux droits V7 sur la garde conservés sans délégation.
- Activation expérimentale refusée si session absente, visibilité RLS inexistante ou identité inaccessible ; aucun flag partiellement ouvert. Canari positif fictif accepté. Profil autorisé et contexte/lectures invalides READ ONLY fonctionnent.
- Le préflight intégral refuse les douze dépendances privées Missions absentes. Aucun stub et aucune option de contournement livrée.
- Les quatre scripts écrivants livrés contiennent **uniquement la sentinelle `0A000`, sans SQL mutable après l’erreur**, même si le client récupère celle-ci par savepoint. Aucun flag CLI/environnement de déblocage. La source d’assemblage conservée pour revue n’est pas une entrée d’installation distribuée.

Le test fonctionnel des invitations valides reste **en échec**, avec ses deux traces SQL. Il n’est pas renommé en PASS diagnostique. Les résultats exacts et erreurs intermédiaires sont dans RESULTATS.json et `preuves/`. Aucun HTTP d’intégration final, test Missions intégral, rollback fonctionnel complet ou restauration validée n’est revendiqué.

Au code `5dc57f270476955097806c7818e1ef3f5fc9db68` : **9 tests locaux, 8 réussis, 1 échec fonctionnel**, zéro omission. La [CI d’intégration](https://github.com/PortenartCo/dobby-demo/actions/runs/44604077585) confirme **8/9 et reste rouge** sur le même défaut. La [CI de compatibilité existante](https://github.com/PortenartCo/dobby-demo/actions/runs/44604077732) passe **70/70**, sans omission, avec les deux générateurs Lot 5B et la garde V7 préservés. Les trois contrôles de fraîcheur des générateurs passent. La campagne UI automatique a fait l’objet d’une demande d’annulation ; aucun PASS UI n’est revendiqué. Le commit final documentaire conserve les quatorze fichiers code/test/workflow identiques à ce SHA, sans nouvelle CI revendiquée.

## Faits hébergés reçus et contrôles futurs

L’utilisateur confirme le seul projet `pqcdkrwljgvgagzwrcmg`, PostgreSQL 17.11, les six relations postgres/RLS, les contrats V7 et l’absence d’administration installée ; il confirme l’identification des 27 fonctions, des 12 Missions et la réconciliation des 21 écarts. Ces faits sont repris avec cette provenance, sans nouvelle lecture CODEX.

Restent à vérifier lors d’une phase hébergée autorisée : préflight au SHA exact, visibilité positive Auth sous RLS, rôles/grantors restants, autorité réelle Storage/locks/TEMP, configuration Data API/Edge/Auth/SMTP, capacités signées et caches, sauvegarde physique/octets Storage/restauration, manifeste A/B et recette complète. Le préflight SQL ne prouve pas à lui seul l’identité du projet ni les configurations de services. La fixture locale utilise PostgreSQL 17.7 et l’hypothèse historique BYPASSRLS de l’installateur ; aucun privilège hébergé n’en est déduit.

## Verdict et arrêt

**Paquet unique figé pour examen, non activable et non prêt à migrer.** La procédure, les contrôles et la recette sont préparés, mais leur validation finale s’arrête sur le défaut fonctionnel ci-dessus. Les fermetures/restaurations sont des plans à éprouver après correction, pas des garanties acquises.

Prochaine condition technique : correction bornée du chemin de lecture Lot 3 puis réussite des deux prévisualisations valides/invalides en READ ONLY et HTTP STABLE, contrôles d’acceptation/concurrence et restauration coordonnée. La revue réserve aussi à cette future version la validation exhaustive de l’entrée avant la première DDL et le rattachement explicite du journal au package_id attendu ; aucun postflight actuel ne vaut attestation du paquet au SHA. La future bascule exige ensuite les GO humains détaillés dans PROCEDURE.md. Aucune demande de support ou de privilège ADMIN V7.

**Aucun appel projet Supabase, migration distante, déploiement, fusion, e-mail, compte réel Parent A/B ou gate réel modifié.** Les preuves historiques Lots 1–5B restent conservées ; leurs PASS ne sont pas transférés à cet assemblage.
