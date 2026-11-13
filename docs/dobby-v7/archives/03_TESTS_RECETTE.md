# Cas de recette — Archives & Scriptorium

Recette technique locale du 13 novembre 2026. PASS désigne uniquement les tests et captures exécutés sur données TEST et transports simulés. Aucun PASS ne vaut recette réelle sur deux comptes. Les scripts cités se trouvent dans essai-stitch-v7/tests ou essai-stitch-v5-famille/tests.

| Lot | ID | Critère observable | Résultat | Preuve |
|---|---|---|---|---|
| UI | U01 | Stitch22-screen.png est affichée, ancien visuel avec horloge absent. | PASS | assets/archives/provenance.json et evidence/empty-{320,390,768,1440}.png |
| UI | U02 | Le cartouche « ARCHIVES & SCRIPTORIUM » est en bas à droite, dans le hero. | PASS | evidence/empty-320.png ; archives-ui.cjs (position relative mesurée) |
| UI | U03 | Le cartouche ne masque pas Dobby et reste lisible à 320 px. | PASS | evidence/empty-320.png (revue visuelle) |
| UI | U04 | Le hero conserve proportions et sujet à 390, 768 et 1440 px. | PASS | evidence/empty-390.png, list-768.png, list-1440.png (revue visuelle) |
| UI | U05 | L’en-tête et le dock DOBBY restent visibles et navigables. | PASS | archives-ui.cjs ; evidence/empty-320.png ; register-navigation |
| UI | U06 | Aucune superposition sous-titre / barre de recherche. | PASS | archives-ui.cjs (champ après hero) ; evidence/empty-390.png |
| UI | U07 | Une seule bordure visuelle pour la barre de recherche. | PASS | evidence/empty-320.png, empty-390.png ; archives.css |
| UI | U08 | Loupe et effacement sont alignés et actionnables. | PASS | archives-ui.cjs (clic effacement et focus) |
| UI | U09 | La recherche réagit instantanément et ne réinitialise pas le curseur. | PASS | archives-ui.cjs (insertion au milieu sans recréer le champ) |
| UI | U10 | Aucun filtre « Toutes » / « Assurances » ni autre filtre mort. | PASS | archives-ui.cjs ; evidence/empty-320.png |
| UI | U11 | Aucune action Ajouter un document, Importer un fichier ou lien « Autre présentation » sur Archives. | PASS | archives-ui.cjs (aucun input file) ; evidence/empty-390.png |
| UI | U12 | Aucun export/import sauvegarde JSON ni explication technique sur Archives. | PASS | archives-ui.cjs ; evidence/empty-320.png |
| UI | U13 | Le bloc « Enregistrement et partage » / synchronisation du foyer est absent d’Archives. | PASS | archives-ui.cjs (aucun data-rg-state) ; evidence/empty-390.png |
| UI | U14 | L’écran sans archive affiche exactement un vide approprié et aucune fiche fictive. | PASS | archives-ui.cjs (état vierge injecté TEST) ; evidence/empty-320.png |
| UI | U15 | La liste des archives est compacte et utilisable à 320/390/768/1440 px. | PASS | archives-ui.cjs quatre largeurs ; evidence/list-{320,390,768,1440}.png |
| CYCLE | A01 | Action Archiver depuis un contrat actif, avec confirmation avant écritures. | PASS | archives-ui.cjs ; evidence/confirm-320.png ; archives-writer.test.cjs |
| CYCLE | A02 | Annulation d’archivage : aucune mutation ni nouvel archivage. | PASS | archives-ui.cjs et archives-writer.test.cjs (zéro save avant confirmation) |
| CYCLE | A03 | Confirmation : le contrat quitte la liste active et apparaît dans Archives. | PASS | archives-ui.cjs (liste Contrats puis Archives) |
| CYCLE | A04 | L’objet archivé conserve son ID, ses champs, son historique et ses références. | PASS | archives-writer.test.cjs ; archives-sources.cjs ; evidence/native-suite.log |
| CYCLE | A05 | Les PDF et avenants du contrat restent consultables depuis l’archive. | PASS | archives-sources.cjs (original + avenant PDF, octets exacts) ; evidence/archived-contract-pdf-390.png |
| CYCLE | A06 | Avertissement explicite sur l’absence de résiliation contractuelle. | PASS | archives-ui.cjs ; evidence/confirm-320.png |
| CYCLE | A07 | Action Archiver depuis un équipement, sans supprimer pièces ni historiques. | PASS | archives-ui.cjs ; archives-writer.test.cjs (houseLogs/houseDocs inchangés) |
| CYCLE | A08 | Action Archiver depuis une recette personnelle, sans altérer menus déjà planifiés. | PASS | archives-sources.cjs ; archives-review.cjs planned/selection ; evidence/review-green.log |
| CYCLE | A09 | Action Archiver sur les contacts/notes compatibles, selon matrice métier validée. | PASS | archives-sources.cjs (contacts, mémos locaux et partagés) |
| CYCLE | A10 | Un second clic / rejeu n’ajoute pas de copie et ne réécrit pas l’historique. | PASS | archives-writer.test.cjs (rejeu sans save ni copie) |
| CYCLE | A11 | Tri décroissant selon la vraie date d’archivage. | PASS | archives-writer.test.cjs (dates injectées TEST, tri stable source/ID) |
| CYCLE | A12 | Recherche par titre, type et module source ; pas de fuite de données privées. | PASS | archives-writer.test.cjs (accents/type/module) ; archives-review.cjs isolation |
| CYCLE | A13 | Consulter ouvre la fiche canonique avec statut « Archivé ». | PASS | archives-ui.cjs, archives-sources.cjs ; evidence/detail-390.png |
| CYCLE | A14 | Réactiver depuis Archives déclenche une confirmation obligatoire. | PASS | archives-ui.cjs ; evidence/reactivate-390.png |
| CYCLE | A15 | Annulation réactivation : aucune mutation. | PASS | archives-ui.cjs et archives-writer.test.cjs |
| CYCLE | A16 | Réactivation restitue le même objet dans le module source et retire la carte Archives. | PASS | archives-ui.cjs ; archives-sources.cjs ; archives-writer.test.cjs |
| CYCLE | A17 | Réactivation ne réinvente aucune échéance, notification ou intervention. | PASS | archives-ui.cjs (échéance passée inchangée) ; archives-writer.test.cjs (historiques/plans) |
| CYCLE | A18 | Réactivation avec droit insuffisant est refusée sans mutation. | PASS | archives-writer.test.cjs (enfant refusé avant écriture) |
| CYCLE | A19 | Réactivation d’une source absente/refusée produit un message honnête. | PASS | archives-writer.test.cjs (source manquante) ; archives-review.cjs isolation |
| DONNEES | D01 | Une fiche ancienne sans champ d’archive reste active sans modification. | PASS | archives-writer.test.cjs (list lecture seule, aucun état ajouté) |
| DONNEES | D02 | Les anciens documents autonomes non archivés restent accessibles ailleurs. | PASS | Paramètres → Documents enregistrés ; archives-ui.cjs ; register-documents.cjs |
| DONNEES | D03 | Persistance après rechargement du navigateur du statut et des métadonnées. | PASS | archives-ui.cjs (reload) ; archives-sources.cjs |
| DONNEES | D04 | Sauvegarde/rétablissement n’efface pas le statut ni les pièces des objets sauvegardés. | PASS | archives-sources.cjs (restauration complète réelle + imports partiels anciens) ; evidence/partial-backup-red.log |
| DONNEES | D05 | Les mises à jour ultérieures du contrat préservent son statut archivage. | PASS | contrats writer/save merge ; archives-sources.cjs ; evidence/contracts-regression.log |
| DONNEES | D06 | Conflit de révision / brouillon périmé refusé sans succès trompeur. | PASS | archives-writer.test.cjs (snapshot source/contexte) ; archives-sources.cjs (confirmation périmée) |
| DONNEES | D07 | Synchronisation de statut testé avec fixtures, sans revendiquer un test A/B réel. | PASS | archives-sync.test.mjs ; register-documents-sync.cjs ; evidence/sync-green.log |
| DONNEES | D08 | Ancien pair omettant le statut ne désarchive pas silencieusement un enregistrement. | PASS | archives-sync.test.mjs (omission et réparation CAS) ; evidence/sync-repair-red.log |
| DONNEES | D09 | Un objet local reste local et ne devient pas partagé par son archivage. | PASS | archives-writer.test.cjs (aucun transport/fichier) ; contrats-sync (exclusion des locaux) |
| DONNEES | D10 | Droits Enfant, foyer différent et session expirée refusés au writer. | PASS | archives-writer.test.cjs ; archives-review.cjs isolation (route, API et formulaire natif) |
| DONNEES | D11 | Aucune copie physique des PDF/pièces vers un bucket Archives. | PASS | archives-writer.test.cjs (aucun store binaire disponible) ; archives-sources.cjs (octets conservés) |
| DONNEES | D12 | Pas de migration SQL distante ni réactivation des gates V3. | PASS | aucun fichier SQL/gate modifié ; AUDIT.md ; appels exclusivement locaux/fixtures |
| REGRESSION | R01 | Le module Contrats E08 reste fonctionnel : formulaire, renon et pièces. | PASS | evidence/contracts-regression.log (campagne Contrats complète) |
| REGRESSION | R02 | Import IA ZIP/JSON de contrats reste accessible depuis Contrats. | PASS | contracts-import-ui.cjs ; evidence/contracts-regression.log |
| REGRESSION | R03 | Les opérations de sauvegarde restent accessibles dans Menu → Paramètres. | PASS | archives-ui.cjs ; archives-sources.cjs (Menu/Paramètres/backup) ; register-tools.cjs |
| REGRESSION | R04 | La synchronisation familiale existante reste opérationnelle sur fixtures. | PASS | evidence/native-suite.log (496/496), sync-green.log et documents-sync.log (fixtures) |
| REGRESSION | R05 | L’ajout/la modification d’équipement restent possibles. | PASS | register-house.cjs et register-preservation.cjs ; evidence/register-regressions.log |
| REGRESSION | R06 | L’utilisation des recettes et la liste de courses restent intactes. | PASS | archives-review.cjs planned/selection ; evidence/cuisine-models.log ; grocery-isolated.log |
| REGRESSION | R07 | La navigation entre Archives, détail source et retour fonctionne. | PASS | archives-ui.cjs et register-navigation.cjs ; evidence/register-regressions.log |
| REGRESSION | R08 | Les gardes Parents/Enfants ne sont pas affaiblis. | PASS | archives-writer.test.cjs ; contrats-permissions ; evidence/native-suite.log |
| REGRESSION | R09 | La suite ciblée et la CI finale passent au SHA livré. | BLOCKED | suite Archives et native vertes ; historique exhaustif échoue sur ancien libellé E08, reproduit sur main : evidence/full-browser-suite.log et baseline-historical.log ; CI finale à constater |
| REGRESSION | R10 | La PR et les captures avant/après sont produites sans fusion/déploiement abusif. | PASS | PR https://github.com/PortenartCo/dobby-demo/pull/17 en brouillon ; evidence/before-* et empty/list/confirm/reactivate-* ; aucun déploiement |

**Total : 55 PASS, 1 BLOCKED (R09 : CI globale, échec historique documenté).**

## Exigences de preuves

- Captures mobile et PC du nouveau bandeau + liste vide/pleine + dialogues.
- Logs des tests ciblés avec commandes, code de sortie et SHA.
- Comparaison avant/après des écritures et identifiants.
- Résultats séparant test fixture, intégration, publication et vrai login A/B.
- Matrice d’adaptateurs `source → writer → identifiant → permissions → statut`, exceptions motivées.
- PR non fusionnée et checkpoint de reprise.
