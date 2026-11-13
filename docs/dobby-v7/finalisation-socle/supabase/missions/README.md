# Missions V3 — writer d'intentions

Ce lot est préparé pour le **seul projet familial** à partir du catalogue technique reçu le 13 novembre 2026. L'utilisateur applique les SQL personnellement. Aucun accès SQL distant ni modification Supabase par l'agent. Le client reste fermé avant validation réelle du serveur.

## Ordre manuel

1. Installer et vérifier le lot familial F09/F08 coordonné. Il fournit le rôle fermé `dobby_socle_writer`, l'identité canonique verrouillée, les politiques nécessaires et la branche du trigger de révision. Ne pas installer ce fichier sur le seul ancien lot provisoire `roles-01-apply.sql`.
2. Exécuter **[01-apply.sql](01-apply.sql)** une fois. Il refuse un ancien writer/garde différent du diagnostic reçu, ou une installation V3 déjà présente : aucun remplacement aveugle. Ne pas rejouer Stitch 01/04/06/11.
3. Exécuter **[02-verify.sql](02-verify.sql)** et transmettre le JSON `missions_v3_verification`. Ce contrôle de catalogue ne certifie pas le comportement des comptes réels et ne suffit pas à ouvrir le gate client.
4. Réaliser les recettes réelles ci-dessous, puis seulement publier/activer le client compatible après leur résultat. Conserver les deux comptes et le foyer actuels ; aucun reset ou transfert de crédits.

## Protocole exact

`public.dobby_missions_v3_write(p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_intent jsonb)` renvoie `protocol:3`, `replayed`, `operation:{id,revision,digest,changed?}` et `module:{module:'missions',payload,revision,updated_at}`. Le digest est SHA-256 de la représentation JSONB PostgreSQL de l'intention. Le reçu est lié au foyer, acteur, opération, digest et révision attendue. Un rejeu renvoie le **module courant**, même si son numéro dépasse la révision historique du reçu.

| Intention | Champs autorisés | Autorité |
|---|---|---|
| `snapshot` | `{kind:'snapshot',payload:{autoTasks,manualMissions,...}}` ; si fournis, `runeCredits` doivent être strictement identiques à l'historique serveur et `runeRequests` vide. Extensions anciennes conservées. | Parent canonique actif du seul foyer. Statut/complétion et éligibilité historique ne peuvent être modifiés par ce chemin. |
| `complete` | `{kind:'complete',missionId,participantIds:[TEXT,...]}` ; aucun montant, effort, date, crédit ou changement annexe. | Parent ; enfant seulement pour une mission lui étant attribuée ou « Toute la famille », avec sa propre participation explicite. |
| `reopen` | `{kind:'reopen',missionId}`. | Parent seulement ; annulation append-only de l'événement actif entier. |

Une première activation V3 **n'importe pas de crédit fourni par le client**. Si un ancien appareil possède un historique uniquement local, utiliser son adoption V2 explicite déjà prévue avant de passer ce foyer en V3, ou conserver les données pour examen ; ne jamais vider cet historique pour forcer l'activation.

`public.dobby_missions_v3_capabilities(uuid)` exige la liaison canonique au foyer et annonce `contract:'dobby-missions-intents-v3-1'`, `intentVersion:1`, `participantVersion:1`, `ledgerVersions:[1,2,3]`, `atomicAllocations:true`, `canonicalAuthorization:true` et `maxPayloadBytes:262144`. `clientVerified` reste `false` à l'installation : il dépend des confirmations Famille/Storage/Missions du socle et des droits canoniques courants. Sa présence seule ne constitue pas la recette réelle exigée.

Une nouvelle opération sans effet (`complete` déjà terminée ou `reopen` déjà ouverte, dans un module déjà V3) renvoie `operation.changed:false`, sans incrément de révision. Une mutation ou adoption du format V3 renvoie `changed:true` et la révision suivante. Le snapshot parent est une mutation CAS explicite, même si ses champs éditables sont identiques. Un reçu rejoué conserve sa révision appliquée mais renvoie le module courant ; `changed` n'est pas répété dans cette réponse.

## Garanties et compatibilité

