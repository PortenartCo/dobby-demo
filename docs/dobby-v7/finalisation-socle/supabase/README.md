# Intervention manuelle DOBBY V7 — socle familial

L'utilisateur a confirmé l'installation `10`, les cinq policies Storage `11`, le catalogue `20`, puis le contrôle DB/RPC hébergé `30` : **38 PASS, zéro échec/omission**, sous rôle et claims JWT simulés en SQL. La [synthèse du catalogue](../evidence/hosted-installation-summary.json) conserve les 36 comparaisons de fonctions ; la [synthèse runtime](../evidence/hosted-runtime-summary.json) atteste douze tables observées identiques après annulation interne et le rôle SQL restauré. Les vrais parcours HTTP/Auth restent à vérifier. Aucun accès SQL distant ni changement Supabase n'est réalisé par l'agent.

Le paquet concerne exclusivement **`dobby-family-sync`**. Il conserve comptes, foyers, profils, choix magiques, quantités, imports, crédits et reçus. Aucun réglage Auth supplémentaire n'est demandé : racine exacte déjà configurée et confirmée.

## Paquet déjà installé et suite

Le générateur [build-manual-package.py](tests/build-manual-package.py) compose les sources revues sans modifier leurs corps SQL ; le manifeste fournit leurs SHA-256. Il crée les cinq fichiers suivants et un ZIP en dehors du dépôt :

| Fichier du paquet | Usage |
|---|---|
| `LIRE-AVANT-EXECUTION.md` | Notice courte, projet ciblé et conduite en cas d'erreur. |
| `10-install-socle.sql` | **Installation utilisateur confirmée.** Une seule transaction Famille → Missions V3 → Courses, sans réinitialisation de compte, foyer ou ledger. Ne pas rejouer. |
| `11-install-storage.sql` | **Installation utilisateur confirmée.** Quatre restrictions et une autorisation UPDATE Parent limitée au bucket familial et à son foyer ; cinq policies présentes au contrôle. Ne pas rejouer. |
| `20-verify-socle.sql` | **Contrôle du catalogue reçu et réussi.** Lecture seule réunie dans la cellule `socle_verification`. Ce succès ne certifie pas les parcours runtime/Auth. Ne pas rejouer. |
| `90-rollback-suspend.sql` | **Seulement en cas de besoin** : suspend nouvelles capacités/RPC et conserve comptes, liens, profils, ledger, reçus, colonne et protections. Ne pas l'exécuter pour terminer une installation réussie. |

**Ne rejouer ni `10`, ni `11`, ni `20`, ni le diagnostic `00`.** Les résultats ont été reçus ; aucune réinstallation ni nouvelle lecture du catalogue n'est nécessaire.

Le contrôle **[30-runtime-rollback.sql](30-runtime-rollback.sql) est réussi sur le serveur hébergé**, après ses [38 contrôles locaux](evidence/runtime-rollback-local.json). **Ne pas le rejouer.** Le troisième Auth confirmé est créé et conservé non lié après annulation ; aucune nouvelle création n'est nécessaire. Les deux comptes familiaux et le foyer restent conservés. Cette exécution réelle DB/RPC sous claims SQL simulés ne certifie aucun login Auth HTTP, acceptation UI, upload physique, DELETE Storage ou test concurrent multi-session. Le [contrôle HTTP 31 en lecture seule](../recettes-http/README.md) est prêt et ne demande aucune installation ni activation. Ne transmettre aucun identifiant personnel, mot de passe, secret ou jeton.

**Ne rejouer ni Stitch 01/04/06/11, ni `roles-01-apply.sql`.** Les numéros `10/11/20/90` du nouveau paquet évitent la confusion avec ces anciens fichiers. La notice et l'empreinte du lot exact testé accompagnent sa remise ; les sources par composant sont ci-dessous.

Pour reproduire le paquet depuis les sources, sans accès réseau ni exécution SQL :

```sh
python docs/dobby-v7/finalisation-socle/supabase/tests/build-manual-package.py --output /tmp/dobby-v7-socle-manuel
```

## Créations, modifications et policies

