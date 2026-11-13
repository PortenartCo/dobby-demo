# DOBBY V7 — Pack de correction Archives & Scriptorium

**Objet** : mission Codex EXECUTION limitée à la révision du module Archives et aux points d'entrée « Archiver / Réactiver » des modules sources. Revue utilisateur achevée et validée le 13 novembre 2026.

## Démarrage

1. Joindre le présent ZIP à une session Codex travaillant dans `PortenartCo/dobby-demo`.
2. Coller `01_PROMPT_CODEX.md` ou lui demander de l'exécuter.
3. Utiliser `02_CAHIER_DES_CHARGES.md` comme référentiel fonctionnel et `03_TESTS_RECETTE.md` comme critères de sortie.
4. Utiliser uniquement `assets/Stitch22-screen.png` comme nouveau **visuel du hero** Archives. `assets/Stitch22-DESIGN.md` donne son contexte visuel, pas l'autorisation de remplacer le design system global.
5. Se servir des captures dans `captures_revue/` comme preuves de l'état à corriger, **pas** comme écrans à reproduire.

## Décisions approuvées

- Archives = vue dérivée d'éléments archivés dans leur module d'origine, sans copie du document ni second registre persistant.
- Archivage depuis la fiche source, **confirmation obligatoire** ; réactivation depuis Archives, **confirmation obligatoire**.
- Toutes les fiches compatibles avec un cycle de vie réversible doivent être archivables. Respect des métiers et des droits ; pas d'opérations dangereuses ni de fausses activations.
- Visuel Stitch 22, cartouche en bas à droite, barre de recherche corrigée, liste compacte unique et vide explicite.
- Suppression des filtres « Toutes / Assurances », boutons d'import/export et sections « Enregistrement et partage » de cette page, **sans supprimer les fonctions de sauvegarde/synchronisation** centralisées ailleurs.

## État GitHub vérifié le 13/11/2026 (instantané, à actualiser avant toute écriture)

- `main` : `54d74b9448a1c518d8a3c483cd4deaea1e493748`.
- PR #13 Contrats & Assurances : fusionnée (`70c56eb…`).
- PR #12 socle familial : fusionnée (`43eef7a…`), fonctionnalités V3 à gates fermés.
- PR #11 Famille/Runes : ouverte au dernier contrôle.
- PR #15 recettes HTTP Auth en lecture seule : ouverte au dernier contrôle.
- Source des vues : `essai-stitch-v7/documents-register.js` ; contrats canoniques : `essai-stitch-v7/contracts-register.js` / `essai-stitch-v5-famille/family-contracts.js`.
- Pas de `AGENTS.md` trouvé dans l'arbre de `main` lors de la vérification. Réinspecter l'arbre au démarrage (il peut avoir changé).
- Ne pas réexécuter les installations SQL du socle familial et ne pas réactiver ses feature gates.

## Résultat demandé

Une branche/PR autonome, code source, tests causaux, captures à 320/390/768/1440, bilan des cas de recette, fichiers exacts modifiés et dépendances réelles restantes. **Pas de fusion main ni publication automatiquement** sur la seule base de ce pack : la recette utilisateur finale est groupée plus tard, les tests techniques doivent néanmoins passer maintenant.
