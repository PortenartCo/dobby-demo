> Actualisation ciblée E06-01 : le Rituel est désormais intégré depuis les sources reçues. Voir [rapport E06-01](E06-01-RITUEL.md). Le bilan ci-dessous décrit le checkpoint de consolidation antérieur ; les autres arbitrages restent inchangés.

# Consolidation E01–E08 — livraison pour revue

Départ : `a84f67acf8f5cbfd59475c2137ec70e1a20732f7`, branche `feat/dobby-e01-e08-review-integration`. La [demande complète](CONSOLIDATION-SPEC.md), le [registre utilisateur inchangé](REVIEW-CONSOLIDATION.md), la [matrice avant/après](CONSOLIDATION-MATRIX.md) et les [dépendances bloquées](CONSOLIDATION-BLOCKERS.md) restent distincts.

**Aucun DONE global : quatre identifiants courants comportent une dépendance bloquée.** Les corrections réalisables sont livrées séparément ; les tests et la publication ne constituent pas une acceptation visuelle utilisateur ni une preuve de partage entre comptes réels. La matrice finale couvre les 95 lignes : 81 vérifiées, 5 bloquées et 9 reportées ; parmi les 41 identifiants, 32 vérifiés, 4 bloqués et 5 reportés. Les statuts des règles et références historiques certifient leur respect, jamais une validation utilisateur.

## Corrections effectuées

| Exigences | Effets réels | Preuves ciblées |
|---|---|---|
| E01-01 à 06 | États vides sans pointillés ; case ouverte vide, confirmation et réouverture manuelle native sans deuxième gain ; automatique pilotée par sa source ; Midi/Soir indépendants avec photo ou repli E07 et lien recette ; ajout rapide dans la liste unique avec retour de doublon et statut local | [Parcours, captures avant/après et données](evidence/consolidation/e01-e04/README.md) |
| E02-01 à 03 | Dobby entier et prédominant ; dictée progressive de plusieurs segments, conservation après pause/fin/erreur, arrêt/reprise/annulation/envoi explicites ; protection des corrections manuelles et callbacks tardifs ; commandes natives persistantes | [Tests voix et commandes](evidence/consolidation/e02/README.md), [vrai bundle local](evidence/consolidation/e02/bundle/README.md) |
| E03 préservé ; E04-01/03/04 | Hero, cartouche, filtres et cartes E03 conservés ; suggestions retirées du formulaire, catégories/consignes/membres/avatars natifs conservés ; dock Missions actif, Retour/Fermer vers E03 | [Non-régression et captures](evidence/consolidation/e01-e04/README.md) |
| E05-02 à 05 | Catalogue commun des 4 Maisons et 12 Patronus ; origine/fondateur/valeurs/symbolique ; insigne natif illustré, grade, total, jauge, prochain palier et historique ; montants et seuils intacts ; nouveaux résultats confirmés explicitement | [Descriptions, 12 grades, ledger et captures](evidence/consolidation/e05/README.md) |
| E06-02/03/05/06/07 et partie E06-04 | Création native d’un membre fictif local, reprise/rechargement et reset ; chapeau substitutif tracé, compteur unique et typographie romaine ; résultats Maison sans masque ni titres tronqués, contenus communs ; grands Patronus conservés ; entrée naturelle dans le profil du membre explicitement choisi | [Sources, 4 Maisons/12 Patronus, parcours et preuves](evidence/consolidation/e06/README.md) |
| E07-04 à 08 | Import début/fin inclusifs, Midi/Soir, raccourcis 3/7/14/personnalisé, aperçu confirmé ; achats manuels et unités/provenances protégés ; fin dorée pleine largeur, aide sans coche, confirmation et succès ; seuls achats approuvés retirés ; historique retiré de l’interface, archives conservées ; CTA ≥16 px et accords | [Cas limites et comparaisons](evidence/consolidation/e07/README.md) |
| E08 et T-01 à 05 | Accords 0/1/2 ; illustration décodée aux trois largeurs sans reconstruction ; préférences natives Effets/Son communes aussi en E06, navigation/rechargement, réduction des mouvements et absence de réactivation sonore ; intégration isolée préservée | [Tests partagés](evidence/consolidation/logs/shared-3widths.log), [captures](evidence/consolidation/shared/), [revue indépendante](evidence/consolidation/INDEPENDENT-REVIEW.md) |

## Exigences bloquées et reports

