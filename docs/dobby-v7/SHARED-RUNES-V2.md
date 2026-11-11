# Synchronisation familiale des runes V2 — livraison préparée

> Suivi du 11 novembre 2026 : l’utilisateur indique que la migration initiale a depuis été installée. Le refus `42501` du writer sans accès `auth` fait l’objet d’un [correctif ciblé distinct](SHARED-RUNES-V2-AUTH-42501.md), testé exclusivement en PostgreSQL local. Les résultats et procédures ci-dessous décrivent la livraison initiale ; le correctif installé ne doit pas réexécuter cette migration.

Branche indépendante `feat/dobby-shared-runes-v2-20261111`, issue exactement de `9a3e5dbc1c856ce417e344f2b5aca6e0d9c0040a`. [Demande](SHARED-RUNES-V2-SPEC.md), [plan](../superpowers/plans/2026-11-11-shared-runes-v2.md), [contrat et privilèges détaillés](SHARED-RUNES-V2-CONTRACT.md).

Cette livraison prépare le partage transactionnel des runes. Elle ne migre aucune base distante, ne modifie aucun compte familial et ne publie aucun nouvel aperçu. Les branches E03–E06 et E07.4 restent hors périmètre.

## Changement et compatibilité

Le registre unique demeure `dobby_v2_modules.payload.runeCredits`, avec la file native `runeRequests`. Les calculs, douze grades, identités et cycles de `family-runes-core.mjs` et les règles natives de récurrence restent inchangés. Aucun serveur applicatif, stockage de soldes, dépendance de production ou infrastructure supplémentaire.

Le [SQL proposé](../../sql-proposals/dobby-shared-runes-v2.sql) ajoute un writer transactionnel : authentification et appartenance active en base, verrou du foyer, CAS, événements immuables, validation de leur graphe et reçu d’opération atomique. Les reçus privés contiennent uniquement les métadonnées d’idempotence. Un ancien PATCH/INSERT/upsert/DELETE/MERGE visant Missions est refusé au niveau table ; les autres modules gardent leurs permissions et leurs writers.

Le client vérifie réellement le RPC de capacité dans le contexte connecté courant. Il enregistre l’UUID, la révision et le snapshot avant tout POST, conserve les demandes tant qu’elles ne sont pas confirmées, et rejoue le même appel après une réponse perdue. Le serveur retourne le module courant lors d’un ancien rejeu : une réouverture faite depuis l’autre appareil ne disparaît pas. Les modifications sur des missions distinctes sont réconciliées ; des modifications contradictoires sur la même mission exigent un choix explicite. Les différences créées pendant l’appel sont conservées.

Les écritures partagées V2 ne sont débloquées qu’après la capacité authentifiée. Un serveur absent, un changement de compte, une régression de version ou un historique contradictoire maintient les protections et `runeSyncRequired`. Les codes SQL contractuels sont distingués des résultats réseau inconnus ; `40001` peut être transporté en HTTP500 par PostgREST et reste un refus CAS, tandis que `40003` et les erreurs de connexion gardent l’opération exacte en attente.

Les crédits V1, y compris `revision: 0`, sont préservés par provenance et sans normalisation destructive des dates. La création d’un module absent permet une adoption initiale explicite de l’historique local validé. Une ligne distante existante n’est jamais remplacée par un cache local vide ou un autre historique confirmé.

## Limites et refus conservatoires

