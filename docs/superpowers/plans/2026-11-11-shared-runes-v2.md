# Runes partagées V2 — plan d’exécution du 11 novembre 2026

Demande : [spécification intégrale](../../dobby-v7/SHARED-RUNES-V2-SPEC.md).
Base exacte : `9a3e5dbc1c856ce417e344f2b5aca6e0d9c0040a`, code testé `b381fc74bc1b529514a3bf9c35e5b29bb21ce045` ancêtre vérifié. Branche/worktree indépendants `feat/dobby-shared-runes-v2-20261111` / `/workspace/dobby-shared-runes-v2`.

1. Contrat : conserver `runeCredits` et `runeRequests`, les identités/cycles natifs, les crédits V1 et la limite JSONB. Examiner les privilèges et documentations publiques PostgreSQL/Supabase actuelles.
2. Serveur : RPC atomique, identité + adhésion active vérifiées en base, verrou par foyer et CAS, reçus idempotents sans second ledger. Interdire les anciennes écritures Missions au niveau table, sans indicateur de session client.
3. Client : capacité vérifiée, UUID et snapshot persistés avant envoi, réponse confirmée uniquement, fusion des modifications indépendantes, conflits explicites et maintien de l’outbox en cas de résultat inconnu.
4. Vérification parallèle : PostgreSQL réel isolé, transactions indépendantes, rollback, abus des anciennes voies et reprise ; moteur client réel raccordé à PostgreSQL via transport de test ; non-régressions natives et navigateurs ciblés E03–E06.
5. Revue croisée, preuves, CI et procédure de sauvegarde/activation/retour arrière. Commits puis push de la seule branche indépendante. Arrêt avant toute migration réelle, fusion ou publication.

Les agents serveur, client, tests PostgreSQL et intégration client possèdent des fichiers distincts. Une revue indépendante contrôle les invariants et les privilèges. Aucun agent n’est autorisé à publier, migrer une base distante ou modifier les branches sources.

L’environnement réel de test est PostgreSQL 17.11, image officielle figée par SHA256, conteneur sans réseau ni port, données fictives dans tmpfs. Aucun projet Supabase, compte réel ou secret externe n’est utilisé. Les fixtures d’authentification ne constituent pas une recette JWT/Supabase ni un essai sur deux comptes familiaux réels.

## Clôture

Les cinq étapes sont terminées. Code vérifié `3ceb14bbf76c7534f6862a7cb1921c894ea3f325` : 158 tests unitaires, 51 scénarios PostgreSQL réels, 10 tests client→PostgreSQL, quatre scénarios de concurrence et 12 checkpoints E03–E06 PASS. CI PostgreSQL et campagne générale Stitch PASS ; revue indépendante sans blocage sous les limites documentées. Le dernier ajustement conserve les anciennes dates V1 sans millisecondes et attend le rendu E03 sans changer ses assertions.

[Rapport, preuves et procédure future](../../dobby-v7/SHARED-RUNES-V2.md). Les environnements temporaires locaux sont arrêtés. Migration réelle, fusion, publication et recette des comptes réels non effectuées. Le commit documentaire de clôture ne change pas le code testé. Arrêt après push de la seule branche indépendante.
