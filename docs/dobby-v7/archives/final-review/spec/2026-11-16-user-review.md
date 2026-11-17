# CODEX — DOBBY V7 — Corrections finales Archives / Stitch 22

## 1. Mission

Corriger les défauts relevés lors de la revue utilisateur du module Archives, sur la PR #17, actuellement au SHA de référence `aeed16e`.

**Priorité absolue : remplacer la consultation documentaire générique par la consultation fidèle des fiches natives de leurs modules d'origine.**

Intervenir sur la branche existante de la PR #17. Préserver l'ensemble des développements et validations déjà acquis.

## 2. Consultation des archives — correction structurante

Actuellement, le bouton « Consulter » ouvre une interface documentaire générique, sans restituer réellement la fiche archivée.

Ce comportement est refusé.

### Fonctionnement exigé

Lorsqu'un utilisateur sélectionne « Consulter » :

- Identifier le module d'origine et l'identifiant canonique de la fiche.
- Afficher **la véritable fiche native**, avec sa présentation, ses données et ses documents d'origine.
- Utiliser autant que possible les composants existants plutôt que développer une deuxième interface.
- Appliquer un mode lecture seule à toute fiche archivée.
- Conserver la navigation et le comportement de consultation propres au module, dans la mesure où ils n'entraînent aucune modification.
- Conserver une flèche permettant de revenir directement aux Archives.

Cas à couvrir :

**Contrats et Assurances :** informations contractuelles, échéances, références, PDF, avenants et historiques.

**Maison et Équipements :** fiche équipement complète, caractéristiques, programmes et historiques d'entretien, pièces jointes.

**Recettes :** présentation native de la recette, ingrédients, préparation, étapes, photographies et modes disponibles.

Tout autre type de fiche déjà pris en charge par l'archivage doit également retrouver sa présentation native, sans inventer de nouveaux modules.

Il est interdit de reconstruire une fiche simplifiée qui ferait perdre des informations ou des fonctionnalités de consultation.

## 3. Suppression de l'ancienne consultation générique

Supprimer de l'interface de consultation des Archives les composants suivants :

- Grande bannière de Dobby devant l'horloge.
- En-tête local « DOBBY — Archives & Grimoire » et message « Archivé · fiche conservée dans son module d'origine ».
- « Archives du foyer & Scriptorium », « Fiche Document & Aperçu » et textes d'ambiance.
- Bloc générique « Parchemin & Pièces jointes » et ses commandes de stockage/importation.
- « Registre des Métadonnées ».
- « Consignes du Foyer », avec ses boutons génériques de modification, retour et suppression.
- « Enregistrement et partage », ses commandes de gestion et synchronisation du foyer, ainsi que ses indications techniques.
- Toute navigation locale redondante.

Ces suppressions concernent **uniquement la page générique de consultation des Archives**.

Ne supprimer aucun champ, document, composant ou mécanisme nécessaire au fonctionnement normal des modules d'origine.

Ne pas modifier le module historique « Documents enregistrés » accessible depuis les Paramètres.

## 4. Bouton « Réactiver »

Ajouter un bouton **« Réactiver »**, clairement identifiable, idéalement en haut à droite de la fiche consultée.

Comportement :

1. Afficher une confirmation explicite avant toute modification.
2. En cas d'annulation, ne rien modifier.
3. Après confirmation, réactiver la fiche existante à travers le writer natif et les contrôles d'autorisation existants.
4. Conserver strictement identifiant, données, documents, historiques et relations.
5. Retirer la fiche de la liste des Archives.
6. La rendre à nouveau disponible dans son module d'origine.
7. Rediriger l'utilisateur vers la fiche réactivée.

Aucune duplication, recréation ou suppression préalable.

Les utilisateurs ne disposant pas des droits appropriés ne doivent pas pouvoir réactiver une fiche.

## 5. Illustration principale des Archives

L'illustration Stitch 22 est **visuellement validée**. Ne pas la remplacer, redessiner ou recadrer.

Elle est cependant beaucoup trop grande.

- Réduire son encombrement visuel d'environ **40 à 50 %**.
- Conserver les proportions et la composition.
- Conserver le titre en bas à droite.
- Ajuster le rendu sur mobile, tablette et ordinateur.
- Donner davantage de visibilité à la recherche et aux archives elles-mêmes.
- Ne pas introduire d'espace vide excessif.

Le module doit conserver son identité visuelle actuelle.

## 6. Contraintes techniques

- Réutiliser le modèle de données et le cycle d'archivage existants.
- Conserver les mécanismes natifs de sauvegarde, synchronisation, CAS et résolution des conflits.
- Aucun nouveau registre persistant d'archives.
- Aucun nouveau système documentaire.
- Aucune copie physique des pièces jointes.
- Aucune migration SQL ni intervention Supabase distante.
- Ne pas modifier les comptes Parents A/B.
- Ne pas rouvrir le contrôle Auth 31.
- Ne pas activer Missions V3 ou les droits enfant étendus.
- Préserver les modules Contrats, Maison, Recettes et Famille ainsi que les fonctionnalités déjà validées.
- Conserver les confirmations existantes avant archivage et réactivation.

## 7. Tests et preuves obligatoires

Effectuer des tests ciblés sur des données fictives représentatives.

Vérifier pour chaque type de fiche pris en charge :

- Archivage depuis le module source.
- Présence dans les Archives.
- Consultation avec rendu natif fidèle.
- Absence de modification possible pendant l'archivage.
- Accessibilité des documents et historiques.
- Retour correct vers la liste des Archives.
- Réactivation avec confirmation.
- Réapparition dans le module d'origine sans perte ni duplication.
- Respect des droits et comportement correct après sauvegarde/rechargement/synchronisation.

Comparer visuellement les fiches actives et archivées, avec des captures permettant d'identifier les écarts.

Vérifier les écrans aux largeurs 320, 390, 768 et 1440 px.

Exécuter les tests concernés et la CI pertinente. Ne pas répéter inutilement toutes les campagnes historiques déjà acquises.

L'échec historique Missions signalé sur `main` doit rester distinct de toute régression introduite par ce chantier.

## 8. Livraison

Lorsque les corrections sont achevées :

1. Mettre à jour la PR #17 avec les modifications et les preuves.
2. Publier un **nouvel aperçu interactif isolé**, sans écraser le précédent ni le site principal.
3. Vérifier l'URL hébergée sur ordinateur et mobile.
4. Fournir le SHA exact, l'URL, le bilan des tests et les éventuelles réserves.
5. Conserver la PR en brouillon pour revue utilisateur.

**Aucune fusion ni publication sur le site DOBBY principal sans validation explicite.**

### Critères DONE

La mission est terminée uniquement si :

- « Consulter » ouvre la véritable fiche native dans sa présentation d'origine.
- Aucun bloc documentaire générique parasite ne subsiste.
- La fiche est effectivement en lecture seule.
- « Réactiver » fonctionne avec confirmation et conservation intégrale des données.
- L'illustration principale est réduite sans modification de son esthétique.
- Les tests ciblés passent et les preuves sont disponibles.
- L'aperçu interactif corrigé est accessible.
- La PR #17 reste non fusionnée.

**Ne pas déclarer la mission terminée sur la seule base de tests unitaires : vérifier réellement le parcours visuel et fonctionnel dans l'aperçu hébergé.**