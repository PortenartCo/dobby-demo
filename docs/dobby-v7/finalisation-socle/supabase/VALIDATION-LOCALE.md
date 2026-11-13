# Validation du diagnostic regroupé — 13 novembre 2026

**TESTS_PASS concerne exclusivement le fichier de diagnostic.** Aucune migration distante, aucun test Auth réel et aucune validation des futurs droits/V3 ne sont revendiqués.

Commande exécutée depuis la racine du worktree isolé :

```sh
python docs/dobby-v7/finalisation-socle/supabase/tests/verify-diagnostic-local.py \
  --evidence docs/dobby-v7/finalisation-socle/supabase/evidence/diagnostic-local.json
```

Environnement : PostgreSQL **17.7**, conteneur DOBBY dédié, réseau **`none`**, aucun port publié. Deux bases de diagnostic séparées ; la fixture Stitch existante est copiée, sans rejouer son installation ou ses anciennes campagnes. Ses helpers privés Missions sont incomplets et ne constituent aucune preuve du futur writer V3.

Les [résultats structurés](evidence/diagnostic-local.json) contiennent l'empreinte SHA-256 du fichier SQL exact et cinq cas réussis :

1. Catalogue fictif existant avec fonctions et tables privées partielles.
2. Exécution sous `anon`, sans droit de lecture de la table des foyers : observation du catalogue possible sans accès métier.
3. Exécution sous l'installateur fictif non superuser, pour vérifier les expressions de privilèges PG17.
4. Catalogue applicatif absent : tableaux vides et absence signalée, sans échec ni réparation implicite.
5. Colonne `at_home_quantity numeric NOT NULL DEFAULT 0` déjà présente : type exact rapporté sans installation.

Pour chaque cas : une seule cellule JSON, transaction réellement `READ ONLY`, cinq sous-objets structurés, absence d'un marqueur placé dans une ligne métier fictive, empreintes des lignes applicatives/privées inchangées avant/après. Le contrôle des instructions exécutables vérifie également un seul `BEGIN … READ ONLY`, un `SELECT` de catalogue et un `ROLLBACK`, sans DDL/DML/RPC métier.

La revue indépendante du fichier final n'a identifié aucun défaut prioritaire. Elle a vérifié les limites de transaction, les expressions ADMIN/INHERIT/SET PG17, l'absence de lecture métier et la confidentialité de **tout** le retour. Les bornes de transaction du préflight Missions d'origine ont été retirées lors du regroupement : aucun `COMMIT` intermédiaire ne peut sortir de la lecture seule.

Les résultats bruts de catalogue et les corps de fonctions ne sont pas dans les preuves publiques. Le catalogue réel familial reste à recevoir ; la capacité de maintenance des writers fermés, les appels PL/pgSQL/dynamiques et les comportements métier restent à examiner avant SQL d'installation.
