# CODEX — DOBBY E06 : consolidation visuelle et fonctionnelle

**MODE : EXÉCUTION CONTRÔLÉE — Correction ciblée, sans fusion ni publication automatique.**

## 1. Contexte et référentiel

Dépôt : `PortenartCo/dobby-demo`

Branche de référence : `feat/dobby-e01-e08-review-integration`

Références :
- `docs/dobby-v7/REVIEW-CONSOLIDATION.md`, notamment les arbitrages enregistrés au commit `66a1395`.
- `docs/dobby-v7/E06-01-RITUEL.md`
- `docs/dobby-v7/E06-PREMIERE-CONNEXION.md`
- Les spécifications E05 et E06 existantes.
- Les éventuelles instructions `AGENTS.md` applicables.

Vérifier les branches, PR, worktrees et modifications concurrentes avant intervention. Créer une branche de correction indépendante depuis le dernier état vérifié de la consolidation E01–E08. Ne pas écraser une branche occupée.

**Principe absolu : aucune perte d'information, de fonctionnalité, de donnée ou de révision.**

Conserver l'ensemble des sources Stitch, historiques Git, questionnaires, calculs, profils familiaux, runes et mécanismes de synchronisation existants.

## 2. Ressources graphiques fournies

Deux archives sont jointes à la mission.

### ZIP (10) — Choixpeau cinématographique

Archive : `stitch_dobby_assistant_mobile_app (10)(1).zip`

SHA-256 : `21f27e807d251eb93b79da0d6674c6f140115a83598eba0f54f5ed4dc09e0a3d`

Utiliser l'illustration panoramique :

`cinematic_photorealistic_dark_fantasy_still_of_the_ancient_magical_sorting_hat/screen.png`

Elle présente un Choixpeau ancien, réaliste, expressif, avec éclairage cinématographique, chandelles et décor gothique.

Le HTML de la cérémonie contenu dans l'archive sert uniquement de référence de composition et de cadrage.

**Ne pas reprendre ses dix questions.** DOBBY conserve strictement ses six questions canoniques, ses réponses, son scoring et son mécanisme de reprise.

Remplacer le visuel cartoon actuel, préserver les proportions et garantir un cadrage qualitatif à 320, 390 et 1440 px.

### ZIP (11) — Quatre blasons

Archive : `stitch_dobby_assistant_mobile_app (11)(1).zip`

SHA-256 : `d77a4203d51689d7bd1bd42d128cc2a1d2682937151a2ce5db7a8cdfe46f2bc2`

L'archive contient quatre illustrations originales Stitch, à associer strictement :

| Maison | Illustration |
|---|---|
| Gryffondor (`gryffindor`) | Lion doré |
| Serpentard (`slytherin`) | Serpent émeraude |
| Serdaigle (`ravenclaw`) | Aigle bronze |
| Poufsouffle (`hufflepuff`) | Blaireau ambré |

Utiliser les `screen.png` respectifs des quatre dossiers `original_*_heraldic_emblem_*` de l'archive.

Les blasons doivent être grands, lisibles et cohérents avec la cérémonie.

Corriger leur affichage dans :
- La Révélation de la Maison E06.
- La carte « Ma Maison » du Profil magique E05.
- La présentation finale de l'identité magique, lorsqu'une Maison y est illustrée.

Réutiliser une même correspondance canonique Maison → ressource. Ne pas créer trois systèmes graphiques différents.

Supprimer le placeholder « Blason officiel indisponible dans cette démonstration » lorsque la ressource fournie existe. Ces illustrations sont des créations Stitch originales : ne pas les présenter faussement comme des blasons officiels.

Ne pas utiliser de liens d'images externes temporaires.

Conserver les originaux sans altération, enregistrer leur provenance et leurs empreintes. Des versions optimisées pour le Web peuvent être produites séparément.

## 3. Correction des effets visuels

Le diagnostic précédent a identifié une valeur initiale `effects:false`, notamment dans `chrome.js` et le contrôleur du Rituel.

Corriger le comportement à la source :

- Première utilisation, sans préférence enregistrée : `effects:true`.
- Son : `sound:false`.
- Une désactivation explicite des effets par l'utilisateur reste mémorisée.
- Ne jamais réactiver de force les effets à chaque chargement.
- Partager la même préférence entre les écrans.
- Respecter `prefers-reduced-motion`.

Contrôler les différents chemins d'initialisation afin qu'ils n'appliquent pas des valeurs contradictoires.

## 4. Transition magique de la Cheminée

L'intégration actuelle ne reproduit qu'une partie des transformations vertes prévues dans la source Stitch du Rituel.

Restaurer une transition coordonnée comprenant, selon la référence existante :

