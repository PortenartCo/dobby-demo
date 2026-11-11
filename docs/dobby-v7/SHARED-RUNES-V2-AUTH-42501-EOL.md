# Correctif 42501 — empreintes LF/CRLF et variante exacte du trigger

Branche : `fix/dobby-runes-v2-auth-42501-20261111` ; base : `79a9a5ee37d4d0ac53c7e5a11ec87118c8e5fc82`.
Aucun `AGENTS.md` applicable trouvé. Aucun accès Supabase, migration hébergée, merge ou publication applicative.

## Changement limité

Le [correctif SQL autonome complet](../../sql-proposals/dobby-shared-runes-v2-auth-42501.sql) conserve les empreintes originales et corrigées attendues, ainsi que toutes les conditions de propriétaire, attributs, ACL, rôles, RLS et versions. Avant de calculer les empreintes des corps de fonctions, il remplace uniquement `CRLF` par `LF` avec `pg_catalog.replace(prosrc,E'\r\n',E'\n')`.

Les espaces, tabulations, lignes blanches, retours CR isolés et tous les autres octets restent significatifs. Aucune normalisation générale du SQL n'est introduite. Le calcul du digest des payloads et les empreintes des six politiques RLS restent strictement inchangés.

Une seule empreinte supplémentaire est autorisée, uniquement pour `public.dobby_v2_modules_stamp()` :

`66ebec0137d31429243d4ae6bafa21788cef3c2315e18059acb5e1f44744c4d0`.

C'est le SHA-256 LF du [corps réel transmis par l'utilisateur](../../tests/shared-runes-v2/fixtures/dobby_v2_modules_stamp_prosrc_LF.txt), conservé octet pour octet (486 octets). Sa conversion CRLF donne exactement `5581985c573e42feb3b02ede1a9eaec47e766529e97d0e3522883b33e30721af`, l'empreinte installée précédemment indiquée. Le diff avec la définition d'origine ne contient que la mise en forme annoncée : indentation et retours à la ligne. Cette variante est explicitement épinglée ; aucun autre corps équivalent n'est accepté par approximation.

Les conversions CRLF des trois autres fonctions originales reproduisent également les trois empreintes fournies :

| Fonction | SHA-256 CRLF vérifié hors production |
|---|---|
| `dobby_missions_v2_capabilities` | `5e7e15d52894bef90efef198af2437b79902adf29be32835dc4c8ac7e21ffcc6` |
| `dobby_missions_v2_write` | `31dd030f584b93a749e7db948a717c75f3d819cb77eee375bf166c0c90cc822c` |
| `lock_active_membership` | `efb45f18d4bb2ab03dfeae069a8783aa915d4fd352cc4ac671cdcee7b63a3232` |

Les cinq définitions de fonctions émises par le correctif sont identiques à celles de `79a9a5e`. Le trigger corrigé conserve donc la branche native `auth.uid()` pour les autres rôles/modules, et utilise le lecteur privé des claims uniquement sous `dobby_missions_v2_writer`. Les statements de permissions, les modifications RLS, les verrous, CAS, reçus et validateurs ne changent pas.

Les [contrôles après installation](../../sql-proposals/dobby-shared-runes-v2-auth-42501-checks.sql) normalisent eux aussi uniquement CRLF → LF. Ils exigent toujours les empreintes des corps **corrigés** : l'ancienne variante du trigger n'est pas présentée comme une installation terminée. Le helper déjà corrigé bénéficie du même contrôle CRLF/LF dans le préflight pour permettre une réexécution du fichier SQL en CRLF.

## Vérification locale

**88 scénarios PostgreSQL locaux PASS, aucun échec.** [Bilan et empreintes des fichiers SQL](evidence/shared-runes-v2/auth-42501/eol/verification.json).

- **8/8 scénarios LF/CRLF PASS** : installations originales LF et CRLF ; trigger réel fourni en LF et CRLF ; fichier correctif entier en CRLF ; réapplication LF/CRLF et helper déjà installé en CRLF ; contrôles après installation en lecture seule ; runtime des cinq autres modules ; rollback transactionnel complet. [Résultats](evidence/shared-runes-v2/auth-42501/eol/results.json), [sorties des contrôles](evidence/shared-runes-v2/auth-42501/eol/checks.log).
- **18 dérives non autorisées refusées** : modifications fonctionnelles des quatre fonctions et du trigger réel, espace arbitraire supplémentaire, retour CR isolé, variantes non reconnues du helper. Chaque refus conserve intégralement données, définitions, droits, RLS et reçus. Elles sont incluses dans les huit scénarios ci-dessus.
- **19/19 contrôles 42501 précédents PASS**, à nouveau exécutés avec le correctif final : [résultats](evidence/shared-runes-v2/auth-42501/eol/regression/auth-42501/results.json).
- **51/51 régressions PostgreSQL PASS**, dont les quatre scénarios de concurrence : [résultats](evidence/shared-runes-v2/auth-42501/eol/regression/postgres/results.json), [preuves de verrous](evidence/shared-runes-v2/auth-42501/eol/regression/postgres/concurrency.json).
- **10/10 intégrations du client natif vers PostgreSQL PASS** : [résultats](evidence/shared-runes-v2/auth-42501/eol/regression/client-postgres/results.json).

La [reproduction avant/après](evidence/shared-runes-v2/auth-42501/eol/regression.json) confirme que le fichier du commit `79a9a5e` refuse la fonction originale en CRLF, puis que le correctif livré réussit sur cette installation sans modifier les lignes existantes. [Les quatre empreintes reçues sont reproduites exactement hors production](evidence/shared-runes-v2/auth-42501/eol/reported-fingerprints.json). [Le contrôle de périmètre](evidence/shared-runes-v2/auth-42501/eol/integrity-scope.json) confirme que les cinq corps de fonctions, les six statements de politiques, les permissions et le suffixe postflight sont identiques à la livraison précédente.

La fixture réelle a été installée et exécutée localement ; les nouveaux tests ne se limitent pas à comparer son hash. Les droits et données des seules fixtures sont préparés pour les tests, sans changement supplémentaire de privilèges par rapport au SQL publié précédemment. La maquette, le JavaScript applicatif, le writer de runes et le script de référence future restent inchangés. Les anciennes preuves sont conservées intactes. Commandes reproductibles : [README des tests](../../tests/shared-runes-v2/README.md).

Les bases sont exclusivement des fixtures PostgreSQL 17.11 locales, dans le conteneur marqué `dobby-runes-v2-test-20261111-auth-42501`, sans réseau ni port exposé. Le contenu du projet Supabase personnel n'est jamais interrogé. Les jeux de données et claims utilisés sont fictifs ; la validation hébergée après exécution manuelle reste distincte.

Le fichier autonome reste destiné à la migration V2 **déjà installée**. Ne pas rejouer la migration initiale. Exécuter le correctif complet dans SQL Editor, puis le fichier de contrôles en lecture seule. Toute empreinte, propriété, permission ou politique non reconnue reste un refus à examiner, sans ajout de privilèges ni suppression des contrôles.
