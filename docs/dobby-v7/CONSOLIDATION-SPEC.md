# CODEX — DOBBY : CONSOLIDATION EXHAUSTIVE DES CORRECTIONS E01–E08

**MODE : EXÉCUTION — PRIORITÉ HAUTE — CONFORMITÉ STRICTE AUX DÉCISIONS UTILISATEUR**

## 1. Objectif impératif

Appliquer l'ensemble des corrections validées lors de la revue utilisateur DOBBY E01–E08.

**Aucune demande validée ne doit être oubliée, modifiée, simplifiée arbitrairement ou remplacée par une interprétation de Codex.**

Il ne s'agit pas de réinventer DOBBY ni de créer une nouvelle architecture.

Les objectifs sont :

1. Respecter toutes les décisions de la revue.
2. Corriger les anomalies graphiques et fonctionnelles.
3. Terminer les fonctionnalités explicitement demandées dans le périmètre de consolidation.
4. Préserver les fonctionnalités déjà opérationnelles.
5. Maintenir l'intégration E01–E08.
6. Livrer une application interactive cohérente pour la prochaine revue.

**INTERDICTION : déclarer la mission terminée alors qu'une exigence a été silencieusement ignorée.**

## 2. Référentiel obligatoire

Dépôt : `PortenartCo/dobby-demo`

Branche de travail :
`feat/dobby-e01-e08-review-integration`

Dernier commit documentaire vérifié :
`a84f67acf8f5cbfd59475c2137ec70e1a20732f7`

Lire intégralement et en priorité :

`docs/dobby-v7/REVIEW-CONSOLIDATION.md`

Lire également :

- `docs/dobby-v7/INTEGRATED-REVIEW.md`
- `docs/dobby-v7/E07-TAVERNE-COURSES.md`
- Les spécifications propres à E01–E08 lorsqu'elles concernent une correction.
- Les éventuels `AGENTS.md` applicables, s'ils existent réellement.

Le registre `REVIEW-CONSOLIDATION.md` est **le référentiel de conformité utilisateur**.

En cas de conflit entre une ancienne spécification et une décision plus récente de ce registre, la décision utilisateur récente prévaut, sous réserve des limites légales, de sécurité et d'intégrité.

Ne jamais considérer qu'une ancienne CI verte annule une demande de correction.

Ne jamais considérer qu'une interface est validée au seul motif qu'elle est intégrée.

## 3. GATE 0 — Inventaire obligatoire avant modification

Avant d'écrire du code, produire une matrice exhaustive reprenant **chaque ligne et chaque identifiant du registre**.

Pour chaque exigence, renseigner :

| Champ | Contenu obligatoire |
|---|---|
| ID | Référence exacte du registre |
| Demande | Résumé fidèle de la décision utilisateur |
| État initial | Déjà conforme / à corriger / à développer / à vérifier / reporté / bloqué |
| Code concerné | Fichiers et fonctions identifiés |
| Action | Modification concrète ou justification documentée |
| Vérification | Test ou preuve attendue |
| État final | Vérifié / non vérifié / bloqué / reporté |

Ne supprimer aucune ligne.

Ne fusionner deux exigences que lorsque leur réalisation technique est commune, en conservant leurs deux identifiants et leurs critères de vérification.

Ne pas transformer un point « À DÉVELOPPER » en « VALIDÉ » parce qu'un bouton est devenu cliquable.

Les points déjà intégrés restent présents dans la matrice avec leur preuve de non-régression.

Les points explicitement réservés aux prochains chantiers restent visibles, avec le statut `REPORTÉ — AUTORISÉ`, sans être implémentés prématurément.

**Critère d'arrêt GATE 0 : aucune exigence du registre ne manque dans la matrice.**

## 4. GATE 1 — Corrections de l'Accueil E01

Traiter les points `E01-01` à `E01-06`.

Vérifier impérativement :

