# Preuves E01 — accueil et destinations

Base avant correction : `cc1519b926e6e73cba14ac2659fa5df05d66dadb`. Chromium local, profils éphémères, français belge, fuseau Europe/Brussels, réduction des animations activée. Largeurs de fenêtre : **390 × 900** et **1440 × 900**. Le contenu mobile reste centré à 480 px maximum sur ordinateur.

Aucun compte réel utilisé ; les tests bloquent les connexions externes. Les données de scénario portent TEST et sont uniquement injectées dans les profils temporaires. Les captures de référence affichent les exemples du HTML original, sans les injecter dans le moteur DOBBY.

## Comparaisons

| Vue | Source Stitch 390 / ordinateur | DOBBY 390 / ordinateur |
|---|---|---|
| Accueil original → état vide | [390](source/traverse-390.png) / [1440](source/traverse-1440.png) | [390](empty-390.png) / [1440](empty-1440.png) |
| Accueil original → journée renseignée TEST | mêmes références | [390](populated-390.png) / [1440](populated-1440.png) |
| Bibliothèque des missions | [390](source/missions-390.png) / [1440](source/missions-1440.png) | [390](destination-1-390.png) / [1440](destination-1-1440.png) |
| Taverne | [390](source/taverne-390.png) / [1440](source/taverne-1440.png) | [390](destination-2-390.png) / [1440](destination-2-1440.png) |
| Salon familial | [390](source/famille-390.png) / [1440](source/famille-1440.png) | [390](destination-3-390.png) / [1440](destination-3-1440.png) |
| Menu | [390](source/menu-390.png) / [1440](source/menu-1440.png) | [390](destination-4-390.png) / [1440](destination-4-1440.png) |
| Compte natif, sans maquette Stitch de profil | aucune source correspondante | [390](account-390.png) / [1440](account-1440.png) |

Avant E01 : [accueil 390](before/traverse-390.png), [accueil ordinateur](before/traverse-1440.png). Captures prises avant les modifications, dans le runtime de la base cc1519b.

Vues de fenêtre à l’ouverture : [vide 390](empty-viewport-390.png), [journée TEST 390](populated-viewport-390.png), [vide ordinateur](empty-viewport-1440.png), [journée TEST ordinateur](populated-viewport-1440.png). Les captures longues sont prises au défilement zéro ; les barres y restent ancrées à la première fenêtre de 900 px.

## Différences visuelles significatives

- Les cartes, la frise de Gazette, les surfaces, les bordures, la typographie et les sections de l’accueil proviennent du HTML original. Les anciennes cartes génériques injectées par l’adaptateur ont été retirées.
- Le choix des sept jours, explicitement demandé, réutilise les couleurs/bordures du HTML. Les compteurs incluent les missions terminées. Le V vert valide sans ouvrir la carte.
- Les textes des cartes et leur nombre reflètent les enregistrements présents : les exemples Thomas/Léa/Lasagnes/Gymnastique et les compteurs fictifs ne servent plus de données. Les champs Feu/Difficulté non fournis par le moteur sont explicitement non renseignés.
- L’étoile et le haut-parleur ont des fonctions distinctes ; le personnage ouvre le compte natif. Les effets de clic sont dérivés du CSS original, respectent la réduction des animations et les préférences mémorisées. Le bandeau inférieur original accueille le cinquième onglet et reste visible sur les destinations, y compris le compte.
- Le sceau et ses revendications de sécurité ont été supprimés complètement. L’illustration d’accueil locale déjà utilisée avant E01 est conservée ; pour rendre les références reproductibles hors réseau, les quatre captures sources racines utilisent les mêmes illustrations locales et les polices/CSS locaux. [Empreintes des HTML originaux](source/checks.json).
- Sur ordinateur les sources d’origine occupent parfois toute la largeur. L’application conserve son cadre mobile centré ; aucune maquette de bureau nouvelle n’a été créée.

## Résultats et limites

[Résultats locaux détaillés](results.txt). Les résultats définitifs sont consignés dans [le contrat E01](../../E01-ACCUEIL.md). Les scripts reproductibles sont `essai-stitch-v7/tests/e01.cjs` et `e01-visual.cjs`. Les pages de destination sont vérifiées pour la navigation et les barres, sans redéveloppement de leurs fonctions internes.

Le compte conserve sa vue native. Les missions automatiques ouvrent leur source équipement/document, car une fiche automatique autonome n’existe pas. La Gazette respecte le périmètre de l’Agenda existant : événements et rendez-vous volontairement partagés ; les dossiers médicaux individuels restent locaux dans leur registre. Les repas déjà persistés avant E01 n’ont pas de provenance permettant de distinguer sûrement une ancienne démonstration d’une saisie réelle ; ils sont conservés intégralement.
