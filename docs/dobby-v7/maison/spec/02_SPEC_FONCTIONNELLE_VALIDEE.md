# DOBBY V7 — Maison & Équipements — Décisions validées par l'utilisateur

## Périmètre

Cette spécification rassemble **les décisions prises pendant la revue du module Maison & Équipements le 13 novembre 2026**, y compris les dernières précisions concernant l'import IA et les entretiens multiples. Ne pas modifier rétroactivement les décisions anciennes hors de ce module. Pour toute contradiction entre une capture d'écran ancienne et cette spécification, **cette spécification validée prévaut**.

## 1. En-tête et page Maison & Équipements

### Visuel

- L'ancien visuel (Dobby devant une horloge, contexte salon) ne correspond pas au module technique.
- Le **nouveau visuel Stitch 21 fourni et retenu** montre Dobby dans un atelier de mécanique magique, engrenages et outils ; atmosphère cinématographique fantastique et non cartoon. Source originale : `sources/stitch21/screen.png`, informations de style `sources/stitch21/DESIGN.md`.
- Intégrer **le visuel uniquement**, avec adaptation de la découpe sur desktop/mobile. Ne pas remplacer la page globale par la proposition Stitch ni copier tous ses styles.
- Faire disparaître la mention « FOURNEAUX & CONDUITS » : cela réduit abusivement le périmètre à une cheminée.
- Les commandes fixes de DOBBY (header, profil, dock 6 destinations) restent conformes aux autres modules et accessibles sur toutes les largeurs.

### Actions principales

- Supprimer « Export / Sauvegarde locale » sur cet écran ; les fonctionnalités natives de sauvegarde et restauration sont **conservées** sous Menu → Paramètres.
- Supprimer « Historique d'entretien » global sur cet écran ; l'historique est rattaché à la fiche de chaque équipement.
- La CTA principale est « + Ajouter un équipement », **large/pleine largeur utile**, même hauteur, lisibilité et typographie que les autres CTA DOBBY.
- Retirer l'action « Autre présentation », les accès redondants à l'export et les contrôles techniques de synchronisation.
- **Une barre unique de recherche locale** « Rechercher un équipement… », avec effacement, filtrant uniquement les équipements de cette page : nom, type/catégorie, marque, modèle, emplacement. **Supprimer** « Tous », « À surveiller », « Garanties » et les facettes de pièce. Le tri/relevé d'échéances n'est pas supprimé dans les données ; seuls les contrôles UI sont retirés.
- Une liste unique d'équipements réellement enregistrés, jamais des exemples silencieux. Les fiches permettent Consulter et Modifier depuis la liste.

### Suppression des éléments parasites

La capture `captures_revue/05_brouillons_blocs_page.png` montre plusieurs blocs à retirer :
- « Conseil d'entretien de Dobby » lorsqu'il affiche un contenu fictif/placeholder.
- Encadré bouclier central avec seulement des tirets et un point vert sans signification métier.
- Bloc « Enregistrement et sauvegardes », sa description « Équipements et historiques · Initialisation du foyer... », ses boutons « Données des équipements » et « Sauvegarde complète ».
- Texte technique « Membres et agenda : Initialisation du foyer ».

Le même bloc de sauvegarde **réapparaît au bas du formulaire** (`captures_revue/14_sauvegardes_bas_formulaire.png`) et doit être retiré de toutes les vues métier Maison. Ne pas retirer la sauvegarde réelle des Paramètres.

## 2. Ajout et modification d'un équipement

- Au clic sur Ajouter, afficher immédiatement un **formulaire vierge**, sans barre « Nouvel ajout / Édition (Poêle) ».
- Titre du formulaire neuf exact : **« Ajout d'un équipement au Logis »**.
- En modification depuis la carte/fiche, afficher **« Modifier l'équipement »** et les valeurs propres au bon ID. Aucun risque d'éditer un autre équipement depuis l'ajout.
- Supprimer les mentions « SANCTUAIRE DOMESTIQUE PRIVÉ », les badges sécuritaires décoratifs, le bouclier vide, la mise en garde « Échéance imminente / Prévoir le ramonage annuel certifié avant l'été » et les textes qui suggèrent des obligations fictives.
- Supprimer le bouton « Rayer définitivement cet équipement du registre » **du formulaire d'ajout**. La suppression réelle d'un équipement existant peut rester depuis sa fiche détaillée avec confirmation explicite et avertissement sur les documents/entretiens liés. Il ne faut pas supprimer l'action technique native sans alternative.
- Pour « Emplacement dans la demeure », la flèche actuelle suggère une liste alors que rien ne s'ouvre. Il faut **un véritable menu déroulant** des emplacements déjà utilisés et une action « + Nouvel emplacement » avec saisie puis réutilisation. Ne pas imposer une taxonomie fixe des pièces et ne pas créer de doublons par casse/espaces.
- Rendre **saisissable le N° de série / Réf. constructeur** qui affiche aujourd'hui « NON DISPONIBLE ». Champ facultatif, texte alphanumérique libre, persistant à travers édition, reload et sync autorisée ; présentation en détail.
- Conserver les champs métier utiles : nom, type/catégorie, marque, modèle, emplacement, achat, garantie, notes, prestataire, et autres données déjà présentes. Ne pas jeter les champs natifs inconnus d'anciennes fiches.
- Annuler sans mutation, enregistrer sans perte d'informations ; garder une gestion raisonnable des suppressions et des conflits de version.

