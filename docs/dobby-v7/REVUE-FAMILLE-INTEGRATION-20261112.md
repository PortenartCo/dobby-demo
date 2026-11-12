# DOBBY V7 — Intégration Famille et nouvel aperçu de revue

Autorisation utilisateur : intégrer et déployer FAM-01 à FAM-24 depuis la source globale validée, publier le seul nouveau dossier et pousser la branche d’intégration pour audit. Aucune migration ni donnée réelle ; aucune source applicative fusionnée dans main.

## Références et réconciliation

- Source globale immuable : `6a6fcd9bcee522da7342de391e5c3d7bfe1955b3`.
- Source Famille vérifiée propre : `a28a1e74e6fd6fcb0db8b154002ce032ae10f130`.
- Branche : `feat/dobby-v7-famille-integration-20261112`.
- Worktree : `/workspace/dobby-v7-famille-integration-20261112`.
- Nouveau dossier : `essai-dobby-v7-famille-review-20261112/`.
- URL du nouvel aperçu : https://portenartco.github.io/dobby-demo/essai-dobby-v7-famille-review-20261112/

Les deux commits Famille ont été repris sur la base globale par cherry-pick (`85e8ffa`, `bc3c1e5`). Les ensembles de fichiers changés depuis l’ancêtre commun faf89d5 sont disjoints : aucun conflit Git ni choix automatique de l’ancienne version du code global.

Dix fichiers critiques sont épinglés à leur contenu global exact : chat-engine.js, cuisine-list.js, cuisine-e07.js, family-modules.js, family-v2.js, family-runes-core.mjs, les builders globaux et leurs config/backend/runtime. Le correctif E02 vers Courses partagées, les Runes et la synchronisation E09 n’ont pas été remplacés par leur ancien état. Preuve : [reconciliation.json](evidence/famille-integration-20261112/reconciliation.json).

## Corrections effectivement reprises

- Membres : liste compacte, portraits E05, couleurs natives des Maisons, anniversaires, catégories explicites, identité et notes compatibles avec les anciennes fiches ; création/consultation/modification distinctes et sauvegarde mobile dorée.
- FAM-17 : nouvelle fiche issue du ZIP Stitch conservé à l’identique ; identité, Maison/Patronus, activité et Runes natives, Rituels & Mémoires, Grimoire existant et accès médical secondaire. Les portraits du Salon et du Carnet ouvrent cette fiche, avec retours déterministes, même après rechargement.
- Permissions : gardes dans les writers natifs des membres et de la santé locale/partagée ; contrôle de l’ancien et du nouveau titulaire lors d’une réattribution. Sans identité vérifiée, refus des mutations réelles. Les questionnaires E06 recalculent les résultats pour chaque acteur, sans sélection manuelle de Maison/Patronus.
- Agenda : un header/dock, consultation puis édition, retours Salon/Agenda, identifiants stables, provenance préservée, suppression confirmée, conflits de brouillons visibles, mois civils et fins de mois corrects.
- Mémos : consultation avant édition, formulaire compact, retours contextuels, writer E09 inchangé, CAS et hors ligne conservés, import explicite idempotent et originaux locaux préservés.
- Effets : préférence native, ON/OFF persistant, mouvement réduit, sans nouvelle famille de stockage ni modification du chrome commun.

Le détail des 24 décisions et les références Stitch restent dans [FAM-01-24-IMPLEMENTATION.md](FAM-01-24-IMPLEMENTATION.md). Ce document décrit la livraison locale antérieure ; la présente autorisation permet désormais la nouvelle publication isolée.

## Nouvel aperçu isolé

Le wrapper additif `scripts/build-dobby-family-review.cjs` réutilise le builder global validé. Le backend simulé et sa procédure de reset restent identiques, hormis la substitution exacte de l’espace de noms dans la copie générée. L’ancienne source et les anciens dossiers publiés ne sont pas édités.

Préfixe : `dobby-review-v7-famille-20261112|`, avec clients A/B indépendants et backend fictif commun dans le même navigateur. Le même préfixe protège Storage, IndexedDB, sélection A/B, verrous, canaux et transactions de réinitialisation. Les données d’exemple définissent explicitement deux parents, un bébé, un enfant et un animal ; ces catégories ne sont pas inférées de noms ou d’âges.

