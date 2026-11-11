# Runes V2 — reprise contrôlée d’un registre Missions sans version

Branche : `fix/dobby-runes-v2-legacy-missions-20261112`, issue de `b92f5f398ecf5a70aa6591215c8a100c53e39c71`.

SHA du client testé : **À RENSEIGNER après le commit final**.

Aperçu distinct prévu : <https://portenartco.github.io/dobby-demo/essai-dobby-runes-v2-legacy-review-20261112/>. La publication et ses vérifications HTTP restent à consigner ci-dessous. Le précédent `essai-dobby-runes-v2-pilot-20261111/` doit rester inchangé.

## Correctif livré

L’absence de `runeLedgerVersion` devient un état de reprise à examiner. Elle ne satisfait jamais le validateur V2 et ne permet ni récupération automatique de la version familiale ni remplacement des données locales. La capacité RPC V2 doit toujours être confirmée pour le contexte utilisateur/foyer courant.

La reprise relit la ligne distante puis enregistre une sauvegarde dans le stockage IndexedDB natif. Elle relit cette sauvegarde et vérifie son contenu avant de proposer une action. Le fichier téléchargeable contient les données Missions locales, les demandes de runes, l’indicateur de synchronisation, la ligne distante brute et tout l’état du module, dont l’opération en attente, les conflits précédents et les opérations archivées. Aucun stockage existant n’est réinitialisé.

Le cas pris en charge est la ligne familiale observée : révision 2, version absente, aucune mission manuelle ni attribution distante, avec ou sans tâches automatiques. Les missions distinctes des deux côtés sont réunies. Si une même identité porte des contenus différents, les deux variantes sont visibles et l’utilisateur choisit explicitement les variantes de l’appareil ou celles du foyer ; ce choix conserve toutes les autres missions. Une annulation n’écrit rien.

Chaque écriture passe par le client natif `dobby_missions_v2_write` : opération durable préalable, UUID, révision attendue, contrôle de concurrence et validation du reçu. Une réponse perdue conserve l’opération exacte ; seule une nouvelle revue explicite permet son rejeu. Une opération inconnue n’est ni remplacée ni archivée. L’archivage d’un refus atomique établi exige un choix explicite et conserve intégralement l’opération avant d’en proposer une nouvelle.

Si un autre compte a déjà converti le foyer en V2, la revue et sa nouvelle sauvegarde restent obligatoires ; les boutons de récupération natifs ne peuvent pas contourner l’union. Les empreintes locales, la révision distante et le contexte de connexion sont revérifiés après les attentes asynchrones. Une édition pendant la sauvegarde ou l’archivage impose une nouvelle revue.

Pendant l’application d’un reçu de reprise uniquement, les missions propres au dernier état local ou à la confirmation distante sont conservées si le rebase natif les avait interprétées comme des suppressions. Un conflit explicite bloque alors la synchronisation suivante. Les arbitrages natifs des modifications portant sur une même identité restent applicables ; UUID, contenu envoyé, révision attendue et historique de runes ne changent pas.

Le projecteur natif pouvait marquer obsolète une tâche automatique dont la source n’existe pas sur l’appareil courant. Cette obsolescence implicite est suspendue uniquement dans l’aperçu de reprise afin de conserver les tâches familiales importées au rendu, à l’enregistrement et au rechargement. La création et les actions explicites des tâches restent natives. Les sources canoniques et les autres aperçus ne sont pas modifiés.

## Limites conservatrices

- Un historique local de runes déjà confirmées et distinct du serveur bloque la reprise : le contrat serveur interdit de l’importer dans une ligne existante. La sauvegarde conserve cet historique ; il n’est ni effacé ni converti artificiellement en demandes.
- Un ancien registre distant contenant des missions manuelles, des attributions ou des demandes non vides exige une analyse distincte et reste bloqué dans ce correctif borné.
- Les versions explicitement incompatibles, champs racines inconnus, collections invalides et identités absentes ou dupliquées ne sont pas normalisés silencieusement.
- Un rejeu qui pourrait proposer une nouvelle écriture omettant des missions distantes reste bloqué avec son opération intacte. Un reçu déjà enregistré peut être rejoué avec le même UUID sans nouvel effet.
- La sauvegarde est locale à l’appareil. Son téléchargement permet d’en conserver une copie hors du navigateur.

## Preuves locales

