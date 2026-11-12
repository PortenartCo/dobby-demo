# PREP-01 — Listes de préparation

Base immuable : `5b764ef367553e9945fb72a6b563b55adc41e040`.
Branche : `feat/dobby-v7-preparations-20261112`.
Worktree : `C:\Users\dubru\Dobby-V7-PREP-01-20261112`.
Exécution : 12 novembre 2026. Inspection des writers existants, intégration native, recette ciblée et captures ; aucun nouveau backend.

## Résultat

Les quatre écrans fonctionnent dans `essai-stitch-v7/famille.html` : `#models`, `#model-edit?record=…`, formulaire Agenda existant et `#preparations?record=…`. Accès « Mes modèles » depuis Famille et « Voir les préparatifs » depuis la consultation d’un événement. Header, profil jaune, effets, son et dock sont les composants natifs inchangés.

Le ZIP conservé dans `design/stitch-preparation-20261112/stitch-corrected-source.zip` porte exactement le SHA256 `9f406b2d93b82624f564e7da0a459834cb5a1730890b66aa41b57f8749a87ed6`. Les neuf fichiers extraits (quatre HTML, quatre PNG, DESIGN.md) correspondent octet pour octet aux entrées du ZIP, au chemin demandé. Preuve : [stitch-integrity.json](evidence/prep-01/stitch-integrity.json). Les HTML de référence restent des archives ; leurs scripts de simulation ne sont pas exécutés par l’app.

## Choix et résolutions

| Exigence | Implémentation |
|---|---|
| Mes modèles | Registre réel `st.preparationTemplates`, état vide, tri alphabétique. Aucun usage inventé, modèle recommandé ou modèle démo injecté. |
| Créer / modifier | Brouillon mémoire, champs nom/éléments/quantité/unité, ajout et édition en ligne sans `prompt`, retrait confirmé, flèches monter/descendre avec ordre persistant. Annuler ne sauvegarde rien. |
| Dupliquer | Writer natif dédié dans le même registre : nouvel ID du modèle et de chaque item, copie profonde incluant les champs inconnus. Le modèle enregistré est la source de duplication. |
| Agenda | Ajout des cartes radio « aucune liste » / modèles réellement enregistrés dans `#fa-native-form`. Validation, normalisation, ID et sauvegarde restent ceux de `fpEventForm`. Aucun second éditeur d’événement. |
| Copie indépendante | `familyEvents[].preparation = {version:1, templateId, items}`. Création des IDs d’items à l’association. Garder le même modèle conserve exactement la copie et ses coches ; changer/retirer une association existante demande confirmation. La suppression d’un modèle conserve les copies existantes. |
| Préparatifs | Titre et date actuels de l’événement, ajout/édition/suppression, cocher/décocher, groupe terminé après le groupe à préparer, progression calculée, retour explicite à l’événement. Aucun champ priorité/emplacement/document/urgence inventé. |
| Courses | `DobbyCuisineList.addPreparation` appelle le writer E07 natif. Local : transaction `save()` dans `shopFinal`, reçu dans `shopFinal.imports`. Foyer : `grocery.importRows` et son cache/outbox IndexedDB existants. Token déterministe `prep-01|eventId|itemId`, conservé après retrait/archivage ; un rejeu ne remplace pas les quantités/unités ou modifications ultérieures. Le préparatif n’est jamais coché automatiquement. |
| Accusé Courses | Message seulement après retour du write local/IndexedDB. En foyer, la synchronisation distante est explicitement distincte et suit le statut Courses existant. Les erreurs du writer remontent sans annonce de succès. |
| Sérialisation E09 | Clé additive `preparationTemplates` dans le module Famille, protocole `preparationsVersion:1`, préparatifs embarqués dans les événements. Validation avant adoption, conservation des extensions inconnues, CAS et résolution de conflit E09 réutilisés. Aucun nouveau stockage métier ni API réseau. |
| Clients anciens / conflit | Détection du retrait du protocole ou d’une copie d’événement. Copie locale conservée ; récupération explicite via E09, en préservant les champs distants de l’événement. Fusion à trois versions des registres à la réactivation. |
| Compatibilité | `famLists` historique conservé sans modification ni nouvel accès Menu. Pas de changement Supabase, RLS, SQL, migrations, preview Famille publié ou branche Menu. |

