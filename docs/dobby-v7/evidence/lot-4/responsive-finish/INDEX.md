# Lot 4 — Comparatifs de finition responsive

Résultat observé le 19 novembre 2026 : **PASS**, 28 comparaisons et **56 PNG** sur la V7 complète. [Ouvrir le comparatif interactif](comparatifs.html).

Les 40 captures précédentes restent dans leurs dossiers d’origine. Ces preuves sont nouvelles ; les résultats historiques de sécurité ne sont pas présentés comme rejoués.

## Méthode

Commande : `node tests/private-access/lot4/responsive-finish.cjs`, puis Entrée au message `LOT4_FINISH_BASELINE_READY`. Le run final s’est terminé avec le code 0 et `LOT4_FINISH_PASS`.

Une seule fixture jetable est utilisée pour les deux phases : GoTrue, PostgreSQL, PostgREST et la commande Edge Lot 3 réelle, exposés uniquement sur l’origine loopback. Aucune requête métier n’est interceptée. Les 27 demandes nominatives sont fictives (`example.invalid`) ; trois lignes de journal fictives sont ajoutées directement au PostgreSQL jetable pour rendre la vue Historique lisible. Aucun compte, statut ou gate enfant n’est modifié par ce complément. La confirmation est ouverte, cochée pour vérifier l’accessibilité des boutons en mode `trial`, décochée, puis annulée ; aucune commande de mutation n’est soumise.

Le champ `mutationSubmitted: false` des résultats concerne la console : aucune mutation propriétaire n’y a été confirmée. Le peuplement fictif ci-dessus comprend bien les 27 requêtes de création de métadonnées et les trois insertions de journal dans la fixture jetable.

L’avant rejoue **un seul asset statique**, `admin-access.css`, avec ses octets exacts issus de `git show 2efb3c8d5417a1bca750993838520019b2ff82eb:essai-stitch-v7/admin-access.css`. Le serveur, le HTML, tous les scripts et tous les échanges Auth/PostgREST/Edge restent réels. L’après n’utilise aucune interception. Les empreintes des 14 sources observées sont immuables pendant chaque phase ; **seul `admin-access.css` diffère entre les phases**.

Les largeurs sont **320, 390, 768 et 1440 px**, avec une hauteur de **900 px**, identique aux preuves précédentes. Les captures incluent un bandeau de fixture de 44 px ; elles sont prises au viewport, et non en pleine page, afin de voir le dock fixe. Chaque resize attend deux frames et le `clientWidth` attendu avant les mesures pour éviter une mesure sur le layout précédent.

## Contrôles réellement observés

- Les premières données utiles sont visibles au-dessus du dock dans les vues Accès, Inviter, Demandes et Historique aux quatre largeurs.
- Les cinq destinations administratives restent lisibles et placées entre le header et le dock ; les six destinations permanentes sont conservées.
- Aucun débordement horizontal ; largeur de console de 768 px sur tablette et de 1180 px sur PC, avec deux colonnes de comptes. Les captures montrent également les demandes et le journal sur deux colonnes, et les deux champs d’Inviter côte à côte sur tablette/PC.
- À 320 px, le sous-titre et son élément enfant `.e011-band-section` n’ont aucun débordement horizontal ou vertical ; le nom complet reste à l’intérieur du header partagé.
- Pagination réelle 25 → 27 demandes, dernier article et son dernier bouton accessibles au-dessus du dock après défilement.
- Confirmation contenue dans chaque viewport, case obligatoire, boutons d’annulation et de confirmation atteignables ; annulation effective.
- Aucune erreur JavaScript non interceptée et aucune origine réseau hébergée observée.

Les résultats détaillés et les empreintes SHA-256 de chaque PNG sont disponibles dans [before.json](before.json), [after.json](after.json) et [results.json](results.json).

