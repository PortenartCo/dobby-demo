# Diagnostic serveur regroupé — lecture seule

**Archive d’investigation — ne pas exécuter maintenant.** Un diagnostic réel a déjà été reçu dans le chantier de finalisation du socle ; sa description rapporte également une installation et sa vérification manuelles. Lire la [passation](../PASSATION-SOCLE-CONCURRENT.md) avant toute utilisation. Réutiliser d’abord ces résultats, sans nouveau diagnostic ni installation par défaut.

Le fichier [`00-diagnostic-regroupe.sql`](00-diagnostic-regroupe.sql) reste disponible pour un manque technique précis, dans le seul projet personnel DOBBY, avec résultat JSON `diagnostic_serveur`. Aucun identifiant de compte, foyer ou enfant à renseigner. Ne rejouer aucun ancien install/correctif Stitch `01`, `04`, `06` ou `11`.

Ce diagnostic ne corrige rien. Il réunit les besoins des anciens préflights
Courses `00`, Missions `01`, Rôles `00` et du contrôle Famille ; **ne pas les
enchaîner**. Les connexions, déconnexions, Cheminette et magie du compte B sont
déjà validées et ne sont pas à refaire.

Le script lit exclusivement `pg_catalog`, sous transaction `READ ONLY`, snapshot
`REPEATABLE READ`, avec délais de 30 s par instruction, 3 s pour un verrou et
60 s d'inactivité. La compilation JIT est désactivée pour cette seule transaction
de catalogue. Il termine par `ROLLBACK`. Il ne sélectionne aucune ligne
métier, profil, compte Auth, invitation, jeton ou secret ; il n'appelle aucune
RPC ni helper applicatif. Les sources retournées peuvent **mentionner** ces
tables et leurs colonnes : elles sont lues comme du texte, jamais exécutées.
Une erreur de permission interrompt le script et reste visible ; elle ne devient
ni un résultat vide ni une fausse absence.

Le JSON a la forme suivante (clés, **pas un résultat du serveur réel**) :

```text
diagnostic, safety, serverVersion, executionRole, roleClosure, limits
groceryAvailability {columnState, rangeState, meaning}
presence {relations[], functions[], roles[]}
schemas[], relations[], policies[], triggers[], functions[]
functionDependencies[], unresolvedQualifiedCalls[], roles[], roleMemberships[], sequences[]
```

- `relations` donne types/typmods, valeurs par défaut, contraintes et expressions
  exactes, index, propriétaires, RLS et droits explicites/effectifs par colonne.
- `groceryAvailability` distingue table/colonne absente, colonne compatible ou
  incompatible, CHECK absent, canonique validé ou incompatible/non validé.
  Ce n'est pas une certification de concurrence, de RLS ou de parcours réel.
- `functions` donne signatures, propriétaires, `SECURITY DEFINER`, langage,
  paramètres dont `search_path`, ACL/EXECUTE effectif, définition complète et MD5.
  Les triggers sont triés par table et nom, avec activation et fonction associée.
- Les sources couvrent les RPC publiques DOBBY V2/V3/V7, toutes les fonctions du
  seul schéma `dobby_runes_private`, les helpers Famille utiles et leurs appels
  qualifiés/dépendances `pg_depend` dans `public` et `dobby_v7_private`.
  Les fonctions privées inutilisées d'autres services ne sont pas exportées.
- Les dépendances externes portent `sourceIncluded:false` ; les appels qualifiés
  non résolus sont listés. SQL dynamique et appels non qualifiés nécessitent la
  lecture des corps : la fermeture des dépendances n'est pas certifiée.
  Les noms attendus d'invitation ciblée sont indicatifs ; toutes les fonctions
  publiques DOBBY V7 existantes et la structure d'`invitations` restent visibles.
- Les rôles connus, propriétaires et bénéficiaires d'ACL/politiques ciblées
  amorcent la fermeture transitive des appartenances dans les deux sens, avec
  options ADMIN/INHERIT/SET et attributs des rôles atteints. Les droits effectifs
  incluent ces rôles ; `roleClosure.unresolvedRoleOids` signale un éventuel trou.
  Pour `storage.objects`, tous les triggers/politiques sont visibles : une règle
  générique peut affecter le bucket DOBBY. Les corps privés tiers ne sont pas
  exportés automatiquement (`sourceIncluded:false`) ; aucune ligne de bucket
  n'est lue.

Les absences sont des constats, pas des migrations à installer. Le catalogue réel et les sources privées ont depuis été reçus dans le chantier du socle ; notre SQL ne doit pas déclencher une seconde collecte. Les preuves de parcours réel restent distinctes de ce catalogue.

Vérification de développement uniquement :
`python3 docs/dobby-v7/reserves-techniques/serveur/tests/run-local.py`.
Elle emploie exclusivement PostgreSQL **17.7** dans le conteneur dédié
`dobby-v7-reserves-diag-pg-20261113`, `--network none`, sans port ni montage hôte,
via le socket Linux fixe `unix:///var/run/docker.sock` (contexte Docker et options
d'hôte/TLS hérités ignorés), et recrée sa seule base fictive
`dobby_reserves_diagnostic_test`. Aucun hôte distant n'est configurable. La fixture
historique `stitch19-20/supabase/tests/catalog-fixture.sql` est déclarée : son
`guard_missions` est un **stub défensif**, jamais la source privée réelle.
Le complément [`tests/metadata-fixture.sql`](tests/metadata-fixture.sql) est
également fictif ; ses RPC lèvent une erreur si elles sont appelées. Les tests
exécutent les octets exacts du diagnostic : absence, présence, types/contraintes,
droits, dépendances, absence de fuite de lignes et erreur de permission visible.
Un dump local complet reste identique avant/après. Aucun ancien install ni projet
Supabase n'est utilisé par ce test.
