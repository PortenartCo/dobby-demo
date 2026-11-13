# CODEX — DOBBY V7 — Maison & Equipements

**MODE : EXECUTION** — réaliser, tester, intégrer puis déployer les améliorations de **Maison & Équipements** validées lors de la revue du 13/11/2026. Exécution autonome dans le périmètre autorisé, sans nouvelles questions sauf blocage irréductible. Produire les livrables dès que les étapes indépendantes sont terminées.

## Périmètre et ancrage initial

Dépôt : `PortenartCo/dobby-demo`. Dernier `main` observé : `54d74b9448a1c518d8a3c483cd4deaea1e493748` ; **relire le HEAD réel au démarrage**. Les PR #12 (socle familial) et #13 (Contrats & Assurances) sont fusionnées ; PR #11 (Famille/Runes) ouverte au dernier contrôle. Ne pas démarrer d'une branche ancienne ni écraser les changements ultérieurs.

Lire le `AGENTS.md` réellement applicable s'il existe (le répertoire racine ne le contenait pas au dernier inventaire ; vérifier les sous-répertoires), les consignes CI, puis examiner en priorité :

- `essai-stitch-v7/house-register.js` — routes `house`, `equipment`, `equipment-edit`, `maintenance`, sauvegardes et documents ; état initial du module.
- `essai-stitch-v7/register.js`, `essai-stitch-v7/family-engine.js` — interface et adaptateur vers le writer natif.
- `essai-stitch-v5-famille/family-v2.js` — données `houseItems`, `houseLogs`, `houseDocs`, saisies et fichiers natifs ; rechercher précisément les writers concernés.
- `essai-stitch-v5-famille/family-modules.js` — synchronisation familiale ; module `house` contient historiquement `houseItems`, `houseLogs`. Vérifier l'état le plus récent, notamment les gates PR #12/#11 et la distinction des pièces jointes locales.
- `essai-stitch-v7/documents-register.js` et le code Contrats fusionné par PR #13 — association aux équipements via identifiants stables, sans régression du flux `dobby-contracts`.
- `essai-stitch-v7/recipe-import.js`, `recipe-import-format.mjs`, `recipe-import-zip.mjs` — patron de l'importation d'un ZIP/JSON provenant d'une IA externe. Réutiliser les pratiques et helpers pertinents, sans détourner le format `dobby-recipes`.
- `essai-stitch-v7/tests/register-house.cjs`, `register-preservation.cjs`, `register-sync.cjs`, `register-navigation.cjs` et tests E08/contrats pertinents.

**Pièces jointes de référence contractuelles :** `02_SPEC_FONCTIONNELLE_VALIDEE.md` et `03_REGISTRE_RECETTE.md`. Toute décision du registre est obligatoire. Le visuel accepté est `sources/stitch21/screen.png`, livré avec sa provenance et `DESIGN.md`. Pour le transport IA, voir `04_CONTRAT_IMPORT_IA.md` et `05_PROMPT_IA_EXTERNE.md`.

## Protections des chantiers parallèles

1. Créer sa propre branche `feat/dobby-v7-maison-equipements-...` et un **worktree indépendant** ; garder intacts les worktrees des autres sessions Codex.
2. Avant modification et avant fusion, contrôler le dernier `main`, les PR ouvertes et les fichiers touchés. La PR #11 peut encore modifier les modules familiaux ; réconcilier chaque conflit **sans perdre** ses contrôles ni les changements Contrats.
3. Ne pas modifier les modules Missions/Runes, les permissions enfant, le flux Auth/Cheminette ni les schémas serveur en dehors des stricts besoins d'adaptation de Maison. Toute modification transversale nécessaire doit être minimale, testée et justifiée.
4. Aucun accès ou mutation directe Supabase distante. Toute migration nécessaire sur le projet personnel `dobby-family-sync` est préparée pour exécution manuelle par l'utilisateur, avec préflight, installation, vérification et retour arrière ; **ne pas rejouer** les anciennes migrations déjà exécutées.
5. Conserver intégralement équipements, entretiens, pièces jointes et archives historiques. Un schéma enrichi ne doit pas rendre des anciennes fiches non modifiables ni les tronquer silencieusement. Introduire un adaptateur de compatibilité si nécessaire.

