# DOBBY V7 — Missions / Runes, revue M01–M09

Base rapprochée avant code : `b327aa5194b5f5897f4354e13266059815722eaa`. Baseline persistée dans `/workspace/dobby-missions-baseline.md` avant modification. Commits : `5a833f7` (cœur V3 + contrat serveur), `4a77954` (assistant, dates, attribution, modale, gates et tests historiques). Aucun accès Supabase, aucune migration distante, aucun push/merge/déploiement effectué par ce sous-agent.

## Rapprochement et résultat par ID

|ID|Baseline|Statut final du lot|Changement / preuve locale|Réserve|
|--|--|--|--|--|
|M01|À_CORRIGER|FAIT_TESTÉ_NON_DÉPLOYÉ|`tools-register.js` affiche une seule des 3 étapes, Suivant/Retour validés, brouillon de champs et étape restauré. `e04.cjs`, `missions-review.cjs`.|UI publique V7 ; formulaire interne du moteur conserve le writer existant.|
|M02|DÉJÀ_VALIDÉ local|FAIT_TESTÉ_NON_DÉPLOYÉ|Writer natif unique au dernier écran ; verrou de double soumission, retour automatique missions.html et une seule tâche. `missions-review.cjs` déclenche deux clics consécutifs et vérifie 1 mission.|Déploiement à traiter par le parent.|
|M03|À_CORRIGER|FAIT_TESTÉ_NON_DÉPLOYÉ|10/25/50 conservés ; radio Personnalisée retirée ; champ entier ≥0 exclusif ; preset vide le champ. `e04-runes.cjs`, `review-integrated-rewards-preset.cjs`, tests purs.|Le partage de custom V2 garde son gate existant ; aucune certification backend nouvelle.|
|M04|À_CORRIGER|FAIT_TESTÉ_NON_DÉPLOYÉ|Nouvel intitulé et choix Pas de date limite/Aujourd’hui/Demain/Choisir une date ; calendrier uniquement sur le dernier. `e04.cjs` : année, bissextile, DST, brouillon.|Aucune suppression des anciennes échéances enregistrées.|
|M05|À_CORRIGER|FAIT_TESTÉ_NON_DÉPLOYÉ|createdAt reste automatique ; date de première attribution récurrente distincte de due ; deadlineOffsetDays null ou entier par occurrence ; retard distinct sans retrait. Tests natifs/core et UI.|Les anciennes séries gardent exactement leur identité et calendrier.|
|M06|À_CORRIGER|PARTIEL|Vrais membres/avatars, checkboxes multiples et Toute la famille ; aucun clone ; animaux/bébés exclus. Absence de profils partagés non chargés indiquée comme récupération Famille. `missions-review.cjs` et core.|Attribution multiple partagée bloquée avant activation/sérialisation, ATTENTE_UTILISATEUR V3.|
|M07|NON_RÉALISÉ|PARTIEL|Modale demandant participants réels ; événement atomique avec allocations et total unique ; 25→13+12, solo 100 %, zéro zéro ; seuls participants crédités. Tests natifs et `mission-participants-runes.test.mjs`.|Partage réel V3 entièrement bloqué : pas de writer V3 installé/vérifié.|
|M08|BLOQUÉ_BACKEND + À_CORRIGER|ATTENTE_UTILISATEUR|Complétion idempotente distincte de réouverture explicite ; historique append-only, compensation exacte, identité par occurrence ; refus canonical enfant partagé ; guards V3 contre downgrade V1/V2, activation, pull et RPC. 149 tests mission/runique/récurrence/sync + tests complémentaires.|Aucune preuve RLS/RPC réelle ; enfant autorisé à compléter exige encore le writer serveur V3. Voir contrat manuel.|
|M09|À_CORRIGER|FAIT_TESTÉ_NON_DÉPLOYÉ|priorité explicite, bordure or statique 1px ; urgence jamais déduite de date ; En retard séparé ; terminées normales. `missions-review.cjs`, E03.|Aucun clignotement.|

## Tests exécutés

Tests substantiels écrits rouges avant correction pour normalisation multi-attribution/récurrence/date et gate V3. Calculs d’allocations testés rouges puis verts dans le sous-lot V3.

