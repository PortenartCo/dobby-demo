# E04 — Runes, grades et avatars évolutifs

**Branche livrée pour revue : `feat/dobby-e04-runes`.** Base E04 vérifiée : `091fe0e049e496b678ba70b892605777a5e108cd`. Aucun commit E03 repris dans cette branche, aucune fusion ou publication Pages.

Les runes fonctionnent réellement avec les formulaires, les événements et le stockage natifs. La synchronisation est vérifiée entre **clients compatibles sur fixtures**, avec les limites d'intégrité précisées ci-dessous ; aucune recette sur des comptes réels n'est revendiquée.

## Comportement livré

- Efforts Légère **10**, Régulière **25** (défaut), Majeure **50**, sélectionnables et persistés dans les trois panneaux Stitch E04. La récompense personnalisée reste inactive.
- Aucun gain à la création ou à l'édition. La première complétion attribuée d'une nouvelle mission produit une demande immuable par `missionId`, avec bénéficiaire, effort, valeur, intitulé et date de complétion.
- Sans partage antérieur/configuré, le gain est confirmé par la sauvegarde locale native. En partage, il demeure **en attente** jusqu'à la confirmation du payload familial par révision. Le profil distingue total confirmé, attente et état réel du partage.
- Rouvrir/reterminer/rejouer ne crée pas une deuxième demande. Modifier l'effort ou l'attribution après le crédit, supprimer une mission ou retirer un membre ne transfère ni n'efface les gains. L'historique n'est pas limité aux 200 missions encore présentes.
- Une mission sans responsable actuel ne crédite personne. Les anciennes missions, même éditées ou rouvertes, n'acquièrent pas rétroactivement l'éligibilité nouvelle ; le formulaire le précise.
- Avatar et insigne SVG communs sur liste familiale, fiches individuelles/membre, attribution E04 et grimoire personnel. Aucun stockage photographique natif n'existe dans ce périmètre : l'avatar actuel est conservé, sans portraits Stitch fictifs.
- Insignes statiques au coin inférieur droit : point, étoile 4 branches, étoile 8 branches ; cuivre, argent, or, diamant à facettes. Libellé accessible, respect des mouvements réduits, suppression des anciens décors qui masquaient le grade. Profil : total, grade, progression et historique réel des gains.

## Fichiers et persistance

| Périmètre | Implémentation |
| --- | --- |
| Règles pures et configuration | `essai-stitch-v5-famille/family-runes-core.mjs` : efforts, validations, dédoublonnage, totaux et grades. Aucune entrée/sortie. |
| Writer natif | `family-missions-core.mjs`, `family-missions.js` : `effort`, éligibilité `rewardVersion:1` uniquement en création, événement de complétion et sauvegarde native unique. Échec de stockage : rollback commun mission/gain/demande. |
| Partage existant | `family-modules.js` : ledger `runeCredits` et version JSON `runeLedgerVersion:1` dans le module Missions existant ; requêtes `runeRequests` et marqueur `runeSyncRequired` dans le state local natif. Pas de nouvelle base ou de second writer. |
| Chargement et façade | `stitch-v5.js`, `family-v2.js`, `essai-stitch-v7/family-engine.js` : chargement du module pur, lecture de la configuration de partage et des résumés natifs. |
| Interface | `tools-register.js`, `register.css`, `family.js`, nouveaux `member-avatar.js` / `member-avatar.css` ; bootstrap dérivé via `build-source.cjs` et quatre racines régénérées. |
| Catalogue, tests et preuves | Limites de Mission/Grimoire actualisées dans les manifestes, tests E04/natifs/HTTP/CI et présent dossier. Les originaux Stitch et `index.html` natif V5 sont inchangés. |

Les totaux et les grades sont **calculés depuis le ledger confirmé**, sans compteur incrémental ni grade persisté. L'historique est distinct des fiches modifiables et les demandes sont conservées même si leur fiche disparaît. Les champs de santé, fichiers et conversations ne sont pas ajoutés au payload Missions.

## Protocole de synchronisation et blocages réels

