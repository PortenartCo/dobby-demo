# Candidates indépendantes Lot 5B — aucune activation

**Alternative sans ADMIN V7 : BLOQUÉE.** Voir [le diagnostic](../../../docs/dobby-v7/administration-privee/lot5b/V7-SANS-ADMIN.md). `v7-preserved.candidate.sql` et son fragment `v7-preserved.guards.sql` avortent inconditionnellement dans BEGIN avant toute DDL ; ils ne sont pas activables. Le préflight spécifique n’exclut ADMIN V7 que pour le plan exact préservant ses deux RPC ; le défaut strict reste intact. `v7-preserved.rollback.sql` est une quarantaine partielle, sans perte/élargissement dans la fixture, qui ne restaure pas les lectures READ ONLY. Génération/contrôle : `node supabase/compatibility/lot5b/build-v7-preserved.mjs [--check]`. Aucun flag de déblocage n’est fourni.

Ces fichiers ne sont pas des migrations automatiquement applicables. Ils complètent les migrations historiques inchangées et restent soumis au [rapport de finalisation](../../../docs/dobby-v7/administration-privee/lot5b/RAPPORT-FINALISATION.md).

Finalisation du catalogue : `approved-catalogue.json` conserve les 27 paires de référence et les 21 paires hébergées explicitement fournies après comparaison lexicale rapportée par ChatGPT. Aucun corps privé ni normaliseur permissif n’est utilisé. `catalogue.preflight.sql` contrôle ces paires indivisibles, owners/attributs/ACL et l’attache du stamper. `missions.preflight.sql` vérifie les douze MD5 de définition du manifeste public, sans stub.

`lot2a-compatible.candidate.sql` ajoute ces contrôles et le préflight des rôles à la migration Lot 2A, dont la seule condition d’empreintes est adaptée aux paires approuvées. `lot2a-compatible.rollback.sql` vérifie l’ensemble exact des définitions restaurables, les owners sauvegardés et courants ainsi que les permissions. Les deux sources historiques sont épinglées et intactes. Régénération locale sans connexion : `node supabase/compatibility/lot5b/build-variants.mjs` ; contrôle de fraîcheur : même commande avec `--check`.

La candidate complète doit refuser la fixture publique où les douze corps privés manquent. Le test de wrapping/rollback est explicitement **partiel** : seule cette garde est retirée en mémoire dans le test après vérification du refus complet. Aucun artefact livré ne possède d’option permettant de la désactiver. Ce test réutilise le harnais publié dont l’installateur fictif possède BYPASSRLS ; cela ne prouve aucun droit Auth hébergé. Les candidats Auth ci-dessous restent distincts et non activés.

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
