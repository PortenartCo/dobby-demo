# Synchronisation familiale des runes V2 — livraison préparée

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

Les tests PostgreSQL utilisent la version **17.11**, image officielle figée par digest, dans un conteneur local sans réseau ni port exposé et avec stockage tmpfs. Trois identités et tous les foyers sont fictifs. Le rôle de connexion des tests non privilégiés n’est ni superutilisateur ni BYPASSRLS. Les variables JWT sont une fixture d’authentification ; aucun GUC n’autorise le writer.

Les scénarios de concurrence emploient des connexions PostgreSQL indépendantes, des PIDs distincts, des barrières de transaction et des observations de `pg_locks`. Les tests du client exécutent le véritable `family-modules.js` dans deux contextes et transmettent ses appels au véritable writer SQL. Leur transport remplace HTTP/Auth ; ils ne testent ni la délivrance JWT ni un PostgREST déployé, ni deux comptes réels.

Commandes reproductibles et garde de l’environnement : [README des tests](../../tests/shared-runes-v2/README.md). La CI dédiée ne reçoit aucun secret ou DSN distant et détruit uniquement son conteneur marqué.

Les résultats finaux, empreintes exactes des sources et liens de CI figurent dans [le bilan de vérification](evidence/shared-runes-v2/verification.json). Les résultats SQL et verrous figurent dans [postgres/results.json](evidence/shared-runes-v2/postgres/results.json) et [postgres/concurrency.json](evidence/shared-runes-v2/postgres/concurrency.json), et l’intégration dans [client-postgres/results.json](evidence/shared-runes-v2/client-postgres/results.json).

Défauts révélés pendant la campagne et corrigés avant clôture : ambiguïté PL/pgSQL lors du contrôle d’un ancien crédit V1 ; horodatages acceptés par PostgreSQL mais incompatibles avec le moteur navigateur ; retrait de `rewardVersion` contournant l’éligibilité ; interprétation HTTP du CAS ; différence entre le champ réseau `runeRequests: []` et le digest local ; suppression avec annulation en attente. Les tests de refus, d’outbox et de convergence sont maintenus stricts. Les suites historiques n’ont pas été affaiblies.

## Procédure future : sauvegarder avant toute activation

Ces étapes ne sont pas exécutées sur le Supabase familial par cette mission. Une validation distincte doit identifier le projet personnel DOBBY, son schéma réel et son opérateur ; aucun projet professionnel Portenart ne sert de cible ou de test.

1. Annoncer une courte suspension des écritures Missions et laisser terminer les appels en cours. Exporter les sauvegardes locales et outboxes des appareils pilotes sans les réinitialiser.
2. Effectuer une sauvegarde logique chiffrée du schéma et des données, incluant `dobby_v2_modules`, appartenances, fonctions, triggers, politiques et privilèges. Conserver également le catalogue des rôles/attributions nécessaires et les paramètres d’exposition de l’API. Ne pas mettre de DSN, clé ou dump réel dans Git.
3. Restaurer cette sauvegarde dans un environnement personnel isolé. Vérifier les nombres de modules, révisions, événements et leurs empreintes, les permissions, puis les lectures de tous les modules. Le test livré démontre déjà un dump/restauration intégral sur les seules données fictives.
4. Examiner tous les payloads Missions avec les validateurs de la proposition. Tout ancien format incompatible bloque la migration complète ; ne pas le réparer ou supprimer silencieusement.
5. Faire relire le SQL et les privilèges par l’opérateur. Vérifier PostgreSQL compatible, `auth.uid()`, structure réelle des appartenances et trigger natif de révision. Le helper privé de verrouillage appartient à l’opérateur de migration ; il requiert ses droits de verrouillage et ne doit jamais être exposé à l’API.

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

Le bilan machine ci-dessus distingue code, tests unitaires, PostgreSQL réel, concurrence, intégration et préparation au déploiement. **DÉPLOYÉ : NON. TESTÉ_AVEC_DEUX_COMPTES_RÉELS : NON.** La préparation est destinée à une validation humaine ; la migration réelle et la recette des comptes restent expressément différées.
