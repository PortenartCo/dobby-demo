# Checkpoints — intégration séquentielle 2B à 5

Branche / PR : `feat/dobby-stitch-53-source-backed-v7`, #3. Ne jamais revenir au commit de référence initial. Les résultats finaux de chaque push et leur SHA exact sont également inscrits dans la PR ; le journal local de reprise conserve le SHA avant le lot suivant.

## Démarrage vérifié

- Base actualisée : `152cb89cd33fe5ba2349b965ea8b1a60d1140b1f`. Cuisine et 2A terminés, CI push/PR réussies.
- 23 templates actifs : 18 fonctionnels, 5 partiels ; 30 importations restantes.
- Aucun 2B trouvé dans git, le manifeste, la documentation ou les tâches Codex actives.
- Seul répertoire préexistant non suivi : `essai-stitch-v5-famille/tests/node_modules/`, conservé intact.

## Lot 2B — contacts, mémos, listes

Six originaux raccordés : `contacts`, `contact-edit`, `memos`, `memo-edit`, `lists`, `list-detail`. Les identifiants exacts, statuts et fonctions manquantes sont dans [le manifeste](../../essai-stitch-v7/route-manifest.json) et [l’index 2B](evidence/lot-2b/README.md). Répertoire fonctionnel ; cinq sources partielles. Le total atteint 29 templates actifs, 19 fonctionnels + 10 partiels, 24 sources restantes.

Contrats natifs : nom/rôle/téléphone/courriel/note des contacts ; titre/mots-clés/contenu des mémos locaux ; création/suppression des listes, ajout/retrait et coches d’éléments. Aucun rôle structuré, épinglage, auteur, archive, catégorie/attribution/renommage de liste inventé. Les membres et patients restent leurs registres existants ; un contact n’en crée pas.

Tests : `register-family.cjs` à 320/390 (CRUD, annulation de suppression, persistance/recharge, recherche vide puis restauration, lien obsolète) ; `register-sync.cjs` (client familial natif/API interceptée, contacts/listes transmis, coche hors ligne/reprise, mémos privés exclus) ; `register-visual.cjs` (24 comparaisons + 12 états vides). Les 54 régressions natives et les tests 2A/racines sont justifiés par l’extension du shell commun. Aucune session réelle ni nouvelle connexion à un service réel.

Défauts observés et corrigés : double formulaire du tiroir liste, construction de l’événement natif de coche, filtres débordants à 320 px, action contact 2A confondue avec la nouvelle route, mots-clés et épinglage de démonstration, disponibilité de la resynchronisation après recharge hors ligne. Les assertions ont d’abord détecté les défauts. Les 3 URL d’illustration non image sont signalées et remplacées avec provenance ; les cadres et compositions restent issus des sources.

Commit et CI : à renseigner dans la PR après push, puis reportés ici au lot suivant. Prochain lot : **3 — Maison, équipements, entretiens et sauvegardes**. Ne pas recommencer 2B si son checkpoint CI est réussi.
