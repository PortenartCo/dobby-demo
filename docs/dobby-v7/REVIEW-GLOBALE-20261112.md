# DOBBY V7 — Revue globale du 12 novembre 2026

## Livraison

État : candidate en validation. La publication et la recette hébergée seront renseignées après vérification ; ce document intermédiaire ne constitue pas un DONE.

URL cible : https://portenartco.github.io/dobby-demo/essai-dobby-v7-global-review-20261112/

Branche source : `feat/dobby-v7-global-review-20261112`.

## Références et périmètre

| Source | SHA demandé / relevé avant intégration | Traitement |
|---|---|---|
| Socle historique | `69ef361ad139356c2d1473d825f9231e7610b0e4` | ascendant E07 et E09 |
| E07-P01/P02 | `c510ded81ee075c9b180e2551257351c557e541a` | base intégration, CI `43127930111` réussie |
| E09 Salon/Mémos | `8918068f9d53a1f7007a09dcf100ffaee3e9ec15` | 4 commits applicatifs `2496380`, `965645d`, `01d35be`, `1578ef4` intégrés ; dernier commit de preuves consulté |
| Runes / compatibilité Missions | `1b9b89106aabea83081a2ba42d64e43a4308092c` | réconciliation native des changements nécessaires et de leurs dépendances |
| Partage Runes | `0a8e1ed674bc4abdbfaca29435fa495b19b32df4` | inclus dans l’historique Runes, sans double application |
| Courses contrôle | demandé `dbb61df9d46a414ef1dadd29a849955b44c93bc7`, HEAD `f31659e5baead39c9188f4a18e7fc793585da505` | évolution limitée à documentation et preuves hébergées ; aucun delta applicatif |

Relevé brut : [source-heads.txt](evidence/global-review-20261112/source-heads.txt).

Modules attendus dans la candidate : E01 Accueil, E02 conversation/commandes existantes, E03/E04 Missions et Runes, E05 Profil, E06 première connexion/Rituel/Choixpeau, E07 Taverne/Midi/Soir/Courses, E08 Contrats/assurances, E09 Salon/Membres/Agenda/Mémos.

## Réconciliation

- `scripts/build-dobby-review.cjs` : conflit réel entre ajout du profil E07-P01 et ajout E09. Réconciliation des options, destinations, configurations et champs du manifeste, avec maintien des deux profils.
- `family-modules.js` (commit `990c48660d9060554a4d236d72a7c8a92b3b664d`) : réconciliation sémantique E09/Runes dans le writer familial existant. Les mémos partagés `sharedFamilyNotes` restent dans le payload familial versionné ; `familyNotes` reste privé jusqu’à import explicite. Le ledger Missions/Runes conserve son protocole atomique et ses gains identifiés. Dépendances sources `821acbf` / `ed1585f` (récurrences et récompenses personnalisées), `fff0c8e` (client V2), `f1aff5a` (reprise explicite des anciennes missions). Les propositions SQL de ces branches restent exclues. Les champs inconnus des Missions bloquent une conversion qui les perdrait, avant toute écriture ; ils ne sont pas supprimés.
- `family-v2.js` : le client Courses natif E07 reste la source de vérité, y compris disponibilités et révisions. Le domaine et l’attente du démarrage sont transformés seulement dans la copie générée de démonstration.
- La source canonique est régénérée ; le manifeste distingue empreintes source et empreintes des copies transformées.

## Isolation et limites

Données explicitement fictives ; stockage et IndexedDB propres à cette version, séparés par client A/B. Le transport HTTP de démonstration est exécuté localement dans le navigateur et identifié comme tel. Les deux onglets doivent utiliser le même navigateur et la même origine HTTPS (ou localhost).

Aucun compte familial réel, aucune authentification réelle, aucune écriture Supabase, aucune migration SQL et aucun appel IA payant autorisé dans cet aperçu. Aucun déploiement applicatif général. La migration proposée `at_home_quantity` n’est pas appliquée.

Les anciens clients qui ne comprennent pas les mémos familiaux versionnés ou le ledger Runes V2 restent incompatibles avec ces opérations partagées. Les gardes, conflits et reprises sont à distinguer d’une recette avec deux comptes réels. Le partage de cet aperçu ne prouve ni RLS, ni RPC PostgreSQL réel, ni livraison réseau Supabase.

Safari/iPhone, commandes vocales et appareils physiques ne sont pas validés par la campagne Chromium. Les blasons officiels et autres limites historiques sont conservés ; aucune refonte esthétique générale n’est engagée.

## Preuves et résultats

