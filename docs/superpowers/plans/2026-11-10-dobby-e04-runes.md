# E04 — Runes, grades et avatars : plan d’exécution

Base `091fe0e049e496b678ba70b892605777a5e108cd`, branche indépendante `feat/dobby-e04-runes`, worktree dédié. La demande utilisateur autorise l'exécution et les corrections locales sans confirmation intermédiaire.

## Décisions

Efforts validés légère=10, régulière=25 (défaut), majeure=50. Missions nouvelles explicitement éligibles ; aucune attribution rétroactive depuis les anciennes missions. Historique confirmé distinct des missions et demandes locales durables par mission, dans le state/save natif existant. Les opérations modifier/rouvrir/supprimer ne modifient pas les crédits.

En partage, la complétion crée une demande en attente ; le premier crédit accepté par le CAS du module fait autorité. La file reste locale jusqu'à confirmation du payload familial. Les conflits de données Missions gardent le choix existant local/foyer ; les deux choix préservent le ledger et les demandes. Des crédits confirmés contradictoires bloquent la synchronisation. Les anciennes versions peuvent effacer un champ JSON inconnu : protocole versionné et détection des régressions connues, limite réelle documentée, aucune garantie serveur inventée.

Grades provisoires centralisés : 12 combinaisons point/étoile4/étoile8 × cuivre/argent/or/diamant. Noms descriptifs et seuils modifiables en configuration, sans migration. Avatar actuel conservé faute de mécanisme photographique natif ; insigne SVG commun et statique, progression du profil calculée depuis le ledger.

## Étapes

- [x] A : tests métier en échec, effort/éligibilité, crédits/requêtes et grades purs ; raccordement au writer natif et CAS/résolutions/activation/récupération du module. Tests de concurrence, réponse perdue, rejeu et anciens clients.
- [x] B : trois cartes Stitch actives, effort prérempli/persisté, champ personnalisé inactif, E04 préservé.
- [x] C : composant avatar/insigne réutilisable sur membres, fiches, attribution et profil ; total, grade provisoire et progression accessibles.
- [x] D : tests ciblés puis régressions communes justifiées par les changements métier/famille partagés ; captures 320/390/1440 ; revue technique indépendante ; documentation des limites et seuils à arbitrer ; commits et branche poussée uniquement.

Pas de Supabase/SQL en production, récurrence, heure, rappel, mission automatique, modification de branche E01/E02/E03, fusion ou publication Pages. Les tests multi-comptes utilisent des fixtures, jamais des comptes réels.
