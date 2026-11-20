# Permissions serveur des comptes enfants

[01-restrict-child-access.sql](01-restrict-child-access.sql) est une proposition transactionnelle pour le projet familial DOBBY. Elle vérifie les signatures du socle Famille et Missions V2/V3, le lot 2 Runes et les politiques Storage du bucket privé `dobby-family-files`. L’installation exige les droits DDL sur ce bucket. Un écart de catalogue annule la transaction.

`dobby_v7_family_capabilities()` expose `childAccessProtocol: 1` quand la migration est installée. L’accès enfant exige toujours les portes existantes Famille, Storage et Rattachement enfant. Les lectures et écritures Missions exigent aussi la porte Missions V3.

| Appel | Droit et réponse |
| --- | --- |
| `GET dobby_v7_child_module(p_household_id uuid, p_module text)` | Enfant canonique actif du foyer. `family` et `missions` renvoient `{module,payload,revision,updated_at}` ou `null` lorsque le module est absent. |
| `GET dobby_v7_child_access_status(p_member_id text)` | Parent canonique du foyer et fiche enfant existante. Renvoie `{linked,active}`. |
| `POST dobby_v7_suspend_child_access(p_member_id text)` | Parent canonique du foyer et fiche enfant existante. Désactive l’appartenance, révoque les invitations ciblées en attente et renvoie `{linked,active:false}`. La fiche, la liaison et l’historique sont conservés. |
| `GET dobby_v7_context()` | Une liaison canonique enfant suspendue renvoie `phase: 'rejected'` et `reason: 'child_access_suspended'`. |
| `POST dobby_missions_v3_write(...)` | Writer V3 natif. Pour un enfant, l’enveloppe autorise la réalisation d’une mission à attribution unique propre, la soumission d’une participation propre et la projection des occurrences de récurrence qui lui sont attribuées. Réponse et rejeu utilisent la projection enfant. |
| `POST dobby_v7_update_magic(...)` | L’enfant peut changer sa Maison et son Patronus via le writer natif. Sa réponse Famille utilise la même projection que la lecture. |

La lecture brute de `dobby_v2_modules` est limitée à `menus` et `recipes` pour l’enfant actif. Les Courses suivent les politiques existantes. Les lectures et écritures du bucket de documents familiaux exigent le rôle parent canonique du foyer. Les politiques Santé et les médias recettes suivent leurs sources dédiées.

La projection Famille inclut les champs de présentation des membres et les événements familiaux ordinaires autorisés. Elle omet les notes, descriptions, documents, mémos et contacts. Un événement avec une visibilité privée ou une liste de destinataires excluant l’enfant est masqué. La projection Missions conserve les montants et répartitions propres à l’enfant. Elle adapte les événements du registre et leurs références au format attendu par le validateur JS. Le contenu d’une surprise est masqué dans le palier actif et garde le libellé « Récompense mystère » dans l’historique enfant.

La suspension utilise le verrou du foyer et l’appartenance cible. Après validation de la suspension, le même JWT Auth perd les droits attachés à cette appartenance. L’invitation consommée et le lien canonique sont conservés. Une nouvelle invitation vers cette fiche liée est refusée par le flux natif.

## Validation locale

Depuis la racine du dépôt, avec Docker, Python 3 et Node :

```sh
python3 -u docs/dobby-v7/comptes-enfants/tests/run-local.py --storage-http
```

Le runner crée les services temporaires PostgreSQL 17.11, PostgREST 14.8 et Storage 1.89.12. Les profils, foyers et JWT sont fictifs. La recette vérifie la RLS de `storage.objects` en SQL et via PostgREST. Avec `--storage-http`, elle vérifie aussi l’écriture et la lecture du même fichier familial via l’API Storage pour les parents et les refus pour les enfants, un autre foyer et l’accès public. La commande imprime l’empreinte SHA-256 du candidat SQL. Les e-mails Auth relèvent de la recette Chromium.
