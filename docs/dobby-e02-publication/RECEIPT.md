# E02 — Corrections finales et publication d'essai

**Recette hébergée : PASS.** URL vérifiée : https://portenartco.github.io/dobby-demo/essai-e02-preview/famille.html#chat

Base : `859171a4f749960d714155f42242c04a88466b69`. Branche de travail `feat/dobby-stitch-53-source-backed-v7` et PR #3 conservées. Publication autorisée exclusivement dans le nouveau dossier `essai-e02-preview`, sur la branche `main` déjà servie par GitHub Pages.

## Corrections et recette locale

**PASS — commandes prudentes.** Commandes ordinaires conservées ; achat indéfini « un/une… », de billet ou d’abonnement sans destination → clarification sans mutation native ; destination Courses explicite → writer natif et résultat persisté vérifiés. Commits applicatifs `be5336b3cbb550e603142ab20808fc62495bcd72` et `258b0f923491b03d78c72ba1b1edd29ab72e6a84`.

**PASS — liens internes.** Les quatre destinations restent dans le répertoire actif. Paramètres/fragments conservés, y compris liens sous forme de fragment ou de query seuls. Domaines externes, chemins d'autres applications et sous-répertoires refusés. Tests réalisés depuis `/essai-stitch-v7/` et `/essai-e02-preview/`.

PASS : interface E02 à 320/390/1440, voix simulée et historique individuel ; régression E01 à 390/1440 et Missions/Outils à 320/390. [Traces locales](local-results.txt). Un premier lancement d'E01 dans le serveur temporaire ne trouvait pas la fixture `design/stitch-53` ; le montage de cette seule fixture QA a été corrigé, puis le script E01 a réussi sans changement de code applicatif.

Un incident CI indépendant des deux fonctions corrigées a touché la mesure immédiate d'alignement du profil dans l'ancien test E01 : [trace](e01-ci-incident.txt), exécution `42727070298`. La même révision `258b0f9` a réussi l'autre CI (`42727078167`), et E01 a réussi localement. Le commit `6c667cebc5f786e5c99c64b8d20008638891c849` attend deux frames de rendu avant la mesure, conserve toutes les assertions/tolérances et ajoute les coordonnées au diagnostic. [Vérification ciblée après stabilisation](e01-stable-results.txt). Aucun composant applicatif E01 modifié.

## CI et publication effective

Source publiée : **`6c667cebc5f786e5c99c64b8d20008638891c849`**, après succès des deux CI exactes : [PR 42728320972](https://github.com/PortenartCo/dobby-demo/actions/runs/42728320972) et [push 42728313284](https://github.com/PortenartCo/dobby-demo/actions/runs/42728313284). Chacune exécute 54 tests natifs, les 32 scripts navigateur existants, la syntaxe et la reproductibilité des sources.

Commit statique sur `main` : **`0708d643d099999713e1538eb5043097ac591e6b`**, parent unique `637619aeda03326435e2397d4b95eee0efb3494d`. Ajout des 212 fichiers de `essai-e02-preview` uniquement ; son arbre `bb4802d5ac1cfb4adde60a79533ebaf1cf9d24db` est identique au dossier source validé. Tous les anciens éléments de racine sont inchangés. Aucune fusion ou reprise de l'ensemble de la PR. [Plan et preuves Git](deployment.json).

GitHub Pages : **built / success** au commit de publication, [exécution 42729533539](https://github.com/PortenartCo/dobby-demo/actions/runs/42729533539). Configuration existante `legacy`, `main`, `/` conservée, aucune nouvelle infrastructure ni workflow. Le fichier `index.html` reste la Taverne ; l'entrée directe Dobby est `famille.html#chat`.

La dernière évolution du script de recette attend l'image courante réellement chargée, clique chacune des cinq destinations et vérifie les octets servis via le transport Chromium. Elle ne change aucun fichier applicatif publié et ne nécessite aucune republication. Les incidents de test et leurs corrections causales sont consignés [ici](hosted-test-incidents.txt).

## Recette réelle sur GitHub Pages

[Résultat structuré](hosted/receipt.json) · [sortie du script](hosted/results.txt).

- Page accessible, header unique et section correcte, hero Stitch 1 chargé (140 px), aucune erreur JavaScript ni ressource locale HTTP >=400 ; aucun débordement à 390 px.
- Saisie/réponses : ajout « lait TEST E02 hébergé » par le moteur natif, présence dans son état et dans sa représentation persistée, puis dans la vraie page Courses.
- « Acheter un billet de train » et « Acheter un abonnement téléphonique » : clarification et invariance stricte de l'état métier ainsi que de son stockage.
- Liens réellement cliqués vers Courses, Missions et Agenda dans le nouveau préfixe, puis retour réel via Traverse vers Dobby.
- Cinq destinations réellement cliquées : Traverse, Missions, Taverne, Famille (`#salon`), Menu (`#menu`), avec header/navigation permanents et retour Dobby après chacune.
- `chat.js`, `chat-engine.js`, `chrome.js`, `chrome.css` : HTTP 200 et empreintes identiques aux fichiers du SHA source publié.

Captures hébergées : [conversation vide](hosted/hosted-chat-empty-390.png), [clarification sans écriture](hosted/hosted-clarification-390.png), [article TEST dans les courses natives](hosted/hosted-native-courses-390.png).

Profil Chromium éphémère sans identité ni compte réel (`getContext() === null`). Les seules données créées sont locales et explicitement TEST ; le profil a été fermé après la recette. Les requêtes hors de l'origine du projet sont volontairement bloquées dans cette recette automatisée ; leur disponibilité externe n'est pas revendiquée.

## Préservation et limites

**PASS — E01, V5 et autres fichiers publiés préservés.** [État avant](baseline.json) et [preuve après](preservation.json) : les huit URL de contrôle ont les mêmes statuts, tailles et SHA256. Tous les arbres/fichiers préexistants de la racine Git sont strictement identiques, dont les dossiers E01, V5 et V6 complets. URL E01 inchangée : https://portenartco.github.io/dobby-demo/essai-e01-preview/traverse.html

Reconnaissance/synthèse/clavier Safari iOS sur iPhone physique non validés. Synchronisation individuelle multi-appareils toujours bloquée faute de persistance privée distante validée. Aucun changement Supabase/SQL, aucune donnée réelle consultée ou modifiée, aucun service payant ajouté. PR #3 ouverte, non fusionnée ; arrêt après cette mission.
