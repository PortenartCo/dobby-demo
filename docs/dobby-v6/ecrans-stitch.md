# Matrice des 53 écrans Stitch → V5 / V6

Chaque ligne représente un HTML fourni, pas une nouvelle route. « Intégré » décrit une présentation raccordée à une capacité V5 ; cela ne prouve pas une recette connectée. Les variantes choisies fournissent une structure, toujours harmonisée sur la Taverne. Aucun nom/date/contenu fictif Stitch n’est importé.

| Écran Stitch (dossier) | Capacité V5 / route | Composants communs | Choix et limites | Statut |
|---|---|---|---|---|
| `dobby_adaptation_thermomix_tm5` | `st.tmEditor` / `st.tmView` | Formulaire + étapes + avertissement | Adaptation manuelle V5, aucune conversion automatique | Intégré |
| `dobby_agenda_almanach_du_foyer` | `family` / `fpAgenda`, `fpEventForm` | Panneau agenda + modale | Intégré à Famille ; pas de calendrier externe inventé | Intégré |
| `dobby_ajouter_ou_modifier_un_document` | `familyDocForm` | Formulaire | Métadonnées et upload existants conservés | Intégré |
| `dobby_ajouter_ou_modifier_un_membre` | Éditeur V5 de membre du carnet de santé | Formulaire + actions | Éditeur existant conservé | Partiel : aucun lien de compte nouveau |
| `dobby_ajouter_ou_modifier_un_quipement` | `houseForm` | Formulaire | Éditeur unique | Intégré |
| `dobby_ajouter_une_recette_manuellement_1` | `import`, saisie manuelle et référence | Formulaire + notices | Variante 2 allégée ; 1 fusionnée ; capacités V5 | Variante consolidée |
| `dobby_ajouter_une_recette_manuellement_2` | `import`, saisie manuelle et référence | Formulaire + notices | Variante 2 allégée ; 1 fusionnée ; capacités V5 | Variante intégrée |
| `dobby_archives_biblioth_que_documentaire_1` | `documents` et panneau `fds-panel` | Cartes + filtres + listes + partage | Variante 2 pour structure ; palette maître ; variante 1 fusionnée | Variante consolidée |
| `dobby_archives_biblioth_que_documentaire_2` | `documents` et panneau `fds-panel` | Cartes + filtres + listes + partage | Variante 2 pour structure ; palette maître ; variante 1 fusionnée | Variante intégrée |
| `dobby_biblioth_que_des_m_mos_notes_familiales` | Mémos dans `documents` | Carte + liste | Pas de rubrique backend supplémentaire | Intégré au parcours Documents |
| `dobby_carnet_de_sant_familial` | Carnet local `health` et rendez-vous communs `family` | Membres + filtres + cartes | Distinguer les anciennes fiches locales du suivi partagé | Intégré au parcours existant |
| `dobby_carnet_de_sant_individuel` | Carnet local `health` et rendez-vous communs `family` | Membres + filtres + cartes | Distinguer les anciennes fiches locales du suivi partagé | Intégré au parcours existant |
| `dobby_choisir_un_repas_nombre_de_convives` | `pick`, convives et modes V5 | Formulaire + boutons + cartes | Conserver calcul adultes/enfants | Intégré |
| `dobby_contrats_assurances_ch_ances_du_foyer_1` | `contracts`, filtres et échéances Documents | Carte + badge + liste | Variante 2 pour structure ; 1 fusionnée | Variante consolidée |
| `dobby_contrats_assurances_ch_ances_du_foyer_2` | `contracts`, filtres et échéances Documents | Carte + badge + liste | Variante 2 pour structure ; 1 fusionnée | Variante intégrée |
| `dobby_conversation_avec_dobby_1` | `chat` | Hero conversation existant + saisie + suggestions | Variante 2 ; réponse locale V5 sans API IA nouvelle | Variante consolidée |
| `dobby_conversation_avec_dobby_2` | `chat` | Hero conversation existant + saisie + suggestions | Variante 2 ; réponse locale V5 sans API IA nouvelle | Variante intégrée |
| `dobby_cr_er_et_attribuer_une_mission` | `fmsForm` | Modale + formulaire + affectation | Création manuelle V5 existante | Intégré |
| `dobby_cr_er_ou_modifier_un_contact` | `contacts:edit`, `xContactForm` | Formulaire | Éditeur unique | Intégré |
| `dobby_cr_er_ou_modifier_un_m_mo` | `familyNoteForm` | Formulaire | Éditeur V5 | Intégré |
| `dobby_cr_er_ou_modifier_un_rendez_vous_m_dical` | `xHealthForm` local et `fhForm` partagé | Formulaire et modale | Conserver les deux contrats de stockage | Intégré |
| `dobby_d_clarer_ou_renouveler_un_contrat` | Création/édition `familyDocForm`, catégorie Contrats | Formulaire commun | Pas de renouvellement automatique ni de signature | Partiel : édition des dates existante |
| `dobby_d_tail_d_une_liste_familiale` | `lists:view:<id>` | Liste à cocher + actions | Une vue par liste réelle | Intégré |
| `dobby_fiche_d_taill_e_d_un_contrat_1` | Fiche document de catégorie Contrats | Fiche + actions + échéances | Variante 2 ; une fiche canonique par document | Variante consolidée |
| `dobby_fiche_d_taill_e_d_un_contrat_2` | Fiche document de catégorie Contrats | Fiche + actions + échéances | Variante 2 ; une fiche canonique par document | Variante intégrée |
| `dobby_fiche_d_taill_e_d_un_quipement` | `st.houseView`, `houseDetail` | Fiche + badges + historique | Données existantes | Intégré |
| `dobby_fiche_d_taill_e_d_une_recette` | `st.detail`, `drawDetail` | Fiche + ingrédients + actions | Aucune recette Stitch injectée | Intégré |
| `dobby_fiche_document_aper_u` | `docDetail`, pièces locales et fichiers volontaires partagés | Fiche + panneau fichier | Aperçu V5 selon type ; aucune garantie de chiffrement inventée | Intégré |
| `dobby_g_rer_les_donn_es_des_quipements_export_restauration` | Actions export/import du registre Maison | Actions + fichier + notice | JSON et validation V5 conservés | Intégré aux outils existants |
| `dobby_grimoire_des_recettes_favoris_du_logis` | `recipes`, favoris | Recherche + filtres + cartes | Recettes réelles et exemples V5 déjà présents | Intégré |
| `dobby_grimoire_personnel_du_membre` | Membre sélectionné dans `health` | Carte de membre | Aucune nouvelle fiche personnelle autonome | Partiel : profil magique mission 2 |
| `dobby_historique_contacts_m_dicaux` | Historique filtré du carnet et coordonnées du praticien | Liste et carte | Pas de répertoire médical dédié nouveau | Partiel : pas de vue autonome |
| `dobby_historique_d_entretien_pi_ces_jointes` | Fiche équipement, `houseLogForm`, pièces V5 | Liste + formulaire + fichier | Pas de nouveau registre backend | Intégré au parcours équipement |
| `dobby_historique_des_listes_de_courses` | `shopHistory`, dernière liste validée | Carte + action historique | Pas de nouvel écran historique complet | Partiel : dernier état restaurable V5 |
| `dobby_import_intelligent_analyse_validation` | `smart-import`, sélection et validation locales V5 | Étapes + formulaire + messages | Aucune extraction IA/OCR ajoutée | Partiel : capacités V5, pas le service simulé Stitch |
| `dobby_import_intelligent_s_lection_d_un_fichier` | `smart-import`, sélection et validation locales V5 | Étapes + formulaire + messages | Aucune extraction IA/OCR ajoutée | Partiel : capacités V5, pas le service simulé Stitch |
| `dobby_importer_un_lot_de_recettes_json` | `batch` JSON | Fichier + validation + états erreurs | Analyse locale V5 conservée | Intégré |
| `dobby_l_choppe_du_chemin_de_traverse` | Accueil : `home` | Hero + titre + résumé + raccourcis | Version unique, compteurs V5 | Intégré |
| `dobby_la_biblioth_que_des_missions_t_ches_magiques` | Tâches automatiques et missions partagées : `missions` | Hero + titre + liste + onglets | Une seule racine ; deux sources de missions conservées | Intégré |
| `dobby_la_taverne_gourmande_repas_menus` | Repas, calendrier, dîner, provisions : `plan` | Hero + titre + onglets + cartes | Maître graphique ; conserver les vrais repas V5 | Intégré |
| `dobby_le_salon_des_curiosit_s_famille_organisation` | Famille, agenda, santé partagée : `family` | Hero + titre + membres + agenda | Ne pas reprendre localisation/statuts fictifs | Intégré |
| `dobby_liste_de_courses_valid_e` | `shopFinal` | Cases + groupes + export texte | Pas de liaison marchande inventée | Intégré |
| `dobby_maison_quipements_du_logis_1` | `house` | Filtres + cartes + recherche | Variante 2 ; 1 fusionnée | Variante consolidée |
| `dobby_maison_quipements_du_logis_2` | `house` | Filtres + cartes + recherche | Variante 2 ; 1 fusionnée | Variante intégrée |
| `dobby_membres_de_la_maisonn_e` | Carnet familial : `health` | Liste de membres + cartes | Membres locaux existants ; pas de Maison/Patronus | Partiel : pas de page de profils magiques |
| `dobby_menu_g_n_ral_de_tous_les_modules` | `menu` + menu d’en-tête | Grille de raccourcis | Même accès, navigation inférieure à quatre entrées | Intégré |
| `dobby_mode_cuisine_tape_par_tape` | `st.cook` dans fiche recette | Étapes + cases + boutons | Pas de minuteur inventé | Intégré |
| `dobby_pr_parer_la_liste_de_courses_1` | `shop`, panier commun et préparation recettes | Panneau + choix + formulaire | Variante 2 ; ne pas masquer le panier synchronisé | Variante consolidée |
| `dobby_pr_parer_la_liste_de_courses_2` | `shop`, panier commun et préparation recettes | Panneau + choix + formulaire | Variante 2 ; ne pas masquer le panier synchronisé | Variante intégrée |
| `dobby_r_pertoire_des_contacts_familiaux` | `contacts` : répertoire du foyer | Liste + champ de recherche + cartes | Données V5 uniquement | Intégré |
| `dobby_rechercher_dans_dobby_recherche_transversale` | `search` : recherche transversale locale | Champ + résultats + états vides | Pas de recherche Cloud nouvelle | Intégré |
| `dobby_registre_des_listes_familiales` | `lists`, création `xListForm` | Liste + formulaire | Liste générique distincte du panier | Intégré |
| `dobby_sauvegarde_et_restauration_compl_te` | Outils d’export/restauration V5 | Actions + fichier + confirmation | Pas de sauvegarde Cloud universelle nouvelle | Partiel : périmètres V5 uniquement |
