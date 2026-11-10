# CODEX — DOBBY E08 : Harmonisation Contrats & Assurances

**MODE : EXÉCUTION — Mission indépendante, ciblée et vérifiable.**

## 1. Références

Dépôt : `PortenartCo/dobby-demo`

Créer la branche `feat/dobby-e08-contrats` depuis E05 au SHA :

`8418682e5094b66ee879fbf18dcd1e6a3b6d5a05`

E06 est livré séparément. E07 est en développement. Ne pas modifier leurs branches ni fusionner leurs travaux.

Lire les éventuelles instructions `AGENTS.md` applicables.

### Écran concerné

**Contrats & Assurances du Logis — version Stitch 2**

Route canonique : `famille.html#contracts`

Source originale :
`design/stitch-53/dobby_contrats_assurances_ch_ances_du_foyer_2/code.html`

Fichiers et composants de référence :

- `essai-stitch-v7/documents-register.js`
- `essai-stitch-v7/register.css`
- `essai-stitch-v7/chrome.js`
- `essai-stitch-v7/build-register.cjs`
- `essai-stitch-v7/route-manifest.json`
- `docs/dobby-v7/evidence/lot-4/README.md`

Fonctions importantes dans `documents-register.js` :
- `list(isContract,variant)`
- `scope()`
- `contracts()`

**Pièce jointe : `DOBBY-E08-ILLUSTRATION-CONTRATS.zip`**

Elle contient l'illustration définitive choisie par l'utilisateur (`screen.png`) et le document de style Stitch.

Vérifier sa présence avant de commencer. L'image doit devenir un asset local DOBBY.

## 2. Objectif

Appliquer les sept corrections visuelles et ergonomiques validées sur la page Contrats & Assurances.

Il s'agit d'une **consolidation de la page existante**, pas d'une nouvelle conception.

Préserver :
- Le registre `familyDocs`.
- Le writer natif.
- La recherche et le filtrage.
- La consultation et la modification des fiches.
- Les pièces jointes.
- Les mécanismes de partage existants.
- Les autres pages Documents, Contrats et Assurances.

Ne pas modifier les 53 sources Stitch originales.

## 3. Correction 1 — Bandeau supérieur

Le bandeau actuel affiche un sous-titre tronqué.

**Réutiliser exactement le bandeau commun DOBBY**, sans variante spécifique au module Contrats.

Afficher un intitulé court et lisible :

**« Contrats & Assurances »**

Conserver les mêmes dimensions, typographies, boutons et comportements que sur les autres modules validés.

Le titre long doit rester dans le contenu de la page.

Aucune troncature, même à 320 px.

Éviter une modification globale de `chrome.js` si une adaptation localisée du libellé suffit.

## 4. Correction 2 — Nouvelle illustration

Remplacer l'image principale actuelle par le `screen.png` de l'archive jointe.

C'est le nouveau visuel de référence : Dobby dans un bureau magique, avec livres, parchemins et objets anciens.

Exigences :
- Image stockée localement dans les assets DOBBY.
- Cadrage panoramique adapté aux écrans mobiles.
- Dobby bien visible, sans couper son visage ou son buste.
- Pas de déformation de l'image.
- Aucune URL externe temporaire.
- Conservation de l'ambiance graphique originale.

L'illustration ne doit pas être régénérée ou remplacée par un autre personnage.

Conserver une trace de provenance du média.

## 5. Correction 3 — Cartouche de l'illustration

Repositionner l'étiquette :

**« ✦ Registre des contrats ✦ »**

Elle doit se trouver **en bas à droite de l'illustration**, et non en haut à gauche.

Conserver :
- Fond sombre.
- Bordure dorée.
- Typographie existante.
- Marges intérieures et extérieures cohérentes.

Veiller à ne pas masquer Dobby ni un élément important du décor.

Conserver le bouton de réduction existant en haut à droite si son fonctionnement est réel.

## 6. Correction 4 — Typographie du titre principal

Le bloc :

- Surtitre : « Actes scellés & échéances du foyer »
- Titre : « Contrats & Assurances du Logis »
- Sous-titre descriptif

doit reprendre exactement les conventions typographiques communes des autres pages DOBBY.

Réutiliser les composants, tailles, graisses, espacements, alignements et styles déjà validés, notamment sur la Taverne et le Salon des Curiosités.

Aucune typographie spécifique à Contrats.

Le titre doit être entièrement lisible à 320, 390 et 1440 px.

Conserver une hiérarchie claire sans multiplier les textes décoratifs.

## 7. Correction 5 — Cartes des contrats

Les cartes actuelles sont plus étroites que les autres sections.

Les aligner sur la même largeur utile et les mêmes marges latérales.

Chaque contrat ou assurance doit disposer d'une carte distincte comprenant :

- Intitulé.
- Catégorie.
- Organisme ou prestataire, si connu.
- Référence, si renseignée.
- Date d'échéance, si connue.
- Bouton « Consulter ».

Conserver le comportement natif actuel : `contracts()` sélectionne les fiches de catégories « Contrats » et « Assurances » ; `list()` applique recherche, filtre et tri.

**Ne jamais limiter arbitrairement la liste à quelques contrats.**

Tester les listes vides, à une fiche et à plusieurs dizaines de fiches.

La recherche et les filtres doivent continuer à fonctionner sur l'ensemble des données enregistrées.

Aucune donnée fictive ne doit être intégrée au registre réel.

## 8. Correction 6 — Suppression du bloc « Archives »

Supprimer entièrement ce grand cartouche de la page principale Contrats.

Redistribuer seulement les actions utiles :

- **Ajouter un contrat** : bouton principal accessible dans la partie supérieure.
- **Importer un fichier** : action secondaire accessible.
- **Tous les documents** : lien discret vers le module Documents.

