# Candidates indépendantes Lot 5B — aucune activation

Ces fichiers ne sont pas des migrations automatiquement applicables. Ils complètent les migrations historiques inchangées et restent soumis au [rapport de réconciliation](../../../docs/dobby-v7/administration-privee/lot5b/RAPPORT.md).

- `maintenance-roles.preflight.sql` : lecture seule ; conserve la condition ADMIN fermée, puis projette la fermeture des seules attributions directes faites par `postgres`. Refuse une autorité résiduelle venant d’un autre grantor ou chemin indirect. La double attribution normale ADMIN géré fermé + attribution temporaire `postgres` n’est pas rejetée. Aucun rôle n’est réparé ou modifié.
- `auth-bridge.candidate.sql` : trois fonctions privées, détenues par `postgres`, pour existence de session bornée et projection d’identité minimale. Aucun grant Auth, nouveau BYPASSRLS, changement de RLS/owner, rôle géré ou clé technique. Les readers n’obtiennent que USAGE de ce nouveau schéma et EXECUTE de leurs fonctions distinctes. Aucun flag d’activation ou helper historique n’est remplacé.
- `auth-bridge.rollback.sql` : vérifie les corps locaux connus et les attributs explicitement contrôlés (owner, SECURITY DEFINER, volatilité, search_path), retire uniquement les trois fonctions et leur schéma avec RESTRICT. Refuse un corps altéré ou une dépendance cataloguée ; n’ouvre aucune ancienne permission. Ce contrôle n’est pas une comparaison de toute la définition et ne détecte pas les consommateurs PL/pgSQL ou dynamiques non enregistrés dans `pg_depend` : leur rollback doit être coordonné lors du futur raccordement.

Les droits Auth préexistants du propriétaire des fonctions doivent être prouvés. Si RLS le prive de visibilité, les fonctions ne rendent aucun résultat positif. La preuve locale positive utilise **des policies fictives réservées à l’installateur**, qui ne sont ni une reproduction du projet hébergé (où zéro policy est rapporté), ni une proposition de policy distante. Tous les rôles non-superuser de cette fixture sont NOBYPASSRLS. Cela teste le contrat et la séparation, pas les privilèges gérés de Supabase.

Le raccordement reste **BLOQUÉ** : les actuels `session_is_live`, `auth_identity`, `auth_identity_page` et activateurs Lots 1/3 attendent encore les grants directs ; le préflight Storage épingle le helper de session historique. Un paquet réconcilié doit coordonner leurs remplacements et leurs empreintes, maintenir les gates fermées jusqu’aux preuves requises et préserver le contrôle d’autorisation applicatif. Ne pas appliquer le bridge seul comme une réparation complète, ni changer les MD5 attendus pour ignorer ce point.

Tests réels PostgreSQL, uniquement locaux :

```sh
docker --host unix:///var/run/docker.sock pull postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4
node --test --test-concurrency=1 tests/private-access/lot5b/*.test.mjs
```

La fixture possède ses conteneurs, utilise `--network none`, tmpfs, aucun port/bind mount et aucun paramètre de connexion distante. Les transactions de test remplacent seulement les BEGIN/COMMIT externes des candidates par la transaction contrôlée du test. Aucun GoTrue, Storage HTTP ou e-mail n’est démarré. Les huit policies du test d’autorité Storage sont des sentinelles fictives, pas les huit policies hébergées certifiées.
