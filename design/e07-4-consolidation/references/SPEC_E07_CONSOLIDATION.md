# DOBBY E07.4 - Spec fonctionnelle issue de la revue utilisateur

Cette specification est une consolidation de **toutes les decisions prises apres la publication E07.3**. Elle ne remplace pas les fonctionnalites deja livrees en E07.3. La matrice CSV constitue le registre des decisions : chaque ID doit etre rapproche d'un changement, d'un test et d'une preuve. Les decisions remplacees et reportees sont conservees a des fins de traçabilite, NON a implementer dans cette tranche.

## 0. Source et perimetre

- Source E07.3 : `c121027e53b335800d1559a39481c774a137a3fa` ; rapport `docs/dobby-v7/E07-3-TAVERNE-GRIMOIRE.md`.
- E07.3 a deja livre Taverne a deux repas Midi/Soir, calendrier hebdomadaire compact, Grimoire/catalogue/favoris, prompt IA cumulatif, import JSON/ZIP, adaptation TM5 attachee. **Preserver ces acquis.**
- Le rendu general E07.3 a recu un avis positif : plus clair, sans nouvelle refonte.
- E07.4 traite la saisie/importe AI, la fiche recette et le Mode Cuisine. Il faut des tests aux largeurs 320, 390 et 1440 pixels.
- `Choisir un repas` et `Preparer la liste de courses` sont **volontairement REPORTES**. Ne toucher leurs composants que pour le raccordement autorise du nouveau calendrier en modal et pour garantir l'absence de mutation du panier depuis une recette.
- GitHub Pages : produire un nouveau chemin isole, sans modifier les apercus existants. Aucun Supabase reel dans ce pilote fictif.

## 1. Regles transversales : effects, son, persistance

**E07-X01** : Dans E07.3, `essai-stitch-v7/chrome.js` renvoie `effects:false` lorsqu'aucune preference n'est enregistree. Le comportement cible est Effects ON par defaut, Sound OFF ; une vraie preference OFF choisie par l'utilisateur persiste. Verifier les valeurs anciennes avant une migration ; ne jamais reinitialiser toutes les preferences a chaque visite.

**E07-X02** : Le clic sur le bouton Effects doit immediatement changer un effet visible, l'etat du controle et les animations, sur Taverne, Grimoire, fiche recette, preparation et pages Courses. Les tests doivent mesurer un changement visuel effectif et pas uniquement `aria-pressed`. Prendre en compte `prefers-reduced-motion` ; annoncer honnetement les animations reduites dans ce cas. Les sons ne se declenchent qu'a la suite d'une action, et seulement si Sound ON.

**E07-X03** : Header et dock globaux fixes, coherents avec les autres apercus ; aucune surcharge decorative. Ne pas creer une deuxieme source de verite pour les preferences au risque de contredire la branche E06 independante.

## 2. Creation et import de recettes

**E07-I01/I02** : Le bouton principal du Grimoire passe de « Inscrire une nouvelle recette » a **« Ajouter des recettes avec l'IA »**, en police lisible 16 a 18 px, gras, doré, pleine largeur. Clic => directement l'ecran « Importer avec l'IA ». Supprimer la page de choix « Saisie manuelle / Importer avec l'IA » et la saisie manuelle comme parcours de creation ; cela supprime automatiquement son illustration de Dobby, les cartouches « Saisie artisanale », « Nouvelle formule », la citation et l'encadre « Piece de reference ». Ne pas en supprimer les donnees ni les outils reutilises par la modification d'une recette.

**E07-I03** : Le dossier « Gestion et sauvegarde du Grimoire » ne doit plus se trouver sur une page de creation. La fonction d'export JSON existante doit rester accessible a partir des parametres generaux de DOBBY (ou un emplacement de repli coherent tant que les parametres ne sont pas implementes). Ne pas appeler cet export « sauvegarde complete » : il ne contient pas les photographies.

**E07-I04/I05** : Le prompt externalise pour ChatGPT/Gemini/Claude doit accumuler toutes les recettes sur plusieurs lots de photos. Apres chaque lot, demander **exactement** « Avez-vous encore une recette à me fournir ? ». Produire seulement apres confirmation de fin un fichier complet contenant toutes les recettes. Un **ZIP unique** (`recipes.json` + `images/`) est la sortie privilegiee, lorsque l'IA sait produire/joindre de vrais fichiers. Si elle n'a pas cette capacite : JSON seul et limite indiquee, jamais de faux lien, d'URL inventee ou de fichiers fantomes. Ne pas integrer d'API IA payante a DOBBY.

