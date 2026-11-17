# 56 contrôles — nouvelle passe de revue

Ce tableau reprend les 56 critères initiaux et indique les preuves de la correction finale. Les PASS désignent des fixtures et parcours automatisés, jamais une recette réelle A/B. Les résultats de CI et de publication sont attachés à la description de PR17 au SHA exact ; ils complètent ce tableau après le commit de la source.

Le contrôle D05 applique la demande finale prioritaire : une fiche archivée est en lecture seule, y compris au writer. Les données sont conservées ; la modification redevient possible après réactivation. La campagne historique de 525 tests déjà acquise n’est pas répétée manuellement. Les tests pertinents des writers, de synchronisation et des modules conservés sont rejoués, puis la CI de la PR.

| Lot | ID | Critère | Résultat | Preuve actuelle |
|---|---|---|---|---|
| UI | U01 | Stitch22-screen.png est affichée, ancien visuel avec horloge absent. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U02 | Le cartouche « ARCHIVES & SCRIPTORIUM » est en bas à droite, dans le hero. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U03 | Le cartouche ne masque pas Dobby et reste lisible à 320 px. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U04 | Le hero conserve proportions et sujet à 390, 768 et 1440 px. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U05 | L’en-tête et le dock DOBBY restent visibles et navigables. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U06 | Aucune superposition sous-titre / barre de recherche. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U07 | Une seule bordure visuelle pour la barre de recherche. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U08 | Loupe et effacement sont alignés et actionnables. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U09 | La recherche réagit instantanément et ne réinitialise pas le curseur. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U10 | Aucun filtre « Toutes » / « Assurances » ni autre filtre mort. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U11 | Aucune action Ajouter un document, Importer un fichier ou lien « Autre présentation » sur Archives. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U12 | Aucun export/import sauvegarde JSON ni explication technique sur Archives. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U13 | Le bloc « Enregistrement et partage » / synchronisation du foyer est absent d’Archives. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U14 | L’écran sans archive affiche exactement un vide approprié et aucune fiche fictive. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| UI | U15 | La liste des archives est compacte et utilisable à 320/390/768/1440 px. | PASS technique | archives-ui.cjs ; after-list-{320,390,768,1440}.png ; before.json / after.json |
| CYCLE | A01 | Action Archiver depuis un contrat actif, avec confirmation avant écritures. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A02 | Annulation d’archivage : aucune mutation ni nouvel archivage. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A03 | Confirmation : le contrat quitte la liste active et apparaît dans Archives. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A04 | L’objet archivé conserve son ID, ses champs, son historique et ses références. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A05 | Les PDF et avenants du contrat restent consultables depuis l’archive. | PASS technique | archived PDF original + avenant, octets exacts ; after-final-contract-archived ; archives-native-consultation.cjs |
| CYCLE | A06 | Avertissement explicite sur l’absence de résiliation contractuelle. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A07 | Action Archiver depuis un équipement, sans supprimer pièces ni historiques. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A08 | Action Archiver depuis une recette personnelle, sans altérer menus déjà planifiés. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A09 | Action Archiver sur les contacts/notes compatibles, selon matrice métier validée. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A10 | Un second clic / rejeu n’ajoute pas de copie et ne réécrit pas l’historique. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A11 | Tri décroissant selon la vraie date d’archivage. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A12 | Recherche par titre, type et module source ; pas de fuite de données privées. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A13 | Consulter ouvre la fiche canonique avec statut « Archivé ». | PASS technique | Routes natives Contrat/Assurance, équipement, recette, contact, mémos et document autonome ; after-*.png |
| CYCLE | A14 | Réactiver depuis Archives déclenche une confirmation obligatoire. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A15 | Annulation réactivation : aucune mutation. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A16 | Réactivation restitue le même objet dans le module source et retire la carte Archives. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A17 | Réactivation ne réinvente aucune échéance, notification ou intervention. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| CYCLE | A18 | Réactivation avec droit insuffisant est refusée sans mutation. | PASS technique | consultation-races-green.log (refus du bouton et dispatch direct) ; archives-writer.test.cjs |
| CYCLE | A19 | Réactivation d’une source absente/refusée produit un message honnête. | PASS technique | archives-native-consultation.cjs (9 variantes × 4 largeurs) ; archives-ui.cjs ; archives-writer.test.cjs |
| DONNEES | D01 | Une fiche ancienne sans champ d’archive reste active sans modification. | PASS technique | native-writers-sync.log ; archives-sources.cjs ; register-documents-sync.cjs ; source-boundaries.log |
| DONNEES | D02 | Les anciens documents autonomes non archivés restent accessibles ailleurs. | PASS technique | Comparaison exacte document-library-active-{320,390,768,1440}.html ; document-regression.log |
| DONNEES | D03 | Persistance après rechargement du navigateur du statut et des métadonnées. | PASS technique | native-writers-sync.log ; archives-sources.cjs ; register-documents-sync.cjs ; source-boundaries.log |
| DONNEES | D04 | Sauvegarde/rétablissement n’efface pas le statut ni les pièces des objets sauvegardés. | PASS technique | native-writers-sync.log ; archives-sources.cjs ; register-documents-sync.cjs ; source-boundaries.log |
| DONNEES | D05 | Toute mutation d’une fiche archivée est refusée ; les données et le statut restent conservés. | PASS technique | attachment-race-green.log ; consultation-races-green.log ; archives-sources.cjs |
| DONNEES | D06 | Conflit de révision / brouillon périmé refusé sans succès trompeur. | PASS technique | consultation-races-green.log (sélecteurs, confirmation périmée, écritures concurrentes) ; native-writers-sync.log |
| DONNEES | D07 | Synchronisation de statut testé avec fixtures, sans revendiquer un test A/B réel. | PASS technique | native-writers-sync.log ; archives-sources.cjs ; register-documents-sync.cjs ; source-boundaries.log |
| DONNEES | D08 | Ancien pair omettant le statut ne désarchive pas silencieusement un enregistrement. | PASS technique | native-writers-sync.log ; archives-sources.cjs ; register-documents-sync.cjs ; source-boundaries.log |
| DONNEES | D09 | Un objet local reste local et ne devient pas partagé par son archivage. | PASS technique | native-writers-sync.log ; archives-sources.cjs ; register-documents-sync.cjs ; source-boundaries.log |
| DONNEES | D10 | Droits Enfant, foyer différent et session expirée refusés au writer. | PASS technique | native-writers-sync.log ; archives-sources.cjs ; register-documents-sync.cjs ; source-boundaries.log |
| DONNEES | D11 | Aucune copie physique des PDF/pièces vers un bucket Archives. | PASS technique | archives-native-consultation.cjs : mêmes cinq clés et mêmes empreintes binaires après les cycles |
| DONNEES | D12 | Pas de migration SQL distante ni réactivation des gates V3. | PASS technique | native-writers-sync.log ; archives-sources.cjs ; register-documents-sync.cjs ; source-boundaries.log |
| REGRESSION | R01 | Le module Contrats E08 reste fonctionnel : formulaire, renon et pièces. | PASS technique | archives-regression.log ; contracts-regression.log ; maison-regression.log ; contrôles de CI au SHA de PR17 |
| REGRESSION | R02 | Import IA ZIP/JSON de contrats reste accessible depuis Contrats. | PASS technique | archives-regression.log ; contracts-regression.log ; maison-regression.log ; contrôles de CI au SHA de PR17 |
| REGRESSION | R03 | Les opérations de sauvegarde restent accessibles dans Menu → Paramètres. | PASS technique | archives-regression.log ; contracts-regression.log ; maison-regression.log ; contrôles de CI au SHA de PR17 |
| REGRESSION | R04 | La synchronisation familiale existante reste opérationnelle sur fixtures. | PASS technique | archives-regression.log ; contracts-regression.log ; maison-regression.log ; contrôles de CI au SHA de PR17 |
| REGRESSION | R05 | L’ajout/la modification d’équipement restent possibles. | PASS technique | archives-regression.log ; contracts-regression.log ; maison-regression.log ; contrôles de CI au SHA de PR17 |
| REGRESSION | R06 | L’utilisation des recettes et la liste de courses restent intactes. | PASS technique | archives-regression.log ; contracts-regression.log ; maison-regression.log ; contrôles de CI au SHA de PR17 |
| REGRESSION | R07 | La navigation entre Archives, détail source et retour fonctionne. | PASS technique | archives-regression.log ; contracts-regression.log ; maison-regression.log ; contrôles de CI au SHA de PR17 |
| REGRESSION | R08 | Les gardes Parents/Enfants ne sont pas affaiblis. | PASS technique | archives-regression.log ; contracts-regression.log ; maison-regression.log ; contrôles de CI au SHA de PR17 |
| REGRESSION | R09 | La suite ciblée et la CI finale passent au SHA livré. | CI liée à PR17 | Checks de PR17 au SHA livré ; le bilan de clôture de la PR fournit le résultat exact |
| REGRESSION | R10 | PR et preuves produites ; aucune fusion ni modification du site principal. | PASS technique | PR17 en brouillon ; nouveau dossier isolé ; préservation Git/HTTP et parcours hébergés dans reçu de publication |

La clôture des 56 contrôles exige la CI verte et les parcours réels sur le nouvel aperçu hébergé. Voir le reçu final de PR17 et [la revue](REVIEW.md). Les preuves des états actifs/archivés sont sous `evidence/`, à quatre largeurs. Le contrôle Auth31 n’est pas rouvert. La réserve historique Missions et la recette familiale réelle différée demeurent séparées.
