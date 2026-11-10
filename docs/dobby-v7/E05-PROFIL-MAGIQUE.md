# E05 — Profil magique par membre

> Ce document conserve la livraison historique. Les décisions du 11 novembre et leurs corrections actuelles sont suivies dans [la consolidation](CONSOLIDATION.md) et [la matrice exhaustive](CONSOLIDATION-MATRIX.md). Les points bloqués/reportés ne sont pas déclarés terminés.


Branche indépendante `feat/dobby-e05-magic-profile`, base exacte `8bcd49c1c2250879e2fd5a96641cd77747ef9ea0`. Demande complète : [E05-SPEC.md](E05-SPEC.md).

## Livré et opérationnel

- Un écran `famille.html#personal?person=<identifiant>` : avatar, identité native, Maison/emblème original, Patronus, grade SVG E04, total confirmé, progression et historique natifs. Quatre thèmes, une structure verticale ; aucun sélecteur Maison supérieur.
- Modifications dans les cartes Maison, Patronus, avatar et identité ; les données passent par `v23MemberForm` et `save()` existants. Les autres champs du membre et les extensions inconnues sont conservés. Création/édition refusée par le stockage : restauration de l’état précédent. Une date native non représentable bloque la modification au lieu d’être effacée.
- Modèle optionnel `familyMembers[].magicProfile = {version:1,houseId,patronusId,avatarId}`. Pas de table, de registre, de writer ou de stockage parallèle. Les identifiants de membre restent ceux du registre familial.
- 12 Patronus sélectionnables et 8 portraits disponibles, ressources locales originales ; les emojis existants restent utilisés jusqu’au choix explicite d’un portrait. Retour à l’emoji possible. Le même composant avatar/insigne sert au profil, aux listes familiales et aux cartes d’attribution des missions.
- Seuils V1 E04 confirmés : 0/50/100/200/350/550/800/1100/1500/2000/2600/3300. Seul `provisional` passe à `false` ; calcul et protocole E04 inchangés, gains exactement 10/25/50. Les noms descriptifs restent modifiables.
- Profils familiaux consultables et modifiables dans le cadre du registre existant. Bouton doré : choix explicite, sans rattachement arbitraire au compte. Une URL sans `person`, un accès générique et le retour navigateur restaurent le choix de membre. Un identifiant supprimé/inconnu ne donne accès à aucun autre profil.
- « Compte et paramètres » secondaire et replié : ouverture du portail de connexion natif existant. Les cinq destinations, barres permanentes, préférences et opérations métier restent disponibles. Les accès annexes du précédent grimoire sont conservés.
- Edition en cours protégée d’un rafraîchissement ; sauvegarde bloquée si le membre ou le contexte du foyer a changé depuis son ouverture.

## NON LIVRÉ / NON VÉRIFIÉ

| Élément | Constat et étape ciblée nécessaire |
|---|---|
| Fidélité aux quatre maquettes du dernier export | `stitch_dobby_assistant_mobile_app (4).zip` absent du workspace, des pièces disponibles et du dépôt. Pièce demandée pendant l’exécution, non reçue. Aucune récupération d’asset de cet export ni comparaison source prétendue. Profil fonctionnel livré ; validation graphique contre la composition Serpentard **NON VÉRIFIÉE**. Fournir cet export puis comparer/ajuster seulement cet écran. Le HTML original des 53 sources est intact. |
| Import de photo personnelle | **NON LIVRÉ.** Le code `family-v2.js:SHARED_BUCKET/storageFetch` et la proposition `sql-proposals/dobby-family-files.sql` décrivent un stockage documentaire privé par foyer (JPEG/PNG/WebP/PDF, 10 Mo), accès authentifiés. Cela ne prouve pas son état serveur ni l’autorisation d’usage pour les profils. Aucun contrôle production, upload, nouveau bucket, changement de règles, URL publique ou base64 dans le JSON. Étape : valider capacité/règles privées du bucket existant, convention des références et cycle remplacement/suppression avant de raccorder l’import et le recadrage. Aucun nouveau bucket proposé par défaut. |
| Rattachement compte → membre | **NON LIVRÉ.** `DobbyFamilyUI.getContext()` expose userId/householdId, pas de memberId vérifié. Aucun rapprochement nom/e-mail/ordre/localStorage inventé ; le résolveur central renvoie explicitement aucun lien. Étape : définir et valider un lien stable autorisé, puis raccorder `linkedMember`. |
| Autorisations parent/enfant | **NON LIVRÉES.** Pas de rôle parental fiable dans le modèle ; aucune restriction parentale effective annoncée. L’édition utilise les capacités générales préexistantes du registre du foyer. Étape : modèle et contrôle serveur approuvés pour les rôles avant de revendiquer une séparation parent/enfant. |
| Intégrité avec anciens clients | **NON LIVRÉE.** Test reproductible : un ancien writer qui reconstruit `{id,name,avatar}` peut effacer `magicProfile` dans le payload partagé ; un client récent inchangé récupère alors ce payload. Les conflits concurrents conservent intégralement la version explicitement choisie, sans fusion arbitraire. La conservation est prouvée entre writers récents et lors des éditions natives récentes, pas contre les anciens writers. Étape : aligner tous les writers avant coexistence, ou faire approuver une protection serveur/versionnée. |
| Tests de découverte Maison/Patronus | Hors périmètre : boutons « Refaire le test » désactivés, explication visible ; aucun questionnaire simulé. |

