# Missions et récompenses individuelles

Base [lot 1, PR #38](https://github.com/PortenartCo/dobby-demo/pull/38), commit `c4005809680d8533e1496ff08bef1747400fa741`. Exigences [#37](https://github.com/PortenartCo/dobby-demo/issues/37) et [#41](https://github.com/PortenartCo/dobby-demo/issues/41).

- Les nouvelles missions assignées exclusivement à des enfants disposent d'une participation par enfant. Le formulaire propose la validation parentale, désactivée par défaut. Le montant entier est figé à la soumission et la validation tardive respecte le montant en attente. Chaque crédit par enfant et occurrence rejoint le ledger du lot 1 sous une identité déterministe. Les missions historiques conservent leurs règles, crédits et annulations.
- Le serveur matérialise les occurrences de ces séries selon les règles natives et l'heure civile de Bruxelles, sur la fenêtre de reprise native de 30 jours. Les occurrences déjà générées sont conservées. Une échéance dépassée passe à « Manquée » sauf si une demande attend déjà un parent ou si le crédit est confirmé. La régularisation est une action parentale auditée. Une période d'inactivité supérieure à cette fenêtre ne matérialise pas automatiquement tous les jours antérieurs.
- Un objectif par enfant, au-dessus du capital et du dernier seuil accordé, peut être annoncé ou surprise. Le titre secret préparé reste privé jusqu'à la confirmation. Les alertes parentales se fondent sur les demandes et paliers du serveur. « Plus tard » les masque pour la page courante, sans changer l'action à traiter. Après synchronisation, une confirmation unique retire l'alerte pour les deux parents et ajoute l'historique.
- Le capital corrigé, bonus compris, détermine le déblocage dans la même transaction que l'écriture du crédit. Une correction peut reverrouiller l'objectif actif. Elle ne modifie jamais l'historique des récompenses accordées.
- Le writer V3, son CAS, ses permissions et ses reçus sont communs aux intentions précédentes et nouvelles. Une réponse perdue conserve le même UUID, la révision et l'intention dans la file native. Une intention qui reste hors ligne après l'échéance est jugée selon sa réception serveur. Les saisies d'un enfant ne sont pas créditées sur la base de son horloge locale.

## Migration et limites

[02-participations-recompenses.sql](02-participations-recompenses.sql) s'applique après [la migration du lot 1](../runes-lot1/01-etendre-registre-v3.sql). Elle vérifie le writer exact, son propriétaire et ses ACL, puis installe le support du lot sans conversion des crédits ni changement des flags de publication. Elle ajoute une table privée RLS pour la préparation des surprises et conserve le même registre partagé. Le délai de validation vérifié et le partage Missions actif restent nécessaires.

Les plafonds natifs du module Missions restent applicables, dont les 256 Kio côté serveur. Une saturation refuse la transaction entière et conserve le registre. La projection automatique ne crée aucune ligne après saturation et aucun élément n'est tronqué. La politique de conservation à long terme des historiques volumineux reste à traiter avant toute généralisation. Les anciens clients n'interprètent pas les nouveaux champs de progression. Pour suspendre après adoption, fermer la capacité et conserver les données et le client de lecture compatible. Ne pas restaurer un writer plus ancien sur un registre utilisé.

## Vérification

La CI du lot lance les tests natifs, la preuve réversible des empreintes historiques, la chaîne des migrations en PostgreSQL 17.11 isolé et les écrans Chromium sur 320, 390 et 1440 px. Les tests SQL construisent deux nouveaux parents, deux enfants et un autre foyer fictifs. Ils couvrent l'interdiction d'agir pour un autre enfant, les refus et resoumissions, les validations concurrentes, les échéances, la régularisation unique, deux dates d'une série, un bonus qui débloque puis une correction qui reverrouille, la confidentialité et l'absence de révocation après confirmation. Les captures présentent des données fictives. La recette avec des comptes et sessions HTTP Supabase réels reste distincte.

Reproduction locale avec Docker et les dépendances navigateur installées.

```sh
node --test essai-stitch-v5-famille/tests/*.test.mjs essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v7/tests/fam-integration-transverse.test.cjs
python3 docs/dobby-v7/runes-lot2/test-postgres.py
# Depuis une autre session, servir la racine sur le port 8772.
node essai-stitch-v7/tests/runes-lot2-ui.cjs
```
