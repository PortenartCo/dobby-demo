# DOBBY V7 — Registre exhaustif de la revue utilisateur et de recette

**Version du registre : 2026-11-13 — à joindre obligatoirement à `01_PROMPT_CODEX.md`.**

Ce document consolide **toutes les décisions prises depuis la revue Cheminette/Stitch 19–20 et pendant la revue générale suivante**. Il est une **checklist de conformité**, pas une invitation à redévelopper des fonctionnalités déjà livrées. Codex doit rendre **une ligne de résultat par ID** après comparaison avec la branche réelle issue de la mission antérieure. Chaque ligne indique ce qu'il faut observer et tester ; `en cours` ou `testé en simulation` ne signifie pas `déployé et fonctionnel`.

## A. Socle initial de la mission Stitch 19/20 — à rapprocher avant toute nouvelle modification

| ID | Exigence à conserver / compléter | Critère de recette observable |
|---|---|---|
| S01 | Bienvenue succincte et illustrée sans session ; connexion, inscription, invitation ; cinq écrans d'accès natifs, aucun écran familial fictif | Démarrage hors session, navigation réelle, bouton Continuer, pas d'identités fictives |
| S02 | Session déjà active ou compte existant qui se connecte → Cheminette dès l'entrée → animation verte au premier appui → Traverse, pas de boucle | 1 clic/toucher suffit ; retour normal ; aucune cérémonie déjà validée répétée |
| S03 | Nouveau compte sans invitation → profil → création de foyer réel → Traverse | Le formulaire n'utilise ni nom factice ni foyer implicite ; création vérifiée ou clairement bloquée sans DB |
| S04 | Nouveau compte invité → inscription/connexion → profil → confirmer le foyer réel/invitant ; états invitation exclusifs | Validité/expiration/invalidité, pas de simulation d'état visible ; sans vrai backend, gate honnête |
| S05 | Maison : introduction sur Traverse, test natif 6 questions + éventuel départage OU choix manuel 4 Maisons ; révélation et confirmation | Questionnaires, blasons, score/version, provenance manuelle ou calculée ; reprise et non répétition |
| S06 | Patronus : fenêtre après Maison, test natif 5 questions + éventuel départage OU choix manuel parmi 12 ; révélation proportionnée | 12 résultats possibles, visuel non coupé, progression, enregistrement distinct, retour Traverse |
| S07 | Cheminette et effets : ON par défaut sauf désactivation explicite, interrupteur reflétant l'état réel, son indépendant | Première session sans double basculement, audio OFF respecté, effets OFF mais navigation OK |
| S08 | Défilement vertical naturel + responsive intelligent dans tout DOBBY | Tests 320/390/768/1024/1440/1920 px, portrait/paysage, wheel/tactile, clavier, modales, header/dock |
| S09 | Entrée publique canonique V7, pas l'ancien V2.9.2 ; ressources graphiques et avatars utilisables | URL directe après déploiement, SHA servi, HTTP 200 images/script, retour Auth, vieux liens préservés |
| S10 | Identité canonique compte ↔ membre ↔ foyer, synchronisation et permissions réelles, aucun faux succès | Liens cohérents, zéro double profil, restrictions prouvées seulement si SQL réellement appliqué/testé |

## B. Parler à Dobby et navigation globale

| ID | Correction utilisateur | Test attendu |
|---|---|---|
| D01 | Vocal en premier, gros bouton centré en haut, « Maintenez appuyé pour parler » | L'action principale reste immédiatement visible à 320 px |
| D02 | Micro actif **uniquement pendant la pression maintenue** ; relâchement/cancel/blur arrête l'écoute | Pointer/touch/mouse, permission refusée, sortie de zone, aucun démarrage autonome ni mode toggle |
| D03 | Contour du bouton s'illumine pendant TOUT l'appui et s'éteint au relâchement, même si effets décoratifs OFF | Pendant l'écoute = halo visible, après = éteint ; pas de micro résiduel |
| D04 | Champ texte et bouton Envoyer sous le vocal ; historique encore en dessous et privé | Ordre visuel, défilement, envoi texte et historique existant non perdus |
| N01 | Dock global **Accueil / Tâches / Repas / Courses / Famille / Menu** | Exactement six raccourcis, toutes pages connectées, route et état actif corrects |
| N02 | Dock fixe, utilisable à 320 px et sur iPhone, respect du clavier/scroll, absent avant connexion | Aucun débordement horizontal ni bouton inaccessible, compatible safe areas |