La configuration Famille est insérée avant le runtime et le backend. Les assets sont locaux, les liens externes inutilisables remplacés par les composants DOBBY, sans blason officiel inventé. Les comptes réels restent désactivés et CSP/transport empêchent toute requête vers Supabase. Le manifeste expose sources, transformations et SHA256, les deux références d’intégration et les SHA des builders. La construction refuse un dossier existant et des sources applicatives non commises ; `--allow-dirty` n’est utilisé que pour le candidat local préalable.

## Validation

- Famille : 227 cas Node/natifs réussis (197 Famille, 7 E06/E09, 21 Sync v1/v2, 2 parcours Chromium natifs), six scripts navigateur, 14 passages de largeur et 39 combinaisons vues/largeurs pour les effets. Captures 320/390/1440 conservées.
- Transversaux source : contrats de préservation et writer E09 8/8, helper E02, Courses à deux profils avec quantités/disponibilité/CAS/hors ligne, historique Runes natif.
- Transversaux du nouveau bundle : six contrôles réussis, dont octets E02/Courses et transport global, une récompense partagée unique confirmée, lecture préalable du mémo puis relecture chez B. Aucune requête externe ni mutation HTTP réelle.
- Dérivation source/CSS : génération canonique et Tailwind sans différence sur les fichiers dérivés ; les 16 étapes du workflow existant sont conservées. Le workflow ajoute les contrôles Famille et du nouveau bundle pour cette branche.
- Reconstruction commise : `5b764ef367553e9945fb72a6b563b55adc41e040`, manifeste `committed`, aucun chemin source non enregistré ; recette complète aux trois largeurs et 296 empreintes HTTP réussies.
- Recette du candidat : création/modification de membre, permissions parent/enfant, Grimoire/santé, Agenda sans duplication, mémo partagé hors ligne/reprise, import idempotent et reset A/B isolé à 320/390/1440 ; 296 empreintes HTTP réussies.
- Revue indépendante : aucun finding important ou critique dans les frontières d’intégration ; 296 empreintes de ressources et 293 empreintes source vérifiées sur le candidat. [Revue](evidence/famille-integration-20261112/independent-review.md).

Les résultats du candidat working-tree sont séparés des preuves de reconstruction commise et de recette hébergée. Une première assertion du parcours navigateur cherchait un import dans une section repliée : le test ouvre désormais la section par son summary avant chaque import. La synchronisation de test du reset attend les navigations des deux pages, au lieu de lire un ancien document juste avant son rechargement. Les erreurs de test initiales sont conservées. Le parcours approfondi a ensuite reproduit un défaut réel : un refresh de synchronisation repliait les anciens mémos ouverts. La correction conserve cet état de présentation pendant le refresh, sans modifier le writer ni les données. Le test a échoué avant correction puis passé aux trois largeurs ; une seconde revue indépendante n’a relevé aucun problème important.

Preuves et journaux : [dossier dédié](evidence/famille-integration-20261112/), notamment `family/`, `transverse/`, `build/`, `ci/` et les recettes locale/hébergée finales.

## Réserves

1. Invitations réelles non opérationnelles : pas de mécanisme d’envoi/rattachement authentifié raccordé.
2. Les droits parentaux de la démo ne sont pas une garantie serveur. L’association compte→membre/rôle et ses contrôles serveur restent à implémenter dans une mission autorisée distincte.
3. Aucun raccord automatique Bébé/Enfant/Animal aux convives E07 : l’interface d’éligibilité existe, les portions restent celles saisies dans Cuisine.
4. Deux clients simulés dans un navigateur ne constituent pas une recette sur deux appareils physiques ou sur le foyer réel. Aucune donnée réelle utilisée.
5. Le chargement initial sans réseau ni cache préalable n’est pas garanti ; le mode hors ligne testé porte sur les données locales et la reprise de synchronisation, avec assets disponibles.
6. Les anciens clients familiaux peuvent retirer un champ inconnu côté serveur. Le protocole E09 conserve détection, copies locales et rétablissement explicite ; aucune migration serveur appliquée pour interdire ces écritures anciennes.

## Livraison vérifiée

