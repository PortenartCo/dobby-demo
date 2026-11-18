# PR #26 — Finalisation CI de la preuve saisonnière

HEAD de départ : `364056cf0270464e9abfd6299a3dd67e832cd5b2`.
Échec reproduit : [run 44163503413](https://github.com/PortenartCo/dobby-demo/actions/runs/44163503413), `source-backed-browser` → PREP-01 ; trois tests transversaux (40, 43 et 50 dans la campagne agrégée).

## Cause et correction

L’insertion saisonnière dans `build-source.cjs` était présente et fonctionnelle, mais absente de la chaîne de preuve des amendements. Le contrôle Archives recevait donc directement le fichier complet saisonnier au lieu de son parent historique.

- Parent intégral au commit `2f2f38b197a96ee2ae3593545f822002a452e859` : `73a1112110032801d1d0150e040d12f8292bca38a47af92a6692ede8b441f0f2`.
- Source saisonnière livrée au commit `a81f8a6cb29a0876486ced626bb7966c6eeb0831` : `8d91e652a62dba7112f452bda23d02238dc27915e70c227709763cdfd8f31fc6`.

Le nouveau manifeste `essai-stitch-v7/tests/fixtures/seasonal-source-extensions.json` décrit une seule insertion littérale : `seasonal-calendar.js`, `seasonal-effects.css`, `seasonal-effects.js`, immédiatement avant la feuille Family existante. Son inverse reconstruit chaque octet du parent complet ; les contrôles Archives puis Maison existants poursuivent ensuite leur reconstruction historique habituelle.

Aucun hash historique n’a été remplacé. Les 11 manifestes antérieurs sont épinglés et restent inchangés. Le contrôle exige l’empreinte complète actuelle, l’occurrence unique du littéral et l’empreinte complète du parent reconstruit. Les mutations négatives couvrent une modification étrangère, un ancien fichier valide utilisé à la place du fichier courant, les hashes courant/parent falsifiés et une insertion dupliquée. Modifier uniquement le nouveau hash courant ne suffit pas à accepter une modification étrangère.

## Vérifications locales

1. `node --test essai-stitch-v7/tests/fam-integration-transverse.test.cjs` : avant correction **10/13**, mêmes trois échecs ; après correction **14/14**, y compris la nouvelle preuve et ses cas de falsification.
2. `CHROMIUM_PATH=/usr/bin/chromium DOBBY_SEASONAL_EVIDENCE=/tmp/dobby-seasonal-ci-finalization npm run test:seasonal --prefix essai-stitch-v7/tests` : **réussi** : 7 tests calendaires, parcours 320/390/768/1440, changements de jour/année et revue isolée (353 ressources vérifiées).
3. `git diff --check` ; différence de tous les fichiers applicatifs hors tests par rapport au HEAD de départ : **vide**. Le calendrier, les préférences, les quatre pages générées, le constructeur, le CSS, les illustrations et le contrôleur de revue restent identiques.

Les contrôles GitHub des nouveaux commits sont suivis jusqu’à leur résultat final. Aucun workflow n’est désactivé ou modifié par cette correction. La PR reste en brouillon ; aucune fusion, publication ou écriture Supabase.

Journaux : [reproduction](evidence/ci-finalisation/transverse-before.log), [14/14 après correction](evidence/ci-finalisation/transverse-after.log), [saisonnier](evidence/ci-finalisation/seasonal.log).
