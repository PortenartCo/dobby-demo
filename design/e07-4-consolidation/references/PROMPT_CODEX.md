# CODEX DOBBY - Consolidation E07.4 apres revue (2026-11-11)

MODE : EXECUTION bornée, par checkpoints. Depot : `PortenartCo/dobby-demo`.

## Contexte verifie

Base de travail : branche E07.3 `feat/dobby-e073-taverne-grimoire-20261111`, SHA source teste `c121027e53b335800d1559a39481c774a137a3fa` ; commits source/documentation `f44626b`, `c121027`, `0f410ee`. Publication de l'apercu isole `84e254f485a22ac4f5b880217c02902c22b39c73` sur `main` (ajout statique seulement). URL : https://portenartco.github.io/dobby-demo/essai-dobby-e07-review-20261111/ . Les deux CI source et le workflow Pages avaient reussi a ces SHA ; ce sont des preuves de la version E07.3, pas de la future E07.4.

References du depot : `docs/dobby-v7/E07-3-TAVERNE-GRIMOIRE.md`, `docs/dobby-v7/E07-3-IMPORT.md`, `docs/dobby-v7/CONSOLIDATION-MATRIX.*`, `essai-stitch-v7/cuisine.js`, `essai-stitch-v7/cuisine-e07.js`, `essai-stitch-v7/cuisine-e073.css`, `essai-stitch-v7/cuisine-list.js`, `essai-stitch-v7/cuisine-engine.js`, `essai-stitch-v7/recipe-import.js`, `essai-stitch-v7/recipe-import-format.mjs`, `essai-stitch-v7/recipe-import-zip.mjs`, `essai-stitch-v7/chrome.js`, `essai-stitch-v7/chrome.css`, `essai-stitch-v5-famille/index.html`. Lire le `AGENTS.md` applicable s'il existe ; ne pas le supposer present.

## Pieces jointes OBLIGATOIRES de la mission

Le ZIP `DOBBY_E07_Consolidation_Codex_2026-11-11.zip` est joint a ce prompt. Extraire son contenu dans un dossier temporaire ISOLÉ du depot. Lire **integralement** :

1. `SPEC_E07_CONSOLIDATION.md` : contrat fonctionnel et visuel de cette consolidation.
2. `MATRICE_DECISIONS_E07.csv` : chaque demande de revue, son statut et sa verification.
3. `SCENARIOS_ACCEPTATION.md` : cas a demontrer, y compris non-regression.
4. `NOTES_TECHNIQUES_ET_ARBITRAGES.md` : conventions, contraintes et decisions remplacees ou reportees.
5. `assets/STITCH_FESTIN_ORIGINAL.zip` et `assets/STITCH_FESTIN_preview.png` : maquette utilisateur approuvee, a integrer comme MODAL, pas une route.
6. `captures/` : captures de revue utilisateur, a rapprocher des IDs de la matrice.

Ne PAS reimplementer l'ancien backlog depuis ces captures sans tenir compte des decisions successives : les arbitrages `REMPLACE` ou `REPORTE` priment.

## Mission precise

Consolider **toutes** les corrections E07 validees apres la livraison E07.3, sans perdre un changement deja accepte. Le resultat doit etre un NOUVEL apercu E07.4 isole, testable pour une revue de l'utilisateur. NE PAS rouvrir maintenant les chantiers complets **« Choisir un repas »** et **« Preparer la liste de courses »** ; ils feront l'objet de la revue suivante. Le seul nouveau parcours de planification est le calendrier en MODAL depuis une fiche recette. La liste de courses reste centralisee, sans ajout depuis une fiche recette.

### Checkpoint A - Grimoire et import IA

- Conserver la Taverne E07.3, ses deux repas midi/soir, calendrier compact, catalogue, favoris et import JSON/ZIP. Aucune refonte generale.
- Bouton principal plus lisible (16-18 px, pleine largeur) et renomme « Ajouter des recettes avec l'IA ». Il ouvre DIRECTEMENT l'import IA, sans ecran de choix.
- Supprimer l'ENTREE « Saisie manuelle » pour creer une recette et la page de choix devenue superflue. Ne PAS supprimer les donnees ou les fonctions d'EDITION des recettes importees, ni les brouillons/donnees preexistants.
- Retirer « Gestion et sauvegarde du Grimoire » du parcours de creation ; conserver/exporter la fonction JSON dans les parametres existants ou signaler son emplacement de repli sans perte.
- Prompt IA cumulatif : demander d'autres photos apres chaque lot ; ne produire le resultat complet qu'a la fin. Sortie prioritaire : un ZIP avec un `recipes.json` DOBBY et de vraies photos/illustrations (couverture, etapes). JSON seul si l'IA externe ne sait pas livrer un ZIP ; ne pas promettre ce qu'elle ne peut pas produire.
- Chaque image intermediaire doit etre reliee a une etape exacte et distinguer visuel source et illustration IA. Chaque ingredient peut etre relie aux etapes pertinentes. Variantes Classique/TM5 dans une seule recette, TM5 « À vérifier » tant que non valide manuellement.
- Une donnee culinaire MANQUANTE n'interdit jamais d'ENREGISTRER une recette : title/portions/durees/quantites/etapes/images/manuels incomplets = indicateurs « À compléter » au champ pertinent, puis correction manuelle possible. Ne rien inventer. Un fichier corrompu/insecurise ou non interpretable reste refusé ; les autres entrees du lot doivent rester importables. Le calcul des portions et la cuisson TM5 ne doivent pas inventer de valeurs.
- Conserver compatibilite JSON V1/V2, limites ZIP et traitement surement borne des images ; photos d'import stockees localement dans cet apercu, sans promesse de sync Supabase reelle.

