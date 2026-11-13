# DOBBY V7 — Registre de recette Maison & Équipements

Statut avant la mission : **À RÉALISER / NON TESTÉ** pour tous les points. Codex doit remplir tous les IDs avec une preuve et distinguer code, test, fusion, déploiement et fonctionnement réel.

Statuts autorisés : `DÉPLOYÉ_ET_TESTÉ`, `PARTIEL`, `BLOQUÉ_SQL`, `BLOQUÉ_RECETTE_RÉELLE`, `NON_FAIT`. Un seul test simulé ne suffit pas pour la recette live.

## H — Page principale et style

| ID | Critère de recette vérifiable | État initial | Preuve attendue |
|---|---|---|---|
| **H01** | Image Stitch 21 remplace réellement le salon/horloge ; aucune image inventée. | À réaliser | Capture + parcours navigateur |
| **H02** | Cadrage image testé 320/390/768/1024/1440 : Dobby, buste et outils visibles. | À réaliser | Capture + parcours navigateur |
| **H03** | Badge « FOURNEAUX & CONDUITS » supprimé ; module reste généraliste. | À réaliser | Capture + parcours navigateur |
| **H04** | Bouton « + Ajouter un équipement » large, correctement centré et réactif. | À réaliser | Capture + parcours navigateur |
| **H05** | Une seule recherche locale « Rechercher un équipement… », effacement et zéro résultat. | À réaliser | Capture + parcours navigateur |
| **H06** | Filtres Tous / À surveiller / Garanties, filtres de pièce, variations superflues supprimés. | À réaliser | Capture + parcours navigateur |
| **H07** | Boutons globaux Historique d’entretien et Export/Sauvegarde locale supprimés de la page Maison. | À réaliser | Capture + parcours navigateur |
| **H08** | Conseil d’entretien Dobby vide/fictif et cartouche bouclier décoratif supprimés. | À réaliser | Capture + parcours navigateur |
| **H09** | Encadrés Enregistrement et sauvegardes et initialisation du foyer supprimés de la vue Maison. | À réaliser | Capture + parcours navigateur |
| **H10** | Liste de vrais équipements ; Consulter/Modifier sur le bon ID, pas de fausse donnée. | À réaliser | Capture + parcours navigateur |
| **H11** | Header/dock globaux restent visibles et opérationnels, sans régression UX. | À réaliser | Capture + parcours navigateur |

## F — Ajout et modification

| ID | Critère de recette vérifiable | État initial | Preuve attendue |
|---|---|---|---|
| **F01** | Création via Ajouter ouvre formulaire vierge, jamais équipement Poêle de test. | À réaliser | Capture + parcours navigateur |
| **F02** | Titre exact « Ajout d’un équipement au Logis » en création. | À réaliser | Capture + parcours navigateur |
| **F03** | Sélecteur Nouvel ajout/Édition (Poêle) supprimé. | À réaliser | Capture + parcours navigateur |
| **F04** | Modification depuis carte ou fiche existante ouvre le bon équipement prérempli. | À réaliser | Capture + parcours navigateur |
| **F05** | Titre de modification explicite ; navigation retour/annuler correcte. | À réaliser | Capture + parcours navigateur |
| **F06** | Sanctuaire domestique privé, icône décorative et bouclier/tirets supprimés. | À réaliser | Capture + parcours navigateur |
| **F07** | Emplacement est une vraie liste des endroits existants. | À réaliser | Capture + parcours navigateur |
| **F08** | Action + Nouvel emplacement, sauvegarde et réutilisation sans doublons. | À réaliser | Capture + parcours navigateur |
| **F09** | N° de série / Réf. constructeur facultatif saisissable, non « NON DISPONIBLE ». | À réaliser | Capture + parcours navigateur |
| **F10** | N° de série et champs ajoutés persistants (reload/édition, sync quand autorisée). | À réaliser | Capture + parcours navigateur |
| **F11** | Création/modification préservent ID, marques, modèles, garantie, notes, champs historiques. | À réaliser | Capture + parcours navigateur |
| **F12** | Bouton « Rayer définitivement » absent en création ; suppression existante sécurisée depuis détail. | À réaliser | Capture + parcours navigateur |
| **F13** | Alerte de ramonage fictive absente du formulaire. | À réaliser | Capture + parcours navigateur |
| **F14** | Blocs de sauvegarde et texte Membres et agenda supprimés du formulaire. | À réaliser | Capture + parcours navigateur |

