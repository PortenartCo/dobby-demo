# E07.4 — Fiche et identité native (checkpoint B)

La fiche garde un seul titre complet au-dessus du visuel, une étoile près de « Fiche Recette », trois métriques égales et deux méthodes sur la même page. Les onglets reflètent strictement le contenu visible. Les ingrédients n’ont plus de cases ni d’action Courses ; les quantités dépendent des portions connues. Les anciennes cartes et mentions retirées dans la matrice R01–R13 ne laissent pas de blocs vides.

La modale de planification présente sept jours et quatorze créneaux avec les repas existants, semaine précédente/suivante et convives. Elle appelle le writer natif `planSelectedMeal`, conserve les références d’import Courses d’un même repas, refuse un créneau changé et exige confirmation pour remplacer un repas. Annuler et Escape n’écrivent rien.

Les recettes intégrées sont personnalisées dans `customRecipes` sous leur ID d’origine ; `allRecipes()` déduplique la présentation et le source BASE reste intact. L’édition conserve source, favoris, associations fiables, variantes et anciennes images ; une étape retirée est remappée explicitement ou son association est archivée. Une structure d’ingrédients modifiée sans identifiants fiables détache les liaisons incertaines tout en gardant leur historique. Les nouvelles photos sont réellement décodées, préparées, puis enregistrées seulement avec la recette. Une analyse tardive après annulation ne peut pas alimenter un autre éditeur.

Le retrait exige une confirmation nominative et signale les repas liés. Il conserve l’objet, ses médias, son favori, sa variante et toutes les références ; les réglages du Grimoire permettent la restauration. Les mutations natives et binaires sont protégées contre quota, contexte périmé et écriture partielle. Aucune synchronisation photo n’est déclarée.

Preuves :

- [Fiche, méthodes, quantités, favoris, calendrier, retrait/restauration — 320/390/1440](evidence/e07-4/b-ui-green.txt), [résultats et captures](evidence/e07-4/b-ui/results.json).
- [Édition réelle photo/TM5, suppression d’étape, BASE et analyse annulée — 320/390/1440](evidence/e07-4/b-editor-green.txt), [résultats](evidence/e07-4/b-editor/results.json).
- [Writers natifs et rollback — 320/390/1440](evidence/e07-4/b-engine/green.log), [résultats](evidence/e07-4/b-engine/results-320-390-1440.json).
- [Garde littérale du source natif](evidence/e07-4/b-engine/native-guard-green.log). V5 historique non modifié ; amendements du pilote familial listés et réversibles dans sa fixture E07.4.
- La suppression des anciens éléments visuels est comparée aux captures de revue R01–R14 fournies, et aux captures `b-ui/before-fiche-{320,390,1440}.png`. Après correction : titre entier, photo sans badges, trois cartes, liste simple et CTA de planification unique.

Les tests A de navigation/édition et d’import natif sont rejoués uniquement parce que B modifie la résolution d’identité et le writer d’édition : journaux `a-ui-b-regression.txt`, `a-editor-b-regression.txt`, `a-import-b-regression.txt`.
