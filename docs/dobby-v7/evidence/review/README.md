# Preuves des corrections de la revue finale

Profils Chromium éphémères, aucun compte réel. `tests/register-review.cjs` couvre quatorze scénarios aux deux largeurs. Les écritures/fichiers sont ceux des gestionnaires et de l’IndexedDB natives, pas un stockage de remplacement.

| État | 320 px | 390 px |
|---|---|---|
| Brouillon contact conservé, note reçue du foyer non écrasée | [Capture](menu-contact-draft-320.png) | [Capture](menu-contact-draft-390.png) |
| Entretien non enregistré conservé après ajout d’un fichier | [Capture](maintenance-file-draft-320.png) | [Capture](maintenance-file-draft-390.png) |
| Équipement Garage, sans statut/certification fictifs | [Capture](source-facts-320.png) | [Capture](source-facts-390.png) |

Les assertions vérifient aussi les refus de recréation, l’absence de mutation d’un autre élément de liste, les brouillons membre/médical, la portée privée et la fin du verrou après suppression/remplacement d’une fiche pendant le vrai stockage local. Le résultat complet de la suite générale est conservé dans les artefacts CI.

Le scénario `contact-sharing-disclosure` interdit les promesses de conservation exclusivement locale dans un répertoire que le module Famille peut synchroniser. Les règles natives et les données restent inchangées.
