# Installation de Santé essentiel

L’installation prépare la base avec `dobby_health_private.install_state.enabled = false` et `legacy_closed = false`. Les RPC de lecture et d’écriture, les téléchargements authentifiés et les dépôts partagent le même contrôle de publication. `GET /rest/v1/rpc/dobby_health_capabilities?p_household_id=<uuid>` retourne `{"enabled":false}` avant la première publication. Après celle-ci, un acteur canonique du foyer reçoit aussi `legacyClosed: true`, y compris quand `enabled` vaut `false`. Une session authentifiée qui ne correspond pas à un acteur canonique du foyer reçoit uniquement `{"enabled":false}`. Le RPC est réservé à `authenticated` et renvoie `Cache-Control: private, no-store`.

La configuration livrée dans `essai-stitch-v7/access-config.js` fixe aussi `healthEssentialAvailable: false`. Elle évite à V7 d’interroger un backend Santé absent avant une recette ou une publication autorisée. L’ouverture dans V7 exige les deux indicateurs. L’autorisation de lire, écrire et accéder à Storage reste contrôlée par la base.

## Autorités et ordre des phases

Exécuter `00-preflight.sql` dans les sessions proposées avant tout changement. Le rapport ouvre une transaction en lecture seule et indique le propriétaire, la possibilité de déléguer, les gardes actifs et les politiques Santé présentes. La configuration du bucket est visible dans la session de son propriétaire. Le rapport ne lit aucune donnée de santé. Chaque phase d’écriture possède sa transaction et lève une erreur si elle ne reconnaît pas son autorité ou son prérequis. En CLI, utiliser `psql -X -v ON_ERROR_STOP=1 -f <fichier>` pour une seule phase à la fois.

| Phase | Autorité effective | Effet |
| --- | --- | --- |
| `00-identites-famille.sql` | Administrateur de plateforme effectif avec `rolsuper`, autorisé à maintenir les fonctions Famille d’origine | Protège le cycle de vie des identifiants de membres canoniques. |
| `00-role.sql` | Rôle applicatif `postgres` avec `CREATEROLE` | Crée le writer dédié sans connexion. PostgreSQL 17 enregistre l’option `ADMIN` de création avec `SET` et `INHERIT` fermés. |
| `01-delegation-socle.sql` | Propriétaire effectif de `dobby_socle_private.actor_context(uuid,boolean)`, attendu `dobby_socle_writer` | Accorde uniquement `EXECUTE` au writer Santé, sans `GRANT OPTION`. |
| `01-proposition.sql` | Rôle applicatif `postgres`, propriétaire de la source Famille, avec l’autorité requise sur les schémas et l’aide d’identité V7 | Installe les objets Santé privés et les RPC fermés. Le `SET ROLE` du writer Santé est disponible le temps de la transaction. |
| `01-legacy-guard.sql` | Rôle applicatif `postgres` | Bloque la publication si les modules partagés contiennent encore des données Santé historiques. Interdit durablement leur réintroduction après la première publication. |
| `02-fermer-role.sql` | Octroyeur de plateforme indiqué par le préflight pour l’option `ADMIN` de création | Supprime le dernier lien vers le rôle Santé. Le rôle Santé doit alors être isolé dans les deux sens. |
| `03-storage.sql` | `supabase_storage_admin`, propriétaire effectif des tables Storage | Pose les politiques limitées à Santé et crée le bucket privé dans la même transaction. |
| `00-preflight.sql` | Chaque opérateur concerné | Confirme les gardes, la fermeture du rôle, le bucket privé et l’état de publication. |

Le rôle applicatif hébergé `postgres` dispose de l’exécution du résolveur Famille sans droit de la déléguer et sans `SET ROLE` sur son propriétaire. `storage.objects` appartient à `supabase_storage_admin`, hors de la délégation de `postgres`. Il faut obtenir une exécution autorisée auprès de chacun des propriétaires concernés et auprès de la plateforme pour le registre d’identité et la fermeture de rôle. L’accès actuel à ces autorités sur l’hébergé reste à établir. Le SQL Editor utilisé sous `postgres` échoue explicitement sur les phases réservées aux autres autorités. Le test local utilise des rôles séparés pour reproduire ces refus.

Si le propriétaire du schéma `storage` diffère du propriétaire des tables et que ce dernier ne peut pas accorder `USAGE`, le propriétaire du schéma doit préalablement accorder `USAGE ON SCHEMA storage TO dobby_health_writer`, sans `GRANT OPTION`. Vérifier ce cas au préflight. Les droits de lecture du writer sont limités aux colonnes nécessaires et à la source Famille ou au bucket Santé par des politiques restrictives. La création du bucket suppose que RLS est déjà actif sur `storage.objects` et `storage.buckets`.

## Reprise d’une installation interrompue

Relancer le préflight et reprendre à la première phase absente. Un échec pendant une phase annule sa transaction. Comparer les objets et le grantor avant de reprendre une phase partiellement exécutée par un autre moyen. Conserver l’état de publication fermé. Le dernier lien vers le writer est l’option `ADMIN` de création avant la phase 02. Aucun acteur applicatif ne reçoit de lien pérenne par la procédure et la capacité reste fermée tant que ce lien existe. Un bucket apparu séparément doit être rapproché de sa configuration et des politiques attendues avant poursuite.

La publication fait l’objet d’un GO distinct après sauvegarde et comparaison des données historiques, choix d’une reprise explicite et recette des identités physiques. Le passage de l’état à `enabled = true` exige une transaction `READ COMMITTED`, les dépendances techniques et l’absence de données Santé historiques dans les modules partagés. La première activation valide inscrit `legacy_closed = true` dans la même transaction. Repasser `enabled` à `false` suspend les RPC de données et les opérations Storage Santé. Le refus des écritures historiques reste acquis et la configuration ordinaire ne peut plus rouvrir leur partage.

Conserver le registre d’identités Famille et la valeur acquise de `legacy_closed` dans les sauvegardes et les restaurations, y compris lors d’une suspension de Santé. Coordonner le déploiement du registre avec la version V7 qui réserve les nouveaux identifiants côté serveur. Une ancienne version cliente peut continuer d’afficher les membres existants, mais sa création locale d’un identifiant sera refusée par le garde.

## Vérification locale

Depuis la racine, lancer `python3 docs/dobby-v7/sante-essentielle/test-postgres.py` pour PostgreSQL 17.11 et `python3 docs/dobby-v7/sante-essentielle/test-postgres.py --storage` pour les mêmes phases avec Storage et PostgREST sur un réseau Docker interne. `python3 docs/dobby-v7/sante-essentielle/test-identites-famille.py` couvre les régressions du registre, les invitations et l’étanchéité de l’historique. Les scripts emploient des identités synthétiques et les images locales épinglées par le banc de tests.
