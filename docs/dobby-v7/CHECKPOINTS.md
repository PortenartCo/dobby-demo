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

Défauts observés et corrigés : double formulaire du tiroir liste, construction de l’événement natif de coche, filtres débordants à 320 px, action contact 2A confondue avec la nouvelle route, mots-clés et épinglage de démonstration, disponibilité de la resynchronisation après recharge hors ligne. Les assertions ont d’abord détecté les défauts. Les filtres du répertoire utilisent désormais les rôles réellement enregistrés ; la recherche des mémos ne multiplie plus les gestionnaires lors des saisies successives. Ces corrections ciblées du shell sont couvertes au lot 3, sans réaudit de 2B. Les 3 URL d’illustration non image sont signalées et remplacées avec provenance ; les cadres et compositions restent issus des sources.

Commit final 2B : `603323cacd5419e7588ae0b7d8dd6cb81e7ba6e7`. CI [PR — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42579128770) et [push — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42579122942), sur ce SHA. Prochain lot : **3 — Maison, équipements, entretiens et sauvegardes**. Ne pas recommencer 2B si son checkpoint CI est réussi.

## Lot 3 — maison, équipements, entretiens et sauvegardes

Sept sources raccordées : `house-1`, `house`, `equipment-edit`, `equipment`, `maintenance`, `house-backup`, `backup`. Deux registres fonctionnels ; cinq sources partielles. Bilan après ce lot : 36 templates actifs = 21 fonctionnels + 15 partiels ; 17 sources restantes. [Comparaisons et limites](evidence/lot-3/README.md).

Gestionnaires : `houseForm`, `houseLogForm`, `data-house-action`, `houseDocFile`, `houseImport`, `data-backup` et `dobbyFullRestore`. La date de garantie native remplace la durée en mois de Stitch. Aucun numéro de série, coût/prestataire par intervention, photo ou journal de sauvegarde inventé. Les documents ont le même IndexedDB, les mêmes références et les mêmes limites natives ; leurs octets sont vérifiés après enregistrement/recharge. Les illustrations restent les originaux disponibles ; les photos d’appareils sans équivalent natif deviennent des placeholders explicites.

Tests à 320/390 : équipement → fiche → modification, entretien sans recalcul quand « réalisé » est décoché, fichier PDF conservé, historique, variantes, export équipements sans fichiers et export complet avec le vrai fichier encodé, validation JSON, aperçu, confirmation native annulée et données inchangées. Une ancienne requête d’aperçu ralentie ne peut plus remplacer le fichier sélectionné ensuite. Aucun remplacement destructif exécuté.

Défauts reproduits puis corrigés : input natif détaché pendant lecture du fichier, perte de métadonnées lors d’une navigation pendant écriture native, doublon d’export complet, bouton imbriqué dans un ancien bouton désactivé, confirmation complète inaccessible car son ancien contrôle n’est plus rendu par V23, aperçu de fichier obsolète. Un verrou temporaire de présentation attend l’enregistrement natif avant navigation ; aucun writer supplémentaire. La même attente couvre la validation et la confirmation natives des imports/restaurations ; la réponse réelle de la boîte de confirmation est préservée. Un fichier rejeté ne bloque pas la navigation. Le sélecteur complet manquant est créé temporairement dans l’iframe avec son ID natif pour transmettre au gestionnaire original existant. Les promesses d’inviolabilité sont remplacées par la description réelle de l’archive non chiffrée et les actions de fichier sont libellées en français.

Les comparaisons contiennent 28 captures source/interface, 14 états vides et 8 états fichier/aperçus/erreur. Les filtres natifs Tous/À surveiller/Garanties et les filtres de lieu utilisent les données du moteur, sans nouveau registre de pièces. La suppression réelle d’un équipement de test et de ses fichiers/historiques est vérifiée ; aucune donnée réelle n’est concernée.

Le répertoire utilise les rôles enregistrés et les variantes Maison les lieux réellement enregistrés ; ce sont des filtres de présentation, sans nouveau registre ni stockage. La recherche garde un seul gestionnaire de saisie.

Les formulaires de remplacement sont bloqués si des champs supplémentaires ou des dates dans un ancien format ne peuvent pas être conservés par le gestionnaire natif. Les catégories anciennes restent sélectionnables et réenregistrées sans changement. Les validations au clavier sont capturées sans exception JavaScript non gérée. Le libellé de garantie correspond à la date de fin native, sans équivalence en mois ni couverture inventée.

Les régressions communes et 2B sont justifiées par le verrou du shell partagé. L’exécution réelle de restauration complète reste volontairement non validée ; ce statut partiel est conservé.

Commit final lot 3 : `d3e1287c50e7191917f7e6c3293cba5e46baea55` (avec `41bb3e5`). CI [push — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42598223037), [PR — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42598229512). Prochain lot : **4 — Documents, contrats, assurances et imports**.

## Lot 4 — documents, contrats, assurances et imports

Onze sources, deux fonctionnelles et neuf partielles : 47 actives = 23 fonctionnelles + 24 partielles ; six sources transversales restantes. [Comparaisons, états et limites](evidence/lot-4/README.md). Les contrats restent des fiches documentaires natives. Fichiers locaux/partagés distingués ; un seul sélecteur actif, destination explicite, mêmes validations et transferts. Import natif texte/PDF/OCR avec correction et confirmation, doublons refusés ; pas d’IA ni de garantie/prime/rappel inventés.

