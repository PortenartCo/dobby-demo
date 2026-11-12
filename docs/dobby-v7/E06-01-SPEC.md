# DOBBY — E06-01 : intégrer le Rituel de la Cheminée

**MODE : EXÉCUTION — MISSION STRICTEMENT LIMITÉE À E06-01**

## Contexte

Le blocage E06-01 identifié dans la consolidation DOBBY est désormais levable.

L'utilisateur avait déjà fourni la maquette Stitch correspondante. Une copie exploitable est jointe à cette mission : `DOBBY-E06-RITUEL-SOURCE-STITCH.zip`.

Elle contient :
- `code.html` : composition HTML et animations originales ;
- `screen.png` : capture de référence ;
- `DESIGN.md` : indications graphiques ;
- `SOURCE-MANIFEST.md` : provenance et empreintes.

**Ne plus considérer cette maquette comme introuvable.**

Dépôt : `PortenartCo/dobby-demo`

Branche : `feat/dobby-e01-e08-review-integration`

Dernier commit validé : `a61a140e94b81893ad5b3cc4624ff4d6796c3ff7`

Références :
- `docs/dobby-v7/REVIEW-CONSOLIDATION.md`
- `docs/dobby-v7/CONSOLIDATION-BLOCKERS.md`
- `docs/dobby-v7/CONSOLIDATION-MATRIX.json`
- `docs/dobby-v7/evidence/consolidation/e06/README.md`

Respecter les éventuels `AGENTS.md` applicables.

## Objectif

Intégrer fidèlement l'écran **« DOBBY — Le Rituel de la Cheminée »** avant le parcours de première connexion E06.

Le résultat attendu est :

**Rituel de la Cheminée → Traverser la cheminée → Mon foyer magique → Identité → Maison → Patronus → Identité finale.**

## Exigences impératives

1. Partir du véritable code Stitch joint, sans recréer arbitrairement une autre composition.
2. Conserver l'ambiance visuelle : grande cheminée, Dobby, lumière chaleureuse, dorures, flammes et transition magique verte.
3. Faire fonctionner le bouton **« Traverser la cheminée »** avec une vraie navigation à l'issue de l'animation.
4. Faire fonctionner **« Passer l'introduction »** sans imposer l'animation.
5. Faire fonctionner **« Ne plus afficher »** avec une préférence persistante, réversible depuis les paramètres appropriés.
6. Ne pas imposer cette introduction à chaque ouverture de l'application ou à un membre déjà configuré.
7. Préserver intégralement le parcours fictif E06 récemment corrigé.
8. Respecter le mode de réduction des animations, les préférences sonores et les possibilités du navigateur.
9. Tester le comportement sur mobile et ordinateur.

### Illustration centrale

Le HTML fourni référence une image externe de Dobby devant la cheminée. Cette image n'est pas embarquée dans l'archive.

Vérifier la ressource, sa disponibilité et ses conditions d'utilisation.

Si elle est inexploitable, réutiliser les ressources locales autorisées ou créer une composition originale adaptée, avec une provenance explicite.

**Ne pas utiliser la capture complète comme fausse illustration centrale. Ne pas afficher une image cassée. Ne pas présenter une image de remplacement comme l'original Stitch.**

Si le rendu final ne permet pas d'obtenir une illustration centrale de qualité suffisante, livrer les fonctions indépendantes et signaler précisément cette réserve graphique.

## Périmètre strict

Cette mission concerne uniquement **E06-01 et ses raccordements directs**.

Interdictions :
- Ne pas relancer la consolidation des 95 exigences.
- Ne pas redessiner les questionnaires Maison/Patronus déjà corrigés.
- Ne pas modifier E01–E05, E07 ou E08 sans nécessité directement démontrée.
- Ne pas entreprendre E07.3, Menu ou Famille.
- Ne pas modifier Supabase, les comptes réels ou l'application officielle.
- Ne pas fusionner dans `main`.

## Vérifications obligatoires

Tester à 320, 390 et 1440 px :

- Première ouverture : le Rituel apparaît.
- Traversée : animation puis accès correct au foyer.
- Passage de l'introduction : navigation immédiate et correcte.
- « Ne plus afficher » : préférence respectée après rechargement.
- Retour au parcours E06 : aucune perte du membre ou des réponses.
- Parcours fictif complet : toujours fonctionnel.
- Image centrale réellement décodée et visible.
- Aucune exception JavaScript ni commande factice.

Réutiliser les tests E06 existants et ajouter uniquement les tests ciblés nécessaires. Ne pas relancer inutilement toutes les campagnes historiques.

## Critères DONE

Le travail est terminé seulement si :

1. Les sources Stitch jointes sont inventoriées et conservées avec leur provenance.
2. Le Rituel est effectivement intégré à l'application.
3. Les trois commandes principales fonctionnent.
4. Les parcours E06 existants ne régressent pas.
5. Les captures aux trois largeurs sont disponibles.
6. Les tests ciblés sont PASS.
7. Le registre de consolidation indique le nouvel état d'E06-01, sans modifier les autres arbitrages.

Pousser le correctif sur la branche d'intégration.

Si les contrôles passent, actualiser uniquement l'aperçu isolé déjà autorisé :

https://portenartco.github.io/dobby-demo/essai-dobby-integrated-review/

Vérifier la version réellement servie avant d'annoncer sa disponibilité.

## Rapport attendu

Fournir uniquement :
- Commit et fichiers modifiés.
- État d'E06-01 : corrigé, partiel ou bloqué.
- Résultat des tests et preuves visuelles.
- État réel de l'illustration centrale.
- Lien vers l'aperçu actualisé, si publié et vérifié.

**Ne déclarer DONE que sur preuves. Arrêt ensuite pour revue visuelle utilisateur.**