Le writer d’import Courses a reçu deux protections ciblées : création conditionnelle dans une transaction IndexedDB (un cache incomplet ne peut pas écraser une ligne déjà stockée), et recontrôle du foyer après calcul asynchrone de l’ID. Le reste de l’adaptateur E07 est identique à la base, après normalisation CRLF/LF ; tests de frontière dédiés.

## Fichiers

- `essai-stitch-v5-famille/preparations.js` : validation, association, mutations du registre et des copies avec rollback `save()` et garde de version périmée.
- `essai-stitch-v5-famille/index.html`, `family-agenda.js`, `family-modules.js`, `family-v2.js` : chargement et raccordement aux pipelines natifs Agenda / Famille E09 / Courses.
- `essai-stitch-v7/preparations.js`, `preparations.css` : composants des quatre parcours et adaptation brun-or, Playfair Display / Literata locales, sans CDN ajouté.
- `essai-stitch-v7/family.js`, `family-engine.js`, `family-agenda-review.js`, `famille.html`, `build-source.cjs`, `cuisine-list.js` : routes, formulaire unique, façades, générateur et action Courses.
- `essai-stitch-v7/tests/prep-01*.{js,cjs,mjs}` et `essai-stitch-v5-famille/tests/helpers/modules-harness.mjs` : tests spécifiques et chargement du même validateur dans la fixture E09.
- `.gitignore` : exclusion exacte de l’export temporaire de base `/.tmp/prep-base/` ; les autres modifications restent visibles.
- `design/stitch-preparation-20261112/` et `docs/dobby-v7/evidence/prep-01/` : références et preuves.

## Tests

| Gate | Résultat et preuve |
|---|---|
| Tests ciblés finaux | **PASS 77/77**, [journal final](evidence/prep-01/final-after-duplicate-tests.txt). PREP, Agenda, Courses E07, Famille, permissions membres, mémos E09, conflits et reprise. |
| Recette navigateur native | **PASS 36 contrôles**, [résultat](evidence/prep-01/browser-final-after-duplicate.json), script reproductible `essai-stitch-v7/tests/prep-01-browser.js`. Création, ordre sauvegardé, édition, copie, annulation, association, indépendance, coches/décoches, progression, re-navigation, suppression, double clic/rejeu Courses et conservation de `famLists`. |
| Refresh navigateur | **PASS** : route préparatifs, deux items relus, une ligne Courses et quantité 2 relues, modèle et anciennes listes conservés. [Preuve de rechargement](evidence/prep-01/reload-result.txt). Les IDs diffèrent entre exécutions isolées successives. |
| Sécurité texte saisi | **PASS** : chaîne `<img … onerror=…>` affichée comme texte, aucun élément HTML créé ; test dans le script navigateur. Pour les captures, la fixture a ensuite reçu un libellé TEST lisible. |
| A/B E09 simulé | **PASS sur fixture seulement** : deux clients indépendants, modèle et coches, CAS conflictuel, redémarrage avec mutation en attente, récupération après client ancien et extensions inconnues. `realBackend:false`. |
| Responsive | **PASS 12 parcours rendus**, quatre écrans aux viewports internes réels 320/390/1440 px, aucun débordement de document ni contrôle actif tronqué, header unique et cinq liens dock. [Mesures des contrôles actifs](evidence/prep-01/responsive-active-controls.json). |
| `git diff --check` / syntaxe | **PASS**. |
| Ancien test de hash FAM | **FAIL historique confirmé sur base ET branche** : 1/3 PASS, 2/3 FAIL, mêmes assertions et mêmes hashes CRLF. [Base](evidence/prep-01/base-historical-boundary.txt), [branche](evidence/prep-01/branch-historical-boundary.txt). Le test original est conservé. Les trois tests de frontière PREP normalisés LF passent et vérifient les ajouts explicitement autorisés. |

Les deux assertions historiques sont `chat-engine.js` : attendu `ba84ce331c50e308dd57fe00155dd0fdff881d247bc1bbacac8ff518d2bab2bd`, obtenu `6bc9c7e381d37ece7e284206f329ff801fb974d32822564742a8e19a4bc97cf1` ; bloc mémo E09 : attendu `56f0b224b0fcc0a764b398a7bf205ee5fd7da395b1f938d3316ec087ee7f08c8`, obtenu `4b1e43625dba1129c28e7fa9fcbd03dec13d5841b5c71455f1e17c8964e11bfa`. Comparaison sur export du SHA base avec les mêmes fins de ligne Windows (`core.autocrlf=true`). Aucune régression PREP dissimulée par une modification de ces attentes.