**E07-I06/I07** : Demander pour chaque recette une photographie du plat et, idealement, des photos/illustrations correspondant aux etapes importantes (3 a 5 si justifie). Chaque image doit avoir un chemin relatif valide et une association precise `recipeId / stepIndex`, une provenance (`photo-originale` ou `illustration-IA`) et, si possible, une description de l'etat de cuisson. Meme recette avec modes Classique et TM5 ; ne pas creer de doublon TM5. La coherence des objets, ustensiles, produits et de l'apparence du plat est prioritaire ; ne pas pretendre creer des images si l'IA n'en produit pas. Le format et le parseur doivent pouvoir conserver puis hydrater les images d'etape ; images `localMediaArchive` existantes a preserver.

**E07-I08** : Extraire si possible la relation ingredients-utilises-par-etape (identifiants, quantite si une seule partie de l'ingredient est utilisee, ou reference aux quantites totales). Les relations incertaines restent signalees, pas de repartition inventee. L'ancienne structure `steps: string[]` reste lisible ; la nouvelle structure peut enrichir les metadonnees sans casser les clients existants.

**E07-I09** : **Aucune information culinaire absente ne bloque l'enregistrement**. Nom inconnu => libelle d'attente explicite, non presente comme vrai titre ; portions, temps, quantites, unite, etapes absentes => valeurs manquantes + mention « À compléter » au champ concerne. L'interface d'edition permet de remplir chaque lacune plus tard. Import en lot : une recette incomplete ne bloque ni elle-meme ni les autres ; une archive corrompue, type dangereux ou structure non recuperable peut etre rejetee. Garder des diagnostics lisibles, la preuve de provenance et les donnees deja connues. Si les portions de reference manquent, ne pas les remplacer par 4 sans permission ; les fonctions dependent de ce chiffre demandent une valeur avant de calculer, tout en conservant l'enregistrement.

**E07-I10** : Les adaptations TM5 demeurent rattachees a la meme recette. Les temps, temperature, sens inverse, vitesse, accessoires, capacite, instructions « hors TM5 » et points incertains doivent rester exacts ou « À vérifier ». Ne pas fabriquer de parametres ni declarer valides des adaptations IA non revues.

**E07-I11** : Compatibilite JSON V1, JSON V2 et ZIP, dont ZIP sans images et JSON sans images. Conserver les garde-fous E07.3 (max 150 recettes, 40 Mio ZIP, 10 Mio/image, chemins surs, bombes ZIP, etc.). Pas de destructuration des donnees deja stockees, aucun doublon silencieux ni ecrasement d'une ancienne recette/variante/photo sans choix utilisateur.

**E07-I12** : Les photographies et pieces de reference provenant d'un iPhone constituent une cible d'experience (camera, phototheque, fichiers PDF) surtout dans l'edition et le parcours IA. Cependant, l'ancienne section « Piece de reference » du formulaire de creation **disparait avec le formulaire**. Ne pas retablir une UI d'upload manuelle equivalent sous un autre nom dans cette tranche. La synchronisation familiale reelle des photos via Supabase reste une **cible future**, non verifiee et hors autorisation de migration. Les images actuelles restent locales dans la demo ; aucun message « Synchronise » fictif.

## 3. Fiche detaillee d'une recette

**E07-R01/R02** : Le bandeau superieur doit contenir le titre COMPLET de la recette, visible sur plusieurs lignes sans ellipse, sous la barre globale DOBBY. Retirer la partie « Donnees DOBBY - partage selon ... », le cadenas et le bouton favori de ce bandeau. Le bouton Partager n'est conserve que s'il fait une action reelle. Dans la ligne « Fiche Recette », conserver a droite une SEULE etoile interactive.

**E07-R03/R04** : Etoile pleine en or quand favori, etoile au contour dore avec centre vide sinon ; meme source de verite que le catalogue ; confirmation avant retrait (regle E07.3). Supprimer tous les badges « Favori du foyer » a l'interieur de l'image (aussi bien celui du bas a gauche que du bas a droite), et les boutons favori redondants ailleurs. Retirer titre de recette et sous-texte « Recette enregistree dans le grimoire du foyer » du bloc sous la photo ; remonter les cartes metriques.

**E07-R05** : Les metriques deviennent une grille de **3 cartes egales** : « Durée », « Portions », « Catégorie ». Retirer entierement « Cout / part » (inutile/non renseigne). Pictogramme au-dessus, petit libelle et valeur claire, pas de troncature ni debordement a 320px ; if value missing => « À compléter » sans valeur inventee.

**E07-R06/R07** : Le bloc « Méthode de préparation » ne contient que le titre et les deux boutons « Traditionnelle » / « Thermomix TM5 ». Supprimer badge « Double formule » et commentaire « Recette du grimoire DOBBY - quantites adaptees... ». Un clic commute localement les instructions et les parametres de preparation ; il ne navigue pas et ne change ni ingredients, ni quantites, ni nombre de portions. Bouton absent grise/inactif, etat selectionne dore. Si TM5 existe mais non verifie : « À vérifier » discret, pas de fiction de validation. Garder le mode dans le parcours Mode Cuisine.

**E07-R08/R09/R10** : Onglets exclusifs : quand « Préparation » est actif, seul celui-ci est dore, « Ingrédients » est brun ; reciproquement. Renommer « Garde-manger » en « Ingrédients ». La liste affiche ingredient + quantite ajustee aux portions, mais PAS de case a cocher, PAS de compteur `0/10`, PAS de bouton « Ajouter les vivres manquants au Panier ». La fiche ne modifie JAMAIS les articles a acheter. Les courses sont importees a partir du planning hebdomadaire dans « Courses du Foyer » qui existe deja (revoir plus tard).

**E07-R11/R12** : Supprimer bouton « Au Grimoire », le retour existe en haut. L'autre bouton devient **« Planifier ce repas »** sur toute la largeur, visuellement principal. Clic ouvre une modale superposee a la fiche : vue semaine lundi-dimanche, fleches precedent/suivant, 2 creneaux midi/soir par jour, repas deja presents visibles, choix de creneau libre ou confirmation obligatoire si remplacement, preservation/ajustement des convives si besoin. Validation ecrit avec le writer natif dans `planned[date+'-'+slot]`, ferme la modale, met a jour la Taverne, sans ajouter les ingredients aux courses. Test mobile, clic et Escape, focus, longue date, changement semaine. Ne PAS refondre la page « Choisir un repas » maintenant.

**E07-R13/R14** : Supprimer totalement le bloc « Authenticité culinaire DOBBY » et la mention technique. Le bouton « Créer une copie modifiable » est remplace par **« Modifier la recette »**. Pour une recette utilisateur : editer sur la meme identite. Pour une recette catalogue integree : fournir une surcharge modifiable associee a l'identite de base, sans duplicata visible ni mutation destructrice de la base. Garder notes, informations manquantes, images, TM5, favoris, liens planning et historiques. La disparition du parcours de creation manuelle NE doit pas supprimer cette edition.

**E07-R15** : Ajouter **« Supprimer la recette »**, commande secondaire mais claire, avec confirmation obligatoire portant le nom de la recette. Si des repas sont planifies, avertir et ne pas effacer silencieusement les repas historiques, la liste de courses ou des images partagees. Utiliser un retrait recuperable pour les recettes personnalisees et un masquage reversible pour les recettes de base ; pas d'effacement physique silencieux. Annulation = aucune mutation. Tests d'une recette favorite, liee a un repas et avec une variante TM5.

## 4. Mode Cuisine / pleine page

**E07-M01** : Dans le bandeau photo, ne garder que le badge « ETAPE 1/6 » en haut gauche, en le mettant a jour en naviguant. Supprimer en haut droite « 40 min - 4 portions » ; en bas gauche « Confection Traditionnelle » et « Fournil & Chaudron » ; en bas droite le badge « Etape 1 ». L'image doit respirer.

**E07-M02** : L'illustration change avec l'etape : image rattachee a l'etape issue du ZIP si presente. Si une image pertinente n'existe pas, visuel neutre plutot qu'une photo qui represente la mauvaise preparation ; aucun image externe inventee ou dependance CDN non controlee. Les illustrations generees par IA restent distinctes des photographies source.

**E07-M03/M04** : Afficher seulement les ingredients utiles a l'etape en cours, avec quantites correctement proportionnees ; pour une decoupe/sauce avec une partie des ingredients, eviter de presenter un total comme une consommation partielle si le calcul est inconnu. Si aucune repartition fiable n'est disponible, montrer « Répartition par étape non précisée » et eviter la longue liste complete. L'onglet Ingredients de la fiche recette conserve la liste integrale.

**E07-M05** : Supprimer deux encarts redondants de la page Cuisine : « L'astuce d'apothicaire de Dobby » et « X ingredients de la recette » (accordeon). Ne pas les recreer sous un autre titre. Le corps reste consacre a l'etape, ses ingredients, ses minuteurs et les actions.

**E07-M06** : L'acces rapide « Parcours complet de la confection » est utile : le conserver TOUT EN BAS, apres les commandes precedent/suivant. Afficher l'etape courante en or ; navigation par clic sans perdre progression ni minuteurs.

**E07-M07/M08/M09** : A chaque etape contenant une duree explicite, proposer un bouton compact « + Minuteur » pre-rempli et nomme, sans auto-start. Si la duree est une fourchette (ex. 10 a 12 min), laisser l'utilisateur choisir et ne pas presenter l'une comme la seule valeur connue. L'utilisateur peut creer un minuteur libre avec duree specifique, augmenter/diminuer, demarrer/arreter temporairement/reprendre, reinitialiser, supprimer. Plusieurs minuteurs comptent en parallele, chacun etiquete numero ET contexte de cuisson (« Etape 3 - Cuisson du poulet », « Etape 4 - Mijotage des legumes »). Une liste compacte, repliable si utile, reste accessible et visible a chaque etape.

**E07-M10/M11** : Un changement d'etape, un retour a la fiche, un changement Classique/TM5 ou un rechargement ne REINITIALISE JAMAIS les minuteurs actifs. Calculer les temps ecoules a partir de deadlines persistantes/horodatages, pas seulement d'intervalles JS. Ne pas bloquer l'utilisateur si le navigateur est suspendu ; a la reprise, recomputer le temps restant. Fin du compte a rebours => etat « Termine » jusqu'a acquittement ; signal visuel toujours, son seulement sur preference Sound ON. Les notifications garanties a ecran verrouille sur iPhone restent NON VERIFIEES sans test iOS et support explicite. Eviter les faux doubles declenchements et les collisions d'identifiants.

**E07-M12** : Methode TM5 dans le meme Mode Cuisine : instructions, accessoires, vitesses, temperature, sens inverse, temps propres a l'etape. Si un reglage est absent ou non valide, afficher « À vérifier », pas d'invention ni execution automatique. Changer de methode ne detruit pas les minuteurs.

**E07-M13/M14/M15** : A la validation de la toute derniere etape, ouvrir un dialogue de celebration **superpose** a la fiche. Maquette approuvee : `assets/STITCH_FESTIN_ORIGINAL.zip`, contenant le code Stitch et les captures. Theme cinematographique brun/dore ; Dobby buste visible, souriant, plat termine, message **« Dobby vous souhaite un bon appétit ! »**, sous-titre familier, un unique bouton dore « Retour à la recette ». Pas de nouvelle page, pas de fermeture automatique. Clic sur le bouton => fermeture de la modale et fiche recette visible. Ne PAS afficher « Recette validée et enregistrée au Grimoire » : terminer la cuisson n'enregistre pas une nouvelle recette. Si une photo du vrai plat est exploitable, utiliser une presentation visuellement coherente ; ne pas fabriquer artificiellement un plat absent. Le focus et le comportement Escape doivent rester accessibles sans donner l'impression d'une deuxieme route. Les effets dorees respectent la preference Effects et pas de son auto.

## 5. Integrite, auteurs, limites et recette

- Pas de code de sources Stitch remplace par des images de capture ; integrer les composants reelement dans le DOM de l'app.
- Ne pas afficher de bouttons morts (« partage », « exporter », « modifier », « supprimer »), aucune persistance ou sync inventee.
- Toutes les routes existantes restent navigables ; aucun changement E01-E06/E08, aucun changement du planning/course hors raccordements permis.
- La vraie synchronisation familiale des images, l'upload vers Supabase et la sauvegarde complete ne sont pas verifies/autorises ici. Les documents existants doivent rester disponibles dans l'apercu statique et le stockage local isole.
- Les corrections de liens entre photos, ingredients et etapes ne doivent pas introduire des doublons d'import, perdre le RAW du ZIP, modifier des recettes a la simple consultation ou falsifier les variantes TM5.
- Reporter les deux grands chantiers de revue non termines : pages « Choisir un repas » et « Preparer la liste de courses » ; ces interfaces restent intactes a ce stade.
- Regle de fin : une capture de l'UI ne prouve pas l'ecriture du writer ; exiger tests du writer, du rechargement, des deltas, de l'historique et des autres apercus. Pas de publication si gate bloque.
