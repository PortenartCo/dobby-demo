# Revue indépendante du builder de l’aperçu E03–E06

Date : 2026-11-11. Révision examinée : `195ddf4a1da6e60dd237c9406de2cf1658493a45`, diff fourni `/workspace/scratch/integrated-preview-review.diff`.

## Périmètre et méthode

Revue en lecture seule de `scripts/build-dobby-review.cjs` et du nouveau `essai-stitch-v7/tests/review-integrated-preview.test.cjs`, au regard des §1, §10 et §11 de `REVIEW-E03-E06-20261111-SPEC.md`. Le runtime, la configuration et le test builder existants ont été lus comme contexte, sans élargir la revue aux modifications des autres auteurs. Aucun test, build, navigateur, appel backend, push ou publication n’a été exécuté. Le présent rapport est le seul fichier écrit.

La preuve fournie `preview-green.txt` consigne deux tests builder PASS, zéro échec. Ces résultats sont repris comme preuve fournie, sans répétition ni validation indépendante de leur environnement d’exécution.

## Finding matériel

### P2 — Le manifeste peut déclarer propre une source d’actifs modifiée — CORRIGÉ

**Localisation :** `scripts/build-dobby-review.cjs:32`, champ `sourceDirty` (copie concernée : ligne 20).

Le nouveau calcul de `sourceDirty` restreint `git status` à `essai-stitch-v7`, `essai-stitch-v5-famille`, au builder et à `scripts/review`. Or le bundle copie aussi `essai-v6-preview/assets`. Par exemple, si seule l’image suivie `essai-v6-preview/assets/v6/famille.png` diffère de HEAD, le builder embarque ses nouveaux octets tout en déclarant `sourceDirty:false` et le SHA de HEAD. Un checkout de ce SHA ne permet alors pas de reproduire l’aperçu annoncé comme issu d’une source propre.

Les hashes par fichier permettent de détecter l’écart, mais ne remplacent pas les octets absents du commit. Inclure toutes les racines copiées dans le calcul de saleté, idéalement depuis la même liste que celle utilisée pour la copie. Le nouveau test, lignes 18–19, compare deux builds du même état local ; il ne couvre pas cette omission de provenance.

Constat établi par lecture du chemin de copie et du pathspec Git ; scénario non exécuté conformément à la consigne de ne pas modifier les sources ni répéter les tests.

**Vérification ciblée du correctif :** diff `/workspace/scratch/integrated-preview-provenance-fix.diff` relu le 2026-11-11, sans exécution supplémentaire. La ligne 32 inclut désormais `essai-v6-preview/assets` dans le pathspec de `sourceDirty`, couvrant les trois racines copiées. Le nouveau cas de test (lignes 23–39) crée un dépôt Git temporaire minimal, vérifie `sourceDirty:false` après commit, puis modifie uniquement un actif V6 suivi et attend `sourceDirty:true`. Les sources applicatives du dépôt réel ne sont pas modifiées par ce cas ; les sorties sont placées hors du dépôt fixture et supprimées en fin de test.

Les preuves fournies `preview-provenance-red.txt` et `preview-provenance-green.txt` montrent respectivement l’échec causal attendu (`false !== true` sur l’actif modifié) puis un PASS, zéro échec. La correction répond au finding initial sans autre changement fonctionnel du builder. **Finding clos ; aucun finding matériel restant dans le périmètre relu.** Cette conclusion repose sur le diff et les journaux fournis, sans répétition du test par le relecteur.

## Conformité constatée

- **Profil et destination distincts :** `integrated-e03-e06` sélectionne une nouvelle destination par défaut (lignes 3–4). Toute destination déjà existante est refusée avant écriture (ligne 5). Le code n’écrit ni dans un ancien aperçu ni sur `main` et ne contient aucune commande de publication.
- **Stockage distinct :** le préfixe `dobby-review-e03-e06-20261111|` apparaît dans la configuration et le manifeste (lignes 26 et 32). Le runtime existant applique ce préfixe au stockage local/session et à IndexedDB. La configuration ancienne n’est pas modifiée ; aucun état d’effets OFF historique n’est importé dans ce nouvel espace.
- **Sources canoniques :** les arborescences applicatives sont copiées directement, sans remplacement par une ancienne sortie statique (ligne 20). Les transformations héritées restent limitées à l’enveloppe HTML, à l’association fictive et aux protections de connexion. Le nouveau test compare quatre modules canoniques octet par octet (ligne 17).
- **Références et intégration :** les deux références canoniques de la spécification et la base commune sont inscrites dans le manifeste. Les deux commits référencés sont disponibles ; la vérification séparée par `git merge-base --is-ancestor` confirme que E01–E05 (`e2a8e1d…`) est ancêtre de `195ddf4` (code 0), tandis que le SHA original E06 (`7386187…`) ne l’est pas (code 1). La provenance E06 repose sur sa réapplication par cherry-pick (`f09c270`, `2adf4a8`, `42599df`), sans fusion des branches originales.
- **Provenance et reproductibilité :** le manifeste conserve le SHA de HEAD, les références, les hashes source/sortie, les transformations, les hashes du runtime et de la configuration, ainsi que le statut local des sources couvertes. Aucun horodatage variable n’est ajouté au build. Les deux builds comparés par le test couvrent les mêmes entrées locales. Le correctif ciblé étend la détection d’état local à toutes les racines copiées ; le finding initial est clos.
- **Backend réel :** le nouveau profil réutilise l’enveloppe existante chargée avant l’application : CSP locale, filtrage fetch/XHR, désactivation de sendBeacon et protections de login. Le builder effectue uniquement des copies/écritures locales et des lectures Git. Aucun nouveau chemin de connexion réelle n’est introduit dans le diff.

## Verdict et limites

**Conformité :** aperçu local isolé conforme sur le profil, le stockage, les sources canoniques, la conservation des anciens aperçus, le signalement de provenance et l’absence de publication automatique. Le finding P2 initial est corrigé dans le diff complémentaire relu.

**Qualité :** changement restreint, manifeste exploitable et tests ciblés utiles, dont un cas causal couvrant la régression de provenance. Les deux PASS initiaux et le PASS ciblé complémentaire fournis justifient uniquement `TESTS_PASS` pour les tests builder consignés. Cette revue statique ne suffit pas à attribuer `INTÉGRATION_VÉRIFIÉE`, `PRÊT_À_PUBLIER` ou `FONCTIONNEMENT_PUBLIÉ`.

La revue ne vérifie ni les corrections fonctionnelles E03–E06 des autres auteurs, ni les parcours E01–E08 en navigateur, ni le rendu aux trois résolutions, ni la persistance après rechargement. L’absence de trafic backend est étayée par lecture des protections existantes, pas par une capture réseau. Les protections contre un répertoire de sortie déjà existant sont lisibles mais ne font pas l’objet d’un cas négatif dans le nouveau test. Aucun ancien aperçu n’a été comparé après exécution, puisqu’aucun build n’a été lancé pendant cette revue.
