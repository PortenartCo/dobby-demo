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

Commit final 2B : `603323cacd5419e7588ae0b7d8dd6cb81e7ba6e7`. CI [PR — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42579128770) et [push — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42579122942), sur ce SHA. Prochain lot : **3 — Maison, équipements, entretiens et sauvegardes**. Ne pas recommencer 2B si son checkpoint CI est réussi.

## Lot 3 — maison, équipements, entretiens et sauvegardes

Sept sources raccordées : `house-1`, `house`, `equipment-edit`, `equipment`, `maintenance`, `house-backup`, `backup`. Deux registres fonctionnels ; cinq sources partielles. Bilan après ce lot : 36 templates actifs = 21 fonctionnels + 15 partiels ; 17 sources restantes. [Comparaisons et limites](evidence/lot-3/README.md).

Gestionnaires : `houseForm`, `houseLogForm`, `data-house-action`, `houseDocFile`, `houseImport`, `data-backup` et `dobbyFullRestore`. La date de garantie native remplace la durée en mois de Stitch. Aucun numéro de série, coût/prestataire par intervention, photo ou journal de sauvegarde inventé. Les documents ont le même IndexedDB, les mêmes références et les mêmes limites natives ; leurs octets sont vérifiés après enregistrement/recharge. Les illustrations restent les originaux disponibles ; les photos d’appareils sans équivalent natif deviennent des placeholders explicites.

Tests à 320/390 : équipement → fiche → modification, entretien sans recalcul quand « réalisé » est décoché, fichier PDF conservé, historique, variantes, export équipements sans fichiers et export complet avec le vrai fichier encodé, validation JSON, aperçu, confirmation native annulée et données inchangées. Une ancienne requête d’aperçu ralentie ne peut plus remplacer le fichier sélectionné ensuite. Aucun remplacement destructif exécuté.

Défauts reproduits puis corrigés : input natif détaché pendant lecture du fichier, perte de métadonnées lors d’une navigation pendant écriture native, doublon d’export complet, bouton imbriqué dans un ancien bouton désactivé, confirmation complète inaccessible car son ancien contrôle n’est plus rendu par V23, aperçu de fichier obsolète. Un verrou temporaire de présentation attend l’enregistrement natif avant navigation ; aucun writer supplémentaire. Le sélecteur complet manquant est créé temporairement dans l’iframe avec son ID natif pour transmettre au gestionnaire original existant. Les promesses d’inviolabilité sont remplacées par la description réelle de l’archive non chiffrée et les actions de fichier sont libellées en français.

Les comparaisons contiennent 28 captures source/interface, 14 états vides et 8 états fichier/aperçus/erreur. Les régressions communes et 2B sont justifiées par le verrou du shell partagé. L’exécution réelle de restauration complète reste volontairement non validée ; ce statut partiel est conservé.

Commit/CI finaux : à inscrire dans la PR après push et reporter au checkpoint suivant. Prochain lot : **4 — Documents, contrats, assurances et imports**.
