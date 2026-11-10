# E02 — Corrections finales et publication d'essai

Base : `859171a4f749960d714155f42242c04a88466b69`. Branche de travail et PR #3 conservées. Publication autorisée uniquement dans un nouveau dossier `essai-e02-preview`, sur la branche `main` déjà servie par GitHub Pages.

## Corrections et recette locale

PASS : commandes ordinaires conservées ; achat de billet ou abonnement sans destination → clarification sans mutation native ; destination Courses explicite → writer natif et résultat persisté vérifiés.

PASS : les quatre destinations internes restent dans le répertoire actif. Paramètres/fragments conservés, y compris liens sous forme de fragment ou de query seuls. Domaines externes, chemins d'autres applications et sous-répertoires refusés. Tests réalisés depuis `/essai-stitch-v7/` et `/essai-e02-preview/`.

PASS : interface E02 à 320/390/1440, voix simulée et historique individuel ; régression E01 à 390/1440 et Missions/Outils à 320/390. [Traces locales](local-results.txt). Un premier lancement d'E01 dans le serveur temporaire ne trouvait pas la fixture `design/stitch-53` ; le montage de cette seule fixture QA a été corrigé, puis le script E01 a réussi sans changement de code applicatif.

## Publication

En attente de la CI du code corrigé, puis de la copie statique et de la recette publique. URL prévue : https://portenartco.github.io/dobby-demo/essai-e02-preview/famille.html#chat

[État public et arbres protégés avant publication](baseline.json). Le nouveau dossier n'existait pas sur `main` au début de la mission. La source Pages était `637619aeda03326435e2397d4b95eee0efb3494d`.

La recette utilise exclusivement un profil Chromium éphémère sans compte connecté et un article explicitement TEST. Reconnaissance/synthèse/clavier sur iPhone physique non validés. Synchronisation individuelle multi-appareils toujours bloquée ; aucune migration, aucun changement Supabase ou de données réelles.
