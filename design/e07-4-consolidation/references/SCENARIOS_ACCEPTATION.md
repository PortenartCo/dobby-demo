# E07.4 - Scenarios de recette a prouver

Pour chaque cas : SHA teste, page, viewport, action, resultat observable, effet de donnees, capture ou journal. Les tests ci-dessous sont un minimum ; reutiliser les tests E07.3 tant qu'ils demeurent valides. Aucun verdict « operationnel reel » sur un compte Supabase non teste.

## Groupe A : navigation, preferences, base E07.3

A01. Session vierge : Effects actif et perceptible; Sound OFF. Basculer Effects OFF puis ON : classes ET pixels modifies, pas de son.
A02. Recharger et naviguer Taverne > Grimoire > fiche > Mode Cuisine > Courses : preference volontaire OFF reste OFF; effet ON visible lorsque active; `prefers-reduced-motion` respecte.
A03. Sur 320, 390, 1440 : header/dock fixes; aucune barre parasite, scroll horizontal ni texte cache; source E07.3 Taverne et calendrier inchanges.
A04. Le Grimoire garde son catalogue, filtres multi-lignes, favori SVG plein/contour et repas Midi/Soir distincts.

## Groupe B : creation/import IA

B01. Depuis Grimoire, un seul bouton « Ajouter des recettes avec l'IA », pleine largeur 16-18px. Un clic ouvre directement Import IA. Pas de bouton ou page de CREATION manuelle. Possibilite de modifier des recettes existantes via action de fiche.
B02. Prompt exterieur : deux envois de photos de recettes differentes; invitation « Avez-vous encore une recette à me fournir ? » apres chaque; livraison finale contient TOUTES les recettes. ZIP prioritaire si l'IA peut generer les vrais fichiers; JSON seul sinon. Ne pas generer de faux telechargement.
B03. Import V1 complet et ZIP V2 avec photos : ressource originale retrouvee byte a byte; une seule recette avec Classic + TM5, TM5 non verifie, favoris et metadonnees preserves. Reimport n'ecrase rien sans choix explicite.
B04. Import de 2 recettes dont la premiere manque de quantites, portions et duree; la seconde manque des etapes. Elles sont TOUTES DEUX enregistrees avec lacunes visibles et editables, sans valeurs arbitraires. Reouvrir, corriger, sauver, recharger : lacunes remplies sans changement des infos d'origine.
B05. Import ZIP avec images par etape ; etape 1 et 3 presentent deux photos differentes liees au bon texte; images manquantes produisent un fallback. ZIP V1/V2 anciens continuent a marcher.
B06. ZIP corrompu, entree non-image, chemin relatif dangereux, bombe de compression, dimension trop grande : refus specifique et absence d'ecriture partielle ; ne pas confondre erreur de securite avec champ culinaire manquant.
B07. Photo provenant d'une recette existante apres reload : visible depuis le stockage local de l'apercu; aucune promesse de synchronisation Supabase.

## Groupe C : fiche recette

C01. Titre de 90 caracteres au-dessus de la photo : visible entier a 320px, pas de second titre apres photo, pas de texte « Donnees DOBBY », ni cadenas.
C02. Une etoile unique cote « Fiche Recette » : contour quand non favori, pleine doree quand favori. Ajouter puis consulter le catalogue ; retirer avec confirmation obligatoire ; annuler le retrait conserve le favori. Aucun « Favori du foyer » dans l'image.
C03. Trois metriques Duree, Portions et Categorie : largeur identique, values completes, sans carte Cout, pas de debordement a 320px.
C04. Recette avec Classic+TM5 : cliquer TM5 modifie uniquement preparation et parametres, sans nouvelle page ni changement d'ingredients/portions; cliquer Classique retablit les instructions classiques. TM5 absent = controle gris inactif. TM5 importe non controle = « À vérifier ».
C05. Onglet Preparation selectionne => Preparation dore/Ingredients brun, et inversement. Le changement de methode ne desynchronise pas la couleur de l'onglet.
C06. Ingredients : quantites en fonction des portions, pas de cases, ni `0/10`, ni bouton trompeur vers panier. Avant/apres ouverture de la fiche, le nombre et les contenus de courses restent identiques.
C07. « Planifier ce repas » ouvre une modale 7 jours avec 14 creneaux Midi/Soir, fleches semaine, repas existants visibles, annulation sans ecriture. Slot libre => native `planned[date+'-'+slot]` puis rechargement Taverne. Slot occupe => remplacement confirme, annulation sans mutation. Courses non modifiees.
C08. « Au Grimoire » absent ; bouton Retour d'en-tete fonctionne. Bloc « Authenticite culinaire » absent. Bouton « Modifier la recette » ouvre l'edition de l'ID courant ; aucun clone automatique visible.
C09. Modifier titre, quantite manquante, etape, image et variante sur recette importee. Sauver puis recharger : meme identite, donnees coherentes. Modifier une recette de base : surcharge non destructive et aucun doublon dans le catalogue.
C10. Supprimer : premier clic ouvre une confirmation nominative. Annuler => zero mutation. Confirmer => retrait recuperable, favoris/historique/sync pas effaces silencieusement. Si recette planifiee, avertissement explicite ; pas de planning casse.

