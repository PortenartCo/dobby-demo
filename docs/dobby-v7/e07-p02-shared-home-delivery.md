# Correctif E07-P02 — disponibilité partagée

Base : `d3fa29167f0494fbaaece76553100e5144dc8c52`. Même branche `feat/dobby-e07-courses-final`. Aucun changement sur une autre branche ou un autre worktree.

## Changement

Pour un foyer connecté, `at_home_quantity` est une propriété de chaque article natif. Le cœur la conserve dans les lectures, modifications, comparaisons, acquittements et choix de conflit. Le writer continue à envoyer les PATCH conditionnels sur la même révision et le même foyer. Les anciennes lignes/anciens payloads sans ce champ restent compatibles ; une sonde de colonne distingue l’absence de migration d’une panne réseau. Le champ présent dans le cache natif permet de nouvelles modifications hors ligne après rechargement.

Les articles compatibles sont regroupés et les disponibilités additionnées dans une unité commune. La déclaration totale est répartie de manière déterministe entre les articles sources dans leur unité respective. Une modification compatible conserve/convertit la disponibilité ; un changement de produit ou d’unité incompatible la remet à zéro. Suppression et clôture mettent la disponibilité à zéro sur les lignes retirées. Aucune disponibilité ne se rattache à un nom de produit au-delà des articles courants.

L’écriture d’un groupe utilise une transaction du magasin IndexedDB `items` existant, avec contrôle des valeurs/révisions attendues de toutes les lignes. Aucun autre writer ni système de synchronisation n’est ajouté. La fusion serveur et les acquittements lisent aussi la dernière ligne dans leur transaction : une réponse de pull en retard ne peut plus effacer une déclaration qui vient d’être mise en attente. Le test dédié force cet entrelacement réel dans Chromium.

Les formulaires et confirmations Courses comparent le snapshot montré à l’utilisateur avec la version courante avant mutation. Une modification reçue pendant une saisie nécessite de rouvrir le récapitulatif. Les états en attente, hors ligne et en conflit restent affichés sans prétendre que l’autre appareil a reçu la modification.

Les anciennes déclarations locales `homeByScope` sont conservées exactement et ignorées pour le calcul partagé ; elles ne sont jamais publiées automatiquement. Sans foyer connecté, le comportement local validé demeure.

## Preuves ciblées

`npm run test:e07-p02-shared-home --prefix essai-stitch-v7/tests` (serveur HTTP local du dépôt sur 8765).

- 25 tests modèle/cœur : données héritées, quantités inconnues, regroupement, imports, unités, achats, disponibilité, conflit, acquittement en vol et formulaires périmés.
- Deux profils Chromium isolés, deux utilisateurs fictifs du même foyer : 500 g requis / 200 g disponibles / 300 g à acheter, modification B→A, annulation, modification hors ligne avant et après reload, reconnexion.
- Concurrence réelle de la fixture HTTP : PATCH A suspendu pendant le PATCH B, rejet CAS, résolution explicite serveur puis locale. Aucune écriture concurrente écrasée silencieusement.
- Unités g/kg avec 251 g et fraction de kg ; édition compatible/incompatible, transaction de groupe annulée intégralement si une ligne a changé ; suppression/clôture sans reliquat ; achats réversibles et import répété après reload.
- Schéma ancien simulé : CRUD ordinaire maintenu, absence de champ dans ses payloads, déclaration refusée avec indication de migration et aucune fausse déclaration locale.
- Course de pull/édition : test reproduit en échec avant correctif, puis valide la conservation de 200 g, son PATCH CAS et son maintien après reload.

Les captures et journaux sont sous `evidence/e07-p02-shared-home/`. Les réponses HTTP sont des fixtures : **ces résultats ne sont pas une validation de deux comptes Supabase réels**.

## Migration et aperçu

SQL et procédure : `sql-proposals/dobby-v2-grocery-shared-home.sql` et `e07-p02-shared-home-migration.md`. La lecture du schéma réel est refusée par le connecteur. La migration n’a pas été exécutée, ni validée sur PostgreSQL réel. Un opérateur autorisé doit d’abord vérifier le schéma et les triggers/règles existants, puis valider sur une base de test.

Le nouveau générateur `scripts/build-dobby-shared-home-review.cjs` réutilise E07.4 et produit un aperçu avec espaces A/B distincts, backend HTTP simulé dans le navigateur, révisions CAS et stockage fictif partagé. Les actions passent par le client/cœur/writer natifs. Aucune requête vers le backend réel. Le manifeste identifie les transformations propres à la simulation et le statut `proposed-not-applied` de la migration.

GitHub Pages est actuellement configuré sur `main` (mode legacy). Publier un nouveau répertoire Pages nécessiterait donc une exception explicite à l’interdiction de modifier les autres branches. Le bundle local autonome reste préparé et testé ; aucune fusion dans `main` ni modification d’un ancien aperçu n’est faite sans cette exception.

## Résultat livré

Commit source : `a60632d20f8951d37352de4c37d063c1667e0fe1`, poussé sur la branche Courses. Paquet autonome : `/workspace/scratch/dobby-e07-p02-shared-home-a60632d.zip`. Aperçu local vérifié : `http://127.0.0.1:8766/essai-dobby-e07-p02-shared-home-a60632d/` (ouvrir A et B dans le même navigateur). Le manifeste est `committed`, toutes les empreintes des 279 entrées sont valides, et le répertoire contient 284 fichiers. Le test d’aperçu inclut le maintien du client B en navigation, la réinitialisation des deux caches et l’absence de trafic externe. Preuve : `evidence/e07-p02-shared-home/preview/verification.json`.

Tests finaux : 25 modèle/cœur + 13 contrats natifs V2 ; scénario dédié de course IndexedDB ; 10 points du scénario HTTP à deux utilisateurs ; aperçu A/B vérifié depuis le commit poussé ; reprise des effets conservée. Aucun autre module UI ni ancien aperçu modifié. La synchronisation sur deux comptes Supabase réels demeure non vérifiée (schéma inaccessible et migration non appliquée).
