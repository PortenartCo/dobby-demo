# Revue intégrée E03–E06 — récompenses et intégrité du solde

Source intégrée de départ `42599df` ; lot A implémenté sur la branche indépendante. Aucun commit, push, serveur, SQL ou compte réel manipulé par ce sous-agent. [Demande](REVIEW-E03-E06-20261111-SPEC.md), sections 2, 3 et 5.

| Demande | Résultat réel |
|---|---|
| Montant personnalisé entier, zéro compris | Implémenté par le formulaire et writer natifs, **usage local** ; sauvegarde refusée explicitement en partage |
| Transmission aux séries | Montant dans la mission et les modèles datés ; les occurrences existantes et leurs gains restent inchangés |
| Solde après réouverture/reclôture | **Local vérifié : +10 → 0 → 10**, annulation exacte et historique conservé |
| Synchronisation de ces nouveautés | **BLOQUÉE volontairement** avant POST/PATCH ; validation atomique serveur nécessaire, non autorisée dans ce lot |
| Partage antérieur V1 | Premières complétions prédéfinies restent traitées par le CAS existant ; réouverture d’un gain partagé refusée sans modifier mission/solde |
| Bouton principal | 18 px, graisse 700, hauteur 52 px, contraste minimum mesuré 7,86:1, sans troncature aux trois largeurs |

## Causes établies

`tools-register.js` désactivait explicitement `#custom-runes` par `c.unavailable()`. Le writer ne proposait que les trois niveaux. Le registre de crédits V1 dédupliquait uniquement par `missionId` : un gain confirmé était conservé à chaque réouverture, et `completionRequest()` refusait tout gain ultérieur. Le writer changeait le statut sans produire de compensation.

[Tests purs RED](evidence/integrated-e03-e06-20261111/rewards/core-red.txt), [formulaire RED et captures](evidence/integrated-e03-e06-20261111/rewards/browser-red.txt), [attente historique d’immuabilité devenue invalide](evidence/integrated-e03-e06-20261111/rewards/e04-obsolete-immutable-red.txt).

Le bouton source était déjà à 16 px/600/52 px dans cette intégration, contrairement à un défaut qui n’est pas reproduit ici comme une taille inférieure à 16 px. Il est renforcé à 18 px/700, en conservant le gradient doré et le texte sombre. [Mesures avant](evidence/integrated-e03-e06-20261111/rewards/before-results.json), [mesures calculées après](evidence/integrated-e03-e06-20261111/rewards/after-results.json), [contraste sur les deux extrémités du gradient](evidence/integrated-e03-e06-20261111/rewards/button-contrast.json).

## Contrat canonique et historique

- `customRunes` est un champ optionnel **numérique** de la mission native ; `effort` reste l’un des trois niveaux existants et `rewardVersion:1` est conservé. L’absence de `customRunes` conserve la récompense prédéfinie. Une sélection Personnalisée est une commande du formulaire, jamais une nouvelle catégorie d’effort stockée.
- Valeurs admises : entiers de 0 à `Number.MAX_SAFE_INTEGER`, sans plafond produit supplémentaire. Valeurs négatives, décimales, infinies, chaînes non numériques, notation exponentielle dans la saisie et sommes actives dépassant cette capacité sont refusées **avant** changement de statut/persistance.
- Les séries conservent ce champ dans chaque modèle daté. Modifier le modèle change uniquement les nouvelles occurrences. Les occurrences restent des missions ordinaires dans `manualMissions` ; aucun registre secondaire.
- Les lignes de crédit V1 gardent leur format canonique et leur confirmation. Les nouvelles lignes utilisent les **mêmes** `runeCredits` et `runeRequests`, avec `eventId`, `kind` (`grant` ou `reversal`), `cycle`, et `reverses` pour une annulation. L’identité déterministe est `missionId~cycle~kind`. Le premier gain V1 est le cycle 0, référencé par son `missionId` existant.
- L’annulation copie le bénéficiaire, l’effort, le montant personnalisé éventuel et le montant exact du gain actif. Un changement de responsable ou de montant ne transfère/réécrit donc aucun ancien gain. La reclôture crée le cycle suivant avec le montant et responsable alors applicables.
- Normalisation et fusion refusent les références inconnues, annulations différentes du gain, cycles manquants, événements contradictoires ou plusieurs gains actifs. Un même événement rejoué ou créé simultanément sur deux états identiques ne compte qu’une fois. La somme et les grades sont calculés depuis les gains encore actifs, jamais par masquage d’un crédit inchangé.
- Le résumé conserve son API `total`, `pending`, `grade`, `credits`. `member-avatar.js` présente maintenant gains **+** et annulations **−**, avec référence d’événement dans le DOM ; Profil magique et avatars consomment ce résumé natif, sans calcul parallèle.
- Une mission ancienne sans version éligible ne reçoit toujours aucun gain rétroactif. Un gain historique réellement confirmé peut être compensé localement lors de sa réouverture ; le crédit original reste dans l’historique.
- Échec du stockage : rollback de mission, crédits et demandes ensemble. La création/modification d’une mission ne crédite pas de runes.