Le GET/PATCH conditionnel par `revision` et les choix de conflit déjà disponibles sont réutilisés. Les champs éditables restent soumis à ce choix ; **les deux choix préservent les gains confirmés et les demandes locales**. Les clés JSON sont comparées canoniquement pour ne pas réécrire un payload simplement réordonné par JSONB. Une sauvegarde survenue pendant PATCH reste locale et est reprise ensuite.

Une demande partagée n'augmente jamais le total avant confirmation. En cas de réponse perdue après un PATCH accepté, la lecture suivante retrouve le même crédit et ne le rejoue pas. Désactiver le partage ne supprime pas l'obligation de confirmation d'une identité de mission déjà partagée ; une réactivation/récupération remet les demandes conservées dans le planificateur existant.

**Convention opérationnelle entre clients compatibles : première demande acceptée par CAS.** Lorsque deux appareils hors ligne ont des attributions/efforts divergents pour le même identifiant, un seul crédit est confirmé ; le second reçoit le résultat déjà enregistré. Cela converge et ne transfère aucun crédit confirmé, mais ne prouve pas l'ordre physique des complétions hors ligne. Les horloges clientes et la date de complétion ne fournissent pas cette preuve. Cette limite doit rester visible lors de la revue de la règle métier.

**Blocage d'intégrité pour une coexistence avec d'anciens writers :** un ancien client peut remplacer le JSON familial sans conserver un champ qu'il ignore, même avec une révision CAS correcte. Le client récent bloque une régression de protocole qu'il connaît et conserve son historique, mais ne peut empêcher l'effacement serveur ni récupérer des gains dont aucun client récent ne possède plus de copie. Les historiques déjà confirmés mais contradictoires sont bloqués, jamais arbitrés silencieusement.

La garantie globale face à ces writers n'est donc **pas obtenue** dans les restrictions actuelles. Elle nécessite une décision ultérieure de compatibilité/validation serveur ; aucun SQL ou changement de production n'est exécuté ici. La limite de taille JSON existante reste applicable : un refus serveur garde les demandes en attente et ne tronque pas l'historique.

## Seuils à arbitrer

Configuration unique, **provisoire**, sans migration. Les noms restent descriptifs, non définitifs.

| Cycle / forme | Cuivre | Argent | Or | Diamant |
| --- | ---: | ---: | ---: | ---: |
| 1 — point | 0 | 50 | 100 | 200 |
| 2 — étoile 4 branches | 350 | 550 | 800 | 1 100 |
| 3 — étoile 8 branches | 1 500 | 2 000 | 2 600 | 3 300 |

Changer ces seuils ou leurs libellés recalcule l'affichage depuis les mêmes gains ; aucune récompense historique n'est réécrite. Le drapeau provisoire de cette configuration pilote aussi les mentions de l'interface.

## Vérifications

- **73 tests natifs : PASS** — [sortie](evidence/e04-runes/native-tests.txt). Règles 10/25/50, idempotence, anciens/non attribués, grades, deux comptes simulés, conflits local/foyer, requêtes divergentes, CAS perdu, réponse perdue/rechargement, sauvegarde pendant PATCH, désactivation/réactivation, récupération et reprise automatique, refus serveur, JSONB, historique supérieur à 200 et ancien writer.
- **Navigateur natif réel : PASS** — [sortie](evidence/e04-runes/native-browser.txt). Formulaires et événements natifs, sauvegarde locale réelle, rollback si stockage refusé, réaffectation/suppression et attente persistante après rechargement. Profil éphémère, sans compte réel.
- **E04 et runes à 320/390/1440 : PASS** — [E04 restauré](evidence/e04-runes/e04-restored.txt), [nouveaux parcours](evidence/e04-runes/runes-ui.txt). Valeurs réelles, enregistrement/édition/rechargement, absence de gain anticipé ou de double gain, avatars/profil accessibles.
- **Partage HTTP simulé à 320/390 : PASS** — [sortie](evidence/e04-runes/shared-http-fixture.txt). Le gain reste en attente hors ligne ; après reprise, le vrai writer client confirme une seule entrée du payload. Aucune donnée privée dans les requêtes.
- **35 scripts navigateur couverts** : [10 premiers](evidence/e04-runes/browser-first-10.txt), [25 restants](evidence/e04-runes/browser-remaining-25.txt). Les changements communs du moteur et des composants familiaux justifient cette non-régression E01/E02 et intermodules. Un ancien chemin Chrome Windows dans `smoke.cjs` a imposé la reprise avec Chromium Linux, sans répéter les 10 scripts déjà verts. Les corrections finales de reprise/statut ont ensuite leurs tests natifs et HTTP ciblés.
- **E03 sur composition temporaire : PASS** aux trois largeurs — [parcours](evidence/e04-runes/e03-compatibility.txt), [comptes 3/17](evidence/e04-runes/e03-counts.txt), [recette exacte](evidence/e04-runes/e03-composition.json). Référence E03 `6a86ead6341eb2f17e7552852621c21f496ad97c`, source runes `273250e`, worktree détaché uniquement. Générateur E03 conservé, assets communs ajoutés et sélecteurs de test adaptés aux radios E04, sans retirer d'assertion. Cinq chevauchements de générateur/tests sont répertoriés pour le raccordement futur ; aucun commit E03 intégré à la branche livrée.
- Revue technique indépendante : cas de désactivation corrigé puis clos ; dernier delta de reprise/statut sans autre constat. [Compte rendu](evidence/e04-runes/review.txt). [Incidents et tests causaux](evidence/e04-runes/incidents.txt).

