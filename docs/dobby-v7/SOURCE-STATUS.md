# État exact des 53 sources Stitch

53 sources actives : 24 fonctionnelles pour leurs opérations natives principales et 29 partielles. Aucune source simplement importée restante. « Fonctionnelle » ne signifie pas identité pixel par pixel ni disponibilité de services absents du moteur. Les comptes réels, les restaurations destructives et la précision OCR de documents réels restent à valider séparément.

[Galeries 320/390](evidence/index.html) · [Manifeste](../../essai-stitch-v7/route-manifest.json)

## Sources partielles — fonctions restantes

| Source exacte | Route | Fonction manquante ou limite native |
|---|---|---|
| `dobby_ajouter_ou_modifier_un_document` | `famille.html#document-edit` | PDF/images natifs et métadonnées ; pas de Fichiers iOS, envoi par hibou, chiffrement ou signature. |
| `dobby_ajouter_ou_modifier_un_membre` | `famille.html#member-edit` | Un seul champ prénom / nom natif : nom de famille séparé, rôle, photo et notes de membre non enregistrés. |
| `dobby_ajouter_ou_modifier_un_quipement` | `famille.html#equipment-edit` | Numéro de série et photo non stockés. Garantie native sous forme de date, pas de durée en mois. |
| `dobby_biblioth_que_des_m_mos_notes_familiales` | `famille.html#memos` | Mémos locaux : titre, contenu et mots-clés natifs seulement. Épinglage, auteur, partage familial et archivage non gérés. |
| `dobby_carnet_de_sant_familial` | `famille.html#health` | Cycles de soins, vaccins, antécédents cliniques structurés et pièces jointes non implémentés. Les références / notes et rendez-vous existants sont consultables. |
| `dobby_carnet_de_sant_individuel` | `famille.html#health-person` | Groupe sanguin, constantes, vaccins, pièces jointes structurées et archivage du carnet absents. |
| `dobby_contrats_assurances_ch_ances_du_foyer_1` | `famille.html#contracts-1` | Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique. |
| `dobby_contrats_assurances_ch_ances_du_foyer_2` | `famille.html#contracts` | Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique. |
| `dobby_conversation_avec_dobby_1` | `famille.html#chat` | Commandes textuelles natives limitées et historique local. Pas d’IA générative, de pièce jointe, de dictée ou de synthèse vocale qualifiée. |
| `dobby_conversation_avec_dobby_2` | `famille.html#chat-2` | Même moteur natif de commandes et historique. Pas d’IA générative, de pièce jointe, de dictée ou de synthèse vocale qualifiée. |
| `dobby_cr_er_et_attribuer_une_mission` | `famille.html#mission-edit` | Mission native : titre, catégorie, membre responsable, échéance et note. Pas de récurrence, heure, difficulté, runes ou récompense. |
| `dobby_cr_er_ou_modifier_un_contact` | `famille.html#contact-edit` | Portrait, blason et catégories structurées non enregistrés. Le rôle textuel est conservé. |
| `dobby_cr_er_ou_modifier_un_m_mo` | `famille.html#memo-edit` | Mémos locaux : titre, contenu et mots-clés natifs seulement. Épinglage, auteur, partage familial et archivage non gérés. |
| `dobby_cr_er_ou_modifier_un_rendez_vous_m_dical` | `famille.html#medical-edit` | Téléphone / tarif du praticien, durée, rappels et pièces jointes absents. Heure et lieu disponibles seulement pour le rendez-vous partagé natif, pas pour famHealth individuel. Référence de document : texte local seulement. |
| `dobby_d_clarer_ou_renouveler_un_contrat` | `famille.html#contract-edit` | Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique. |
| `dobby_d_tail_d_une_liste_familiale` | `famille.html#list-detail` | Listes natives : nom, éléments et coches. Catégories, attribution, échéances et renommage de liste non gérés. |
| `dobby_fiche_document_aper_u` | `famille.html#document` | PDF/images natifs et métadonnées ; pas de Fichiers iOS, envoi par hibou, chiffrement ou signature. Une écriture locale native déjà lancée n’est pas annulée par une suppression concurrente ; une copie peut subsister. L’interface signale ce résultat sans recréer de fiche ni nettoyer automatiquement le stockage. |
| `dobby_fiche_d_taill_e_d_un_contrat_1` | `famille.html#contract-1` | Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique. Une écriture locale native déjà lancée n’est pas annulée par une suppression concurrente ; une copie peut subsister. L’interface signale ce résultat sans recréer de fiche ni nettoyer automatiquement le stockage. |
| `dobby_fiche_d_taill_e_d_un_contrat_2` | `famille.html#contract` | Fiches documentaires natives Contrats/Assurances : pas de montant structuré, paiement, garanties calculées, résiliation ou reconduction automatique. Une écriture locale native déjà lancée n’est pas annulée par une suppression concurrente ; une copie peut subsister. L’interface signale ce résultat sans recréer de fiche ni nettoyer automatiquement le stockage. |
| `dobby_fiche_d_taill_e_d_un_quipement` | `famille.html#equipment` | Historique natif : date, note et entretien réalisé. Pas de montant ni de prestataire par intervention, ni modification/suppression d’une intervention native. Fichiers locaux existants conservés. |
| `dobby_grimoire_personnel_du_membre` | `famille.html#personal` | Membre canonique et missions attribuées. Accès au carnet local et agenda ; pas d’agrégation automatique des documents par champ personne libre, contacts personnels, récompenses ou antécédents structurés. |
| `dobby_g_rer_les_donn_es_des_quipements_export_restauration` | `famille.html#house-backup` | Export natif JSON équipements/historiques sans fichiers. Import par fusion uniquement ; mode remplacement de cette maquette non pris en charge. |
| `dobby_historique_contacts_m_dicaux` | `famille.html#health-history` | Historique des rendez-vous et notes natifs seulement ; pas de journal clinique structuré. Répertoire médical global du foyer : aucune liaison native contact / patient. Pas de messagerie ni localisation des cabinets. |
| `dobby_historique_d_entretien_pi_ces_jointes` | `famille.html#maintenance` | Historique natif : date, note et entretien réalisé. Pas de montant ni de prestataire par intervention, ni modification/suppression d’une intervention native. Fichiers locaux existants conservés. |
| `dobby_import_intelligent_analyse_validation` | `famille.html#import-review` | Extraction PDF et OCR français natifs testés avec les bibliothèques clientes existantes servies localement. Champs à vérifier et corriger ; pas d’IA, de certitude calculée ni de notification. Le membre concerné n’est pas attribué par l’import natif. |
| `dobby_import_intelligent_s_lection_d_un_fichier` | `famille.html#import-file` | Extraction PDF et OCR français natifs testés avec les bibliothèques clientes existantes servies localement. Champs à vérifier et corriger ; pas d’IA, de certitude calculée ni de notification. Le membre concerné n’est pas attribué par l’import natif. |
| `dobby_rechercher_dans_dobby_recherche_transversale` | `famille.html#search` | Recherche locale native contacts, listes, fiches santé locales, documents, mémos, équipements, recettes ; 80 résultats maximum. Pas d’index des fichiers, Apple, membres, agenda, missions ou historique de recherches. |
| `dobby_registre_des_listes_familiales` | `famille.html#lists` | Listes natives : nom, éléments et coches. Catégories, attribution, échéances et renommage de liste non gérés. |
| `dobby_sauvegarde_et_restauration_compl_te` | `famille.html#backup` | Format natif JSON dobby-complete-backup, pas .dobbyarchive. Archive non chiffrée, restauration locale avec confirmation native ; exécution destructive exclue des tests. |

