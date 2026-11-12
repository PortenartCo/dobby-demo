# E09 — Salon des Curiosités et mémos familiaux

Aperçu de revue : https://portenartco.github.io/dobby-demo/essai-dobby-e09-famille-salon-review-20261112/

Branche source : `feat/dobby-e09-famille-salon-20261112`, issue de `69ef361ad139356c2d1473d825f9231e7610b0e4`.
Worktree : `/workspace/dobby-e09-famille-salon-20261112`.

## Livraison

| Commit | Contenu |
| --- | --- |
| `2496380` | Checkpoint A : composition compacte du Salon, trois rubriques, boutons et états vides |
| `965645d` | Checkpoint B : registre partagé, facade d’écriture, import explicite et tests |
| `01d35be` | Profil E09 du générateur existant |
| `1578ef4963ce52213baf40532f52570f45d23283` | Corrections de revue et source exacte du bundle final |
| `249be83ed13703af29657c87f36e44859863beb6` | Publication Pages du nouveau dossier uniquement, sans fusion applicative |

Le manifeste du bundle final porte `sourceState=committed`, `sourceDirtyPaths=[]`, `realBackend=false` et le préfixe `dobby-review-e09-20261112|`.
La publication ajoute 283 fichiers dans un seul nouveau dossier. Les 26 entrées racine préexistantes sont identiques à leur parent `c6ef62aa552da635fe04ccfb5ecdf20e8db9daba` ; preuve : [publication-scope.json](evidence/e09/publication-scope.json). Aucun dossier d’essai remplacé, aucun réglage Pages modifié.

## Résultat

Illustration et cadrage conservés sur 220 px, cartouche en bas à droite, sans la mention Cheminée allumée. Introduction ramenée à 82,5–103,5 px selon largeur. Trois rubriques dans l’ordre demandé : Horloge, Agenda, Volière. Titres repris du système Menus/Grimoire de la Taverne : Playfair Display 16 px, graisse 700, interligne 24 px, couleur #fcf7ee et marges nulles. Sous-titres et boutons uniformes, disposition sur deux lignes à 320 px.

Les états vides réutilisent la structure `e01-empty` de l’Accueil : carte brune, bordure discrète, message doré et explication compacte. La section Archives & Accès Rapides est retirée après reconstruction dynamique du Salon. Le menu existant conserve Archives documentaires et Sauvegarde complète ; aucune destination dupliquée.

Les trois boutons ouvrent les parcours existants : Gérer les membres, formulaire natif d’événement et formulaire de mémo. Les maquettes Stitch et la refonte détaillée des sous-pages ne sont pas modifiées.

## Mémos et compatibilité

`sharedFamilyNotes` et `familyNotesVersion: 1` sont ajoutés au seul payload du module `family`. Les nouveaux mémos suivent le `save()` natif, les révisions CAS, les sauvegardes et le choix de conflit du module. Identité stable, titre, contenu et mots-clés ; édition et suppression partagées. En l’absence de foyer/partage, ils restent sur l’appareil en attente, avec statut explicite. Aucun affichage « Synchronisé avec le foyer » sans confirmation.

Les anciens `familyNotes` restent distincts et locaux. Le registre présente leur import individuel après confirmation ; l’identité d’import est déterministe, les répétitions ne créent pas de doublon et ne rétablissent pas une ancienne version par-dessus une modification partagée. Les originaux locaux ne sont pas supprimés. Une erreur de stockage restaure l’état mémoire précédent. Les liens historiques et les formulaires contenant des champs opaques restent protégés.

Les champs inconnus du payload Famille sont conservés dans le snapshot confirmé, y compris après résolution. L’activation utilise la version de base pour distinguer une copie inchangée d’une édition en attente. Une vraie divergence reste consultable dans le choix de conflit. Les données reçues sont réconciliées champ par champ si une saisie intervient pendant un envoi.

**Limite des anciens clients :** un ancien client qui remplace tout le payload peut toujours retirer le nouveau champ sur le serveur. Un client mis à jour ayant conservé sa copie confirmée détecte cette perte, conserve ses mémos, bloque l’envoi et propose un rétablissement explicite en préservant les autres données actuelles du foyer. Les autres clients peuvent ensuite reprendre. Cette protection ne constitue pas une interdiction serveur et ne garantit pas la récupération sur un appareil neuf sans copie antérieure. Une garantie absolue nécessite une évolution serveur ou la mise à jour de tous les anciens clients, hors de cette mission qui interdit les migrations SQL.

## Validation