| Vue et largeur | Panneau, px avant → après | Navigation, px avant → après | Première donnée y, px avant → après | Console, px avant → après |
| --- | --- | --- | --- | --- |
| Accès 320 | 283 → 99 | 150 → 95 | 772 → 492 | 320 → 320 |
| Accès 390 | 225 → 101 | 152 → 95 | 718 → 497 | 390 → 390 |
| Inviter 320 | 283 → 52 | 150 → 95 | 780 → 448 | 320 → 320 |
| Historique fictif 320 | 283 → 52 | 150 → 95 | 772 → 446 | 320 → 320 |
| Accès 768 | 233 → 119 | 152 → 51 | 703 → 479 | 480 → 768 |
| Accès 1440 | 233 → 119 | 152 → 46 | 703 → 474 | 480 → 1180 |

Le dock commence à y=819 px dans ces captures. Les coordonnées concernent le début d’une donnée ou d’un champ, et non uniquement le titre de section.

## Captures avant et après

| État | 320 px | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
| Accès | [Avant](before/access-320.png) · [Après](after/access-320.png) | [Avant](before/access-390.png) · [Après](after/access-390.png) | [Avant](before/access-768.png) · [Après](after/access-768.png) | [Avant](before/access-1440.png) · [Après](after/access-1440.png) |
| Inviter | [Avant](before/invite-320.png) · [Après](after/invite-320.png) | [Avant](before/invite-390.png) · [Après](after/invite-390.png) | [Avant](before/invite-768.png) · [Après](after/invite-768.png) | [Avant](before/invite-1440.png) · [Après](after/invite-1440.png) |
| Demandes (25 premières) | [Avant](before/requests-320.png) · [Après](after/requests-320.png) | [Avant](before/requests-390.png) · [Après](after/requests-390.png) | [Avant](before/requests-768.png) · [Après](after/requests-768.png) | [Avant](before/requests-1440.png) · [Après](after/requests-1440.png) |
| Liste complète (27 demandes) | [Avant](before/long-requests-320.png) · [Après](after/long-requests-320.png) | [Avant](before/long-requests-390.png) · [Après](after/long-requests-390.png) | [Avant](before/long-requests-768.png) · [Après](after/long-requests-768.png) | [Avant](before/long-requests-1440.png) · [Après](after/long-requests-1440.png) |
| Bas de la liste complète | [Avant](before/long-requests-bottom-320.png) · [Après](after/long-requests-bottom-320.png) | [Avant](before/long-requests-bottom-390.png) · [Après](after/long-requests-bottom-390.png) | [Avant](before/long-requests-bottom-768.png) · [Après](after/long-requests-bottom-768.png) | [Avant](before/long-requests-bottom-1440.png) · [Après](after/long-requests-bottom-1440.png) |
| Confirmation avant annulation | [Avant](before/confirmation-320.png) · [Après](after/confirmation-320.png) | [Avant](before/confirmation-390.png) · [Après](after/confirmation-390.png) | [Avant](before/confirmation-768.png) · [Après](after/confirmation-768.png) | [Avant](before/confirmation-1440.png) · [Après](after/confirmation-1440.png) |
| Historique fictif | [Avant](before/history-320.png) · [Après](after/history-320.png) | [Avant](before/history-390.png) · [Après](after/history-390.png) | [Avant](before/history-768.png) · [Après](after/history-768.png) | [Avant](before/history-1440.png) · [Après](after/history-1440.png) |

## Revue visuelle et limites

Une lecture visuelle directe des paires Accès 320/1440, Inviter 768, Demandes 390, Historique 320, confirmation 320 et bas de liste 320 confirme le gain d’espace, les données remontées et le maintien des confirmations. Des captures après complémentaires à 390, 768 et 1440 px ont été examinées pour la composition des listes et des formulaires. Le périmètre automatisé porte sur les 28 paires ci-dessus ; la lecture visuelle manuelle ne prétend pas couvrir chaque pixel des 56 images.

Ces preuves concernent Chromium et une hauteur de 900 px. Elles ne constituent pas une campagne multi-navigateurs, un test de clavier mobile ouvert ni une nouvelle preuve de sécurité Auth/Storage. Aucune campagne Auth, Storage, SMTP/admission, migration/rollback SQL ou session distante n’a été rejouée pour cette finition. Les containers créés par ce run ont été fermés par le nettoyage de la fixture.