## C. Accueil / Chemin de Traverse

| ID | Correction utilisateur | Test attendu |
|---|---|---|
| H01 | Bandeau « Les Courses du Foyer » identique au bandeau de la carte événementielle | Fond, icône dorée, titre, taille, marges et alignements harmonisés |
| H02 | « Gazette des Curiosités » devient **« Événements du Jour »** | Intitulé changé sans modifier les événements du jour ni le visuel de la carte |
| H03 | **« + Ajouter un événement »** directement dans la carte, même vide | Création via agenda familial natif ; jour courant rafraîchi ; événement futur absent de « du Jour » |
| H04 | Cartouche « Chemin de Traverse » dans l'image d'accueil **en bas à droite** | Badge entièrement visible et Dobby non masqué aux formats testés |
| H05 | Bouton Effets Famille harmonisé avec toute l'application | Même aspect/halo, état/persistance globaux, son indépendant |

## D. Missions / Runes

| ID | Correction utilisateur | Test attendu |
|---|---|---|
| M01 | Création de mission en **3 étapes** : définition ; attribution+récurrence ; récompense+date limite | Suivant/Retour, validation, conservation brouillon, aucune création avant validation finale |
| M02 | Après création, retour automatique à **La Bibliothèque des Missions** avec nouvelle mission affichée | Writer appelé une fois, tâche visible, pas de doublon |
| M03 | Retirer radio « Personnalisée », garder presets **10/25/50** et champ Runes personnalisé | Saisie perso désélectionne preset, sélection preset efface perso, entier ≥0, une seule valeur |
| M04 | « Échéance de complétion » → **« Pour quand faut-il terminer la mission ? »** | Pas de limite (défaut), Aujourd'hui, Demain, Choisir date ; calendrier seulement si demandé |
| M05 | Date limite ≠ date de création/attribution ; retirer raccourci Week-end, Almanach inutile, statut retard | Assignment automatique, calendrier cohérent avec récurrence, retard signalé sans supprimer |
| M06 | Attribution multiple via vrais membres/avatars ou « Toute la famille » | Une mission, pas de clones, candidats cohérents, « aucun membre » si réellement vide uniquement |
| M07 | À la validation, demander les **participants réels** et distribuer UNIQUEMENT la récompense totale entre eux | Solo=100 %, multi=partage entier, aucun participant non choisi rémunéré, zéro si montant nul |
| M08 | Anti-double récompense / récurrence par occurrence / règles enfants | Idempotence, concurrence, deuxième validation sans crédit supplémentaire, enfant ne modifie pas Runes |
| M09 | Urgence = **fine bordure jaune doré**, statique ; en retard indiqué séparément | Urgent/normal/urgent+retard/terminé rendus sans animation clignotante |

## E. Taverne : écrans, recette, repas, desserts

