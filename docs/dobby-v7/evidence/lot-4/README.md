# Lot 4 — sources et preuves

Profils Chromium éphémères, fixtures préfixées TEST ; aucun compte réel. Référence : HTML Stitch original dérivé sans scripts fictifs, ressources locales. Interface : même composition, données natives. 2 URL d’illustration indisponibles dans ce lot, substituées par le Salon avec provenance ; la substitution apparaît aussi dans la référence.

[Galerie](index.html) · [Contrôles](checks.json) · [Checkpoint](../../CHECKPOINTS.md)

| Source / route | État | Source 320 | DOBBY 320 | Source 390 | DOBBY 390 |
|---|---|---|---|---|---|
| dobby_ajouter_ou_modifier_un_document — `#document-edit` | verified-partial | [Source](before/document-edit-320.png) | [Interface](after/document-edit-320.png) | [Source](before/document-edit-390.png) | [Interface](after/document-edit-390.png) |
| dobby_archives_biblioth_que_documentaire_1 — `#documents-1` | verified-functional | [Source](before/documents-1-320.png) | [Interface](after/documents-1-320.png) | [Source](before/documents-1-390.png) | [Interface](after/documents-1-390.png) |
| dobby_archives_biblioth_que_documentaire_2 — `#documents` | verified-functional | [Source](before/documents-320.png) | [Interface](after/documents-320.png) | [Source](before/documents-390.png) | [Interface](after/documents-390.png) |
| dobby_contrats_assurances_ch_ances_du_foyer_1 — `#contracts-1` | verified-partial | [Source](before/contracts-1-320.png) | [Interface](after/contracts-1-320.png) | [Source](before/contracts-1-390.png) | [Interface](after/contracts-1-390.png) |
| dobby_contrats_assurances_ch_ances_du_foyer_2 — `#contracts` | verified-partial | [Source](before/contracts-320.png) | [Interface](after/contracts-320.png) | [Source](before/contracts-390.png) | [Interface](after/contracts-390.png) |
| dobby_d_clarer_ou_renouveler_un_contrat — `#contract-edit` | verified-partial | [Source](before/contract-edit-320.png) | [Interface](after/contract-edit-320.png) | [Source](before/contract-edit-390.png) | [Interface](after/contract-edit-390.png) |
| dobby_fiche_document_aper_u — `#document` | verified-partial | [Source](before/document-320.png) | [Interface](after/document-320.png) | [Source](before/document-390.png) | [Interface](after/document-390.png) |
| dobby_fiche_d_taill_e_d_un_contrat_1 — `#contract-1` | verified-partial | [Source](before/contract-1-320.png) | [Interface](after/contract-1-320.png) | [Source](before/contract-1-390.png) | [Interface](after/contract-1-390.png) |
| dobby_fiche_d_taill_e_d_un_contrat_2 — `#contract` | verified-partial | [Source](before/contract-320.png) | [Interface](after/contract-320.png) | [Source](before/contract-390.png) | [Interface](after/contract-390.png) |
| dobby_import_intelligent_analyse_validation — `#import-review` | verified-partial | [Source](before/import-review-320.png) | [Interface](after/import-review-320.png) | [Source](before/import-review-390.png) | [Interface](after/import-review-390.png) |
| dobby_import_intelligent_s_lection_d_un_fichier — `#import-file` | verified-partial | [Source](before/import-file-320.png) | [Interface](after/import-file-320.png) | [Source](before/import-file-390.png) | [Interface](after/import-file-390.png) |

44 captures comparatives et 22 états vides dans `empty/`. Les références contiennent les exemples de la maquette ; ceux-ci ne sont jamais importés dans le moteur. Les barres fixes restent à la hauteur du viewport dans la capture pleine page.

## Limites par source

- **document-edit** : PDF/images natifs et métadonnées ; pas de Fichiers iOS, envoi par hibou, chiffrement ou signature.
- **documents-1** : PDF/images natifs et métadonnées ; pas de Fichiers iOS, envoi par hibou, chiffrement ou signature.
- **documents** : PDF/images natifs et métadonnées ; pas de Fichiers iOS, envoi par hibou, chiffrement ou signature.
- **contracts-1** : Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique.
- **contracts** : Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique.
- **contract-edit** : Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique.
- **document** : PDF/images natifs et métadonnées ; pas de Fichiers iOS, envoi par hibou, chiffrement ou signature. Une écriture locale native déjà lancée n’est pas annulée par une suppression concurrente ; une copie peut subsister. L’interface signale ce résultat sans recréer de fiche ni nettoyer automatiquement le stockage.
- **contract-1** : Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique. Une écriture locale native déjà lancée n’est pas annulée par une suppression concurrente ; une copie peut subsister. L’interface signale ce résultat sans recréer de fiche ni nettoyer automatiquement le stockage.
- **contract** : Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique. Une écriture locale native déjà lancée n’est pas annulée par une suppression concurrente ; une copie peut subsister. L’interface signale ce résultat sans recréer de fiche ni nettoyer automatiquement le stockage.
- **import-review** : Extraction PDF et OCR français natifs testés avec les bibliothèques clientes existantes servies localement. Champs à vérifier et corriger ; pas d’IA, de certitude calculée ni de notification. Le membre concerné n’est pas attribué par l’import natif.
- **import-file** : Extraction PDF et OCR français natifs testés avec les bibliothèques clientes existantes servies localement. Champs à vérifier et corriger ; pas d’IA, de certitude calculée ni de notification. Le membre concerné n’est pas attribué par l’import natif.

## États complémentaires de test

 - [actual-ocr-review-320.png](states/actual-ocr-review-320.png)
 - [actual-ocr-review-390.png](states/actual-ocr-review-390.png)
 - [document-local-offline-320.png](states/document-local-offline-320.png)
 - [document-local-offline-390.png](states/document-local-offline-390.png)
 - [document-shared-connected-320.png](states/document-shared-connected-320.png)
 - [document-shared-connected-390.png](states/document-shared-connected-390.png)
 - [document-shared-offline-320.png](states/document-shared-offline-320.png)
 - [document-shared-offline-390.png](states/document-shared-offline-390.png)
 - [import-saved-320.png](states/import-saved-320.png)
 - [import-saved-390.png](states/import-saved-390.png)
