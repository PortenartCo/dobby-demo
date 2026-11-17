# DOBBY V7 — audit d’intégration en lecture seule

État observé le 16 novembre 2026 vers 23:04 UTC. Aucun changement du dépôt, de branche, de GitHub ou de service distant effectué par cet audit. Aucune donnée familiale réelle. Aucun `AGENTS.md` suivi dans l’arbre main du dépôt.

## Sources figées et état GitHub

| Lot | Branche | HEAD exact | État |
|---|---|---|---|
| Principal publié | `main` | `521c9199ac18cb71b2fbbd2717ded2f7781aa4db` | Pages built ; dernier changement : aperçu Archives additif |
| Archives / Stitch22 | `feat/dobby-v7-archives-stitch22-20261113` | `f5f2698b7c011846ea85c9b3ed2725561bbf2275` | [PR17](https://github.com/PortenartCo/dobby-demo/pull/17) ouverte, draft, non fusionnée, mergeable |
| Notes / Stitch23 | `feat/dobby-v7-notes-stitch23-20261116` | `1913e981a6437252569306e88b59f65c66a8b2fc` | [PR18](https://github.com/PortenartCo/dobby-demo/pull/18) ouverte, draft, non fusionnée, mergeable |
| Contacts / Stitch24 | introuvable | aucun SHA livré vérifiable | intégration globale bloquée tant que la source n’est pas fournie |

La recherche Contacts est exhaustive pour les objets actuellement exposés par le dépôt : 55 refs `heads`, 18 PR tous états, recherches de commits `Stitch24` et `Stitch 24`, historique local des refs depuis le 13 novembre. Aucun nom/titre de branche ou PR Contacts/Stitch24 ; aucune correspondance de commit. Cela n’exclut pas un travail dans un autre chat ou un répertoire non poussé. L’ancien registre Contacts déjà présent dans main ne constitue pas une livraison Stitch24.

Commits récents Archives :

- `f5f2698b7c011846ea85c9b3ed2725561bbf2275` : attente du rendu de l’historique et préparation de l’aperçu, 16/11 22:58:52 UTC ; modifications de tests et preuves uniquement depuis le commit applicatif.
- `4dcb35d36969ce9805fa1947bc2e909857ebd6df` : consultation native en lecture seule et réactivation, 16/11 22:55:06 UTC.
- `aeed16e108fa7f3c7323eec244a9b4079c21160f` : clôture documentaire de la passe précédente ; c’est la source de l’aperçu actuellement publié, pas la correction finale.

Commits Notes :

- `1913e981a6437252569306e88b59f65c66a8b2fc` : bundle isolé créé depuis `bf12e96`, 16/11 22:39:30 UTC.
- `bf12e96ab97a73b881938657f0c268adee874aae` : application, tests, captures, 16/11 22:38:34 UTC.
- Parent : `521c9199ac18cb71b2fbbd2717ded2f7781aa4db`.

## Checks réels et portée des preuves

PR17 au HEAD `f5f2698` :

- [Run PR fonctionnel 43975135971](https://github.com/PortenartCo/dobby-demo/actions/runs/43975135971) encore `in_progress` à la dernière lecture, mais le job [archives-acceptance 133677062703](https://github.com/PortenartCo/dobby-demo/actions/runs/43975135971/job/133677062703) est déjà **failure**.
- Cause exacte : `essai-stitch-v7/tests/archives-review.cjs:9:86`, assertion que le texte de `[data-e07-dinner]` contient `TEST recette conservée`. Le scénario injecte une recette archivée planifiée puis ouvre Taverne ; l’assertion immédiate échoue. Cet audit ne permet pas de distinguer défaut produit et attente insuffisante du test.
- Avant l’échec : 14/14 tests writer/sync verts ; Archives UI 320/390/768/1440 verts ; `ARCHIVES_SOURCES_PASS` vert.
- L’orchestrateur exécute ensuite `register-documents-sync`, `archives-native-consultation`, `archives-consultation-races` : ces suites ne sont donc pas atteintes dans ce job échoué. Les preuves locales antérieures restent disponibles mais ne rendent pas cette CI verte.
- [Sync PR 43975135837](https://github.com/PortenartCo/dobby-demo/actions/runs/43975135837) : success. `reserves-sql-local` : success. `source-backed-browser` : encore in_progress à la lecture. Le doublon push fonctionnel a été annulé.
- Les liens CI du corps de PR17 pointent encore vers les runs du commit applicatif précédent `4dcb35d`, pas vers le dernier HEAD `f5f2698`. Utiliser les checks au SHA exact.

PR18 au HEAD `1913e98` :

- [Run PR 43972335161](https://github.com/PortenartCo/dobby-demo/actions/runs/43972335161) et [push 43972168883](https://github.com/PortenartCo/dobby-demo/actions/runs/43972168883) : success ; jobs `source-backed-browser` et `reserves-sql-local` verts.
- Le rapport embarqué documente 444 tests natifs, Notes aux quatre largeurs, Agenda/Mémos aux trois largeurs, Contacts/Notes/Listes à 320/390, deux profils fictifs et HTTP intercepté, builder et aperçu Chromium, 48 captures.
- Les scripts nouveaux `notes-stitch23.cjs`, `notes-review-build.test.cjs` et `notes-preview.cjs` ne sont pas explicitement appelés par les workflows ou `tests/ci.cjs` de ce HEAD : leurs preuves sont locales et doivent être rejouées sur la composition finale. Les variantes `fam-agenda-memos*.cjs` sont également des campagnes locales ciblées.
- La revue indépendante déclare avoir inspecté les preuves, sans relancer les 444 tests. Les fixtures HTTP ont été corrigées pour le contrat d’identité fictive et la route Notes actuelle ; le rapport conserve l’échec de fixture antérieur.

Limites communes : données et comptes fictifs, synchronisation réelle entre les deux comptes familiaux différée, aucun essai physique iPhone/tablette, aucune validation Auth/RLS/Storage distante nouvelle, aucune migration ni ouverture de droits. Les 56 contrôles Archives sont un tableau de PASS techniques locaux complété par CI/publication ; le contrôle de CI finale n’est pas clos au HEAD observé.

Références de preuves :

- `docs/dobby-v7/archives/final-review/REVIEW.md` et `CONTROLES-56.md` au SHA `f5f2698`.
- `docs/dobby-v7/notes-stitch23/RAPPORT.md`, `REVUE.md` et `evidence/` au SHA `1913e98`.

## Composition et ordre recommandé

Un seul chemin source est modifié par les deux PR : `essai-stitch-v7/family-register.js`. Les changements Archives ajoutent les filtres de visibilité et de statut aux contacts et mémos ; Notes change le rendu, les alertes et l’accès direct aux mémos locaux. La fusion à trois blobs, base `a4190bb3b1b2fd95995e33dbce09ffb31c77614c`, ne produit **aucun conflit textuel** dans ce fichier. Une vérification sémantique reste nécessaire : notes locales et partagées archivées absentes des listes actives, consultation canonique puis réactivation conservée, pas de fuite entre foyers, portées locales/familiales distinctes y compris avec IDs identiques.

Ordre conseillé dans la seule branche d’intégration : figer les SHA, intégrer d’abord Archives `f5f2698` (surface transversale), puis Notes `1913e98`, puis Contacts/Stitch24 seulement après livraison identifiable. Garder les PR sources en brouillon et l’état global explicitement incomplet. Ne pas annoncer la recette finale verte avant correction/retest de l’échec Archives et exécution des suites ciblées sur la composition. Le dernier changement main est un dossier d’aperçu additif ; il ne modifie pas les sources applicatives de `a4190bb`.

## Publication / aperçu existants

GitHub Pages utilise le mode `legacy`, source **`main:/`**, HTTPS imposé, URL `https://portenartco.github.io/dobby-demo/`. Le dernier build Pages `1375834879` est `built`, sans erreur, commit **`521c9199ac18cb71b2fbbd2717ded2f7781aa4db`**, créé 20:40:25 et achevé 20:42:20 UTC. Il n’existe pas de workflow de déploiement Pages dans le dépôt : les trois workflows suivis sont fonctionnel Stitch, Sync local et probes HTTP locaux. Une mise à jour de main publie automatiquement le contenu statique.

Le commit `521c919` ajoute exclusivement `essai-dobby-v7-archives-pr17-aeed16e-20261116/` : **361 fichiers ajoutés, 40 anciens objets racine identiques** au parent `a4190bb`. Son manifeste désigne la source `aeed16e108fa7f3c7323eec244a9b4079c21160f`, stockage propre, authentification/backend désactivés, CSP/runtime bloquant le réseau externe. Le dossier inclut README, manifeste d’empreintes, précontrôle, captures locales et scripts de comparaison HTTP/navigation.

L’audit a comparé en HTTP le 16 novembre les octets de `index.html`, `essai-stitch-v7/famille.html`, le manifeste de l’ancien aperçu et son `archives-register.js` : HTTP 200 et identité exacte au commit `521c919` pour les quatre ressources. Cela confirme le SHA publié sur ces ressources ; cela ne remplace pas une recette complète de l’aperçu corrigé. La preuve `published-before.json` embarquée contient un état de référence de 150 fichiers ; aucun reçu `published-after.json` n’est inclus dans ce commit.

Notes est actuellement fourni par une URL raw.githack immuable au SHA de branche ; son bundle n’est pas présent dans le main publié. Ne pas le confondre avec une publication Pages.

Choix retenu après cet audit : aperçu immuable raw.githack du bundle isolé poussé sur la branche d’intégration, comme Notes. Aucun changement de main tant que Contacts/Stitch24 manque. Le SHA de l’URL doit être celui du commit contenant le bundle ; le manifeste garde distinctement le SHA source applicatif et son espace de stockage propre. Cet aperçu ne vaut pas recette familiale réelle ni livraison globale complète.

Procédure Pages disponible pour une publication additive ultérieure, si elle est autorisée :

1. Construire depuis un commit propre et figé de la branche d’intégration avec l’enveloppe de revue existante ; nouveau dossier et **nouveau namespace unique** pour localStorage, IndexedDB, canaux/reset et backend fictif. Ne pas réutiliser tel quel le préfixe Notes fixe `dobby-review-v7-notes-stitch23-20261116|` pour une seconde publication.
2. Documenter le SHA source, les transformations de l’enveloppe et chaque empreinte ; marquer Contacts/Stitch24 et recette familiale réelle comme non validés. Toutes les opérations restent fictives.
3. Vérifier localement navigation, CRUD/cancel, réactivation Archives, Notes, absence de réseau externe, ressources chargées, reload/reset et sentinelles des stockages réels/anciens aperçus.
4. Préparer une branche de publication dédiée depuis le **main courant** et une PR dont le diff ne contient que le nouveau dossier construit. Comparer tous les objets racine déjà présents au parent et conserver leurs IDs. Ne pas fusionner la branche applicative pour obtenir cet aperçu.
5. Les filtres de chemins CI existants ne couvrent pas un nouveau dossier `essai-dobby-…` seul : prévoir des preuves explicites de validation de l’artefact ; l’absence de checks n’équivaut pas à PASS. Après fusion autorisée de cette seule PR, attendre Pages au commit exact, comparer les ressources à l’artefact et à la référence préservée, puis recetter l’URL publiée.

Le builder Archives actuel `scripts/build-archives-review.cjs` réutilise `build-dobby-review.cjs --profile integrated`, impose une source commitée et un nom dérivé de son SHA. Il est spécialisé PR17 ; une enveloppe d’intégration doit adapter ses libellés/fixtures et son identité tout en conservant ces invariants. Le builder Notes réutilise les builders Famille/Global et un HTTP fictif local au navigateur. Aucun nouveau service n’est nécessaire.
