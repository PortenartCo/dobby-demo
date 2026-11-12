# PREP-01 — Revue indépendante

Revue en lecture seule du diff depuis `5b764ef367553e9945fb72a6b563b55adc41e040`, avec la demande utilisateur et le plan d’intégration. Une revue visuelle distincte compare le code et les PNG de référence aux captures Chromium. Les réviseurs ne modifient pas le code.

## Trois P2 de la revue applicative

1. **Version locale inconnue réémise en V1** : `pick('family')` forçait la version 1. Correction : validation avant sérialisation/activation, garde de réhydratation et statut d’incompatibilité sans propagation d’erreur aux autres modules. Deux régressions activation/synchronisation observées RED puis GREEN.
2. **Couple événement/préparatifs perdu à la réactivation** : la fusion conservait un préparatif local mais reprenait les événements distants sans son événement. Correction : conflit explicite conservant les événements/préparatifs locaux lorsque leur association serait perdue ou lorsqu’un événement local modifié diverge. Aucun nouveau moteur de fusion Agenda ; la mise à jour distante d’un événement local inchangé reste compatible. Régressions création hors ligne, suppression distante et métadonnées locales divergentes observées RED puis GREEN.
3. **Modèle distant coché accepté par E09 mais refusé par le lecteur natif** : validation alignée ; le payload invalide est rejeté avant remplacement de la copie locale. Le cas `done:true` est ajouté à la matrice des données malformées.

Le réviseur ne relève pas d’autre défaut important dans le CRUD, la copie Agenda, Courses, le chargement des scripts ou les reçus archivés. Les corrections ont été vérifiées par leurs tests RED→GREEN et les campagnes finales ; il n’est pas affirmé qu’une seconde revue indépendante des corrections ou une recette serveur réelle ait été réalisée.

## Revue visuelle

- Lien profond vers un modèle supprimé : auparavant écran vide ; désormais état explicite et retour fonctionnel, testé aux trois largeurs.
- Dialogues sans nom accessible : ajout de `aria-labelledby`, assertion navigateur.
- Lignes trop hautes : actions icônes de 44 px et mode explicite de réorganisation ; quantité/unité facultatives repliées dans l’ajout rapide. Sections À préparer/Déjà préparés calculées.
- La capture Agenda montrait le haut du formulaire : le test défile désormais jusqu’à l’association avant la capture.

Palette, polices locales, lisibilité, focus visible, sémantique des boutons et des coches et chrome natif vérifiés. Les différences résiduelles d’adaptation desktop et de formulaire natif sont explicites dans le rapport ; aucune fidélité pixel parfaite n’est revendiquée.

## Contrôles additionnels

La version locale future expose une page d’indisponibilité avec retour Famille ; elle reste intacte. Ce comportement a également été reproduit en échec puis validé en navigateur. La protection des brouillons inclut le compte, le foyer et l’epoch natifs, même si les tableaux restent identiques.

Résultats finaux : voir `verification.json`, `logs/prep-final.log`, `logs/native-final.log`, les journaux RED/GREEN et `source-fingerprints.json`.
