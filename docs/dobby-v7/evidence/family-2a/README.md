# Mission 2A — références Stitch et interfaces DOBBY

Sept compositions originales à **320 et 390 px**, testées avec profils éphémères et données de contrôle préfixées `TEST`. Aucun compte réel ni donnée familiale réelle dans ces preuves.

**Référence** : HTML Stitch sans ses scripts de démonstration, CSS/polices locaux ; les exemples y restent ceux de la maquette. **Interface** : même composition alimentée par le moteur natif. Deux URL de héros ne fournissent pas d’image : le remplacement Salon est signalé dans [les limites](../../FAMILY-2A.md) et la provenance, y compris pour le rendu de référence.

[Galerie comparative](index.html) · [Contrôles navigateur](checks.json) · [Contrats et tests](../../FAMILY-2A.md) · [Résultats et corrections](VERIFICATION.md)

| Source | Statut | Réf. 320 | DOBBY 320 | Réf. 390 | DOBBY 390 |
|---|---|---|---|---|---|
| Membres | Fonctionnelle | [Source](before/members-320.png) | [Interface](after/members-320.png) | [Source](before/members-390.png) | [Interface](after/members-390.png) |
| Fiche du membre | Partielle, limites documentées | [Source](before/member-edit-320.png) | [Interface](after/member-edit-320.png) | [Source](before/member-edit-390.png) | [Interface](after/member-edit-390.png) |
| Agenda | Fonctionnelle | [Source](before/agenda-320.png) | [Interface](after/agenda-320.png) | [Source](before/agenda-390.png) | [Interface](after/agenda-390.png) |
| Rendez-vous médical | Partielle, limites documentées | [Source](before/medical-edit-320.png) | [Interface](after/medical-edit-320.png) | [Source](before/medical-edit-390.png) | [Interface](after/medical-edit-390.png) |
| Carnet familial | Partielle, limites documentées | [Source](before/health-320.png) | [Interface](after/health-320.png) | [Source](before/health-390.png) | [Interface](after/health-390.png) |
| Carnet individuel | Partielle, limites documentées | [Source](before/health-person-320.png) | [Interface](after/health-person-320.png) | [Source](before/health-person-390.png) | [Interface](after/health-person-390.png) |
| Historique et contacts | Partielle, limites documentées | [Source](before/health-history-320.png) | [Interface](after/health-history-320.png) | [Source](before/health-history-390.png) | [Interface](after/health-history-390.png) |

28 captures comparatives au total. Les contrôles vérifient l’empreinte de chaque HTML original, le routage, les données et l’absence de contrôles hors viewport. Les barres fixes apparaissent à la hauteur du viewport dans les captures pleine page, conformément à leur position pendant la consultation.

## États vides

- Membres : [320 px](empty/members-320.png), [390 px](empty/members-390.png).
- Fiche du membre : [320 px](empty/member-edit-320.png), [390 px](empty/member-edit-390.png).
- Agenda : [320 px](empty/agenda-320.png), [390 px](empty/agenda-390.png).
- Rendez-vous médical : [320 px](empty/medical-edit-320.png), [390 px](empty/medical-edit-390.png).
- Carnet familial : [320 px](empty/health-320.png), [390 px](empty/health-390.png).
- Carnet individuel : [320 px](empty/health-person-320.png), [390 px](empty/health-person-390.png).
- Historique et contacts : [320 px](empty/health-history-320.png), [390 px](empty/health-history-390.png).

## Partage volontaire et hors ligne

Le vrai client et ses gestionnaires familiaux tournent contre une API en mémoire. Les réponses et écritures sont interceptées ; aucune requête n’atteint un foyer réel.

- Rendez-vous volontairement partagé : [320 px](states/health-shared-320.png), [390 px](states/health-shared-390.png).
- Modification conservée hors ligne : [320 px](states/health-offline-320.png), [390 px](states/health-offline-390.png).
- Conflit concurrent avant résolution : [320 px](states/health-conflict-320.png), [390 px](states/health-conflict-390.png).
