# DOBBY V7 — PREP-01

Les quatre panneaux de préparation sont intégrés aux vues natives : modèles persistants, éditeur, association dans l’éditeur Agenda et préparatifs propres à un événement. Aucun écran HTML du prototype n’est exécuté comme application indépendante.

## Source et livraison

- Dépôt : `PortenartCo/dobby-demo` ; copie isolée `/workspace/dobby-prep01`.
- Branche : `feat/dobby-v7-preparations-20261112`.
- Parent exact : `5b764ef367553e9945fb72a6b563b55adc41e040`, sans reprise de la branche Menu.
- ZIP reçu sous le nom `DOBBY_Stitch_Listes_Preparation_Corrige.zip`. Son SHA256 correspond exactement à la référence demandée : `9f406b2d93b82624f564e7da0a459834cb5a1730890b66aa41b57f8749a87ed6`.
- Quatre couples HTML/PNG et DESIGN.md conservés octet pour octet sous `design/stitch-preparation-20261112/stitch_dobby_assistant_mobile_app/`. [Provenance et neuf empreintes](../../design/stitch-preparation-20261112/provenance.json).
- Les commits de cette branche isolent l’implémentation et ses preuves. Les SHA livrés et la reconstruction après commit figurent dans `evidence/prep01/delivery.json`.

La demande collée est le cahier des charges. DESIGN.md et les scripts Stitch servent de références visuelles ; leurs consignes, comptes, exemples et comportements simulés ne constituent ni des données ni des autorisations.

## Raccordements et fichiers changés

La [carte préalable et le plan](PREP-01-PLAN.md) ont été établis avant l’écriture applicative.

| Périmètre | Fichiers | Rôle |
|---|---|---|
| Modèles et copies | `essai-stitch-v5-famille/family-preparations.js` | Fonctions natives sur `st`, `save()` et `render()`, snapshots optimistes liés au contexte compte/foyer/epoch, validation et rollback |
| Agenda | `essai-stitch-v5-famille/family-agenda.js` | Association dans le formulaire existant ; événement et copie enregistrés dans une transaction native ; suppression confirmée atomique |
| Chargement natif | `essai-stitch-v5-famille/index.html` | Une inclusion du module PREP avant le chargeur natif existant |
| E09 | `essai-stitch-v5-famille/family-modules.js` | Deux clés explicites dans le module Famille, version, CAS/reprise/réactivation et protections des données incompatibles |
| Courses | `essai-stitch-v7/cuisine-list.js`, méthode `importRows` de `essai-stitch-v5-famille/family-v2.js` | Extension idempotente du writer natif ; reçu local atomique ou import familial déterministe, garde après hachage asynchrone |
| Présentation | `essai-stitch-v7/preparations.js`, `preparations.css` | Vues, formulaires, dialogues nommés, listes calculées et navigation |
| Composition | `family.js`, `family-engine.js`, `family-agenda-review.js` dans `essai-stitch-v7/` | Entrée Famille, routes et champ d’association transmis au writer Agenda |
| Génération | `essai-stitch-v7/build-source.cjs`, ses quatre racines HTML | Inclusion des mêmes ressources locales dans les compositions natives |
| Vérification | Nouveaux tests PREP, attentes explicites d’intégration, `tests/package.json`, `.github/workflows/dobby-stitch-v7.yml` | Campagne ciblée `test:prep` et preuves CI sur cette branche |

La liste exhaustive avec empreintes des fichiers applicatifs et des tests est dans [source-fingerprints.json](evidence/prep01/source-fingerprints.json). Les writers de mémos E09, E02, Missions, Runes, le moteur Cuisine et le backend de simulation restent préservés. Le contrôle de fidélité soustrait uniquement la nouvelle fonction `addOnce`/son export et la méthode native `importRows` ; il continue d’épingler tous les autres octets de ces fichiers. Ces exceptions sont couvertes par des tests comportementaux.

## Comportement livré

