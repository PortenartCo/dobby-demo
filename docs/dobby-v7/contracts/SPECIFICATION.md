# DOBBY V7 — Refonte complète du module Contrats & Assurances

**MODE EXÉCUTION — Développement, tests, intégration et déploiement contrôlé.**

## 1. Mission et contexte

Dépôt : `PortenartCo/dobby-demo`.

Dernier commit `main` connu : `b77cb9de100a864c8aace8fb9e07053220ccd23a`. Vérifie son état actualisé au démarrage.

Le module Contrats & Assurances a été entièrement revu avec l'utilisateur. Les décisions ci-dessous sont **validées et constituent le cahier des charges**.

Développe directement dans l'application native DOBBY V7, sans nouvelle démonstration indépendante ni refonte des autres modules.

Une autre session Codex travaille actuellement sur les dépendances Supabase familiales, Missions/Runes V3 et droits Parent/Enfant. **Ne perturbe pas ce chantier.** Utilise une branche et un worktree indépendants. Vérifie les évolutions de `main` avant intégration et évite toute modification concurrente du schéma ou des permissions.

Respecte les instructions `AGENTS.md` applicables, si présentes.

### Points d'ancrage existants

- `essai-stitch-v7/documents-register.js` : routes, listes, détails, formulaires, pièces jointes et synchronisation documentaire.
- `essai-stitch-v7/register.js` : formulaires et composants communs.
- `essai-stitch-v7/family-engine.js` : façade des données natives.
- `essai-stitch-v5-famille/family-v2.js` : mécanismes familiaux et données persistantes.
- `essai-stitch-v7/house-register.js` : équipements de la maison.
- `essai-stitch-v7/recipe-import.js`, `recipe-import-format.mjs` et `recipe-import-zip.mjs` : référence fonctionnelle du parcours d'importation par IA externe.
- `essai-stitch-v7/tests/e08.cjs` : tests actuels du module.
- `docs/dobby-v7/REVUE-GENERALE-LIVRAISON.md` : état consolidé de la précédente livraison.

Cherche les dépendances exactes avant modification. Conserve les writers natifs et la compatibilité avec les données existantes.

## 2. Liste principale — Interface

Harmoniser le module avec Accueil, Missions, Famille, Taverne et Menu.

- Titre unique : **« Contrats & Assurances »**.
- Sous-titre : « Retrouvez les contrats, assurances et échéances du foyer. »
- Supprimer le sur-titre « Actes scellés & échéances du foyer ».
- Supprimer les grandes illustrations décoratives.
- Conserver le style premium DOBBY, avec une présentation sobre et des typographies cohérentes.
- Supprimer le sélecteur « Toutes / Assurances » et le bloc de catégories.
- Ne pas séparer les assurances des autres contrats dans la liste.
- Utiliser un compteur neutre : « X éléments enregistrés ».
- Supprimer le lien redondant « Tous les documents ».
- Supprimer les cartes fictives ou de démonstration. La fiche « DOBBY - TEST DE TRANSFERT » ne doit plus être présentée comme donnée d'exemple. Si elle est réellement persistée, ne pas la supprimer silencieusement : utiliser le mécanisme normal de suppression avec confirmation utilisateur.

La liste doit afficher directement des fiches compactes, classées par prochaine action utile.

### Contenu de chaque fiche

Afficher :

1. Nom du contrat.
2. Type de contrat (assurance, entretien, énergie, abonnement, autre).
3. Maison entière ou équipement(s) concerné(s).
4. Prochaine échéance.
5. **Date limite pour donner renon**.
6. Indication visuelle discrète lorsqu'une action approche.
7. Action « Consulter » permettant d'ouvrir la fiche détaillée.

Les dates absentes doivent être indiquées « À renseigner », jamais inventées.

Conserver une recherche simple. Pas de filtres décoratifs ou redondants.

## 3. Formulaire « Ajouter un contrat manuellement »

Remplacer le formulaire documentaire générique par quatre sections.

### A. Identification

- Nom du contrat (obligatoire).
- Type de contrat (entretien/maintenance, assurance, énergie, abonnement, autre ; prévoir une extension simple).
- Organisme, fournisseur ou assureur.
- Périmètre : « Maison entière » ou « Un ou plusieurs équipements ».
- Si équipements : sélection des équipements réellement enregistrés dans Maison & Équipements, par identifiants stables, sans recréer une seconde base d'appareils.

### B. Durée et échéances

- Date de prise d'effet.
- Prochaine échéance.
- Reconduction automatique : Oui / Non / Inconnue.
- Durée de reconduction, lorsqu'elle est applicable.
- Délai de préavis : valeur et unité adaptées (jours ou mois calendaires).
- Modalités du renon, lorsqu'elles sont connues.
- Date limite de renon : explicite ou calculée à partir des clauses enregistrées.
- Rappels avant la date limite de renon.