| ID | Correction utilisateur | Test attendu |
|---|---|---|
| T01 | Deux onglets au sommet : **Les Repas** (défaut) et **Grimoire des recettes**, un contenu à la fois | Grimoire visible sans scroller ; aucun doublon panneau long |
| T02 | « Courses du foyer » absent de Taverne, accessible depuis dock | Import d'ingrédients vers courses préservé malgré retrait de la carte |
| T03 | Repas du **jour** prévu : bouton or **« Commencer à cuisiner »** direct mode Cuisine | Depuis midi/soir, sans passage obligé par fiche recette ; bouton « Entrer en mode cuisine » retiré de la fiche |
| T04 | Repas du **jour** prévu : **« Voir la recette »** discret puis double bouton **Déplacer/Annuler** | Voir n'ouvre pas cuisine, déplacement natif, annulation confirmée sans effacer recette |
| T05 | Créneau du jour vide : **« + Choisir un repas »** doré | Sélection et enregistrement du repas corrects |
| T06 | **Menus de la semaine** : supprimer tous boutons « Commencer à cuisiner » | Planning hebdo organise sans déclencher mode cuisine |
| T07 | Menus de semaine : voir recette / déplacer / annuler / **modifier convives** | +/- convives met à jour portions et ingrédients du créneau, recette originale intacte |
| T08 | Dessert cuisiné **facultatif** par midi/soir, distinct du plat | Ajouter, sélectionner, remplacer, déplacer, retirer dessert sans altérer plat |
| T09 | Dessert : recette, portions, état de préparation et éventuels restes indépendants | Préparer plat n'achève pas dessert ; un dessert peut être cuisiné avant et servir à plusieurs repas |
| T10 | **Grimoire → catégorie/filtre Desserts**, combinable recherche/autres filtres | Création de recette classable dessert, ajout depuis repas ouvre grimoire filtré Desserts |
| T11 | Recettes/ingrédients dessert → liste de courses familiale unique | Quantités compatibles regroupées, pas de duplication abusive, origine conservée |
| T12 | « Vos envies » → **« Des envies particulières ? »** dans un accordéon replié par défaut | Filtres conservés au repli, compteur de critères actifs visible, recettes proposées accessibles |
| T13 | À la fin du mode Cuisine : « Bon appétit ! » puis **retour automatique Traverse** | Message bref, retour immédiat possible, pas de boucle, état préparé du seul élément concerné |

## F. Courses — règles définitives

| ID | Correction utilisateur | Test attendu |
|---|---|---|
| C01 | **Supprimer modes Préparation et Mode magasin** (la décision plus ancienne est annulée) | Liste unique ; aucune commande de bascule restante |
| C02 | Compteur **X/Y achetés**, barre de progression, restants **visibles dans la liste unique** | Mise à jour au cochage ; déclaration « maison » non comptée comme achat |
| C03 | Garder modifier/ajouter/supprimer/cocher directement, terminer courses, synchronisation | État acheté, non acheté, données locales et synchronisées conservés |
| C04 | « Déjà à la maison » en **modale superposée** et non bloc inséré dans la page | Fond assombri, scroll liste stable, clavier et fermeture X fonctionnels |
| C05 | Modale simplifiée : **Tout est disponible** ou **J'en ai une partie** (quantité unique) | Reste recalculé, pas d'achat fictif, correction ultérieure permise |
| C06 | « Options de la liste » déplacé vers **Menu → Paramètres** | Sync manuelle / copie articles locaux récupérables si besoin, non affichées dans liste |
| C07 | Disponibilité partagée `at_home_quantity` : préparation manuelle si mise à jour DB requise | État d'erreur réel non masqué ; SQL/vérif/rollback préparés, jamais exécutés |

## G. Famille — dernière architecture et permissions

| ID | Correction utilisateur | Test attendu |
|---|---|---|
| F01 | **Deux** accordéons seulement : **Membres du foyer** et **Événements & Préparatifs** ; un ouvert à la fois | Vue compacte, sections fermées avec résumés, pas de grande carte vide |
| F02 | Retirer « Contacts du foyer » de Famille, garder dans Menu général | Pas de bouton doublon, accès Menu fonctionne |
| F03 | **Fusionner Événements et Préparatifs** dans la même section | Agenda, événements, modèles PREP-01 et listes liées réutilisés sans nouvel annuaire |
| F04 | « Mémos du foyer » → **« Notes du foyer » dans Menu**, ne figure plus dans Famille | Accès, création et données existantes préservés |
| F05 | Scinder « Ajouter un enfant ou un animal » en **Ajouter un enfant** / **Ajouter un animal gardien** | Deux parcours/formulaires distincts et clairement nommés |
| F06 | Enfant : identité, surnom, naissance, avatar, infos, Maison/Patronus test ou choix manuel | Profil familial enfant sans compte Auth, vrais moteurs E06, parent peut l'accompagner |
| F07 | Animal : nom, espèce, race, naissance facultative, image/avatar, notes | Aucun compte, Maison/Patronus, ni Runes pour un animal |
| F08 | Enfant grandi : **Donner accès à DOBBY**, rattachement tardif à son profil EXISTANT | Même member_id, historique/runes/magie conservés, aucune promotion automatique par âge |
| F09 | **Parent : accès complet à SON foyer**. **Enfant : lecture seule**, sauf validation d'une mission autorisée et modification de SA Maison / SON Patronus | Frontend ET contrôles backend, refus des écritures externes/autres données, tests d'accès croisé |
| F10 | Invitations, recherche membres, anniversaires et relations existantes préservés | Aucun membre fictif, aucun profil perdu, erreurs d'auth signalées honnêtement |