- Harmonisation des trois cartes lorsqu'elles sont vides, sur le modèle du « Festin du Soir », sans encadré pointillé.
- Mission ouverte : case vide, aucune coche trompeuse.
- Confirmation avant de terminer une mission.
- Possibilité de rouvrir une mission terminée.
- Statut persistant, cohérent avec la Bibliothèque des Missions.
- Aucun crédit de runes en double lors d'une réouverture puis d'une nouvelle complétion.
- Gestion correcte des missions automatiques selon leur source.
- Présence d'une photographie ou d'un visuel de repli du plat prévu.
- Présentation **Midi ET Soir** sur l'accueil, indépendamment.
- Accès à la fiche de la recette correspondante.
- Ajout rapide d'un article aux courses, sans passer par Dobby ni la Taverne.
- Réutilisation de l'unique liste de courses familiale E07.

Ne créer ni second moteur de repas ni second registre de courses.

## 5. GATE 2 — Parler à Dobby E02

Traiter `E02-01` à `E02-03`.

### Présentation

Dobby doit occuper une place visuelle prédominante sur sa page.

Corriger le hero actuellement trop petit. Dobby doit être largement visible, dans une composition immersive, sans coupure disgracieuse du personnage.

Préserver l'espace nécessaire aux messages et au champ de saisie.

### Dictée vocale

Le comportement actuel est insatisfaisant : une pause très courte peut terminer l'écoute et provoquer l'envoi immédiat.

Le comportement attendu est :

- Une session de dictée pouvant recueillir plusieurs phrases.
- Tolérance aux pauses naturelles dans les limites du navigateur.
- Transcription progressive conservée.
- **Aucun envoi automatique au premier segment reconnu.**
- Envoi uniquement après action explicite de l'utilisateur.
- Actions claires : arrêter, reprendre si possible, annuler, envoyer.
- Aucun message partiel envoyé après interruption involontaire.
- Aucune perte silencieuse du texte déjà reconnu.

Ne pas supposer que `continuous=true` suffit : gérer les événements de fin, erreurs, reprises autorisées et annulations.

Respecter les restrictions des navigateurs, notamment Safari/iOS, et documenter ce qui ne peut pas être garanti sans essai physique.

Vérifier les commandes conversationnelles natives existantes sans inventer des capacités d'IA non raccordées.

## 6. GATE 3 — Missions E03 et Nouvelle Mission E04

### E03 — Page protégée

**La Bibliothèque des Missions E03 a été explicitement validée par l'utilisateur.**

Ne pas la redessiner.

Conserver son hero, le cartouche « Grimoire des Missions » en bas à droite, ses filtres et ses cartes.

Seules les adaptations nécessaires aux interactions transversales avec E01/E04 sont autorisées.

### E04 — Formulaire Nouvelle Mission

Traiter `E04-01` à `E04-04`.

- Supprimer les quatre propositions prédéfinies de missions.
- Conserver la saisie libre, les consignes, les catégories et les membres.
- Corriger le dock : **Missions**, pas Famille, doit être actif.
- Corriger Retour et Fermer.
- Préserver les avatars associés aux profils réels des membres.
- Rendre les récurrences réellement utilisables.

Options de récurrence :

- Unique.
- Quotidienne.
- Hebdomadaire, avec choix des jours.
- Mensuelle, avec jour de répétition défini.

Exiger un véritable modèle d'occurrences :

- Une occurrence terminée n'annule pas les suivantes.
- Historique de réalisation cohérent.
- Attribution maintenue.
- Modification ou arrêt de la série.
- Idempotence des récompenses par occurrence.
- Aucune duplication de missions lors d'un rechargement ou d'une synchronisation.

Si le moteur natif ne permet pas une récurrence correcte sans évolution majeure, documenter exactement la dépendance bloquante. Ne pas livrer une simple activation cosmétique.

## 7. GATE 4 — Profil magique E05

Traiter `E05-01` à `E05-05`.

### Blasons des Maisons

