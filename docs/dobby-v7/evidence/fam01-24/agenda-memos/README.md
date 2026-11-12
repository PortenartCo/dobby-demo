# FAM-18 à FAM-24 — Agenda et mémos

Tests exécutés sur l’origine locale isolée `http://127.0.0.1:8863`, avec Chromium et des données fictives. Les requêtes extérieures sont bloquées ou satisfaites par une fixture HTTP du test ; aucune base réelle n’est sollicitée.

- `fam-agenda-memos.cjs` : PASS à 320, 390 et 1440 px. Création, consultation, modification, suppression confirmée/annulée, retours Salon/registre, identifiants stables, absence de doublons, conservation de provenance d’événement, refus de modification périmée et conservation de la saisie, conflit de mémo, rechargement, import volontaire idempotent et original local préservé, header/dock uniques, absence de débordement horizontal.
- `fam-agenda-memos-sync.cjs` : PASS. Deux profils isolés, writer et module natifs E09, création/lecture/modification/suppression partagées, révision CAS HTTP, création hors ligne et rechargement/reconnexion, import volontaire idempotent, `familyNotes` exclu du payload partagé, événements et provenance conservés. La fixture restitue `{}` à la sonde de capacité Missions ; elle ne simule aucune permission de production.
- `fam-agenda-month.cjs` : PASS. Mois calendaires, fin de mois (janvier → février), année bissextile, changement d’année et recul d’un mois.

`result.json` contient les contrôles par largeur. `sync-browser/result.json` indique les écritures et la révision de la fixture. Les captures `agenda-*`, `memo-create-*`, `memo-read-*` et `memo-edit-*` sont produites aux trois largeurs demandées ; `sync-browser/` contient les preuves hors ligne/import.

Les formulaires d’événement appellent `DobbyFamilyStitchEngine.saveEvent` puis le listener natif `fpEventForm`. Le writer natif fusionne désormais les champs normalisés dans la ligne existante afin de conserver sa provenance. Les mémos conservent `sharedFamilyNotes`, les snapshots CAS et les fonctions E09 de sauvegarde/suppression/import ; aucun nouveau stockage ni second moteur n’est créé.

Les anciens tests d’interface qui supposent une ouverture directe en édition depuis la liste des mémos ou un retour systématique à cette liste sont remplacés, pour ce périmètre, par les tests ci-dessus qui vérifient la consultation et le retour contextuel demandés. Les garanties de permissions serveur ne sont pas évaluées par ces fixtures.