## Objectifs fonctionnels

### A. Vue principale sobre

- Intégrer **exclusivement le visuel Stitch 21** de Dobby réparant un équipement dans un atelier magique. Cadrage responsive à 320, 390, 768, 1024 et 1440 px : tête, buste, geste de mécanicien et engrenages utiles visibles ; pas de découpe arbitraire. Aucun remplacement du header/dock global.
- Supprimer l'ancien visuel d'horloge/salon et le cartouche « FOURNEAUX & CONDUITS » ; l'intitulé Maison & Équipements reste généraliste.
- Bouton principal **« + Ajouter un équipement »** large / pleine largeur utile.
- **Une unique recherche locale** « Rechercher un équipement… » portant sur nom, catégorie/type, marque, modèle, emplacement, avec effacement. Supprimer « Tous / À surveiller / Garanties » et autres facettes, filtres et variantes décoratives de ce seul écran.
- Retirer de l'écran principal les entrées « Historique d'entretien » global et « Export / Sauvegarde locale », la navigation « Autre présentation », les conseils fictifs, les cartouches bouclier sans contenu, les encadrés de synchronisation/initialisation, « Données des équipements » et « Sauvegarde complète ». Les sauvegardes réelles doivent rester accessibles depuis Menu → Paramètres et leurs writers ne sont pas supprimés.
- Afficher directement les équipements réellement enregistrés ; aucune fiche de démo inventée. Pour chacun, nom/type/emplacement/prochaines actions pertinentes et boutons **Consulter**, **Modifier**.

### B. Création et modification

- Le clic « Ajouter » ouvre **directement le formulaire vierge**. Titre de création exact : « Ajout d'un équipement au Logis » ; titre de modification distinct : « Modifier l'équipement » (nom réel possible).
- Supprimer le sélecteur « Nouvel ajout / Édition (Poêle) » ; **modifier uniquement depuis la fiche ou la liste d'un appareil existant**. Aucun choix d'un exemple de poêle dans le formulaire de création.
- Retirer « SANCTUAIRE DOMESTIQUE PRIVÉ », icônes bouclier décoratives, alertes de ramonage fictives, cadre neutre avec tirets, sous-blocs « Enregistrement et sauvegardes », initialisation du foyer, bouton de suppression sur l'écran de création. Conserver les vraies erreurs utiles.
- Le champ « Emplacement dans la demeure » est une **vraie liste**, remplie des emplacements distincts déjà enregistrés ; entrée **« + Nouvel emplacement »** avec saisie. Pas de table des pièces inventée : privilégier l'index des emplacements existants et enregistrer la nouvelle valeur dans l'équipement une fois confirmé.
- Champ facultatif **« N° de série / Réf. constructeur »** réellement modifiable, persistant et visible en détail. Accepter références alphanumériques et séparateurs. Éviter d'inventer le numéro ou de le déduire du modèle.
- Garder les champs existants utiles (nom, catégorie, marque, modèle, achat, garantie, notes, fournisseurs, pièces). Modifier sans perte de valeurs inconnues, d'ID, de documents ou d'historique. Bouton Annuler correct ; suppression uniquement depuis la fiche d'un équipement existant, avec confirmation et contrôle des références/conséquences.

### C. Plusieurs programmes d'entretien par équipement

**Remplacer le calendrier unique par 0..N types d'entretien pour un même équipement.** Exemple purement illustratif : chaudière avec `Ramonage du conduit` 12 mois et `Entretien chaudière` 36 mois. **Ces chiffres ne sont pas des obligations réglementaires présumées.**

Pour chaque type : identifiant stable, nom, date du dernier entretien connu (ou inconnue), fréquence (nombre entier positif de mois/années), date de prochaine échéance calculée si possible, éventuelle date explicite dérogeant au calcul avec motif/source, prestataire habituel facultatif, notes et sources documentaires. Ajouter/modifier/supprimer un type sans affecter les autres.