Tests ciblés Documents, stockage/partage simulé, extraction réelle PDF/OCR et comparaisons des onze sources à 320/390 réussis. Les régressions communes sont justifiées par les nouveaux scripts et accès du shell. Les 54 tests natifs passent. Les confirmations de fusion JSON sont annulées ; les suppressions concernent exclusivement des fixtures. Les dépendances clientes existantes sont locales, avec empreintes et licences. Aucun compte réel, aucune modification du moteur V5, des originaux ou SQL/Supabase.

Corrections observées : boucle de rafraîchissement import, cartes DIV de démonstration résiduelles, colonnes de carte trop étroites, verrou inutile sur téléchargement en lecture seule. Les défauts sont corrigés et les tests ciblés repassent. Les écarts de composition et illustrations indisponibles sont décrits dans INTEGRATION.md et la galerie.

Commit final lot 4 : `2c688833d717aedc32d3c623665c7e10367d0b4e` (avec `7dfc2da`). CI [push — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42603579952), [PR — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42603597512). Prochain lot si CI réussie : **5 — Missions et outils transversaux**.

Complément lot 4 : les trois fiches détaillées conservent maintenant leurs vrais blocs héros/résumé/aperçu/registre/notes, y compris les variantes composées de DIV. Le test de composition a d’abord échoué puis passé. Un test de transfert sur deux fiches a détecté une référence obsolète du sélecteur temporaire partagé ; son destinataire est désormais actualisé à chaque envoi. Les deux objets restent distincts et la destination revient au local lors d’un changement de fiche.

## Lot 5 — Missions et outils transversaux

Six sources actives : création/modification de mission, deux conversations, recherche, menu et grimoire personnel. Une fonctionnelle, cinq partielles ; total **53 actives = 24 fonctionnelles + 29 partielles**, aucune page simplement importée restante. Les états exacts et fonctions manquantes sont dans [SOURCE-STATUS.md](SOURCE-STATUS.md). [Galeries générales](evidence/index.html), [lot 5](evidence/lot-5/README.md), [quatre racines](evidence/roots/README.md).

Tests locaux ciblés et communs réussis : missions natives/attribution/édition/terminaison, sources automatiques distinctes, commandes conversationnelles/historique, recherche locale et vraies destinations, choix de membre et absence de faux dossier clinique ; client de synchronisation natif sur API simulée, coche hors ligne/recharge/reprise et exclusion des données privées. Les quinze accès du menu, les quatre racines, retour/avance/recharge et l’absence de réutilisation d’un ID entre domaines sont vérifiés à 320/390. Les contrôles Documents sont complétés par un vrai mode navigateur hors ligne. Les comparaisons finales couvrent aussi les quatre racines.

Défauts corrigés avec preuves : gestionnaire de recherche déclenché dans le mauvais écran, nouvelle mission créée à partir d’un éditeur supprimé, lien Taverne ignoré, filtre du menu impossible à effacer, champ partagé pointant sur l’ancienne fiche, composeur conversationnel superposé aux messages. Les contrôles principaux restent dans les compositions Stitch. Les métadonnées, fichiers, modèles et synchronisations restent natifs. Aucun compte réel, aucune suppression hors fixture, aucune restauration destructive, aucun changement SQL/Supabase/V5 ou déploiement/fusion.

Checkpoint d’implémentation lot 5 : `9ee2d0c536c4bd28861b4cd010c46111300ca7a2`, CI [push — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42608244504) / [PR — succès](https://github.com/PortenartCo/dobby-demo/actions/runs/42608254172). Dernière étape : revue finale de l’ensemble 2B–5, correction des constats importants et validation CI générale sur le SHA final. Ce checkpoint ne déclare pas l’application finalisée.

## Revue finale et qualification générale

La revue indépendante du checkpoint `9ee2d0c` a relevé six problèmes importants, tous reproduits avant correction puis vérifiés dans la même passe, à 320 et 390 px. Treize scénarios dédiés passent (26 contrôles), ainsi que les 54 tests natifs. [Constats, corrections et limites](FINAL-REVIEW.md), [preuves](evidence/review/README.md), [décisions](DECISIONS.md).

La CI est désormais configurée pour exécuter l’ensemble des tests Cuisine/Famille/2B/Maison/Documents/outils, les synchronisations simulées, les contrôles de préservation, la navigation, les comparaisons mobiles et les régressions de la revue. Le résultat général et le SHA exact du commit de livraison seront reportés dans la description de la PR et son onglet [Checks](https://github.com/PortenartCo/dobby-demo/pull/3/checks), sans prétendre qualifier les comptes réels ou une restauration exécutée.

La suite générale locale a terminé avec succès, code de sortie 0 : Cuisine, 2A, quatre lots restants, clients natifs/API simulée, extraction réelle PDF/OCR, préservation et navigation ; les 26 contrôles de revue passent. La génération de 59 fichiers est reproductible octet pour octet. La qualification CI automatique du candidat corrigé est l’étape externe suivante.
