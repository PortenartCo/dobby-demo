# Revue intégrée — Questionnaires et identité magique

Sous-lot D sur la source intégrée `42599df`, sans publication. Aucun asset graphique, questionnaire historique archivé, rapport antérieur, recette, donnée réelle ou règle d’accès modifié.

## Causes et correctifs

| Demande | Cause vérifiée | Correction effective |
|---|---|---|
| Coche or sur les réponses | `question(kind)` vide toutes les icônes du prototype puis les lettres de gauche. Aucun marqueur ne reste visible malgré le véritable radio sélectionné. | Même marqueur `✓` doré dans les deux questionnaires ; sa visibilité dépend exclusivement de `input:checked`. Aucune deuxième variable de sélection, aucun rôle radio simulé. |
| Nouvelle question q2 | Le JSON canonique contient encore « Une invitation inattendue » et ses axes anciens. Les réponses C/D de la nouvelle formulation expriment d’autres comportements. | Formulation exacte « Une salle capricieuse », IDs stables, Maison `e06-v2`, Patronus conservé `e06-v1`. Archive des anciennes réponses temporaires q2 et choix explicite requis ; résultats déjà confirmés préservés. |
| Patronus final trop petit | La règle `.grid.grid-cols-2 .mp-patronus-sprite` force une largeur de 64 px, alors que le blason utilise déjà une image allant jusqu’à 160 px ; titres non alignés. | Cadre partagé Maison/Patronus, dimensions de présentation égales et titres alignés. Chaque cellule complète de l’atlas conserve son rapport naturel 3:4, sans recadrage ni déformation. Même renderer partagé dans le Profil magique. |

Fichiers UI : `onboarding.js/css`, `magic-profile.js/css`. Contrat : `data/onboarding-scoring-v1.json`, `onboarding-scoring.mjs`, `onboarding-drafts.mjs`, `onboarding-engine.js`, adaptation strictement limitée de `family-profile.js` pour accepter une confirmation Maison v2. Le stub d’association `linkedMember` reste inchangé. Les runes du Profil passent toujours par `DobbyMemberAvatar.profile` et `E.rewardSummary`, sans calcul parallèle.

## Règles de notation et historique

[Audit détaillé des axes, versions et brouillons](evidence/integrated-e03-e06-20261111/ceremony/scoring/README.md). A = anticipation/investigation ; B = action/anticipation ; C = action/investigation ; D = lien/anticipation. Les autres questions, les six étapes Maison et leur départage sont inchangés. Aucun résultat confirmé n’est recalculé au chargement ni à la fermeture finale. Nouveau résultat uniquement après questionnaire et confirmation explicites.

L’ancien brouillon v1 ayant une q2 non confirmée conserve une copie exacte dans `scoringHistory['e06-v1']`, puis exige une nouvelle réponse q2. Une notice visible explique ce choix ; même un ancien lien vers une question ultérieure revient à cette question. Identité, autres réponses, extensions inconnues et enveloppe native sont conservées. La lecture seule n’écrit pas de métadonnées ; la transaction suivante persiste atomiquement l’archive et la nouvelle version. Un ancien client refuse le conteneur v2, et les versions futures restent bloquées.

La distribution V2 a réellement changé : Gryffondor 4646, Serpentard 4505, Serdaigle 3830, Poufsouffle 3403 sur 16 384 combinaisons pondérées, soit 16,9 % d’écart maximal à l’uniformité. L’ancienne borne 10 % n’est pas revendiquée pour ce contrat révisé. Aucun autre axe n’a été retouché pour un équilibrage artificiel. Les quatre Maisons restent atteignables ; les quatre vecteurs d’exemples V1 restent compatibles. [Calcul Python indépendant, source historique inchangée](evidence/integrated-e03-e06-20261111/ceremony/scoring/distribution-v2.json).

## Preuves fonctionnelles

