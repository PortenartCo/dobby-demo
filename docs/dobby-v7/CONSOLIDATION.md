# Consolidation exhaustive E01–E08 — 11 novembre 2026

Départ : `a84f67acf8f5cbfd59475c2137ec70e1a20732f7`, branche `feat/dobby-e01-e08-review-integration`. [Demande complète](CONSOLIDATION-SPEC.md), [registre utilisateur](REVIEW-CONSOLIDATION.md), [matrice95 lignes /41 identifiants](CONSOLIDATION-MATRIX.md) et [dépendances bloquées](CONSOLIDATION-BLOCKERS.md).

**État : corrections de source intégrées, recette de bundle/publication et CI finale en cours. Aucun DONE global.** Les preuves source ci-dessous ne certifient pas une synchronisation avec de vrais comptes ni une validation visuelle utilisateur des nouvelles corrections.

## Corrections et preuves par lot

| Lot | Changements réels | Preuves ciblées |
|---|---|---|
| E01/E04 | États vides sans pointillés ; confirmation, case ouverte vide et réouverture manuelle native ; automatique pilotée par source ; Midi/Soir et photos/repli E07 ; ajout rapide liste unique/doublon/statut ; retrait suggestions et dock Missions/Retour/X | [Audit, captures et tests](evidence/consolidation/e01-e04/README.md) |
| E02 | Hero288px à hauteur900, personnage entier ; dictée progressive multisegments sans autosend, pause/reprise/arrêt/annulation explicites, callbacks tardifs et corrections manuelles protégés ; commandes natives conservées | [RED/GREEN, APIs simulées et captures](evidence/consolidation/e02/README.md) |
| E03 | Page protégée, hero/cartouche/filtres/cartes conservés ; états E01/E04 cohérents | Régression e03/e03-counts, sources E03 intactes |
| E05 | Catalogue commun4Maisons/12Patronus ; insigne natif selon grade, total/jauge/palier/historique ; ledger et retakes conservés | [Sources, droits,12grades et captures](evidence/consolidation/e05/README.md) |
| E06 | Parcours fictif local explicite, identité/reprise/reset ; chapeau de remplacement tracé, compteur unique, romain ; résultatMaison sans masque/troncage, contenus communs ; grandsPatronus conservés ; final propre/choix explicite du profil fictif | [Inventaire source,4+12résultats et parcours](evidence/consolidation/e06/README.md) |
| E07 | Plage début/fin inclusive3/7/14/perso, aperçu confirmé, unités/provenances/manuels protégés ; terminer doré/explication/confirmation/succès ; historique retiré de navigation, données conservées ; CTA16px et accords | [API, cas limites et captures](evidence/consolidation/e07/README.md) |
| E08/T | Accords0/1/2, image mobile décodée avant captures sans redesign ; Effets/Son partagés aussi en E06, persistance/nativepref et réduction motion | `tests/consolidation-shared.cjs`, [preuves](evidence/consolidation/shared/) |

## Blocages et reports

Quatre IDs conservent une partie courante bloquée : E04-02 (modèle/protocole série/occurrences absent), E05-01 (fichiers et droits de blasons officiels publics non établis), E06-01 (archive Rituel(9) absente), E06-04 (grand blason officiel dépend d’E05-01 ; rendu/typos/description corrigés). Les preuves exactes et conditions pour lever ces dépendances sont dans le [rapport des blocages](CONSOLIDATION-BLOCKERS.md).

E06-08 est hors périmètre serveur ; E07-01/02/03/09 attendent E07.3. Puis Menu, Famille et autres modules dans l’ordre du registre. E07-10 conserve la revue utilisateur en cours : aucune CI ne vaut acceptation de l’UX. Aucun de ces besoins n’est supprimé de la matrice.

## Méthode et intégrité

GATE0 :95lignes/41IDs et chaque texte source comparés indépendamment avantcode, SHA du registre inchangé. Les rôles/fichiers partagés sont réconciliés par root. Les tests ciblés de module sont exécutés une fois puis repris seulement sur cause isolée. Deux incidents d’environnement ont été identifiés séparément : charge de navigateurs concurrents et fermeture du serveur de lecture8789 ; reprise sur le serveur root8790 sans retirer d’assertion métier.

Les moteurs, writers, seuils et règles natifs ne sont pas remplacés. Aucun fichier natif V5 ni SQL n’est modifié par cette consolidation. Le catalogue de contenus E05/E06 est unique ; le helper photo E07 est partagé avec E01. Les archives techniques sont conservées, malgré le retrait de la navigation Historique. Le nouvel état de profil de démonstration est un choix explicite sous le préfixe isolé, pas une liaison de compte réelle.

92tests unitaires natifs/sync/scoring/builder passent, dont25600comparaisons scoring Python/JS. Les captures historiques sont conservées ; toutes les nouvelles preuves figurent sous `evidence/consolidation/`. La campagne finale/CI, les résultats du bundle et les reçus HTTP seront ajoutés après contrôle réel, sans transformer les blocages ou limites Safari/iPhone physique en validations.

## Reprise causale de la campagne

La première CI du checkpoint ff76847 a validé les nouvelles suites et les modules avant de s’arrêter dans `register-tools.cjs` : le test supposait encore que « acheter du lait » écrivait toujours dans `extras`. L’accueil affiche maintenant la véritable liste E07, dont l’initialisation native migre ces compléments. L’article est donc conservé dans `shopFinal.items`. Le test contrôle désormais le registre natif actif, sans modification applicative. La campagne reprend au contrôle interrompu, puis aux cas non encore exécutés (y compris le lot2b dont l’ordre JavaScript passe après les lots numériques). Les attentes liées aux données démo existantes de Documents et au chargement du reset E06 ont également été précisées dans les seuls harnais.

Un premier clic de dock dans la recette locale générale a expiré sans cause produit établie ; le contrôle ciblé n’a pas reproduit le défaut, puis la recette complète a réussi à320,390 et1440. La trace initiale est conservée, aucun retry automatique n’est caché dans le test.