| Contrôle exécuté | Résultat | Preuve |
| --- | --- | --- |
| Client natif transformé dans des contextes isolés, stockage et transport simulés | **67/67 PASS** | [`legacy-recovery.test.mjs`](../../scripts/runes-pilot/legacy-recovery.test.mjs) |
| Client natif avec PostgreSQL 17.11 réel et deux utilisateurs fictifs | **13/13 PASS** | [`postgres/results.json`](evidence/legacy-missions/postgres/results.json) |
| Navigateur à 320, 390 et 1440 px, avec et sans tâches automatiques distantes ; collision et opération en attente | **8/8 PASS, 286 assertions** | [`browser/browser-verification.json`](evidence/legacy-missions/browser/browser-verification.json) et [24 captures](evidence/legacy-missions/browser/) |
| Génération reproductible, application protégée inchangée et régressions existantes, incluant les 67 contrôles de reprise | **246/246 PASS**, dont 7 contrôles de construction/provenance | [`local-summary.json`](evidence/legacy-missions/local-summary.json), [`local-regressions.tap`](evidence/legacy-missions/local-regressions.tap) |
| CI GitHub sur le SHA final | À compléter | Lien du run à renseigner |

Les 67 contrôles couvrent notamment l’état distant exact, les collections absentes ou vides, les collisions et leur présentation, le contenu de sauvegarde, les erreurs de stockage, l’annulation, les changements de compte, les courses pendant les attentes, le rejeu après rechargement, les refus atomiques, les issues inconnues, la conversion par un autre acteur et la conservation des autres modules. Deux régressions dédiées vérifient qu’un cache restauré sans tâche distante ne publie aucune suppression, et qu’une mission locale supprimée entre-temps ailleurs reste conservée avec un conflit sans republication automatique.

Les 13 tests PostgreSQL emploient les scripts de référence du commit `04c58d9ebaf84374820a5e6a727c45dfa4ee3527` dans un conteneur privé sans réseau, avec des UUID et des claims inventés. Ils vérifient la transition de révision 2 vers 3 et de version absente vers 2, deux acteurs, les reçus, le CAS `40001`, les écritures V1 refusées `42501`, la réponse perdue, le reçu altéré, l’archivage explicite, les choix de collision et la conservation des missions après conversion par l’autre acteur. Le scénario de runes vérifie attribution, annulation, nouvelle attribution et rejeu sans double crédit.

Empreinte du client généré vérifié par PostgreSQL : `0205252621204f92e4ef1f0467897e6731ea61a970a5cc6b5d6ebfe47c18447a`.

Commandes reproductibles :

```sh
node --test scripts/runes-pilot/legacy-recovery.test.mjs
bash scripts/runes-pilot/start-legacy-postgres.sh
node --test scripts/runes-pilot/legacy-postgres.test.mjs
node --test scripts/runes-pilot/build.test.cjs
node scripts/build-dobby-runes-pilot.cjs --legacy-recovery
DOBBY_TEST_ORIGIN=http://127.0.0.1:8898 node scripts/runes-pilot/legacy-browser.cjs
```

La génération exige un répertoire de sortie neuf et refuse d’écraser un aperçu existant.

## Publication et limites de validation

Publication statique isolée, SHA publié, CI, contrôles de fichiers HTTP et parcours hébergés : **À COMPLÉTER après vérification**.

Aucune requête vers le Supabase personnel, écriture distante, migration, modification SQL, de schéma ou de permissions n’est réalisée dans cette mission. Les tests PostgreSQL sont locaux ; les tests navigateur doivent intercepter le transport et utiliser des comptes fictifs. La synchronisation hébergée avec les deux comptes familiaux réels reste à effectuer par l’utilisateur. Aucun résultat local ne la valide.

Les modules Cuisine/Courses et les autres modules, le client canonique et les anciennes publications sont hors changement. Aucune fusion applicative n’est prévue.

## Recette humaine à effectuer ensuite

1. Ouvrir le nouvel aperçu sur l’appareil contenant les données à préserver et se connecter au foyer.
2. Dans le panneau de partage Missions, choisir « Préparer la reprise et sa sauvegarde locale », puis télécharger la sauvegarde. Vérifier les nombres et les éventuelles différences présentées.
3. En cas de blocage, conserver la sauvegarde et le message sans modifier ni vider les données. Une opération à issue inconnue doit garder son identifiant et son contenu.
4. Quand l’utilisateur décidera de poursuivre, choisir explicitement l’union ou les variantes voulues, puis confirmer. **Cette confirmation déclenchera une véritable écriture RPC au nom du compte familial. Elle n’est pas exécutée par Codex dans cette mission.**
5. Après cette décision, vérifier version 2 et données sur le premier compte, puis connecter le second compte et comparer les missions et runes. Renouveler la revue si un autre appareil a changé le foyer.

Arrêt de la mission après publication statique vérifiée, avant toute écriture réelle et avant toute fusion.