- [RED visuel](evidence/integrated-e03-e06-20261111/ceremony-red.log), puis [GREEN 320/390/1440](evidence/integrated-e03-e06-20261111/ceremony-green.log) : véritables radios, clavier, changement de réponse, reload et retour ; un seul V visible ; douze Patronus et rapport d’atlas naturel, cartes/titres alignés, profils/résultats v1 et extensions inconnues inchangés.
- [Compatibilité navigateur](evidence/integrated-e03-e06-20261111/ceremony-compat-green.log) : formulation exacte chargée par le moteur réel, archive des réponses, lien profond ancien, nouvelle sélection persistante et résultats confirmés v1 conservés. Le [RED du lien ancien](evidence/integrated-e03-e06-20261111/ceremony-compat-red.log) a identifié que le paramètre de route pouvait réimposer q6 après migration ; l’adaptateur respecte désormais l’étape q2 requise.
- [Questions complémentaires](evidence/integrated-e03-e06-20261111/ceremony-extras-green.log) : vrais départages conditionnels Maison et Patronus à chaque largeur, radios/coche/reload, aucun résultat implicitement confirmé.
- [8 tests purs ciblés finaux](evidence/integrated-e03-e06-20261111/ceremony/scoring/green-final.txt), plus [18 tests E06 historiques](evidence/integrated-e03-e06-20261111/ceremony/scoring/regression.txt) et [profil/confirmations](evidence/integrated-e03-e06-20261111/ceremony/scoring/profile-and-confirmation.txt) : versionnement, exactitude de la copie, archives, résultats historiques, règles Patronus inchangées et refus des versions inconnues.
- L’ancien `e06-edge.cjs` attendait encore « On t’invite » : [RED causal](evidence/integrated-e03-e06-20261111/ceremony-historical-copy-red.log), [GREEN avec le texte V2](evidence/integrated-e03-e06-20261111/ceremony-historical-copy-green.log). Seuls les imports de formulation, les attentes de version Maison et ce libellé q2 ont été adaptés dans les quatre tests E06 concernés. Les tests historiques purs V1 et leurs références restent inchangés ; aucun contrôle de persistance, de refus ou d’ID n’a été retiré.

Une erreur de positionnement de la notice pendant l’implémentation a aussi été reproduite et corrigée avant validation : la notice avait déplacé le repère DOM du titre. Elle est ajoutée après lecture de ce repère. [Journal conservé](evidence/integrated-e03-e06-20261111/ceremony-compat-notice-red.log).

Les tests utilisent Chromium et des profils TEST temporaires, réseau externe bloqué ; aucune recette physique Safari/iPhone ni compte réel revendiqués.

## Comparatifs

L’atlas source mesure 1254×1254, quatre colonnes et trois lignes ; chaque cellule a donc un rapport 3:4. Le Patronus final passe de 64×85 px à 108×144 px à 320, 143×191 px à 390 et 160×213 px à 1440. Les images Maison restent carrées. Les deux titres se trouvent à la même hauteur dans chaque paire de cartes.

| Largeur | Choix sélectionné avant / après | Cygne final avant / après | Formulation q2 et reprise explicite |
|---|---|---|---|
| 320 | [Avant](evidence/integrated-e03-e06-20261111/ceremony/before/house-selected-320.png) · [Après](evidence/integrated-e03-e06-20261111/ceremony/after/house-selected-320.png) | [Avant](evidence/integrated-e03-e06-20261111/ceremony/before/final-swan-320.png) · [Après](evidence/integrated-e03-e06-20261111/ceremony/after/final-swan-320.png) | [Q2](evidence/integrated-e03-e06-20261111/ceremony/compat/revised-q2-320.png) |
| 390 | [Avant](evidence/integrated-e03-e06-20261111/ceremony/before/patronus-selected-390.png) · [Après](evidence/integrated-e03-e06-20261111/ceremony/after/patronus-selected-390.png) | [Avant](evidence/integrated-e03-e06-20261111/ceremony/before/final-swan-390.png) · [Après](evidence/integrated-e03-e06-20261111/ceremony/after/final-swan-390.png) | [Q2](evidence/integrated-e03-e06-20261111/ceremony/compat/revised-q2-390.png) |
| 1440 | [Avant](evidence/integrated-e03-e06-20261111/ceremony/before/house-selected-1440.png) · [Après](evidence/integrated-e03-e06-20261111/ceremony/after/house-selected-1440.png) | [Avant](evidence/integrated-e03-e06-20261111/ceremony/before/final-swan-1440.png) · [Après](evidence/integrated-e03-e06-20261111/ceremony/after/final-swan-1440.png) | [Q2](evidence/integrated-e03-e06-20261111/ceremony/compat/revised-q2-1440.png) |

[Mesures des douze Patronus à chaque largeur](evidence/integrated-e03-e06-20261111/ceremony/after/results.json) · [Toutes les captures après, incluant cerf/hibou/dauphin et Profil](evidence/integrated-e03-e06-20261111/ceremony/after/).

Statut : code corrigé et tests ciblés PASS. Intégration globale, CI et nouvel aperçu sont consignés séparément par l’orchestrateur. Aucune fusion ni publication effectuée par ce sous-lot.
