# C — Dictée avec pause stable, 11 novembre 2026

## Défaut reproduit et cause

Sur le point de départ, `listen().onresult` recopiait les résultats dans le brouillon et ne programmait aucun envoi. Le test ajouté avant l’implémentation a retenu une transcription provisoire pendant cinq secondes puis une transcription finale pendant trois secondes : **0 échange au lieu de 1**, échec attendu conservé dans [red-results.json](red-results.json). La capture [avant](before-countdown-390.png) montre le brouillon sans décompte.

## Correction locale

`chat.js` conserve `send()` → `DobbyRegister.lock` → `DobbyChatEngine.reply` → historique natif et les confirmations existantes. Un résultat dont tous les segments sont finaux lance désormais une pause de 3 s avec décompte visible et bouton Continuer. Les choix 1,5 / 2 / 3 / 4 / 5 s règlent ce délai pour l’onglet ; aucune persistance ou synchronisation supplémentaire n’est créée.

La reprise de parole, les segments provisoires et toute correction manuelle annulent le délai. Continuer suspend l’envoi jusqu’à une nouvelle parole ou une nouvelle transcription, et un résultat final dupliqué ne réarme pas ce délai. Envoyer reste immédiat pour le texte finalisé ou revu à la main. Une transcription provisoire, y compris le préfixe provisoire d’une session interrompue puis reprise, reste bloquée jusqu’à sa finalisation ou sa révision manuelle.

`clearAutoSend`, `scheduleAutoSend`, `releaseRecognition`, les gardes d’identité/génération/session et les contrôles existants invalident le décompte et les anciens callbacks lors d’un arrêt, d’une erreur, du masquage, d’une navigation, d’une annulation ou d’un changement de compte. Aucun redémarrage automatique n’a été ajouté. Le texte interrompu reste un brouillon. La correction manuelle conserve les commandes natives Reprendre/Annuler et ne peut pas être écrasée par un retour vocal tardif.

`chat.css` ajoute uniquement la présentation du décompte et du réglage de délai. La préférence Son, la lecture française, la réécoute, l’interruption sonore et les confirmations des actions sensibles utilisent les chemins existants.

## Vérifications exécutées

Toutes les commandes ont utilisé `DOBBY_TEST_ORIGIN=http://127.0.0.1:8891`, un profil Chromium temporaire, le DOM et les writers natifs réels. Seules les API de reconnaissance/synthèse indisponibles en CI et la sortie d’identité native sont simulées. Les requêtes externes sont bloquées.

| Commande ciblée | Résultat réel |
| --- | --- |
| `node --check essai-stitch-v7/chat.js` | PASS |
| `node --check essai-stitch-v7/tests/review-voice-20261111.cjs` | PASS |
| `node essai-stitch-v7/tests/review-voice-20261111.cjs` | PASS, 17 scénarios causaux ; [résultats détaillés](results.json) |
| `node essai-stitch-v7/tests/e02-voice-history.cjs` | PASS ; [résultats](legacy-history/voice-history-results.json) |
| `node essai-stitch-v7/tests/e02-consolidation.cjs` | PASS à 390, 320 et 1440 px ; [résultats](legacy-consolidation/results.json) |

Le test causal utilise une horloge Playwright arrêtée entre chaque avance explicite : aucun envoi à 2 999 ms, un envoi à 3 001 ms ; idem de part et d’autre de 1,5 et 5 secondes. Il vérifie plusieurs segments, pauses et reprises, Continuer, Annuler, Envoyer immédiat, correction manuelle, préfixe interrompu, anciens callbacks, erreurs microphone, arrêt naturel, masquage, cache de page, navigation, changement de compte, mode manuel sans API, Son OFF/ON, lecture/interruption/réécoute, confirmation sensible et persistance IndexedDB après rechargement. Aucun événement d’erreur JavaScript n’a été observé. La campagne générale unique reste à l’orchestrateur du lot.

La non-régression ciblée a d’abord révélé la disparition de la commande Annuler après correction manuelle ; ce comportement a été corrigé avant les passages PASS ci-dessus. Une lecture indépendante du diff vocal par l’agent conversationnel n’a relevé aucun défaut supplémentaire de garde ou de minuterie.

## Captures et limites

- [Décompte après correction, 390 px](after-countdown-390.png).
- Décompte et commandes contenus dans le viewport à [320 px](countdown-320.png), [390 px](countdown-390.png) et [1440 px](countdown-1440.png).

Les essais valident le contrat des événements navigateur simulés ; ils ne valident pas le microphone, les autorisations, les voix installées ou la stabilité réelle de Safari/iOS. « Finalisé » désigne le statut `SpeechRecognitionResult.isFinal` de chaque segment ; la complétude sémantique générale d’une phrase n’est pas garantie par une reconnaissance vocale. Le délai est réinitialisé à 3 s au rechargement. Aucun service payant, appel IA, compte familial réel, déploiement, publication, commit ou fusion dans ce sous-lot.
