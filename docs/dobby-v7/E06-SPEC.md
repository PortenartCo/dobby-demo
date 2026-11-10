# CODEX — DOBBY E06 : Première connexion et cérémonie magique

**MODE : EXÉCUTION — Développement autonome, borné, avec checkpoints et preuves.**

## 1. Références obligatoires

Dépôt : `PortenartCo/dobby-demo`

Créer la branche indépendante `feat/dobby-e06-onboarding` depuis :

- Branche E05 : `feat/dobby-e05-magic-profile`
- SHA de référence : `8418682e5094b66ee879fbf18dcd1e6a3b6d5a05`

Conserver E01, E02, E03, E04 et E05 intacts. Ne pas fusionner leurs branches, ni modifier `main`.

Consulter les éventuelles instructions `AGENTS.md` applicables.

**Archive jointe : `DOBBY-E06-ENTREES-CODEX.zip`.**

Elle contient :
- `references/scoring/dobby-e06-scoring-v1.json` : questionnaires et barèmes canoniques.
- `references/scoring/validate.py` : validation exhaustive du calcul.
- `references/scoring/qa-results.json` : résultats de référence.
- `references/scoring/README.md` : contrat fonctionnel.
- `references/stitch/` : les sept maquettes HTML Stitch et leurs captures.

Vérifier l'accès à ces ressources avant toute modification. Si elles ne sont pas accessibles, ne pas reconstruire les barèmes ou les maquettes de mémoire.

Références existantes du code :
- `essai-stitch-v5-famille/family-profile.js`
- `essai-stitch-v5-famille/family-runes-core.mjs`
- `essai-stitch-v5-famille/family-v2.js`
- `essai-stitch-v5-famille/family-modules.js`
- `essai-stitch-v7/magic-profile.js`
- `essai-stitch-v7/magic-profile.css`
- `essai-stitch-v7/family-engine.js`
- `essai-stitch-v7/family.js`
- `essai-stitch-v7/chrome.js`
- `essai-stitch-v7/route-manifest.json`
- `docs/dobby-v7/E05-PROFIL-MAGIQUE.md`

## 2. Mission

Livrer le parcours fonctionnel de première connexion DOBBY, depuis la Cheminette jusqu'à la présentation de l'identité magique.

Le parcours comporte sept écrans complémentaires :

1. Mon foyer magique.
2. Mon identité.
3. Le questionnaire des quatre Maisons.
4. La révélation de la Maison.
5. Le Miroir des Âmes — questionnaire Patronus.
6. L'apparition du Patronus.
7. Mon identité magique consacrée.

**La Cheminette a déjà été conçue. Ne pas la recréer.**

Rechercher sa référence existante uniquement dans les sources accessibles. Si elle est absente, documenter précisément cette dépendance graphique sans bloquer le développement des sept autres écrans.

L'objectif est un parcours réellement utilisable, pas une succession de maquettes statiques.

## 3. Checkpoint A — Moteur des deux questionnaires

Implémenter les règles exactes du JSON E06 validé.

### Maison magique

- Six questions narratives.
- Quatre réponses par question.
- Pondérations croisées selon les quatre dimensions définies.
- Question complémentaire seulement lorsque le calcul la demande.
- Résultat déterministe parmi les quatre Maisons.

### Patronus

- Cinq questions narratives.
- Quatre réponses par question.
- Calcul croisé des modes et nuances définis.
- Question complémentaire conditionnelle.
- Résultat déterministe parmi les douze Patronus E05.

### Exigences communes

Utiliser exactement les questions, réponses, identifiants, pondérations, seuils de départage et règles d'égalité de l'archive.

Ne pas reformuler les questions validées.

Ne pas inventer un deuxième barème ou une nouvelle méthode de calcul.

Les positions visuelles des réponses peuvent varier, mais leurs identifiants et leur signification restent stables.

Ne pas afficher les dimensions, pondérations ou résultats intermédiaires à l'utilisateur.

Le résultat n'est confirmé qu'à la fin du questionnaire. Un abandon ne modifie pas le profil canonique.

Réaliser des tests de conformité avec le moteur Python de référence, notamment sur toutes les combinaisons et les cas de départage.

**DONE A :** les quatre Maisons et les douze Patronus sont accessibles, les résultats JavaScript concordent avec les références, et aucun choix aléatoire ou dépendant de l'horloge n'intervient.

## 4. Checkpoint B — Les sept écrans Stitch

Réutiliser les HTML et les assets du ZIP joint comme références graphiques.

Intégrer les écrans au système V7 existant, sans second moteur de navigation ni duplication des bandeaux.

