# Lot 5 — sources et preuves

Profils Chromium éphémères, fixtures préfixées TEST ; aucun compte réel. Référence : HTML Stitch original dérivé sans scripts fictifs, ressources locales. Interface : même composition, données natives. 2 URL d’illustration indisponibles dans ce lot, substituées par le Salon avec provenance ; la substitution apparaît aussi dans la référence.

[Galerie](index.html) · [Contrôles](checks.json) · [Checkpoint](../../CHECKPOINTS.md)

| Source / route | État | Source 320 | DOBBY 320 | Source 390 | DOBBY 390 |
|---|---|---|---|---|---|
| dobby_cr_er_et_attribuer_une_mission — `#mission-edit` | verified-partial | [Source](before/mission-edit-320.png) | [Interface](after/mission-edit-320.png) | [Source](before/mission-edit-390.png) | [Interface](after/mission-edit-390.png) |
| dobby_conversation_avec_dobby_1 — `#chat` | verified-partial | [Source](before/chat-320.png) | [Interface](after/chat-320.png) | [Source](before/chat-390.png) | [Interface](after/chat-390.png) |
| dobby_conversation_avec_dobby_2 — `#chat-2` | verified-partial | [Source](before/chat-2-320.png) | [Interface](after/chat-2-320.png) | [Source](before/chat-2-390.png) | [Interface](after/chat-2-390.png) |
| dobby_rechercher_dans_dobby_recherche_transversale — `#search` | verified-partial | [Source](before/search-320.png) | [Interface](after/search-320.png) | [Source](before/search-390.png) | [Interface](after/search-390.png) |
| dobby_menu_g_n_ral_de_tous_les_modules — `#menu` | verified-functional | [Source](before/menu-320.png) | [Interface](after/menu-320.png) | [Source](before/menu-390.png) | [Interface](after/menu-390.png) |
| dobby_grimoire_personnel_du_membre — `#personal` | verified-partial | [Source](before/personal-320.png) | [Interface](after/personal-320.png) | [Source](before/personal-390.png) | [Interface](after/personal-390.png) |

24 captures comparatives et 12 états vides dans `empty/`. Les références contiennent les exemples de la maquette ; ceux-ci ne sont jamais importés dans le moteur. Les barres fixes restent à la hauteur du viewport dans la capture pleine page.

## Limites par source

- **mission-edit** : Mission native : titre, catégorie, membre responsable, échéance et note. Pas de récurrence, heure, difficulté, runes ou récompense.
- **chat** : Commandes textuelles natives limitées et historique local. Pas d’IA générative, de pièce jointe, de dictée ou de synthèse vocale qualifiée.
- **chat-2** : Même moteur natif de commandes et historique. Pas d’IA générative, de pièce jointe, de dictée ou de synthèse vocale qualifiée.
- **search** : Recherche locale native contacts, listes, fiches santé locales, documents, mémos, équipements, recettes ; 80 résultats maximum. Pas d’index des fichiers, Apple, membres, agenda, missions ou historique de recherches.
- **menu** : Navigation vers les outils existants et filtre du menu ; aucun nouveau module inventé.
- **personal** : Membre canonique et missions attribuées. Accès au carnet local et agenda ; pas d’agrégation automatique des documents par champ personne libre, contacts personnels, récompenses ou antécédents structurés.

## États complémentaires de test

 - [chat-native-320.png](states/chat-native-320.png)
 - [chat-native-390.png](states/chat-native-390.png)
 - [global-menu-320.png](states/global-menu-320.png)
 - [global-menu-390.png](states/global-menu-390.png)
 - [missions-manual-320.png](states/missions-manual-320.png)
 - [missions-manual-390.png](states/missions-manual-390.png)
 - [missions-offline-320.png](states/missions-offline-320.png)
 - [missions-offline-390.png](states/missions-offline-390.png)
 - [missions-resynced-320.png](states/missions-resynced-320.png)
 - [missions-resynced-390.png](states/missions-resynced-390.png)
 - [personal-member-320.png](states/personal-member-320.png)
 - [personal-member-390.png](states/personal-member-390.png)
