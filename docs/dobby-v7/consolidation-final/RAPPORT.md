# DOBBY V7 — Livraison consolidée

La branche `integration/dobby-v7-consolidated-20261116` réunit Archives, Notes, Contacts et Paramètres. Les sources produit sont figées au commit `af015f8c334b67112ee197293611bdecc88d7905`. Le commit `56cbaf5825dcb9c5a7b65eb956d37a3364b20435` ajoute seulement le constructeur et la recette de l’aperçu ; les adaptations de tests ultérieures ne changent pas le produit.

## Développement et intégration

| Module | Source intégrée | Livraison |
| --- | --- | --- |
| Paramètres | `b6864bb682dbf417d2bf2fac29efac1cd37ec171` | [PR 22](https://github.com/PortenartCo/dobby-demo/pull/22), branche `feat/dobby-v7-settings-20261116` |
| Archives / Stitch 22 | `aafdded5005a67c1778128fda53b72275229b67f` | [PR 17](https://github.com/PortenartCo/dobby-demo/pull/17) |
| Notes / Stitch 23 | `1913e981a6437252569306e88b59f65c66a8b2fc` | [PR 18](https://github.com/PortenartCo/dobby-demo/pull/18) |
| Contacts / Stitch 24 | `27b9f9cd9a53492887ddd32047a07f588b2d3192` | [PR 20](https://github.com/PortenartCo/dobby-demo/pull/20) |
| Composition | Sources ci-dessus et résolutions vérifiées | [PR 23](https://github.com/PortenartCo/dobby-demo/pull/23) |

Contacts est devenu disponible pendant cette mission. Le [snapshot final](dobby-integration-final-snapshot.md) remplace donc le constat d’absence figurant dans l’audit initial des Paramètres.

Paramètres comporte trois cartes : Ambiance magique, Gestion du foyer et Données et sauvegardes. Les deux interrupteurs utilisent `st.stitchPreferences` et les commandes natives du header. Les effets sont actifs par défaut, le son reste inactif par défaut ; les choix enregistrés persistent sans son automatique au chargement. Le foyer ouvre la gestion native des membres et conserve les invitations et autorisations disponibles.

La sauvegarde télécharge réellement le JSON `dobby-complete-backup` v1, clairement signalé comme non chiffré. La restauration conserve validation, aperçu, conséquences, confirmation et annulation natives. Une perte de notes concurrentes pendant une attente asynchrone a été reproduite : le correctif natif minimal refuse désormais les changements de l’état complet et distingue les remplacements de fichiers et de données lors du rollback. Les fichiers sont contrôlés par SHA256 après restauration, erreur et rechargement.

Les résolutions des fichiers communs conservent les filtres d’archive des nouveaux Contacts, leur fiche détaillée en lecture seule et leur réactivation. Notes conserve les registres local et familial séparés. Le lien « Documents enregistrés » utilise `document-library`, distinct d’Archives. Aucun nouveau stockage de préférences, moteur familial, service, permission enfant ou authentification n’a été créé.

Les générateurs source, Cuisine, Famille et Registre ont été réexécutés. Les trois illustrations Stitch 22, 23 et 24 sont conservées à l’octet près ; leurs empreintes sont dans le manifeste de l’aperçu. Les fixtures historiques d’intégrité restent inchangées : les nouveaux amendements et leurs inversions reconstituent exactement chaque parent complet.

## Tests exécutés

| Vérification | Résultat | Preuve |
| --- | --- | --- |
| Groupes natifs, permissions, Courses/Repas, Contrats/Maison | 633 exécutions réussies, aucun échec | [Rapport des tests](dobby-integrated-results.md) |
| `npm test --prefix essai-stitch-v7/tests` | Exit 0, 338,733 s, 27 sous-scripts | [Reçu](evidence/dobby-integrated-standard-results.json) |
| Intégrité native et frontières source | 23/23 | [Log](evidence/dobby-4modules-source-proofs.log) |
| Paramètres | 320, 390, 768 et 1440 px ; clavier, préférences, retours, hors ligne | [Résultats](evidence/settings/settings-results.json) |
| Sauvegarde et restauration | 16 scénarios, dont annulation, quota, droits enfant et état concurrent | [Rapport Paramètres](../settings/RAPPORT-PARAMETRES.md) |
| Contacts et Archives | CRUD, filtre, confirmation/annulation, lecture seule, réactivation, métadonnées et reload aux quatre largeurs | Log de campagne standard |
| Archives | 36 consultations + 7 revues + 7 scénarios de concurrence + 14 writers ; sources PASS | [Reçu Archives](evidence/archives-final-validation-receipt.json) |
| Notes, agenda, Contrats et Maison | Toutes les campagnes complémentaires exécutées réussies | [Rapport Contrats/Maison](dobby-integrated-contracts-house.md) |
| Aperçu local | 349 empreintes, quatre largeurs, 64 captures ; A → fixture → B, reload, reset, anciens stockages conservés | [Reçu](evidence/preview-local/proof.json) |

Le contrôle d’empreinte Famille de la branche Paramètres seule a échoué en CI car son amendement de présentation n’était pas encore déclaré. La composition intégrée le corrige explicitement et les 13 contrôles transversaux passent. La fin du test historique Courses attendait encore « Options de la liste » dans Paramètres ; son échec a été reproduit, puis ses seules assertions de présentation ont été adaptées aux trois cartes. Les contrôles natifs de périmètre, de copie locale et d’erreur de synchronisation sont conservés à l’identique et passent.

Les corrections de tests ont maintenu les contrôles fonctionnels : jour de Bruxelles pour le dîner, origine du serveur neutralisée uniquement dans les URLs d’images, absence de l’ancien volet des mémos locaux, consultation Contacts à travers sa nouvelle fiche détaillée.

La revue indépendante finale n’a trouvé aucun défaut produit bloquant dans la composition. Elle a vérifié les interfaces partagées, les métadonnées et les permissions ; elle ne remplace pas les résultats navigateur indiqués ci-dessus.

## Aperçu et publication

[Ouvrir l’aperçu intégré](https://portenartco.github.io/dobby-demo/essai-dobby-v7-consolidated-final-review-20261116/index.html).

L’aperçu a été publié par la [PR 24](https://github.com/PortenartCo/dobby-demo/pull/24), commit Pages `42e5e6c6a989559c18dc2751f4e202507e3cf2f1`. Ses 350 fichiers occupent exclusivement un nouveau dossier ; les 43 objets racine préexistants ont conservé leurs identifiants. Les 14 ressources applicatives de contrôle restent identiques au précédent état stable. [Preuve d’isolation](evidence/dobby-preview-publication-tree-proof.json).

L’aperçu utilise des profils et données fictifs, des namespaces propres au SHA source et une fixture canonique A/B. Les échanges A/B traversent les writers et protocoles natifs, avec HTTP simulé dans le navigateur. Aucune connexion réelle au backend familial n’est utilisée. La publication de cet aperçu précède la promotion générale ; le reçu final `PUBLICATION.json` identifie séparément le SHA réellement publié de l’application et les vérifications HTTP/navigateur après publication.

La recette hébergée est réussie : 349/349 fichiers conformes au manifeste, 320/390/768/1440 px, 64 captures et parcours identiques à la recette locale, sans erreur navigateur ni appel externe. [Reçu hébergé](evidence/preview-hosted/proof.json).

## Captures demandées

| Largeur | Paramètres | Ambiance | Données et sauvegardes |
| --- | --- | --- | --- |
| 320 px | [Capture](evidence/settings/settings-320.png) | [Capture](evidence/settings/ambience-320.png) | [Capture](evidence/settings/backup-320.png) |
| 390 px | [Capture](evidence/settings/settings-390.png) | [Capture](evidence/settings/ambience-390.png) | [Capture](evidence/settings/backup-390.png) |
| 768 px | [Capture](evidence/settings/settings-768.png) | [Capture](evidence/settings/ambience-768.png) | [Capture](evidence/settings/backup-768.png) |
| 1440 px | [Capture](evidence/settings/settings-1440.png) | [Capture](evidence/settings/ambience-1440.png) | [Capture](evidence/settings/backup-1440.png) |

Les captures des autres modules et des parcours transversaux sont dans `evidence/preview-local/`. La liste exhaustive des fichiers livrés est dans `FILES.txt`.

## Conservation des données, limites et retour arrière

Les tests valident les pièces jointes, ID, champs inconnus, listes, registres de notes, documents historiques, permissions enfant et refus d’écritures lorsque le contexte change. Les cinq anciennes bases IndexedDB et les sentinelles local/session des autres profils survivent au reset de l’aperçu. Les droits serveur n’ont pas été ouverts ; aucune migration distante ni modification de données familiales réelles n’a été effectuée.

La recette HTTP avec les deux vrais comptes familiaux et la validation physique iPhone restent différées comme demandé. Les tests de synchronisation décrits ici sont simulés ; ils ne prouvent pas une synchronisation entre deux appareils réels.

Le commit stable `42e5e6c6a989559c18dc2751f4e202507e3cf2f1` conserve l’ancienne application et le nouvel aperçu isolé. Il reste disponible pour revenir à la version précédente par un revert de la fusion applicative puis le processus Pages existant. Aucun rollback de production n’a été exécuté ni prétendu testé ; les restaurations destructives n’ont concerné que des données fictives.
