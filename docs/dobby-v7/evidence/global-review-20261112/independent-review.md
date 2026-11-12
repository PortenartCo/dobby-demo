# Revues indépendantes

## Réconciliation native — commit990c486

Relecture indépendante du diff c510ded..990c486 : aucun constat actionnable P0–P3. Périmètres : writer Missions natif, opérations V2 durables, UUID et contenu immuables au réessai, CAS, vérification des reçus et historique, conversion historique explicite avec backup et empreintes, conservation des missions automatiques, mémos E09 et champs familiaux inconnus, absence de fallback local après partage confirmé.

Preuves consultées : 186 tests natifs réussis. Pas de répétition de la campagne et aucun appel SQL/Supabase réel pendant la revue.

## Harness — commit8982c83

Constat P1 : reset initial ne supprimait pas la base native des pièces jointes, ni tous les timers/backups du préfixe. Reproduction Chromium : création fictive via `houseStore`, reset, puis `houseRead` retourne encore le blob. Correction requise avant publication ; aucune donnée étrangère à l’aperçu effacée par la reproduction.

Autres périmètres sans défaut substantiel trouvé : préfixes A/B indépendants, transport simulé sérialisé, writers natifs, CAS et RPC, origine .invalid, requêtes extérieures bloquées, authentification réelle interdite, génération dans un nouveau dossier, source SHA et manifeste complet.

## Corrections et relecture

- `2961715eaf93cbdb2eb8cbe4c217f2fe6b8a38d9` : le défaut de reset complet est levé. Régression [RED](reset-red.log) → [GREEN](reset-green.log) avec pièces jointes A/B natives, autres stockages fictifs et témoins étrangers.
- La relecture a reproduit un second P1 : un token de reset orphelin pouvait empêcher la reprise après fermeture de l’onglet initiateur, pendant l’attente du Web Lock.
- `404c5cde2c10e05d9f895c98f594cc30f9146461` : reprise sous le même Web Lock avant le démarrage natif. Régression contrôlée [RED](reset-interrupted-red.log) → [GREEN](reset-interrupted-green.log).
- Relecture indépendante du correctif final : P1 résolus, nettoyage toujours limité au préfixe global, aucun autre constat substantiel. Aucune campagne complète répétée par le reviewer.