Ne jamais calculer un préavis arbitraire. Vérifier le comportement des mois calendaires, des années bissextiles et des dates invalides. Distinguer les dates saisies, calculées et inconnues. Ne pas prétendre que le calcul d'une date prouve qu'un renon serait juridiquement valable.

Les rappels proposés sont à 90, 30 et 7 jours, éventuellement modifiables. Réutiliser le moteur de rappel natif s'il existe. Sinon, préparer l'échéancier sans annoncer de notifications automatiques fictives.

### C. Compléments

- Référence ou numéro du contrat.
- Montant et périodicité.
- Notes libres.
- Conditions particulières de résiliation.

### D. Documents

- Ajouter le contrat original.
- Autoriser plusieurs documents associés : contrat, avenants, conditions générales, courriers et autres pièces.
- Consulter chaque pièce depuis la fiche.
- Permettre ajout et remplacement contrôlé sans effacer les autres pièces.

Dans la liste et dans le détail, rendre la consultation du document original facilement accessible. Pour les PDF, privilégier un aperçu intégré compatible mobile, avec ouverture, zoom natif lorsque disponible et téléchargement.

Réutiliser le stockage privé familial existant ; ne pas inventer un nouveau bucket ni transférer silencieusement des fichiers. Conserver explicitement la distinction fichier local / fichier effectivement partagé. Les membres autorisés doivent pouvoir consulter les documents réellement synchronisés.

### Éléments à supprimer du formulaire

- Illustrations sans fonction.
- Encadrés décoratifs « Note de vigilance de Dobby » et encadré vert à cadenas.
- Champ « Catégorie native » en tant que classification documentaire.
- Champ « Personne concernée », remplacé par Maison / Équipements.
- Champ « Mots-clés ».
- Sections génériques peu pertinentes.
- Bloc « Enregistrement et partage ».
- Boutons « Gérer le foyer » et « Synchroniser le foyer ».
- Message technique « Membres et agenda : Initialisation du foyer ».

Ne pas supprimer les alertes de validation réellement utiles, les messages d'erreur ou les contrôles de sauvegarde. Les opérations avancées de synchronisation restent dans Menu → Paramètres.

## 4. Deux méthodes d'ajout

La page doit proposer deux actions distinctes et clairement identifiables :

**A. « Ajouter un contrat manuellement »**

Ouvre le formulaire défini ci-dessus.

**B. « Importer des contrats avec une IA »**

Mettre en place un parcours comparable à l'importation des recettes, en réutilisant son architecture lorsqu'elle est pertinente.

### Parcours IA externe

1. L'utilisateur clique sur « Importer des contrats avec une IA ».
2. DOBBY présente un prompt complet prêt à copier.
3. L'utilisateur choisit son IA préférée, capable de recevoir et analyser ses documents.
4. Il transmet progressivement des PDF, images et contrats successifs, dans une même conversation.
5. L'IA extrait les informations structurées, identifie les incertitudes et conserve les références aux sources.
6. L'IA ne génère le livrable final que lorsque l'utilisateur indique « J'ai terminé ».
7. L'IA fournit un ZIP téléchargeable contenant les fiches structurées et les documents originaux disponibles.
8. L'utilisateur importe le ZIP dans DOBBY.
9. DOBBY valide le format, montre un aperçu des contrats, permet de corriger les données et traite les doublons.
10. L'importation n'est confirmée qu'après validation explicite.

Aucun appel automatique à OpenAI ou à une autre IA depuis DOBBY. Aucun abonnement IA ni coût API ajouté.

### Format d'importation

Créer un contrat d'échange versionné, par exemple :

`format: "dobby-contracts", version: 1`

Il doit comprendre un manifeste JSON des contrats et, lorsque disponibles, les documents sources avec des chemins relatifs sûrs et des associations explicites.

Le schéma doit représenter exactement les champs du formulaire manuel, les valeurs inconnues, la provenance et les clauses utiles au calcul des échéances.

Prévoir un identifiant stable par contrat, une détection des doublons et des choix par entrée : ajouter, ignorer, mettre à jour de manière contrôlée.

Vérifier les ZIP : tailles, nombre de fichiers, types réellement autorisés, chemins dangereux, archives compressées excessivement, incohérences des pièces, fichiers absents et doublons.

Ne jamais écraser silencieusement un contrat, des avenants, une révision ou des données supplémentaires.

Si une IA ne peut pas produire un véritable ZIP, son prompt doit l'indiquer clairement et permettre un export JSON compatible lorsque cela est techniquement possible.

