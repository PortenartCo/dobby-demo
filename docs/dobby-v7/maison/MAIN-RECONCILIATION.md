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

## Nouveau main PR15

La PR15 a été fusionnée au SHA2584a8955bac1358d08a8f59070179aa5d624071 pendant la dernière CI Maison. Le candidat98f6bc9 a donc été suspendu avant fusion ; aucun résultat antérieur n’est utilisé seul comme autorisation de fusion du nouveau composé.

Les ajouts de restauration du contexte familial (family-v2 avant ready, moduleStateRestored dans family-modules) sont intégrés sans perte des gardes Maison/PR11. Les fixtures de provenance déjà figées PR11, PR15 et Maison restent inchangées ; une nouvelle composition vérifie l’inversion exacte vers chaque parent. Aucun outil des nouvelles recettes HTTP n’a été exécuté contre Supabase dans cette mission. Les nouvelles preuves serveur reçues du socle gardent leur portée déclarée ; aucune recette de synchronisation Maison à deux comptes n’en est déduite.

Suite native/synchronisation du composé :513/513. Les parcours Maison et PREP sont rejoués et la nouvelle révision attend sa propre CI avant toute fusion.