- `node --test essai-stitch-v5-famille/tests/*runes*.test.mjs essai-stitch-v5-famille/tests/*mission*.test.mjs essai-stitch-v5-famille/tests/*recurrence*.test.mjs essai-stitch-v5-famille/tests/*reward*.test.mjs` : **149/149 PASS** au premier lot complet ; 2 cas ont ensuite été ajoutés et passent séparément (récurrence native sans échéance et mission multiple sans crédit non partageable).
- `node --test essai-stitch-v5-famille/tests/shared-runes-native.test.mjs` : **11/11 PASS** après ajout de la récurrence sans échéance.
- `node --test essai-stitch-v5-famille/tests/missions-v3-sharing-gate.test.mjs essai-stitch-v5-famille/tests/modules-flow.test.mjs` : **10/10 PASS** (4 gates + 6 flux modules).
- `node essai-stitch-v7/tests/missions-review.cjs` : **PASS 320/390/768/1024/1440/1920 px** ; campagne finale renforcée brouillon/double clic/urgences **PASS 320/1440**.
- `node essai-stitch-v7/tests/e04.cjs` : **PASS 320/390/1440**, adapté au nouveau contrat (3 étapes/multi/presets/dates sans Week-end).
- `node essai-stitch-v7/tests/e04-runes.cjs` : **PASS 320/390/1440**, adapté à la modale réelle/V3 ; création et édition sans crédit, compensation, recompétion, profil, avatar, legacy.
- `DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 node essai-stitch-v7/tests/review-integrated-rewards-preset.cjs` : **PASS**.
- `node essai-stitch-v7/tests/runes-native.cjs` : **PASS** ; bindings parentaux explicitement simulés et documentés dans la fixture ; aucun compte réel.
- `node essai-stitch-v7/tests/register-tools.cjs` : **PASS 320/390** ; wizard, writer, chat, recherche, suppression annulée, éditeur périmé.
- `node essai-stitch-v7/tests/register-missions-sync.cjs` : **PASS 320/390** ; fixture HTTP création/sync, accès parent simulé explicite, nouveau partage de participation refusé et aucune mutation/attribution fictive.
- `node essai-stitch-v7/tests/e03-counts.cjs` : **PASS** ; urgence maintenant explicite dans les fixtures.
- `node essai-stitch-v7/tests/e03.cjs` : **PASS 320/390/1440**, filtres, vrais compteurs, clavier, édition/création, E01/E02, persistance, source automatique et préférences.
- Vérifications syntaxe des JS modifiés et `git diff --check` : **PASS**.

Tous les tests navigateur bloquent le réseau externe ou remplissent une fixture HTTP explicite ; aucune CI/fixture ne prouve une autorisation ou synchronisation Supabase réelle. La recette Safari iOS/matériel n’est pas réalisée. Captures 320 et 1440 dans `/workspace/dobby-missions-evidence/` : wizard, library, participants. Contrôlées visuellement : champs/choix lisibles, avatars réels de fixture, modale superposée, dock 6 entrées. Le parent consolide captures et tests transversaux.

## Contrat manuel / SQL restant

Dans `docs/dobby-v7/revue-generale/supabase/` :

- `missions-00-contract.md` : contrat transactionnel V3 complet, acteurs/foyer/enfants, total lu depuis mission verrouillée, participants réels, répartition déterministe, CAS/UUID/replay/récurrence, tests réels et rollback conservateur.
- `missions-01-preflight.sql`, `missions-02-verify.sql`, `missions-03-rollback-check.sql` : contrôles **en lecture seule**, jamais exécutés. Ils ne sont pas une migration V3 et ne déclarent jamais V3 opérationnel.

Limite explicite : le catalogue local ne fournit pas les corps privés réels guard/assert du writer V2 installé. Une migration V3 complète et son rollback doivent encore être implémentés/testés à partir du catalogue réel, puis appliqués manuellement et vérifiés par l’utilisateur. La prochaine action unique est le préflight manuel personnel ; aucune bascule frontend V3 partagée n’est livrée activable par un simple réglage. L’ancien writer V2 est préservé. Aucun faux CREATE FUNCTION, aucune politique RLS assouplie.

## Intégration parent

- `window.DobbyMissionParticipants.open(id)` est exporté depuis tools-register.js ; l’Accueil doit y envoyer les complétions des nouvelles missions (`participantVersion===1`). Le sous-lot transversal confirme l’intégration home.js.
- Le hunk Settings Courses de tools-register.js a été laissé hors du commit missions ; aucun fichier généré, chrome.js, cuisine*, family.js ou build-source.cjs n’a été commité par ce sous-agent.
- Vérifier stamps des assets au build/publication et campagne finale séquentielle ; aucune annonce de capacité backend réelle.

## Correctif après revue indépendante — mission sans responsable

Le parcours de création autorise une mission non attribuée. La revue a révélé que son ancienne liste de candidats était vide et empêchait la complétion. Les candidats à la participation sont désormais définis par un seul helper natif partagé avec l’UI : une mission réellement sans attribution propose les humains actuels du foyer, puis exige leur sélection explicite. Une attribution retirée/introuvable ne déclenche jamais ce repli. Un foyer local sans aucun humain peut terminer une mission réellement non attribuée sans aucun crédit, avec cette conséquence clairement annoncée. Les animaux/bébés sont exclus ; aucun membre n’est créé et le total ne change pas. Tous les gates de partage V3 restent fermés.

Preuve rouge : quatre régressions échouaient (API absente/refus participant/no-participant), avant correction. Preuves vertes : 26 tests natifs/purs, 45 régressions runes/sync/gates et `missions-unassigned-review.cjs` à 320 px. Ce dernier crée réellement la mission sans responsable dans l’assistant, vérifie les candidats réels et le total unique, le refus d’une sélection vide quand des humains existent, la complétion sans crédit du foyer vide et le blocage d’une attribution périmée. Relecture indépendante `baseline_release` : PASS, R1 résolu. Aucun accès Supabase ni déploiement.