Commande des tests finaux : `node --test --test-isolation=none` avec les fichiers listés dans le journal (PREP, `e07-p02-model`, `e09-memo-writer`, `modules-flow`, `e06-sync`, `family-agenda`, `family-core`, `family-notes-sync`, `family-member-policy.test.mjs`). Le mode sans isolation de processus est nécessaire ici : le lancement de sous-processus Node/Chromium échoue avec `spawn EPERM`. Une première tentative du test navigateur membre `.cjs` a aussi révélé son module Playwright non résolu depuis V5 ; la suite de permissions `.mjs` et les parcours natifs ont bien été exécutés. L’essai interrompu reste dans `native-regressions.txt` ; le journal final est la référence.

## Captures

Captures depuis le navigateur connecté, dans un contexte neuf `PREP-01-native-review`. Les seuls exemples ajoutés sont des fixtures `TEST — …` dans ce contexte, jamais des valeurs par défaut de l’app.

| Écran | 320 px | 390 px | 1440 px |
|---|---|---|---|
| Mes modèles | [PNG](evidence/prep-01/models-320.png) | [PNG](evidence/prep-01/models-390.png) | [PNG](evidence/prep-01/models-1440.png) |
| Modifier | [PNG](evidence/prep-01/model-edit-320.png) | [PNG](evidence/prep-01/model-edit-390.png) | [PNG](evidence/prep-01/model-edit-1440.png) |
| Association dans Agenda | [PNG](evidence/prep-01/agenda-320.png) | [PNG](evidence/prep-01/agenda-390.png) | [PNG](evidence/prep-01/agenda-1440.png) |
| Préparatifs | [PNG](evidence/prep-01/preparations-320.png) | [PNG](evidence/prep-01/preparations-390.png) | [PNG](evidence/prep-01/preparations-1440.png) |

Le redimensionnement de la fenêtre du navigateur connecté a été refusé automatiquement. Alternative de vérification : app complète chargée dans un cadre de même origine dont le viewport interne mesuré est 320, 390 ou 1440 px. Les captures ciblent ce cadre et incluent le chrome natif. Ce contrôle ne constitue pas une recette sur appareil physique. Les anciennes mesures `responsive-final.json` incluent des jours de calendrier dans un défilement horizontal derrière la modale ; `responsive-active-controls.json` vérifie bien les contrôles actifs de la modale affichée.

## Réserves et livraison Git

La synchronisation avec deux vrais comptes Supabase n’a pas été testée. Les fixtures A/B prouvent le client, pas l’acceptation serveur de l’extension JSON. Si le serveur refuse ces champs, le code conserve les données et l’état en attente/conflit ; aucune migration ou modification RLS n’est autorisée ou effectuée. Aucun succès distant n’est annoncé sur la seule base du write local.

Le contrôle automatique a refusé le nettoyage récursif du répertoire temporaire de comparaison (« blocked by policy »). L’export immuable `.tmp/prep-base/` est conservé localement et exclu précisément par `.gitignore` ; aucun travail d’un autre worktree n’est modifié.

**Git — BLOQUÉ par les permissions de cet environnement.** La branche courante a été vérifiée : `feat/dobby-v7-preparations-20261112`. La tentative `git add` des seuls chemins de la mission échoue :

```text
fatal: Unable to create 'C:/Users/dubru/Dobby-E04-Runes-20261110/.git/worktrees/Dobby-V7-PREP-01-20261112/index.lock': Permission denied
```

Ce chemin est celui des métadonnées Git du worktree, hors de la racine inscriptible de la session. Aucun contournement ou changement de droits effectué. **Aucun commit créé, aucun push tenté, worktree non propre** : code, références, rapport et preuves restent présents, non commis, dans le worktree autorisé. La condition DONE « commits isolés / worktree propre / push conditionnel » reste donc non satisfaite. Les gates fonctionnels locaux ci-dessus sont PASS, avec les réserves explicites de navigateur et serveur.

Un patch de secours limité aux sources et tests est fourni dans [source-changes.patch](evidence/prep-01/source-changes.patch). Les références et preuves volumineuses restent dans leurs dossiers. Aucune fusion, publication ou mise en ligne.