- **[Famille](family/README.md)** : rôle fermé maintenable `dobby_socle_writer`, helpers canoniques, état privé des preuves et sauvegardes techniques ; adaptations ciblées des RPC, du contexte et du guard ; invitation enfant au même `member_id` TEXT et restrictions RLS. La réparation 11 est conservée. Le rôle n'est jamais accordé au navigateur.
- **[Missions](missions/README.md)** : RPC V3 d'intentions, reçus privés sous RLS forcée, validations/allocations atomiques. L'ancien corps V2 est conservé sous alias non public ; son endpoint devient un wrapper Parent. Les événements V3 ne passent jamais dans V2, les UUID ne peuvent être réutilisés entre protocoles dans le même foyer.
- **[Courses](shopping/README.md)** : le lot installé réutilise sans modification le [01 existant](../../revue-generale/supabase/shopping/01-install.sql), le [02](../../revue-generale/supabase/shopping/02-verify.sql) et le [03](../../revue-generale/supabase/shopping/03-rollback.sql). `at_home_quantity`, absente au diagnostic initial, est maintenant installée et son contrat numérique sans échelle fixe passe le contrôle reçu. Aucune réinstallation n'est nécessaire.
- **Storage** : l'utilisateur a appliqué `11` et les cinq policies attendues sont présentes au contrôle reçu. Le succès des appels Parent et les refus Enfant/inter-foyers devront encore être recettés réellement. Ni la fixture locale ni ces métadonnées ne certifient le service Storage hébergé.

L'ancien dataset Courses V1 n'a pas de foyer : il devient inaccessible aux comptes canoniquement liés à V7, sans supprimer ses données ni ses anciennes appartenances. Les clients V1 non liés conservent leur comportement ; les anciens PATCH **V2** de Courses restent compatibles. Une suppression brute d'un profil Auth lié reste protégée ; aucune suppression de compte ou réaffectation implicite n'est ajoutée.

## Résultats et activation

Le succès SQL et les vérifications de catalogue ne suffisent pas à déclarer les nouveaux parcours opérationnels. Les flags privés Famille/Storage/Enfant/Missions et les constantes de release du client restent **false**. Aucun SQL d'activation aveugle n'est inclus.

Les résultats d'installation/catalogue et les 38 contrôles DB/RPC hébergés sous claims SQL simulés sont reçus. Il reste à vérifier les vraies sessions HTTP/Auth et leurs frontières REST/RPC, les parcours UI, les fichiers Storage physiques et la concurrence multi-session avant activation correspondante. Le nominal des deux Parents et la reconnexion B restent acquis, sans répétition demandée. Les [cas mail/récupération et Safari physique](../RECETTE-AUTH-MICRO.md) restent inchangés.

**INTÉGRÉ** : [PR #12](https://github.com/PortenartCo/dobby-demo/pull/12), SHA applicatif `43eef7a57a56fe352f88902dfe89b208a4036495`, quatre CI réussies. **DÉPLOYÉ** : documentation `54d74b9` publiée, application identique au code vérifié par 152 GET et navigateur anonyme ([preuves](../LIVRAISON-SOCLE.md)). La `RECETTE_RÉELLE_VALIDÉE` de T30 se limite au DB/RPC sous claims SQL simulés ; aucune validation globale HTTP/Auth ni ouverture de gate n'est annoncée.

Tous les retours techniques bruts restent privés, hors Git/PR/log public ; seules des synthèses et empreintes sont publiées. Les tests locaux utilisent PostgreSQL 17.7 isolé et des données fictives ; les résultats hébergés `20` et `30` proviennent personnellement de l'utilisateur sur PostgreSQL 17.11. Aucune réussite hébergée n'est déduite d'une fixture locale, et la simulation SQL des claims ne valide pas le fournisseur Auth HTTP.

## Retour arrière

Le paquet `90` ferme les nouveaux chemins en conservant les autorisations renforcées et toutes les données. Les Missions déjà V3 restent consultables, sans retour vers un writer V2 incompatible. La disponibilité à domicile n'est jamais supprimée. Le rollback applicatif restaure seulement une version cliente préalablement testée.

Les sauvegardes techniques de fonctions restent privées sur place ; le paquet ne prétend pas restaurer un propriétaire V7 devenu inaccessible. Le retrait exceptionnel des policies Storage est distinct et interdit tant qu'un compte lié actif non Parent/ambigu subsiste ; il n'est pas une étape de routine et n'est pas inclus dans le ZIP courant.

L'[archive du diagnostic](DIAGNOSTIC.md) et sa [validation locale](VALIDATION-LOCALE.md) documentent le checkpoint déjà franchi. La [matrice exacte des dix réserves](../MATRICE-RESERVES.md) distingue code, tests, intégration, déploiement et recette réelle.
