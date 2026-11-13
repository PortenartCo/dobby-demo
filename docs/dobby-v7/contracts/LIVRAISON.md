# Contrats & Assurances — livraison native V7

Le cahier des charges validé est implémenté dans le module natif, sur `familyDocs`, sans nouvelle démonstration ni évolution Supabase distante. Les résultats de publication sont consignés dans la PR et la recette hébergée produite après intégration.

| Décision | Résultat |
|---|---|
| Liste | Titre/sous-titre exacts, compteur neutre, recherche, contrats et assurances mélangés, ordre par prochaine action, dates inconnues « À renseigner », consultation/original accessibles. Illustrations, catégories, filtres et liens redondants supprimés du parcours. Aucun exemple injecté, aucune fiche réelle supprimée automatiquement. |
| Identification | Nom, type extensible, organisme et périmètre maison/plusieurs équipements existants par identifiants natifs. |
| Durée | Prise d'effet, échéance, reconduction oui/non/inconnue, durée, préavis jours/mois calendaires, modalités/conditions et renon explicite/calculé/inconnu. Mois bornés au dernier jour cible, années bissextiles et dates invalides testés. |
| Compléments | Référence, montant (zéro distinct d'inconnu), périodicité, notes, conditions particulières. Anciens champs/valeurs et extensions inconnues conservés. |
| Rappels | Échéancier 90/30/7 jours modifiable ; aucune notification automatique ni validité juridique du renon annoncée. |
| Pièces | Originaux, avenants, conditions/courriers et autres pièces ; ajout, remplacement avec ancienne version conservée, retrait confirmé, aperçu PDF natif, ouverture/téléchargement. Anciennes copies locale et partagée distinguées. |
| Ajout | Deux actions distinctes : manuel et import IA externe. Archives utilise les mêmes enregistrements et ouvre le détail canonique des contrats. |
| IA externe | Prompt complet copiable, collecte progressive, attente de « J'ai terminé », véritables originaux seulement, références pages/passages/incertitudes, ZIP réel ou JSON honnête. Aucun appel IA depuis DOBBY. |
| Import | `dobby-contracts` v1 ; ZIP/JSON validés avant écriture, aperçu corrigible reprenant le formulaire, ajouter/ignorer/mise à jour explicite, historique/anciennes pièces conservés et associations sources-pièces persistées. |
| Validation ZIP | Limites compressées/décompressées, nombre, expansion, chemins, CRC, signatures PDF/raster, noms et types cohérents, pièces absentes/en trop/doublons, versions et métadonnées refusées. |
| Persistance | Writers natifs localStorage/IndexedDB, contrôle de brouillon périmé et changement de foyer ; extension du writer familial existant, pas de stockage concurrent. Ancien pair et nouvelle version testés en aller-retour simulé. |
| Permissions | Contrats et Archives partagés protégés pour un enfant, y compris anciennes actions natives ; consultation conservée. Aucun schéma/policy/permission serveur modifié. |
| Suppression | Confirmation, sauvegarde du retrait avant nettoyage local ; une copie locale conservée après suppression distante n'est pas republiée par une modification étrangère. Une restauration distante explicite est respectée. |

## Preuves

- Modèle/ZIP/writer : campagne ciblée dans `evidence/acceptance-final.log` ; régressions natives dans `evidence/native-regression.log`.
- Création/modification/rechargement, deux équipements, PDF réellement lisible, avenants/révisions, dates/anciens formats, import JSON/ZIP, doublons, sources persistantes, brouillons périmés et limites enfant : tests `contracts-*.cjs`.
- Écrans à 320/390/768/1024/1440 px ; défilement, réduction de hauteur/clavier et absence de débordement. Captures mobile/PC dans `evidence/screens/`.
- Archives, Maison & Équipements et navigation : tests existants `register-documents`, `register-documents-sync`, `register-house`, `register-navigation`.
- Première non-régression transversale : 19 campagnes natives réussies, sources figées par empreintes dans `evidence/regression/results.json`. Les correctifs de revue ultérieurs ont leurs tests ciblés et sont rejoués par la CI finale.
- Revue indépendante : `evidence/FINAL-REVIEW.md` ; tous les points bloquants corrigés et recontrôlés.

## Limites opérationnelles explicites

Les essais de synchronisation et de Storage sont des fixtures déclarées ; ils ne certifient pas les droits du Supabase réel ni l'accès avec deux comptes réels. Le détail distingue stockage du fichier et synchronisation de la fiche. Les transferts restent explicites et leurs erreurs ne deviennent pas des confirmations.

Le retrait d'une pièce/fiche enlève sa référence et nettoie les copies locales après sauvegarde. **Les binaires partagés restent dans le bucket privé existant. Leur suppression physique exige une intervention distincte ; aucun nettoyage automatique n'est programmé.** Cette limite évite de supprimer un fichier encore référencé par un autre client pendant une course ou un refus de sauvegarde. Le message apparaît lors de l'opération.

Aucun SQL nouveau n'est requis par cette implémentation ni exécuté à distance. La recette à deux comptes et les politiques Storage réelles restent à vérifier avec le foyer de recette. Les dépendances Missions/Runes/rôles du chantier parallèle ne sont pas déverrouillées par cette livraison.