## M — Multiples calendriers d’entretien

| ID | Critère de recette vérifiable | État initial | Preuve attendue |
|---|---|---|---|
| **M01** | Un équipement accepte zéro, un, deux ou plus de types de maintenance indépendants. | À réaliser | Test de calcul + donnée persistante |
| **M02** | Ajouter/éditer/retirer un type avec ID stable, nom et garde de conservation. | À réaliser | Test de calcul + donnée persistante |
| **M03** | Exemple chaudière : ramonage 12 mois ET entretien 36 mois, sans double création équipement. | À réaliser | Test de calcul + donnée persistante |
| **M04** | Dernière date connue propre à chaque type, distincte d’un événement historique. | À réaliser | Test de calcul + donnée persistante |
| **M05** | Fréquence paramétrable nombre positif mois/années ; widget ancien ramonage supprimé. | À réaliser | Test de calcul + donnée persistante |
| **M06** | Prochaine échéance calculée d’après date et fréquence avec calendrier exact. | À réaliser | Test de calcul + donnée persistante |
| **M07** | Dates de fin de mois et années bissextiles vérifiées. | À réaliser | Test de calcul + donnée persistante |
| **M08** | Date prochaine explicite dérogatoire possible avec motif/source. | À réaliser | Test de calcul + donnée persistante |
| **M09** | Aucune date inventée si aucune dernière date ou échéance explicite. | À réaliser | Test de calcul + donnée persistante |
| **M10** | Historique rattaché à un équipement et au bon type (date, texte, prestataire, montant, note). | À réaliser | Test de calcul + donnée persistante |
| **M11** | Intervention réalisée sur A actualise A et non le programme B. | À réaliser | Test de calcul + donnée persistante |
| **M12** | Modifier/supprimer intervention avec confirmation et recalcul ciblé. | À réaliser | Test de calcul + donnée persistante |
| **M13** | Une date déclarée dans le formulaire ne fabrique pas une intervention. | À réaliser | Test de calcul + donnée persistante |
| **M14** | Justificatifs et pièces conservés/associables à des interventions. | À réaliser | Test de calcul + donnée persistante |
| **M15** | Alertes uniquement fondées sur données ; aucun rappel fictif ou obligation légale inventée. | À réaliser | Test de calcul + donnée persistante |
| **M16** | Anciennes données d’entretien lisibles et éditables sans perte, même sans type historique. | À réaliser | Test de calcul + donnée persistante |

## D — Documents et Contrats

| ID | Critère de recette vérifiable | État initial | Preuve attendue |
|---|---|---|---|
| **D01** | Documents houseDocs existants et blobs conservés après migration/édition. | À réaliser | Contrôle pièce/fichier & non-régression |
| **D02** | Ajouter et associer plusieurs documents à un équipement, avec types précis. | À réaliser | Contrôle pièce/fichier & non-régression |
| **D03** | Consultation PDF/image existante réelle, téléchargement quand possible. | À réaliser | Contrôle pièce/fichier & non-régression |
| **D04** | Notes/manuel/facture/attestation liés sans remplacement silencieux. | À réaliser | Contrôle pièce/fichier & non-régression |
| **D05** | Statut local vs partagé exact ; ne pas feindre un stockage cloud absent. | À réaliser | Contrôle pièce/fichier & non-régression |
| **D06** | Association stable vers Contrats PR13, sans deuxième base de contrats. | À réaliser | Contrôle pièce/fichier & non-régression |
| **D07** | Un contrat pouvant viser plusieurs appareils conserve ses liens. | À réaliser | Contrôle pièce/fichier & non-régression |

