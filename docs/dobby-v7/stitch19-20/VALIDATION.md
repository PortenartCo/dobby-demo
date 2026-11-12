# DOBBY V7 — intégration native Stitch 19/20

Candidat développé depuis `main` `0f3131f3deb1ff63f3accca9c591521b04f4f212`,
sur `feat/dobby-v7-stitch19-20-integration-20261112`.
L’entrée officielle préparée est **https://portenartco.github.io/dobby-demo/**.
La publication et la recette réelle restent des contrôles distincts des tests locaux.

## Comportement livré dans le code

Les cinq vues Bienvenue, Connexion/Inscription, Profil avec 24 portraits, Créer et
Rejoindre utilisent le routeur Famille et la session native. Le serveur résout
compte, profil canonique et foyer ; aucun nom, ordre ou profil fictif ne sert de
preuve d’identité. Les écritures ciblées conservent les contrôles de permissions,
la révision attendue et les données hors du profil modifié.

Les confirmations et récupérations reviennent à la racine exacte, sans wildcard ni
paramètre applicatif ajouté au `redirect_to`. Le vérificateur PKCE reste dans
IndexedDB. La consommation des parcours est atomique : un ancien retour ne peut
supprimer ou remplacer le parcours plus récent. Un compte lié retrouve la
Cheminette ; un nouveau profil reprend son parcours. Les choix magiques terminés
ne sont pas rejoués.

Maison et Patronus s’ouvrent en fenêtres sur Traverse et réutilisent le barème
`e06-v1` inchangé : 6 questions Maison et 5 Patronus, plus leurs départages, quatre
Maisons et douze Patronus. Choix manuels/calculés, reprise et confirmation restent
natifs. Le profil s’actualise après libération du verrou d’enregistrement.

Le défilement et les dispositions couvrent six largeurs, les formulaires à faible
hauteur et les fenêtres longues. Les effets sont actifs par défaut, les flammes
vertes démarrent au premier toucher et le son reste indépendant. Les huit portraits
initiaux sont conservés ; seize portraits humains ont été retrouvés dans les
ressources déjà produites, sans génération supplémentaire.

L’ancien index V2.9.2 est conservé byte pour byte dans `index-v2.9.2.html`.
Les anciennes revues publiées ne sont pas remplacées par cette intégration. Leur
builder de test utilise désormais une sortie temporaire dédiée, nettoyée même en
cas d’échec, pour préserver les archives lors de la campagne globale.

## Validation locale et revue

| Contrôle | Résultat |
| --- | --- |
| Unités natives, identité, hors ligne, conflits et E06 | **288 tests PASS** |
| Ajouts navigateur natifs | **8 suites PASS**, empreintes produit finales inchangées |
| Campagne historique `DOBBY_FINAL=1` | **65/65 checkpoints PASS**, reprises tracées après échecs réels |
| Formats/imports Cuisine, timers et builders | **58 tests PASS** |
| Nettoyage de la fixture intégrée CI | **3 tests PASS**, trois largeurs navigateur, archive préservée |
| PREP-01 et E09 | 50 unités, UI 320/390/1440, invalides et vraie frontière HTTP simulée A/B PASS |
| Installation SQL V7 locale | 12 groupes PASS sous installateur non-superuser |
| Nouveau départ familial local | 5 groupes PASS, désactivation ciblée et retour arrière |
| Revue indépendante | Accès, cérémonies, nettoyage Auth, formulaire Famille et SQL : **PASS** |
| Génération | **73 fichiers** reproduits sans changement |
| Ressources | 15 références identiques et 11 ressources locales vérifiées par SHA-256 |

La campagne historique locale contient plusieurs époques de source et des
checkpoints parallèles vérifiés par empreintes. Elle ne se présente pas comme une
exécution unique d’un commit immuable. La CI GitHub du candidat fournit ce contrôle
supplémentaire. Les anciennes hypothèses de fixtures ont été corrigées en gardant
les writers natifs, les refus d’accès, les conflits, les identifiants et les assertions
sur les données : acteur fictif déclaré, nouvelles fenêtres, images entières et
périodes explicites lors du changement de jour à Paris.

