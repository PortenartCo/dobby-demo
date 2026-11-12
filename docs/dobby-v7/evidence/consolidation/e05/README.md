# Consolidation E05 — profil magique

Contrat : `REVIEW-CONSOLIDATION.md`, E05-01 à E05-05. Départ applicatif `a84f67acf8f5cbfd59475c2137ec70e1a20732f7` ; Gate 0 documentaire `bb95132`. Données des captures exclusivement fictives, compte réel non utilisé, requêtes externes bloquées dans les tests.

## État des cinq exigences

| ID | État initial | Réalisation / état final du lot |
|---|---|---|
| E05-01 | Pictogrammes SVG originaux ; aucun blason officiel autorisé | **BLOQUÉ — droits et fichiers autorisés manquants.** Les quatre dessins ont été retirés. Nom, couleurs et identité de Maison conservés ; une note sobre signale le blason officiel indisponible. Aucun dessin généré n’est présenté comme officiel. |
| E05-02 | Catalogue d’identifiants sans descriptions | **VÉRIFIÉ.** Catalogue unique `magic-content.js` : quatre Maisons (origine, fondateur, valeurs) et douze animaux (caractéristiques et symbolique ludique). Les résultats E06 consomment les mêmes chaînes ; égalité exacte vérifiée pour 4+12 résultats aux trois largeurs dans le lot E06. |
| E05-03 | Total et barre natifs, pas d’insigne central | **Implémenté et vérifié.** Insigne SVG natif agrandi dans un médaillon, grade et total mis en valeur, jauge et bornes natives, prochain palier, gains dépliés et lisibles. Douze grades vérifiés ; aucun seuil, barème ou crédit modifié. |
| E05-04 | Questionnaires déjà raccordés avec confirmation | **VÉRIFIÉ — NON-RÉGRESSION.** Actions natives `restart` inchangées. Retests, confirmation, refus de stockage et maintien des anciens choix couverts par la recette `e06-edge.cjs` du lot E06, sortie 0. |
| E05-05 | Persona fictive uniquement dans le bundle isolé | **Conservé.** Aucune modification du résolveur natif, du stockage d’identité ou de la configuration de démo dans ce lot. Le profil source continue de demander un choix explicite lorsqu’aucun lien vérifié n’existe. |

## Blasons officiels : provenance et droits