- La modification d’un montant ou bénéficiaire après confirmation conserve l’ancien gain ; sa réouverture annule exactement ce gain et la nouvelle complétion utilise les nouveaux paramètres.
- Un nouveau gain en attente doit encore correspondre aux paramètres actuels de la mission. Le client bloque donc leur modification avant synchronisation, avec conservation du formulaire. La suppression est également bloquée pour toute demande non confirmée, gain ou annulation. Une ancienne file composée incompatible est refusée sans effacement et demande une résolution explicite.
- Une suppression ordinaire après confirmation conserve les crédits natifs. Les racines et anciennes occurrences récurrentes restent historiques et ne sont pas effacées.
- Le serveur valide les identités de récurrence et l’immutabilité des règles passées. Une nouvelle occurrence exige sa racine ; il ne duplique pas le générateur de calendrier ni sa fenêtre locale de projection. Une occurrence légitime synchronisée longtemps après sa création reste possible.
- Le serveur vérifie la concordance du bénéficiaire avec la mission, pas l’existence du profil local dans `familyMembers`. Si ce profil a disparu, le client demande de réassigner ou désassigner avant la complétion partagée. Un UUID de compte authentifié et une identité de profil familial restent distincts.
- Le JSONB est conservé sous sa limite existante de **262144 octets**. Entrée et résultat confirmé sont contrôlés. Au dépassement, le serveur refuse intégralement et le client conserve l’outbox. Aucune purge d’historique ni troncature automatique. La croissance future nécessitera une évolution distincte.
- L’adoption d’un historique purement local ne peut pas prouver rétrospectivement sa provenance : cette frontière de confiance est documentée et limitée au module absent. Les reçus doivent rester conservés tant que des opérations anciennes peuvent être rejouées.

## Vérification et preuves

Code final vérifié : **`3ceb14bbf76c7534f6862a7cb1921c894ea3f325`**. Premier commit d’implémentation : `fff0c8e0fee23b6bce3709659bd09513d935ee76` ; le second conserve les dates V1 et stabilise le test E03, sans autre modification du JavaScript applicatif.

