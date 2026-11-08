# Lot 1 Cuisine — exécution depuis 08f66ce

Périmètre confirmé : 13 sources Stitch (Taverne, choix repas, grimoire, fiche recette, cuisine, TM5, deux variantes d’ajout, import JSON, deux variantes de préparation des courses, liste validée, historique).

Approche retenue : conserver l’iframe V5 comme moteur masqué unique, avec son stockage et ses modules familiaux. Générer les templates Cuisine depuis les vrais HTML `design/stitch-53`, puis binder leurs éléments et cartes par un adaptateur de parcours V7. Les opérations appellent les validations/actions/writers V5 ; aucune nouvelle base, aucun second stockage. Les sources originales restent immuables. Les variantes utilisent le même adaptateur métier et des routes distinctes explicitement cataloguées.

## Étapes

- [x] Générateur reproductible des 13 templates, provenance et inventaire Cuisine dans le manifeste. Ressources Stitch servies localement.
- [x] Repas → grimoire → fiche → mode cuisine/TM5 : données et actions du moteur existant, navigation V7 et retours.
- [x] Ajout/édition de recette et import JSON : validation native réutilisée, erreurs/confirmations, variantes de formulaire.
- [x] Préparation → validation → historique des courses et panier partagé : garder les deux périmètres de courses, les contrôles et la synchronisation d’origine.
- [x] Parcours navigateur complet, persistance après recharge, erreurs/imports invalides, variantes et actions de modification. Captures de chaque source et UI à 320/390 px.
- [x] Documentation des écarts visuels, statuts réels, tests et preuves ; commits de progression, mise à jour PR #3, CI. Aucune fusion ni publication.

## Contrôles de revue

- Aucune page Cuisine ne termine dans le panneau visible V5.
- Réutilisation prouvée de la structure et des composants des sources, sans textes fictifs présentés comme données.
- Calculs de portions, quantités, validation et couverture des repas restent ceux de la V5.
- Les écritures familiales passent par les gestionnaires V5, y compris états déconnectés/conflits ; aucun transfert réel pendant les tests locaux.
- Les formulaires/étapes conservent les saisies lors des actions internes et affichent des erreurs compréhensibles.
- `prefers-reduced-motion`, 320/390 px, navigation arrière et redémarrage.

L’utilisateur a explicitement demandé l’exécution continue du domaine ; pas de validation intermédiaire par écran. Les 40 sources hors Cuisine ne sont pas réauditées.

Preuves et limites : voir INTEGRATION.md et evidence/cuisine/README.md. Les deux URL Google indisponibles restent explicitement remplacées par une illustration Stitch disponible.
