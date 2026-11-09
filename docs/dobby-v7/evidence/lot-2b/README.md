# Lot 2b — sources et preuves

Profils Chromium éphémères, fixtures préfixées TEST ; aucun compte réel. Référence : HTML Stitch original dérivé sans scripts fictifs, ressources locales. Interface : même composition, données natives. 3 URL d’illustration indisponibles dans ce lot, substituées par le Salon avec provenance ; la substitution apparaît aussi dans la référence.

[Galerie](index.html) · [Contrôles](checks.json) · [Checkpoint](../../CHECKPOINTS.md)

| Source / route | État | Source 320 | DOBBY 320 | Source 390 | DOBBY 390 |
|---|---|---|---|---|---|
| dobby_r_pertoire_des_contacts_familiaux — `#contacts` | verified-functional | [Source](before/contacts-320.png) | [Interface](after/contacts-320.png) | [Source](before/contacts-390.png) | [Interface](after/contacts-390.png) |
| dobby_cr_er_ou_modifier_un_contact — `#contact-edit` | verified-partial | [Source](before/contact-edit-320.png) | [Interface](after/contact-edit-320.png) | [Source](before/contact-edit-390.png) | [Interface](after/contact-edit-390.png) |
| dobby_biblioth_que_des_m_mos_notes_familiales — `#memos` | verified-partial | [Source](before/memos-320.png) | [Interface](after/memos-320.png) | [Source](before/memos-390.png) | [Interface](after/memos-390.png) |
| dobby_cr_er_ou_modifier_un_m_mo — `#memo-edit` | verified-partial | [Source](before/memo-edit-320.png) | [Interface](after/memo-edit-320.png) | [Source](before/memo-edit-390.png) | [Interface](after/memo-edit-390.png) |
| dobby_registre_des_listes_familiales — `#lists` | verified-partial | [Source](before/lists-320.png) | [Interface](after/lists-320.png) | [Source](before/lists-390.png) | [Interface](after/lists-390.png) |
| dobby_d_tail_d_une_liste_familiale — `#list-detail` | verified-partial | [Source](before/list-detail-320.png) | [Interface](after/list-detail-320.png) | [Source](before/list-detail-390.png) | [Interface](after/list-detail-390.png) |

24 captures comparatives et 12 états vides dans `empty/`. Les références contiennent les exemples de la maquette ; ceux-ci ne sont jamais importés dans le moteur. Les barres fixes restent à la hauteur du viewport dans la capture pleine page.

## Limites par source

- **contacts** : Portrait, blason et catégories structurées non enregistrés. Le rôle textuel est conservé.
- **contact-edit** : Portrait, blason et catégories structurées non enregistrés. Le rôle textuel est conservé.
- **memos** : Mémos locaux : titre, contenu et mots-clés natifs seulement. Épinglage, auteur, partage familial et archivage non gérés.
- **memo-edit** : Mémos locaux : titre, contenu et mots-clés natifs seulement. Épinglage, auteur, partage familial et archivage non gérés.
- **lists** : Listes natives : nom, éléments et coches. Catégories, attribution, échéances et renommage de liste non gérés.
- **list-detail** : Listes natives : nom, éléments et coches. Catégories, attribution, échéances et renommage de liste non gérés.

## États complémentaires de test

 - [list-connected-320.png](states/list-connected-320.png)
 - [list-connected-390.png](states/list-connected-390.png)
 - [list-offline-320.png](states/list-offline-320.png)
 - [list-offline-390.png](states/list-offline-390.png)
