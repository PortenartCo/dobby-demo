# Cas de recette — Archives & Scriptorium

Les statuts ci-dessous sont **À TESTER** au moment de la préparation du pack. Seul Codex peut les compléter après exécution et preuves observables. `PASS` n’est admis qu’avec un test réellement exécuté.

| Lot | ID | Critère observable | Résultat | Preuve |
|---|---|---|---|---|
| UI | U01 | Stitch22-screen.png est affichée, ancien visuel avec horloge absent. | À TESTER | — |
| UI | U02 | Le cartouche « ARCHIVES & SCRIPTORIUM » est en bas à droite, dans le hero. | À TESTER | — |
| UI | U03 | Le cartouche ne masque pas Dobby et reste lisible à 320 px. | À TESTER | — |
| UI | U04 | Le hero conserve proportions et sujet à 390, 768 et 1440 px. | À TESTER | — |
| UI | U05 | L’en-tête et le dock DOBBY restent visibles et navigables. | À TESTER | — |
| UI | U06 | Aucune superposition sous-titre / barre de recherche. | À TESTER | — |
| UI | U07 | Une seule bordure visuelle pour la barre de recherche. | À TESTER | — |
| UI | U08 | Loupe et effacement sont alignés et actionnables. | À TESTER | — |
| UI | U09 | La recherche réagit instantanément et ne réinitialise pas le curseur. | À TESTER | — |
| UI | U10 | Aucun filtre « Toutes » / « Assurances » ni autre filtre mort. | À TESTER | — |
| UI | U11 | Aucune action Ajouter un document, Importer un fichier ou lien « Autre présentation » sur Archives. | À TESTER | — |
| UI | U12 | Aucun export/import sauvegarde JSON ni explication technique sur Archives. | À TESTER | — |
| UI | U13 | Le bloc « Enregistrement et partage » / synchronisation du foyer est absent d’Archives. | À TESTER | — |
| UI | U14 | L’écran sans archive affiche exactement un vide approprié et aucune fiche fictive. | À TESTER | — |
| UI | U15 | La liste des archives est compacte et utilisable à 320/390/768/1440 px. | À TESTER | — |
| CYCLE | A01 | Action Archiver depuis un contrat actif, avec confirmation avant écritures. | À TESTER | — |
| CYCLE | A02 | Annulation d’archivage : aucune mutation ni nouvel archivage. | À TESTER | — |
| CYCLE | A03 | Confirmation : le contrat quitte la liste active et apparaît dans Archives. | À TESTER | — |
| CYCLE | A04 | L’objet archivé conserve son ID, ses champs, son historique et ses références. | À TESTER | — |
| CYCLE | A05 | Les PDF et avenants du contrat restent consultables depuis l’archive. | À TESTER | — |
| CYCLE | A06 | Avertissement explicite sur l’absence de résiliation contractuelle. | À TESTER | — |
| CYCLE | A07 | Action Archiver depuis un équipement, sans supprimer pièces ni historiques. | À TESTER | — |
| CYCLE | A08 | Action Archiver depuis une recette personnelle, sans altérer menus déjà planifiés. | À TESTER | — |
| CYCLE | A09 | Action Archiver sur les contacts/notes compatibles, selon matrice métier validée. | À TESTER | — |
| CYCLE | A10 | Un second clic / rejeu n’ajoute pas de copie et ne réécrit pas l’historique. | À TESTER | — |
| CYCLE | A11 | Tri décroissant selon la vraie date d’archivage. | À TESTER | — |
| CYCLE | A12 | Recherche par titre, type et module source ; pas de fuite de données privées. | À TESTER | — |
| CYCLE | A13 | Consulter ouvre la fiche canonique avec statut « Archivé ». | À TESTER | — |
| CYCLE | A14 | Réactiver depuis Archives déclenche une confirmation obligatoire. | À TESTER | — |
| CYCLE | A15 | Annulation réactivation : aucune mutation. | À TESTER | — |
| CYCLE | A16 | Réactivation restitue le même objet dans le module source et retire la carte Archives. | À TESTER | — |
| CYCLE | A17 | Réactivation ne réinvente aucune échéance, notification ou intervention. | À TESTER | — |
| CYCLE | A18 | Réactivation avec droit insuffisant est refusée sans mutation. | À TESTER | — |
| CYCLE | A19 | Réactivation d’une source absente/refusée produit un message honnête. | À TESTER | — |
| DONNEES | D01 | Une fiche ancienne sans champ d’archive reste active sans modification. | À TESTER | — |
| DONNEES | D02 | Les anciens documents autonomes non archivés restent accessibles ailleurs. | À TESTER | — |
| DONNEES | D03 | Persistance après rechargement du navigateur du statut et des métadonnées. | À TESTER | — |
| DONNEES | D04 | Sauvegarde/rétablissement n’efface pas le statut ni les pièces des objets sauvegardés. | À TESTER | — |
| DONNEES | D05 | Les mises à jour ultérieures du contrat préservent son statut archivage. | À TESTER | — |
| DONNEES | D06 | Conflit de révision / brouillon périmé refusé sans succès trompeur. | À TESTER | — |
| DONNEES | D07 | Synchronisation de statut testé avec fixtures, sans revendiquer un test A/B réel. | À TESTER | — |
| DONNEES | D08 | Ancien pair omettant le statut ne désarchive pas silencieusement un enregistrement. | À TESTER | — |
| DONNEES | D09 | Un objet local reste local et ne devient pas partagé par son archivage. | À TESTER | — |
| DONNEES | D10 | Droits Enfant, foyer différent et session expirée refusés au writer. | À TESTER | — |
| DONNEES | D11 | Aucune copie physique des PDF/pièces vers un bucket Archives. | À TESTER | — |
| DONNEES | D12 | Pas de migration SQL distante ni réactivation des gates V3. | À TESTER | — |
| REGRESSION | R01 | Le module Contrats E08 reste fonctionnel : formulaire, renon et pièces. | À TESTER | — |
| REGRESSION | R02 | Import IA ZIP/JSON de contrats reste accessible depuis Contrats. | À TESTER | — |
| REGRESSION | R03 | Les opérations de sauvegarde restent accessibles dans Menu → Paramètres. | À TESTER | — |
| REGRESSION | R04 | La synchronisation familiale existante reste opérationnelle sur fixtures. | À TESTER | — |
| REGRESSION | R05 | L’ajout/la modification d’équipement restent possibles. | À TESTER | — |
| REGRESSION | R06 | L’utilisation des recettes et la liste de courses restent intactes. | À TESTER | — |
| REGRESSION | R07 | La navigation entre Archives, détail source et retour fonctionne. | À TESTER | — |
| REGRESSION | R08 | Les gardes Parents/Enfants ne sont pas affaiblis. | À TESTER | — |
| REGRESSION | R09 | La suite ciblée et la CI finale passent au SHA livré. | À TESTER | — |
| REGRESSION | R10 | La PR et les captures avant/après sont produites sans fusion/déploiement abusif. | À TESTER | — |

**Total : 56 contrôles, aucun exécuté par ce pack.**

## Exigences de preuves

- Captures mobile et PC du nouveau bandeau + liste vide/pleine + dialogues.
- Logs des tests ciblés avec commandes, code de sortie et SHA.
- Comparaison avant/après des écritures et identifiants.
- Résultats séparant test fixture, intégration, publication et vrai login A/B.
- Matrice d’adaptateurs `source → writer → identifiant → permissions → statut`, exceptions motivées.
- PR non fusionnée et checkpoint de reprise.
