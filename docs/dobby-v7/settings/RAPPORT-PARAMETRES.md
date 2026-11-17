# DOBBY V7 — Paramètres

## Réalisation

Trois cartes remplacent l'ancienne page : Ambiance magique, Gestion du foyer, Données et sauvegardes. Aucun stockage de préférences supplémentaire : les interrupteurs utilisent les mêmes événements et `st.stitchPreferences` que le header. Effets actifs et son inactif par défaut ; désactivation conservée après rechargement. Aucun son au chargement, même si le son est enregistré comme actif.

Le registre natif des membres reste la seule gestion familiale, avec invitations et permissions existantes. Le retour vers Paramètres résiste à une recherche ; une ouverture depuis Famille conserve son propre retour.

Une perte de notes concurrentes du même foyer a été reproduite après la confirmation native de restauration. Ce défaut justifie un correctif limité du moteur existant : empreinte de tout l’état avant les attentes, garde avant transaction des pièces jointes, puis rollback de l’état seulement si celui-ci a réellement été remplacé. Un amendement littéral séparé permet de retrouver exactement les sources historiques ; aucune ancienne fixture gelée n’est modifiée.

La sauvegarde complète utilise le téléchargement JSON natif `dobby-complete-backup` v1, sans chiffrement. Validation, confirmation, annulation et résultats de restauration sont visibles. Les anciens documents autonomes sont accessibles sans migration. Les lectures seules ne peuvent pas lancer une sauvegarde complète. L'export vérifie le contexte au véritable téléchargement ; la restauration revalide le registre avant sa confirmation.

Les états affichés reprennent les informations natives. Une erreur de connexion prévaut sur un ancien libellé « à jour ». La reprise est proposée seulement dans un état d'erreur ; aucun bouton permanent de synchronisation n'est ajouté.

## Validation exécutée

- `node essai-stitch-v7/tests/settings.cjs` : Chromium, profils neufs à 320/390/768/1440 px ; cartes, clavier, deux interrupteurs, cohérence header, persistance, absence de son au rechargement, navigation Foyer, permissions locales et hors ligne. Cas d'erreur de synchronisation simulé à la frontière API native.
- `node essai-stitch-v7/tests/settings-backup.cjs` : téléchargement natif et scénarios de restauration fictive, erreurs, annulation, état concurrent, droits enfant, pièces jointes comparées par SHA256. Résultats détaillés dans `evidence/backup-results.json`.
- `npm test --prefix essai-stitch-v7/tests` : campagne standard Menu + E07-P01/P02 réussie (`E07_P01_P02_TARGETED_CI_PASS`) avant intégration. Les nouvelles suites Paramètres ont ensuite été ajoutées à cette commande.
- Régressions natives : 628 exécutions réussies, dont certaines couvrent les mêmes fichiers dans plusieurs groupes ; commandes et limites dans `NATIVE-TESTS.md`.
- `node essai-stitch-v7/tests/register-house.cjs` : 320/390 px ; `maison-review-regressions.cjs` : 7 scénarios réussis.
- `node essai-stitch-v7/build-register.cjs` puis `node --test essai-stitch-v7/tests/menu-build.test.cjs` : génération réussie, 53 sources conservées ; les preuves E02 du manifeste sont préservées par le générateur.
- Syntaxe des scripts modifiés et `git diff --check` réussis.

La revue indépendante a reproduit puis revérifié la correction du retour après recherche des membres ; elle a vérifié que le moteur natif refuse une restauration lors d'un changement de compte. Les erreurs de sauvegarde et de restauration testées ne sont pas présentées comme un succès.

## Preuves et limites

Captures `evidence/settings-{320,390,768,1440}.png`, `ambience-*.png`, `backup-*.png`. Données fictives, profils éphémères, requêtes externes bloquées. Les téléchargements et IndexedDB sont réels dans ces profils ; la synchronisation familiale reste simulée. Aucune recette avec les deux vrais comptes familiaux, aucune migration distante ou ouverture de droits.

L'intégration et la publication sont des niveaux distincts. Leur état final est documenté dans le rapport de consolidation ; ce rapport Paramètres ne constitue pas une preuve de déploiement général.

## Retour arrière

Avant fusion, fermer les PR laisse l'application publiée intacte. Après une éventuelle promotion ultérieure, revenir au commit stable `521c9199ac18cb71b2fbbd2717ded2f7781aa4db` par le processus de publication existant. Aucun rollback de production n'a été exécuté ou prétendu testé pendant cette mission. Les restaurations de tests ont exclusivement affecté les profils fictifs.
