# E08 — Harmonisation Contrats & Assurances

Branche indépendante `feat/dobby-e08-contrats`, base exacte E05 `8418682e5094b66ee879fbf18dcd1e6a3b6d5a05`. [Mission utilisateur](E08-SPEC.md). Commits de code : `0826d6c` et `273da92` ; les commits de recette et le SHA livré figurent au bilan final et dans l’historique de la branche. Aucun merge, Pages, changement SQL/Supabase, writer natif ou branche E06/E07.

## Code livré

Sept corrections appliquées uniquement à `famille.html#contracts`, composition issue de `dobby_contrats_assurances_ch_ances_du_foyer_2` :

1. Bandeau DOBBY commun conservé, libellé court « Contrats & Assurances ». Une condition de libellé dans `chrome.js`, sans nouveau bandeau. À 320 px, la zone centrale disponible est de 94 px ; à 360 px, de 134 px, contre 135 px nécessaires au texte en capitales : libellé sur deux lignes, préfixe décoratif masqué à ces petites largeurs. Police, boutons et hauteur de 68 px inchangés ; autres vues non affectées.
2. Image définitive `screen.png` du ZIP utilisateur copiée **sans transformation** sous `assets/contracts/`. Aucun média distant : 1376×768, ratio conservé, visage et buste entiers. [Provenance et SHA-256](../../essai-stitch-v7/assets/contracts/provenance.json). Le document DESIGN.md est conservé comme référence graphique, distinct de la demande utilisateur.
3. Cartouche « ✦ Registre des contrats ✦ » en bas à droite, fond sombre/bordure dorée existants. Aucun bouton de réduction fonctionnel trouvé dans le rendu : le badge supérieur droit source était un compteur fictif, retiré sans inventer de réduction.
4. Surtitre « Actes scellés & échéances du foyer », titre long et description ; classes typographiques du bloc Taverne réutilisées, titre intégral et sans police propre à Contrats.
5. Cartes distinctes sur toute la largeur utile, catégorie, organisme/référence/échéance lorsqu’ils existent, consultation native. `contracts()` sélectionne toujours exactement les catégories Contrats et Assurances ; recherche, filtre et tri par échéance de `list()` conservés. **Aucun plafond sur la liste générale**.
6. Bloc Archives supprimé sur la page canonique ; « Ajouter un contrat » principal, « Importer un fichier » secondaire et lien discret « Tous les documents ». `contracts-1` reste techniquement accessible, sans bascule depuis la page canonique.
7. Bloc Enregistrement et partage et pied de page Membres/Agenda retirés uniquement sur la page canonique. Connexion, sync, partage, refus et conflits natifs inchangés ; mécanismes de notice existants conservés.

Section compacte « Prochaines échéances » : au maximum trois fiches Contrats/Assurances avec date `YYYY-MM-DD` calendaire valide et supérieure ou égale au jour local courant. Tri croissant, consultation native par ID. Aucune date normalisée depuis une valeur invalide, ni échéance passée, alerte, préavis calculé ou donnée enregistrée. L’échéancier présente l’ensemble du registre concerné ; recherche et catégories continuent de filtrer la liste générale. Sans date exploitable : section absente, contrats sans date toujours visibles.

## Fonctions et périmètre conservés

Aucun changement de `familyDocs`, des writers, fichiers joints, stockage, client ou règles Supabase. Les accès mémos restent dans le menu/Salon et Documents. Export/import JSON des fiches et mémos restent dans Documents et la variante historique ; sauvegarde complète existante également accessible depuis le Salon. Aucune nouvelle page de paramètres. Les autres listes Documents, fiches et formulaires continuent d’utiliser leur rendu antérieur.

`documents-register.js` adapte seulement `list(true,false)` ; CSS limité à `body[data-family-view="contracts"]`. `family.js` omet seulement le pied de page normal de cette vue. `build-register.cjs` complète les preuves E08 du manifeste généré ; les templates originaux restent identiques et reproductibles. Le statut métier `verified-partial` préexistant n’est pas artificiellement promu : montants structurés, garanties, paiement, résiliation/reconduction automatiques restent hors moteur.