| ID courant | Partie non réalisée | Dépendance précise |
|---|---|---|
| E04-02 | Récurrences quotidienne, hebdomadaire et mensuelle avec séries/occurrences | Les normalizers et writers natifs retirent ces champs ; limite de 200 missions ; crédit par mission ; protocole familial sans version de séries ni compatibilité avec les anciens writers. Une évolution native significative est nécessaire. Les options restent indisponibles avec explication. |
| E05-01 | Blasons officiels des quatre Maisons | Fichiers officiels et droit de republication publique non établis. Aucun nouveau blason officiel ou imitation présentée comme conforme n’est incorporé. Usage privé et démonstration publique sont distingués. |
| E06-01 | Rituel → Traverser → passer/ne plus afficher | Archive `stitch_dobby_assistant_mobile_app (9).zip` et HTML/médias correspondants introuvables dans les ressources inspectées. Aucune scène inventée comme source retrouvée. |
| E06-04, partiel | Grand blason officiel | Dépend d’E05-01. Masque noir, titres, typographie, descriptions et confirmation sont corrigés et vérifiés indépendamment. |

[Audit détaillé et conditions de levée](CONSOLIDATION-BLOCKERS.md). La ligne historique RC-L019 reste également bloquée par l’exigence plus récente de blasons officiels.

Reports autorisés : **E06-08** pour comptes/foyer/invitations/permissions serveur ; **E07-01/02/03/09** pour calendrier, Grimoire, choix/fiche/cuisson/TM5 et raccord « vivres manquants », réservés à E07.3. Puis Menu, Famille et autres modules dans l’ordre du registre. **E07-10 et RC-L024 maintiennent la revue utilisateur ouverte** : leur respect est vérifié, l’UX n’est pas auto-validée.

L’illustration du chapeau est une création de remplacement avec [provenance explicite](../../essai-stitch-v7/assets/onboarding/sorting-hat-original.provenance.json), jamais présentée comme l’asset Stitch manquant. Safari/iPhone physique reste non vérifié ; les frontières SpeechRecognition/speechSynthesis sont simulées, les writers et la persistance sont réels dans des profils fictifs.

## Vérifications et reprises causales

Le GATE 0 a conservé **95 lignes, dont 41 identifiants exacts**, avant modification. La seconde lecture indépendante contrôle les effets réels et la couverture, pas seulement les intitulés de boutons. Les règles et références historiques sans ID conservent une portée de statut explicite.