Fichiers : `family-runes-core.mjs`, `family-missions-core.mjs`, `family-missions.js`, garde ciblée `family-modules.js`, `tools-register.js`, `register.css`, `member-avatar.js`. Les seuils et douze grades n’ont pas changé.

## Limite de partage : refus explicite, pas de migration cachée

L’audit du SQL existant, en lecture seule, établit un payload JSONB générique de 256 Kio maximum et un incrément de révision. Il n’impose ni version monotone du ledger, ni conservation des événements, ni validation du graphe. Un ancien writer pourrait remplacer le JSON serveur et effacer des compensations ; un nouvel appareil sans copie connue ne peut reconstituer cet historique.

En conséquence :

1. La création/modification d’une récompense personnalisée sur un module partagé est refusée sans mutation.
2. La réouverture d’une mission ayant un gain partagé, ou d’une opération exigeant un événement V2, est refusée ; statut, crédits et demandes restent identiques.
3. Un ledger local V2 ou une mission/modèle personnalisé ne peut être activé, récupéré ou envoyé par le protocole V1. `runeLedgerVersion` dérivé signale 2 avant le refus ; aucun POST/PATCH V2 n’est effectué. Les données locales restent conservées, y compris lors du choix de récupération d’une version serveur.
4. Les gains prédéfinis V1 et leurs confirmations CAS restent disponibles. Après désactivation du partage, le marqueur natif `runeSyncRequired` reste volontairement prioritaire : un historique partagé ne devient pas un deuxième ledger local.
5. Le panneau de partage affiche ce blocage ; il n’annonce pas « à jour » pour ces nouveautés.

**Suite proposée, non exécutée :** validation atomique du payload Missions et du ledger côté serveur (version monotone, événements antérieurs immuables, alternance grant/annulation, références et montants, un gain actif par occurrence, cohérence statut/gain après choix explicite d’un conflit, refus des anciens writers destructifs), avec CAS. Prévoir une limite de taille avec refus conservateur, sans tronquer l’historique. Une recette avec deux vrais comptes/appareils restera nécessaire après autorisation et déploiement de cette évolution. Les fixtures de ce lot prouvent les refus et la compatibilité V1, **pas une synchronisation V2 opérationnelle**.

## Tests ciblés réellement exécutés