## A — Import avec IA externe

| ID | Critère de recette vérifiable | État initial | Preuve attendue |
|---|---|---|---|
| **A01** | Deux parcours distincts : ajout manuel et Importer des équipements avec mon IA. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A02** | Prompt externe copiable, cohérent avec le schéma réellement pris en charge. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A03** | Prompt demande plusieurs pièces progressivement et attend « J’ai terminé ». | À réaliser | Test import ZIP/JSON + état avant/après |
| **A04** | Prompt recherche documentations officielles du modèle EXACT si l’IA en est capable. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A05** | Source URL/page et incertitudes par modèle/plan ; aucun document ni fréquence inventés. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A06** | Livrable ZIP réellement lisible avec equipments.json + docs, fallback JSON. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A07** | Lecteur accepte dobby-equipment v1 et refuse autres formats trompeurs. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A08** | Validation de type, tailles, dates, nombre de fichiers, MIME réel et contenu. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A09** | Refus des chemins ZIP dangereux, doublons, bombes et archives corrompues. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A10** | Aperçu éditable avant toute mutation, informations absentes clairement affichées. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A11** | Ajout/ignorer/mettre à jour avec résolution prudente des doublons. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A12** | Import préserve historiques, IDs, documents, inconnus et plans existants. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A13** | Plusieurs calendriers d’entretien importés indépendamment. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A14** | Aucun appel IA, collecte externe ou envoi automatique de facture depuis DOBBY. | À réaliser | Test import ZIP/JSON + état avant/après |
| **A15** | Annulation/erreur de parse/scope changé n’altère aucune fiche persistante. | À réaliser | Test import ZIP/JSON + état avant/après |

## S — Persistances, droits et gouvernance

| ID | Critère de recette vérifiable | État initial | Preuve attendue |
|---|---|---|---|
| **S01** | Respect writer natif maison ; aucun deuxième moteur parallèle. | À réaliser | Contrôle writer/gate/schema |
| **S02** | Métadonnées maison et entretiens cohérentes dans synchro familiale existante. | À réaliser | Contrôle writer/gate/schema |
| **S03** | Permissions réelles Parent/Enfant et inter-foyer conservées ; gates non contournés. | À réaliser | Contrôle writer/gate/schema |
| **S04** | Aucune migration Supabase ancienne rejouée, aucun accès/écriture distant Codex. | À réaliser | Contrôle writer/gate/schema |
| **S05** | Si changement serveur, SQL manuel avec preflight/apply/verify/rollback et gate fermé. | À réaliser | Contrôle writer/gate/schema |
| **S06** | Sauvegarde/restauration natives toujours disponibles par Menu > Paramètres. | À réaliser | Contrôle writer/gate/schema |

## P — Build, tests et livraison

| ID | Critère de recette vérifiable | État initial | Preuve attendue |
|---|---|---|---|
| **P01** | Branche et worktree isolés ; dernier main et PR11/12/13 correctement rapprochés. | À réaliser | Git/CI/URL ou rapport exhaustif |
| **P02** | Tests natifs ciblés et tests causaux nouvelles fonctions avec vrais DOM/IndexedDB. | À réaliser | Git/CI/URL ou rapport exhaustif |
| **P03** | Captures 320/390/768/1024/1440, header/dock, scroll, claviers. | À réaliser | Git/CI/URL ou rapport exhaustif |
| **P04** | Non-régression Contrats et import dobby-contracts, Recettes, Famille, sync, Menu. | À réaliser | Git/CI/URL ou rapport exhaustif |
| **P05** | CI, merge, publication et SHA hébergé vérifiés si gate de fusion satisfait. | À réaliser | Git/CI/URL ou rapport exhaustif |
| **P06** | Rapport par ID : statut honnête, preuve et actions manuelles restantes. | À réaliser | Git/CI/URL ou rapport exhaustif |