Les fixtures VM/HTTP vérifient le protocole et ses révisions ; elles ne constituent **ni une recette réelle multi-comptes, ni une validation des règles du serveur de production**. Le stockage local et les writers réellement testés en navigateur restent ceux de DOBBY.

## Captures comparatives

Les données de capture sont explicitement TEST. « Avant » montre l'interface E04 avant son raccordement graphique aux runes ; « après » montre le composant et les écrans réellement raccordés. La planche des douze grades est une composition QA du composant réel avec des crédits TEST validés, pas une nouvelle page du produit.

| Largeur | Formulaire | Membres | Profil | Douze grades |
| --- | --- | --- | --- | --- |
| 320 | [avant](evidence/e04-runes/before/effort-320.png) · [après](evidence/e04-runes/after/effort-320.png) | [avant](evidence/e04-runes/before/members-320.png) · [après](evidence/e04-runes/after/members-320.png) | [avant](evidence/e04-runes/before/profile-320.png) · [progression](evidence/e04-runes/after/profile-focus-320.png) | [planche](evidence/e04-runes/after/grade-gallery-320.png) |
| 390 | [avant](evidence/e04-runes/before/effort-390.png) · [après](evidence/e04-runes/after/effort-390.png) | [avant](evidence/e04-runes/before/members-390.png) · [après](evidence/e04-runes/after/members-390.png) | [avant](evidence/e04-runes/before/profile-390.png) · [progression](evidence/e04-runes/after/profile-focus-390.png) | [planche](evidence/e04-runes/after/grade-gallery-390.png) |
| 1440 | [avant](evidence/e04-runes/before/effort-1440.png) · [après](evidence/e04-runes/after/effort-1440.png) | [avant](evidence/e04-runes/before/members-1440.png) · [après](evidence/e04-runes/after/members-1440.png) | [avant](evidence/e04-runes/before/profile-1440.png) · [progression](evidence/e04-runes/after/profile-focus-1440.png) | [planche](evidence/e04-runes/after/grade-gallery-1440.png) |

Les formulaires/profils complets sont également conservés dans les sous-dossiers avant/après. Les barres permanentes restent présentes sur les écrans applicatifs ; elles sont masquées seulement sur la planche QA autonome pour ne pas occulter les derniers grades.

## Livraison

Commits : `9602910` (moteur et persistance), `00b4ecd` (interface/avatars), `273250e` (désactivation sûre), `299bc4f` (reprise et états). Branche et preuves poussées pour revue ; CI automatique du dépôt conservée et enrichie avec les nouveaux tests.

[Contrôles de préservation](evidence/e04-runes/preservation.json). Branches E01/E02/E03 et E04 de référence non modifiées. Aucune publication, fusion dans main, récurrence, heure, rappel, récompense automatique, modification Supabase/SQL ou donnée réelle. Arrêt après livraison et revue technique.