L'utilisateur a explicitement choisi les **blasons officiels des quatre Maisons**, pas des pictogrammes génériques.

Respecter ce choix. Ne pas le substituer silencieusement par un nouveau blason stylisé.

Vérifier les droits et la provenance des ressources avant toute incorporation dans la démonstration GitHub Pages publique.

Si les ressources officielles ne peuvent pas être publiées légalement, distinguer clairement la version privée et la démonstration publique. Signaler le point encore bloqué, sans présenter une imitation comme conforme.

### Descriptions des Maisons et des Patronus

Ajouter les contenus demandés :

- Origine et fondateur de chacune des quatre Maisons.
- Valeurs et caractéristiques principales.
- Présentation des douze Patronus.
- Symbolique et caractéristiques de chaque animal.

Textes courts, lisibles, sans longs paragraphes italiques.

Créer une source de contenu cohérente partagée par E05 et E06.

### Runes & progression

Refondre la présentation :

- Rune ou insigne réellement illustré.
- Grade actuel mieux mis en évidence.
- Total de runes clairement visible.
- Jauge de progression plus qualitative.
- Prochain palier.
- Historique des gains lisible et valorisant.

Préserver intégralement les montants, grades, seuils et règles natives.

### Tests de découverte

Préserver le raccordement déjà réalisé entre « Refaire le test » et les questionnaires E06.

L'ancien résultat reste en vigueur tant que le nouveau n'a pas été confirmé.

## 8. GATE 5 — Première connexion E06

Traiter `E06-01` à `E06-08`.

### Rituel de la Cheminée

La revue a identifié une maquette Stitch supplémentaire, fournie dans une archive nommée :

`stitch_dobby_assistant_mobile_app (9).zip`

Vérifier d'abord si cette source est accessible dans l'environnement de travail ou a déjà été importée dans le dépôt.

Ne pas prétendre avoir exploité une archive introuvable.

Rétablir la séquence d'introduction prévue :

**Rituel de la Cheminée → Traverser la cheminée → Mon foyer magique → Identité → Maison → Patronus → Identité finale.**

Préserver la possibilité de passer l'introduction et le choix « Ne plus afficher ».

Les médias extérieurs manquants doivent être signalés précisément et ne doivent pas être remplacés par de faux assets prétendument originaux.

### Mode de revue complet

La démonstration actuelle ne permet pas de tester normalement la première connexion.

Permettre un parcours **fictif de bout en bout**, avec création locale d'un membre de démonstration, sans connexion réelle ni écriture dans Supabase.

Ne pas présenter ce parcours comme une inscription serveur effective.

### Questionnaire Maison

- Rétablir une illustration de Choixpeau exploitable.
- Supprimer le texte technique « Illustration indisponible » du rendu final.
- Supprimer la répétition de la numérotation des questions.
- Remplacer les longs textes italiques par une typographie lisible.

### Résultat Maison

- Supprimer le défaut de bande verticale noire.
- Corriger les titres tronqués, notamment SERDAIGLE.
- Afficher un grand blason.
- Présenter l'origine, le fondateur et les caractéristiques de la Maison.
- Conserver la confirmation explicite du résultat.

### Résultat Patronus

- Conserver les grandes illustrations existantes.
- Ajouter les caractéristiques et la symbolique de chacun des douze animaux.
- Supprimer les messages techniques qui nuisent à la présentation narrative.
- Partager exactement les mêmes descriptions qu'en E05.

### Identité finale

Vérifier avatar, Maison, Patronus, runes et bouton d'entrée dans l'application.

Les véritables opérations de création de compte, foyer partagé, invitations et autorisations parentales restent **hors périmètre de cette consolidation sans autorisation serveur distincte**.

## 9. GATE 6 — Taverne et Courses E07

Traiter les corrections E07 sur les interfaces déjà reconstruites, sans anticiper la refonte E07.3.

### À corriger maintenant