Conserver :
- Les typographies communes DOBBY.
- La présentation fantasy premium.
- Les effets visuels discrets.
- Les boutons et composants réutilisables.
- La navigation adaptée au téléphone.
- Les préférences sonores et d'accessibilité déjà disponibles.

Pendant la cérémonie, masquer les barres de navigation habituelles et utiliser un en-tête léger avec progression.

### Corrections obligatoires des maquettes

**Écrans de révélation :**
- Supprimer les sélecteurs permettant de choisir directement une Maison ou un Patronus.
- Utiliser uniquement le résultat du calcul.
- Conserver le changement manuel dans le Profil E05.

**Écran de connexion :**
- Supprimer les affirmations selon lesquelles toutes les données restent sur l'appareil.
- Décrire correctement la synchronisation familiale lorsque celle-ci est activée.

**Écran d'identité :**
- Remplacer « Lignée ou Maison » par « Nom de famille ».
- Réutiliser les huit avatars E05 et conserver les emojis compatibles.
- L'import photo reste indisponible tant que son stockage privé n'est pas autorisé.

**Questionnaires :**
- Reprendre les textes exacts de l'archive.
- Éviter les commentaires qui suggèrent une Maison ou un animal.
- Une réponse obligatoire avant de continuer.
- Retour possible sans perdre les réponses précédentes.

**Illustrations :**
- Réutiliser les quatre emblèmes et les douze Patronus E05.
- Réutiliser les huit portraits E05.
- Ne pas dépendre d'URL externes temporaires.
- Ne pas substituer des illustrations fictives aux véritables médias.

**Écran final :**
- Avatar et identité du membre.
- Maison et Patronus réellement attribués.
- Grade et runes issus du moteur E04.
- Pour un nouveau membre sans gain : Pastille de cuivre et 0 rune.
- Pour un membre existant : conserver son grade réel et toutes ses runes.
- Action finale vers le Chemin de Traverse.

**DONE B :** les sept écrans forment un parcours complet, sans boutons factices présentés comme fonctionnels. Quatre thèmes de révélation et douze Patronus fonctionnent avec les composants existants.

## 5. Checkpoint C — Compte, foyer et membre

C'est la dépendance technique la plus sensible.

**Ne jamais confondre :**
1. Le compte authentifié Supabase.
2. Le foyer auquel ce compte appartient.
3. Le membre canonique de `familyMembers`.
4. Le Profil magique E05 de ce membre.

La V5 possède déjà `dobby_v2_memberships`, `requireHousehold()` et les mécanismes de session. Les réutiliser.

### Parcours attendus

**A. Utilisateur déjà reconnu**

Connexion réussie, foyer reconnu, membre associé de manière vérifiée : entrer directement dans DOBBY si sa cérémonie est terminée.

**B. Premier adulte**

Créer un compte et un foyer si les capacités serveur réellement disponibles et autorisées le permettent. Puis créer son membre canonique et sa première identité magique.

**C. Second adulte**

Se connecter, rejoindre le foyer sur invitation vérifiée, puis rattacher son compte à un membre existant ou créer un nouveau membre si nécessaire.

**D. Enfant sans compte**

Un parent ou utilisateur autorisé peut préparer et compléter son profil magique, sans créer obligatoirement un compte Supabase.

**E. Membre existant**

Sélectionner son profil, passer ou refaire les tests, sans créer de doublon ni perdre ses informations.

### Règles d'intégrité

Ne jamais associer automatiquement un compte à un membre par correspondance de prénom, d'e-mail, de position dans la liste ou de dernier profil consulté.

Ne jamais transférer silencieusement un membre d'un foyer à un autre.

Conserver les identifiants existants.

Vérifier les fonctionnalités serveur réellement accessibles pour créer un foyer, inviter un compte, accepter une invitation et établir une association compte–membre stable.

Si les mécanismes nécessaires existent, les réutiliser avec leurs contrôles d'autorisation.

**S'ils n'existent pas ou nécessitent un changement Supabase :**
- Ne pas créer de table, RPC, Edge Function, bucket, politique RLS ou migration en production.
- Préparer une proposition technique minimale et isolée sous `sql-proposals/` si nécessaire.
- Signaler les prérequis et les tests nécessaires.
- Rendre les actions indisponibles avec une explication claire, plutôt que simuler leur réussite.
- Continuer les parties d'E06 indépendantes de ce blocage.

Ne pas créer un nouveau système d'authentification.

Supprimer la nécessité de saisir une clé Supabase dans l'expérience utilisateur uniquement si la configuration publique existante permet réellement de la fournir sans nouvelle opération sensible.

