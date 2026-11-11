# Revue indépendante E03 — 11 novembre 2026

**Verdict : conforme dans le périmètre examiné ; aucun défaut matériel relevé.**

Revue en lecture seule du diff fourni dans `/workspace/scratch/integrated-missions-review.diff`, du nouveau test `essai-stitch-v7/tests/review-integrated-missions.cjs`, du rapport propriétaire et des preuves Missions. Référence : spécification §§4 et 10. Aucun test relancé ; aucune source ni index modifié. Seul ce compte rendu est ajouté.

## Contrôles

| Point | Verdict et justification |
|---|---|
| Période indépendante | Conforme : état distinct `period`, défaut `week`, choix aujourd’hui/7/30/toutes ; les actions statut/membre ne changent pas la période (`missions.js:5`, `:35–41`, `:51–52`). Bornes civiles Bruxelles inclusives, aujourd’hui +6/+29. |
| Retard et absence de date | Conforme : sections identifiées et ouvrables par résumé natif, accessibles pour le statut/membre choisi ; les missions hors période restent récupérables avec Toutes les missions (`:37–45`). |
| Limite initiale | Conforme : dix cartes par section, sections secondaires repliées initialement, incréments de dix et bouton Voir davantage (`:6`, `:44–45`, `:52`). |
| Missions terminées | Conforme : date de complétion valide prioritaire, conversion Bruxelles des horodatages avec fuseau, échéance en repli et indication explicite (`:12–13`, `:28`). |
| Récurrences | Conforme par lecture : déduplication séparée des identifiants manuel/automatique et des couples série/jour ; des jours ou séries différents conservent des clés différentes (`:17–21`). Le modèle natif distingue l’identité racine/occurrence et ne projette pas de seconde occurrence le jour de la racine (`family-missions-core.mjs:52–55`, `:74–80`). Aucun élargissement de la déduplication au titre ou à la date de complétion. |
| Compteurs familiaux | Conforme : portée « Missions ouvertes · ensemble du registre, toutes périodes » visible, calcul indépendant des sélections (`missions.js:46–48`). |
| Absence de mutation | Conforme par lecture du diff : aucune écriture native, aucun stockage supplémentaire ; filtrage sur nouveaux tableaux, tri après filtrage, objets métier uniquement consultés. Le test compare les missions manuelles canoniques avant/après et la donnée injectée pour la déduplication. |
| Mobile et focus | Conforme au niveau examiné : contrôles de 44 px au minimum, réduction adaptée, focus visible du sélecteur et contrôles, restauration du contrôle lors du rendu (`missions.css:38–50`, `missions.js:24–25`, `:49`). Captures 320 px et Terminées 390 px examinées ; libellés et cartes lisibles sans débordement horizontal apparent. Le journal et les résultats fournis annoncent PASS à 320/390/1440. |

## Limites des preuves

- Résultats PASS repris des artefacts fournis, sans réexécution indépendante conformément au mandat. La revue ne certifie pas la CI, la publication ou l’ensemble des parcours de non-régression du §10.
- Le scénario principal du nouveau test utilise `autoTasks: []` et sa comparaison canonique ne porte que sur `manualMissions` (`review-integrated-missions.cjs:5`, `:12`, `:24`, `:29`). Il ne prouve donc pas à lui seul l’invariance de tous les tableaux natifs ; l’absence de mutation supplémentaire est confirmée ici par lecture du correctif.
- Le scénario de déduplication du test vérifie une même identité série/jour et un identifiant incohérent injecté directement (`:26`). Il ne contient pas d’assertion dédiée pour deux jours distincts ou deux séries distinctes. Leur conservation découle de la clé du code ; cette limite de couverture ne constitue pas un défaut fonctionnel observé.
- Le test prouve le focus du bouton de statut après rafraîchissement et l’accès clavier à l’éditeur, mais ne mesure pas la visibilité du focus pour tous les contrôles à chaque largeur. Les captures statiques ne remplacent pas une validation visuelle humaine interactive.

**Findings matériels : aucun.**