### Checkpoint B - Fiche recette

- En-tete lisible avec **titre COMPLET, unique** de la recette, sur plusieurs lignes ; supprimer cadenas, « Donnees DOBBY / partage selon modules », bouton favori surnumeraire ; ne conserver le partage que s'il fonctionne.
- Une seule etoile Favori interactive A DROITE de « Fiche Recette » : pleine doree = favori, contour = non favori. Confirmation avant retrait, etat identique au catalogue. Supprimer tous les badges « Favori du foyer » dans la photo et les doublons ailleurs.
- Supprimer titre de recette et sous-texte repetes SOUS la photographie. Supprimer « Authenticité culinaire DOBBY » et sa ligne technique.
- Metriques : trois cartes egales « Durée », « Portions », « Catégorie », pictogrammes/texte non debordants a 320 px ; retirer toute la carte « Cout / part ».
- Methodes : Traditionnelle/Thermomix TM5 sur LA MEME FICHE. Cliquer commute uniquement instructions et reglages TM5 eventuels (non les ingredients, les quantites ou les portions). Mode absent = grise et desactive. Adaptation non controlee = « À vérifier ». Supprimer « Double formule » et le commentaire redondant sous ces deux boutons.
- Onglets « Ingrédients » (ancien « Garde-manger ») et « Préparation » : surbrillance doree EXCLUSIVE selon l'onglet affiche. Retirer cases ingredients, `0/10` et « Ajouter les vivres manquants au Panier » ; une fiche recette NE modifie pas les courses.
- Supprimer « Au Grimoire » (fleche Retour deja presente). Conserver un unique grand bouton « Planifier ce repas » pleine largeur ouvrant une MODAL de la semaine courante : jours lundi-dimanche, fleches semaine precedente/suivante, choix midi/soir, indication de plage occupee, confirmation avant remplacement, convives coherents. Ecriture via writer natif de planification ; mise a jour de la Taverne ; aucun ajout automatique aux courses. Ne pas refondre la page globale « Choisir un repas ».
- Remplacer « Créer une copie modifiable » par « Modifier la recette » : mise a jour de la meme fiche sans doublon, y compris pour les recettes de base via mecanisme d'overlay/personalisation preserveant le catalogue source. Ajouter « Supprimer la recette » avec confirmation explicite, nom, avertissement si deja planifiee, suppression recuperable et aucune destruction silencieuse des plannings/courses/historiques.

### Checkpoint C - Mode Cuisine

- Visuel superieur : ne conserver QUE « ETAPE n/N » en haut a gauche ; retirer le 40 min/portions, « Confection Traditionnelle », « Fournil & Chaudron » et seconde vignette Etape en bas.
- IMAGE DIFFERENTE selon l'etape si disponible, liee a la recette (illustration/photo importee etape par etape) ; si absente, repli sobre NON trompeur. Cohérence du plat entre etapes, pas de photos fictives presentees comme vraies.
- N'afficher que les ingredients necessaires A L'ETAPE, avec quantites adaptees ; si repartition inconnue, message discret « Répartition par étape non précisée » plutot que toute la recette et ne pas pretendre a une deduction fiable.
- Supprimer « L'astuce d'apothicaire de Dobby » et l'accordeon « 10 ingredients de la recette ».
- Conserver la navigation rapide « Parcours complet de la confection », mais DEPLACER TOUT EN BAS ; etape active clairement coloree, navigation sans effacer minuteurs.
- Transformer le minuteur unique en **liste de minuteurs independants**, lies au numero ET au titre de l'etape. Bouton « + Minuteur » dans chaque etape contenant une duree explicite ; pre-remplissage depuis cette duree, correction manuelle si fourchette. Possibilite de duree personnalisee, +1/-1 minute, start/pause/reprise/reset/suppression, plusieurs minuteurs paralleles et alerte de fin. Les minuteurs continuent a fonctionner lors de toute navigation dans la recette, changement d'etape ou de methode, consultation d'un autre ecran et apres reprise/rechargement selon les capacites du navigateur. Eviter le simple setInterval perdu en arriere-plan ; ne pas promettre de notification iOS hors navigateur sans verification. Son seulement si active dans les preferences.
- En Mode Cuisine TM5, afficher les instructions et parametres de la methode choisie dans le MEME parcours ; ne pas rediriger vers une autre page.
- A la validation de la derniere etape : ouvrir la modal Stitch « Le Festin est prêt » avec Dobby cinematographique, message « Dobby vous souhaite un bon appétit ! », une seule action « Retour à la recette » ; la modal ferme et revele la fiche. Pas de route supplementaire, pas de fermeture automatique, pas d'ecriture fictive « Recette validée et enregistrée au Grimoire ». Image du plat en coherence si disponible ; sinon scene Stitch generique assume. Respect Effects ON/OFF, accessibilite du dialogue et du focus.

