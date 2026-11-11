# Revue intégrée E03 — Période de la Bibliothèque des Missions

Lot de présentation uniquement, dans la branche de correction indépendante. La validation visuelle humaine reste à effectuer. Aucun writer, calcul de récurrence, état de mission ni stockage de filtre supplémentaire n'est ajouté par ce correctif.

## Défaut vérifié

La source intégrée `42599df` rendait toutes les missions du statut/membre choisi, sans contrôle temporel ni limite. Le même foyer TEST de 22 missions ouvertes est photographié avant aux trois largeurs. Le test causal échoue précisément sur l'absence de sélecteur temporel : [RED](evidence/integrated-e03-e06-20261111/missions/red.log), [mesures avant](evidence/integrated-e03-e06-20261111/missions/before-results.json).

## Comportement livré

- Filtre **Période** indépendant de **À faire / Toutes / Urgentes / Terminées** et du membre. Défaut **7 prochains jours** : aujourd'hui plus six jours, bornes incluses. Autres choix : Aujourd'hui, 30 prochains jours (aujourd'hui plus 29), Toutes les missions.
- La période est annoncée avec des dates absolues. Le jour civil est calculé dans `Europe/Brussels`, indépendamment du fuseau du navigateur ; l'addition des jours ne dépend pas d'un intervalle de 24 h traversant un changement d'heure.
- Les missions ouvertes antérieures à aujourd'hui restent dans **En retard**. Les missions sans date reconnue restent dans **Sans échéance reconnue** ; une échéance invalide demeure signalée sur sa carte. Ces sections sont repliées initialement et accessibles par leur résumé/clavier.
- Les dix premières missions de la période sont affichées, puis **Voir davantage** ajoute dix cartes. Chaque section de retard/sans date possède sa propre limite de dix, révélée après ouverture volontaire. Aucun enregistrement n'est supprimé ni tronqué dans le registre.
- Pour une mission terminée, `completedAt` valide est la date de référence, convertie en jour Brussels si c'est un horodatage. À défaut seulement, l'échéance valide est utilisée ; la carte indique **Clôture non datée · échéance utilisée**. Sans date reconnue, elle reste accessible dans la section correspondante.
- Les doublons d'identifiant et d'identité série/jour sont éliminés de la présentation, en conservant la première ligne canonique. Les occurrences de jours différents restent distinctes ; le filtre ne génère aucune occurrence et ne répare pas le stockage.
- La répartition familiale indique explicitement **Missions ouvertes · ensemble du registre, toutes périodes**. Les compteurs de statut portent sur le membre choisi, la période et ses sections accessibles ; les filtres n'altèrent pas les compteurs familiaux globaux.
- Un rafraîchissement natif préserve la combinaison sélectionnée, le focus du contrôle et les sections ouvertes. Une nouvelle navigation ou un rechargement repart du défaut sept jours, sans nouvel enregistrement de préférence.

Fichiers : `essai-stitch-v7/missions.js`, `missions.css`. Les classes et couleurs de la composition E03 sont réutilisées ; titre, illustration, cadre, badge, bouton de création et navigation native sont inchangés.

## Tests exécutés

[Nouveau test ciblé](../../essai-stitch-v7/tests/review-integrated-missions.cjs) : sélecteur et valeur initiale, limites exactes 7/30 jours, combinaison statut/membre, retard/sans date, pagination, date de clôture et fallback, horodatage proche de minuit Bruxelles avec navigateur Los Angeles, déduplication d'occurrence sans mutation, portée des compteurs, focus au rafraîchissement, clavier vers le véritable éditeur, navigation/rechargement et absence de débordement à 320/390/1440.

Les tableaux natifs avant/après sélection sont comparés octet pour octet via JSON. Les données persistent après ouverture de l'éditeur et rechargement ; aucun compte réel, appel externe ni opération de synchronisation n'est utilisé. [GREEN](evidence/integrated-e03-e06-20261111/missions/green.log), [résultats](evidence/integrated-e03-e06-20261111/missions/results.json).

Le test historique `e03.cjs` vérifiait volontairement des missions jusqu'en 2099 sans filtre temporel. Il doit désormais choisir **Toutes les missions** pour conserver ces contrôles historiques du registre/formulaire ; aucune assertion métier ne doit être supprimée pour cette adaptation. Les autres contrôles géométriques et métier restent à conserver. `e03-counts.cjs` reste applicable aux compteurs de 3/17 missions datées aujourd'hui.

## Captures comparatives

| Largeur | Avant, liste intégrée sans filtre | Après, défaut sept jours et dix cartes | Terminées selon la clôture |
|---|---|---|---|
| 320 | [Avant](evidence/integrated-e03-e06-20261111/missions/before-320.png) | [Après](evidence/integrated-e03-e06-20261111/missions/after-320.png) | [Terminées](evidence/integrated-e03-e06-20261111/missions/after-done-320.png) |
| 390 | [Avant](evidence/integrated-e03-e06-20261111/missions/before-390.png) | [Après](evidence/integrated-e03-e06-20261111/missions/after-390.png) | [Terminées](evidence/integrated-e03-e06-20261111/missions/after-done-390.png) |
| 1440 | [Avant](evidence/integrated-e03-e06-20261111/missions/before-1440.png) | [Après](evidence/integrated-e03-e06-20261111/missions/after-1440.png) | [Terminées](evidence/integrated-e03-e06-20261111/missions/after-done-1440.png) |