**DONE C :** les parcours pris en charge fonctionnent avec le modèle canonique, et les parcours dépendant du serveur sont explicitement identifiés comme opérationnels ou bloqués.

## 6. Checkpoint D — Persistance et reprise

Prévoir :
- Sauvegarde temporaire de l'étape en cours.
- Reprise après interruption ou rechargement.
- Retour à une question précédente.
- Possibilité de passer les tests et d'y revenir plus tard.
- Possibilité de refaire un questionnaire depuis le Profil E05.
- Confirmation explicite du résultat avant son enregistrement définitif.

Les réponses temporaires doivent être correctement isolées selon le contexte utilisateur/membre disponible. Ne jamais réutiliser par erreur le brouillon d'un autre membre ou d'un autre foyer.

Après confirmation, enregistrer les identifiants définitifs de Maison et Patronus dans le `magicProfile` E05, avec la version de barème appropriée lorsque son stockage est compatible.

Ne pas enregistrer durablement toutes les réponses brutes sans nécessité.

Conserver les champs inconnus et les données existantes pendant les sauvegardes.

Les changements de Maison et Patronus ne modifient jamais les crédits, la progression ou l'historique E04.

Ne pas prétendre garantir la coexistence avec les anciens writers tant que la protection interversions E04/E05 n'est pas effective. Tester explicitement la limite et la documenter.

**DONE D :** un parcours interrompu peut reprendre sans doublon, et un résultat confirmé reste associé au bon membre après rechargement et synchronisation compatible.

## 7. Vérifications et preuves

Prioriser les tests ciblés et les contrôles déjà disponibles. Ne pas relancer inutilement une batterie complète inchangée.

### Calcul

- Validation de toutes les combinaisons des deux questionnaires.
- Concordance avec `validate.py` et `qa-results.json`.
- Tous les cas de départage.
- Résultats reproductibles.
- Aucune Maison ou Patronus inaccessible.

### Parcours fonctionnels

- Première visite.
- Retour et reprise après interruption.
- Test passé ultérieurement.
- Deux questionnaires complétés.
- Nouveau passage depuis E05.
- Modification du résultat sans perte de runes.
- Membre existant sans doublon.
- Absence d'association automatique non prouvée.
- Refus de stockage et résolution de conflits.
- Changement de foyer ou de membre pendant un brouillon.
- Cas d'authentification réellement disponibles et refusés.

### Visuel

Captures à 320, 390 et 1440 px.

Contrôler la lisibilité des réponses, l'absence de débordement, l'accessibilité tactile, les boutons Retour/Continuer et l'homogénéité des scènes.

Comparer les écrans intégrés aux sept sources Stitch. Documenter les écarts nécessaires pour conserver les composants communs DOBBY.

Vérifier la compatibilité E05 et E04 ; vérifier E03 sur composition temporaire si le changement des composants communs le justifie.

Une seule campagne générale de non-régression finale, puis CI sur le SHA livré.

Distinguer tests simulés, authentification réelle, intégration et production. Une CI verte ne vaut pas recette réelle entre deux comptes.

## 8. Restrictions

Ne pas :
- Modifier les sources Stitch originales.
- Recréer la Cheminette.
- Refaire le Profil magique E05.
- Introduire un second moteur de runes, de membres ou de synchronisation.
- Réécrire les questionnaires ou leurs pondérations.
- Ajouter de données fictives permanentes.
- Modifier Supabase en production.
- Utiliser les comptes familiaux réels pendant les tests.
- Fusionner les branches existantes.
- Publier GitHub Pages.
- Étendre la mission à une refonte générale de DOBBY.

Ne pas bloquer tout E06 à cause d'un prérequis serveur isolé. Livrer le périmètre sûr et indiquer précisément la dépendance restante.

## 9. Livraison

Pousser la branche `feat/dobby-e06-onboarding`, avec les commits, sans fusion.

Produire `docs/dobby-v7/E06-PREMIERE-CONNEXION.md` comprenant :

- Liste des fonctionnalités livrées.
- Correspondance avec les sept maquettes Stitch.
- Résultats du calcul exhaustif.
- Captures avant/après et liens vers les preuves.
- Persistance et reprise.
- Parcours compte–foyer–membre réellement utilisables.
- Prérequis SQL/serveur non exécutés, s'il y en a.
- Tests ciblés et CI finales.
- Risques d'intégrité interversions restant ouverts.
- Étapes nécessaires avant une recette réelle à deux comptes.

Faire une revue technique ciblée des modifications significatives, corriger les défauts établis et conserver les tests causaux.

**Arrêt pour revue humaine après livraison. Aucune fusion, publication ou modification serveur sans autorisation distincte.**