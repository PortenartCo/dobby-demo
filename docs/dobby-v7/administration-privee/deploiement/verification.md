# Vérification reproductible — Lot 1

Depuis la racine du dépôt, Docker local disponible :

```sh
docker --host unix:///var/run/docker.sock pull postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4
node --test tests/private-access/*.test.mjs
node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs
node --check supabase/functions/_shared/dobby-access-contract.ts
git diff --check
```

Le téléchargement d’image ne contacte aucun service DOBBY. Le runner utilise ensuite `--pull=never`, un conteneur neuf isolé, et refuse ports et bind mounts. Il ne réutilise ni ne réinitialise de base existante. Il détruit uniquement le conteneur qu’il a créé. Toutes les cases de test sont annulées ; les grants du propriétaire Auth fictif font partie de la préparation locale, jamais de la migration candidate.

Résultats de référence de cette mission : **23 tests DB et 444 tests natifs réussis**, zéro échec/omission. La vérification de syntaxe du contrat est locale. Voir les [limites exactes](../lot-1/RAPPORT.md) : pas d’Auth HTTP, de JWT cryptographique, de Storage physique, de fonctions privées réelles ou de comptes réels certifiés.

À contrôler après toute modification :

- `is_active()` refuse sans registre, sans autorisation, avec une session absente/mauvaise/expirée ou des droits techniques indisponibles.
- `assert_owner()` ne dépend que du registre et d’une session autorisée ; aucun e-mail, profil familial ou `user_metadata` ne peut accorder ce droit.
- Les fonctions privées d’amorçage/activation ne sont pas exécutables par le client non superuser ; les tables ne lui sont pas accessibles et les rôles techniques restent fermés.
- Les deux identités fictives conservent leurs liens TEXT, foyers, profils, révisions, crédits et droits métier précédents. Le propriétaire applicatif ne gagne aucun contenu H2.
- Suspension/réactivation et historique sont atomiques ; ancienne session refusée même après refresh simulé, nouvelle session requise après réactivation ; admission révoquée non restaurée.
- Le diff n’ajoute que la migration candidate, le contrat, les tests et la documentation du Lot 1. Aucune migration n’est exécutée sur un service distant.

Les vérifications futures de catalogue/API réelles devront être autorisées, documentées séparément et exécutées sur le seul environnement personnel désigné. Ne pas transformer les PASS locaux de ce lot en PASS globaux T01/T02/T10/T12.