## 3. Maintenance et entretien — changement structurel important

Le formulaire actuel « Fréquence de ramonage & révision » est propre au ramonage et son widget (+ / − / trois cases) n'est pas utilisable pour les autres équipements. Il doit être remplacé par **un ensemble répétable de programmes de maintenance**.

### Un équipement peut avoir 0, 1 ou plusieurs programmes

Exemple **illustratif, non réglementaire** : même chaudière :

| Type d'entretien | Fréquence fictive | Dernière intervention | Prochaine échéance |
|---|---|---|---|
| Ramonage du conduit | 12 mois | Date propre au ramonage | Calcul indépendante |
| Entretien de la chaudière | 36 mois | Date propre à l'entretien | Calcul indépendante |

Ces périodicités sont données comme **exemples utilisateur**, non comme règles belges. Aucune obligation légale déduite sans analyse de l'équipement, des prescriptions et de la région.

### Chaque programme doit porter

- ID stable et appartenance à un équipement unique.
- Intitulé libre (« Ramonage du conduit », « Entretien chaudière », « Remplacement filtre », etc.).
- Date du dernier entretien **connue ou inconnue**, clairement distinguée d'une intervention historique enregistrée.
- Fréquence : une quantité entière positive et une unité `mois` ou `années` (ou une représentation canonique en mois) ; pas de fréquence par défaut arbitraire.
- Prochaine échéance automatiquement calculée lorsque le dernier entretien et l'intervalle existent ; méthode calendaires robustes en fin de mois et années bissextiles.
- Prochaine échéance explicite facultative remplaçant la date calculée lorsque nécessaire, accompagnée du motif/source si possible.
- Prestataire habituel, notes et documents pertinents facultatifs.
- Possibilité d'ajouter, modifier, retirer un programme (avec confirmation des conséquences en cas d'historique).

### Historique d'entretien par équipement ET par programme

- Chaque intervention effectuée appartient à un équipement et, le cas échéant, à un programme précis.
- Champs utiles : date, type, description, prestataire, montant facultatif, notes et justificatifs.
- Lecture chronologique, modification ou suppression avec confirmation ; tout recalcul ne concerne que le programme associé.
- Il faut préserver les anciens `houseLogs` et dates historiques, y compris lorsque leur type n'est pas déterminé. Les événements hérités peuvent rester dans une catégorie « Interventions antérieures / non classées » jusqu'à rattachement explicite.
- **Ne pas créer d'événement historique fictif** lorsque l'utilisateur renseigne uniquement une « Dernière date connue » dans le formulaire initial.
- Une opération consignée comme réalisée met à jour uniquement la dernière date et la prochaine échéance de ce programme, selon les règles décidées. Ne jamais mettre à jour le ramonage lors de l'entretien chaudière.
- Pas de bandeau d'alerte générique, animé ou non fondé ; indiquer « À venir » / « En retard » seulement si une échéance véritable est calculée ou saisie. Pas de promesse de notifications système non implémentées.

## 4. Equipement, contrats et documents

