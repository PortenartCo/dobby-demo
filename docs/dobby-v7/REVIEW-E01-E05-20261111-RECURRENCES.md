# Revue du 11/11/2026 — E04, récurrences et échéance

Lot indépendant E/F ; code intégré aux commits de cette branche de revue. Aucun déploiement, compte familial réel, SQL, backend ou registre concurrent E06 modifié.

## F — Échéance lisible : DONE, validation utilisateur restante

Cause reproduite : le panneau natif Stitch impose `h-12` (48 px) au conteneur de la légende « Almanach » et du champ. Le champ date fait 32 px, texte 14 px/interligne 20 px, sans padding ; l'empilement comprime la légende et la saisie. [Mesures avant](evidence/review-e01-e05-20261111/recurrence/date-before.txt).

`register.css`, uniquement sous `body[data-family-view="mission-edit"]`, donne au panneau une hauteur minimale de 76 px et au champ 44 px, police 16 px/interligne 24 px, padding explicite, espace pour l'icône native et largeur réductible. La correction CSS ne change ni valeur ISO ni calendrier. Le champ reste un contrôle date natif avec indication de langue `fr-BE` ; sa présentation des segments suit le navigateur. Les calculs Brussels ajoutés pour les séries sont une évolution E distincte.

Captures réelles de profils TEST jetables, sans service externe, pour vide/date choisie/Aujourd'hui/Demain/Week-end/Date précise : **18 avant et 18 après**. Valeur choisie 29/02/2028 ; valeur persistée toujours ISO. [Mesures après](evidence/review-e01-e05-20261111/recurrence/date-after.txt).

| Largeur | Avant | Après |
| --- | --- | --- |
| 320 | [Date choisie](evidence/review-e01-e05-20261111/recurrence/date-before/picked-320.png) | [Date choisie](evidence/review-e01-e05-20261111/recurrence/date-after/picked-320.png) |
| 390 | [Date choisie](evidence/review-e01-e05-20261111/recurrence/date-before/picked-390.png) | [Date choisie](evidence/review-e01-e05-20261111/recurrence/date-after/picked-390.png) |
| 1440 | [Date choisie](evidence/review-e01-e05-20261111/recurrence/date-before/picked-1440.png) | [Date choisie](evidence/review-e01-e05-20261111/recurrence/date-after/picked-1440.png) |

## E — Récurrences natives : implémentées, limites de synchronisation explicites

Avant changement, Quotidien/Hebdomadaire/Mensuel sont désactivés car le writer ne sait enregistrer qu'une mission unique. Le test pur initial échoue sur les API de projection absentes : [rouge causal](evidence/review-e01-e05-20261111/recurrence/core-red.txt). L'audit préalable a identifié les vrais writers V5 et le protocole JSON/CAS du module Missions ; `essai-v6-preview` n'est pas le writer utilisé par l'interface V7.

Fichiers : `essai-stitch-v5-famille/family-missions-core.mjs`, `family-missions.js`, garde minimale `family-modules.js`, adaptateur V7 `tools-register.js`, styles bornés `register.css`. Aucun second registre ni moteur parallèle.

### Modèle et règles réellement branchés

- Unique reste le format natif antérieur. Chaque occurrence récurrente est également une mission native `open`/`done` dans **le même `manualMissions`** ; Accueil, E03, Agenda et runes la lisent sans source parallèle.
- La première occurrence réelle porte `recurrence: {version:1,seriesId: id,rules:[…]}`. Les autres portent `seriesId` et `occurrenceDate`, avec identifiant reproductible `identifiantPremièreOccurrence-rAAAAMMJJ`. L'identité de série est dérivée de l'identité native créée une seule fois ; aucun identifiant aléatoire nouveau au rejeu d'une occurrence.
- Quotidien ; Hebdomadaire avec plusieurs jours ; Mensuel avec jour 1–31. Mois plus court : **dernier jour du mois**, annoncé dans le formulaire. Première échéance hebdomadaire/mensuelle hors des jours choisis : refus explicite sans écriture, sans déplacement caché de la date.
- Édition du titre, des consignes, du responsable et de l'effort de la première occurrence met à jour le modèle des **nouvelles** occurrences. Chaque révision datée est conservée. Édition d'une autre occurrence ne change que celle-ci ; lien explicite vers le contrôle de sa série.
- Série active/suspendue/arrêtée. Suspension empêche de produire de nouvelles occurrences ; celles déjà enregistrées restent dans l'historique. Reprise possible après suspension. Arrêt définitif sans suppression de l'historique ; une nouvelle série doit être créée pour recommencer.
- La date d'une occurrence de série est conservée. Modification du rythme via les jours hebdomadaires ou le jour mensuel. La suppression native d'une série ou occurrence est refusée avec explication, y compris depuis un ancien appel E02/E03.
- Projection bornée aux **30 jours civils précédents et aujourd'hui**, sans mission future générée, soit au maximum 31 nouvelles occurrences par série et par projection. Après une longue absence, les jours plus anciens qui n'ont jamais été matérialisés ne sont pas créés. Toutes les occurrences déjà présentes restent conservées, y compris plus anciennes et non terminées. Cette convention est visible dans le formulaire.
- Date civile `Europe/Brussels`, calculs calendaires UTC à midi pour éviter les écarts DST. Projection à l'ouverture/rendu natif, à la reprise de visibilité/focus, et contrôle d'une minute dans un onglet visible. Le minuteur est rétabli après `pageshow` du cache arrière/avant.
- Limite native : 200 missions uniques/séries créées par l'utilisateur, les occurrences générées n'occupent pas ces 200 places. Maximum 200 révisions par série ; refus sans troncature au-delà. L'historique augmente avec les jours effectivement matérialisés, et reste soumis aux limites réelles du stockage et du payload serveur.