## Recette et preuves

[32 captures comparatives](evidence/e08/README.md) et [galerie](evidence/e08/index.html) : avant E05 / après E08 à **320, 360, 390 et 1440 px**, avec **0, 1, 10 et 50 fiches simulées**, titres/organismes longs, références et échéances manquantes. Vérification visuelle de l’image et du cartouche, contrôles DOM de débordement, troncature et alignement des cartes.

| Vérification | Résultat |
|---|---|
| `tests/e08.cjs` | PASS : 16 combinaisons largeur/volume, recherche du dernier élément, catégories, tri intégral, trois dates exactes, dates invalides/passées/autres catégories exclues, consultation/ajout natifs, accès Documents/import et variante historique |
| `tests/register-documents.cjs` | PASS 320/390 : création/modification, ID/champs inconnus conservés, pièce jointe locale, reload, téléchargement, import JSON annulé/invalide, import fichier et suppression |
| `tests/register-documents-sync.cjs` | PASS 320/390 : HTTP simulé, partage/stockage séparés, téléchargement, refus autorisation visible, reprise hors ligne et resynchronisation, données privées exclues |
| Tests Node V1/V2/Famille | **80/80 PASS** |
| Génération + sources | PASS, templates inchangés, aucune source Stitch modifiée ni dépendance ajoutée |

Les tests utilisent le vrai DOM, IndexedDB et writer natifs dans des profils Chromium temporaires ; les comptes et réponses réseau de partage sont des **fixtures**. Ce n’est ni une connexion réelle, ni une recette RLS/production ou entre comptes familiaux réels. `e05-native.cjs` respecte désormais DOBBY_TEST_ORIGIN afin de tester réellement cette branche au lieu du serveur E05 local ; aucun comportement métier E05 modifié.

Premiers tests causaux : refus explicite de la présence des blocs supprimés (RED sur E05) ; contrôle de clipping du libellé à 320 px, puis 360 px lors de la revue (RED strict sans tolérance de 1 px, puis correction locale). [Journaux ciblés](evidence/e08/logs/).

[Revue technique indépendante](evidence/e08/review.md) : un P2 de troncature à 360 px corrigé avec test causal strict RED→GREEN, aucun autre défaut établi. La campagne générale était lancée lors de ce constat ; elle a été conservée sans redémarrage et la correction CSS isolée a été revalidée séparément. La CI finale vérifie tous les scripts et les quatre largeurs au même SHA.

Une seule campagne générale finale adaptée au périmètre : `tests/ci.cjs` (39 scripts, E01/E02/E04/E05, Cuisine/Famille/registres et E08). **39/39 scripts PASS, code de sortie 0**, [journal complet](evidence/e08/logs/general-browser.log). Les CI au SHA final sont consignées dans le bilan de livraison ; [Actions de la branche](https://github.com/PortenartCo/dobby-demo/actions?query=branch%3Afeat%2Fdobby-e08-contrats). Les IDs des CI finales sont fournis au bilan sans modifier à nouveau le SHA validé.

Commandes :

```sh
DOBBY_TEST_ORIGIN=http://127.0.0.1:8768 node essai-stitch-v7/tests/e08.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8768 node essai-stitch-v7/tests/register-documents.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8768 node essai-stitch-v7/tests/register-documents-sync.cjs
node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8768 node essai-stitch-v7/tests/ci.cjs
node essai-stitch-v7/build-source.cjs
```

## Limites et arrêt

La synchronisation et les fonctions avancées non prises en charge gardent leurs limites antérieures ; E08 ne crée aucune capacité serveur ou alerte. Pas de recette sur comptes réels. Le bandeau à 320 et 360 px utilise l’adaptation responsive décrite plus haut. Livraison pour revue humaine uniquement, sans fusion ni publication.