| Maison / ID | Référence officielle vérifiée | Version familiale privée | Démonstration publique |
|---|---|---|---|
| Gryffondor / `gryffindor` | [Page officielle Gryffindor](https://www.harrypotter.com/house/gryffindor) | Fichier officiel et droit d’utilisation non fournis ; non incorporé | Autorisation de republication non établie ; non incorporé |
| Serpentard / `slytherin` | [Page officielle Slytherin](https://www.harrypotter.com/house/slytherin) | Fichier officiel et droit d’utilisation non fournis ; non incorporé | Autorisation de republication non établie ; non incorporé |
| Serdaigle / `ravenclaw` | [Page officielle Ravenclaw](https://www.harrypotter.com/house/ravenclaw) | Fichier officiel et droit d’utilisation non fournis ; non incorporé | Autorisation de republication non établie ; non incorporé |
| Poufsouffle / `hufflepuff` | [Page officielle Hufflepuff](https://www.harrypotter.com/house/hufflepuff) | Fichier officiel et droit d’utilisation non fournis ; non incorporé | Autorisation de republication non établie ; non incorporé |

Vérification web des sources primaires le 10 novembre 2026. Les [conditions officielles, version ROW](https://www.harrypotter.com/terms/terms-row), mises à jour le 4 octobre 2024 selon la page, réservent les droits (§3) et encadrent reproduction/publication (§10). Elles ne fournissent aucune autorisation identifiée de republier ces visuels dans notre démonstration GitHub Pages. Une utilisation privée ne vaut pas autorisation publique.

Les sources Stitch E06 contiennent quatre URL Google avec des libellés « blason ». Ces libellés ne prouvent ni l’authenticité officielle des images ni les droits de redistribution. Aucun de ces fichiers n’a été récupéré pour contourner le blocage. L’ancien inventaire E05 attestait seulement quatre SVG originaux ; leur ancien statut ne satisfait pas la nouvelle décision utilisateur.

Déblocage : identifier les fichiers officiels souhaités, leur provenance et une autorisation couvrant l’usage concerné, notamment la republication sur l’URL publique. Aucun droit n’est présumé acquis.

## Catalogue commun : 4 Maisons et 12 Patronus

Les textes français sont de courtes rédactions originales. Pour les Maisons, les faits sur les fondateurs sont vérifiés dans [l’article officiel consacré aux fondateurs](https://www.harrypotter.com/features/our-top-10-fascinating-facts-about-the-hogwarts-founders), les valeurs/animaux/couleurs dans [le guide officiel des Maisons](https://www.harrypotter.com/features/hogwarts-house-meanings). Aucun passage n’est recopié ; aucun résultat n’est présenté comme un profil psychologique réel.

| ID Maison | Fondateur | Origine / valeurs présentes |
|---|---|---|
| `gryffindor` | Godric Gryffondor | Fondation de Poudlard ; courage, détermination, chevalerie ; lion, rouge/or |
| `slytherin` | Salazar Serpentard | Fondation de Poudlard ; ambition, ingéniosité, détermination ; serpent, vert/argent |
| `ravenclaw` | Rowena Serdaigle | Fondation de Poudlard ; savoir, curiosité, liberté d’esprit ; aigle, bleu/bronze |
| `hufflepuff` | Helga Poufsouffle | Fondation de Poudlard ; loyauté, équité, persévérance ; blaireau, jaune/noir |

Les symboliques protectrices des animaux sont **une interprétation ludique originale DOBBY**, pas une signification canonique attribuée à Harry Potter. Les observations animales simples ont été recoupées avec les fiches universitaires Animal Diversity Web et NOAA ; ces liens sont aussi conservés dans `DobbyMagicContent.sources.animalFacts`. Aucune image de ces sources n’est incorporée.

| ID Patronus | Animal / fait bref | Symbolique ludique | Source factuelle vérifiée | Illustration locale |
|---|---|---|---|---|
| `stag` | Cerf, herbivore et bois | Dignité, élan, protection | [ADW : Cervus elaphus](https://animaldiversity.org/accounts/Cervus_elaphus/) | Disponible, atlas original E05 cellule 1,1 |
| `otter` | Loutre, jeu et milieu aquatique | Joie, souplesse, entraide | [ADW : Lutra lutra](https://animaldiversity.org/accounts/Lutra_lutra/) | Disponible, cellule 1,2 |
| `fox` | Renard, canidé adaptable | Observation, adaptation, inventivité | [ADW : Vulpes vulpes](https://animaldiversity.org/accounts/Vulpes_vulpes/) | Disponible, cellule 1,3 |
| `wolf` | Loup, communication et meute | Solidarité, vigilance, fidélité | [ADW : Canis lupus](https://animaldiversity.org/accounts/Canis_lupus/) | Disponible, cellule 1,4 |
| `cat` | Chat, petit félin attentif | Calme, autonomie, discernement | [ADW : Felis catus](https://animaldiversity.org/accounts/Felis_catus/) | Disponible, cellule 2,1 |
| `owl` | Hibou, rapace souvent nocturne | Attention, recul, clarté | [ADW : Bubo bubo](https://animaldiversity.org/accounts/Bubo_bubo/) | Disponible, cellule 2,2 |
| `horse` | Cheval, herbivore sociable | Liberté, confiance, endurance | [ADW : Equus caballus](https://animaldiversity.org/accounts/Equus_caballus/) | Disponible, cellule 2,3 |
| `hare` | Lièvre, grandes oreilles et bonds | Vivacité, vigilance, nouvel élan | [ADW : Lepus europaeus](https://animaldiversity.org/accounts/Lepus_europaeus/) | Disponible, cellule 2,4 |
| `swan` | Cygne, oiseau d’eau territorial | Sérénité, fidélité, force paisible | [ADW : Cygnus olor](https://animaldiversity.org/accounts/Cygnus_olor/) | Disponible, cellule 3,1 |
| `lynx` | Lynx, oreilles en pinceaux et courte queue | Lucidité, patience, attention | [ADW : Lynx lynx](https://animaldiversity.org/accounts/Lynx_lynx/) | Disponible, cellule 3,2 |
| `badger` | Blaireau, terrier et vie nocturne | Constance, ancrage, refuge | [ADW : Meles meles](https://animaldiversity.org/accounts/Meles_meles/) | Disponible, cellule 3,3 |
| `dolphin` | Dauphin, mammifère marin communicant | Entraide, communication, joie | [NOAA : Common Bottlenose Dolphin](https://www.fisheries.noaa.gov/species/common-bottlenose-dolphin) | Disponible, cellule 3,4 |

L’atlas `assets/magic/patronuses.png` existant est conservé sans modification : SHA-256 `d5cfbc8a1eb77c015bf826af4d3b833013434fc3008e40ab83e1bacb54fa6acf`. L’inventaire historique [MEDIA.md](../../e05/MEDIA.md) décrit sa génération originale et les huit portraits. Les insignes restent ceux de `DobbyMemberAvatar.create()` ; le profil clone leur SVG et lit exclusivement `rewardSummary()`.

## Captures comparatives

| Largeur | Avant | Après |
|---|---|---|
| 320 px | [Avant](before-320.png) | [Après](after-320.png) |
| 390 px | [Avant](before-390.png) | [Après](after-390.png) |
| 1440 px | [Avant](before-1440.png) | [Après](after-1440.png) |

Même membre TEST, Maison Serpentard, Patronus Renard, 85 runes confirmées ; historique ouvert avant et après. Les captures sont prises après disponibilité du profil ; les illustrations sont visibles dans les trois captures après, inspectées visuellement pendant le lot. Le test contrôle les débordements aux trois largeurs. Revue utilisateur distincte.

## Vérifications du lot

- **RED réel** : `e05-consolidation.cjs` échoue initialement sur l’absence du fondateur de la Maison sélectionnée, avant les changements produit.
- Préparation du harnais : correction du paramètre de la façade native (`p`, pas `values`) avant ce RED. L’erreur de préparation n’était pas une anomalie produit.
- **PASS 320/390/1440** : nouveau test `e05-consolidation.cjs`, quatre Maisons et douze Patronus sélectionnés par les formulaires natifs, descriptions adaptées au profil, rechargement, historique et ledger inchangés, insigne central présent, blocage des blasons explicite.
- **PASS des douze grades** : totaux 0/50/100/200/350/550/800/1100/1500/2000/2600/3300, formes/matières natives, progression 85 = 35/50, prochain palier à 100, absence de faux palier après le dernier grade.
- `node --check` sur les deux scripts produit et le nouveau test ; `git diff --check` ciblé : aucune erreur.
- **PASS `e05.cjs` aux trois largeurs**, sortie 0 : [journal](profile-regression.log). Quatre thèmes, sauvegardes natives, avatars partagés, chargement, choix explicite du membre et navigation. Son option de sortie de captures permet de conserver l’ancienne preuve intacte : `DOBBY_E05_EVIDENCE_DIR=docs/dobby-v7/evidence/consolidation/e05/themes`.
- **PASS `e05-edge.cjs`**, sortie 0 : [journal](profile-edge.log). Douze Patronus, huit portraits, champs inconnus conservés, modification distante/contexte bloqués, clavier et cinq accès au profil sans lien de compte inventé.
- Incident conservé : une première tentative `e05.cjs` s’est arrêtée au chargement initial >10 s pendant neuf scripts navigateur concurrents, avant toute assertion produit ; le serveur répondait HTTP200 en 7 ms. [Journal de cette tentative](initial-load-incident.log). Reprise identique réussie, sans modifier les assertions.
- **RED puis GREEN ciblé 390** pour un ledger natif incompatible : [échec causal](unsupported-ledger-red.log), [réussite](unsupported-ledger-green.log). Le décor retourne le diagnostic natif déjà prévu au lieu de lever une nouvelle exception ; aucune donnée n’est réparée ou supprimée, l’édition du profil reste accessible. Une tentative intermédiaire de ce seul cas a rencontré `ERR_CONNECTION_REFUSED` après disparition du serveur de tests 8789 ; reprise sur serveur local statique 8795, sans changement produit lié au serveur.
- **PASS `e06-edge.cjs`**, sortie 0 : [preuve du lot E06](../e06/source-edge.log). Maintien des 85 runes et des anciens résultats avant confirmation, refus du writer et des métadonnées, contexte et profil périmés protégés. La suite `e06-consolidation.cjs` vérifie les descriptions communes pour 4+12 résultats à 320/390/1440. Aucune recette de synchronisation entre comptes réels revendiquée.
- Revue technique indépendante en lecture seule et inspection de la capture 390 : aucun finding confirmé. Aucun test supplémentaire relancé par le relecteur.

E05-01 reste **BLOQUÉ**, même lorsque les tests de conservation et de présentation passent.
