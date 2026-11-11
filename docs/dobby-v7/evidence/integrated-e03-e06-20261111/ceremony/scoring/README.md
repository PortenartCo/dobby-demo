# Q2 — formulation et contrat de notation

Défaut reproduit : le JSON canonique chargeait « Une invitation inattendue » et les axes historiques C=`investigation/lien`, D=`lien/action`. [RED](red.txt). Le nom du fichier canonique reste celui demandé ; son contrat est désormais `e06-v2`.

## Sens des quatre réponses

| Réponse | Axe principal / secondaire | Motif |
|---|---|---|
| A — modifier la date | anticipation / investigation | Reporter limite le risque ; attendre que le phénomène se calme implique observer son évolution. Axes conservés après examen. |
| B — autre salle | action / anticipation | Agir sur le lieu fournit une alternative fiable. Axes conservés après examen. |
| C — disparitions dans le spectacle | action / investigation | Improvisation et expérimentation avec le phénomène, plutôt que la recherche de lien de l’ancien texte. Axes modifiés. |
| D — avis enseignant | lien / anticipation | Consultation d’une autorité puis attente d’une décision, plutôt que l’action de l’ancien axe secondaire. Axe secondaire modifié. |

Les IDs `q2` et A/B/C/D restent stables pour la structure, mais **les anciennes réponses q2 ne sont pas assimilées aux nouvelles**. Les six questions principales, la question de départage, les pondérations globales et les autres textes/axes restent identiques. Le barème Patronus est inchangé.

## Versions et préservation

- Maison nouvellement confirmée : `e06-v2`. Patronus : `e06-v1`.
- `versionFor(kind)` fournit la version à enregistrer ; `acceptsVersion` reconnaît les résultats historiques Maison v1/v2 et Patronus v1.
- Le validateur natif n’élargit que la Maison à v2 ; versions futures bloquées, stub `linkedMember=()=>null` inchangé, aucune nouvelle association de compte.
- Un profil Maison/Patronus v1 confirmé reste inchangé au chargement et à la fermeture finale, sans calcul de remplacement. Un nouveau calcul nécessite un questionnaire et une confirmation explicites.
- Même clé et même transaction de métadonnées native par utilisateur/foyer. L’ancien brouillon v1 non confirmé ayant répondu q2 est copié intégralement dans `scoringHistory['e06-v1']`, sa q2 devient non répondue et la reprise revient à q2 avec une explication visible. Les autres réponses et champs inconnus sont conservés. Les brouillons confirmés et ceux n’ayant pas encore répondu q2 restent inchangés.
- La simple lecture ne réécrit aucune métadonnée. La prochaine action explicite persiste atomiquement le nouveau brouillon et l’archive. L’ancien client v1 refuse le conteneur v2 plutôt que l’écraser ; une version inconnue reste bloquée.

## Vérifications ciblées

- [GREEN](green.txt) : sept tests, texte exact, axes, déterminisme de toutes les combinaisons Maison, quatre Maisons atteignables et 5 120 résultats Patronus égaux au barème historique ; archives/drafts et conservation de profils historiques.
- [Régression E06](regression.txt) : 18 tests PASS, dont le contrat Python exhaustif historique (inchangé), les drafts, identité et synchronisation.
- [Profil et confirmations natives](profile-and-confirmation.txt) : 14 tests PASS ; confirmations nouvelles Maison v2/Patronus v1, profils historiques et conflits natifs existants.
- Syntaxe des moteurs et `git diff --check` PASS.

Tests purs et fixtures natives locaux ; aucune opération de compte, base réelle, migration SQL ou service externe.

## Effet réel sur la distribution

Le sens de C crée désormais deux réponses à dominante action dans q2. Aucun autre axe ni poids n’a été retouché pour retrouver artificiellement l’équilibre ancien. L’évaluation exhaustive par les fonctions mathématiques Python historiques, avec les seuls axes V2 injectés et sans modifier leur source, donne Gryffondor4646, Serpentard4505, Serdaigle3830, Poufsouffle3403 sur16384 combinaisons pondérées. L’écart maximal à l’uniformité est **16,9 %**, au-delà de la borne historique10 % de V1 : cette borne n’est pas revendiquée pour V2. Les quatre Maisons restent atteignables ; les quatre vecteurs d’exemple historiques conservent leur résultat. [Calcul indépendant](distribution-v2.json), [8 tests ciblés finaux](green-final.txt).