- Le serveur lit le barème de la mission verrouillée : 10/25/50 ou entier personnalisé exact, sans dépassement de la capacité JavaScript. Les humains canoniques sélectionnés reçoivent l'unique total ; aucun crédit aux animaux ou aux membres absents/non attribués. 25 pour deux donne 13 + 12, solo 25, montant zéro zéro.
- Le tri UTF-16 déterministe correspond à JavaScript, y compris pour les identifiants Unicode. Les IDs restent du texte canonique, sans conversion en UUID ni troncature.
- Une mission et son occurrence restent uniques. Une double validation ne crée pas un second gain. CAS périmé refuse sans écraser ; réponse perdue réutilise exactement l'UUID et l'intention ; autre acteur/corps/révision avec le même UUID est refusé. **V2 et V3 partagent l'espace des UUID d'opération par foyer** : réutiliser dans l'autre protocole un UUID déjà reçu est refusé, y compris en concurrence.
- Gain, statut, révision et reçu sont atomiques. Réouverture parentale ajoute une annulation de toutes les allocations antérieures ; nouveau gain au cycle suivant. Les règles et occurrences historiques ne peuvent être supprimées ou réidentifiées.
- Les crédits V1/V2 restent **exactement** stockés, avec leurs extensions et représentation de date ; aucune normalisation ou redistribution. Les nouvelles opérations ajoutent leurs événements. Les champs JSON inconnus de module/mission/historique sont conservés ou un changement contradictoire est refusé.
- L'ancien corps V2 est renommé, conservé et inaccessible au navigateur. Son nom public historique devient un wrapper Parent canonique. Il reste exclusivement V2 : un payload V3 est refusé. Aucun fallback V3 vers V2 ni accès direct aux crédits.
- Ordre commun : verrou du compte, appartenance active, verrou familial et registre, puis verrou consultatif V2 Missions et ligne Missions. Les writers familiaux ne verrouillent pas Missions. Le rôle technique reste sans LOGIN/BYPASSRLS/CREATEROLE, avec SET/INHERIT fermés au repos et accès aux reçus sous RLS forcée.

## Recettes réelles nécessaires

Après résultat d'installation et vérification, contrôler les appels RPC/REST réellement exécutés sous Parent, Enfant canonique et compte d'un autre foyer. Les tests locaux ou boutons seuls ne suffisent pas.

1. Mission partagée 25, deux participants explicites → une mission, un gain, 13 + 12. Vérifier solo et zéro, refus animal/non-participant/ID retiré ; attribution disparue ne devient pas une attribution libre.
2. Enfant assigné/toute famille → complétion permise ; enfant non assigné → refus. Refuser création, édition, réouverture, montant/date/crédit annexe, ancien RPC V2 et écriture directe.
3. Deux transactions/deux sessions sur la même révision → un seul gain ; réponse perdue puis même opération → rejeu courant, aucun deuxième crédit ; UUID réutilisé autrement → refus.
4. Réouverture parent → compensation exacte ; complétion suivante → cycle suivant. Deux occurrences natives d'une même récurrence → un gain propre à chacune, anciennes règles immuables.
5. Refus inter-foyers, compte non lié/inactif, erreur en milieu d'opération sans module/crédit/reçu partiel. Conserver uniquement des preuves agrégées et anonymisées.

## Retour arrière

Fermer le gate frontend puis exécuter [03-rollback-conservative.sql](03-rollback-conservative.sql). Il retire l'accès aux nouveaux RPC sans retirer les crédits V3, l'historique V1/V2, les reçus ou les protections Parent/Enfant. Les foyers déjà V3 restent en lecture seule pour Missions ; ne pas réactiver un writer V2 incompatible. Une restauration DDL complète ou conversion des crédits ne fait pas partie de ce retour conservateur.

Les [dix-huit groupes de tests locaux du candidat exact](VALIDATION-LOCALE.md) ont réussi, avec les deux empreintes d'installation conservées dans [la preuve structurée](evidence/local-tests.json), après passage du [harness ciblé](tests/run-local.py). La baseline technique réelle reste privée, hors Git ; les données de test sont fictives. Aucun résultat de ce lot ne vaut installation ou recette Supabase réelle.
