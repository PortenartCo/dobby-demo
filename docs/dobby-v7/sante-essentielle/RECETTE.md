# Recette du raccordement Santé

Base de comparaison `02ebb9fe5c85ab886680d3d8da9afa1d271462e1` de #45. Les neuf vérifications GitHub de cette tête ont réussi. Les essais du raccordement ont été exécutés sur PostgreSQL 17.11 et Chromium, avec des membres et des documents fictifs.

## Contrôles Santé

| Résultat | Contrôle | Preuve |
| --- | --- | --- |
| PASS | Menu, fiche membre, Agenda et Aujourd’hui à 320, 390 et 1440 px. Entrée fermée sans identité ni double autorisation. | `node essai-stitch-v7/tests/health-native-ui.cjs` |
| PASS | Parent et enfant sur les routes natives, partage sélectif et révocation, modification du carnet, PDF envoyé et relu via le transport natif. | `health-native-ui.cjs`, scénario Chromium local |
| PASS | Parent remplacé dans un autre onglet. Refus de l’ancien jeton avant requête et retour réel depuis le cache de navigation Chromium avec une nouvelle liaison de compte. | `health-native-ui.cjs`, trace `trusted Chromium BFCache restore` |
| PASS | Les anciens carnets et pièces restent dans le profil. Le dialogue, la recherche, les aperçus, les archives et l’export général ne les restituent pas. | `health-chat-privacy.test.cjs`, `settings-backup.cjs`, `family-access-native-socle.test.mjs` |
| PASS | Parent A et B, enfant et foyer étranger. RPC, accès direct, ACL, partage et révocation, rappels J‑1/J0 calculés au jour civil, concurrence et absence de doublon. | `python3 docs/dobby-v7/sante-essentielle/test-postgres.py`, 7 groupes |
| PASS | Préflight en lecture seule et installation par propriétaires séparés. HTTP réel local PostgREST 14.8 et Storage 1.89.12 avec octets PDF et PNG, cache interdit et refus des liens signés. | `python3 docs/dobby-v7/sante-essentielle/test-postgres.py --storage` |
| PASS | Retrait sans Auth, ancien snapshot, réutilisation refusée, concurrence, invitation au membre existant, nouvel enfant homonyme privé du carnet et du rendez-vous de l’ancien. Les données d’essai de l’ancien carnet demeurent stockées. | `python3 docs/dobby-v7/sante-essentielle/test-identites-famille.py`, 6 groupes |
| PASS | Une suspension ferme les RPC et Storage et maintient la fermeture aux anciennes écritures Santé partagées. Famille et Contrats continuent leurs écritures ordinaires. | Scripts PostgreSQL ci-dessus et `modules-flow.test.mjs` |
| SKIP | Nouveau foyer réel, deux parents, enfant Auth réel et opérations du fournisseur Supabase. | Mise en service #35, procédure séparée |

Les essais navigateur utilisent le vrai parcours V7 et le client natif sur des réponses HTTP fictives. Les essais de droits et d’octets HTTP utilisent des services réels sur réseau Docker privé et un catalogue Famille de test. Les tests ne modifient aucun environnement hébergé.

Pour Chromium, définir `DOBBY_TEST_ORIGIN=http://127.0.0.1:8767`, `CHROMIUM_PATH=/usr/bin/chromium` et, au besoin, `DOBBY_HEALTH_EVIDENCE` vers un répertoire de captures. L’origine est servie avec le serveur HTTP décrit dans le README. Les scripts PostgreSQL sont reproductibles selon [INSTALLATION.md](INSTALLATION.md).

## Non-régression V7

- Le checkpoint local `npm test --prefix essai-stitch-v7/tests` passe dans le périmètre du socle #45. Il exécute entre autres le Menu, Réglages, Sauvegarde, Contacts, Notes, Cuisine E07 et la synchronisation des courses après interruption.
- Runes lot 2, Catalogue et Avec mes ingrédients passent sous Chromium à 320, 390 et 1440 px. Le catalogue utilise des ZIP fictifs. Le parcours vérifie les index exacts des images d’étapes classiques et TM5, WebP et le rechargement.
- La suite autonome Réglages/Sauvegarde passe ses 17 scénarios. Le Menu garde ses six entrées historiques quand Santé est fermée. Le test natif Santé vérifie sa nouvelle entrée lorsque les deux contrôles sont disponibles.
- Les deux pages de smoke test V5 passent sous Chromium, y compris la conservation des anciennes lignes Santé dans le stockage local et leur absence dans Famille. La reconstruction des quatre pages V7 produit les fichiers versionnés à l’octet près. Les 28 contrôles de provenance et d’intégration V5/V7 passent.
- La campagne élargie Node s’arrête à 707 réussites sur 709, avec deux échecs comptés pour un seul défaut hérité. `menu-review-build.test.cjs` et son test parent échouent sur la ressource locale `../../assets/contacts/stitch24.png`. La reproduction dans une copie complète au SHA de #45 donne le même résultat.
- La campagne navigateur `npm run test:all --prefix essai-stitch-v7/tests` passe les parcours jusqu’à la consolidation commune, puis s’arrête dans `e01-consolidation.cjs` sur le texte attendu de la récurrence de mission. Le même test échoue sur la même assertion au SHA de #45. Les scénarios suivants de cette commande restent non exécutés par la campagne. Les parcours ciblés cités dans ce rapport ont été lancés indépendamment.

## Comparaison des parcours historiques

- `family.cjs` et `family-edge.cjs` échouent déjà sur #45 au sélecteur masqué `#member-category`. Même résultat sur l’intégration.
- `family-review.cjs` échoue déjà sur #45 dans les attentes historiques des états sélectionnés. La branche donne le même résultat.
- `family-shared.cjs` échoue sur #45 à l’attente du registre partagé. Sur la branche, son ancien bouton de création Santé partagée n’existe plus pour une session connectée. Le partage explicite est couvert par le test Santé natif et ses projections serveur.
- `fam-agenda-memos-sync.cjs` échoue sur les deux têtes parce que sa fixture ne prévoit pas `dobby_missions_v3_capabilities`. Le test visuel Famille passe sur les deux têtes.
- `e06-shared.cjs` expire sur l’attente de la disponibilité du module Famille sur #45 et sur cette branche.
- La restauration avec modification concurrente après confirmation a passé la suite Sauvegarde autonome et l’essai ciblé sur les deux têtes. L’exécution du checkpoint complet a aussi observé une expiration intermittente lors du rechargement, après les vérifications de refus et de contenu.

## Conditions de mise en service

Confirmer les délégations sous les propriétaires autorisés et le rôle de plateforme, inventorier et vérifier les copies historiques privées, puis neutraliser les anciennes références Santé de façon expressément autorisée. La suppression de la référence dans un module ne suffit pas à retirer l’accès à des octets ayant été historiquement placés dans le bucket familial. La recette des comptes réels et le GO #35 restent distincts de ces résultats.