### Prompt destiné à l'IA externe

Le prompt copiable doit demander :

- De regrouper correctement les pages d'un même contrat.
- De distinguer les différents contrats et leurs avenants.
- D'extraire le type, l'objet, le fournisseur, les références, montants, dates, renouvellements et clauses de renon.
- De citer les pages ou passages sources lorsque disponibles.
- De ne jamais inventer un montant, une garantie, un délai ou une date.
- De signaler explicitement toute ambiguïté.
- De ne pas confondre échéance, renouvellement et date limite de renon.
- De restituer les documents originaux uniquement lorsqu'ils sont disponibles et que leur inclusion est possible.
- D'attendre « J'ai terminé » avant de générer le fichier final.

Respecter les données contractuelles privées : aucun envoi du document à un tiers depuis DOBBY sans action explicite de l'utilisateur.

## 5. Modèle de données et synchronisation

Les nouvelles informations doivent être **réellement persistées**, y compris après rechargement et synchronisation familiale.

Examiner le modèle existant `familyDocs` et ses writers avant d'introduire des champs.

Garantir :

- Compatibilité avec les anciennes fiches Contrats/Assurances.
- Conservation des champs inconnus et des pièces existantes.
- Pas de perte d'information lors de la modification d'une ancienne fiche.
- Pas de doublon entre module Contrats et Archives documentaires.
- Pas de second moteur de stockage concurrent.
- Pas de fausse confirmation de synchronisation.
- Contrôle des droits réellement applicables au foyer.

Si le schéma Supabase doit évoluer, fournir le SQL manuel minimal, avec préflight, installation, vérification et retour arrière. **Ne pas l'exécuter à distance.**

Les parties réellement dépendantes d'un changement serveur non installé restent désactivées avec une explication claire, sans bloquer les corrections indépendantes.

## 6. Tests de recette

Créer les tests ciblés et vérifier au minimum :

- Liste vide, un contrat, plusieurs contrats, fiches anciennes et données partielles.
- Affichage uniforme sans filtres ni illustrations supprimées.
- Création, modification et consultation de contrats.
- Association à la maison ou à plusieurs équipements existants.
- Échéances, préavis explicites, calculs calendaires et dates inconnues.
- Rappels affichés sans fausse notification.
- Consultation d'un PDF réel de test, ajout d'avenants et conservation des anciennes pièces.
- Import ZIP valide, malformé, incomplet et comportant des doublons.
- Importation sans écrasement des données existantes.
- Enregistrement puis rechargement des métadonnées.
- Vérification de la persistance et des permissions selon les capacités serveur disponibles.
- Aucune suppression de donnée réelle sans confirmation.
- Responsive à 320, 390, 768, 1024 et 1440 px ; défilement et clavier mobile.
- Non-régression de Maison & Équipements, Archives, Famille, Courses et du Menu.
- Absence d'altération des modules en cours de développement par l'autre mission Codex.

Tests ciblés d'abord, puis élargissement seulement si les modifications ou les risques le justifient.

## 7. Déploiement

Travailler par checkpoints :

**A — Audit ciblé :** état des sources et capacité réelle des writers.

**B — Développement :** liste, formulaire, documents, échéances et importation.

**C — Recette :** tests fonctionnels, persistance, imports et non-régression.

**D — Publication :** commits, PR, intégration et déploiement si tous les contrôles applicables sont satisfaits.

Avant la fusion, vérifier si l'autre chantier Codex a modifié les mêmes fichiers ou contrats de données. Si oui, réconcilier et retester ; ne pas forcer le merge.

Déployer la partie réellement opérationnelle sur l'URL canonique :
`https://portenartco.github.io/dobby-demo/`

Vérifier CI, SHA effectivement servi et interactions hébergées. Les fonctions nécessitant encore une intervention Supabase doivent être clairement distinguées.

## 8. Rapport final obligatoire

Produire un rapport court mais exhaustif indiquant :

- Décisions de revue implémentées, point par point.
- Commits et PR.
- Tests exécutés et résultats.
- Captures mobile et PC.
- Fonctionnalités réellement persistantes.
- Capacités de synchronisation effectivement vérifiées.
- Parcours ZIP développé, validé et publiable.
- Déploiement avec SHA hébergé et URL.
- Réserves et interventions manuelles indispensables.
- Éventuels conflits ou dépendances avec le chantier Supabase familial.

Distinguer code écrit, tests, intégration, publication et fonctionnement réel.

**Poursuis toutes les étapes indépendantes autorisées sans sollicitation inutile. Ne prétends pas avoir terminé une fonction dont le backend n'est pas vérifié.**