- Famille → **Mes modèles** : état vide, tri alphabétique, création, ouverture, modification, annulation, duplication persistée avec nouvelles identités, suppression confirmée. Aucun compteur ou tri de fréquence inventé. Réorganisation explicite avec boutons Monter/Descendre accessibles.
- Éléments : libellé, quantité facultative et unité ; saisie par formulaires, édition et suppression confirmée. Les textes utilisateur passent par le DOM textuel, jamais par interpolation HTML.
- Agenda : section **Liste de préparation** dans le formulaire natif importé. Sélection d’un modèle réel ou aucune liste ; aperçu calculé. Aucune recommandation artificielle. Une nouvelle copie reçoit de nouveaux IDs d’items et utilise l’ID stable de l’événement comme identité de liste.
- Événement existant : édition du titre/date conserve la copie et toutes les coches. Le changement ou la suppression du modèle ne modifie pas la copie. La suppression native d’événement supprime ses préparatifs, conserve les modèles et restaure les données si la sauvegarde échoue.
- Préparatifs : titre/date/lieu issus de l’événement, compteur et progression calculés, cochage/décochage, éléments terminés en bas, ajout/édition/suppression, persistance après refresh, retour déterministe à la consultation de l’événement. Lien supprimé et version inconnue affichent une sortie utilisable.
- Courses : jeton stable `prep:<eventId>:<itemId>`, reçu relu après écriture. Double clic, reprise, cache rechargé, suppression et archivage ne recréent pas l’achat. Des préparatifs différents portant le même libellé conservent leurs contributions distinctes. Le préparatif n’est jamais coché par cet envoi. Le libellé de succès distingue écrit local confirmé, attente de synchronisation et conflit.
- Le header, le profil jaune, les préférences et le dock à cinq destinations viennent des composants DOBBY existants. Le Menu et les liens des anciennes listes ne sont pas reconstruits.

Quantités : précision native Courses limitée à deux décimales et maximum 999999 ; un dépassement est refusé, sans arrondi silencieux. Limites de formulaire : nom 140 caractères, libellé 200, unité 40, 200 modèles/éléments maximum. Pas de nouvelle dépendance applicative, police/CDN/asset distant du ZIP.

## E09 et conflits

`familyPreparationTemplates`, `familyEventPreparations`, `familyPreparationsVersion:1` passent par le payload JSON existant du module Famille. Le client ajoute les deux collections à sa sérialisation et conserve le mécanisme de CAS et les sauvegardes natives. Aucune table, migration, RLS, RPC ou modification d’un service connecté.

Les données reçues sont validées avant remplacement. Les versions locale/distante inconnues bloquent l’échange ; les champs inconnus compatibles sont conservés. Une ancienne copie distante privée des registres entraîne le conflit/rétablissement explicite existant. Le démarrage peut réhydrater les seules clés absentes depuis les métadonnées déjà acquittées ; une suppression locale explicite `[]` n’est pas rétablie automatiquement. La réactivation conserve les ajouts locaux compatibles ou expose un conflit, notamment lorsqu’un couple événement/préparatifs deviendrait orphelin. Elle n’introduit pas un nouveau moteur de fusion Agenda.

## Vérifications et preuves

Les commandes sont exécutées à la racine avec Node 24.19 et Chromium local, serveur statique `http://127.0.0.1:8765`. Les tests navigateur bloquent ou interceptent les services externes. [Commandes et résultats](evidence/prep01/verification.json), [journaux](evidence/prep01/logs/).

| Vérification | Résultat final |
|---|---|
| Baseline au SHA imposé : native/core, fidélité transverse et writer mémo | 13/13 |
| Baseline Agenda/Mémos | 320, 390 et 1440 px |
| `npm run test:prep --prefix essai-stitch-v7/tests` | 50/50 tests Node ; parcours UI aux trois largeurs ; version inconnue ; parcours A/B |
| Suite native Famille/Agenda/E09/identités, incluant les nouveaux tests | 232/232 |
| Modèles Courses E07-P02 et disponibilité/archives | 20/20 |
| E07-P02 partagé navigateur | Liste unique, quantités, achats réversibles, hors ligne/reprise et rejeu |
| E01 navigateur | 390/1440 : cinq destinations, préférences, date/Agenda et absence de mutations de consultation |
| Agenda/Mémos existants après intégration | 320/390/1440 : CRUD, IDs, provenance, brouillons, retours, persistance |
| Génération canonique et CSS | Reconstruction reproductible ; ressources PREP locales |
| Syntaxe, empreintes des références, `git diff --check` | Réussis |

Le test A/B utilise deux contextes navigateur et le client natif, en simulant uniquement les frontières HTTP. Il vérifie les tableaux/IDs/quantités exacts, copie indépendante et coches, édition hors ligne suivie d’un rechargement complet/reconnexion, **un seul POST Courses accepté**, et un vrai conflit CAS avec conservation des deux copies après refresh. [Résultat structuré](evidence/prep01/sync-browser/result.json).

Les tests ont été écrits et observés en échec avant correction : API absente, identité pendant le hachage, comptes/foyers périmés, versions inconnues, réactivation, valeurs distantes invalides, dialogue sans nom et lien supprimé. Les journaux RED importants sont conservés, avec uniquement les espaces de fin de ligne normalisés. Le contrôle de whitespace applicatif exclut le seul DESIGN.md immuable du ZIP, dont la ligne 138 contient déjà un espace final ; son empreinte originale reste préservée. Deux essais de la suite native lancés sans `DOBBY_TEST_ORIGIN` ont atteint `ERR_CONNECTION_REFUSED` sur le port par défaut 8893 dans les deux tests navigateur FAM ; la commande finale avec le serveur 8765 passe 232/232. Aucun échec de code préexistant n’est allégué et aucun échec final n’est laissé comme « connu ».