## H. Règles d'arbitrage / cas de confusion à ne pas réintroduire

1. **COURSES :** ne jamais recréer le Mode magasin, ni masquer le compteur qui doit désormais rester visible dans la liste unique.
2. **FAMILLE :** ne jamais conserver trois ou quatre accordéons : il n'en reste que deux. Contacts et Notes sont dans Menu, pas dans Famille.
3. **REPAS :** le bouton « Commencer à cuisiner » existe **pour les repas du jour**, **pas** dans le planning de la semaine, **pas** dans la fiche recette.
4. **RECETTES :** le filtre « Desserts » est une catégorie du même Grimoire, pas une autre base ; plat et dessert ont des préparations et états distincts.
5. **RÉCOMPENSES :** sélection multiple ≠ multiplication des Runes ; les 25 Runes d'une mission restent 25 au total. Les enfants ne choisissent pas arbitrairement un gain.
6. **ÉCHÉANCE :** date limite, pas date d'attribution ; pas de délétion automatique en retard, pas de conflit silencieux avec la récurrence.
7. **PARCOURS :** la première utilisation sans session commence par Bienvenue ; la connexion existante par la Cheminette ; l'inscription nouvelle termine par Maison puis Patronus après l'arrivée sur Traverse, sans répétition ultérieure.
8. **EFFETS :** halo du micro lié à l'état d'écoute, indépendant du réglage purement décoratif ; autres effets et audio respectent les préférences ; pas d'écoute vocale continue.
9. **BACKEND :** données Supabase personnelles ; **aucune action distante par Codex** ; le projet familial existe mais son connecteur est refusé. Les enfants ne peuvent pas contourner une interdiction côté RPC en envoyant une requête directe.
10. **TESTS :** fixtures, mocks et CI ne prouvent pas un accès réel A/B ; ne pas publier les nouveaux accès comme opérationnels sans configuration et recette utilisateurs ; garder les parties non sécurisées derrière un gate.

## I. Recette transverse obligatoire

- **Vraie navigation** de chaque module à partir du dock ; pas seulement captures d'une maquette.
- **Vrai scroll** tactile/roulette, y compris longues fiches, accordéons, modales, clavier et galerie, à 320, 390, 768, 1024, 1440, 1920 px, pas de scroll horizontal.
- **Non-régression** Accueil E01, Parler à Dobby E02, Missions E03, Runes E04, profil E05, cérémonies E06, Taverne/Courses E07, Contrats E08, Famille/E09, PREP-01, synchronisation et mises à jour temps réel.
- **Intégrité de données** : ne jamais effacer ou recopier aveuglément missions, Runes, menus, recettes, articles, événements, préparatifs, données des enfants ; ne jamais créer un foyer/membre fictif.
- **Concurrence** : achats/déclarations maison, double validation mission et récurrence, deux comptes et stale revision en test local quand pertinent ; si impossible en réel, l'indiquer.
- **Git/CI/hébergement** : tests réellement exécutés, SHA commité, statut CI, publication GitHub Pages, SHA des fichiers hébergés, ressources non cassées, état réel des actions bloquées par Supabase.

## J. Contrat du rapport final

Pour chaque ID **S01-S10, D01-D04, N01-N02, H01-H05, M01-M09, T01-T13, C01-C07, F01-F10**, produire une ligne :

`ID | statut | commit/fichier | test concret | preuve | réserve/étape humaine`

Statuts autorisés : `FAIT_TESTÉ_DÉPLOYÉ`, `FAIT_TESTÉ_NON_DÉPLOYÉ`, `PARTIEL`, `ATTENTE_UTILISATEUR`, `NON_FAIT`.

Documenter séparément : (1) ce qui fonctionne réellement sur l'URL publiée ; (2) ce qui n'est validé qu'avec fixtures/local ; (3) les actions que seul l'utilisateur pourra réaliser **ultérieurement** dans Supabase et leurs contrôles ; (4) les éléments qui nécessiteront une autre itération. **Aucune question intermédiaire.**
