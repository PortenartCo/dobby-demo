# DOBBY V7 — Chantier FAM-01 à FAM-24
## Implémentation isolée, sans interférence avec le déploiement global

### 1. Mission

Implémenter les corrections fonctionnelles et graphiques validées lors de la revue du module **Famille — Le Salon des Curiosités**.

La mission concerne les membres, les fiches individuelles, l'Agenda et les Mémos.

**Un autre Codex travaille actuellement sur l'intégration et le déploiement global E01–E09. Les deux chantiers doivent être totalement indépendants.**

Travailler de manière autonome sur les corrections réalisables, effectuer les tests ciblés et enregistrer les modifications dans une branche locale dédiée.

**Ne pas fusionner, publier ou déployer les corrections Famille.**

### 2. Isolation obligatoire

Dépôt : `PortenartCo/dobby-demo`

Référence de départ immuable :

`faf89d50555a3201385eae51f9ef5f93c5bf0499`

Créer un worktree distinct et une branche locale :

`feat/dobby-v7-family-review-fam01-24`

Ne jamais modifier :
- la branche `feat/dobby-v7-global-review-20261112` ;
- la branche `main` ;
- les branches sources E07, E09, Runes et Missions ;
- les worktrees ou fichiers non suivis des autres sessions Codex ;
- les dossiers d'aperçus déjà publiés ;
- les workflows de déploiement.

Ne pas effectuer de `stash`, `reset --hard`, `clean`, rebase ou opération destructive sur le travail d'autrui.

**Aucun push, aucune PR et aucune CI distante avant mon autorisation.**

Les tests doivent fonctionner dans un environnement indépendant, avec ports et répertoires de preuves propres.

La CI globale actuelle comporte un échec fonctionnel. Distinguer les défauts hérités de cette référence des éventuelles régressions introduites par la mission. Ne pas entreprendre sa réparation hors du périmètre Famille.

### 3. Corrections de la page Membres

**FAM-01 — Effets visuels**

Rendre les effets magiques fonctionnels sur toutes les pages Famille, avec préférence activée par défaut, bouton ON/OFF, persistance et respect de `prefers-reduced-motion`.

**FAM-02 — Retour**

Rendre le cartouche « Registre des Âmes du Logis » cliquable et le faire revenir au Salon des Curiosités.

**FAM-03 — En-tête**

Harmoniser la typographie du titre « Membres de la Maisonnée ». Supprimer le cartouche d'introduction en italique et l'espace devenu inutile.

**FAM-04 — Couleurs des Maisons**

Personnaliser les cartes selon la Maison magique déjà enregistrée dans E05 : Gryffondor, Serpentard, Serdaigle ou Poufsouffle.

Utiliser les couleurs du référentiel existant, sans deuxième stockage. Conserver une présentation neutre pour les membres sans Maison.

**FAM-05 — Cartes simplifiées**

Supprimer les éléments redondants « Grimoire & reliques complètes », « Consulter la fiche » et « Grimoire personnel ».

Rendre la carte entière cliquable. Afficher essentiellement avatar, prénom, Maison, catégorie et éventuellement grade de Runes.

**FAM-06 — Registres**

Conserver un encadré compact « Prochains anniversaires », calculé depuis les dates de naissance des membres.

Déplacer les documents vers les Archives du Menu, les contacts d'urgence vers le Salon et les événements/rituels vers l'Agenda.

Ne pas créer de second registre.

### 4. Création et gestion des membres

**FAM-07/FAM-08 — Deux actions**

Sur la page Membres, remplacer l'action unique par :

1. « Ajouter un enfant ou un animal »
2. « Inviter une personne à rejoindre la famille »

La création directe concerne les enfants et les animaux du foyer.

Les adultes rejoignent le foyer par invitation et complètent eux-mêmes leur profil. Ne pas créer de faux mécanisme d'invitation : si l'authentification ou le rattachement réel manque, préparer le parcours UI et signaler la dépendance sans simuler une invitation envoyée.

Les modes création, consultation et modification doivent être distincts pour l'utilisateur, même si les composants sont partagés techniquement.

**FAM-09 — Suppressions**

Retirer du formulaire :
- Silhouette & Allégeance ;
- Apprenti / Herboriste / Gardien / Alchimiste ;
- personnalisation du sceau ;
- menu déroulant d'icône redondant ;
- textes techniques « non disponible ».

Les avatars et attributs magiques relèvent du Profil E05.

**FAM-10 — Identité**

Créer les champs :
- Prénom ;
- Nom ;
- Surnom facultatif.

Harmoniser le titre « Identité de l'enfant » ou « Identité du membre » selon la catégorie.

Préserver les données existantes, y compris les anciens membres dont le nom est enregistré dans un seul champ. Prévoir une évolution compatible avec le modèle et le writer natifs, sans perte silencieuse ni double source de vérité.

**FAM-11 — Catégories définitives**

Proposer :
- Bébé ;
- Enfant ;
- Gardien (animal de compagnie).