- Transformation des flammes en vert.
- Transformation visuelle du bouton.
- Évolution des éléments décoratifs et du badge.
- Éclairage et flash vert de transition.
- Passage vers « Mon foyer magique » après la séquence.

Conserver le mécanisme Canvas et les animations déjà livrées lorsqu'ils fonctionnent.

La transition doit être **réellement visible**, et pas simplement détectée par un test vérifiant l'existence d'une classe CSS.

Lorsque les effets ont été explicitement désactivés ou que la réduction système des animations l'exige, conserver un parcours accessible et rapide.

Ne pas introduire de nouveau moteur d'animation.

## 5. Retour au Rituel

Le paramètre existant `record=replay` permet la relecture, mais le mécanisme `seen` provoque une redirection automatique lors d'une ouverture ordinaire.

Ajouter ou rendre clairement accessible l'action **« Revoir le Rituel »**, notamment depuis le Foyer et les paramètres du Profil.

Cette action doit :
- Rejouer la cérémonie même si `seen=true`.
- Respecter les préférences d'effets et de son.
- Permettre de quitter ou de retraverser normalement.
- Ne jamais réinitialiser un membre, un questionnaire, une Maison, un Patronus ou les runes.
- Ne pas provoquer de redirection en boucle.

La première entrée et les ouvertures suivantes doivent conserver leur logique normale. Seule une demande explicite de relecture force l'affichage du Rituel.

## 6. Périmètre protégé

Ne modifier ni le moteur de calcul des Maisons et Patronus, ni les modèles canoniques de membres, ni les mécanismes de synchronisation et de persistance.

Préserver notamment :
- Les six questions Maison et les cinq questions Patronus, avec leurs éventuels départages.
- Les quatre Maisons et douze Patronus.
- Les avatars E05.
- Les gains, grades et runes E04.
- Les réponses sauvegardées et confirmations.
- Les profils existants et leurs identifiants.
- Les fonctionnalités E01 à E08 non concernées.

Ne pas intervenir dans Supabase, les migrations SQL, la production, les comptes familiaux réels ou les règles d'accès.

Ne pas supprimer ou remplacer les assets historiques ; ajouter des ressources versionnées.

## 7. Déroulement et vérifications

Procéder dans cet ordre :

1. **Préflight :** vérifier l'état Git, les références et les deux archives, puis identifier les seuls composants à modifier.
2. **Ressources :** intégrer Choixpeau et blasons avec manifestes de provenance et correspondance canonique.
3. **Comportements :** corriger préférences, transition verte et accès à la relecture.
4. **Recette ciblée :** tester l'intégration et les comportements réels dans Chromium.
5. **Non-régression :** vérifier E05, E06 et les composants partagés touchés ; élargir uniquement si nécessaire.

Exécuter les tests à 320, 390 et 1440 px.

Contrôler les quatre résultats de Maison, les quatre blasons, le Profil E05, les préférences sauvegardées, la traversée avec effets actifs/inactifs, le rechargement, le replay et la conservation des données.

Conserver les tests historiques. Exécuter une seule campagne globale finale si les composants communs modifiés le justifient.

### Critères DONE

- Choixpeau cinématographique réellement affiché.
- Quatre blasons affichés et associés aux bonnes Maisons.
- Même blason cohérent dans E06 et E05.
- Aucun placeholder injustifié.
- Effets activés par défaut pour les nouveaux utilisateurs.
- Préférences explicites préservées après rechargement.
- Transition verte coordonnée observable.
- Relecture possible depuis l'interface, sans blocage.
- Questionnaires et calculs E06 inchangés.
- Aucune perte de données, runes ou révision.
- Tests ciblés concluants et captures comparatives disponibles.

## 8. Livrables attendus

Produire :

1. La liste des fichiers modifiés et ajoutés, ainsi que le diff.
2. Les commits sur la branche indépendante.
3. Les empreintes des ressources graphiques et leur provenance.
4. Les résultats des tests réellement exécutés.
5. Des captures avant/après des principaux écrans, aux trois largeurs.
6. Une preuve visuelle de la transition verte et du fonctionnement de « Revoir le Rituel ».
7. Un complément au registre de consolidation existant, **sans effacer ni réécrire les arbitrages antérieurs**.
8. La liste précise des réserves restantes, s'il y en a.

Distinguer explicitement code modifié, tests exécutés, intégration vérifiée, déploiement et validation visuelle utilisateur.

**Arrêt obligatoire pour revue humaine : aucune fusion dans `main`, aucune modification de la publication existante ni déploiement automatique.**

Ne pas déclarer E06 validé simplement parce que la CI est verte. La validation visuelle et fonctionnelle de l'utilisateur reste indispensable.