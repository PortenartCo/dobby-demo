# DOBBY — E06 : barèmes des tests de répartition et de Patronus (V1)

**Date : 10 novembre 2026**  
**État :** règles de calcul définies et contrôlées, **non intégrées à DOBBY**.

## Sources fonctionnelles

Les six questions Maison et les cinq questions Patronus reprennent les questionnaires narratifs approuvés dans la conversation. Le contenu, les choix, les identifiants, les points et les éventuelles questions complémentaires sont dans `dobby-e06-scoring-v1.json`.

Le modèle est **ludique et narratif**, et non un test psychologique validé. Il n'existe aucune affiliation imposée entre Maison et Patronus. Les réponses restent privées et n'ont pas besoin d'être conservées dans le profil une fois le résultat confirmé.

## Maison : 6 questions + question complémentaire conditionnelle

Chaque réponse apporte **3 points** à un axe principal et **1 point** à un second axe, parmi Action (A), Investigation (I), Lien (L) et Anticipation (P). Chaque question présente les quatre axes en positions principales différentes, pour ne pas privilégier une Maison.

Les points finaux de chaque Maison sont une transformation linéaire des scores d'axes :

| Maison | Action | Investigation | Lien | Anticipation |
| --- | ---: | ---: | ---: | ---: |
| Gryffondor | 3 | 2 | 1 | 0 |
| Serpentard | 1 | 0 | 2 | 3 |
| Serdaigle | 2 | 3 | 0 | 1 |
| Poufsouffle | 0 | 1 | 3 | 2 |

Si l'écart brut entre les deux meilleurs scores est **inférieur ou égal à 1 point**, DOBBY pose la septième question « La carte qui disparaît ». Elle départage uniquement les Maisons qui se situaient à moins de deux points du meilleur score, ce qui évite qu'une Maison éloignée surgisse après une question de départage.

En cas d'égalité résiduelle : points secondaires issus de la position des questions, puis rotation déterministe selon les réponses. **Pas de hasard, pas de date/heure, pas d'identifiant de membre comme graine.**

## Patronus : 5 questions + question complémentaire conditionnelle

Deux sous-scores **indépendants**, calculés sur les mêmes réponses :

1. **Mode** : attention, relation, mémoire, exploration (quatre possibilités).
2. **Nuance** : ancrage, résonance, élan (trois possibilités).

Chaque réponse accorde 3 points à un mode principal, 1 point à un mode secondaire, 3 points à une nuance principale et 1 point à une nuance secondaire. Les scores exacts de chaque choix sont dans le JSON.

Le croisement des gagnants produit douze Patronus :

| Mode / Nuance | Ancrage | Résonance | Élan |
| --- | --- | --- | --- |
| Attention | Hibou | Lynx | Renard |
| Relation | Blaireau | Loup | Dauphin |
| Mémoire | Cygne | Loutre | Cerf |
| Exploration | Chat | Lièvre | Cheval |

Si au moins l'un des deux sous-scores présente une **égalité au premier rang**, la sixième question « La lanterne du jardin » est posée. Ses points s'ajoutent alors aux deux sous-scores. En cas d'égalité persistante, même procédure de départage déterministe que pour la Maison.

Les axes et nuances ne sont pas affichés pendant la cérémonie : la découverte reste mystérieuse et ne révèle pas d'animal au fil des réponses.

## Validation exhaustive

Commande :

```bash
python validate.py
```

Le script utilise uniquement la bibliothèque standard Python, ne se connecte à aucun service et ne lit aucune donnée familiale.

| Contrôle | Maison | Patronus |
| --- | ---: | ---: |
| Combinaisons des questions de base | 4 096 | 1 024 |
| Combinaisons avec toutes variantes de départage simulées | 16 384 | 4 096 |
| Résultats effectivement accessibles | 4/4 | 12/12 |
| Cas nécessitant la question supplémentaire | 17,3 % | 26,6 % |
| Écart relatif maximal à l'effectif théorique uniforme | 3,8 % | 7,8 % |
| Résultat | PASS | PASS |

**Répartition des Maisons** (sur 16 384 simulations incluant les quatre réponses hypothétiques au départage) : Gryffondor 25,77 %, Serpentard 24,05 %, Serdaigle 25,95 %, Poufsouffle 24,22 %.

**Répartition des Patronus** : chacun est entre 7,96 % et 8,98 % des 4 096 simulations ; cible uniforme théorique 8,33 %.

**Interprétation indispensable :** ces pourcentages supposent des réponses indépendantes et équiprobables. Ce contrôle prouve que l'algorithme ne rend aucun résultat inaccessible et ne privilégie pas fortement un résultat **dans ce modèle de simulation**. Il ne démontre **pas** l'équilibre parmi de vrais utilisateurs, leurs réponses n'étant pas nécessairement uniformes.

Les exemples de réponses permettant d'obtenir chaque résultat sont inclus dans `qa-results.json`.

## Contrat d'intégration ultérieure E06 / E05

- Réutiliser le **membre canonique** du foyer. Un compte utilisateur n'est pas un membre par définition.
- Un même vecteur de réponses et une même version de barème produisent toujours la même Maison et le même Patronus.
- Conserver le résultat final, l'identifiant stable et `algorithmVersion`; aucune obligation de conserver les réponses détaillées après validation.
- Si un test est interrompu, ses réponses temporaires peuvent rester dans un brouillon local, sans modification du profil canonique.
- Le résultat peut être modifié manuellement ou après un nouveau test ; cela ne modifie jamais les runes, le grade, ni les récompenses.
- Les questions complémentaires sont affichées **seulement** lorsque la règle les demande ; le résultat ne doit pas dépendre d'une réponse facultative qui n'a pas été posée.
- Conserver les **IDs de réponse**, même si leur présentation ou leur ordre graphique est modifié par Stitch.
- Cette validation est une preuve de **calcul local**, ni une recette d'intégration E05/E06, ni une validation serveur/multi-comptes.

**Contenu du dossier :** `dobby-e06-scoring-v1.json` (règles, questions, pondérations), `validate.py` (calcul et contrôle), `qa-results.json` (résultats et exemples), `README.md` (présente note).