Les parents ne figurent pas parmi les catégories de création directe.

Un bébé est exclu par défaut des convives des repas familiaux. Un enfant est pris en compte dans les portions enfants. Un animal est exclu des portions et ne possède pas de compte utilisateur.

Ne pas changer automatiquement Bébé en Enfant selon l'âge.

Pour les animaux, adapter les champs utiles, notamment nom, espèce et date de naissance facultative.

Contrôler l'impact sur E07 et éviter toute modification destructive du calcul des repas.

**FAM-12 — Rituels & Mémoires**

Conserver une zone facultative de notes personnelles, réellement modifiable et enregistrée avec le membre. Harmoniser sa typographie. Conserver le ton ludique sans multiplier les encadrés.

**FAM-13 — Maison et Patronus**

Depuis la fiche d'un enfant ou d'un animal, proposer les parcours E06 existants lorsqu'un résultat manque.

Après le questionnaire, afficher Maison et Patronus avec leurs éléments visuels existants.

Les résultats doivent être attachés au bon identifiant de membre. Aucun choix manuel arbitraire, aucun second questionnaire.

**FAM-14 — Action principale**

Le bouton « Enregistrer le membre » doit utiliser le jaune doré des actions principales DOBBY, être bien visible sur mobile et ne pas être masqué par le dock. Conserver « Annuler » comme action secondaire.

### 5. Consultation, droits et fiche individuelle

**FAM-15 — Autorisations**

Appliquer les règles validées :

- Tous les membres du foyer peuvent consulter toutes les fiches.
- Chaque parent peut modifier sa propre fiche, ainsi que celles des enfants, bébés et animaux.
- Aucun parent ne peut modifier les données de l'autre parent.
- Un enfant ne peut modifier que sa propre Maison et son propre Patronus, par les parcours magiques.
- Bébés et animaux ne possèdent pas de session permettant des modifications autonomes.

Examiner l'identification réelle du membre connecté et les autorisations disponibles.

Les restrictions doivent être appliquées au niveau des opérations d'écriture, et pas seulement par masquage de boutons.

Si les permissions serveur ne permettent pas encore une garantie effective, ne pas inventer cette garantie. Documenter précisément le blocage et laisser les opérations concernées désactivées ou limitées au contexte de démonstration.

**FAM-16 — Galerie du Salon**

Remplacer les cartes membres actuelles dans « L'Horloge Enchantée » par une galerie compacte de portraits magiques :

- deux colonnes sur smartphone ;
- avatars E05 existants ;
- couleurs de la Maison ;
- prénom, catégorie, grade discret ;
- carte entièrement cliquable ;
- pas de bouton « Consulter » redondant.

Conserver « Gérer les membres » pour accéder au Carnet complet.

**FAM-17 — Fiche individuelle à reconstruire**

Le bouton « Consulter » du Salon dirige actuellement vers `health-person`, un carnet médical. Cette navigation doit être remplacée par une véritable fiche individuelle.

Structure fonctionnelle retenue :
- identité et informations personnelles ;
- Maison magique et Patronus ;
- Grimoire personnel et Runes ;
- Rituels & Mémoires ;
- accès secondaire au Carnet de santé.

Le Grimoire personnel existant est conservé.

**Attention : une nouvelle maquette Google Stitch pour cette fiche est actuellement en préparation et doit encore être validée par l'utilisateur.**

Ne pas inventer sa mise en page définitive. Préparer les contrats de navigation et de données, puis attendre la maquette validée pour la reconstruction visuelle.

### 6. Agenda familial

**FAM-18 — Retour contextuel**

Depuis le Salon :
- ajouter un événement ;
- annuler ou enregistrer ;
- revenir au Salon.

Depuis l'Agenda :
- ajouter ou modifier un événement ;
- annuler ou enregistrer ;
- rester dans l'Agenda.

Conserver l'origine de la navigation sans créer de parcours parallèle.

**FAM-19 — Harmonisation graphique**

Éliminer le deuxième header et le deuxième dock observés dans l'Agenda.

Conserver les composants permanents communs à DOBBY.

Supprimer les textes de présentation excessifs et les encadrés techniques non utiles, notamment « Évolution cible du foyer ».

**FAM-20 — Consultation et modification**

Chaque événement affiché dans la liste ou le calendrier doit permettre :
- consultation détaillée ;
- modification ;
- enregistrement sans doublon ;
- suppression après confirmation.

Conserver identifiant, informations existantes, provenance et mécanismes de persistance/synchronisation natifs.

Le retour doit respecter le point d'entrée, y compris depuis un aperçu dans le Salon.

### 7. Mémos familiaux

**FAM-21 — Suppression du cartouche**

Retirer « Plumier Privé du Foyer — Conservation Locale » et récupérer l'espace correspondant.

Ne pas supprimer le véritable suivi local/en attente/synchronisé.

**FAM-22 — Création et édition distinctes**

Supprimer les onglets « Création (Vierge) » et « Modification (Existant) ».

