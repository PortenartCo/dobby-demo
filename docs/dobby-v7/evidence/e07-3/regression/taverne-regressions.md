# Régressions historiques Taverne / panier — E07.3

| Test | Résultat | Cause et adaptation |
|---|---|---|
| `e07.cjs` | **PASS 320/390/1440** | [RED initial](logs/taverne-e07-red.log) : le texte « Aucun dîner prévu » et l’action unique correspondent à l’ancien écran exclusivement Soir. Attente remplacée par deux créneaux et deux actions vides. Le choix de repas passe par un bouton de jour du calendrier compact, puis le créneau du détail. La date et le créneau Soir transmis au formulaire natif sont maintenant vérifiés explicitement. [GREEN](logs/taverne-e07-green.log). |
| `e07-1.cjs` | **PASS 320/390/1440** | [RED initial](logs/taverne-e07-1-red.log) : deux boutons réels dans « Les Repas du Jour » au lieu de l’ancien bouton unique. La composition Midi/Soir et les sept boutons du calendrier remplacent les sept grandes cartes. Les contrôles des images réelles, repli local/externe, accès Midi/Soir et dates portent sur le détail du jour effectivement sélectionné. Le CTA « Inscrire une nouvelle recette » passe par le choix « Saisie manuelle » avant le même formulaire existant. [GREEN](logs/taverne-e07-1-green.log). |
| `e07-consolidation.cjs` | **PASS 320/390/1440 sans modification** | [Journal](logs/taverne-e07-consolidation-green.log). Les assertions de période inclusive, Midi/Soir, quantités manuelles, reçus, confirmation répétée idempotente, rechargement, historique, fin des courses, compteurs et dimensions CTA restent inchangées. |

Les adaptations ne changent aucun writer, modèle, panier ou assertion métier. `e07-1.cjs` conserve notamment les véritables modifications indépendantes Midi/Soir, le marquage « préparé », la persistance après rechargement, l’ajout de provisions, le dock fixe après défilement et ses cinq destinations.

Exécution avec `DOBBY_TEST_ORIGIN=http://127.0.0.1:8894`, contextes Chromium éphémères, fixtures TEST, requêtes extérieures bloquées. Aucune campagne globale lancée. Les variables `DOBBY_E07_EVIDENCE_DIR` et `DOBBY_E07_EVIDENCE` redirigent toutes les captures vers ce nouveau dossier ; les anciennes preuves E07/E07.1/consolidation restent intactes.

Captures : [E07](e07/), [E07.1](e07-1/after/), [panier et période](e07-consolidation/after/).
