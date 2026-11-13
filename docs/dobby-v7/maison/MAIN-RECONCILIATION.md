# Rapprochement du main concurrent — PR11

Initial main54d74b9 ; nouveau main25dd637c1b827bd09a46d8a55be63d9c14966f19, fusion de PR11 constatée avant toute fusion Maison. Aucun changement dans la branche ou le worktree PR11.

Un seul conflit textuel : `essai-stitch-v5-famille/tests/integration.test.mjs`. Résolution : conserver la preuve Role+Contrats de PR11 et l’envelopper de la composition Maison. Aucun ancien fixture n’est réécrit.

- Index composé SHA256 :1c74df97488565a83b14fc71a26c8b582fd9de85849fd678e48f4fdde9594a5a.
- Retirer le littéral Role retrouve exactement l’artefact Maison b12cfaf :cc21e9e7815d9bfcc068537bd30f5710aaad57e1358e8e4b6485227380cfece4.
- Retirer la garde Maison retrouve exactement origin/main ; les preuves Role/Contrats précédentes passent ensuite dans les deux ordres.
- Les modifications `family-modules` sont distinctes : houseShared/houseVersion et gestion du digest Maison sont conservés avec v3Actor canonique, revalidateExistingFamily, re-sonde start et API de PR11. Le gate V3 reste fermé.
- Les nouvelles gardes Maison distinguent un usage réellement déconnecté d’un bootstrap Auth avec access local. Tout compte identifié doit avoir une liaison canonique active et vérifiée ; seuls rôle parent et canEdit explicite autorisent l’écriture. Le rôle local pending ne contredit pas le profil canonique. Quatre cas nouveaux, dont trois reproductions RED→GREEN, couvrent ces situations.

Validation combinée :503 tests natifs/synchronisation,49 tests Maison, recette DOM/IndexedDB Maison avec cinq largeurs, import et documents, accès Famille et courses de liaison Auth. Les captures et les tests restent fictifs ; aucune recette serveur réelle ni mutation Supabase.

La CI b12cfaf a découvert un test Contrats lisant le DOM avant la fin du rendu asynchrone. La course a été reproduite avec un chargement retardé250ms ; attendre à la fois la route et le titre de la bonne fiche conserve toutes les assertions de permissions. Aucun correctif produit Contrats ni droit supplémentaire.
