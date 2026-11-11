# Relecture ciblée — reprise de la campagne CI

11 novembre 2026. Périmètre exclusif : `/workspace/scratch/integrated-ci-continuation-fix.diff`, soit le workflow Stitch, `ci-scope.json`, `tests/ci.cjs` et `tests/register-tools.cjs`. Cette relecture ne rouvre pas la revue fonctionnelle générale. Aucun test, build, navigateur ou campagne répété ; seul ce rapport est écrit.

**Verdict : favorable à cette reprise ; aucun finding matériel confirmé.** La phase 1 demeure un run en échec et la phase 2 devra exécuter le reliquat avant toute conclusion globale.

## Cause et test corrigé

Les preuves `ci-phase1.json/log` identifient le run [43034934112](https://github.com/PortenartCo/dobby-demo/actions/runs/43034934112), source `87421ca68e53bdb892576495ba93afb906462dff`. Les étapes syntaxe, natifs, builders, scoring, génération reproductible et manifeste sont vertes. Le job des corrections termine par `INTEGRATED_REVIEW_CHECKPOINTS_PASS 12`. La campagne historique échoue ensuite dans `register-tools.cjs` lors du clic sur la mission datée du 1er janvier 2027, après les contrôles visuels du lot 4. Cette date est hors de la période de sept jours imposée par la spécification.

À `tests/register-tools.cjs:6`, le nouveau helper sélectionne `all` par le contrôle réel et ouvre les sections éventuelles. Ses deux appels suivent les retours natifs sur Missions. La fixture conserve sa date, ses writers et les 27 appels d’assertion historiques : comparaison du diff et comptage indépendant en lecture seule, 27 avant et 27 après. Aucune assertion métier n’est retirée ou affaiblie. L’autre changement redirige facultativement les captures afin de préserver les anciennes preuves. Le journal ciblé fourni indique `REGISTER_TOOLS_PASS 320` et `390` ; il n’a pas été reproduit par le relecteur.

## Garde de reprise

- `tests/ci.cjs:6` exclut exactement quatre fichiers liés à cette correction : workflow, configuration de campagne, runner et seul test en échec. Tous les autres fichiers suivis hors `docs/`, y compris les sources et les tests déjà passés, participent au hash Git avec leurs modes, chemins et blobs.
- Le hash recalculé directement sur la source de phase 1 est `54fab7e400b78a82ab19db382d5f8ba86df4b6106313552cf12183069815015d`. Il correspond à la valeur configurée et au HEAD disponible pendant la relecture. Le diff effectif par rapport à `87421ca` ne présente aucun autre changement hors documentation.
- À `tests/ci.cjs:15`, seuls les appels précédant `register-tools.cjs` sont omis lorsque le hash correspond. L’appel de ce test désarme la reprise ; `register-visual.cjs` pour le lot 5 et tous les tests suivants sont exécutés normalement. Le fichier `register-visual.cjs`, invoqué plusieurs fois dans la campagne, n’est donc pas omis après la reprise.
- Une modification d’une source ou d’un test protégé fait diverger le hash et réactive l’exécution complète. `DOBBY_FINAL=1` désactive explicitement la reprise. Les erreurs enfants conservent leur code d’échec ; la garde finale refuse une campagne dont le point de reprise n’a jamais été rencontré.
- Le mode `DOBBY_CI_VERIFY_ONLY=1` transmet seulement le booléen calculé au workflow, sans exécuter de test. Les conditions du workflow réutilisent alors les étapes et les douze checkpoints effectivement verts en phase 1. Le contrôle du registre reste exécuté ; l’étape navigateur du reliquat reste exécutée. En cas de hash différent, les étapes précédemment réutilisées redeviennent actives dans les deux jobs.

Le harness `ci-continuation-guard.cjs` et son résultat fourni ont été lus : état correspondant, changement source, changement d’un test passé, changement limité au test échoué, documentation seule, forçage complet, erreur enfant et point de reprise absent. Il simule le runner et ses sous-processus ; son PASS ne doit pas être décrit comme une nouvelle campagne navigateur. Le branchement `verify-only` et les conditions YAML ont été vérifiés par lecture, sans prétendre un test supplémentaire de GitHub Actions.

## Limites et présentation des résultats

La confiance de cette reprise repose sur un checkout CI propre et le diff précisément relu. Le hash inspecte l’arbre commité, pas des modifications locales non commitées. Les quatre fichiers explicitement exclus peuvent modifier l’orchestration et demandent donc cette relecture humaine ; le dispositif ne certifie pas automatiquement leurs futures modifications. Dans le workflow examiné, le contrôle intervient immédiatement après checkout/setup et avant génération ou installation de dépendances.

La preuve de phase 1 est conservée avec sa conclusion `failure`. Le futur rapport doit distinguer les contrôles verts réutilisés à `87421ca`, le GREEN ciblé du test corrigé et l’exécution réelle du reliquat en phase 2. Il ne doit pas annoncer que les tests réutilisés ont été rejoués au nouveau SHA. Aucune réussite de phase 2, aucune nouvelle validation produit globale ni autorisation de publication n’est accordée par cette relecture.