### Récompenses et persistance

Le writer `fmsForm` natif reste seul propriétaire de la mutation. Sauvegarde refusée : retour de la mission, de sa projection et des gains/demandes à leur état précédent. Les champs inconnus des lignes et modèles restent conservés.

Chaque occurrence est achevée et rouverte indépendamment. L'identifiant d'occurrence est la clé du ledger natif ; une réouverture/reclôture/relecture ne crédite rien en double. Aucun gain lors de la création ou édition. Une ancienne première occurrence reste inéligible au gain rétroactif ; les nouvelles occurrences réellement créées sont éligibles à la règle courante. Sans partage, validation locale ; avec partage, demandes en attente jusqu'à confirmation native CAS, comme le protocole runes existant.

### Synchronisation : vérifiée sur fixtures compatibles, pas sur comptes réels

Le payload conserve exactement `autoTasks`, `manualMissions`, `runeCredits`, `runeLedgerVersion`. Le client transmet les champs de récurrence imbriqués sans nouvelle clé de module.

**Défaut de compatibilité reproduit avant correction** : un ancien writer peut normaliser une ligne en supprimant sa récurrence tout en conservant `runeLedgerVersion:1`. Le client actuel acceptait cette perte et annonçait « à jour ». La garde compare maintenant les identités série/occurrence du dernier état acquitté : disparition, métadonnées perdues, changement d'identité ou version inconnue bloquent l'application/le PATCH et affichent un conflit. Le choix de conflit ne contourne pas cette garde. Les nouvelles occurrences locales non encore acquittées ne déclenchent pas de faux blocage sur simple absence distante.

Les conflits de champs éditables utilisent toujours le choix explicite de version natif ; aucune fusion automatique des statuts d'occurrences n'est prétendue. Le ledger conserve les gains confirmés et demandes, même pendant ce conflit. Les tests VM sont **une simulation de synchronisation client**, pas une recette avec deux vrais comptes.

**Limite serveur non résolue** : un ancien writer peut encore effacer les métadonnées côté serveur ; un nouveau client sans copie locale ne peut découvrir un historique déjà effacé. La garde protège les identités déjà connues de cet appareil, sans garantie globale entre tous les clients. Une validation serveur des versions/identités et un refus des suppressions destructives sont à étudier séparément. Aucun SQL/migration/changement de production exécuté.

### Tests exécutés

- [43 tests natifs](evidence/review-e01-e05-20261111/recurrence/native-tests.txt), dont 6 nouvelles règles pures et 9 nouvelles synchronisations : fin de mois, année bissextile, changement d'année, DST Brussels, projection bornée, historique, suspendre/reprendre/arrêter, identités et crédits indépendants, rejeu, ancien writer, conflits, réponse perdue et rechargement, extension de champs inconnus.
- [Parcours navigateur réel 320/390/1440](evidence/review-e01-e05-20261111/recurrence/browser.txt) : création via contrôle Stitch puis vrai `fmsForm`, complétion/réouverture/gain unique, édition d'une occurrence, persistance, hors ligne simulé par saut d'horloge, suspension/reprise/arrêt, mensuel 29/02 et hebdomadaire lundi+mercredi, absence de débordement. [Mensuel mobile](evidence/review-e01-e05-20261111/recurrence/monthly-390.png).
- [Writer natif ciblé](evidence/review-e01-e05-20261111/recurrence/writer.txt) : refus hebdo/mensuel hors rythme sans mutation, conversion d'une ancienne mission sans gain rétroactif, gain de la nouvelle occurrence, modèle extensible conservé, refus du stockage avec rollback.
- [Ancien E04 conservé/adapté](evidence/review-e01-e05-20261111/recurrence/e04-regression.txt) : trois panneaux, catégories, attributions, Unique, dates et quatre raccourcis, brouillon, édition/rechargement, ancien membre/format, chrome et retours aux trois largeurs. Seule l'attente des boutons de récurrence a changé, maintenant activés.
- Les cas E01 de réouverture sont traités séparément par leur propriétaire. Pas de refonte E03, pas de changement E06, pas de publication ni recette familiale réelle.
