# PREP-01 — Plan d’intégration

Source : demande utilisateur du 12 novembre 2026 ; base exacte `5b764ef367553e9945fb72a6b563b55adc41e040`. Branche `feat/dobby-v7-preparations-20261112`. Visuels : les quatre couples HTML/PNG sous `design/stitch-preparation-20261112/stitch_dobby_assistant_mobile_app/`. ZIP vérifié SHA256 `9f406b2d93b82624f564e7da0a459834cb5a1730890b66aa41b57f8749a87ed6`.

## Carte des points d’extension avant écriture applicative

- Source canonique visible : `essai-stitch-v7/`, ses quatre racines générées par `build-source.cjs`. `family.js` compose les vues ; `chrome.js` est le seul header/dock à cinq destinations.
- Données natives : `essai-stitch-v5-famille/index.html`, `st`, `save()` et iframe existante ; `family-engine.js` est la façade V7. Les anciennes `famLists` restent intactes et séparées des modèles.
- Agenda : `family-agenda.js::submitFamilyEvent`, unique writer ; `family-agenda-review.js` importe son formulaire. Ses IDs stables et champs supplémentaires sont conservés. Association ajoutée dans ce formulaire et copie réalisée dans la transaction native, jamais un second éditeur d’événement.
- Courses : `cuisine-list.js` adapte la liste locale E07 et le cache familial. Extension minimale `addOnce` : reçu local atomique, import familial déterministe existant et vérification du cache. Correction nécessaire du contrôle de contexte après le hachage asynchrone natif ; aucune seconde liste.
- E09 : `family-modules.js`, module `family`, sérialisation par clés, CAS global, sauvegardes/reprise/conflits existants. Deux collections explicites `familyPreparationTemplates` et `familyEventPreparations`, version 1, avec contrôle des anciennes versions et données inconnues. Aucun SQL ni service nouveau.

## Choix

Réutiliser les deux collections explicites plutôt que détourner les anciennes listes indexées ; celles-ci risqueraient des modifications par leurs anciens écrans. Conserver le contrôleur Agenda et ajouter son champ d’association plutôt que copier le formulaire Stitch. Tri alphabétique des modèles : pas de fréquence réelle préexistante. Pas de recommandation artificielle. Ordre des éléments par boutons accessibles monter/descendre, sans poignées inertes. Quantités limitées à la précision native Courses (deux décimales), sans arrondi silencieux.

## Tâches et validations

- [x] Modèle natif et tests : CRUD, duplication avec nouvelles identités, CAS de brouillon, rollback, copie indépendante, édition/suppression Agenda atomiques.
- [x] Courses et tests : un effet par jeton événement/item, reprise, suppression/achat/archives, refus de changement de foyer pendant un import, quantité/unité conservées.
- [x] E09 et tests : nouveau payload, A/B fictifs, hors ligne/reprise, CAS, protocole ancien/inconnu, réactivation sans écrasement.
- [x] V7 : Mes modèles, éditeur, section native Agenda, préparatifs événement ; DOM textuel sûr ; routes déterministes, états vides, confirmations et formulaires ; ressources locales et chrome natif.
- [x] Recette navigateur 320/390/1440 avec captures comparées aux PNG, clavier, débordement, progression/persistance et non-régression ciblée Famille/Agenda/E07/E09.
- [x] Rapport d’implémentation, revue indépendante, vérification finale, commits propres et push de la seule branche si contrôles satisfaisants. Aucune fusion/publication/migration.

## Points de revue

Conflit pendant un brouillon ; événement supprimé pendant navigation ; double clic puis refresh de Courses ; changement de foyer pendant await ; client ancien supprimant des champs ; données inconnues ; échec de stockage. Tests hors ligne et transport fictif ne prouvent pas une recette serveur réelle ni sur deux appareils physiques.

## Journal

- Base propre et exacte vérifiée. Dépôt DOBBY retrouvé via GitHub ; le dépôt Portenart-Platform préchargé est laissé intact.
- Baseline Node ciblée : 13/13 réussis. Baseline navigateur Agenda/Mémos : journal séparé.
- Cadrage, plan, travail isolé, tests d’abord et délégation par fichiers disjoints appliqués. La demande détaillée autorise l’implémentation sans nouveau cycle d’approbation de design.

- Vérification finale : 232/232 natifs, 50/50 PREP Node + UI trois largeurs + version inconnue + A/B, 20/20 E07, E01 et Agenda/Mémos réussis. Trois P2 de revue corrigés par régressions RED→GREEN. Livraison Git et reconstruction tracées dans delivery.json.