- Un entretien réellement consigné possède son **historique par équipement et par type** : date, nature, prestataire, montant facultatif, description, notes, pièces justificatives. Modification/suppression avec confirmation et règles cohérentes de recalcul. Conserver les interventions existantes : migration/compatibilité, pas d'effacement.
- Enregistrer un entretien réalisé pour un type ne décale **que ce type** ; les autres sont inchangés.
- Ne jamais fabriquer une intervention historique à partir d'une date « Dernier entretien » initialement déclarée. La date déclarative de référence est distincte de l'événement historique réellement enregistré.
- Calcul calendaire exact (mois civils et années, fins de mois, 29 février) ; si information suffisante, une prochaine date est dérivée, modifiable explicitement. Sans dernière date ni date imposée, afficher « À renseigner ».
- Aucune alerte fictive : indication simple « Entretien à venir / en retard » seulement si une échéance réelle existe. Aucun rappel automatique annoncé sans mécanisme installé et effectivement vérifié.
- Historique accessible depuis **chaque équipement** ; supprimer le raccourci historique global de la vue principale.

### D. Documents et lien avec Contrats

- Maintenir les documents existants `houseDocs` et leurs fichiers locaux sans perte. Associer plusieurs fichiers au bon équipement et, idéalement, au bon type ou intervention : facture d'achat, facture d'entretien, attestation, fiche technique, notice, manuel, rapport, garantie.
- Ouvrir/consulter les PDF et images disponibles ; ne pas présenter un document absent comme présent. Attention à la limite réelle de fichiers et aux droits existants ; ne pas prétendre que les fichiers locaux sont automatiquement synchronisés.
- Relier l'équipement aux contrats d'entretien/garantie existants **par identifiant** via le module Contrats fusionné (PR #13). Pas de création d'un second catalogue de contrats, pas d'écrasement de ses fichiers/avenants. Préserver la possibilité pour un contrat de viser plusieurs équipements.

### E. Import « avec mon IA » (sans API interne)

Deux boutons sur l'écran d'ajout : **« Ajouter manuellement »** et **« Importer des équipements avec mon IA »**.

- Un prompt complet et copiable dans DOBBY (`05_PROMPT_IA_EXTERNE.md`, adapté au format de transport définitif) invite à envoyer **plusieurs documents progressivement** : factures d'achat, plaques signalétiques, photos, attestations et notices, pour un ou plusieurs équipements.
- L'IA externe choisie par l'utilisateur est chargée d'identifier le modèle **exact** et, si ses outils le permettent, de rechercher sur les sites officiels fabricants/distributeurs la fiche technique, le mode d'emploi, les instructions d'entretien et les PDF correspondants. Provenance, URLs et incertitudes obligatoires ; ne pas faire passer une notice voisine ou un résultat non vérifié pour un document de ce modèle. DOBBY lui-même ne fait **aucun appel IA ou scraping**.
- L'IA attend « J'ai terminé » avant de livrer un **ZIP réel** comprenant `equipments.json` et, uniquement si disponibles légalement et réellement, les documents originaux/PDF/imageries. Si elle ne peut pas créer un ZIP, retour JSON compatible et explication honnête.
- Implémenter un lecteur/validateur versionné `dobby-equipment` v1, selon `04_CONTRAT_IMPORT_IA.md` (adapter le modèle et synchroniser **ensemble** contrat, prompt et tests si une incompatibilité réelle est prouvée). Taille bornée, MIME/contenu cohérent, chemins sûrs, pas de ZIP bomb, références documentaires non falsifiées, dates valides.
- Prévisualisation par équipement : noms, série, achat/garantie, programmes distincts d'entretien, fichiers, sources/URL, inconnus et conflits. Corrections autorisées. Pour chaque entrée : ajouter / ignorer / mettre à jour une fiche explicitement choisie. **Aucune importation définitive sans confirmation**. Déduplication par identifiant exact et, à défaut, combinaison marque+modèle+série/éléments corroborés, avec traitement prudent des homonymes.
- Aucune suppression de valeurs, historiques, fichiers et plans existants lors d'une mise à jour partielle. En cas d'erreur d'un élément, ne pas affirmer que le lot entier est validé ; prévoir un comportement transactionnel ou un bilan explicite par équipement conforme au writer natif.

## Checkpoints d'exécution et preuve de DONE

**0 — État établi** : HEAD, PR ouvertes, sites/branches, chemins exacts, tests disponibles, contrat de stockage et mécanismes de permission. Lire ciblé avant de modifier. Remettre un relevé compact ; ne pas refaire de revue générale.

**1 — UI et données** : intégration image Stitch 21, nettoyage de la page, ajout/édition, emplacement, numéro de série, conservation des anciennes fiches. Tests ciblés et visuels à 320/390/768/1024/1440.

**2 — Maintenance et Contrats** : schéma compatible 0..N échéances, journal d'intervention, pièces, renvoi vers contrat lié, recalcul individuel. Tests causaux avec deux plans, intervalles 12 et 36 mois, et régression des données natives.

**3 — IA externe et ZIP** : prompt copiable, format versionné, lecture ZIP/JSON, aperçus, corrections, doublons, limites et confirmations. Tests de ZIP sain et malveillant/surcompressé, PDFs et données ambiguës ; aucune requête à un fournisseur IA depuis DOBBY.

**4 — Intégration** : vérifier les changements de PR #11, #12, #13, et les autres modifications de `main` ; intégrer sans écraser. Tests fonctionnels, autorisations de foyer/effets non perturbés, CSS/header/dock. Ne relancer la suite complète qu'une fois le candidat stabilisé. Donner commits et rapports.

**5 — Publication contrôlée** : fusionner et déployer automatiquement les parties vérifiées et autorisées **si** aucun conflit ni dépendance serveur non satisfaite. Si le changement serveur nécessaire n'est pas installé, conserver le gate fermé, déployer seulement les fonctions indépendantes sûres et documenter précisément le SQL manuel et la recette à venir. Vérifier CI, `main` après fusion, SHA effectivement servi et la page `https://portenartco.github.io/dobby-demo/` ; ne jamais assimiler la seule CI à une recette familiale réelle.

### Tests minimaux obligatoires

- Création et modification de deux appareils (dont un historique ancien) ; référence de série préservée et emplacement nouvellement créé réutilisé.
- Un appareil avec **deux programmes indépendants** (12 et 36 mois) ; une intervention sur A n'affecte pas B ; édition/suppression contrôlée ; date déclarée sans faux événement ; date manquante jamais inventée.
- Calcul des fins de mois et années bissextiles ; override explicitement identifié ; échéance dépassée et future.
- Maintien de tous les `houseItems`, `houseLogs`, `houseDocs` existants, fichiers et contrats liés après reload et sauvegarde native.
- Recherche locale sans filtres ; aucun bloc décoratif/sauvegarde supprimé ne réapparaît ; accès sauvegarde complet depuis Paramètres intact.
- Lecture/consultation PDF/notice réelle de **test** et préservation de la pièce si un autre champ est modifié.
- `dobby-equipment` v1 valide/ancien/incorrect, archives tronquées, traversal, ZIP bomb, doublons et référence manquante ; annulation sans effet.
- Parent/enfant et foyer : ne jamais ouvrir des écritures à un compte non autorisé. Test local en fixture distingué d'une preuve live.
- Responsive 320/390/768/1024/1440, clavier et scroll, header et dock fixes ; visuel Stitch conservant Dobby dans le cadrage.
- Non-régression Contrats (y compris `dobby-contracts` ZIP), Recettes, Courses, Menu/Famille, Missions et sync. Ne pas créer de deuxième moteur de données.

### Rapport final et matrice

Rendre la liste de **tous les IDs** de `03_REGISTRE_RECETTE.md` avec statut : `DÉPLOYÉ_ET_TESTÉ`, `PARTIEL`, `BLOQUÉ_SQL`, `BLOQUÉ_RECETTE_RÉELLE` ou `NON_FAIT`, et lien vers preuve (test/screenshot/commit). Donner les écarts, PR/commits, pipeline/CI, SHA hébergé, essais utilisateurs restants, scripts SQL manuels exacts et les éventuelles différences entre déploiement technique et fonctionnement réellement opérationnel. **Ne déclarer aucun point réalisé sans preuve correspondant à son niveau de risque.**

Ne sollicite pas l'utilisateur pour des détails déjà approuvés dans ces pièces. Termine les travaux indépendants et préserve les gates pour toute intervention humaine indispensable.
