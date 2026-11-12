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

## Recette historique et correctif de présentation

Relecture indépendante des commits `a8ef0d3`, `dc83b42`, `9efbcf9`, `2415fdf`, `981cce4` : aucun affaiblissement actionnable identifié. Les événements immuables, identités de compensations et soldes nets sont vérifiés ; la géométrie reste contrôlée avec les menus ouverts, les choix Midi/Soir et les autres repas sont préservés. Cuisine conserve les contrôles natifs exacts de quantités, import, déplacement/annulation et persistance.

`e5fb9e6` : historique du profil signé +/−, trois événements +17/−17/+25, solde25 et ledger inchangé. Régression native par formulaires RED→GREEN ; relecture sans constat substantiel.

## Ordre de démarrage et notifications

La CI sur `faf89d5` a confirmé tous les parcours globaux puis exposé un reset interrompu encore instable. Deux régressions déterministes ont prouvé la notification retardée et le chargement natif avant la fin du bootstrap. `a57b4f14da91da32af5d2c8711471e7f0b3dfebc` corrige ces ordres avec jeton/génération, événements de stockage et barrière de chargement de l’iframe générée. Cinq exécutions ciblées réussies ; revue indépendante : aucun constat substantiel, API/writers natifs inchangés.

La garde de réutilisation historique a fait l’objet de dix tests positifs/négatifs Git/API, dont changement natif, renommage, ascendance et étape non réussie. Le workflow courant rejoue tous les contrôles concernés.

## Document restauré et atténuation des attentes prématurées

`771193e3d3b36dc470d7b8ae8b5190f9e1a4207f` : préservation du document natif restauré au bon URL, nettoyage de session borné au préfixe. Le test conserve un marqueur réel dans le window natif restauré pendant un Web Lock : échec sur l’ancien chargeur, succès après correction. Relecture sans constat substantiel, sources natives/API inchangées.

`47a3866` : attentes du dock basées sur URL et DOM réellement rendu, Retour/Avance exacts ; preuve par attente du vrai fichier Menu. Aucun affaiblissement des assertions, des délais ou des contrôles d’erreurs.
