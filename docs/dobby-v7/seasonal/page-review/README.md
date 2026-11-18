# DOBBY — Décors événementiels sur les six rubriques

Base : `6c7cf97ca197f3f7ab237254923222ff723d1589`. Source : `06798cb7f09ed048045e5a180ad93babf0bf9618`. [PR #26](https://github.com/PortenartCo/dobby-demo/pull/26), conservée en brouillon.

[Aperçu interactif indépendant](https://portenartco.github.io/dobby-demo/essai-dobby-v7-seasonal-pages-06798cb7f09e/) — ouvrir « Revue des saisons », choisir une fête puis refermer le volet. Parcourir Accueil, Tâches, Repas, Courses, Famille et Menu : la date de revue reste identique entre les pages, sans changer l’horloge ni les dates métier.

L’accueil conserve exactement sa composition. Les autres rubriques reçoivent un titre festif et, lorsqu’elle existe, un accent sur les bords de leur illustration d’origine. Courses utilise son panneau de registre et une frise inférieure ; Menu utilise un titre composé, sans illustration ajoutée. Les vues de premier niveau réutilisent ces hôtes. Formulaires, détails, historique d’un équipement et dialogues gardent seulement l’identité du header global.

Les mêmes SVG, palettes, calendrier et préférences sont réutilisés. Aucun nouveau moteur, stockage, appel réseau, actif externe ou changement Supabase. Les images et les dimensions fixes du header/dock sont conservées.

## Captures comparatives

36 paires avant/après : trois événements × six rubriques × deux largeurs. Effets et sons OFF, décorations ON. Les étiquettes du thème sont masquées : les motifs doivent suffire à identifier l’événement. Profils jetables, données locales déclarées et connexions externes bloquées.

### Noël

| Rubrique | 390 px | 1440 px |
| --- | --- | --- |
| Accueil | [Avant](before-christmas-home-390.png) · [Après](after-christmas-home-390.png) | [Avant](before-christmas-home-1440.png) · [Après](after-christmas-home-1440.png) |
| Tâches | [Avant](before-christmas-missions-390.png) · [Après](after-christmas-missions-390.png) | [Avant](before-christmas-missions-1440.png) · [Après](after-christmas-missions-1440.png) |
| Repas | [Avant](before-christmas-meals-390.png) · [Après](after-christmas-meals-390.png) | [Avant](before-christmas-meals-1440.png) · [Après](after-christmas-meals-1440.png) |
| Courses | [Avant](before-christmas-shopping-390.png) · [Après](after-christmas-shopping-390.png) | [Avant](before-christmas-shopping-1440.png) · [Après](after-christmas-shopping-1440.png) |
| Famille | [Avant](before-christmas-family-390.png) · [Après](after-christmas-family-390.png) | [Avant](before-christmas-family-1440.png) · [Après](after-christmas-family-1440.png) |
| Menu | [Avant](before-christmas-menu-390.png) · [Après](after-christmas-menu-390.png) | [Avant](before-christmas-menu-1440.png) · [Après](after-christmas-menu-1440.png) |

### Halloween

| Rubrique | 390 px | 1440 px |
| --- | --- | --- |
| Accueil | [Avant](before-halloween-home-390.png) · [Après](after-halloween-home-390.png) | [Avant](before-halloween-home-1440.png) · [Après](after-halloween-home-1440.png) |
| Tâches | [Avant](before-halloween-missions-390.png) · [Après](after-halloween-missions-390.png) | [Avant](before-halloween-missions-1440.png) · [Après](after-halloween-missions-1440.png) |
| Repas | [Avant](before-halloween-meals-390.png) · [Après](after-halloween-meals-390.png) | [Avant](before-halloween-meals-1440.png) · [Après](after-halloween-meals-1440.png) |
| Courses | [Avant](before-halloween-shopping-390.png) · [Après](after-halloween-shopping-390.png) | [Avant](before-halloween-shopping-1440.png) · [Après](after-halloween-shopping-1440.png) |
| Famille | [Avant](before-halloween-family-390.png) · [Après](after-halloween-family-390.png) | [Avant](before-halloween-family-1440.png) · [Après](after-halloween-family-1440.png) |
| Menu | [Avant](before-halloween-menu-390.png) · [Après](after-halloween-menu-390.png) | [Avant](before-halloween-menu-1440.png) · [Après](after-halloween-menu-1440.png) |

### Nouvel An

| Rubrique | 390 px | 1440 px |
| --- | --- | --- |
| Accueil | [Avant](before-new-year-home-390.png) · [Après](after-new-year-home-390.png) | [Avant](before-new-year-home-1440.png) · [Après](after-new-year-home-1440.png) |
| Tâches | [Avant](before-new-year-missions-390.png) · [Après](after-new-year-missions-390.png) | [Avant](before-new-year-missions-1440.png) · [Après](after-new-year-missions-1440.png) |
| Repas | [Avant](before-new-year-meals-390.png) · [Après](after-new-year-meals-390.png) | [Avant](before-new-year-meals-1440.png) · [Après](after-new-year-meals-1440.png) |
| Courses | [Avant](before-new-year-shopping-390.png) · [Après](after-new-year-shopping-390.png) | [Avant](before-new-year-shopping-1440.png) · [Après](after-new-year-shopping-1440.png) |
| Famille | [Avant](before-new-year-family-390.png) · [Après](after-new-year-family-390.png) | [Avant](before-new-year-family-1440.png) · [Après](after-new-year-family-1440.png) |
| Menu | [Avant](before-new-year-menu-390.png) · [Après](after-new-year-menu-390.png) | [Avant](before-new-year-menu-1440.png) · [Après](after-new-year-menu-1440.png) |

## Vérifications

- `node --test essai-stitch-v7/tests/fam-integration-transverse.test.cjs` : 14/14, empreintes historiques strictes.
- `npm run test:seasonal --prefix essai-stitch-v7/tests` : sept tests calendaires, parcours natifs, revue et contrôles visuels ; complété par les régressions de contre-revue ci-dessous.
- `node essai-stitch-v7/tests/seasonal-pages.cjs` : 72 combinaisons, quatre largeurs (320/390/768/1440), puis vues de premier niveau, formulaires, recette détaillée, modale d’agenda, fiches et historique d’équipement, recherche Menu, attributs de route obsolètes, OFF/nettoyage, persistance, réduction des animations et rafraîchissement hors ligne. [Résultats](results.json).
- Les six zones de décor événementiel de l’accueil restent identiques à la base (quatre captures complètes identiques ; deux captures mobiles diffèrent uniquement sur cinq pixels de hauteur de l’ombre du sélecteur de date, sous le décor) : [empreintes](home-comparison.json). Les huit captures des quatre saisons sont aussi identiques : [empreintes](seasons-comparison.json).
- Chaque page garde zéro animation saisonnière avec Effets OFF ; la population SVG reste inférieure à 420 éléments. Les calques ne reçoivent aucun clic. Les décorations se retirent entièrement avec leur préférence native.
- Génération stricte `build-source.cjs` + Tailwind sans écart sur les fichiers dérivés. Constructeur, calendrier, préférences et 11 manifestes historiques inchangés.
- `npm test --prefix essai-stitch-v7/tests` : réussite, code de sortie 0, `E07_P01_P02_TARGETED_CI_PASS`. Les CI du HEAD final et leurs liens sont consignés dans la PR, pour éviter de déclencher un nouveau run uniquement en ajoutant son résultat dans Git.
- Aperçu commité : 353 ressources vérifiées et parcours des six rubriques réussi ; date fictive partagée, horloges réelles inchangées. La vérification publique et le SHA de publication sont consignés dans la PR.

## Contre-revue et corrections vérifiées

Une contre-revue indépendante a examiné les 36 captures après et le code. Elle a identifié deux défauts, reproduits avant correction : les légendes d’illustration pouvaient passer sous les ornements ; du texte décoratif masqué s’ajoutait au `textContent` des titres. Les légendes natives passent maintenant au-dessus du décor et les nouveaux ornements ne contiennent que des SVG. Les assertions permanentes vérifient ces deux propriétés. Les fiches Équipement et Historique ont aussi été retirées de la liste des vues principales et testées avec un équipement local fictif. Les journaux rouge/vert sont conservés dans [logs/](logs/).

La première campagne standard locale a échoué dans `contacts-v7.cjs` avec `ERR_CONNECTION_REFUSED` : ce test utilisait son URL par défaut sur 8765 tandis que le checkout était servi sur 8766. Le même checkout a ensuite été servi sur le port canonique ; aucun test ni contrôle n’a été assoupli. Le journal de cette première tentative est conservé, distinct de la campagne finale.

Décisions d’exécution : conserver le constructeur et les contrôles de prévisualisation existants, en renforçant leur parcours sur les six destinations ; conserver les trois worktrees et les exports de récupération. Publication limitée à un nouveau dossier d’aperçu sur main, sans remplacement de l’application ni fusion de la PR.

Vérification Chromium Linux. Recette physique Safari/iPhone non réalisée. Validation artistique finale réservée au propriétaire.


Publication additive du dossier d’aperçu : `424ae01815b7392dff1b3e5da9c51f4a734b4140`. Aucun fichier applicatif principal remplacé.
