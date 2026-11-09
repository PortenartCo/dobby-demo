# Revue finale des lots 2B à 5

Une seule revue indépendante, en lecture seule, couvre `152cb89..9ee2d0c`. Aucun constat critique, six constats importants, aucun mineur séparé. Les six constats sont acceptés et corrigés dans une passe ; aucune seconde revue n’est revendiquée. La validation de cette passe repose sur les reproductions ci-dessous et la suite générale.

| Constat reproduit | Correction de présentation | Preuve |
|---|---|---|
| Un mémo, équipement ou document supprimé pendant l’édition était recréé au Save | Vérifier l’existence de l’identifiant courant avant de préparer le formulaire natif | `register-review.cjs` : `stale-memo-edit`, `stale-equipment-edit`, `stale-document-edit` |
| Une écriture locale finie avec une fiche supprimée/remplacée laissait le verrou actif | Observer la promesse `houseStore` originale sans changer ses arguments ni son résultat ; attendre sa fin, signaler l’incohérence et actualiser la fiche affichée | `document-native-write-missing`, `document-native-write-replaced`, vraie IndexedDB retardée |
| Un index d’élément périmé après synchronisation ciblait un autre élément | Comparer la liste affichée à la liste native avant coche/retrait ; refuser l’ambiguïté, proposer une actualisation qui conserve le texte d’ajout non envoyé | `list-rg-item-toggle`, `list-rg-item-remove` |
| Menu puis retour navigateur perdaient les modifications d’un formulaire | Brouillons transitoires par foyer/route/identifiant ; restaurer les champs modifiés sur les données natives récentes, sans fichier, ID caché ou contrôle désactivé | `menu-member-draft`, `menu-contact-draft`, `menu-medical-draft` ; note reçue du foyer conservée, dossier privé non partagé |
| Une pièce jointe effaçait l’entretien en cours de saisie | Protéger le formulaire d’entretien du rafraîchissement de fond et conserver sa saisie lors de l’actualisation explicite des pièces | `maintenance-file-draft` : note/date/coche/prochaine date, aucun entretien enregistré automatiquement |
| Les sources affirmaient une police active, un Grand Salon, une certification et un stockage Contacts exclusivement local sans données correspondantes | Retirer le badge de statut non géré, lier la pièce au lieu natif, afficher le libellé réel de l’historique et les règles effectives du module Famille | `source-facts`, `maintenance-source-facts`, `contact-sharing-disclosure` : contrat échu, équipement Garage et portée native des Contacts |

Les quatorze scénarios ont échoué avant correction à 390 px, puis réussi à **320 et 390 px** (28 contrôles). Les 54 tests natifs réussissent. La validation générale locale réussit intégralement (code de sortie 0, aucun échec). Elle est exécutée avec `CHROMIUM_PATH=/usr/bin/chromium npm test --prefix essai-stitch-v7/tests`, `ci-scope.json.final=true` ; le statut et le SHA exacts de la CI finale sont publiés dans la PR #3 et le bilan de livraison. [Captures complémentaires](evidence/review/README.md), [comparaisons de toutes les sources](evidence/index.html).

La relecture a aussi vérifié les empreintes des 30 nouveaux templates et des 12 fichiers de runtime, les comptes 53/24/29 et l’absence de diff V5/originaux/SQL dans cette mission.

## Limite du writer natif conservée

La présentation n’annule ni ne réécrit une opération IndexedDB déjà lancée. Si une fiche disparaît pendant cette opération, une copie locale peut subsister ; le résultat est signalé après la fin réelle de l’écriture, sans recréer la fiche, reconstruire silencieusement ses métadonnées ou nettoyer automatiquement le stockage. Une annulation atomique et un nettoyage de ces écritures concurrentes demanderaient une évolution autorisée du writer existant. Cette limite figure dans les sources partielles concernées.

## Périmètres laissés hors qualification

La restauration destructive et les comptes réels sont exclus par la demande. Les dépendances minifiées héritées sont contrôlées par leur provenance et leur chargeur, sans audit de sécurité exhaustif. Les détails métier Cuisine inchangés ne sont pas réaudités ; les routes partagées modifiées et les régressions générales sont vérifiées. Les fonctions natives absentes restent partielles, avec un état explicite. [Décisions et coûts](DECISIONS.md).

Le contrôle visuel de clôture a complété le sixième constat avec les promesses de stockage Contacts exclusivement local. Ce scénario supplémentaire a échoué avant correction, puis réussi aux deux largeurs. Les textes sources sont neutralisés avant le raccordement des valeurs du foyer ; ils ne modifient ni les données ni le partage. Le parcours 2B, les comparaisons de ses six sources et la synchronisation native simulée ont été revérifiés après ce complément.
