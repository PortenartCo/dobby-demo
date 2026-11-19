# Recette Missions sur le catalogue installé

Les douze signatures et empreintes du manifeste Lot 5B sont vérifiées sur DOBBY d’après le relevé communiqué. Elles appartiennent à `postgres` et aucun EXECUTE direct n’est accordé à `anon` ou `authenticated`. Le préflight intégré conserve le contrôle des empreintes et des droits effectifs. Les corps privés restent sur leur instance. [Références approuvées](../../../../supabase/compatibility/lot5b/approved-catalogue.json)

Cette recette s’exécute après une installation et une activation de recette explicitement autorisées, pendant la maintenance. Elle couvre le chemin réellement en service, Missions V2, et la fermeture du gate V3. Préparer un foyer fictif H1 avec un parent P et un enfant E liés canoniquement, un parent X actif dans un autre foyer et un canari S suspendu. Employer les sessions Auth de ces comptes et leur accès client normal. Vérifier le foyer et la catégorie via `dobby_v7_context()` avant chaque série. Réserver un foyer de test sans module Missions préexistant et conserver en privé l’état initial de H1 et du foyer X.

## Appels et assertions

Les chemins ci-dessous s’exécutent depuis le client de recette ou un client REST authentifié existant. Employer la clé publique configurée du client et le JWT de la session du canari, qui restent en mémoire. Le corps du premier appel est reproductible à partir de la fixture publique V2. Les valeurs entre chevrons sont renseignées en privé, et l’UUID d’opération est généré une fois puis conservé pour le rejeu. [Référence de la fixture](../../finalisation-socle/supabase/missions/tests/run-local.py)

```http
POST /rest/v1/rpc/dobby_missions_v2_write
Content-Type: application/json

{
  "p_household_id": "<H1>",
  "p_expected_revision": 0,
  "p_operation_id": "<opération A>",
  "p_payload": {
    "autoTasks": [],
    "manualMissions": [],
    "runeCredits": [],
    "runeRequests": [],
    "runeLedgerVersion": 2
  }
}
```

| Étape | Exécution | Résultat attendu |
| --- | --- | --- |
| 1. Écriture V2 | Envoyer le corps ci-dessus avec la session P. Relire le module `missions` de H1 via le client. | Réponse protocole 2, une ligne de révision 1 dans H1 et registre vide. X est intact. |
| 2. Parcours métier | Dans le client V2, créer une mission fictive, l’attribuer à E puis la terminer avec P avec le barème régulier. Conserver en privé le corps exact et l’UUID du POST final. Relire avec P et E. | Une mission terminée, un seul gain conforme au barème du client, affecté à E. La révision augmente d’une unité à chaque écriture réussie. Les deux sessions lisent le même état. |
| 3. Rejeu et révision | Rejouer à l’identique le POST final avec P. Refaire ce POST avec un nouvel UUID et l’ancienne révision. Enfin réutiliser l’UUID initial avec un payload différent et valide. | Rejeu sans nouveau gain ni incrément. Le nouvel UUID à révision périmée renvoie `40001`. Le même UUID avec une requête différente est refusé et laisse la ligne et le registre intacts. |
| 4. Frontières | À la révision courante, tenter la même écriture V2 avec E, X, S et une session absente. Envoyer une tentative d’écriture directe sur `dobby_v2_modules` avec E et tenter l’ancien RPC `dobby_missions_v2_write_legacy_socle` avec P. | Les tentatives sont refusées, ou l’écriture directe touche zéro ligne sous RLS. Aucun nouveau reçu ni gain et aucune modification dans H1 ou le foyer X. |
| 5. Fermeture V3 | Lire `dobby_missions_v3_capabilities` pour H1 avec P et E et vérifier le routage du client. | `clientVerified=false` et le client utilise V2. Ce flag est une condition de publication du client. Les RPC appliquent leurs propres contrôles serveur. |

Pour les refus, vérifier le SQLSTATE/corps de réponse et l’état relu plutôt qu’un code HTTP seul. Contrôler le nombre de reçus, la révision et l’empreinte du registre avec une lecture privée autorisée. Consigner uniquement SHA du paquet, verdicts, compteurs et codes. Retirer les données de recette selon la procédure autorisée et préserver les véritables A/B. Cette recette vérifie les parcours de mise en service V2 et V3 fermé. Une ouverture ultérieure de V3 nécessiterait sa recette métier propre, dont complétion enfant, allocations, annulation et récurrence. [Contrat V3](../../revue-generale/supabase/missions-00-contract.md)