- Sélection d'une date de fin lors de l'import des ingrédients des menus.
- Date de début aujourd'hui par défaut, modifiable.
- Raccourcis 3, 7, 14 jours et date personnalisée.
- Repas Midi et Soir concernés, bornes incluses.
- Aperçu des ingrédients avant import.
- Confirmation et déduplication.
- Préservation des quantités et achats manuels.
- Suppression de l'historique des courses **dans l'interface utilisateur**, sans destruction des données techniques utiles.
- Bouton « Terminer les courses » doré, pleine largeur, plus visible.
- Explication claire lorsqu'aucun article n'est coché.
- Confirmation de fin des courses.
- Retrait des articles achetés uniquement.
- Conservation des articles non achetés.
- Message de réussite.
- Agrandissement des textes des boutons principaux, cible 16 px minimum.
- Correction des singuliers/pluriels.

Conserver l'unique liste de courses et la synchronisation native lorsqu'elle est réellement disponible.

### À préserver

- Corrections E07.1 déjà livrées.
- Hero de la Taverne.
- Hero des Courses et cartouche en bas à droite.
- Dock fixe.
- Gestion séparée des repas Midi/Soir.
- Recettes et favoris.
- Persistance de la liste.
- Modes d'édition et de validation.

### Réservé au chantier suivant E07.3

Ne pas reconstruire prématurément :

1. Le calendrier interactif des repas.
2. Le Grimoire des Recettes.
3. « Choisir un repas ».
4. La Fiche Recette.
5. Le Mode Cuisine.

Ces besoins doivent rester exhaustivement documentés dans le registre. Ne pas les classer comme réalisés à l'issue de la consolidation.

Le raccordement potentiellement incohérent du bouton « Ajouter les vivres manquants au Panier » doit être conservé comme point de vérification E07.3.

## 10. GATE 7 — Contrats & Assurances E08

**E08 a été validé par l'utilisateur.**

Ne pas reconstruire son interface.

Corriger seulement :

- Les accords grammaticaux des compteurs.
- Une éventuelle anomalie réelle de chargement de l'illustration sur mobile, après reproduction.

Vérifier que les images sont effectivement chargées et décodées avant les captures.

Ne pas interpréter une capture prise trop tôt comme une panne avérée.

Préserver les contrats, filtres, échéances, consultation et modification.

## 11. GATE 8 — Corrections transversales

Traiter `T-01` à `T-05`.

### Boutons Effets et Son

Les deux commandes doivent être communes à tous les modules E01–E08.

Vérifier :

- Même état d'activation sur toutes les pages.
- Persistance après navigation et rechargement.
- Icône cohérente avec l'état.
- Fonctionnement effectif des animations et sons prévus.
- Respect de la réduction des animations.
- Compatibilité avec la synthèse vocale de Dobby.
- Absence de réactivation involontaire du son.

Ne pas créer huit systèmes de préférences indépendants.

### Intégration permanente

La branche intégrée est la seule référence de l'application assemblée.

Une correction ne doit jamais réintroduire une ancienne interface générique à la place d'une page reconstruite.

Une page techniquement intégrée n'est pas automatiquement validée visuellement.

Préserver le partage familial, les données et les writers existants, sans connexion réelle dans la démonstration isolée.

## 12. GATE 9 — Périmètre futur : ne pas anticiper

Après cette consolidation, l'ordre des prochains développements est fixé :

**1. Écrans complémentaires de la Taverne**

Calendrier interactif, Grimoire, Choisir un repas, Fiche Recette et Mode Cuisine.

**2. Menu**

Reconstruction complète de la navigation et de ses destinations.

**3. Famille**

Reconstruction du Salon des Curiosités et des parcours familiaux.

**4. Autres modules**

À définir ultérieurement avec l'utilisateur.

Ne pas commencer ces trois chantiers dans cette mission.

Ne pas développer de nouveaux modules pour « améliorer » spontanément le produit.

## 13. Méthode d'exécution obligatoire

