# E07.3 — Taverne et Grimoire, première tranche de revue

Mission : [texte reçu](E07-3-SPEC.md). Branche indépendante `feat/dobby-e073-taverne-grimoire-20261111`, depuis le dernier distant vérifié `66a1395bb95ff7b9a7e2d1b981f5a8773070c03e`. Les branches E06 et E01–E05 occupées n’ont pas été fusionnées ou écrasées. [Préflight, références, disponibilité du nouveau dossier et arbres publiés](evidence/e07-3/preflight.json).

Code fonctionnel : `f44626bf004c23e1d118d39327f614fefacc50d4`. [Intégrité et empreintes protégées](evidence/e07-3/source-integrity.json), [revue indépendante](evidence/e07-3/independent-review.txt).

## CODE_MODIFIÉ

- **Taverne** : deux repas Midi/Soir indépendants, images réellement liées aux recettes ou repli générique, durée unique et convives/portions natifs. Calendrier lundi–dimanche compact, semaine précédente/suivante, jour sélectionné et deux créneaux détaillés. Consulter le calendrier ne change ni le jour ni le planning persistés ; planifier utilise les clés natives `date-midi` / `date-soir`.
- **Grimoire** : image et cadrage conservés, cartouche en bas à droite, retrait des encarts fictifs/techniques redondants. Recherche nom/ingrédient/mot-clé, filtres tous visibles sur plusieurs lignes, une seule carte par recette même avec deux modes. Durée totale unique, aucun nombre de convives dans le catalogue. Retour doré pleine largeur, 54 px.
- **Favoris** : vrais tracés SVG contour/plein doré ; ajout immédiat, confirmation du retrait. Les recettes personnalisées gardent le contrat familial existant. Les favoris des recettes intégrées BASE sont désormais conservés dans un petit champ du même état natif, sans dupliquer les recettes ni introduire de nouveau partage automatique.
- **Ajout** : bouton unique → choix manuel ou IA personnelle. Le formulaire manuel existant et ses brouillons restent utilisés. L’export JSON se trouve dans « Gestion et sauvegarde du Grimoire », sur la page de choix.
- **Import** : prompt cumulatif copiable, JSON V1/V2 et ZIP contrôlés, aperçu et choix explicites avant enregistrement. IDs/favoris/annotations/historique et variantes TM5 conservés ; photos originales dans le store binaire natif existant. [Contrat complet, limites, erreurs et preuves](E07-3-IMPORT.md).
- **Effets/sons** : mécanisme commun réutilisé sur les trois routes du Grimoire ; particules, halo et retours de sélection réels. Sons brefs sur action uniquement. OFF, préférences enregistrées et réduction des animations respectés. **Valeurs par défaut de la base inchangées** : la correction E06 demeure sur sa branche indépendante.

Principaux fichiers : `cuisine-e07.js/css`, `cuisine.js`, `cuisine-e073.css`, `recipe-import.js/css`, `recipe-import-format.mjs`, `recipe-import-zip.mjs`, `cuisine-engine.js`, `chrome.js/css`, loaders/générateurs et tests dédiés. Le fichier natif `essai-stitch-v5-famille/index.html` contient seulement huit amendements identifiés : favoris BASE, V2 nullable/unité inconnue, conservation des métadonnées/IDs du batch et vérité/annotations TM5. Le garde compare toujours intégralement le reste avec la V5 originale après ces amendements littéraux et l’extension E05 historique. **La V5 publiée et `essai-stitch-v5/index.html` sont inchangées.** Aucun nouveau framework, dépendance, registre de recettes, stockage, API IA, secret, SQL ou bucket.

Les 53 sources Stitch et les anciennes preuves sont conservées. Deux routes de parcours supplémentaires réutilisent les templates existants ; elles ne sont pas comptées comme deux nouvelles sources Stitch. Le registre historique reste identique ; seule sa couverture mécanique des huit lignes ajoutées par66a1395 est réconciliée, sans modifier les95décisions antérieures ([note](E07-3-REGISTRY-NOTE.md)).

## TESTS_EXÉCUTÉS et INTÉGRATION_VÉRIFIÉE