| Vérification | Résultat |
| --- | --- |
| Tests Node ciblés | 80/80 : 73 du socle familial, 5 facade mémos, 1 générateur E09, 1 générateur intégré existant |
| Scénarios E09 du module, inclus ci-dessus | 14 : CRUD, conflit, hors ligne/reprise, payload ancien/inconnu, activation/import, perte/rétablissement du protocole, édition pendant PATCH, CAS en compétition et cas de revue |
| Chromium, deux profils + HTTP simulé | Création/relecture/édition/suppression, recharge hors ligne/reconnexion, import explicite répété, original local et autres données préservés |
| Registre famille existant | PASS 320/390 px : contacts, listes et nouveaux mémos ; annulation, recherche, persistance et suppression |
| Préservation des fiches historiques opaques | PASS 320/390 px |
| Salon et trois boutons | PASS 320/390/1440 px, source et bundle final ; aucun débordement, image 220 px |
| Aperçu public GitHub Pages | PASS 320/390/1440, trois parcours ; 280 ressources HTTP et SHA256 identiques, création/recharge/reset et isolation sans erreur JavaScript ni requête externe |
| Bundle final local | 280 ressources HTTP 200 avec empreintes SHA256, données fictives, CRUD/recharge/reset, Storage/IndexedDB isolés, aucune requête externe ni mutation réseau |

Preuves : [tests finaux](evidence/e09/final-unit.log), [deux profils](evidence/e09/sync-browser.log), [revue indépendante et corrections](evidence/e09/review.md), [bundle final](evidence/e09/final-bundle/), [preuves hébergées](evidence/e09/hosted/). Les preuves de l’aperçu candidat initial sont conservées séparément ; seul `final-bundle` et `hosted` portent la source finale `1578ef4`.

Les tests n’utilisent aucun compte, foyer ni donnée réelle. Aucune migration SQL ni opération sur Supabase réel. La recette physique sur deux appareils réels, Safari/iPhone et réseau familial réel reste à effectuer. La démonstration publique bloque les comptes réels et reste locale/en attente ; les échanges entre clients sont prouvés par les fixtures, pas revendiqués depuis la démo.

Les workflows CI existants se déclenchent automatiquement au push ; aucune campagne exhaustive E01–E08 n’a été lancée manuellement. Leur état exact est conservé avec les preuves de livraison, sans élargir la mission aux autres modules.

## Fichiers et intégration

Fichiers applicatifs/build modifiés :

- `essai-stitch-v7/family.js`
- `essai-stitch-v7/family.css`
- `essai-stitch-v7/family-engine.js`
- `essai-stitch-v7/family-register.js`
- `essai-stitch-v5-famille/family-modules.js`
- `scripts/build-dobby-review.cjs`
- `scripts/review/e09-config.js`

Tests ajoutés ou adaptés : `tests/family-notes-sync.test.mjs` et `tests/integration.test.mjs` dans V5 ; `tests/e09-{salon,family,hosted}.cjs`, `tests/e09-memo-writer.test.cjs`, `tests/e09-preview.test.cjs` et `tests/register-family.cjs` dans V7. Spécification, plan, journal et preuves sous `docs/`. Liste exhaustive : [files-modified.txt](evidence/e09/files-modified.txt).

**Chevauchement d’intégration :** `essai-stitch-v5-famille/family-modules.js` est également modifié sur les branches Runes, notamment `feat/dobby-shared-runes-v2-20261111`. E09 ajoute des chemins limités à `family` et conserve les traitements Missions/Runes/Cuisine/Courses. Les modifications de fonctions communes de sélection/snapshot nécessiteront une intégration manuelle attentive. Aucune branche parallèle ni aucun worktree voisin n’a été modifié, aucune fusion automatique et aucun force-push.

Arrêt après livraison de l’aperçu pour revue utilisateur des trois sous-pages.

## État constaté à la livraison

- [Dobby Sync regression (local)](https://github.com/PortenartCo/dobby-demo/actions/runs/43126243397) : success, source `1578ef4963ce52213baf40532f52570f45d23283`.
- [Dobby V7 - Stitch functional UI](https://github.com/PortenartCo/dobby-demo/actions/runs/43126243301) : success, source `1578ef4963ce52213baf40532f52570f45d23283`.

Le reçu API Pages et son run déclarent le précédent head `c6ef62a`. La présence effective du nouveau dossier est établie séparément par son manifeste public et les 280 empreintes HTTP, identiques au bundle source `1578ef4` ; le commit Git publié est `249be83`. Aucune équivalence entre ces métadonnées n’est supposée.

Le commit final de recette contient la documentation, les preuves et une adaptation du client HTTP de test au proxy de cet environnement. Les empreintes des 278 fichiers source du bundle sont toujours identiques à la source `1578ef4`. Il porte `[skip ci]` pour éviter de relancer la campagne générale sur ces seules preuves.
