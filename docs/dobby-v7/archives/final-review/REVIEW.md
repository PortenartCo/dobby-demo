# Revue finale — consultation native des Archives

Demande utilisateur du 16 novembre 2026 : [texte intégral](spec/2026-11-16-user-review.md). Base de cette correction : PR17 `aeed16e108fa7f3c7323eec244a9b4079c21160f`. Le lot initial et ses preuves restent conservés ; le présent dossier décrit les corrections de la revue utilisateur.

« Consulter » résout l'identifiant canonique et ouvre le composant du module d'origine. Les contrats structurés anciens, même classés « Autre », utilisent aussi la fiche Contrats et reviennent dans sa liste après réactivation. Les programmes, interventions, PDF/avenants, champs et relations restent ceux des sources. Les recettes gardent leurs modes classique/TM5 et leurs photos ; les photos d'étapes hydratées sont maintenant visibles dans les étapes de la fiche native.

Les détails archivés proposent une flèche de retour et « Réactiver » en tête. Les mutations sont absentes ou désactivées et restent refusées au writer. Annuler ne modifie rien ; confirmer réactive la source existante, puis ouvre sa fiche active. Le retour recette est une navigation inconditionnelle, même si une autre écriture vient de la réactiver.

Pour les documents autonomes consultés depuis Archives, le module réutilise ses champs et commandes de lecture et retire uniquement le décor, les éditeurs/imports et blocs techniques génériques. La fiche normale « Documents enregistrés » conserve son HTML exact aux quatre largeurs comparées. Le visuel Stitch22 reste inchangé : hauteur et largeur à environ 55 % du cadre précédent, proportions intactes, cartouche en bas à droite.

## Revue indépendante et concurrence

La revue en lecture seule a reproduit puis retesté ces défauts :

| Défaut reproduit | Correction | Preuve causale |
|---|---|---|
| Sélecteur de remplacement contractuel ouvert avant archivage : pièce ajoutée après archivage | Snapshot et garde relus dans le callback ; refus des métadonnées/pièces dans le writer natif avant écriture et après attente | `attachment-race-red.log` → `attachment-race-green.log`, `consultation-races-green.log` |
| Sélecteur d'un document autonome : PDF original écrasé après archivage | Précontrôle UI et garde native ; validation de la révision et du statut au point de remplacement IndexedDB | `consultation-races-red.log` → `consultation-races-green.log` |
| Ancien rollback restaurant A après qu'un autre writer a accepté B | Validation avant `put` et à sa réussite ; métadonnées appliquées dans ce callback, transaction annulée si périmée. Aucun rollback aveugle du Blob | `concurrent-binary-red.log` → `consultation-races-green.log` |
| Flèche recette déclenchant « Archiver » après réactivation concurrente | Action `archive-return` séparée du cycle métier | `recipe-return-red.log` → `consultation-races-green.log` |
| Photos d'étapes inaccessibles dans la fiche native | Réutilisation des images hydratées par mode/index et du style natif existant | `step-photos-red.log` → `step-photos-green.log` |

Les sept parcours automatisés de concurrence couvrent aussi confirmation de réactivation périmée et refus enfant, y compris dispatch direct. Le retest indépendant a confirmé en plus la restauration mémoire/sauvegarde/octets après quota local et annulation IndexedDB après commit des métadonnées. Aucun défaut concret ne reste dans cette revue ciblée.

Les callbacks optionnels de `houseStore` étendent le writer binaire existant : même base, même store et même clé, sans nouveau registre ni schéma. Les preuves `archives-final-source-extensions.json` inversent exactement les deux amendements natifs vers `aeed16e`, puis les preuves historiques vers main. Les anciens manifests restent inchangés et les octets supplémentaires sont refusés.

## Validation et reproduction

- `archives-ci.cjs` : writers/synchronisation, recherche/dialogues, six sources, sauvegardes, isolation de foyer, puis neuf variantes × 320/390/768/1440 px. Chaque parcours archive depuis la source, consulte, vérifie la lecture seule et les données/pièces, revient réellement aux Archives, annule/confirme la réactivation, contrôle la liste native et recharge. Les cinq binaires restent uniques et inchangés.
- `archives-consultation-races.cjs` : les sept scénarios de concurrence décrits ci-dessus, sur fixtures locales.
- `contracts-ci.cjs`, `maison-ci.cjs` : campagnes existantes actuelles des modules conservés, y compris imports, pièces et sauvegardes. `register-documents.cjs` : registre historique à 320/390 px. La CI rejoue les campagnes pertinentes au SHA de la PR.
- `fam-integration-transverse.test.cjs` : douze contrôles de provenance, dont inversion des amendements natifs et conservation des preuves parentes. Régénération des racines et du CSS : aucun changement produit par le build.

Commande locale, avec un serveur statique à la racine et Chromium installé :

```sh
DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 CHROMIUM_PATH=/usr/bin/chromium node essai-stitch-v7/tests/archives-ci.cjs
node --test essai-stitch-v7/tests/fam-integration-transverse.test.cjs
node essai-stitch-v7/tests/register-documents.cjs
```

Captures actives et archivées : [evidence](evidence). Les noms `before-*` désignent la référence avant correction ; `after-*` le rendu corrigé. Le JSON `after.json` décrit chaque parcours. Les logs `*-red.log` sont des échecs causaux attendus conservés comme preuves, pas le bilan final des régressions.

Le tableau [56 contrôles](CONTROLES-56.md) relie les exigences initiales aux preuves actuelles. Les checks de PR17 font foi pour le résultat de la CI au SHA exact ; le reçu de publication et son manifeste identifient séparément le SHA source et le commit ajoutant l'aperçu.

## Aperçu et limites

`scripts/build-archives-review.cjs --output /chemin/essai-dobby-v7-archives-native-pr17-<SHA7>-20261116` réutilise le mécanisme isolé existant. Il exige une source commitée et un dossier neuf. Les PDF/photos et fiches fictifs sont installés avant le démarrage du moteur ; réinitialiser ne concerne que ce stockage distinct. Le manifeste donne les empreintes des sources et transformations de l'enveloppe. Aucun backend ou compte réel n'est raccordé.

La vérification de l'URL publiée utilise `archives-hosted-preview.cjs`, sans injection d'état après démarrage : quatre largeurs, lecture des quatre types initialement archivés, pièces/historiques/photos, annulation et réactivation, archivage depuis leurs fiches natives, recharge et réinitialisation. Des sentinelles vérifient la préservation des stockages réels et de l'ancien aperçu dans le navigateur de test. Le site principal et les anciens aperçus sont comparés séparément, en lecture seule, avant/après publication.

La publication autorisée ajoute exclusivement un nouveau dossier à main ; chaque ancien objet racine Git doit garder son identifiant. Elle ne fusionne pas PR17 et ne modifie pas l'application principale. Aucun SQL distant, changement Supabase, contrôle Auth31, Missions V3 ou droit enfant étendu. La recette réelle A/B reste différée globalement. L'échec historique Missions déjà documenté sur main demeure distinct ; la campagne exhaustive historique n'est pas répétée.
