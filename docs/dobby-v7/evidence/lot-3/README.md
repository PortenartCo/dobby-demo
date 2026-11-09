# Lot 3 — sources et preuves

Profils Chromium éphémères, fixtures préfixées TEST ; aucun compte réel. Référence : HTML Stitch original dérivé sans scripts fictifs, ressources locales. Interface : même composition, données natives. 2 URL d’illustration indisponibles dans ce lot, substituées par le Salon avec provenance ; la substitution apparaît aussi dans la référence.

[Galerie](index.html) · [Contrôles](checks.json) · [Checkpoint](../../CHECKPOINTS.md)

| Source / route | État | Source 320 | DOBBY 320 | Source 390 | DOBBY 390 |
|---|---|---|---|---|---|
| dobby_maison_quipements_du_logis_1 — `#house-1` | verified-functional | [Source](before/house-1-320.png) | [Interface](after/house-1-320.png) | [Source](before/house-1-390.png) | [Interface](after/house-1-390.png) |
| dobby_maison_quipements_du_logis_2 — `#house` | verified-functional | [Source](before/house-320.png) | [Interface](after/house-320.png) | [Source](before/house-390.png) | [Interface](after/house-390.png) |
| dobby_ajouter_ou_modifier_un_quipement — `#equipment-edit` | verified-partial | [Source](before/equipment-edit-320.png) | [Interface](after/equipment-edit-320.png) | [Source](before/equipment-edit-390.png) | [Interface](after/equipment-edit-390.png) |
| dobby_fiche_d_taill_e_d_un_quipement — `#equipment` | verified-partial | [Source](before/equipment-320.png) | [Interface](after/equipment-320.png) | [Source](before/equipment-390.png) | [Interface](after/equipment-390.png) |
| dobby_historique_d_entretien_pi_ces_jointes — `#maintenance` | verified-partial | [Source](before/maintenance-320.png) | [Interface](after/maintenance-320.png) | [Source](before/maintenance-390.png) | [Interface](after/maintenance-390.png) |
| dobby_g_rer_les_donn_es_des_quipements_export_restauration — `#house-backup` | verified-partial | [Source](before/house-backup-320.png) | [Interface](after/house-backup-320.png) | [Source](before/house-backup-390.png) | [Interface](after/house-backup-390.png) |
| dobby_sauvegarde_et_restauration_compl_te — `#backup` | verified-partial | [Source](before/backup-320.png) | [Interface](after/backup-320.png) | [Source](before/backup-390.png) | [Interface](after/backup-390.png) |

28 captures comparatives et 14 états vides dans `empty/`. Les références contiennent les exemples de la maquette ; ceux-ci ne sont jamais importés dans le moteur. Les barres fixes restent à la hauteur du viewport dans la capture pleine page.

## Limites par source

- **house-1** : Photos d’appareil non stockées ; recherche et listes natives réelles.
- **house** : Photos d’appareil non stockées ; recherche et listes natives réelles.
- **equipment-edit** : Numéro de série et photo non stockés. Garantie native sous forme de date, pas de durée en mois.
- **equipment** : Historique natif : date, note et entretien réalisé. Pas de montant ni de prestataire par intervention, ni modification/suppression d’une intervention native. Fichiers locaux existants conservés.
- **maintenance** : Historique natif : date, note et entretien réalisé. Pas de montant ni de prestataire par intervention, ni modification/suppression d’une intervention native. Fichiers locaux existants conservés.
- **house-backup** : Export natif JSON équipements/historiques sans fichiers. Import par fusion uniquement ; mode remplacement de cette maquette non pris en charge.
- **backup** : Format natif JSON dobby-complete-backup, pas .dobbyarchive. Archive non chiffrée, restauration locale avec confirmation native ; exécution destructive exclue des tests.

## États complémentaires de test

 - [equipment-file-320.png](states/equipment-file-320.png)
 - [equipment-file-390.png](states/equipment-file-390.png)
 - [full-preview-320.png](states/full-preview-320.png)
 - [full-preview-390.png](states/full-preview-390.png)
 - [house-preview-320.png](states/house-preview-320.png)
 - [house-preview-390.png](states/house-preview-390.png)
 - [invalid-archive-320.png](states/invalid-archive-320.png)
 - [invalid-archive-390.png](states/invalid-archive-390.png)