- **92 tests unitaires natifs/synchronisation/scoring/builder : PASS**, dont 25 600 comparaisons de scoring Python/JS. [Journal](evidence/consolidation/logs/unit-92.log).
- Les six nouvelles suites de consolidation et les régressions E01–E08 ont réussi aux largeurs pertinentes. Les corrections sont contrôlées à **320, 390 et 1440 px** ; [preuves par lot](#corrections-effectuées).
- La campagne finale complète et la CI du checkpoint `c147a1c` sont **PASS** : [run 42928115430](https://github.com/PortenartCo/dobby-demo/actions/runs/42928115430), [métadonnées](evidence/consolidation/ci-checkpoint.json), [journal intégral](evidence/consolidation/logs/ci-checkpoint-pass.log).
- Le vrai bundle local passe les six parcours transversaux, le parcours complet E06 et les commandes/dictée E02 aux trois largeurs. [Captures du bundle](evidence/consolidation/bundle/).
- Sur l’URL réelle, les **six parcours transversaux passent à 320/390/1440** : missions, profil/questionnaires, repas/recettes, courses, contrats et conversation native ; navigation, rechargement, deux onglets, reset et sentinelles Storage/IndexedDB. [Exécution](evidence/consolidation/hosted/execution.json), [journal](evidence/consolidation/hosted/test.log), [39 captures](evidence/consolidation/hosted/).
- Les **six nouvelles suites hébergées sont PASS à 320/390/1440**, soit **7 suites et 151 captures** avec les parcours transversaux : [reçu global](evidence/consolidation/hosted-results.json). E08 charge et décode son illustration ; Effets/Son conservent leurs états dans les huit contextes, après navigation et rechargement. La conclusion CI du SHA final sera fournie avec la livraison pour conserver ce commit immuable.

La première CI `ff76847` s’est arrêtée sur une hypothèse de test obsolète : « acheter du lait » était recherché uniquement dans `extras`, alors que l’affichage de la liste E07 initialise sa migration native vers `shopFinal.items`. Le test contrôle désormais le registre natif actif ; aucune modification applicative pour contourner l’échec. [Trace conservée](evidence/consolidation/logs/ci-legacy-extras-assumption.log). La reprise locale couvre le point interrompu et les cas restants, y compris le lot 2b situé après les clés numériques dans l’ordre JavaScript. [Reprise](evidence/consolidation/logs/final-campaign-resumed.log), [lot 2b](evidence/consolidation/logs/final-family-2b.log), [comparaisons](evidence/consolidation/logs/final-family-2b-visual.log).

Les autres ajustements de harnais conservent les assertions métier : Documents accepte aussi une vraie fiche démo existante ; le reset E06 attend le rechargement ; les sorties hébergées sont séparées des captures locales ; les états vides E01 sont préparés explicitement dans le profil éphémère, y compris lorsque le bundle contient son jeu fictif initial. Un premier clic de dock local a expiré sans cause produit établie ; contrôle ciblé non reproduit puis parcours complet PASS aux trois largeurs, avec [trace initiale](evidence/consolidation/logs/bundle-initial.log). Charge concurrente de navigateurs et arrêt du serveur 8789 ont été isolés ; reprises sur le serveur stable 8790. Aucun retry automatique caché ni assertion métier retirée.

La dernière revue des PNG a aussi identifié un portrait E06 absent de la seule capture hébergée à 320 px malgré un test DOM vert. Le [diagnostic causal](evidence/consolidation/e06/avatar-diagnostic/hosted-diagnostic.json) reproduit une capture avant livraison de l’atlas CSS : géométrie et opacité correctes, une seule couleur au centre ; après réponse HTTP 200/décodage, 2 631 couleurs et portrait réellement peint. L’attente des balises `<img>` ne couvrait pas ce fond CSS. La capture initiale et ses métadonnées sont conservées ; le harnais E06 attend désormais aussi ces fonds et leur peinture, sans changement du produit ni nouvelle publication. La reprise E06 valide 320/390 ; une assertion de chargement du Choixpeau, placée avant son attente de décodage, a ensuite arrêté 1440. Cette attente est déplacée avant l’assertion conservée ; la reprise du seul cas 1440 réussit. Les [phases et codes 1 puis 0](evidence/consolidation/e06/hosted/execution.json) sont explicites. Les trois captures finales montrent le portrait sélectionné ; aucun autre lot n’est relancé pour cet incident de preuve.

Les [comparaisons avant/après](CONSOLIDATION-CAPTURES.md) relient 13 écrans aux trois largeurs, ainsi que les états vides, plage d’import, résultats et captures hébergées.

## Publication isolée et traçabilité

Aperçu actualisé : **<https://portenartco.github.io/dobby-demo/essai-dobby-integrated-review/>**.

- Source applicative figée : `ff7684704f282b239633284e993348ae8094393f`. Les modifications ultérieures portent sur les harnais, preuves et documents ; les **258 blobs applicatifs**, le runtime et la configuration sont identiques. [Manifeste](evidence/consolidation/bundle-manifest.json), [provenance](evidence/consolidation/bundle-provenance.json).
- Publication statique : `7b8ba5dec2c56852234133b544a56bde66cd96ff`, parent `beff93cebe2ec558c9b8d3cd345045b22e0c816e`. **30 fichiers modifiés dans le seul dossier existant** ; les 18 autres entrées racine ont des arbres identiques. [Reçu](evidence/consolidation/publication.json), [build Pages exact](evidence/consolidation/pages-build.json).
- **263 fichiers HTTP vérifiés octet pour octet** sur l’URL servie ; les cinq points HTTP protégés et les huit branches sources sont inchangés. [Empreintes hébergées](evidence/consolidation/hosted-hashes.json), [avant](evidence/consolidation/protected-http-before.json), [après](evidence/consolidation/protected-http-after.json), [branches](evidence/consolidation/protected-refs-after.txt).
- Préfixe local/IndexedDB conservé : `dobby-review-integrated-v1|`. Aucun compte authentifié, connexion serveur ou transfert familial réel dans la démonstration. La sélection du nouveau membre fictif est explicite et reste dans cette enveloppe.

Aucun moteur/writer natif V5, fichier source Stitch ou SQL modifié ; aucune donnée réelle effacée/transférée ; aucune branche source déplacée. Aucune fusion de code applicatif dans `main`, aucune publication officielle et aucun autre aperçu modifié. La clôture technique des preuves est contrôlée indépendamment ; la livraison s’arrête pour revue humaine après constat de la CI sur le SHA final.

## Commits de la mission

1. `bb95132` — matrice exhaustive avant code et plan de consolidation.
2. `ff768470` — corrections applicatives réalisables, tests et preuves source.
3. `c147a1c` — recette du bundle, harnais et contrôle du registre natif actif.
4. Commit de clôture — matrice finale, reçus hébergés, contrôles de preuves et documentation ; SHA fourni dans la livraison finale.

La liste des décisions humaines restantes est limitée aux dépendances ci-dessus, à l’essai physique Safari/iPhone et à la revue visuelle des nouvelles corrections. Aucun chantier E07.3, Menu ou Famille n’est commencé.
