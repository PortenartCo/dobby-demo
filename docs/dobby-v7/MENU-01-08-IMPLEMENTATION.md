# DOBBY V7 — MENU-01 à MENU-08 : implémentation

Livraison locale du 12 novembre 2026. Le Menu commence par **Menu**, suivi de la recherche puis des cinq cartes demandées. Aucun module métier ni writer recréé ; aucune publication, fusion, migration ou opération sur les données connectées.

## Références et isolation

| Référence | SHA / emplacement |
|---|---|
| Dépôt | `PortenartCo/dobby-demo` |
| Branche locale | `feat/dobby-v7-menu-simplification` |
| Worktree indépendant | `/workspace/dobby-v7-menu-simplification` |
| SHA de départ | `5b764ef367553e9945fb72a6b563b55adc41e040` |
| SHA final applicatif, tests et preuves | `bb5f6b03bd9fe77b270760ef598a62cd2ac7e2fc` |
| Source globale validée conservée | `6a6fcd9bcee522da7342de391e5c3d7bfe1955b3` |
| HEAD global accessible lors du départ | `00d1f2ea38b01503d11049322cfccfd7ea0a53d9` — ajout documentaire après la source globale |
| HEAD de publication accessible | `bce17c82ef42fefb2790203a19732665f8c8203d` — lignée de démonstration publiée, distincte des sources canoniques |

La base est la branche `feat/dobby-v7-famille-integration-20261112`. Elle reprend les corrections FAM sur la source globale, sans remplacer les dix fichiers critiques listés dans sa réconciliation. Les sources applicatives globales et Famille ne sont pas fusionnées dans `main` : les dossiers d’aperçu publiés ne constituent pas une base canonique de développement.

La preuve distante finale de Famille n’était pas complète : section finale du rapport d’intégration non renseignée, campagne CI antérieure en échec et preuves locales ultérieures marquées working-tree. Le choix de cette base s’appuie donc sur sa filiation vérifiée et les contrôles locaux relancés : 218 tests natifs et six suites navigateur Famille passent. Cette mission ne certifie pas un déploiement Famille.

Le présent rapport et les métadonnées de livraison sont enregistrés dans le commit documentaire qui suit le SHA applicatif ci-dessus. Son SHA, communiqué à la livraison, se retrouve avec `git log -1 --format=%H -- docs/dobby-v7/MENU-01-08-IMPLEMENTATION.md`. Cette séparation évite de prétendre inclure le hash d’un commit dans son propre contenu.

## Présentation et liens effectifs

| Carte | Destination existante / résultat vérifié |
|---|---|
| Maison & Équipements | `famille.html#house` — registre natif, équipements et entretiens préservés |
| Archives documentaires | `famille.html#documents` — registre documentaire ; fiches et octets des pièces jointes conservés |
| Contrats & Assurances | `famille.html#contracts` — module E08 inchangé ; échéances et contrat témoin relus |
| Contacts | `famille.html#contacts` — annuaire existant et coordonnées conservés |
| Paramètres | `famille.html#settings` — écran dédié ; lien **Sauvegarde et restauration** vers `famille.html#backup?origin=settings` |

Paramètres est rechargeable et utilise le même template source que Menu via un alias du registre. Il n’ajoute pas de source Stitch ni de stockage. La sauvegarde reste celle de `house-register.js`, avec son export natif `dobby-complete-backup` version 1, son sélecteur, sa prévisualisation et ses confirmations existantes. Un export réel dans le profil de test a été téléchargé puis validé par le validateur natif, pièce jointe comprise. Aucune restauration destructive n’a été exécutée. Le retour navigateur et la cible de retour du registre depuis la sauvegarde conduisent à Paramètres ; **Retour au Menu** est un vrai lien.

Les cartes entières sont des liens avec icône à gauche et chevron à droite, sans badges ni descriptions. Le header et le dock E01 restent uniques et fixes. Paramètres conserve Menu comme destination active. Les commandes Effets/Son restent uniquement dans le header, avec leurs handlers et leur stockage natifs.

La recherche porte uniquement sur les libellés des cinq cartes : saisie immédiate, sous-chaînes, casse/accents ignorés, espaces extérieurs retirés. L’effacement remet les cinq cartes et le focus dans la recherche. Un état vide explicite apparaît. Le filtre ne lit ni n’écrit la recherche transversale native ou les données métier.

Les accès et encadrés exclus par MENU-01–08 sont absents du Menu, y compris listes, santé, OCR, recherche transversale, accueil, missions, cuisine, Famille, citation, illustration et « Autres accès ». Leurs routes et fonctionnalités conservées restent contrôlées séparément.

## Sources canoniques et génération

`menu-layout.html` est la composition canonique approuvée par le cahier des charges. `build-register.cjs`, appelé par `build-source.cjs`, la dérive vers `templates/remaining/menu.html`. La provenance conserve la référence originale Stitch et ajoute le chemin et le SHA256 du layout actuel. Le manifeste conserve ses 53 sources ; Paramètres est un alias de workflow. Aucune copie de démonstration publiée n’est modifiée.

Fichiers applicatifs, génération et tests modifiés :