Les preuves compactes sont dans [evidence/](evidence/), notamment
[le bilan navigateur](evidence/native-browser-results.json),
[la campagne historique](evidence/historical-campaign.json),
[les unités](evidence/native-unit-tests.log) et [les revues](evidence/reviews/).
Les 48 captures des écrans d’accès et les captures transversales complètes sont
produites par la CI ; une sélection est conservée ici.

| Largeur | Profil natif |
| --- | --- |
| 320 | [capture](evidence/captures/profile-320.png) |
| 390 | [capture](evidence/captures/profile-390.png) |
| 768 | [capture](evidence/captures/profile-768.png) |
| 1024 | [capture](evidence/captures/profile-1024.png) |
| 1440 | [capture](evidence/captures/profile-1440.png) |
| 1920 | [capture](evidence/captures/profile-1920.png) |

[Bienvenue](evidence/captures/welcome-390.png),
[Connexion](evidence/captures/login-390.png),
[Créer](evidence/captures/create-1440.png),
[Rejoindre](evidence/captures/join-390.png),
[flammes au premier toucher](evidence/captures/first-touch-green.png).
Les correspondances Stitch et la provenance des illustrations sont décrites dans
[design/stitch19-20](../../../design/stitch19-20/README.md).

## Supabase : état réel reçu

L’utilisateur a exécuté `01-apply.sql`, puis transmis la vérification structurelle
réussie. Le SQL conserve les protections Missions et le stamp existants, ajoute les
API ciblées et ferme les tables privées. Les lectures directes anonymes ont confirmé
le refus d’accès au contexte/modules et au schéma privé, et l’état invalide d’une
invitation fabriquée. Ces lectures ne prouvent pas deux comptes authentifiés.

Les deux comptes Auth existants ne servaient qu’aux essais. Conformément à la
nouvelle décision utilisateur, `04-link-existing-owner.sql` n’a pas été utilisé.
Après diagnostic des dépendances et revue, l’utilisateur a exécuté `06` puis `07` :
**deux anciennes appartenances V2 inactives, deux comptes Auth conservés, six modules
et leurs révisions inchangés, zéro liaison/invitation/brouillon V7**. Aucune donnée,
compte Auth, table ou policy n’a été supprimé. Codex n’a effectué aucune mutation
Supabase distante. Aucun projet professionnel Portenart n’a été modifié.

La capture Dashboard confirme Site URL et une seule Redirect URL exactes :
`https://portenartco.github.io/dobby-demo/`. Les inscriptions sont actives et la
confirmation e-mail reste requise. Voir [DASHBOARD.md](supabase/DASHBOARD.md) et
[le nouveau départ](supabase/REPARTIR-FOYER-TEST.md). Ne réexécuter ni `01` ni `06`.

## Gates de livraison

| Gate | État de ce rapport avant publication |
| --- | --- |
| Code | Développé et revu sur branche isolée |
| Tests locaux | PASS, avec preuves et limites explicites |
| Schéma et nouveau départ Supabase | Appliqués et vérifiés manuellement par l’utilisateur |
| Données réelles / deux sessions Auth | Recette encore nécessaire après publication du candidat |
| Déploiement | CI et SHA publié à vérifier séparément |
| Usage opérationnel | Non déclaré avant résultats réels |

Les tests navigateur utilisent Chromium et des gestes CDP ; la hauteur réduite
simule l’espace laissé par un clavier. Ils ne constituent pas un test physique sur
iPhone. Les résultats Auth/invitation des fixtures ne certifient pas le backend réel.
Le PostgreSQL local est 17.7, le projet réel 17.11 ; le guard privé Missions non
fourni utilise un stub défensif annoncé dans les tests SQL. Ses définitions distantes
et les objets historiques n’ont pas été modifiés.

Le retour arrière frontend passe par un revert du changement publié et une nouvelle
publication Pages. Les scripts SQL de retour arrière conservent les données ; `08`
refuse de réactiver l’ancien foyer après création du nouveau. Aucun rollback de base
n’est exécuté automatiquement.