## Groupe D : Mode Cuisine

D01. Mode Cuisine pleine page : sur le visuel haut, seul « ETAPE 1/6 » en haut gauche. Etape 2/6 apres Suivant. Aucune pastille « 40 min - 4 portions », autre mode, Fournil & Chaudron, second badge.
D02. Changer d'etape change la photo (lorsque media d'etape present); une etape sans image n'utilise pas une image mensongere. Les anciennes recettes sans media fonctionnent.
D03. Etape 1 (legumes) : liste limitee aux legumes references, quantites ajustees. Etape 2 (poulet) : ingredients distincts. Recette sans mapping : message sans liste de 10 ingredients repetee. Pas de « Astuce d'apothicaire » ou « 10 ingredients ».
D04. Acces rapide Etape 1..6 TOUT EN BAS ; etape courante doree, cliquer une autre ne reinitialise ni progression ni chrono.
D05. Etape 3 « Faites colorer le poulet environ 5 minutes » => bouton « + Minuteur 5 min ». Etape 4 « 10 a 12 minutes » => choix/ajustement, pas de chiffre invente.
D06. Demarrer deux minuteurs 5 et 12 minutes. Avancer et reculer de trois etapes, ouvrir la fiche, revenir, changer methode, fermer/reouvrir l'apercu : minuteurs retrouves avec temps correct et noms etape/preparation, sans relancer un timer duplicate.
D07. Sur chaque minuteur : -1 min, +1 min, saisie 3 min 30 s, pause/reprise, reset, suppression; pas d'impact sur les autres. Deux timers terminant dans la meme seconde => chacun acquittable une seule fois. Son uniquement Sound ON ; visuel quand Sound OFF.
D08. Sur iOS/Safari hors plan : ne pas marquer notification systeme comme OK ; le rattrapage au retour doit etre realiste. Proposer mesure/limite.
D09. Choisir TM5 depuis fiche : entrer en Mode Cuisine conserve variante choisie et ses parametres, pas de page TM5 separee ; champs non verifies affich es A verifier. Timers continuent.
D10. Valider derniere etape : affiche la modale Stitch « Le Festin est prêt », texte Dobby exact, Dobby art local, fond assombri, un seul CTA « Retour à la recette ». Aucun enregistrement fictif et pas de fermeture automatique. Cliquer CTA => fiche visible. Etat de recette et planning ne change pas implicitement.
D11. Tester modale a 320/390/1440, focus, controle Escape s'il est prevu; respect des effets ON/OFF, jamais de son auto.

## Groupe E : non-regression et publication

E01. Relancer les tests natifs E07.3 pour V1/V2/ZIP et photo, favori, calendrier, planning, courses, deux creneaux, offline et reset de l'apercu.
E02. Verifier que les ecrans « Choisir un repas » et « Preparer la liste de courses » n'ont pas subi de refonte ni suppression, et que leur stock/recettes restent inchanges hors action utilisateur.
E03. Aucun changement Supabase, aucune cred entielle, aucun backend effectif. Nouvel apercu isole nouveau prefixe LocalStorage/IndexedDB ; tests de sentinelles anciens apercus.
E04. Toute publication doit montrer source SHA == build tested SHA, CI vertes, fichiers HTTP identiques au bundle et anciens apercus inchanges. Ne pas confondre publication d'un repertoire statique avec fusion sur main des sources applicatives.
E05. Rapporter 61 IDs du CSV (y compris statuts preserve/remplace/reporte) avec preuve ou blocage motive ; aucun ID manque. E07 reste PARTIEL tant que les pages Choisir un repas et Courses n'ont pas ete revues.
