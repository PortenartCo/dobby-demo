# SDD ledger — plan: docs/superpowers/plans/2026-11-11-integrated-e03-e06.md

Base reconstituée42599df, worktree indépendant. Sources originales e2a8e1d et7386187 laissées intactes ; main observé84e254f. Intégration Dev-Lap4964074 absente ; trois commits E06 appliqués sans conflit sur E01–E05, aucune fusion originale.

- Baseline :106 tests natifs et gate111 PASS.
- Tâches A/B/C/D en parallèle sur fichiers distincts ; root possède générateur, registre/matrice, intégration et rapport.
- Ruling : compensation/personnalisé local ; partage refusé avant mutation faute de garantie serveur atomique/versionnée. Pas de SQL ni appel réel.
- Ruling : aucun OFF historique sans provenance n’est transformé en ON ; nouveau namespace pour la démo corrigée.
- Ruling : nouvelle sémantique q2 implique version Maison explicite ; les résultats confirmés ne sont pas recalculés.
- Aperçu : profil integrated-e03-e06 et namespace dobby-review-e03-e06-20261111|. RED sur ancien profil non reconnu, GREEN deux tests de génération, source originale/configuration ancienne inchangées.

## Checkpoints et revues

- Task B : code commit7bdda55, revue indépendante Missions conforme sans finding matériel ; trois largeurs PASS.
- Task C : pas de défaut source ON neuf reproduit ; source publiée c220 identique, OFF ancien sans provenance conservé. Nouveau namespace testé sur bundle de contrôle ; sources chrome/ritual inchangées.
- Task E builder : commit195ddf4 ; finding provenance P2 (actifs V6 non inclus dans sourceDirty) corrigé RED/GREEN sur dépôt fixture séparé, relecture ciblée close.
- Task D : commit87d9459, 12 Patronus et questionnaires PASS ; fix round1/5 ouvert : D-01 navigation Retour q2→q1 bloquée pendant migration. Auteur original reprend avec seul test de compatibilité.
- Task A : code/tests ciblés et trois largeurs PASS ; relecture native a trouvé contrainte Personnalisée invalide restant active au retour preset. Auteur corrige avant commitA ; garde partage V2 renforcée sans opération serveur.
- Legacy : 5scripts adaptés aux contrats nouveaux, quatre scripts ciblés PASS3largeurs ; integrated-preview réservé à la campagne commune.
- CI : workflow Stitch existant étendu par un job parallèle des checkpoints ; aucun nouveau workflow ni publication. Le parcours intégré historique utilise désormais le profil corrected pour éviter une répétition du même parcours sous deux namespaces.

Prochaine séquence : gelerA etD corrigés, commits ciblés A/C/legacy/CI, revue indépendante globale, campagne finale et natifs/build, registre/matrice append-only, génération propre et manifeste d’un nouveau bundle, push uniquement branche, CI puis clôture documentaire. Tous anciens rapports/preuves à conserver.

Génération a révélé un défaut causal : build-onboarding.cjs recopiait le JSON historiqueV1 sur le canoniqueV2. La première tentative de vérification native était concomitante à cette génération et ses3échecs portent sur ce retourV1 ; journal conservé generation-coupled-red.txt, non présenté comme résultat final. JSONV2 restauré depuis le commit approuvé, aucune donnée utilisateur touchée. Auteur D prend correction du générateur avec fixture isolée ; prochaines générations et tests seront séquentiels. stitch-tailwind.css est une dérivation mise à jour à conserver après contrôle.

## Gel avant CI

- Task A codeed1585f, revue native et défaut preset corrigé,33tests natifs distincts et trois largeurs PASS. Complément MaxSafeInteger : affichage exact trois largeurs PASS, aucune CSS produit modifiée.
- Task D fixround1/5 clos dansa4a5240 : Retourq1, q2obligatoire et lienq6 intercepté, relecture ciblée favorable. Défaut de copie générateur également corrigé/testé en fixture, canonique V2 préservé.
- Root CI/builder/effects commitb127b7b ; campagne standard utilise le profil corrected et un job parallèle couvre12scripts ciblés. Aucun nouveau workflow.
- Revue globale indépendante Astra : aucun finding matériel nouveau, favorable au gel. Une formulation documentaire prospective corrigée.
- Génération source/CSS séquentielle :335fichiers inchangés. Après suppression de la copie V1 destructive,8tests scoring concernés repassent ; aucune suite native non concernée répétée localement. La campagne complète E01–E08 sera exécutée une seule fois sur GitHub avec les workflows existants, plutôt que dupliquée localement avant la même CI.
- Aperçu b127b7b propre :281fichiers applicatifs/286total, deux sorties identiques, namespace dobby-review-e03-e06-20261111|, backend réel désactivé. Source applicative inchangée par les ajouts documentaires/tests ultérieurs.
- Intégrité :2893fichiers initiaux présents,2336docs/preuves historiques inchangés, assets/design/recettes/Cuisine/Contrats protégés. Registre append-only et111ancienneslignes de matrice préservées,122au total,41IDs.
- Aucun merge/publication/données réelles. Prochaine action : commit final de livraison avec bundle/registre/rapport, push seule branche, attendre CI, corriger uniquement échec causal éventuel, puis clôture documentaire sans rejouer les suites vertes.

Contrôle de patch : diff --check sur sources/tests/docs PASS ; les copies statiques gardent volontairement les espaces historiques des sources et licences. Les281hashes source du manifeste sont comparés aux octets du commitb127b7b ; aucune normalisation des copies ne détruit cette provenance.

CI : job des12checkpoints PASS et Sync PASS. Téléchargement facultatif de l’archive de preuves Actions refusé HTTP403 par le stockage de destination ; aucune comparaison distante du manifeste n’est revendiquée. Les281empreintes de l’aperçu préparé ont déjà été vérifiées contre le commit source immutable et le job CI reconstruit/teste son propre aperçu. Les captures locales commitées restent accessibles par GitHub ; pas de blocage de livraison causé par cette vérification facultative.

## Continuation après CI87421ca

Phase1 : Sync PASS ; douze checkpoints PASS ; tous contrôles source et campagne historique jusqu’à register-tools PASS. Échec à la fixture2027 cachée par7jours : ancien test adapté, toutes27assertions conservées, GREEN320/390. Aucun défaut produit corrigé dans cette phase.

Mécanisme de continuation existant réutilisé/narrowed : empreinte de87421ca horsdocs et quatre chemins stricts (workflow, scope, runnerCI, seultest register-tools en échec). Les autres sources ET tests passés sont protégés. Toute différence ou DOBBY_FINAL=1 lance tout. Vérification préalable permet de réutiliser les contrôles et12checkpoints verts ; registre contrôlé puisque docs modifiées. Tests de garde source/testpassé/failedtest/docs/force/erreurenfant/checkpointabsent PASS. Relecture ciblée demandée au relecteur final ; prochaine action commit/push de cette continuation seulement.

Relecture ciblée finale de la continuation favorable : empreinte de phase1 recomputée et identique,27assertions conservées, propagation des échecs et checkpoint corrects ; aucun finding matériel. Aucun test répété par le relecteur.