- `essai-stitch-v7/build-register.cjs`
- `essai-stitch-v7/chrome.js`
- `essai-stitch-v7/family.js`
- `essai-stitch-v7/house-register.js`
- `essai-stitch-v7/menu-layout.html`
- `essai-stitch-v7/register.css`
- `essai-stitch-v7/register.js`
- `essai-stitch-v7/route-manifest.json`
- `essai-stitch-v7/templates/remaining/menu.html`
- `essai-stitch-v7/templates/remaining/provenance.json`
- `essai-stitch-v7/tests/ci.cjs`
- `essai-stitch-v7/tests/cuisine.cjs`
- `essai-stitch-v7/tests/e01.cjs`
- `essai-stitch-v7/tests/e05-edge.cjs`
- `essai-stitch-v7/tests/e09-salon.cjs`
- `essai-stitch-v7/tests/family.cjs`
- `essai-stitch-v7/tests/menu-build.test.cjs`
- `essai-stitch-v7/tests/menu.cjs`
- `essai-stitch-v7/tests/register-navigation.cjs`
- `essai-stitch-v7/tests/register-tools.cjs`
- `essai-stitch-v7/tools-register.js`

Documents : le présent rapport, [cahier des charges](MENU-01-08-SPEC.md), [plan](MENU-01-08-PLAN.md) et le dossier [evidence/menu-01-08](evidence/menu-01-08/). Ce dossier contient les trois captures, reçus, empreintes, revue et journaux. Les captures historiques régénérées par les anciennes suites ont été restaurées ; les autres nouveaux artefacts de test ont été conservés hors du dépôt.

## Captures

| Résolution | Capture |
|---|---|
| 320 × 844 | [Menu 320](evidence/menu-01-08/menu-320.png) |
| 390 × 844 | [Menu 390](evidence/menu-01-08/menu-390.png) |
| 1440 × 844 | [Menu 1440](evidence/menu-01-08/menu-1440.png) |

Le viewport DOBBY reste centré à 480 px sur grand écran. Un contrôle complémentaire à 480 px de hauteur force le défilement et vérifie que la dernière carte reste atteignable au-dessus du dock.

## Tests exécutés et résultats

Serveur de la source : `python3 -m http.server 8765 --bind 127.0.0.1`, à la racine du worktree. Chromium `/usr/bin/chromium`, profils éphémères, données TEST et requêtes externes bloquées ; les scénarios de partage utilisent les fixtures HTTP existantes.

| Commande / suite | Résultat |
|---|---|
| `node essai-stitch-v7/tests/menu.cjs` | PASS à 320/390/1440 : cinq cartes et liens, 12 filtres par largeur, état vide/effacement/focus, header/dock, défilement court, retours/avance/rechargement, Paramètres/sauvegarde, 15 anciennes routes et données/fichier PDF préservés |
| `node --test essai-stitch-v7/tests/menu-build.test.cjs` | PASS : génération isolée, layout/provenance et autres templates identiques ; 53 sources conservées |
| `npm test --prefix essai-stitch-v7/tests` | PASS : Menu/build puis campagne ciblée existante E07-P01/P02, modèle et deux clients Courses, CAS/hors ligne/reprise |
| `node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs` | 218/218 PASS sur les sources de départ conservées |
| `fam-detail.cjs`, `fam-members.cjs`, `fam-agenda-memos.cjs`, `fam-agenda-memos-sync.cjs`, `fam-agenda-month.cjs`, `family-review-effects.cjs` sous `essai-stitch-v7/tests/` | Six suites PASS : fiches/permissions Famille, agenda/mémos, deux profils, reprise/import et effets ; captures de contrôle conservées hors du dépôt |
| `node essai-stitch-v7/tests/register-navigation.cjs` | PASS 320/390 : cinq liens du Menu et anciennes routes testées directement, quatre racines, retours/avance/rechargement |
| `register-house.cjs`, `register-documents.cjs`, `register-documents-sync.cjs`, `register-preservation.cjs`, `register-tools.cjs`, `cuisine.cjs`, `e09-salon.cjs` sous `essai-stitch-v7/tests/` | Sept scripts PASS : données, pièces jointes, sauvegarde native, champs anciens, moteur de recherche conservé, Cuisine et Salon |
| `node essai-stitch-v7/tests/e01.cjs` | PASS 390/1440 + mouvement : header/dock, cinq destinations, préférences, titres réels et absence d’écriture de dates |
| `node essai-stitch-v7/tests/runes-history.cjs` | PASS : historique et total natifs préservés |
| `node --test essai-stitch-v7/tests/fam-integration-transverse.test.cjs essai-stitch-v7/tests/e09-memo-writer.test.cjs` | 8/8 PASS : frontières E02/Courses, identité/CAS/import/rollback du writer E09 |
| `node essai-stitch-v7/build-source.cjs` puis `npm run build:css --prefix essai-stitch-v7` | PASS : empreintes avant/après identiques sur 70 fichiers générés |
| `node --check` sur les 16 sources/tests JS modifiés ; `git diff --check` | PASS |