- Consulter les documents de chaque équipement : facture d'achat, garanties, facture d'entretien, attestation, fiche technique, mode d'emploi, manuel, notice d'installation, rapport et photos.
- Plusieurs documents par équipement et par intervention si la capacité de stockage le permet. Préserver toutes les pièces historiques et les liens aux blobs existants.
- Réutiliser les objets de stockage natifs ; **les pièces attachées à un équipement sont actuellement indiquées comme locales**, tandis que les fiches équipement et historiques peuvent être synchronisées comme module familial. Ne pas promettre automatiquement la synchronisation des PDF sans vérification du transport, du bucket privé et des permissions. Les évolutions serveur éventuelles restent gated.
- Associer les contrats existants d'entretien/garantie à un ou plusieurs appareils **par IDs stables**, et réutiliser les champs/links du module Contrats PR #13 ; aucun second registre de contrats.
- Éviter la duplication des données contractuelles (échéance de contrat ≠ date d'entretien). Les liens affichés doivent mener à la bonne fiche Contrats.

## 5. Deux chemins d'enregistrement — manuel et avec mon IA

### Manuel

Formulaire structuré tel que décrit ci-dessus. Aucun moteur IA requis.

### « Importer des équipements avec mon IA »

Reprendre la **philosophie de l'import recettes** : l'utilisateur copie un prompt, ouvre **l'IA de son choix**, lui communique progressivement photos de factures, plaques, notices et autres documents. L'IA reconnaît chaque appareil, puis, selon les outils dont elle dispose, recherche la **documentation officielle correspondant au modèle exact** : fiche technique, spécifications, guide d'utilisation, mode d'emploi, instructions d'entretien, fiche fabricant, notice d'installation, et éventuellement certificats.

- **Pas d'IA appelée dans DOBBY** ni de dépendance OpenAI, Gemini, Claude ou API payante.
- L'IA prépare des fiches au fur et à mesure, mais **n'émet le livrable final qu'après « J'ai terminé »**.
- Format de sortie un **ZIP réel** avec `equipments.json` versionné et, quand récupérables et licites, les documents originaux et officiels. Fallback JSON honnête si l'IA ne sait pas créer/joindre un ZIP.
- Les données d'achat (date, prix, vendeur), marque, modèle, réf/numéro de série, garantie, emplacement connu et catégories restent distinctes des données trouvées en ligne.
- **Provenance obligatoire** : facture/photo de l'utilisateur (page), site officiel fabricant (URL exacte), document réellement ouvert ou source non confirmée. Consigner les informations manquantes/ambiguës et ne pas inventer de périodicité d'entretien.
- Un produit ressemblant ne justifie pas l'import automatique d'un mode d'emploi d'un modèle différent.
- DOBBY reçoit le ZIP, **vérifie localement le JSON et le contenu binaire** (type, taille, noms et chemins ZIP, doublons, nombre de pièces), affiche **un aperçu éditable**, propose ajouter/ignorer/mettre à jour pour chaque appareil, puis enregistre uniquement après confirmation explicite.
- À une mise à jour, conserver le même équipement, ses historiques d'entretien et ses documents ; pas de suppression ou remplacement silencieux.
- Les programmes distincts d'entretien sont représentés dans l'échange IA (0..N par équipement), avec leurs sources et incertitudes.
- Les factures personnelles restent contrôlées par l'utilisateur : ne pas envoyer les documents à un service externe depuis DOBBY ; avertir au moment de copier le prompt que la communication se fera dans l'IA choisie.

## 6. Périmètre et articulation avec les autres travaux

- Contrats & Assurances a déjà son propre mécanisme `dobby-contracts` ZIP/JSON (PR #13) : **ne pas modifier son format ni ses règles de sauvegarde**.
- La PR #12 a intégré des outils familiaux avec gates serveur fermés : ne pas contourner ces gates et ne pas attribuer à l'enfant un droit de modification non validé.
- La PR #11 (Famille/Runes) peut encore être active : ne pas toucher ses branches/worktrees. Réconcilier avant tout merge.
- Ne pas refaire ou rejouer des migrations Supabase antérieures. Toute nouvelle migration destinée à Maison doit être proposée, séparée et soumise à l'exécution manuelle de l'utilisateur.
- Ne pas transformer cette demande en refonte générale DOBBY, ni réouvrir Taverne, Courses, Missions, Cheminette, Famille ou Menu.

## 7. Distinction obligatoire entre constats et validation

- **Validé par utilisateur** : besoins et choix de conception ci-dessus + visuel Stitch21.
- **Observé dans le dépôt** : structure native Maison, documents locaux, maintenance simple, synchronisation de métadonnées `houseItems`/`houseLogs`, import Recettes et Contrats existant.
- **Non encore prouvé** : modèle final multi-plan réellement sauvegardé, nouveaux numéros de série synchronisés, PDFs équipement synchronisés, import ZIP équipement, fonctionnement de bout en bout de ces ajouts sur deux comptes réels.

Ces derniers éléments sont précisément le travail à réaliser, à tester et à signaler honnêtement dans la livraison.
