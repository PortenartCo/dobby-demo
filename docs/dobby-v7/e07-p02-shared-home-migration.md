# Disponibilité familiale — SQL proposé et validation séparée

État : **non exécuté**. Les lectures de métadonnées du projet `pqcdkrwljgvgagzwrcmg` ont été refusées par les outils Supabase (`You do not have permission to perform this action`). Le dépôt confirme le contrat V2 mais ne contient pas le DDL de la table V2. Aucun accès à des données familiales réelles, aucune mutation distante.

La colonne proposée `at_home_quantity numeric NOT NULL DEFAULT 0` porte une quantité disponible dans l’unité de chaque article. Les lignes existantes commencent à zéro. Les anciennes déclarations `homeByScope` restent dans le navigateur, ignorées pour les lignes partagées et jamais publiées automatiquement. Pas d’inventaire ni de table supplémentaire.

## Préflight en lecture seule par un opérateur autorisé

```sql
SELECT column_name,data_type,is_nullable,column_default,numeric_precision,numeric_scale
FROM information_schema.columns
WHERE table_schema='public' AND table_name='dobby_v2_grocery'
ORDER BY ordinal_position;
SELECT conname,pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='public.dobby_v2_grocery'::regclass;
SELECT tgname,pg_get_triggerdef(oid),pg_get_functiondef(tgfoid)
FROM pg_trigger WHERE tgrelid='public.dobby_v2_grocery'::regclass AND NOT tgisinternal;
SELECT relrowsecurity FROM pg_class WHERE oid='public.dobby_v2_grocery'::regclass;
SELECT policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename='dobby_v2_grocery';
SELECT grantee,privilege_type,column_name FROM information_schema.column_privileges
WHERE table_schema='public' AND table_name='dobby_v2_grocery';
```

Vérifier : table attendue, quantité/unité/révision, RLS par foyer, trigger qui augmente la révision sur chaque UPDATE (y compris seulement `at_home_quantity`), accès des rôles existants à la nouvelle colonne. Si une colonne de disponibilité existe déjà avec un autre contrat, arrêter et adapter avant application. Si `at_home_quantity` préexiste, confirmer son type numeric sans arrondi imposé, sa valeur par défaut 0 et son caractère NOT NULL ; le SQL ne réécrit pas un contrat existant. Aucun privilège ni trigger n’est ajouté implicitement.

## Procédure

1. Sauvegarder le schéma exact, les politiques, triggers et données de la table dans les procédures existantes.
2. Appliquer `sql-proposals/dobby-v2-grocery-shared-home.sql` **sur une base de test isolée**. La proposition ne recrée aucune table, politique, fonction ou trigger. Son timeout de verrouillage évite une attente longue.
3. Vérifier le nouveau champ et le rejet des nombres négatifs, NaN et Infinity. Vérifier une précision de `0.001` kg.
4. Avec deux comptes fictifs membres du même foyer de test, vérifier les cas de la fixture `e07-p02-shared-home.cjs` : 500/200/300, modification, annulation, hors ligne, conflit CAS avec résolution explicite, conversion, suppression/clôture, imports et achats réversibles.
5. Avec un ancien client : PATCH des anciens champs omettant `at_home_quantity` doit préserver sa valeur et incrémenter la révision ; les anciennes lignes restent lisibles. Un ancien client ne connaît pas l’affichage de disponibilité ; une modification d’unité faite par cet ancien client requiert de revérifier la déclaration dans le nouveau client.
6. Sans la migration : la sonde de colonne doit reconnaître 42703/PGRST204, les courses ordinaires doivent rester fonctionnelles, une déclaration partagée doit être refusée explicitement. Une panne réseau de la sonde n’est jamais interprétée comme une absence de colonne.
7. Faire approuver le SQL et la preuve de test avant une éventuelle application réelle. Recharger le cache de schéma PostgREST, synchroniser les deux clients et constater la révision/valeur persistée côté serveur.

## Retour arrière

Revenir à l’ancien client en laissant la colonne additive en place : ses PATCH omettent le champ, sans l’effacer. Ne pas supprimer la colonne ni ses valeurs pour un retour applicatif. Si une application de migration échoue avant COMMIT, la transaction est annulée. La validation SQL sur PostgreSQL et l’essai avec deux comptes réels restent à effectuer après accès et autorisation ; la simulation HTTP n’en constitue pas la preuve.