| Test | Preuve |
|---|---|
| 33 tests natifs distincts : 8 nouvelles règles, 6 gardes partage, 19 anciennes règles/sync | [32 PASS initiaux](evidence/integrated-e03-e06-20261111/rewards/native-green.txt), puis [19 PASS ciblés après le durcissement partage](evidence/integrated-e03-e06-20261111/rewards/sync-final-green.txt) |
| Personnalisée 10 puis +10/0/10, reload, changement responsable et montant 0, historique signé | [PASS 320/390/1440](evidence/integrated-e03-e06-20261111/rewards/browser-green.txt) |
| Writer natif : invalides, modèle récurrent, champs inconnus, ancienne occurrence, refus stockage, refus partagé sans mutation, dépassement du total | [PASS](evidence/integrated-e03-e06-20261111/rewards/writer-green.txt) |
| Abandon d’un personnalisé invalide vers un preset, V7 et natif | [RED](evidence/integrated-e03-e06-20261111/rewards/preset-red.txt), [GREEN](evidence/integrated-e03-e06-20261111/rewards/preset-green.txt) |
| Bouton après seule évolution CSS, sans rejouer les opérations métier | [PASS trois largeurs](evidence/integrated-e03-e06-20261111/rewards/button-green.txt) |
| Trois niveaux historiques, annulations/récrédits, profil/avatars, anciens/non attribués, reload | [E04-runes PASS](evidence/integrated-e03-e06-20261111/rewards/e04-runes-green.txt) |
| Writer réel, 10/25/50, réattribution, suppression, rollback et fixture V1 partagée distincte | [runes-native PASS](evidence/integrated-e03-e06-20261111/rewards/runes-native-green.txt) |
| Formulaire E04 complet, trois panneaux, catégories, dates, brouillon, navigation et anciens champs | [PASS trois largeurs](evidence/integrated-e03-e06-20261111/rewards/e04-green.txt) |

Les tests historiques modifiés gardent les anciens contrôles métier. Seules les attentes « champ personnalisé désactivé », « ledger strictement identique après réouverture/reclôture » et l’accès direct à une mission désormais rangée sous Sans échéance ont changé. Ils vérifient maintenant une compensation exacte, un seul gain actif et la conservation du crédit d’origine ; le test partagé utilise un nouveau profil V1 compatible, sans supprimer un historique V2 de produit.

## Revue indépendante ciblée

Une relecture en lecture seule du ledger et des chemins de partage a identifié une contrainte `pattern` restant active lorsque l’utilisateur abandonnait un montant invalide pour choisir un preset. Ce cas est reproduit RED puis corrigé sur les formulaires V7 et natif ; le champ non sélectionné ne bloque plus le preset. La même revue n’a pas trouvé de voie POST/PATCH V2 ; l’activation d’un snapshot V2 distant strictement identique est néanmoins refusée uniformément, avant tout marquage configuré. Les tests ciblés du refus et de la compatibilité V1 sont verts après ce durcissement. Aucune seconde revue générale n’est revendiquée.

## Captures réelles

| Largeur | Avant formulaire/bouton | Après formulaire/bouton | Historique |
|---|---|---|---|
| 320 | [Avant](evidence/integrated-e03-e06-20261111/rewards/before-form-320.png) | [Après](evidence/integrated-e03-e06-20261111/rewards/after-form-320.png) | [Gains et annulations](evidence/integrated-e03-e06-20261111/rewards/after-history-320.png) |
| 390 | [Avant](evidence/integrated-e03-e06-20261111/rewards/before-form-390.png) | [Après](evidence/integrated-e03-e06-20261111/rewards/after-form-390.png) | [Gains et annulations](evidence/integrated-e03-e06-20261111/rewards/after-history-390.png) |
| 1440 | [Avant](evidence/integrated-e03-e06-20261111/rewards/before-form-1440.png) | [Après](evidence/integrated-e03-e06-20261111/rewards/after-form-1440.png) | [Gains et annulations](evidence/integrated-e03-e06-20261111/rewards/after-history-1440.png) |

Contextes Chromium TEST jetables, réseau externe bloqué. Les captures longues peuvent présenter les barres fixes au niveau du viewport : les contrôles de géométrie et clic sont vérifiés séparément. Aucun compte familial réel, aucun fonctionnement publié déduit de ces résultats.
