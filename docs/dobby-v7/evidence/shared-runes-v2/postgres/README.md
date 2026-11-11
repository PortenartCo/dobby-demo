# PostgreSQL réel — shared runes V2

Résultat : **48/48 PASS**, zéro échec. Exécution du 2026-11-11T16:02:12.608Z au 2026-11-11T16:03:44.124Z.

- Commande : `node tests/shared-runes-v2/run-postgres.mjs`.
- PostgreSQL : PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit.
- Base inventée : `dobby_runes_tests`, restauration uniquement dans `dobby_runes_restore_tests`.
- Docker local : `unix:///var/run/docker.sock`, réseau `none`, aucun port exposé.
- Proposition SQL testée, inchangée entre début et fin : `fb353eca8f2a533cca97d10b9757aab4ae58e56aea8ea3d5788d136629790e15`.

Les fichiers [results.json](results.json), [concurrency.json](concurrency.json) et [console.log](console.log) contiennent les résultats détaillés, verrous et PIDs des vraies connexions. Les trois collisions (même mission complétée, même mission rouverte, missions différentes du même foyer) observent deux connexions bloquées simultanément, puis exactement un succès et un conflit `40001`. Après relecture, la demande perdante conserve les gains déjà confirmés. Un quatrième scénario prouve qu'un autre foyer peut valider pendant que le premier attend son verrou.

La campagne vérifie aussi le replay d'un ancien reçu avec le dernier état du module, l'adoption V1/V2 et les révisions 0, l'immuabilité de tous les champs confirmés, les cycles, bénéficiaires et montants, les suppressions natives, les occurrences, les bornes UTF16/espaces JavaScript et numériques, le plafond exact de 256 Kio avant/après confirmation, les droits/RLS et refus des anciens accès directs/GUC.

Un déclencheur de fixture après insertion du reçu injecte une erreur et démontre le rollback du payload et du reçu ensemble. La migration réappliquée ne modifie pas les lignes ; un historique invalide provoque son abandon atomique, sans réparation ou suppression automatique. Le retrait des droits RPC conserve l'historique et le refus des écritures directes. Le dump logique local (71502 octets, SHA256 `681652b329f0cc58e312609d7d50ef3ef41e51bb2ba24cbb92ecc8cb420835c1`) a été restauré et comparé intégralement : payloads, reçus et déclencheur présents. Le dump ne contient que des fixtures et n'est pas publié.

Périmètre : rôles Auth et `auth.uid()` de fixture, données fictives, connexions PostgreSQL réelles. L'émission JWT, un serveur PostgREST déployé et la base Supabase réelle ne sont pas testés ici. Aucun compte réel, aucune migration distante, aucune publication. Les tests client natif vers PostgreSQL disposent de preuves séparées.