- Baseline native après E09 : 119 tests, 119 réussis, 0 échec ([journal](evidence/global-review-20261112/baseline-native.log)).
- Tests natifs après réconciliation : `node --test essai-stitch-v5-famille/tests/*.test.mjs` → 186/186, 0 échec ([journal](evidence/global-review-20261112/native-final.log)).
- Tests des générateurs integrated/E07-P01/E09 → 3/3 ([journal](evidence/global-review-20261112/build-boundaries.log)). `global-build.test.cjs` → 1/1, couverture exacte de tous les fichiers publiés et refus d’écrasement.
- Catalogue E07 après correction de l’état intermédiaire → 320/390/1440 réussis ([journal](evidence/global-review-20261112/catalogue-stable.log)).
- Récurrences, montants personnalisés et presets natifs : trois scripts Chromium réussis ([recurrence](evidence/global-review-20261112/browser-recurrence-writer.log), [writer](evidence/global-review-20261112/browser-rewards-writer.log), [presets](evidence/global-review-20261112/browser-rewards-preset.log)).
- Revue indépendante de la réconciliation native : aucun défaut actionnable. Revue indépendante du harness : P1 reset incomplet reproduit sur pièce jointe native ; correction complète et reprise d’interruption validées en `404c5cd`, puis relecture indépendante sans réserve bloquante.
- CI initiale `43130740616` synchronisation réussie ; `43130740640` arrêt sur assertion historique des compensations Runes. Le résultat final sera donné séparément après correction et campagne finale.
- Recette globale locale après reset : 320/390/1440 réussis, SHA `a8ef0d30af55f26db3e748071841aedf91ee07f1` ; [preuves](evidence/global-review-20261112/after-reset/summary.json). La correction ultérieure `404c5cd` porte sur la reprise d’un reset interrompu et dispose de sa régression ciblée. Recette hébergée et CI finale à compléter.

## Anomalies

| Priorité | Constat | Suite |
|---|---|---|
| P1 résolu | Reset initial conservait des pièces jointes/timers/backups fictifs secondaires ; une fermeture interrompue pouvait laisser un verrou orphelin. | Corrections `2961715` puis `404c5cd`, deux reproductions RED→GREEN, reprise sous Web Lock. Revue indépendante : les deux constats sont levés. |
| P2, revue visuelle | Éditeur d’un mémo partagé : mentions héritées « Plumier privé / Conservation locale » malgré le statut partagé natif affiché en bas. | Clarifier le libellé lors de la revue E09 ; aucun traitement de données réelles dans cet aperçu. |
| P2, revue visuelle | À 320 px, les longs noms fictifs se replient fortement dans les cartes d’attribution de mission. | Utilisable sans débordement ; arbitrage de présentation différé. |
| P3 | L’Agenda revient au jour courant après rechargement ; sélectionner à nouveau la date retrouve l’événement enregistré. | Conservation de la date sélectionnée à arbitrer. |

La qualification finale sera actualisée après recette stable. Les erreurs des états intermédiaires ne sont pas assimilées au résultat final.

## Revue dirigée avec ChatGPT

1. Ouvrir l’URL, lire les informations de démonstration et conserver un seul client A pour la première passe.
2. E01 : synthèse et liens vers missions/repas/événements ; tester navigation et retour.
3. E02 : commande existante, résultat et destination ; ne pas activer de service externe.
4. E03/E04 : créer/attribuer/terminer une mission, vérifier un seul gain et son historique.
5. E05/E06 : profil, Maison/Patronus, reprise d’un questionnaire et confirmation.
6. E07 : choisir Midi/Soir, quantités et liste unique ; ouvrir B pour les disponibilités partagées simulées.
7. E08 : consulter puis modifier un contrat fictif ; contrôler persistance et retour.
8. E09 : membres, événement, mémo familial ; synchroniser B et tester reprise.
9. Terminer par 320, 390 et 1440 px, puis les captures ; relever séparément les corrections fonctionnelles et les arbitrages esthétiques. Ne lancer aucune refonte automatiquement.

Pour chaque observation : module, client, largeur, étapes, attendu, constat, capture, priorité P0 (blocage/perte), P1 (fonction incorrecte), P2 (ergonomie/navigation/visuel), P3 (amélioration).

## Retour arrière

La livraison ajoute uniquement un répertoire autonome sur `main`. En cas de retrait, préparer un commit supprimant uniquement ce nouveau dossier, sans modifier les autres aperçus ; aucune donnée distante n’est à restaurer. Ce retrait n’a pas été exécuté ni testé. La réinitialisation de démonstration ne concerne que son préfixe et ses clients fictifs.
