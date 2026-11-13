# Réserves Missions / Runes V3

> Checkpoint de ce sous-lot : les dépendances serveur décrites ci-dessous sont depuis reprises par le chantier du socle. Voir la [passation actualisée](PASSATION-SOCLE-CONCURRENT.md). Aucun diagnostic, ancien installateur ou candidat SQL supplémentaire n’est à exécuter maintenant.

Base auditée : `main b77cb9de100a864c8aace8fb9e07053220ccd23a`, branche `feat/dobby-v7-reserves-techniques-20261113`, le 13 novembre 2026. La recette réelle finale B est acquise selon le complément de livraison de ce commit. Elle n’a pas été rejouée. Aucun accès Supabase, appel Auth/REST/Storage distant ou SQL de production n’a été effectué ; aucun ancien installateur n’a été exécuté.

## Résultat du lot autonome

Une correction indépendante a été trouvée et testée : le solde de Runes en attente pouvait perdre une unité lors d’une compensation, même avec un total final valide. Le calcul interne est désormais exact. Le format des crédits, les identités d’événement, les writers, les allocations, les montants persistés et les gates restent inchangés.

**V3 partagé est repris par le chantier du socle : catalogue reçu, implémentation et installation rapportées, recettes runtime encore en attente et gates fermés.** Aucune migration V3 ni nouvelle signature RPC n’est inventée dans ce lot. Le contrat existant décrit des invariants ; il ne constitue ni un serveur installé ni une certification des droits.

## Rapprochement initial avec la base b77cb9d

| Sujet | Constat actuel | Suite retenue |
|---|---|---|
| Répartition totale | `allocateReward` et `completionRequests` produisent déjà un événement atomique avec parts entières triées et total unique, dont zéro. | Réutilisation ; aucun second moteur. |
| Participants | `completionCandidateIds` distingue attribution, famille entière et mission réellement non attribuée ; anciens bénéficiaires introuvables ne déclenchent pas de repli. Animaux/bébés exclus. | Réutilisation ; aucun nouveau membre ni nouvelle autorisation. |
| Idempotence / historique | Clé mission–cycle–type, un gain actif, compensation append-only exacte, occurrence récurrente indépendante et conflit de crédit confirmé refusé sont déjà dans le cœur. | Contrat et code inspectés ; anciens tests non rejoués. |
| Crédits confirmés | `normalizeCredits` et `checkHistory` valident le ledger et les totaux sûrs par membre avant acceptation. | Conservation ; vérification ciblée dans les nouveaux tests arithmétiques. |
| Somme en attente | Avant correction, réduction signée `Number` pouvant sortir temporairement de la plage sûre puis revenir à un résultat plausible mais faux. | Correction décrite ci-dessous. |
| CAS / réponse perdue | L’outbox V2 possède déjà révision attendue, UUID durable avant appel, rejeu du même corps et refus de réponse incohérente. Cela ne fournit pas un writer V3. | Aucun protocole concurrent créé. Le contrat V3 devra reprendre ces garanties côté transaction réelle. |
| Gate natif V3 | `family-missions.js::completeMission` refuse toute participation partagée avant mutation ; `requiresSync` conserve le besoin de confirmation après désactivation du module. | Gate conservé fermé. |
| Gate transport / rétrogradation | `family-modules.js::assertParticipantSharing` refuse attribution multiple/famille entière, allocations et version ≥3, y compris copie locale/mémorisée. Il est appelé avant activation, réception, construction de payload V2 et envoi de l’outbox. `missionVersion` conserve la version 3. | Code inspecté ; aucun fallback V1/V2 ajouté, aucun gate levé sur fixture. |
| Contrat serveur | [Contrat V3 existant](../revue-generale/supabase/missions-00-contract.md) déjà explicite sur foyer canonique, enfant assigné, montant lu dans la mission verrouillée, parts recalculées, CAS/UUID et atomicité. | Réutilisation ; aucune API sans consommateur ajoutée. |
| Préflight existant | L’ancien préflight Missions fournit surtout métadonnées et empreintes d’un sous-ensemble nommé. Les corps privés réels et la fermeture de leurs dépendances ne sont pas disponibles. | Besoin initial depuis couvert par le diagnostic reçu dans le chantier du socle ; aucune collecte supplémentaire. |

Sources principales : [cœur runique](../../../essai-stitch-v5-famille/family-runes-core.mjs), [writer natif Missions](../../../essai-stitch-v5-famille/family-missions.js), [synchronisation existante et gates](../../../essai-stitch-v5-famille/family-modules.js). Les tests V3 existants ont été lus pour éviter une seconde implémentation ; aucune ancienne campagne ou recette de compte n’a été relancée.

## Correction arithmétique et preuve nouvelle

Historique valide : terminer une petite mission à 2 Runes, la rouvrir, puis terminer une mission à `9007199254740991` Runes. L’ordre stable des événements peut placer le grand gain avant le gain de 2 et sa compensation.