Les limites E04 restent applicables : premier CAS accepté pour les crédits concurrents hors ligne, anciens writers capables d’effacer des champs serveur, tests multi-compte limités aux fixtures. Aucune intégrité universelle ou autorisation RLS réelle déclarée acquise.

## Médias

[Inventaire exact et provenance](evidence/e05/MEDIA.md) : 12/12 Patronus et 8/8 portraits disponibles dans deux atlas PNG originaux, fenêtres CSS par identifiant stable, aucune URL Google temporaire et aucune capture d’écran utilisée comme illustration. Le fond spectral fait partie de l’illustration ; les PNG ne sont pas des photos personnelles.

## Vérifications et preuves

- `node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs` : **80 tests PASS** après adaptation explicite du contrat d’isolation à l’unique extension du writer membre. Le reste du HTML natif continue d’être comparé au source original.
- `e05-native.cjs` : formulaire réellement exécuté, champs inconnus préservés, validation, reload, refus stockage en création et édition, date ancienne protégée, récompenses inchangées.
- `e05.cjs` : **PASS 320/390/1440**, quatre thèmes, édition Maison/Patronus/avatar/nom, persistance, badges partagés, état vide, emoji, accès paramètres, membre supprimé, absence de débordement, cinq destinations.
- `e05-edge.cjs` : **PASS**, sélection/persistance des 12 Patronus et 8 portraits, modification distante bloquée, clavier, choix explicite/générique/retour, bouton doré depuis les cinq destinations.
- Régressions E04, E01/E02 et modules communs : campagne `tests/ci.cjs`, 38 scripts au total avec E05 ; les premiers scripts réussis ne sont pas relancés localement après le défaut E01, reprise au script en échec. Résultats complets et état final dans [TESTS.md](evidence/e05/TESTS.md).
- E03 : composition temporaire détachée à `6a86ead6341eb2f17e7552852621c21f496ad97c`, aucun merge ni commit sur E03. Générateur, renderer et exceptions E03 conservés ; surcouche E04/Runes/E05 listée dans [e03-composition-files.json](evidence/e05/e03-composition-files.json). Tests E03 avec sélecteurs des vrais radios E04, accès paramètres secondaire E05 et attente du rendu DOM terminé ; aucune assertion retirée. Résultats dans TESTS.md.
- Revue indépendante : deux défauts reproduits et corrigés (choix génériques/retour et création refusée), tests ajoutés ; aucune conclusion de sécurité parentale ou de compatibilité interversions extrapolée.
- [Captures quatre thèmes × 320/390/1440](evidence/e05/README.md). Données explicitement TEST, profils éphémères, trafic externe bloqué pour les parcours ; aucun compte ni photo réels.
- CI : attendre les deux workflows du SHA de livraison. Le bilan final donne leurs liens exacts ; l’URL de branche n’est pas une publication Pages.

## Échecs initiaux et corrections

1. Contrat « HTML natif strictement identique hors stockage » : échec attendu après extension autorisée de `v23MemberForm`. Le test borne maintenant précisément ce seul bloc et continue de comparer tout le reste ; comportements vérifiés dans le vrai navigateur.
2. Test E01 : le portail secondaire s’ouvrait sans actualiser le sous-titre permanent. `bridge.open` remonte maintenant le chrome après ouverture ; la vérification des bandeaux est conservée.
3. Revue : création refusée laissait une entrée en mémoire via un `push` sur le tableau sauvegardé par référence. Snapshot de tableau corrigé ; test reproduit rouge puis vert.
4. Revue : Salon/Menu et Retour pouvaient garder un ancien ui.person. Toute ouverture personnelle sans identifiant devient un choix nul ; test reproduit rouge puis vert.
5. Composition E03 initiale : copie trop large du chrome retirait son titre « Missions » ; règle E03 restaurée dans la composition uniquement. Attente de `ui.view` antérieure au rendu pouvait lire le Salon : attente du dataset DOM terminé, assertions conservées.

Aucune fusion, migration SQL, modification Supabase, publication Pages ou modification des branches E01/E02/E03/E04. Arrêt E05 pour revue humaine.
