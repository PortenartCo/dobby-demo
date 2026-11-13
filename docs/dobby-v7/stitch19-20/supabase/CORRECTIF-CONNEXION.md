# Correctif de connexion sur Supabase géré

Les diagnostics exécutés sur le projet familial ont confirmé deux faits :
`dobby_v7_writer` ne peut pas utiliser le schéma `auth`, et le rôle du SQL Editor
ne peut pas lui accorder ce droit. Les deux comptes Auth sont confirmés et ont
réussi une connexion depuis la publication ; la vérification familiale échoue
en base avec `42501`.

Le correctif adapte exactement deux fonctions :

| Fonction | Modification |
| --- | --- |
| `dobby_v7_private.actor()` | Lit le `sub` des revendications JWT déjà validées par Supabase, avec la même priorité et les mêmes refus que le helper installé. |
| `public.dobby_v2_modules_stamp()` | Ajoute une branche réservée au rôle V7 pour attribuer l’écriture au bon compte ; les branches Missions et habituelle sont conservées. |

Aucune création de table, migration de données, modification de compte, de foyer,
de rôle, de schéma Auth ou de politique RLS. Le helper privé reste
`SECURITY INVOKER` ; il est recréé sous le propriétaire du schéma privé, avec
exécution réservée à ce propriétaire et au rôle technique V7. Les RPC publics
restent sous le rôle technique fermé. Aucun nouveau `SECURITY DEFINER` n’est ajouté.

Les empreintes des fonctions doivent correspondre aux diagnostics reçus.
Un écart provoque l’annulation de toute la transaction.

## Exécution manuelle

Dans le SQL Editor du seul projet **dobby-family-sync** (`pqcdkrwljgvgagzwrcmg`),
avec le même rôle que pour les diagnostics :

1. Exécuter le fichier complet [11 — correctif](11-apply-auth-schema-fallback.sql).
2. Exécuter le fichier complet [12 — vérification](12-verify-auth-schema-fallback.sql).
3. Transmettre la cellule JSON `repair_verification`, ou l’erreur exacte.

Ne relancer aucun reset, ni `01`, ni `04`. Le script `12` est le contrôle adapté
à ce correctif ; l’ancien `02` exige le propriétaire initial du helper privé.
`writerAuthSchemaUsage: false` reste attendu après correction : aucun droit
supplémentaire n’est accordé sur le schéma géré par Supabase.

Le SQL reste **à appliquer** tant que le résultat d’exécution n’a pas été reçu.
La simulation du contexte en base ne valide pas les requêtes API ni les parcours
réels : connexion, création du foyer, invitation, acceptation et synchronisation
doivent ensuite être vérifiées dans les deux navigateurs indépendants.

## Retour arrière

Le fichier [13 — retour arrière](13-rollback-auth-schema-fallback.sql) est réservé
à l’annulation de ce correctif. Il restaure les deux corps de fonctions initiaux,
sans supprimer les données créées entre-temps. Le helper privé conserve son
nouveau propriétaire et reste `SECURITY INVOKER` avec son accès fermé : les droits
actuels ne permettent pas de rétablir son propriétaire technique initial.
Le refus lié au schéma Auth réapparaîtra après ce retour arrière.
