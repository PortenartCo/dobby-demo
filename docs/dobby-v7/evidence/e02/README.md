# E02 — Preuves de Parler à Dobby

Base runtime avant modification : `1329487d42439b3215f4c5aa228d1bd483ed9e94`. Référence graphique principale : le HTML original **Stitch 1**, dérivé sans scripts d'exemple et servi avec ses ressources locales dans les captures source. Les données d'exemple de ces seules images de référence ne sont jamais injectées comme données réelles dans DOBBY.

Les captures runtime et tests utilisent des profils Chromium éphémères, le réseau externe bloqué, des fixtures explicitement TEST et les vrais gestionnaires DOBBY. Aucun compte réel ni aucune donnée de production.

| Largeur | Source Stitch 1 | Ancien runtime | Nouveau fil vide | Nouveau fil rempli | Confirmation | Clavier simulé |
| --- | --- | --- | --- | --- | --- | --- |
| 320 px | [Source](source-stitch-1-320.png) | [Avant](before-320.png) | [Vide](empty-320.png) | [Rempli](filled-320.png) | [Valider/Annuler](confirmation-320.png) | [Saisie visible](keyboard-simulated-320.png) |
| 390 px | [Source](source-stitch-1-390.png) | [Avant](before-390.png) | [Vide](empty-390.png) | [Rempli](filled-390.png) | [Valider/Annuler](confirmation-390.png) | [Saisie visible](keyboard-simulated-390.png) |
| 1440 px | [Source](source-stitch-1-1440.png) | [Avant](before-1440.png) | [Vide](empty-1440.png) | [Rempli](filled-1440.png) | [Valider/Annuler](confirmation-1440.png) | [Saisie visible](keyboard-simulated-1440.png) |

États vocaux **avec API simulée**, ne représentant pas une écoute matérielle réelle : [écoute](listening-simulated-390.png), [transcription](transcription-simulated-390.png), [permission refusée](permission-denied-simulated-390.png). [Fil connecté conservé localement](authenticated-local-history-390.png), avec identité de test et véritable IndexedDB natif.

## Comparaison visuelle et écarts

- Illustration originale, cadres, classes exactes des bulles et carte de confirmation Stitch 1 conservés. Les tests comparent effectivement les classes des bulles au document source.
- Changements demandés : hero 220 → 140 px avec cadrage du visage/buste, badge privé déplacé, accueil/signature/encart technique et suggestions retirés, conversation remontée. Aucune nouvelle illustration.
- Header et cinq destinations E01 conservés ; à 1440 px, la colonne reste centrée et limitée à 480 px comme E01, alors que le document source autonome utilise sa largeur disponible. Le composer fait partie de la zone fixe commune, hors de l'animation d'entrée du contenu.
- Micro/Envoyer mesurés à 44 × 44 px. Aucun débordement horizontal ni recouvrement de la saisie dans les tailles testées. La simulation supplémentaire d'un clavier superposé vérifie `visualViewport` en conservant un viewport de mise en page de 900 px, y compris le dernier message au-dessus de la saisie.
- Aucun écart visuel non résolu identifié dans ce périmètre Chromium. Le comportement réel du clavier et des zones de sécurité Safari iOS reste à vérifier sur iPhone.

## Diff et commits

[Diff du code depuis la référence](code.diff) : `247b72e` (interface, actions natives, voix, historique et tests), puis `c38c31a` (lecture des confirmations vocales et du résultat réel) et `72a358b` (consultation de la liste de courses validée) et `5ae1244` (dernier message visible avec le clavier). La documentation et les preuves sont livrées dans le commit final de la PR #3.

## Vérifications

- `tests/e02.cjs` : interface 320/390/1440, source réelle, vide/rempli, entrée écrite, action native et absence de doublon, inconnu, confirmation/annulation/suppression, liens et clavier réduit.
- `tests/e02-edge.cjs` : frontières de parsing, refus d'une destination ambiguë, lectures/liaisons réelles repas/agenda/équipements/documents, absence de fiche médicale privée dans Agenda, confirmation périmée, writer sans effet, sauvegarde native refusée sans fausse confirmation ni ajout laissé en mémoire, préservation d'une liste validée dans son historique, effets E01 et clavier superposé.
- `tests/e02-voice-history.cjs` : API vocale standard et préfixée simulée, transcription, résultat final unique et callback tardif, annulation, arrêt, refus, silence et démarrage en erreur ; Son OFF/ON, écrit sans lecture automatique, synthèse française/réécoute/interruption ; conservation au-delà de 24 échanges, rechargement, suppression, identités A/B dans le même foyer, brouillon hors chat et reprise de page en cache sans fuite.
- Régressions Missions/Outils, E01 et chaîne navigateur existante avec `CHROMIUM_PATH=/usr/bin/chromium`. Les API vocales et les identités sont simulées à leurs frontières ; les fonctionnalités de l'application, writers et stockage natif restent réels dans les profils de test.

[Contrat, diagnostic d'accès et blocage de synchronisation individuelle](../../E02-PARLER-A-DOBBY.md). Les tests d'identité locale ne prouvent pas une RLS serveur : aucune structure distante privée n'est créée ni utilisée. L'ancien historique sans auteur reste intact et n'est pas attribué à un utilisateur. Aucune synchronisation multi-appareils annoncée.

[Fichiers modifiés](files-changed.txt) · [Chaîne navigateur](browser-tests.txt) · [Tests natifs](native-tests.txt) · [Résultats et incidents de recette](results.txt) · [Détails voix/historique](voice-history-results.json).

Pas de fusion, de déploiement, de service payant ou de migration. Les essais microphone/synthèse/clavier et la recette Safari iOS sur un iPhone physique restent à réaliser.
