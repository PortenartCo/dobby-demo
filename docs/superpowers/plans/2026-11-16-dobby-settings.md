# DOBBY V7 Paramètres et consolidation — Implementation Plan

**Goal:** Exécuter le cahier des charges [REQUEST](../../dobby-v7/settings/REQUEST.md), sans recréer les moteurs natifs ni toucher aux données réelles.

**Architecture:** Adaptateurs de présentation JavaScript existants. Trois cartes vers une vue Ambiance, le registre natif des membres et la sauvegarde native. Préférences uniques dans `st.stitchPreferences`, fichiers via le moteur complet existant.

**Tech Stack:** HTML/CSS/JavaScript natifs, Node, Playwright/Chromium, génération source existante.

**Autorisation:** MODE EXECUTION autonome expressément demandé ; pas d'étape supplémentaire d'approbation de conception. Publication générale seulement lorsque tous les critères de la demande sont vérifiés.

## Contraintes et points de revue

- Aucun second stockage, moteur familial, nouvelle infrastructure ou migration distante.
- Effets actifs par défaut, son inactif par défaut ; désactivation persistante.
- Les fichiers et anciens documents restent conservés ; restauration seulement après validation et confirmation.
- Protéger les droits enfant, les changements de contexte et les opérations asynchrones.
- Recettes uniquement profils fictifs isolés ; aucune recette HTTP avec de vrais comptes.
- Vérifier les états hors ligne, les fichiers invalides, l'annulation, les préférences globales et les retours clavier.

## Tâche 1 — Paramètres et Ambiance

Fichiers : `tools-register.js`, `register.js`, `register.css`, `chrome.js`, `family.js`, `tests/settings.cjs` dans `essai-stitch-v7/`.

- [x] Écrire/exécuter le test navigateur rouge pour trois cartes, alias `settings-magic`, interrupteurs natifs, persistance et retour membres.
- [x] Remplacer `settings()`, mapper l'alias sur le modèle Menu ; conserver les commandes de `DobbyChrome` et actualiser leurs attributs accessibles.
- [x] Réutiliser `members?origin=settings`, ajouter seulement un retour vers Paramètres au registre natif. Garder invitations et permissions natives.
- [x] Vérifier 320/390/768/1440 px, clavier, header/dock, hors ligne et états de synchronisation exacts.

## Tâche 2 — Données et sauvegardes

Responsable distinct ; fichiers exclusifs : `house-register.js`, `tests/settings-backup.cjs`.

- [x] Test rouge des flux téléchargement/validation/confirmation/annulation et conservation des fichiers.
- [x] Présentation sobre de `backups(true)` ; conserver les moteurs, validation et contrôles de version/contexte existants.
- [x] Résultats réels des actions async, confidentialité du JSON non chiffré, accès aux documents historiques.
- [x] Exécuter les tests puis revue indépendante des modifications.

## Tâche 3 — Intégration conditionnelle et livraison

- [ ] Relever HEAD des PR17/18 et rechercher Contacts sur toutes les branches/PR.
- [ ] Commit Paramètres ; branche d'intégration issue de ce commit, fusion des HEAD vérifiés Archives puis Notes, conflits résolus séquentiellement.
- [ ] Régénérer les sources/artefacts ; tester modules, permissions, fichiers, synchronisation simulée, offline et parcours navigateur.
- [ ] Générer un aperçu isolé avec le processus existant ; publier seulement cet aperçu si intégration incomplète, sans promotion générale.
- [ ] PR des travaux, rapport exact avec SHA, captures, fichiers changés, résultats et blocages. Déploiement général uniquement si critères tous satisfaits.

Règle décidée : correctif natif minimal autorisé après preuve de perte concurrente post-confirmation ; test rouge puis 16 scénarios verts et conservation des empreintes historiques.
