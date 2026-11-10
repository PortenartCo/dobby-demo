# E04 — Formulaire Nouvelle Mission

**Restauration et tests ciblés : PASS.** Branche indépendante `feat/dobby-e04-mission-form`, worktree `/workspace/dobby-e04-mission-form`, base E02 `9c73e845c7744315bdc7d03f59a09ae67572aa8e`. Commit applicatif `8292189`.

Le formulaire s'appuie sur le véritable HTML `design/stitch-53/dobby_cr_er_et_attribuer_une_mission/code.html`, déjà dérivé sans scripts dans `essai-stitch-v7/templates/remaining/mission-edit.html`. Le fichier source et son template sont inchangés. [Provenance de la comparaison](evidence/e04/source/provenance.json).

## Composition restaurée

`tools-register.js`, `mission()` conserve les trois panneaux, leurs en-têtes numérotés, surfaces, bordures dorées, typographies, pictogrammes, ombres, champs et groupements Stitch. Les sections complètes ne sont plus vidées pour introduire un formulaire générique.

- **Intitulé & Rôle de la Quête** : champ de titre et notes originaux, suggestions explicitement choisies par l'utilisateur, catégorie native sous forme de pastilles cohérentes avec les boutons Stitch.
- **Assignation & Récurrence** : cartes d'origine alimentées depuis les options natives et les vrais membres/avatars du registre ; sélection par radios natives, nom complet sur plusieurs lignes, choix « Non attribuée ». Les personnages, portraits et jauges fictifs sont retirés.
- **Récompense & Échéance** : cartes d'effort et habillage des récompenses conservés, valeurs fictives retirées ; boutons rapides Aujourd'hui, Demain, Week-end, Date précise raccordés à la date native.
- Bouton doré original raccordé à l'enregistrement réel, positionné par le chrome commun au-dessus des cinq destinations permanentes. Titre contextuel « Nouvelle Mission » / « Modifier la mission », retour et fermeture vers la Bibliothèque des Missions. Aucun nouveau header ou routeur ; étoile, son et profil restent ceux du chrome commun inchangé.

Les correctifs CSS sont exclusivement limités à `body[data-family-view="mission-edit"]` dans `register.css`. Ils neutralisent notamment les marges et le `display:block` génériques qui déformaient les panneaux et les cartes. Les déclarations AES/version/chiffrement, le cartouche technique et les paragraphes d'architecture ont été supprimés de la vue ; le statut Famille/Agenda sans rapport est masqué uniquement ici.

## Raccordement et limites fonctionnelles

| Élément | Comportement réel |
| --- | --- |
| Titre, note | Limites natives 140/400 caractères ; vide en création, données réelles en édition. |
| Responsable | Options du writer existant, sélection modifiable, non-attribution possible, référence d'un ancien membre conservée sans inventer son nom. |
| Catégorie | Quatre valeurs natives, lecture et modification conservées. |
| Date | Facultative, restaurée en édition. Raccourcis calculés en calendrier local, sans modifier la date persistée du planning. |
| Enregistrement | `nativeMission()` → `E.submit('fmsForm', values)` existant ; édition par identifiant, sans doublon ni writer parallèle. Retour réel vers `missions.html`. |
| Brouillon | Restauration existante lors du retour arrière du navigateur ; les radios et l'état du choix de date suivent les valeurs restaurées. Aucun nouveau stockage. |
| Ancien format non pris en charge | Garde existante conservée : édition bloquée et données intactes. |

**Éléments graphiques restaurés mais indisponibles :** récurrences Quotidien/Hebdomadaire/Mensuel ; niveaux d'effort Légère/Régulière/Majeure ; récompenses, runes et saisie d'une valeur personnalisée. Ils sont désactivés et accompagnés d'indications courtes. Aucun point ni montant n'est affiché comme une donnée réelle. « Unique » décrit le comportement actuel des missions manuelles, sans ajouter de champ de récurrence.

Aucune gestion d'heure ou de rappel n'est ajoutée ; le contrôle d'heure fictif est retiré. Terminer/Supprimer restent hors de ce formulaire et n'ont pas été développés ici.

**Convention Week-end :** prochain samedi, ou jour courant lorsque nous sommes samedi/dimanche. Les calculs utilisent `todayISO()` / `addDays()` natifs, donc la date locale plutôt qu'une conversion UTC. Année bissextile, changement d'année et passage à l'heure d'été vérifiés.

## Vérifications et preuves

