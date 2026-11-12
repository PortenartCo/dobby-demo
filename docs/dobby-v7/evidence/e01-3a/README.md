# E01.3a — Carte Missions du Jour

Référence avant : `8e510ea85426440036e4b80fdb691cbe9ba0204d`. Comparaisons Chromium à 390 × 900 et 1440 × 900, mêmes profils éphémères et date fixée au 9 novembre 2026. Les captures avant utilisent le `home.js` exact de cette référence ; les captures après utilisent le fichier corrigé. Les vues sont défilées vers les missions pour conserver les barres permanentes sans masquer la carte.

| État | Avant | Après |
| --- | --- | --- |
| Vide, 390 px | [Carte](before/missions-empty-390.png) · [Contexte](before/accueil-empty-390.png) | [Carte](after/missions-empty-390.png) · [Contexte](after/accueil-empty-390.png) |
| Liste, 390 px | [Carte](before/missions-list-390.png) · [Contexte](before/accueil-list-390.png) | [Carte](after/missions-list-390.png) · [Contexte](after/accueil-list-390.png) |
| Vide, 1440 px | [Carte](before/missions-empty-1440.png) · [Contexte](before/accueil-empty-1440.png) | [Carte](after/missions-empty-1440.png) · [Contexte](after/accueil-empty-1440.png) |
| Liste, 1440 px | [Carte](before/missions-list-1440.png) · [Contexte](before/accueil-list-1440.png) | [Carte](after/missions-list-1440.png) · [Contexte](after/accueil-list-1440.png) |

Le titre, le compteur, Ajouter et la liste ou l'état vide sont désormais réunis dans un conteneur. Les classes Stitch existantes reprennent exactement le fond, le rayon, la bordure et l'ombre du Festin, ainsi que les paddings de son en-tête et de son contenu. Les groupes de l'en-tête peuvent passer à la ligne. Le cartouche vide en pointillés reste interne.

Contrôles navigateur : absence de débordement horizontal ; titre, compteurs, boutons et contenu dans la carte ; barres fixes aux bords du viewport ; styles et paddings comparés au Festin ; DOM du Festin, de la Gazette et de la navigation strictement identique avant/après ; aucun changement d'état ou du stockage natif pendant le rafraîchissement de présentation. Détails : [avant](before/checks.json), [après](after/checks.json).

La liste comporte deux enregistrements explicitement TEST, ajoutés seulement en mémoire du profil isolé pour les captures. Aucun compte réel, aucune synchronisation externe ni donnée utilisateur modifiée. Les tests E01 existants vérifient aussi validation, Ajouter, consultation, navigation et préférences dans leurs profils éphémères.

[Résultats](results.txt). Aucun changement des sources Stitch, de la logique métier, des données, du stockage, des routes ou des autres cartes. Aucun déploiement ni fusion. Arrêt après E01.3a.