Travailler par checkpoints cohérents, en conservant un seul responsable des composants communs.

Séquence :

1. Audit des exigences.
2. Identification des fichiers concernés.
3. Corrections par module.
4. Tests ciblés.
5. Réconciliation des composants partagés.
6. Tests d'intégration.
7. Vérification visuelle.
8. Contrôle exhaustif du registre.
9. Livraison pour revue.

Éviter les réexécutions inutiles de suites déjà vertes.

En cas d'échec, isoler la cause, conserver la trace utile et relancer le test concerné avant d'élargir.

Ne pas supprimer ou affaiblir une assertion pour obtenir un résultat vert.

Ne pas ajouter de tests artificiels affirmant qu'un bouton fonctionne sans action métier réelle.

## 14. Critères DONE

La consolidation est terminée uniquement lorsque :

- Chaque exigence du registre possède un état final explicite.
- Chaque correction réalisable dans le périmètre autorisé est implémentée.
- Les modifications sont visibles dans l'application assemblée.
- Les interactions fonctionnent réellement.
- Les données utiles persistent après rechargement.
- Aucune régression E03/E07/E08 n'est constatée.
- Les corrections sont contrôlées aux largeurs 320, 390 et 1440 px.
- Les tests ciblés et la campagne finale sont réussis.
- Le nouveau bundle correspond exactement au code testé.
- Les éléments non réalisés sont identifiés comme bloqués ou reportés, avec leur motif.
- Aucun élément n'a été omis silencieusement.

**Ne pas afficher un DONE global si une correction du périmètre courant reste non vérifiée.**

Si une dépendance réellement bloquante apparaît, arrêter uniquement le lot concerné, conserver les corrections indépendantes et présenter le blocage précis.

## 15. Livraison et publication

Pousser le travail sur :

`feat/dobby-e01-e08-review-integration`

Ne pas modifier les branches sources E03–E08.

Ne pas fusionner le code applicatif dans `main`.

Ne pas modifier Supabase ou les données familiales réelles.

Une fois les contrôles réussis, préparer la nouvelle version de l'aperçu interactif intégré et utiliser uniquement le mécanisme de publication isolée existant pour actualiser l'URL de revue, si les autorisations de publication de démonstration déjà accordées couvrent cette opération.

Ne pas modifier l'application officielle ni les autres aperçus.

Conserver l'isolation des données fictives, la traçabilité du SHA source, les empreintes du bundle et les preuves de recette hébergée.

Ne pas présenter une URL simplement construite ou une CI verte comme preuve de fonctionnement hébergé.

## 16. Rapport final obligatoire

Fournir :

1. SHA de départ et SHA final.
2. Commits réalisés.
3. Matrice exhaustive des exigences avec états avant/après.
4. Liste exacte des corrections effectuées.
5. Liste des exigences bloquées et leurs motifs.
6. Liste des exigences volontairement reportées aux futurs chantiers.
7. Tests réellement exécutés et résultats.
8. CI sur SHA final.
9. Captures comparatives.
10. URL de revue interactive si publication réalisée et vérifiée.
11. Écarts ou limites qui exigent encore une décision humaine.

### Contrôle final impératif

Effectuer une seconde lecture indépendante du registre :

`docs/dobby-v7/REVIEW-CONSOLIDATION.md`

Comparer chaque exigence à son implémentation et à sa preuve.

Ne pas seulement contrôler la présence des lignes dans un rapport : contrôler les effets réels.

**Si une seule demande est absente de la matrice, le contrôle de complétude échoue.**

**Si une correction est déclarée terminée sans preuve suffisante, son statut doit redevenir NON VÉRIFIÉ.**

**Si une demande utilisateur a été transformée en une autre fonctionnalité sans validation, le contrôle de conformité échoue.**

Arrêt après livraison pour revue humaine.

**Principe directeur : exécuter exactement les décisions de l'utilisateur, les préserver dans le temps et ne jamais sacrifier leur conformité à la rapidité du développement.**