- **158 tests unitaires PASS** : 137 natifs/synchronisation et 21 identité/cérémonie/profil, aucun échec ni test ignoré.
- **51 scénarios PostgreSQL réels PASS**, dont quatre scénarios de concurrence avec connexions/PIDs indépendants, rollback injecté, sauvegarde/restauration, anciens writers et capacité.
- **10 tests client natif → PostgreSQL réel PASS**, dont rejeu après COMMIT, reprise, refus de persistance et préservation exacte des dates V1.
- Contrôles locaux de récompenses/formulaires/profil et Missions à 320, 390 et 1440 px ; **12 checkpoints navigateur E03–E06 PASS en CI**, puis campagne générale E01–E08 et registres PASS.
- [CI PostgreSQL finale PASS](https://github.com/PortenartCo/dobby-demo/actions/runs/43056963193), [CI Stitch finale PASS — deux jobs](https://github.com/PortenartCo/dobby-demo/actions/runs/43056963304). La [CI Sync distincte PASS](https://github.com/PortenartCo/dobby-demo/actions/runs/43054927954) porte sur le premier commit ; tous ses tests natifs sont également réexécutés dans la CI PostgreSQL au SHA final.

Les tests PostgreSQL utilisent la version **17.11**, image officielle figée par digest, dans un conteneur local sans réseau ni port exposé et avec stockage tmpfs. Trois identités et tous les foyers sont fictifs. Le rôle de connexion des tests non privilégiés n’est ni superutilisateur ni BYPASSRLS. Les variables JWT sont une fixture d’authentification ; aucun GUC n’autorise le writer.

Les scénarios de concurrence emploient des connexions PostgreSQL indépendantes, des PIDs distincts, des barrières de transaction et des observations de `pg_locks`. Les tests du client exécutent le véritable `family-modules.js` dans deux contextes et transmettent ses appels au véritable writer SQL. Leur transport remplace HTTP/Auth ; ils ne testent ni la délivrance JWT ni un PostgREST déployé, ni deux comptes réels.

Commandes reproductibles et garde de l’environnement : [README des tests](../../tests/shared-runes-v2/README.md). La CI dédiée ne reçoit aucun secret ou DSN distant et détruit uniquement son conteneur marqué.

Les résultats finaux, empreintes exactes des sources et liens de CI figurent dans [le bilan de vérification](evidence/shared-runes-v2/verification.json). Les résultats SQL et verrous figurent dans [postgres/results.json](evidence/shared-runes-v2/postgres/results.json) et [postgres/concurrency.json](evidence/shared-runes-v2/postgres/concurrency.json), et l’intégration dans [client-postgres/results.json](evidence/shared-runes-v2/client-postgres/results.json).

Défauts révélés pendant la campagne et corrigés avant clôture : ambiguïté PL/pgSQL lors du contrôle d’un ancien crédit V1 ; horodatages acceptés par PostgreSQL mais incompatibles avec le moteur navigateur ; retrait de `rewardVersion` contournant l’éligibilité ; interprétation HTTP du CAS ; différence entre le champ réseau `runeRequests: []` et le digest local ; suppression avec annulation en attente. Les tests de refus, d’outbox et de convergence sont maintenus stricts. Les suites historiques n’ont pas été affaiblies.

La comparaison croisée des fixtures a ensuite révélé qu’un crédit V1 valide sans millisecondes était conservé par le client mais refusé par le premier validateur SQL. Le contrat accepte désormais les dates ISO avec zéro à trois décimales et décalage explicite, en conservant leur chaîne historique exacte. Les preuves couvrent à la fois une ligne antérieure à la migration et l’adoption initiale, puis la lecture par un autre client et l’annulation.

La première CI navigateur a échoué dans le test historique E03 : dix cartes attachées, puis zéro visible à l’instantané suivant ([trace](evidence/shared-runes-v2/ci-initial-e03-failure.txt)). Le script original passe localement aux trois largeurs et le point initial passe seize fois instrumenté ; l’échec n’est pas reproduit. `ready` ne fige pas les rafraîchissements du MutationObserver natif. Le test attend maintenant la visibilité de la première carte avant ses instantanés, sans retirer aucune des assertions de comptes. Un masquage durable échoue toujours au délai de douze secondes. Le produit E03 reste inchangé ; les résultats de la reprise CI sont consignés séparément.

## Procédure future : sauvegarder avant toute activation

Ces étapes ne sont pas exécutées sur le Supabase familial par cette mission. Une validation distincte doit identifier le projet personnel DOBBY, son schéma réel et son opérateur ; aucun projet professionnel Portenart ne sert de cible ou de test.

1. Annoncer une courte suspension des écritures Missions et laisser terminer les appels en cours. Exporter les sauvegardes locales et outboxes des appareils pilotes sans les réinitialiser.
2. Effectuer une sauvegarde logique chiffrée du schéma et des données, incluant `dobby_v2_modules`, appartenances, fonctions, triggers, politiques et privilèges. Conserver également le catalogue des rôles/attributions nécessaires et les paramètres d’exposition de l’API. Ne pas mettre de DSN, clé ou dump réel dans Git.
3. Restaurer cette sauvegarde dans un environnement personnel isolé. Vérifier les nombres de modules, révisions, événements et leurs empreintes, les permissions, puis les lectures de tous les modules. Le test livré démontre déjà un dump/restauration intégral sur les seules données fictives.
4. Examiner tous les payloads Missions avec les validateurs de la proposition. Tout ancien format incompatible bloque la migration complète ; ne pas le réparer ou supprimer silencieusement.
5. Faire relire le SQL et les privilèges par l’opérateur. Vérifier PostgreSQL compatible, les claims de requête PostgREST, la structure réelle des appartenances et le trigger natif de révision. La référence corrigée utilise le lecteur privé de claims sous writer ; `auth.uid()` reste réservé aux chemins natifs des autres rôles. Le helper privé de verrouillage appartient à l’opérateur de migration ; il requiert ses droits de verrouillage et ne doit jamais être exposé à l’API.

## Procédure future : activation progressive

1. Livrer le client préparé en conservant ses gardes. Sur un serveur sans capacité V2, les refus existants restent actifs. Aucune publication n’est réalisée ici.
2. Dans l’environnement personnel restauré, appliquer **uniquement la nouvelle proposition** après revue. Ne pas réexécuter le fichier historique de création `dobby-v2-modules.sql` sur une base existante. La proposition V2 est transactionnelle et rejouable ; son préflight doit réussir sans réécrire les lignes.
3. Vérifier les deux RPC via la véritable API authentifiée : capacité membre actif, refus anonyme/hors foyer, refus des anciens writers, exécution limitée, schéma privé non exposé et réponses SQLSTATE transmises. Recharger le cache de schéma PostgREST selon les pratiques de l’environnement si nécessaire, puis revérifier la capacité.
4. Après une autorisation distincte pour la base familiale réelle, réappliquer ces contrôles et activer un foyer pilote. L’activation n’importe pas silencieusement les historiques divergents.
5. Réaliser la recette expressément différée sur les deux vrais comptes et deux appareils : +10 → 0 → 10, simultanéité, montant zéro/personnalisé, occurrence, perte réseau, reprise et lecture des autres modules. Observer révisions, reçus, taille du payload et files en attente avant toute généralisation.

## Procédure future : retour arrière sans perte

Une fois un registre V2 confirmé, **ne pas rétablir les anciens PATCH Missions** et ne pas restaurer un ancien snapshot par-dessus les nouveaux crédits. Le retour sûr suspend les écritures tout en gardant l’historique lisible.

Après arrêt des appels en cours, l’opérateur peut révoquer l’exécution des deux RPC pour `authenticated` dans une transaction de maintenance :

```sql
BEGIN;
REVOKE EXECUTE ON FUNCTION public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.dobby_missions_v2_capabilities(uuid)
  FROM authenticated;
COMMIT;
```

Conserver la garde de table, les rôles, tous les crédits et reçus. Le client conserve ses demandes et son marqueur partagé ; il peut afficher les données confirmées. Les autres modules continuent selon leurs règles existantes. Sauvegarder de nouveau cet état avant toute correction. Une restauration d’urgence complète se prépare et se vérifie à part, sans écraser les nouvelles opérations ; elle ne fait pas partie de cette mission.

Après correction et nouvelle vérification isolée, une autorisation future peut rendre `EXECUTE` aux seuls deux RPC pour `authenticated`, puis vérifier la capacité et rejouer les UUID d’outbox intacts. La campagne fournie vérifie la suspension et la reprise des privilèges sur des données fictives, avec historique et garde inchangés.

## État de livraison

| Statut | Résultat |
|---|---|
| CODE_MODIFIÉ | OUI |
| TESTS_UNITAIRES | OUI — 158 PASS |
| TESTS_POSTGRESQL_RÉELS | OUI — 51 PASS |
| CONCURRENCE_VALIDÉE | OUI — quatre scénarios, connexions indépendantes |
| INTÉGRATION_CLIENT | OUI — 10 PASS, transport Auth/HTTP de fixture vers PostgreSQL réel |
| PRÊT_À_DÉPLOYER | OUI — livraison préparée pour validation humaine |
| DÉPLOYÉ | NON |
| TESTÉ_AVEC_DEUX_COMPTES_RÉELS | NON |

Le [bilan machine](evidence/shared-runes-v2/verification.json) contient les empreintes exactes des sources, les deux phases CI et les références distantes de préservation. [Revue indépendante](evidence/shared-runes-v2/independent-review.md), [vérification des logs PostgreSQL CI](evidence/shared-runes-v2/ci-postgres.json), [checkpoints E03–E06](evidence/shared-runes-v2/ci-e03-e06-checkpoints.txt), [campagne générale](evidence/shared-runes-v2/ci-general-browser.txt), [CI finales](evidence/shared-runes-v2/ci-final.json) et [nettoyage des seuls environnements temporaires](evidence/shared-runes-v2/cleanup.json).

Les 3 487 fichiers de départ sont conservés. Seuls deux writers applicatifs, leur helper de tests et l’attente de visibilité du test E03 existant changent ; le reste est constitué de propositions SQL, tests, CI et documentation nouveaux. Les moteurs purs, recettes/courses, profils, contrats et dossiers publiés ne sont pas réécrits. `main` reste `84e254f485a22ac4f5b880217c02902c22b39c73` et la branche E03–E06 reste `9a3e5dbc1c856ce417e344f2b5aca6e0d9c0040a` lors du contrôle final.

Le commit de clôture ajoute uniquement documentation et preuves ; son code est identique au SHA testé ci-dessus. `[skip ci]` évite de répéter les contrôles verts. Aucune migration réelle, fusion ou publication ; la recette des deux comptes reste expressément différée. Arrêt après préparation et vérification de la branche.
