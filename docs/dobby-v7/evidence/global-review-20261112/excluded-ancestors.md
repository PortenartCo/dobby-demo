# Périmètre des ancêtres non repris

La source globale conserve le socle E01–E08 de `c510ded81ee075c9b180e2551257351c557e541a` et intègre les seuls deltas nécessaires E09 et Missions/Runes. Elle ne revendique pas la reprise de toutes les fonctionnalités des ancêtres de la branche Runes.

- `7bdda55b37bcbfe9d9be6ae2248165da0c43a606` : filtres temporels E03 (aujourd’hui, 7/30 jours, toutes les dates), groupes retards/sans échéance, pagination et dates de clôture. Ces changements de présentation de `missions.js`/`missions.css` sont exclus. Les parcours natifs créer, attribuer, modifier, terminer, gain unique, grade et historique restent disponibles.
- `7fe3cb6a748e590a946392cf0a28fd71f7816908` : explications des missions automatiques et harmonisation de la carte Courses de l’Accueil.
- `53b1efc0ab6250d1c353ca44418aad14b276f927` et `123120f1c0b7d4b17de1bb71e061bc1159086afa` : dictée avec pause stable, corrections des courses en contexte, annulation pendant la lecture et refus des cibles ambiguës.
- `73454d70627d4666afd1d8f87b8e567ab93ed0e3` : galerie de revue accessible et seize portraits supplémentaires isolés.
- `f09c270d76326ddf765b60116c69e2f3b8362795` : illustrations originales Stitch de Maison/Choixpeau communes aux vues et transition visible du Rituel. Il ne s’agit pas de blasons officiels vérifiés.
- `87d94598cf78b4ca1f76e8924f55a36b2eefbba5` et `a4a5240d4ec5a68e421348c2282caeb00a7e1b2d` : présentation cochée des réponses, questionnaire q2 versionné, équilibrage Patronus et adaptations de génération/reprise liées à cette révision E06.

Les dépendances natives de récurrence, récompenses personnalisées et compensations (`821acbf`, `ed1585f`), le writer RPC V2 (`fff0c8e`) et la reprise explicite des anciens registres (`f1aff5a`) sont intégrés. La ligne d’historique `member-avatar.js` issue de `ed1585f` est également reprise : les gains et annulations apparaissent avec leur signe sans modifier le registre confirmé ni le total net.

Aucune modification SQL ni migration réelle n’est incluse. `3ceb14b` corrige une proposition SQL et ses preuves ; il ne contient pas de changement JavaScript client supplémentaire.
