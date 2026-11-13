# DOBBY V7 — audit final documentaire et CI, lecture seule

Candidat : **`c7b20d0`**, branche `feat/dobby-v7-revue-generale-20261113`, après réconciliation avec `main` **`1896a94c587219ecb2de641b1a3cece74c5d6fb1`** via `2c6b235`. Audit avant le résultat final de la PR #9 et avant vérification de publication. Aucun fichier du dépôt modifié par cet audit, aucun test navigateur complet relancé, aucun accès Supabase, aucune écriture de production.

## Conclusion

**Aucun blocage P1/P2 de livraison documentaire ou de portabilité CI démontré.** Une contradiction factuelle mineure subsiste dans le guide SQL Courses ; root l'a reconnue et prévoit sa correction dans la mise à jour documentaire des preuves de publication, sans modifier le candidat runtime de la CI en cours.

### R2 — correction documentaire requise : portée du test SQL Courses

- Fichier : `docs/dobby-v7/revue-generale/supabase/shopping/README.md`, ligne 3.
- Texte encore présent : « Aucun de ces fichiers n’a été exécuté par Codex, localement ou à distance » et « Le SQL n’est pas déclaré validé sur PostgreSQL ».
- Contradiction : le rapport final, le récapitulatif manuel et `revue-generale/evidence/dobby-shopping-sql.log` documentent désormais l'exécution du candidat exact sur PostgreSQL **local isolé**, avec installation/vérification, précision, bornes, CAS, ancien client et retrait conservateur.
- Correction attendue : indiquer que le candidat exact a été vérifié **uniquement en PostgreSQL local isolé**, sans réseau ni données réelles, et qu'aucune exécution/lecture/validation Supabase distante n'a eu lieu. Conserver `ATTENTE_UTILISATEUR` et la distinction métadonnées / RLS-RPC réelles.
- État : signalé à root et accepté pour la mise à jour documentaire finale. Cette incohérence sous-estime les vérifications locales ; elle ne recommande pas une mutation distante supplémentaire.

## Couverture et intégrité des rapports

- `REVUE-GENERALE-LIVRAISON.md` contient **exactement 60 lignes uniques**, sans ID manquant ni ajouté, par comparaison indépendante au registre normatif original `/workspace/dobby-v7-spec/02_REGISTRE_RECETTE.md`.
- `REGISTRE.json` reprend **exactement** les 60 IDs, exigences et critères du registre normatif, pas seulement le nombre de lignes.
- Statuts actuels : **50 `FAIT_TESTÉ_NON_DÉPLOYÉ`, 6 `ATTENTE_UTILISATEUR`, 4 `PARTIEL`**. Aucun statut déployé prématuré.
- Les **69 liens** du rapport principal et les **16 liens** du récapitulatif manuel ont une cible locale existante.
- `node scripts/check-dobby-review60-report.cjs` passe ; syntaxe du validateur et du runner revue générale vérifiée ; `git diff --check` passe.
- Le rapport distingue développement, tests locaux, backend réel et publication. Le contrôle final du SHA/CI/Pages est explicitement encore attendu. Root doit seulement estampiller les statuts de déploiement après preuve réelle des octets et parcours publics servis.
- L'état S10 conserve la confirmation utilisateur historique de la liaison et des Courses de base ; cette confirmation figure bien dans `stitch19-20/INVITATION-REPRISE.md` après la PR #8. Elle n'est pas présentée comme une certification des nouveaux droits enfants.

## Dépendances bloquées : cohérence avec les gates source

