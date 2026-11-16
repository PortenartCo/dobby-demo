# Contacts — Répertoire familial / Stitch 24

Recette : https://portenartco.github.io/dobby-demo/essai-dobby-v7-contacts-stitch24-20261116/

Branche : `feat/dobby-v7-contacts-20261116`, issue de `521c9199ac18cb71b2fbbd2717ded2f7781aa4db`. Le SHA source exact est inscrit dans le manifeste de l’aperçu. Le worktree Dev-Lap demandé était propre à cette base ; le développement est exécuté dans le cloud sur la même branche, puis reporté par avance rapide dans ce worktree.

## Résultat

Un seul bouton d’ajout, une recherche instantanée sans filtres, des cartes entièrement cliquables et accessibles au clavier. Le formulaire commun création/modification contient uniquement les sept champs validés. La fiche de consultation masque les valeurs vides et propose téléphone, e-mail, carte géographique, modification et suppression confirmée. Les éléments décoratifs et l’ancien dock sont retirés ; l’en-tête et les six destinations officiels restent actifs.

Le bouton principal était désactivé car son libellé « Inscrire » n’était pas reconnu par l’ancien raccordement textuel. Il est désormais raccordé explicitement à l’action native. La catégorie et l’adresse sont ajoutées au formulaire et au writer `famContacts` existants. Les identifiants, l’ordre et les métadonnées historiques sont conservés. Les sauvegardes et suppressions échouées restaurent le registre en mémoire. Les brouillons restaurés par l’historique conservent leur version de référence et refusent d’écraser une modification reçue du foyer.

Le PNG fourni est conservé octet pour octet : SHA-256 `b6dcdc9a7765036fcb9ff38089032c4aac832165d0907fc883b8082f6d507cac`. Affichage `object-fit: contain`, hauteur maximale 220 px ; Dobby et le titre inclus dans l’image restent visibles.

## Validation ciblée

- `npm run test:contacts --prefix essai-stitch-v7/tests` : trois tests du provider natif de synchronisation, parcours Chromium à 320, 390, 768 et 1440 px et tests d’erreurs/droits. Création, sept valeurs, recherche sans accents, consultation par surface/Entrée, modification, rechargement, annulation, suppression confirmée, catégorie ancienne et métadonnées, erreurs quota, reprise sans doublon, brouillon historique concurrent et profil enfant.
- `node essai-stitch-v7/tests/register-family.cjs` : parcours natifs contacts/mémos/listes à 320 et 390 px.
- `node essai-stitch-v7/tests/register-preservation.cjs` : préservation des données historiques Contacts, Notes et Maison aux deux largeurs.
- `node essai-stitch-v7/tests/register-navigation.cjs` : racines, Menu, historique et rechargement aux deux largeurs.
- `DOBBY_REVIEW_CASES=menu-contact-draft,contact-sharing-disclosure node essai-stitch-v7/tests/register-review.cjs` : brouillon Menu/Contacts et absence de promesse trompeuse de stockage exclusivement local, aux deux largeurs.
- `node --test essai-stitch-v5-famille/tests/family-core.test.mjs essai-stitch-v5-famille/tests/family-write-policy.test.mjs essai-stitch-v5-famille/tests/v7-family-policy.test.mjs essai-stitch-v7/tests/menu-build.test.cjs essai-stitch-v7/tests/e09-memo-writer.test.cjs essai-stitch-v5-famille/tests/family-notes-sync.test.mjs essai-stitch-v5-famille/tests/family-house-sync.test.mjs essai-stitch-v5-famille/tests/contracts-sync.test.mjs` : 51 tests réussis.
- `node --test essai-stitch-v7/tests/fam-integration-transverse.test.cjs` : 11 tests réussis. Une extension Contacts inversible conserve les empreintes parentales figées et refuse tout changement supplémentaire du contrôleur Famille.
- `node essai-stitch-v7/build-source.cjs`, vérifications de syntaxe et `git diff --check` : réussis. Les deux présentations Contacts sont reproductibles et tracées dans la provenance.
- `DOBBY_CONTACTS_BASE=<URL de l’aperçu>/ node essai-stitch-v7/tests/contacts-preview.cjs` : contrôle HTTP des empreintes, données fictives, dock, blocage des requêtes externes et des requêtes vers l’application principale, réinitialisation propre à cet aperçu et conservation de sentinelles hors de son espace de stockage. Le même parcours Contacts est exécuté contre l’URL hébergée avant livraison.

Les tests utilisent des données fictives et les simulateurs existants. Ils ne constituent pas une recette connectée avec des comptes réels ou un serveur Supabase distant. La campagne historique complète n’a pas été étendue au-delà des surfaces concernées.

## Réserves et dépendances

- **Archivage** : la PR #17 est encore ouverte (dernier état vérifié : `f8c7876e3c7ddac527e26324845f687e171e5fb8`). Aucun mécanisme natif d’archivage Contacts n’est fusionné dans cette base. La commande est omise ; aucune archive concurrente n’est créée.
- **Échec historique conservé** : `register-sync.cjs` expire à la ligne 25 lors de l’activation du module Famille. Échec reproduit sur le checkout pristine `521c919` avec le même Chromium et une origine locale séparée, avant toute modification du formulaire. Ce fichier reste inchangé. Le transfert des sept champs, la reprise hors ligne et les conflits sont vérifiés séparément avec le provider natif et son harness de deux clients.
- La revue indépendante a identifié le cas du brouillon restauré ; un test a d’abord reproduit l’écrasement, puis est passé après conservation de sa référence. La base de provenance de l’aperçu distingue désormais la base Contacts du profil E09 réutilisé.

## Publication et retour arrière

GitHub Pages publie actuellement `main:/`. Seul un **nouveau dossier généré** est ajouté à cette branche pour la recette ; aucun fichier applicatif principal n’y est fusionné. Les aperçus Archives ajoutés concurremment sont conservés. La PR Contacts reste indépendante et en brouillon.

L’aperçu réutilise le runtime de revue existant, avec le préfixe `dobby-review-v7-contacts-stitch24-20261116|`, une CSP et un refus des accès hors de son dossier. Aucun compte réel, SQL, changement Supabase, Missions V3 ou droit enfant étendu. Le manifeste précise la provenance et les transformations.

Retour arrière applicatif : ne pas fusionner la PR ou inverser ses commits sur la branche Contacts. Retour arrière de publication : retirer exclusivement `essai-dobby-v7-contacts-stitch24-20261116/` de la branche Pages, sans supprimer les autres dossiers. Ces procédures sont documentées ; aucun rollback distant n’a été exécuté.