| Valeur | Avant | Après |
|---|---:|---:|
| Total exact attendu en attente | 9007199254740991 | 9007199254740991 |
| Solde affiché par `memberSummary` | 9007199254740990 | 9007199254740991 |
| Total actif après confirmation valide | 9007199254740991 | 9007199254740991 |

`memberSummary` additionne désormais les contributions signées avec `BigInt` en interne, applique les mêmes bornes ±`Number.MAX_SAFE_INTEGER`, puis retourne un `Number`. Aucun `BigInt` n’entre dans les crédits, les requêtes, les données persistées ou la réponse publique.

Nouveaux tests : [reserves-runes-exact-pending.test.mjs](../../../essai-stitch-v5-famille/tests/reserves-runes-exact-pending.test.mjs).

Commande réellement exécutée :

```sh
node --test essai-stitch-v5-famille/tests/reserves-runes-exact-pending.test.mjs
```

Résultat avant correction : **2 échecs / 4**, perte d’une unité reproduite en V2 et V3 ; les deux tests de dépassement final étaient déjà verts. Résultat après correction : **4 / 4 verts**. Les nouveaux cas vérifient également les crédits confirmés, la compensation exacte, le retour à zéro après annulation du grand gain, l’absence de mutation de l’historique fourni et le refus d’un dépassement qui subsiste réellement. Syntaxe du module et `git diff --check` vérifiés séparément.

Ces tests purs utilisent des identifiants fictifs et ne contactent aucun serveur. Ils ne certifient ni RLS ni CAS distant. Ils constituent une nouvelle preuve ciblée, distincte de la recette B acquise.

## Besoins initiaux de catalogue — depuis couverts par le socle

Le diagnostic [serveur/00-diagnostic-regroupe.sql](serveur/00-diagnostic-regroupe.sql) avait été préparé pour ces besoins. Le catalogue réel et les corps privés ont depuis été reçus dans le chantier du socle : **aucune nouvelle collecte n’est à présenter à l’utilisateur**.

Les besoins initiaux, désormais repris dans ce chantier, étaient les suivants :

- les définitions exactes de `public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)`, `public.dobby_missions_v2_capabilities(uuid)`, `public.dobby_v2_modules_stamp()` et de toutes les fonctions des triggers co-présents sur `public.dobby_v2_modules` ;
- toutes les fonctions du schéma privé `dobby_runes_private`, sans se limiter aux noms déjà connus (`guard_missions`, `assert_payload`, `assert_ledger`, `same_award`, `event_key`, `request_user_id`, `lock_active_membership`) ;
- leurs dépendances et les wrappers d’acteur, contexte et appartenance réellement appelés ; un appel dynamique/non qualifié non résolu dans la source reste un blocage à lever par analyse, pas une permission supposée ;
- les propriétaires, `SECURITY DEFINER`, langue, volatilité, `search_path`, ACL explicites et effectives des fonctions/schémas/tables/colonnes/séquences concernées ;
- structures, contraintes, index, RLS et policies de Modules, appartenances et tables privées de reçus/opérations, sans aucune ligne de contenu ;
- les attributs du rôle `dobby_missions_v2_writer`, ses appartenances dans les deux sens, ses capacités `SET`/héritage et ses droits effectifs ; les définitions, activation et ordre des triggers Missions/Stamp/Famille/Rôles doivent être rapprochés ensemble.

Les seules empreintes ne permettent pas de concevoir une migration sûre. La fixture locale historique utilise un guard simplifié : elle ne peut pas servir de définition de production. Les dépendances SQL dynamiques peuvent échapper à `pg_depend` ; le diagnostic et sa relecture doivent conserver cette limite explicite.

## Conditions d’intégration et prochaines actions minimales

La correction arithmétique est indépendante du catalogue et peut suivre le processus Git de ce lot après les contrôles ciblés. **Elle n’autorise aucune activation V3.**

Pour la réserve partagée, le diagnostic, le développement et l’installation manuelle sont depuis rapportés dans le chantier du socle. **Ne répéter aucun de ces checkpoints.** La prochaine preuve utile porte sur les transactions/RPC/REST réelles, les permissions et les parcours complets, après intégration du client correspondant et selon ses gates. Aucun test B nominal n’est à recommencer.

Le gate reste fermé jusqu’à ces preuves. Aucun crédit V3 ne doit être réinterprété en V1/V2 lors d’un rollback ; conserver crédits, reçus et lecture seule si le writer antérieur n’est pas compatible.

Ce sous-lot ne livre pas une seconde implémentation V3 : writer, migrations et retour conservateur sont repris par le socle, avec installation utilisateur rapportée. Sa certification runtime réelle et son activation restent en attente. Aucun faux succès backend, reset du foyer ou réattribution de crédit n’est proposé.