| Sujet | Documentation et code vérifiés |
|---|---|
| **M08, participants/Runes V3** | `ATTENTE_UTILISATEUR`. Le contrat dit explicitement que la migration SQL complète **n'est pas fournie**, que les SQL présents sont des contrôles en lecture seule et qu'une prochaine itération doit partir des corps privés réels. `family-modules.js` refuse missions multiples, ledger V3 et allocations dans les writers historiques ; la complétion partagée V3 reste bloquée. Aucun ancien writer déclaré compatible. |
| **F08, rattachement enfant** | `ATTENTE_UTILISATEUR`. Le bouton reste désactivé avec `data-backend-gate="child-account-link"`. Le récapitulatif annonce une invitation ciblée et acceptation atomique **à implémenter**, conserve le même membre et interdit l'usage de l'invitation générique qui dupliquerait le profil. Aucune migration complète prétendument prête n'est proposée. |
| **F09, droits parent/enfant** | `ATTENTE_UTILISATEUR`. Les neuf policies sont explicitement **provisoires** pour les écritures directes ; elles ne sécurisent pas toutes les RPC SECURITY DEFINER, n'ouvrent pas la validation enfant et ne réalisent pas la gestion complète de tous les parents. La source réelle des writers et des RPC reste à examiner avant activation. Garde cliente/transport et tests locaux ne sont pas assimilés à RLS. |
| **C07, disponibilité partagée** | `ATTENTE_UTILISATEUR`. Installation additive manuelle, garde de colonne/support, erreur réelle conservée, sauvegarde/préflight/type existant/grants/révision requis. Le rollback conserve colonne et valeurs ; aucun DROP destructif. Réserve réelle A/B distincte des tests locaux. |
| **Micro / iPhone physique** | D02 reste `PARTIEL` ; tests simulés explicitement nommés. Le récapitulatif donne une recette matérielle précise. Aucun succès de micro réel revendiqué. |

Le récapitulatif manuel ne demande pas de réexécuter la migration Stitch, les anciens resets d'appartenance ou les correctifs Auth déjà traités. Il n'exige aucun secret dans les preuves. Le rollback des policies avertit honnêtement du rétablissement possible de droits plus larges et garde les parcours enfants désactivés.

## CI et runner

- Workflow `dobby-stitch-v7.yml` : la nouvelle campagne revue générale est exécutée après installation des dépendances navigateur ; elle démarre son propre serveur local sur **8873** et attend son HTTP 200. Le port est distinct de ceux des campagnes Stitch, PREP et historique.
- Les **15 scripts** appelés par `revue-generale-ci.cjs`, y compris les trois scripts Courses, respectent tous `process.env.CHROMIUM_PATH` ; le workflow fournit Chrome/Chromium détecté sur le runner. Aucun `/usr/bin/chromium` imposé lorsque la variable est fournie.
- Le runner impose une origine HTTP loopback, transmet les répertoires d'évidence et l'origine à chaque enfant, capture logs/statuts/durée, refuse un sous-test échoué et compare les empreintes runtime avant/après. Les données de synthèse conservent `liveBackendVerified:false` et `speechHardwareVerified:false`.
- Les tests de gates/participants ajoutés sont aussi couverts par le glob natif `essai-stitch-v5-famille/tests/*.test.mjs` de la campagne existante ; la nouvelle étape ajoute ses tests ciblés sans substituer une fixture à une preuve serveur.
- L'upload d'artefacts est `if: always()` et le runner écrit `results.json` dans `finally`. Les quatre scripts profil/E08 ajoutés à la CI sont distingués dans le rapport des **11 scripts** effectivement exécutés dans le dernier lot revue générale local.
- Vérification indépendante du dernier `review60-final-local-results.json` : **11 résultats, tous succès**, et **aucune empreinte runtime différente** du candidat courant. La campagne locale n'est pas faussement annoncée comme une exécution de 15 scripts unique ; les quatre contrôles complémentaires sont explicitement séparés.

## Limites

Cet audit est documentaire et statique. Il ne certifie pas le résultat final de la PR #9, l'intégration ultérieure, le nouveau SHA Pages, les parcours publics ni une authentification réelle. Aucun appel Supabase, aucune exécution SQL, aucun déploiement, aucune modification runtime et aucune relance de suite navigateur par cet audit. La correction R2 et l'ajout des preuves finales CI/publication restent à incorporer par root avant la clôture utilisateur.

## Suivi par le contrôleur
R2 corrigé dans le README Courses : tests PostgreSQL locaux exacts reconnus, absence totale de validation distante et statut ATTENTE_UTILISATEUR maintenus. Le contrôle N01 des routes anciennes de cérémonie a ensuite identifié un dock masqué ; correctif aef2664 et test indépendant 320/390 réussis, dont deux courses de navigation pendant sauvegarde différée corrigées, avant fusion.