Le lancement npm initial révélait une erreur préexistante : des tests natifs cherchent leurs sources relativement à la racine, alors que npm démarre dans `tests/`. `ci.cjs` se place désormais explicitement à la racine, identique au lancement CI existant. La commande npm complète a ensuite réussi. Le test E01 attendait l’ancien titre du Menu : son unique texte attendu est aligné sur **Menu**, sans retirer ses assertions. Les autres adaptations historiques remplacent uniquement les accès supprimés du Menu par les routes profondes ou le dock, en conservant leur couverture.

Les tests ont d’abord échoué sur l’ancien titre du Menu ; le test du dock Paramètres a échoué avant son correctif ; le test de génération a échoué avant l’ajout de la provenance du layout. Les attentes navigateur portent sur la vue effectivement montée, pas uniquement sur l’état de routage mis à jour avant le chargement du template.

### Échecs historiques conservés et limites

La campagne complémentaire n’est pas entièrement verte. Trois scripts anciens restent incompatibles avec la base Famille :

- `family.cjs` : `member-new` désactivé avant toute navigation Menu, car la fixture ne fournit pas d’identité parentale autorisée.
- `e05-edge.cjs` : attend `#magic-patronus-edit`, éditeur direct remplacé dans la version Famille par les questionnaires E06 ; échec avant le chemin Menu adapté.
- `register-review.cjs` : 24 cas réussissent ; `menu-member-draft` et `menu-medical-draft` échouent à 320 et 390 car leurs champs sont désactivés par les permissions Famille, avant le passage au Menu.

Les mêmes échecs ont été reproduits sur un serveur servant les octets applicatifs du SHA de départ (`git show HEAD:<chemin>` avant le commit Menu), avec le test E05 original et les fixtures historiques. Les journaux candidat/base sont dans le dossier de preuves. Les nouvelles suites Famille autorisées passent ; aucune permission ni règle métier n’a été assouplie pour faire réussir les anciennes fixtures. Ces incompatibilités de tests restent à traiter dans une mission Famille distincte.

La suite npm exécutée est la campagne ciblée définie par `ci-scope.json`, complétée par les contrôles ci-dessus. La campagne exhaustive historique `DOBBY_FINAL=1` n’est pas présentée comme réussie. Aucun test sur iPhone physique, backend réel ou déploiement hébergé n’est revendiqué. Les tests de synchronisation vérifient les fixtures et le code local, pas un foyer connecté.

Preuves principales : [checks.json](evidence/menu-01-08/checks.json), [npm-test.log](evidence/menu-01-08/npm-test.log), [reproducibility.json](evidence/menu-01-08/reproducibility.json), [preservation.json](evidence/menu-01-08/preservation.json), [family-baseline.json](evidence/menu-01-08/family-baseline.json), [cross-module.json](evidence/menu-01-08/cross-module.json), [revue indépendante](evidence/menu-01-08/independent-review.md).

## Listes familiales et Carnets de santé : préparation de la revue future

| Élément conservé | Route / writer natif | Travail futur, exclu de cette livraison |
|---|---|---|
| Registre des listes | `famille.html#lists`, détail `#list-detail?record=<id>` ; `family-register.js` vers `xListForm`, actions liste natives ; données `st.famLists` | Revoir la fiche existante avec l’utilisateur, puis créer l’entrée utile dans le Salon des Curiosités ; conserver les identifiants et ne pas importer dans Courses |
| Carnet familial | `famille.html#health` | Revoir les informations/actions avant de reconstruire l’entrée Famille |
| Carnet individuel | `famille.html#health-person?person=<member-id>`, `#health-history` ; `family-engine.js`, writer local `xHealthForm`, données `st.famHealth` | Raccorder la fiche individuelle au bon `member-id`, sans association par défaut ou fusion de personnes homonymes |
| Rendez-vous médicaux | `famille.html#medical-edit?record=<id>&scope=local|shared&person=<member-id>` ; writer partagé `fhForm` / `family-health.js`, `st.sharedHealthVisits` | Préserver la distinction local/partagé, les droits FAM et la provenance de l’identité ; aucune copie automatique |

Les fiches, routes, identifiants et writers restent présents ; aucune nouvelle fiche ni donnée déplacée. L’accès médical secondaire de la fiche membre Famille est conservé. Les courses restent dans la Taverne gourmande, sans fusion avec les listes familiales.

## Revue, retour arrière et suite

La revue indépendante n’a relevé aucun point bloquant ; son observation sur l’onglet actif de Paramètres est corrigée et couverte par les tests. Les 13 blobs critiques contrôlés et les arbres natifs Famille/Sync/Supabase/SQL sont identiques à la base. La seule adaptation du domaine sauvegarde concerne sa cible de retour depuis Paramètres.

Retour arrière proposé : retirer le commit applicatif Menu par `git revert` sur une future branche d’intégration, puis relancer la génération et les contrôles. Aucun état métier ni migration à inverser. Cette procédure de revert n’a pas été exécutée.

La branche et le worktree sont conservés. Aucun push, PR, merge ou déploiement effectué. L’intégration/publication reste soumise à la revue demandée par l’utilisateur.