« Ajouter un mémo » ouvre un nouveau mémo vierge.

Cliquer sur un mémo existant ouvre sa consultation, avec possibilité de modification et suppression.

Ne jamais créer de doublon en modifiant un mémo existant.

**FAM-23 — Navigation**

Depuis le Salon, revenir au Salon.

Depuis la liste des mémos, revenir à cette liste.

Appliquer le même principe à Annuler, Retour et Enregistrer.

**FAM-24 — Reconstruction de l'éditeur**

Remplacer l'interface actuelle par un éditeur compact comprenant uniquement :
- titre ;
- zone de texte libre ;
- mots-clés facultatifs, discrets ;
- action principale jaune doré « Enregistrer le mémo ».

Supprimer les blocs décoratifs inutiles, les textes techniques et la barre de mise en forme.

En modification, préremplir les informations et utiliser « Enregistrer les modifications ».

**Préserver impérativement le writer natif E09**, `sharedFamilyNotes`, les révisions CAS, les conflits, le fonctionnement hors ligne, l'import volontaire des anciens mémos et les données locales non importées.

Ne pas créer de second moteur de mémos.

### 8. Méthode d'exécution

Avancer en trois lots dans le worktree isolé :

**Lot A — Correctifs immédiatement réalisables**

Navigation, effets visuels, titres, simplifications, cartes, Agenda, éditeur Mémos et correctifs de formulaires compatibles avec le modèle existant.

**Lot B — Modèle et autorisations**

Nouveaux champs, catégories, lien Cuisine, identités, droits et parcours magiques. Effectuer une analyse des impacts avant toute adaptation du modèle natif.

Ne pas élargir la mission aux autres modules au-delà des interfaces réellement nécessaires.

**Lot C — Fiche individuelle Stitch**

Préparer le raccordement, mais conserver la reconstruction visuelle en attente de la nouvelle maquette et de sa validation.

Ne pas inventer de maquette de substitution.

Ne pas interrompre tout le chantier pour un blocage limité à un lot. Livrer les autres corrections réalisées et testées.

### 9. Tests et contrôles

Exécuter les tests ciblés et les contrôles de non-régression utiles :

- Membres : création, modification, catégories, compatibilité des anciennes fiches.
- Retour vers Salon depuis Membres, Agenda et Mémos.
- Événements : création, modification, suppression et absence de doublons.
- Mémos : création, édition, suppression, persistance, conflits et conservation des anciens mémos.
- Profil magique : intégrité des résultats, avatars et Runes.
- Permissions : parent A / parent B / enfant, avec tests de refus d'écriture.
- Affichage : 320, 390 et 1440 px.
- Header et dock uniques, fixes et non superposés aux actions.
- Effets visuels activés/désactivés et mouvement réduit.

Utiliser exclusivement des données fictives dans les tests.

Comparer les résultats à la référence de départ. Identifier séparément les défauts préexistants et les régressions de cette mission.

Ne pas relancer inutilement les campagnes lourdes déjà validées sur les fichiers inchangés.

### 10. Contraintes absolues

Aucune modification du projet Supabase personnel ni d'une autre base.

Aucune migration SQL.

Aucune publication GitHub Pages.

Aucune écriture dans les branches du déploiement général.

Aucun changement de CI distante.

Aucun `push` de la branche Famille pendant ce chantier.

Aucune suppression de données existantes, de code métier ou de fonctionnalités sans justification et preuve de préservation.

Ne pas annoncer qu'une restriction parentale est garantie si elle n'a été testée que dans l'interface.

### 11. Livrables

Créer :

`docs/dobby-v7/FAM-01-24-IMPLEMENTATION.md`

Ce rapport devra contenir :
- les 24 décisions avec statut `IMPLEMENTE / TESTE / EN ATTENTE / BLOQUE` ;
- les commits locaux réalisés ;
- les fichiers modifiés ;
- les résultats des tests ;
- les captures à 320, 390 et 1440 px ;
- les dépendances qui nécessitent la nouvelle maquette Stitch ;
- les éventuels besoins d'évolution serveur ;
- les conflits potentiels avec la branche de déploiement globale ;
- les instructions de réconciliation future.

### 12. Critères de clôture

La mission est considérée comme livrée en développement lorsque les corrections réalisables sont implémentées, testées et enregistrées dans la branche locale indépendante.

Les points dépendant de Stitch ou d'autorisations serveur non disponibles restent explicitement en attente.

**Ne pas qualifier ce travail de déploiement ou de mise en production.**

Le dernier message doit fournir :
1. Branche et SHA locaux.
2. Corrections réalisées.
3. Tests et preuves.
4. Points bloqués.
5. Risques de réconciliation avec la version globale.
6. Confirmation qu'aucune autre branche, publication ni base de données n'a été modifiée.

**Arrêt obligatoire après les commits locaux et les contrôles. Attendre mon autorisation pour toute fusion, publication ou déploiement.**

Exécute les lots réalisables dès maintenant.