| Contrôle réellement exécuté | Résultat et preuve |
|---|---|
| Taverne, calendrier, planification native/rechargement | PASS320/390/1440 : signatures de consultation inchangées, édition d’un créneau sans affecter l’autre, panier/historique conservés. [Preuves](evidence/e07-3/taverne/README.md). |
| Catalogue, filtres, favoris BASE/custom, formulaire manuel et édition V2 | PASS320/390/1440 : ajout/retrait confirmé et reload ; durée inconnue/unité connue sans quantité et annotations conservées ; durée invalide refusée. [Journal final](evidence/e07-3/catalogue/final.log). |
| Effets et sons communs | PASS320/390/1440 : opacité/positions réellement animées, halo, scintillement et WebAudio bref ; OFF/reload/réduction, aucun son automatique. [Résultats](evidence/e07-3/effects/). |
| Import V1/V2/ZIP | PASS320/390/1440 : multi-recettes, incomplets signalés, doublons/deux clés visant la même cible, annulation, réimport, PNG original/reload/photo ultérieure, TM5 lié non vérifié puis confirmation humaine, ID/favoris/annotations/historique et export V2. [Résultats](evidence/e07-3/import/browser/results.json). |
| Refus d’écriture et contexte asynchrone | PASS : panne au premier et au troisième save après une écriture réussie, restauration mémoire/JSON brut puis reload ; epoch changé après lecture retournant un blob absent → zéro écriture binaire tardive. [Journal](evidence/e07-3/import/browser-green.log). |
| Format, ZIP, raster et validateur natif extrait | 33 PASS : bornes avant allocation, CRC/chemins/ZIP dangereux, limites pixels/décodage, types stricts, prompt complet, V1 inchangé/V2 inconnus. [Journal](evidence/e07-3/import/unit-green.log). |
| Régressions Cuisine historiques | E07/E07.1/E07-consolidation PASS320/390/1440 ; Cuisine et famille PASS320/390 ; actions natives PASS. Adaptations limitées aux nouveaux créneaux, calendrier et choix manuel. [Causes et traces](evidence/e07-3/regression/taverne-regressions.md), [autres journaux](evidence/e07-3/regression/). |
| Natif hors ligne/conflits | 80 PASS ; garde intégral du source natif adapté uniquement aux amendements littéraux E07.3, puis PASS ciblé après la dernière correction du libellé TM5. Journaux de livraison sous evidence/e07-3/logs/. |
| Frontières communes E01–E08 | 11 suites ciblées PASS : chrome/préférences, accueil et missions, voix, compte/runes, limites E06 et Contrats. [Journal commun](evidence/e07-3/logs/common-boundaries-green.log), [traces détaillées](evidence/e07-3/regression/common/). Pas de réaudit ni de campagne des53maquettes. La CI finale est référencée au reçu. |
| Générateur d’aperçu E07.3 et profil intégré historique | PASS : nouveau préfixe/dossier, refus d’écrasement, provenance de chaque octet, connexion réelle désactivée. Les seules références CDN Stitch historiques sont neutralisées dans les copies générées E07.3, par un repli générique non photographique ; sources et autres profils inchangés. |
| Aperçu assemblé local, sans mocks de ressources ou de moteur | PASS320/390/1440 : manuel, presse-papiers, V1/ZIP réel, photo/TM5/reimport/reload/panier/cinq destinations, reset deux onglets et sentinelles Storage/IndexedDB/autres aperçus. Zéro tentative externe, POST ou404. [Preuves](evidence/e07-3/preview-local/README.md). |

Les premiers échecs et leurs causes sont conservés : anciennes attentes d’un seul dîner/accès direct au formulaire, source natif volontairement étendu mais garde historique inchangé, défauts d’échappement/constructeur Blob, rendu d’étoile statique, bouton de retour trop haut et anciennes images CDN bloquées par la CSP du bundle. Aucune assertion métier n’est supprimée pour obtenir le vert. La CI ciblée conserve l’accès à la campagne historique complète par `DOBBY_FINAL=1`.

## Captures comparatives

[39 vues avant +39 après, trois largeurs et six captures d’étoiles](evidence/e07-3/visual/index.md). Cadrage central du Grimoire identique pixel par pixel ; filtres de44px sans défilement horizontal ; contraste minimal mesuré9,18:1. Les neuf captures reçues sont conservées sans modification ; ZIP SHA256 `fa7be6e23995eb2829cb49a5bccdf7849b4358a18f570f2520133a452ffae4a5`, [empreintes individuelles](evidence/e07-3/review-input/manifest.json). Import, effets et aperçu ont leurs captures séparées.

## DÉPLOIEMENT_APERÇU_CONFIRMÉ / FONCTIONNEMENT_HÉBERGÉ_VÉRIFIÉ

**En attente dans ce premier état du rapport.** URL réservée et vérifiée absente avant publication : `https://portenartco.github.io/dobby-demo/essai-dobby-e07-review-20261111/`. Le reçu final ajoutera SHA source testé, CI, commit statique, workflow Pages, comparaison des octets HTTP et recette réellement hébergée. Aucune réussite hébergée n’est déduite des tests locaux.

Le profil `e073` du générateur réutilisé a son propre préfixe `dobby-review-e073-20261111|`, un backend interdit et des recettes explicitement DÉMO. La publication autorisée se limite à ajouter ce nouveau sous-arbre statique ; aucune fusion de branche applicative ni remplacement des autres aperçus.

## SYNCHRONISATION_RÉELLE_NON_VÉRIFIÉE et prochaine revue

Aucun compte réel, aucune mutation Supabase et aucune migration. Les textes/variantes continuent d’utiliser le writer et le module `recipes` existants ; les tests familiaux emploient une fixture HTTP. **Le transfert familial des photos de recettes n’est pas raccordé** : photos locales uniquement, références techniques dans les recettes. JPEG/PNG/WebP statiques pris en charge ; les formats refusés sont explicitement signalés. L’inclusion des blobs dans la sauvegarde native complète est confirmée par lecture du code, sans revendication d’un round-trip complet de restauration testé.

Restent à la revue suivante : fiche Recette, choix/planification détaillés, Mode Cuisine et TM5 pendant cuisson, pages complètes Courses et gestion approfondie des ingrédients. Seuls leurs raccordements indispensables ont changé. Chromium responsive ne constitue pas un essai physique Safari/iPhone. Validation visuelle utilisateur toujours attendue ; **E07 entier n’est pas déclaré terminé**.

[Liste des fichiers de livraison](evidence/e07-3/changed-files.txt) · [diff code/build/tests](evidence/e07-3/code.diff). Les SHA et le reçu public final sont ajoutés après la recette hébergée.