## Sources fonctionnelles — opérations natives principales

- `dobby_adaptation_thermomix_tm5` — `index.html#tm5`
- `dobby_agenda_almanach_du_foyer` — `famille.html#agenda`
- `dobby_ajouter_une_recette_manuellement_1` — `index.html#recipe-add-1`
- `dobby_ajouter_une_recette_manuellement_2` — `index.html#recipe-add`
- `dobby_archives_biblioth_que_documentaire_1` — `famille.html#documents-1`
- `dobby_archives_biblioth_que_documentaire_2` — `famille.html#documents`
- `dobby_choisir_un_repas_nombre_de_convives` — `index.html#pick`
- `dobby_fiche_d_taill_e_d_une_recette` — `index.html#recipe`
- `dobby_grimoire_des_recettes_favoris_du_logis` — `index.html#recipes`
- `dobby_historique_des_listes_de_courses` — `index.html#shop-history`
- `dobby_importer_un_lot_de_recettes_json` — `index.html#batch`
- `dobby_la_biblioth_que_des_missions_t_ches_magiques` — `missions.html`
- `dobby_la_taverne_gourmande_repas_menus` — `index.html#taverne`
- `dobby_le_salon_des_curiosit_s_famille_organisation` — `famille.html`
- `dobby_liste_de_courses_valid_e` — `index.html#shop-final`
- `dobby_l_choppe_du_chemin_de_traverse` — `traverse.html`
- `dobby_maison_quipements_du_logis_1` — `famille.html#house-1`
- `dobby_maison_quipements_du_logis_2` — `famille.html#house`
- `dobby_membres_de_la_maisonn_e` — `famille.html#members`
- `dobby_menu_g_n_ral_de_tous_les_modules` — `famille.html#menu`
- `dobby_mode_cuisine_tape_par_tape` — `index.html#cook`
- `dobby_pr_parer_la_liste_de_courses_1` — `index.html#shop-1`
- `dobby_pr_parer_la_liste_de_courses_2` — `index.html#shop`
- `dobby_r_pertoire_des_contacts_familiaux` — `famille.html#contacts`

## Décisions nécessaires pour aller au-delà

Les champs absents du moteur, le partage individuel supplémentaire, les notifications Apple, l’IA ou la voix, le chiffrement/signature et les restaurations exécutées demandent un périmètre et une autorisation distincts. Les images Stitch indisponibles demandent des fichiers accessibles. Les fiches historiques qui ne peuvent pas être réenregistrées sans perte restent en lecture seule ; leur compatibilité exige une évolution autorisée du writer existant. Aucune de ces limites n’est masquée par une page statique déclarée intégrée.
