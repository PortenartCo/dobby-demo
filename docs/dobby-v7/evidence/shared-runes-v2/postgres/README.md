# PostgreSQL réel — shared runes V2

Résultat : **51/51 PASS**, zéro échec. Exécution du 2026-11-11T16:14:56.234Z au 2026-11-11T16:16:34.938Z.

- Commande : `node tests/shared-runes-v2/run-postgres.mjs`.
- PostgreSQL : PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit.
- Base inventée : `dobby_runes_tests`, restauration uniquement dans `dobby_runes_restore_tests`.
- Docker local : `unix:///var/run/docker.sock`, réseau `none`, aucun port exposé.
- Proposition SQL testée, inchangée entre début et fin : `824080da6869b2f0a70869f80d094a6dc47280328ef87b0d941ad8e177cc3366`.

Les fichiers [results.json](results.json), [concurrency.json](concurrency.json) et [console.log](console.log) contiennent les résultats détaillés, verrous et PIDs des vraies connexions. Les trois collisions (même mission complétée, même mission rouverte, missions différentes du même foyer) observent deux connexions bloquées simultanément, puis exactement un succès et un conflit `40001`. Après relecture, la demande perdante conserve les gains déjà confirmés. Un quatrième scénario prouve qu'un autre foyer peut valider pendant que le premier attend son verrou.

La campagne vérifie aussi le replay d'un ancien reçu avec le dernier état du module, l'adoption V1/V2 et les révisions 0, l'immuabilité de tous les champs confirmés, les cycles, bénéficiaires et montants, les suppressions natives, les occurrences, les bornes UTF16/espaces JavaScript et numériques, le plafond exact de 256 Kio avant/après confirmation, les droits/RLS et refus des anciens accès directs/GUC.

Les fixtures V1 sont présentes avant la migration : dates ISO sans millisecondes, fractions `.1`/`.12`, offsets `+01:00`/`-05:30`/`+23:59`. La migration, le RPC et la réouverture conservent chaque chaîne brute et la révision 0. Le cas sans millisecondes vérifie aussi la réattribution et l'adoption locale explicite. Les dates civiles invalides, 24h, secondes60 et mots spéciaux restent refusés.

Un déclencheur de fixture après insertion du reçu injecte une erreur et démontre le rollback du payload et du reçu ensemble. La migration réappliquée ne modifie pas les lignes ; un historique invalide provoque son abandon atomique, sans réparation ou suppression automatique. Le retrait des droits RPC conserve l'historique et le refus des écritures directes. Le dump logique local (73865 octets, SHA256 `f501f2a860ff2de3ce5aaafbfeee2bdf1870cb8bf6598d7bd772207ab114b88e`) a été restauré et comparé intégralement : payloads, reçus et déclencheur présents. Le dump ne contient que des fixtures et n'est pas publié.

Périmètre : rôles Auth et `auth.uid()` de fixture, données fictives, connexions PostgreSQL réelles. L'émission JWT, un serveur PostgREST déployé et la base Supabase réelle ne sont pas testés ici. Aucun compte réel, aucune migration distante, aucune publication. Les tests client natif vers PostgreSQL disposent de preuves séparées.
