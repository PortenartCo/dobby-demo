# Intervention manuelle DOBBY V7 — socle familial

Le [diagnostic réel a été reçu](../CATALOGUE-RECU.md). Il n'est pas à refaire. Les migrations sont **CODE_DÉVELOPPÉ / TESTS_PASS locaux** ; elles ne sont pas installées par leur présence dans Git. Aucun accès SQL distant ni changement Supabase n'est réalisé par l'agent.

Le paquet concerne exclusivement **`dobby-family-sync`**. Il conserve comptes, foyers, profils, choix magiques, quantités, imports, crédits et reçus. Aucun réglage Auth supplémentaire n'est demandé : racine exacte déjà configurée et confirmée.

## Paquet regroupé et ordre d'exécution

Le générateur [build-manual-package.py](tests/build-manual-package.py) compose les sources revues sans modifier leurs corps SQL ; le manifeste fournit leurs SHA-256. Il crée les cinq fichiers suivants et un ZIP en dehors du dépôt :

| Fichier du paquet | Usage |
|---|---|
| `LIRE-AVANT-EXECUTION.md` | Notice courte, projet ciblé et conduite en cas d'erreur. |
| `10-install-socle.sql` | **Une seule transaction** Famille → Missions V3 → Courses. Tout échec avant COMMIT annule les trois évolutions, y compris leurs objets/rôles nouveaux. Aucun compte/foyer ni ledger n'est réinitialisé. |
| `11-install-storage.sql` | Transaction séparée : quatre restrictions et une autorisation UPDATE Parent strictement limitée au bucket familial et à son foyer. Ne change aucun objet, contenu ou propriétaire géré. |
| `20-verify-socle.sql` | Lecture seule : contrôle Courses d'origine et vérifications renforcées Famille/Missions/Courses/Storage, réunies dans la **cellule finale `socle_verification`**. |
| `90-rollback-suspend.sql` | **Seulement en cas de besoin** : suspend nouvelles capacités/RPC et conserve comptes, liens, profils, ledger, reçus, colonne et protections. Ne pas l'exécuter pour terminer une installation réussie. |

Exécution manuelle, dans le SQL Editor du **seul projet familial** :

1. Exécuter tout `10`. Aucune valeur à remplacer. En cas d'erreur : exécuter `ROLLBACK;`, puis transmettre l'erreur exacte, sans forcer, relancer un ancien script ou continuer le lot. Si ce socle est déjà présent, demander sa vérification plutôt qu'une réinstallation.
2. Si `10` réussit, exécuter `11`. En cas de `42501` / « must be owner » : transmettre le refus et exécuter `ROLLBACK;` pour libérer une éventuelle session en erreur, puis passer à `20`. **Le succès de 10 est conservé**, avec les capacités clientes fermées. Ne modifier ni owner, ni RLS, ni rôle géré pour contourner.
3. Exécuter `20`, puis transmettre **le JSON final complet `socle_verification`** et toute erreur de `11` dans la conversation privée. Aucun mot de passe, secret, jeton d'invitation ou identifiant personnel n'est demandé.

**Ne rejouer ni Stitch 01/04/06/11, ni `roles-01-apply.sql`.** Les numéros `10/11/20/90` du nouveau paquet évitent la confusion avec ces anciens fichiers. La notice et l'empreinte du lot exact testé accompagnent sa remise ; les sources par composant sont ci-dessous.

Pour reproduire le paquet depuis les sources, sans accès réseau ni exécution SQL :

```sh
python docs/dobby-v7/finalisation-socle/supabase/tests/build-manual-package.py --output /tmp/dobby-v7-socle-manuel
```

## Créations, modifications et policies

- **[Famille](family/README.md)** : rôle fermé maintenable `dobby_socle_writer`, helpers canoniques, état privé des preuves et sauvegardes techniques ; adaptations ciblées des RPC, du contexte et du guard ; invitation enfant au même `member_id` TEXT et restrictions RLS. La réparation 11 est conservée. Le rôle n'est jamais accordé au navigateur.
- **[Missions](missions/README.md)** : RPC V3 d'intentions, reçus privés sous RLS forcée, validations/allocations atomiques. L'ancien corps V2 est conservé sous alias non public ; son endpoint devient un wrapper Parent. Les événements V3 ne passent jamais dans V2, les UUID ne peuvent être réutilisés entre protocoles dans le même foyer.
- **[Courses](shopping/README.md)** : réutilisation sans modification du [01 existant](../../revue-generale/supabase/shopping/01-install.sql), du [02](../../revue-generale/supabase/shopping/02-verify.sql) et du [03](../../revue-generale/supabase/shopping/03-rollback.sql). `at_home_quantity` est absente dans le retour reçu : ajout numérique sans échelle fixe. Pas de nouvelle installation si un contrat complet compatible a été posé entre-temps ; signaler cette situation avant exécution du lot.
- **Storage** : les métadonnées seules ne prouvent pas le droit de modifier les policies gérées. L'étape séparée `11` et sa vérification doivent confirmer ce droit, puis les refus Enfant/inter-foyers et le succès Parent devront être recettés réellement. Sa fixture locale ne certifie pas le service Storage hébergé.

L'ancien dataset Courses V1 n'a pas de foyer : il devient inaccessible aux comptes canoniquement liés à V7, sans supprimer ses données ni ses anciennes appartenances. Les clients V1 non liés conservent leur comportement ; les anciens PATCH **V2** de Courses restent compatibles. Une suppression brute d'un profil Auth lié reste protégée ; aucune suppression de compte ou réaffectation implicite n'est ajoutée.

## Résultats et activation

Le succès SQL et les vérifications de catalogue ne suffisent pas à déclarer les nouveaux parcours opérationnels. Les flags privés Famille/Storage/Enfant/Missions et les constantes de release du client restent **false**. Aucun SQL d'activation aveugle n'est inclus.

Après réception des résultats, vérifier les parcours RPC/REST réels et les refus Parent/Enfant/inter-foyers avant activation correspondante ; puis les parcours complets. Les comptes et le foyer déjà validés sont conservés. Les recettes restantes sont décrites dans les notices de composants et [Auth/micro](../RECETTE-AUTH-MICRO.md). Le microphone physique Safari n'est pas couvert par une migration.

Tous les retours techniques bruts restent dans la conversation privée, hors Git/PR/log public. Les anciens corps techniques reçus sont conservés hors du dépôt ; les seules preuves publiques sont des synthèses de tests et empreintes. Les tests PostgreSQL emploient le modèle réel avec données fictives, PostgreSQL 17.7 isolé, tandis que le serveur reçu est en 17.11 : aucune réussite hébergée n'en est déduite.

## Retour arrière

Le paquet `90` ferme les nouveaux chemins en conservant les autorisations renforcées et toutes les données. Les Missions déjà V3 restent consultables, sans retour vers un writer V2 incompatible. La disponibilité à domicile n'est jamais supprimée. Le rollback applicatif restaure seulement une version cliente préalablement testée.

Les sauvegardes techniques de fonctions restent privées sur place ; le paquet ne prétend pas restaurer un propriétaire V7 devenu inaccessible. Le retrait exceptionnel des policies Storage est distinct et interdit tant qu'un compte lié actif non Parent/ambigu subsiste ; il n'est pas une étape de routine et n'est pas inclus dans le ZIP courant.

L'[archive du diagnostic](DIAGNOSTIC.md) et sa [validation locale](VALIDATION-LOCALE.md) documentent le checkpoint déjà franchi. La [matrice exacte des dix réserves](../MATRICE-RESERVES.md) distingue code, tests, intégration, déploiement et recette réelle.
