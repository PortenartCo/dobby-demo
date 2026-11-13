# DOBBY V7 — livraison du socle familial

Le socle a été **intégré dans `main`** par la [PR #12](https://github.com/PortenartCo/dobby-demo/pull/12), au SHA **`43eef7a57a56fe352f88902dfe89b208a4036495`**. **DÉPLOYÉ** : Pages a publié ce SHA le 13 novembre 2026 à 11:00:48 UTC ; 152 comparaisons GET et le contrôle navigateur anonyme ont réussi. URL officielle : **[https://portenartco.github.io/dobby-demo/](https://portenartco.github.io/dobby-demo/)**.

L'utilisateur a déjà installé le lot serveur `10`, les cinq policies Storage `11`, puis transmis le contrôle de catalogue `20` réussi. La [synthèse hébergée](evidence/hosted-installation-summary.json) compare 36 fonctions : six empreintes exactes et trente correspondances aux corps testés soumis avec fins de ligne CRLF, sans écart inexpliqué. Ce résultat confirme le catalogue installé ; il ne prouve pas les nouveaux parcours RPC/RLS/Auth ou navigateur. Aucun SQL distant n'a été exécuté par l'agent.

Les preuves de publication sont conservées séparément : [synthèse et CI](evidence/published-release.json), [comparaisons GET](evidence/published-bytes.json), [accès public au navigateur](evidence/published-root.json). Elles ne contiennent aucun catalogue brut ou donnée familiale.

## Intégration, CI et publication

Le head testé est `cf4fae2afe099978cf8dcf7c7d5896b8e4fc4644`. L'arbre entier de la fusion `43eef7a` lui est identique ; aucune différence applicative n'est introduite par le commit de fusion.

| Preuve | Résultat / référence |
|---|---|
| CI fonctionnelle de la PR | [43411581079](https://github.com/PortenartCo/dobby-demo/actions/runs/43411581079) — SUCCESS |
| CI Sync de la PR | [43411581149](https://github.com/PortenartCo/dobby-demo/actions/runs/43411581149) — SUCCESS |
| CI fonctionnelle du push du head | [43411573722](https://github.com/PortenartCo/dobby-demo/actions/runs/43411573722) — SUCCESS |
| CI Sync du push du head | [43411573564](https://github.com/PortenartCo/dobby-demo/actions/runs/43411573564) — SUCCESS |
| Pages sur `43eef7a` | [43413328142](https://github.com/PortenartCo/dobby-demo/actions/runs/43413328142) — SUCCESS ; Pages `built` sur le SHA exact ; 152 comparaisons GET et contrôle navigateur anonyme réussis |

Les [comparaisons des octets servis](evidence/published-bytes.json) réussissent sur **152 requêtes GET** : **127 fichiers distincts**, **24 variantes avec query** et la racine. Chaque réponse est comparée au SHA immuable `43eef7a`, sans redirection suivie, JavaScript exécuté ou contact Supabase. Le [contrôle navigateur anonyme](evidence/published-root.json) réussit : **120 ressources chargées**, écran `access-welcome` visible, gate V3 **false**, routes terminées, **zéro erreur de page ou de ressource applicative**, **zéro requête Supabase ou non-GET exécutée**. Il ne certifie aucun login Auth, droit RPC/RLS ou nouveau parcours connecté.

Les anciens rapports de publication et leurs empreintes restent conservés. Les validations historiques ne sont pas réécrites pour représenter le nouveau code. Les tests de provenance reconnaissent les amendements du socle en conservant leurs ancrages historiques. Aucun nouveau test applicatif n'est requis par le présent rapport documentaire.

## État des dix réserves

Les six labels décrivent des preuves différentes : code présent, tests réussis, fusion dans `main`, fichiers effectivement servis, recette utilisateur réelle et condition restant à lever. Une publication avec un gate fermé signifie que le code est servi, sans déclarer la fonction activée. La [matrice détaillée](MATRICE-RESERVES.md) porte les contrats et les preuves par capacité.

| ID | CODE_DÉVELOPPÉ | TESTS_PASS | INTÉGRÉ | DÉPLOYÉ | RECETTE_RÉELLE_VALIDÉE | BLOQUÉ |
|---|---|---|---|---|---|---|
| **S03** | Accès et création conservés ; gardes acteur/foyer renforcées. | Unités et navigateur en CI ; [client familial](evidence/client-family-local.json). | Oui, `43eef7a`. | Oui, `43eef7a`. | Oui pour le nominal A/B et la reconnexion B antérieurs. | Nouvel e-mail, confirmation, récupération et refus réels non exercés. |
| **S04** | Invitation adulte et reprise conservées ; parcours enfant séparé. | Rejeux/refus/concurrence locaux ; CI. | Oui, `43eef7a`. | Oui, `43eef7a`. | Oui pour invitation nominale et reprise d'accès antérieures. | Expiration, révocation, concurrence et inter-foyers réels restants. |
| **S10** | Identité canonique TEXT et propagation des droits RPC/REST. | [14 contrôles Famille](supabase/family/evidence/local-family.json) et CI. | Oui, `43eef7a`. | Oui, `43eef7a`. | Oui pour les deux identités initiales ; nouveaux droits non recettés. | Recette serveur `30`, adoption Auth et droits réels. |
| **D02** | Cycle micro existant et protocole matériel préparé. | API vocale simulée ; aucun test iPhone physique. | Oui, `43eef7a`. | Oui, `43eef7a`, composant conservé. | Non sur microphone physique/Safari. | [Recette matérielle](RECETTE-AUTH-MICRO.md#d02--iphone-physique-et-safari). |
| **M06** | Attribution multiple d'une mission et intentions V3, derrière gate fermé. | SQL et [client Missions](evidence/client-missions-local.json), CI. | Oui, `43eef7a`. | Oui, `43eef7a` ; gate fermé. | Non pour attribution multiple partagée réelle. | `30`, recette RPC/REST et navigateur avant activation. |
| **M07** | Total serveur unique et allocations déterministes. | 25→13+12, solo, zéro, Unicode et historique, local/CI. | Oui, `43eef7a`. | Oui, `43eef7a` ; gate fermé. | Non pour crédit V3 réel. | Vérifier total et bénéficiaires réels avant activation. |
| **M08** | CAS, reçus/rejeu, compensation et récurrence atomiques. | [18 groupes Missions](supabase/missions/evidence/local-tests.json), transport et CI. | Oui, `43eef7a`. | Oui, `43eef7a` ; gate fermé. | Non pour transactions/refus hébergés. | `30`, concurrence multi-session et reprise réelle. |
| **C07** | Colonne installée et catalogue conforme ; client natif conservé. | [SQL local](supabase/shopping/evidence/local-c07.json), précision/CAS/ancien PATCH. | Oui, `43eef7a`. | Oui, `43eef7a`, client conservé. | Oui pour Courses ordinaires ; non pour disponibilité à domicile. | Disponibilité A/B, refus Enfant/inter-foyers et reprise réelle. |
| **F08** | Invitation ciblée au même profil et acceptation atomique ; bouton fermé. | Famille, conservation des données et navigateur fictif/CI. | Oui, `43eef7a`. | Oui, `43eef7a` ; gate fermé. | Non pour rattachement enfant réel. | Troisième Auth de test confirmé non lié, `30`, puis parcours réel. |
| **F09** | Parent gère son foyer ; Enfant lit, propre magie et mission éligible seulement. | Famille, Missions et [6 contrôles Storage/rollback](supabase/family/evidence/local-storage-and-rollback.json). | Oui, `43eef7a`. | Oui, `43eef7a` ; gates fermés. | Non pour contrat complet réel. | RPC/RLS/Storage réels, dont fichiers physiques ; activation après preuve. |

## Ce qui reste à faire

La recette nominale des deux Parents, les deux profils distincts, les cérémonies, les Courses bidirectionnelles et **déconnexion B → reconnexion → Cheminette → Maison/Patronus conservés** sont acquis. Aucune répétition n'est demandée sans régression causale.

La [recette serveur `30`](supabase/30-runtime-rollback.sql), avec annulation interne observée puis `ROLLBACK` final, est prête et [testée localement](supabase/evidence/runtime-rollback-local.json). Le premier essai utilisateur s’est arrêté avant les fixtures sur `RT-PREFLIGHT-THIRD-AUTH` ; le compte de recette n’avait pas encore été créé. Elle attend sa création et le résultat du nouvel essai, avec un troisième compte Auth confirmé et non lié ; les deux comptes et le foyer existants sont conservés. Elle ne remplace ni un login Auth HTTP, ni un fichier Storage physique, ni une concurrence entre sessions, ni la [recette iPhone/Safari](RECETTE-AUTH-MICRO.md).

**Ne rejouer ni `00`, ni `10`, ni `11`, ni `20`, ni Stitch 01/04/06/11.** Aucun reset, nouveau foyer de substitution, conversion de ledger ou effacement du stockage local. Les flags privés et les constantes `MISSION_V3_RELEASE_VERIFIED` / `FAMILY_FEATURE_RELEASE` restent **false**. Les nouveaux parcours V3/F08/F09 ne sont pas annoncés opérationnels et aucun SQL d'activation aveugle n'est livré.

Le paquet `90` est un retour conservateur en cas de besoin, conservant données et hardening ; il ne termine pas l'installation. Aucun catalogue brut, identité personnelle, mot de passe ou jeton n'est publié dans ces preuves.