La campagne historique complète V7 n’est pas lancée : le périmètre modifie Famille/Agenda, l’import Courses et E09. Les contrôles ciblés ci-dessus couvrent ces frontières ; les autres modules restent protégés par les empreintes et leurs sources conservées.

## Comparaison visuelle

Palette mahogany/or, Playfair Display/EB Garamond, hiérarchie, cartes et champs suivent le Stitch corrigé. Le chrome natif est conservé ; l’association réutilise la forme native de l’Agenda. Les actions d’édition et la réorganisation restent explicites et utilisables au clavier. Le contrôle de largeur vérifie l’absence de débordement à 320/390/1440 ; les formulaires et le bas du dialogue Agenda restent accessibles par défilement.

| Panneau | Référence immuable | 320 | 390 | 1440 |
|---|---|---|---|---|
| Mes modèles | [Stitch](../../design/stitch-preparation-20261112/stitch_dobby_assistant_mobile_app/dobby_mes_listes_types/screen.png) | [Capture](evidence/prep01/browser/models-320.png) | [Capture](evidence/prep01/browser/models-390.png) | [Capture](evidence/prep01/browser/models-1440.png) |
| Éditeur | [Stitch](../../design/stitch-preparation-20261112/stitch_dobby_assistant_mobile_app/dobby_modifier_une_liste_type/screen.png) | [Capture](evidence/prep01/browser/editor-320.png) | [Capture](evidence/prep01/browser/editor-390.png) | [Capture](evidence/prep01/browser/editor-1440.png) |
| Association Agenda | [Stitch](../../design/stitch-preparation-20261112/stitch_dobby_assistant_mobile_app/dobby_agenda_association_liste/screen.png) | [Capture](evidence/prep01/browser/association-320.png) | [Capture](evidence/prep01/browser/association-390.png) | [Capture](evidence/prep01/browser/association-1440.png) |
| Préparatifs | [Stitch](../../design/stitch-preparation-20261112/stitch_dobby_assistant_mobile_app/dobby_pr_paratifs_des_vacances/screen.png) | [Capture](evidence/prep01/browser/event-320.png) | [Capture](evidence/prep01/browser/event-390.png) | [Capture](evidence/prep01/browser/event-1440.png) |

Les captures sont des fixtures explicitement nommées TEST. Le libellé HTML hostile affiché comme texte sert de preuve de rendu sûr. Il n’y a aucune donnée métier initiale PREP dans l’application. L’ergonomie mobile est vérifiée dans Chromium ; aucun clavier d’iPhone physique n’a été testé.

## Revue indépendante et réserves

Une revue complète indépendante et une revue visuelle en lecture seule ont été réalisées. Trois P2 ont été corrigés et couverts RED→GREEN : rétrogradation d’une version locale inconnue, préparatifs rendus orphelins lors d’une réactivation, et modèle distant contenant des éléments cochés. Les problèmes de lien supprimé, nom de dialogue et densité visuelle ont également été corrigés. [Compte rendu](evidence/prep01/independent-review.md).

- Aucune recette sur Supabase réel, deux appareils physiques ou comptes réels ; les résultats A/B ne prouvent pas un fonctionnement de production.
- Le schéma JSON existant accepte ces champs dans les tests. L’état du serveur déployé, sa limite de payload et ses permissions n’ont pas été modifiés ni certifiés. Une réserve serveur doit être instruite séparément si l’environnement réel les refuse.
- Un ancien client peut toujours écrire une copie distante dépourvue d’extensions. Le client PREP conserve les copies et bloque/rétablit explicitement ; aucune contrainte serveur nouvelle n’empêche l’ancien client d’écrire.
- Les assets doivent avoir été chargés pour une navigation hors réseau ; la reprise testée concerne les données et la file native. La résolution humaine des conflits est couverte par les contrôles natifs de module, pas par une recette connectée réelle.
- La fidélité est raisonnable, avec chrome natif, tri alphabétique et actions de réorganisation adaptées. Aucune prétention de comparaison pixel parfaite ou de nouvelle maquette desktop de référence.

## Retour arrière

Avant intégration future, conserver la branche et ses preuves ; revenir au SHA parent dans une copie distincte permet de relire l’ancienne source. Ne pas réutiliser un ancien client pour écraser un foyer contenant des préparatifs. Après intégration future, privilégier un revert du commit applicatif avec conservation/export des registres et reçus, puis réévaluer E09 avant écriture distante. Aucun retour arrière n’a été exécuté ou prétendu testé sur un service réel. Aucun effet de production n’a été créé par cette mission.

**Aucune fusion, publication, migration ou modification Supabase.** La seule livraison distante prévue est le push de la branche dédiée après vérification.