- Aperçu public : https://portenartco.github.io/dobby-demo/essai-dobby-v7-famille-review-20261112/
- Source applicative intégrée : `5b764ef367553e9945fb72a6b563b55adc41e040` ([commit](https://github.com/PortenartCo/dobby-demo/commit/5b764ef367553e9945fb72a6b563b55adc41e040)).
- Publication seule : `92c1eb44d28dd8ed1cdac07ddd46e76de829d3b5` ([commit](https://github.com/PortenartCo/dobby-demo/commit/92c1eb44d28dd8ed1cdac07ddd46e76de829d3b5)), parent `bce17c82ef42fefb2790203a19732665f8c8203d`.
- [Branche d’audit et reprise](https://github.com/PortenartCo/dobby-demo/tree/feat/dobby-v7-famille-integration-20261112), poussée séparément de main. Les preuves sont ajoutées ensuite par un commit documentaire ; les octets applicatifs testés restent ceux de `5b764ef`.

| CI exacte | Résultat |
|---|---|
| [Dobby Sync — 43189963009](https://github.com/PortenartCo/dobby-demo/actions/runs/43189963009) | SUCCESS, source 5b764ef |
| [Stitch V7 — 43189963112](https://github.com/PortenartCo/dobby-demo/actions/runs/43189963112) | SUCCESS, source 5b764ef ; Courses existante et 11 contrôles Famille actuels ; aucune réutilisation historique |
| [Pages — 43191449029](https://github.com/PortenartCo/dobby-demo/actions/runs/43191449029) | SUCCESS, publication 92c1eb44, déploiement 7733346408 SUCCESS |

Le diff de publication ajoute exactement 297 fichiers sous le seul nouveau dossier. Les 29 entrées racine antérieures, y compris toutes les démonstrations et les sources applicatives de main, conservent leurs objets Git. Les 21 ressources HTTP capturées avant publication restent identiques ; le manifeste de l’ancien V7 reste celui de la source 6a6fcd9.

Le nouveau manifeste public est identique au fichier publié : SHA256 `61b6b3fb2f1e155e0ad947207b18418100442200ed702c30f1096a3a2ece300c`, version V7-FAMILLE, état committed, sourceDirtyPaths vide, realBackend/realAuth/migrationsApplied false. [Reçu de publication](evidence/famille-integration-20261112/publication-after/receipt.json).

La recette publique des effets a passé 39 combinaisons (13 vues × 320/390/1440), ON/OFF, persistance et mouvement réduit. Les six contrôles transversaux publics ont passé : mêmes octets globaux, E02/Courses, conflit CAS A/B, gain confirmé unique de 10 Runes et mémo partagé sans import privé implicite. Zéro requête externe, mutation HTTP réelle ou erreur navigateur sur ce parcours.

La recette publique complète Famille a passé à **320, 390 et 1440 px** : création et modification de membre avec ID canonique, consultation FAM-17, permissions conjoint/enfant, accès Grimoire et santé, Agenda sans doublon et retours contextuels, mémo partagé A/B avec modification hors ligne puis reprise, import explicite idempotent et reset A/B. Le refresh conserve les anciens mémos ouverts. Un header et un dock, cinq liens, aucun débordement horizontal. Les sentinelles de l’ancien aperçu global, du stockage tiers et d’IndexedDB sont conservées après reset.

Les **296 ressources réellement servies** ont toutes répondu HTTP200 avec le SHA256 attendu. Aucune erreur navigateur, requête externe ou mutation HTTP réelle sur les trois passages. Le manifeste téléchargé est identique au manifeste du commit de publication. [Preuve publique complète](evidence/famille-integration-20261112/hosted-preview/proof.json), [captures](evidence/famille-integration-20261112/hosted-preview/), [transversaux](evidence/famille-integration-20261112/hosted-transverse/result.json) et [effets](evidence/famille-integration-20261112/hosted-family/results.json).

La publication est vérifiée. Aucun compte réel, aucune migration Supabase et aucune fusion des sources applicatives dans main. Les réserves ci-dessus restent ouvertes ; elles n’ont pas été masquées par la simulation. Le dernier commit de la branche d’intégration ajoute exclusivement ce rapport et les preuves, avec `[skip ci]` pour ne pas relancer les mêmes tests sur des octets applicatifs inchangés.
