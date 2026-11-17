# Archives — orchestrateur complet vert, 16 novembre 2026 à 23:58 UTC

L’échec CI `archives-ui.cjs:27` est reproduit puis corrigé **dans le test uniquement**, commit root **`fb0a5a360d3dca87d5f26b4f90d0b1d616182648`**. Le nouveau parcours est `Paramètres → carte Données et sauvegardes → Ouvrir les documents enregistrés`. Les assertions `document-library`, présence de `#rg-doc-json`, contenu du contrat et intégrité des données sont conservées.

- Rouge initial : `/workspace/scratch/archives-ui-settings-red.log`, timeout attendu sur l’ancien bouton direct « Documents enregistrés ».
- Vert isolé : `/workspace/scratch/archives-ui-settings-green.log`, quatre largeurs 320/390/768/1440, exit 0.
- **Orchestrateur `archives-ci.cjs` exécuté intégralement sur `http://127.0.0.1:8876`, exit 0**, marqueur final `ARCHIVES_ACCEPTANCE_PASS`.

| Étape de l’orchestrateur | Résultat |
|---|---|
| Writers/synchronisation Archives | 14/14, zéro échec |
| Interface Archives | 4/4 largeurs |
| Sources, sauvegardes et références | PASS |
| Revue Archives | 7/7 scénarios |
| Synchronisation Documents | 320/390 PASS |
| Consultation native | 36/36, neuf variantes × quatre largeurs |
| Courses concurrentes | 7/7 scénarios |

Preuves complètes : [journal](/workspace/scratch/archives-ci-settings-final/orchestrator.log), [reçu structuré](/workspace/scratch/archives-ci-settings-final/receipt.json), [36 contrôles natifs](/workspace/scratch/archives-ci-settings-final/native-evidence/after.json). Captures dans `ui-evidence/`, `sources-evidence/`, `documents-sync-evidence/` et `native-evidence/` de ce dossier.

Le preload scratch redirige uniquement les destinations de captures de trois scripts ; il ne modifie aucune assertion ni suite. L’orchestrateur et tous ses enfants restent les scripts du dépôt. Les données, profils et transports HTTP sont fictifs ; aucune opération sur les deux vrais comptes familiaux.

La source JavaScript/native reste identique au runtime applicatif `af015f8c334b67112ee197293611bdecc88d7905`. L’unique différence runtime observée est le correctif CSS de root `.rg-settings-page .rg-menu-cards { align-items:stretch }`, destiné aux largeurs des trois cartes Paramètres. Le reçu en conserve l’empreinte. Aucune modification produit ni mutation distante n’a été effectuée par cet agent.

Cette preuve clôt les étapes de l’orchestrateur local exécuté avec le port CI ; le résultat du nouveau run GitHub reste à lire au SHA final une fois terminé.
