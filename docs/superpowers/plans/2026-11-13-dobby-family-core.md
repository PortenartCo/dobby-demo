# DOBBY V7 — finalisation du socle familial

> Exécution autonome autorisée par la demande utilisateur du 13 novembre 2026. Les checkpoints serveur restent manuels.

**But :** traiter les dix réserves S03, S04, S10, D02, M06, M07, M08, C07, F08 et F09 sans rouvrir les cinquante points livrés.

**Base :** `origin/main` vérifié à `b77cb9de100a864c8aace8fb9e07053220ccd23a`, branche isolée `feat/dobby-v7-family-core-20261113`.

**Architecture :** conserver les profils canoniques TEXT de `familyMembers`, les liaisons privées V7, les modules et tout le ledger existant. Construire le writer V3 à partir des définitions réellement installées ; séparer les intentions enfant des snapshots parent. Toute capacité nouvelle reste fermée jusqu'à vérification réelle du serveur.

**Pile :** application statique JavaScript, modules de domaine JS, tests Node/Playwright, PostgreSQL 17 et Supabase Auth/RLS. Supabase est exclusivement manipulé par l'utilisateur.

**Spécification :** demande « Finalisation du socle familial et des 10 réserves », contrats existants `missions-00-contract.md`, `famille/CONTRAT-SERVEUR.md`, `README-ROLES.md`, paquet Courses et documentation Stitch 19/20. La recette réelle de reconnexion B consignée dans `b77cb9d` fait foi.

## Contraintes globales

- Aucun SQL distant, aucun changement Supabase par l'agent. Seul projet concerné : `dobby-family-sync`.
- Aucun reset, aucun rejeu de Stitch 01/06/11, jamais 04. Aucun effacement silencieux hors ligne.
- Aucun corps de fonction réel confidentiel, donnée familiale, identifiant Auth ou secret dans Git public.
- Ne pas inventer les fonctions privées Missions manquantes. Ne jamais envoyer de V3 au writer V2.
- Ne pas confondre fixtures, installation réelle et recette utilisateur ; conserver les gates jusqu'aux preuves requises.

## Tâches et checkpoints

1. **A — Réconcilier.** Matrice des dix réserves, preuves déjà acquises et seuls sous-cas manquants ; protocoles Auth et microphone physique courts.
2. **B — Observer.** Un fichier SQL strictement en lecture seule : catalogue Courses, Missions, Famille, droits et dépendances ; sorties techniques confidentielles séparées. Vérifier sa syntaxe et son innocuité localement, puis fournir le paquet à l'utilisateur.
3. **Travaux indépendants.** Examiner les protections de stockage `FOYER-LOCAL-AUTRE`, les transports/gates actuels et les tests pertinents ; ne corriger que ce qui peut être prouvé sans serveur manquant.
4. **C — Développer après retour catalogue.** Réutiliser C07 conditionnellement ; writer V3 atomique et idempotent ; droits Parent/Enfant dans RPC/RLS ; invitation enfant ciblée sur le même profil. Préparer installation/vérification/retour arrière séparés.
5. **D — Valider.** Tests locaux PostgreSQL avec modèle réel et données fictives, concurrence/rejeux/annulation, RPC privilégiées et accès croisés. Attendre les résultats utilisateur pour tout état « appliqué » ou capacité active.
6. **E — Livrer.** Commits ciblés, revue indépendante, CI ; intégrer et publier seulement les parties autonomes validées. Vérifier le SHA hébergé et l'URL canonique. Reporter explicitement `CODE_DÉVELOPPÉ`, `TESTS_PASS`, `INTÉGRÉ`, `DÉPLOYÉ`, `RECETTE_RÉELLE_VALIDÉE`, `BLOQUÉ`.

## Revue et validation ciblées

La revue du diagnostic doit vérifier lecture seule, absence de données personnelles, couverture des dépendances et droits de maintenance PostgreSQL 17. La revue serveur doit vérifier concurrence, conservation intégrale des crédits, autorité canonique, fermeture des rôles et absence de contournement via RPC privilégiées. Aucun rejeu des anciennes campagnes sans lien causal avec un changement.

## Avancement

- A terminé : dix identifiants réconciliés ; reconnexion B déjà réellement validée.
- B terminé : fichier exact testé sur cinq contextes locaux, revu indépendamment, exécuté par l'utilisateur et retour complet reçu le 13 novembre. Sources brutes conservées privées. Premier commit `92cb130`.
- Modèle privé reconstruit : treize helpers Missions et fonctions natives critiques reproduisent les empreintes reçues. Sessions de test SQL Editor `postgres` non superuser, conteneur sans réseau.
- C en cours : migrations Famille/V3 coordonnées, transport V3 séparé et parcours enfant derrière gates fermés. C07 existant validé sur clone exact ; pas encore installé réellement.
- Protection du stockage conservée : les données applicatives globales empêchent une bascule sûre par suppression d'un simple marqueur.
- D/E à suivre : tests/revue complets du candidat, paquet manuel regroupé, résultats utilisateur, CI/publication des seuls chemins indépendants validés puis vérification hébergée.