Retirer de cette page :

- « Autre présentation ».
- « Mémos locaux ».
- « Exporter les fiches et mémos (JSON) ».
- « Importer une sauvegarde JSON ».
- Les explications techniques d'import/export.

Ne pas supprimer les fonctions sous-jacentes.

Les mémos et sauvegardes doivent rester accessibles par leurs modules ou menus existants lorsqu'un accès existe déjà. Si aucun accès de remplacement n'existe, le signaler sans créer une nouvelle page de paramètres dans E08.

Conserver la compatibilité technique de la route historique `contracts-1`, mais ne plus proposer de bascule vers cette variante depuis la page canonique.

## 9. Correction 7 — Suppression du bloc « Enregistrement et partage »

Retirer intégralement de la page Contrats :

- Le titre « Enregistrement et partage ».
- Les textes explicatifs de synchronisation.
- Les boutons « Gérer le foyer » et « Synchroniser le foyer ».
- Le pied de page « Membres et agenda : Foyer non connecté ».

**Attention : suppression visuelle uniquement.**

Ne pas modifier :
- La connexion au foyer.
- Le partage familial.
- Le client Supabase.
- Le writer.
- Les règles de synchronisation.
- Les comportements de conflit.

La synchronisation doit continuer selon le fonctionnement existant.

Un échec ou un conflit nécessitant une action humaine peut toujours être signalé par les mécanismes de notification déjà disponibles. Ne pas masquer les erreurs réelles.

Isoler ce changement à la page Contrats : ne pas supprimer ces éléments des autres vues documentaires qui en ont besoin.

## 10. Amélioration complémentaire — Prochaines échéances

Exploiter les dates d'échéance réellement enregistrées dans `familyDocs`.

Ajouter une section compacte **« Prochaines échéances »** avant la liste des contrats, uniquement si des dates exploitables existent.

Afficher au maximum les trois prochaines échéances à venir, avec :
- Nom du contrat.
- Date.
- Bouton de consultation.

Les contrats sans échéance restent visibles dans la liste générale.

Ne pas créer :
- Calculs juridiques de préavis.
- Alertes automatiques.
- Renouvellements fictifs.
- Dates supposées.
- Nouveau stockage.

Si aucune échéance future n'est renseignée, ne pas afficher un grand cartouche vide.

## 11. Structure finale attendue

Ordre des sections :

1. Bandeau supérieur DOBBY standard.
2. Nouvelle illustration de Dobby, avec cartouche en bas à droite.
3. Titre principal harmonisé.
4. Recherche et filtres.
5. Action « Ajouter un contrat » et accès secondaire à l'import.
6. Prochaines échéances connues, si elles existent.
7. Liste complète des contrats et assurances.
8. Accès discret aux documents.

**Aucun bloc Archives, Partage ou Synchronisation en bas de page.**

Conserver une présentation fantasy premium, sans surcharger l'interface.

## 12. Exécution technique

Procéder en trois étapes :

**A — Adaptation locale**
- Identifier le rendu de `contracts`.
- Installer l'illustration.
- Réorganiser les composants DOM et les styles ciblés.
- Préserver la génération reproductible des templates.

**B — Fonctionnement**
- Vérifier les contrats et assurances existants.
- Tester recherche, filtres, tri, consultation et ajout.
- Vérifier que les autres vues documentaires ne sont pas modifiées.
- Contrôler que les fonctions natives masquées restent intactes.

**C — Recette**
- Captures comparatives à 320, 390 et 1440 px.
- Test avec 0, 1, 10 et 50 fiches simulées.
- Titres longs, organismes longs et échéances manquantes.
- Absence de troncature, chevauchement et débordement.
- Chargement local de l'illustration.
- Non-régression des écrans Documents et Contrats.
- Contrôle ciblé de la synchronisation existante sans comptes réels.

Utiliser prioritairement :
- `essai-stitch-v7/tests/register-documents.cjs`
- `essai-stitch-v7/tests/register-documents-sync.cjs`

Ajouter les tests causaux nécessaires aux changements E08.

Exécuter ensuite une seule campagne générale de non-régression adaptée au périmètre et attendre les CI du SHA final.

Ne pas lancer de tests répétitifs sans modification correspondante.

## 13. Définition de DONE

E08 est prêt pour revue lorsque :

1. Les sept corrections sont appliquées.
2. La nouvelle illustration s'affiche localement.
3. Le bandeau et les titres sont conformes aux autres modules.
4. Toutes les fiches enregistrées correspondant aux filtres peuvent être consultées.
5. La section Échéances utilise uniquement des dates réelles.
6. Les blocs Archives et Partage ont disparu de cette page.
7. Aucune fonction métier existante n'a été supprimée.
8. Les autres modules ne présentent aucune régression.
9. Les tests ciblés et les CI du SHA final sont documentés.
10. Les captures comparatives permettent une véritable revue visuelle.

## 14. Restrictions et livraison

Ne pas :
- Modifier les sources Stitch originales.
- Créer un nouveau module Contrats.
- Refondre les cinq pages existantes.
- Modifier Supabase ou les writers.
- Modifier E06 ou E07.
- Fusionner des branches.
- Publier sur GitHub Pages.
- Introduire un nouveau framework ou design system.

Pousser la branche `feat/dobby-e08-contrats`.

Créer un rapport :

`docs/dobby-v7/E08-CONTRATS.md`

Y inclure les commits, les modifications, les captures, les tests, les CI et les éventuelles limites restantes.

Distinguer code modifié, tests exécutés, intégration vérifiée et recette réelle.

**Arrêt après livraison pour revue humaine. Aucune fusion ni publication.**