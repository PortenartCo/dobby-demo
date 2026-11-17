# Contrats et Maison — validation navigateur intégrée

- **8 scripts sur 8 réussis, aucun échec, aucune interruption.**
- Chaque script a commencé sur le HEAD `a96675a020d77a1075da19e9e647760eaf7a3c9c`, branche `integration/dobby-v7-consolidated-20261116`.
- Exécution sur Chromium et serveur local `http://127.0.0.1:8765`, uniquement avec des données fictives et profils isolés.
- Tous les scripts audités bloquent les requêtes HTTP distantes par Playwright ; un preload bloque aussi les transports réseau Node. Aucun service distant ni compte réel sollicité.
- Aucun builder, modification source, branche ou commit effectué par cette mission. Les preuves historiques sans variable d'environnement ont été écrites aux chemins autorisés ci-dessous puis copiées vers scratch.
- Le signal d'arrêt du parent est arrivé après la fin des huit scripts ; aucun processus ne restait actif. Aucun test n'a été interrompu.

| Script | Résultat | Durée (s) | Log |
| --- | --- | ---: | --- |
| `contracts-ui.cjs` | PASS (exit 0) | 44.178 | `/workspace/scratch/dobby-integrated-contracts-ui.log` |
| `contracts-import-ui.cjs` | PASS (exit 0) | 10.553 | `/workspace/scratch/dobby-integrated-contracts-import-ui.log` |
| `contracts-source-ui.cjs` | PASS (exit 0) | 7.215 | `/workspace/scratch/dobby-integrated-contracts-source-ui.log` |
| `contracts-edge-ui.cjs` | PASS (exit 0) | 66.644 | `/workspace/scratch/dobby-integrated-contracts-edge-ui.log` |
| `maison-ui.cjs` | PASS (exit 0) | 47.178 | `/workspace/scratch/dobby-integrated-maison-ui.log` |
| `maison-import-ui.cjs` | PASS (exit 0) | 11.693 | `/workspace/scratch/dobby-integrated-maison-import-ui.log` |
| `maison-documents-ui.cjs` | PASS (exit 0) | 51.248 | `/workspace/scratch/dobby-integrated-maison-documents-ui.log` |
| `maison-review-regressions.cjs` | PASS (exit 0) | 25.071 | `/workspace/scratch/dobby-integrated-maison-review-regressions.log` |

## Couverture observée

- `contracts-ui.cjs` : création, édition, lecture, documents PDF, échéances, persistance et absence de débordement sur 320, 390, 768, 1024 et 1440 px.
- `contracts-import-ui.cjs` : import JSON/ZIP, prévisualisation, validation, documents et persistance native.
- `contracts-source-ui.cjs` : exploitation des sources, provenance et conservation des documents.
- `contracts-edge-ui.cjs` : 10 scénarios PASS dont géométrie/clavier sur les cinq largeurs, champs inconnus, date historique, formulaire obsolète, rétention des anciens blobs, confirmation de suppression et frontière d'écriture enfant.
- `maison-ui.cjs` : cinq largeurs, recherche unique, création/édition/annulation, lieux et numéro de série, données anciennes conservées, programmes 12/36 mois indépendants, historique, rechargement, clavier et Paramètres.
- `maison-import-ui.cjs` : import revu, programmes, documents, provenance et remappage des identifiants de sources conflictuels.
- `maison-documents-ui.cjs` : PDF et image réellement affichés, téléchargements aux octets exacts, associations équipement/programme/intervention, contrat lié par identifiant, suppression avec confirmation, sauvegarde complète puis restauration dans un nouveau contexte, en 390 et 1440 px.
- `maison-review-regressions.cjs` : sept scénarios PASS : `partial-backup-preserves-modern-metadata`, `partial-preview-revision-guard`, `full-restore-scope-change-during-read`, `dynamic-program-draft-navigation`, `edited-log-identity-survives-upload`, `transport-native-name-limit`, `native-save-side-effects-rollback`.

Aucun échec à attribuer à un état préexistant ou à l'intégration. La suite `contracts-archives-permissions.cjs` a été exclue de cette mission car confiée à l'audit Archives.

## Preuves et fichiers générés

L'import équipement a reçu `DOBBY_EQUIPMENT_EVIDENCE_DIR=/workspace/scratch/dobby-integrated-evidence/equipment-import`.

Les scripts historiques écrivent sans variable d'environnement dans `docs/dobby-v7/contracts/evidence/screens/` et `docs/dobby-v7/maison/evidence/`. Les fichiers suivis modifiés ou non suivis détectés dans ces deux périmètres sont listés ci-dessous ; leur copie est conservée sous `/workspace/scratch/dobby-integrated-evidence/legacy/`, avec le même chemin relatif. Aucun de ces fichiers n'a été restauré par cet agent.

37 fichiers copiés vers scratch.

- `/workspace/dobby-demo/docs/dobby-v7/contracts/evidence/screens/edge-detail-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/contracts/evidence/screens/edge-detail-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/contracts/evidence/screens/edge-form-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/contracts/evidence/screens/edge-form-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/contracts/evidence/screens/edge-import-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/contracts/evidence/screens/edge-import-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/contracts/evidence/screens/edge-list-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/contracts/evidence/screens/edge-list-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-contract-delete-blocked-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-contract-delete-blocked-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-image-rendered-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-image-rendered-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-log-deleted-documents-preserved-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-log-deleted-documents-preserved-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-multiple-and-associations-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-multiple-and-associations-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-native-backup-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-native-backup-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-pdf-rendered-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-pdf-rendered-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-removed-program-history-preserved-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-removed-program-history-preserved-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-restored-native-backup-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-restored-native-backup-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-source-only-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/documents-source-only-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/equipment-1024.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/equipment-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/equipment-320.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/equipment-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/equipment-768.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/house-320.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/maintenance-1024.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/maintenance-1440.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/maintenance-320.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/maintenance-390.png`
- `/workspace/dobby-demo/docs/dobby-v7/maison/evidence/maintenance-768.png`

Rapport rédigé le 2026-11-16T23:28:38+00:00.
