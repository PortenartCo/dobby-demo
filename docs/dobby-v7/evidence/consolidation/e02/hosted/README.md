# E02 — Recette hébergée du 11 novembre 2026

[Parler à Dobby réellement testé](https://portenartco.github.io/dobby-demo/essai-dobby-integrated-review/essai-stitch-v7/famille.html#chat), bundle source `ff7684704f282b239633284e993348ae8094393f`.

`e02-consolidation.cjs` a terminé avec **exitCode 0**, le 11 novembre 2026 de **00:19:09 à 00:19:35 UTC** : PASS **390, 320 et 1440 px**. [Journal](execution.log), [exécution horodatée](execution.json), [résultats structurés](results.json).

- Hero décodé, absence de débordement et saisie au-dessus du dock : PASS aux trois largeurs ; captures `after-*.png` et `keyboard-simulated-*.png`.
- Dictée multisegments sans autosend, arrêt, reprise, annulation, interruptions, callbacks tardifs, correction manuelle, navigation, changement d'identité et préférence Son : PASS avec **frontières SpeechRecognition/speechSynthesis et identité native simulées**.
- Ajout Courses via writer natif, stockage, doublon, lien vers l'unique liste E07 et rechargement, liens Missions/Agenda/Document canonique : PASS sur l'application hébergée, dans un profil navigateur éphémère.

La lecture du stockage physique confirme l'article ajouté dans `dobby-review-integrated-v1|dobby-v5-familial-preview-20261108` et la base IndexedDB `dobby-review-integrated-v1|dobby-v5-household-preview-v2`. Ces contrôles concernent le stockage local isolé de la démonstration ; aucun compte ou partage serveur réel n'est utilisé.

Safari/iPhone physique, permissions matérielles, voix installées et reconnaissance effective restent **non vérifiés**. Les captures de clavier utilisent uniquement un viewport réduit.