### Checkpoint D - Preferences et non-regression

- Activer les EFFETS par defaut sur une preference nouvelle, SON desactive par defaut. Clic « Effets » = changement IMMÉDIAT et PERCEPTIBLE sur tous les ecrans E07 (fiche, cuisson, import, Courses, Taverne), pas seulement dans le Grimoire. Respecter choix utilisateur persiste et `prefers-reduced-motion`; ne pas introduire un deuxieme systeme divergent de celui d'E06.
- Conserver les donnees, recurrences, autres apercus et comportements E07.3 ; aucun nouveau service IA payant, aucune mutation de production Supabase, aucune migration ni secret. Des contraintes de sync photo existent et doivent rester declarees NON REALISEES dans ce pilote.

## DONE / controles

1. **Couverture exhaustive** : pour chaque ligne `A_CORRIGER` de `MATRICE_DECISIONS_E07.csv`, produire `PASS` + test/capture/preuve, ou `BLOQUE` avec cause precisement documentee. Les lignes `A_PRESERVER` doivent rester sans regression. Les decisions `REPORTE` et `REMPLACE` ne doivent pas etre implementees comme des fonctionnalites neuves.
2. **Tests cibls** : modes disponible/absent, favoris et confirmation, suppression/edition sans doublons, titres longs 320 px, ingredients seuls et tailles, modale planning/date midi-soir/doublon, filtre photo par etape, minuteurs multiples et resume/reload, modal finale. Tests import V1/V2/ZIP incomplets/images corrompues, transaction de lots, TM5 incertain, anciennes donnees, no fake backend writes.
3. **Tests responsive 320/390/1440**, captures comparatives et au moins un parcours E07 de bout en bout avec dependances locales reelles ; CI vertes sur SHA reel. Si possible navigateur Safari/iOS reelle, sinon marquer NON VERIFIE (ne pas simuler certification).
4. **Source/provenance** : nouvelle branche/worktree E07.4 isoles bases sur SHA E07.3 teste ; conserver la branche E07.3 et les autres branches E01-E06 en l'etat. Ecrire rapport `docs/dobby-v7/E07-4-CONSOLIDATION.md`, matrice de preuve et resultats/tests exacts, manifestes avant/apres. Conserver les 53 sources Stitch, la V5 historique, les precedents rapports et migrations.
5. **Apercu** : preparer et, si TOUS les controles sont verts, publier uniquement un NOUVEAU dossier GitHub Pages `essai-dobby-e07-consolidation-review-20261111/` isole avec prefixe Storage nouveau. Ne jamais remplacer ou ecraser les apercus existants, ni fusionner les sources applicatives sur `main`. Publication = ajout d'un sous-arbre statique uniquement ; verifier integrite HTTP du bundle servi et navigation. Si echec bloquant : ne pas publier et livrer blocage circonstancie.
6. **Retour** : fournir SHA branch/source/test/publication, CI, captures, URL d'essai, tableau ID -> preuve et limites. Distinguer `CODE_MODIFIE`, `TESTS_EXECUTES`, `INTEGRATION_VERIFIEE`, `PUBLICATION_CONFIRMEE`, `FONCTIONNEMENT_HEBERGE_VERIFIE`. Ne pas declarer E07 entier fini : restent a revoir « Choisir un repas » et « Preparer la liste de courses ».

Execution : lire les pieces et le code cible, corriger les causes et non les seules apparences, tester d'abord ciblé puis elargir si impact transversal, produire des checkpoints A/B/C/D, s'arreter et documenter les vrais blocages. Ne pas multiplier les agents ni refaire la campagne E07.3 sans changement causal.