- [Base E02 : `register-tools.cjs`, 320/390, PASS](evidence/e04/baseline-tools.txt).
- [Échec initial attendu du test de restauration](evidence/e04/red.txt) : panneau original Assignation & Récurrence absent. Puis [E04 à 320/390/1440 : PASS](evidence/e04/functional-results.txt).
- E04 couvre formulaire vierge et validation du titre, membres/avatars réels, changement d'attribution/catégorie, options indisponibles, dates rapides/précises/effacement, absence d'écriture lors des choix, création/édition/rechargement sans doublon, retour Bibliothèque, navigation Menu/retour navigateur avec brouillon, ancien membre/format, chrome et débordements.
- [Non-régression des vues partageant `tools-register.js` : PASS à 320/390](evidence/e04/regression-tools.txt) : mission, chat, recherche, contact, menu et grimoire personnel.
- [Synchronisation native avec fixture HTTP locale : PASS à 320/390](evidence/e04/regression-sync.txt) : attribution et payload natifs, état hors ligne/reprise, exclusion des données privées. Aucun compte réel ni accès Supabase réel.
- Syntaxe des fichiers modifiés et `git diff --check` : PASS. Relecture indépendante du commit applicatif : aucun constat concret.

Le test a également révélé que le retour arrière restaurait la valeur de date sans son bouton sélectionné. [Échec de régression](evidence/e04/draft-date-red.txt) conservé ; une microtâche locale actualise désormais la sélection après la restauration synchrone du brouillon commun. Aucun changement du système partagé de formulaires.

Campagne locale ciblée uniquement ; aucune relance manuelle des 32 scripts globaux. La CI automatique existante du dépôt reste inchangée.

Commandes reproductibles, serveur statique du worktree sur 8784 :

```sh
DOBBY_TEST_ORIGIN=http://127.0.0.1:8784 node essai-stitch-v7/tests/e04.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8784 node essai-stitch-v7/tests/register-tools.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8784 node essai-stitch-v7/tests/register-missions-sync.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8784 node essai-stitch-v7/tests/e04-capture.cjs
```

## Comparaisons visuelles

Les captures source contiennent les exemples illustratifs de Stitch, exclusivement pour comparaison. Les captures applicatives utilisent un profil éphémère et des données explicitement TEST.

| Largeur | Source Stitch | Avant E04 | Après E04 |
| --- | --- | --- | --- |
| 320 | [source](evidence/e04/source/source-320.png) | [vierge](evidence/e04/before/empty-320.png) · [prérempli](evidence/e04/before/prefilled-320.png) | [vierge](evidence/e04/after/empty-320.png) · [prérempli](evidence/e04/after/prefilled-320.png) |
| 390 | [source](evidence/e04/source/source-390.png) | [vierge](evidence/e04/before/empty-390.png) · [prérempli](evidence/e04/before/prefilled-390.png) | [vierge](evidence/e04/after/empty-390.png) · [prérempli](evidence/e04/after/prefilled-390.png) |
| 1440 | [source](evidence/e04/source/source-1440.png) | [vierge](evidence/e04/before/empty-1440.png) · [prérempli](evidence/e04/before/prefilled-1440.png) | [vierge](evidence/e04/after/empty-1440.png) · [prérempli](evidence/e04/after/prefilled-1440.png) |

Les vues complètes conservent les barres fixes à leur position de capture ; ces vues supplémentaires après défilement montrent chaque panneau sans cette superposition de capture :

| Largeur | Panneau 1 | Panneau 2 | Panneau 3 |
| --- | --- | --- | --- |
| 320 | [intitulé](evidence/e04/after/prefilled-step-1-320.png) | [assignation](evidence/e04/after/prefilled-step-2-320.png) | [échéance](evidence/e04/after/prefilled-step-3-320.png) |
| 390 | [intitulé](evidence/e04/after/prefilled-step-1-390.png) | [assignation](evidence/e04/after/prefilled-step-2-390.png) | [échéance](evidence/e04/after/prefilled-step-3-390.png) |
| 1440 | [intitulé](evidence/e04/after/prefilled-step-1-1440.png) | [assignation](evidence/e04/after/prefilled-step-2-1440.png) | [échéance](evidence/e04/after/prefilled-step-3-1440.png) |

Écarts visuels intentionnels : barres E01/E02 communes et colonne centrée de 480 px sur ordinateur ; catégorie native ajoutée ; personnages/jauges/valeurs fictifs et sceaux techniques retirés ; contrôles indisponibles atténués ; récurrences et dates sur deux colonnes à 320 px. L'Almanach est un champ date natif : sa présentation dépend du navigateur (Chromium d'essai affiche mm/dd/yyyy), ses valeurs et calculs restent locaux et corrects.

## Livraison isolée

Code et captures poussés uniquement sur `feat/dobby-e04-mission-form`. Aucun commit E03 intégré, aucun changement du worktree E02/E03, du moteur V5, des sources Stitch, du chrome commun, de Supabase/SQL ou des données réelles. [Contrôle des arbres protégés](evidence/e04/preservation.json).

Aucune fusion ni publication GitHub Pages E04. Arrêt après livraison de la branche et des preuves, en attente de revue visuelle par l'utilisateur.
