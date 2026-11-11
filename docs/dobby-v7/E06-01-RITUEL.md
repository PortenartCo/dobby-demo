# E06-01 — Rituel de la Cheminée

Mission limitée depuis `a61a140e94b81893ad5b3cc4624ff4d6796c3ff7`, branche `feat/dobby-e01-e08-review-integration`. [Demande](E06-01-SPEC.md).

État source : **corrigé**, tests ciblés et parcours E06 existant PASS à 320, 390 et 1440 px. L’aperçu isolé est publié et vérifié ; la recette hébergée est PASS. La validation visuelle utilisateur reste ouverte.

## Source et illustration

Les fichiers fournis sont conservés sans modification dans [la source additionnelle](../../design/e06/references/stitch/dobby_le_rituel_de_la_chemin_e/), avec le ZIP reçu et [son inventaire](../../design/e06/references/stitch/dobby_le_rituel_de_la_chemin_e/received-provenance.json). Le manifeste fourni cite le hash d’une archive historique différente ; les trois empreintes de fichiers annoncées correspondent. Le ZIP réellement reçu a l’empreinte `b12892685c1db0872d169022d098721af98007e3d54ab4993d4fd91d99d01e15`.

Le HTML, sa composition cheminée/scène/cartouche/panneau et les algorithmes Canvas/WebAudio sont effectivement dérivés. Les handlers du faux modal d’arrivée sont remplacés par une vraie navigation. La fausse barre iOS et la promesse non établie de chiffrement sont remplacées par des contrôles réels Effets/Son et une indication locale factuelle. Les fontes Cinzel et Plus Jakarta Sans sont auto-hébergées sous leurs licences OFL, avec styles limités au Rituel.

L’image centrale externe renvoie HTTP 200 **text/html**, sans média exploitable ; la capture fournie montre déjà l’image cassée. [Audit](evidence/e06-01/asset-audit.md). L’illustration utilisée est une **adaptation originale générée**, portrait 1024 × 1536, à partir de la ressource locale E02 déjà autorisée. Dobby entier et la grande cheminée restent visibles. [Illustration](../../essai-stitch-v7/assets/onboarding/ritual-hearth-original.png), [provenance et empreinte](../../essai-stitch-v7/assets/onboarding/ritual-hearth-original.provenance.json). Elle n’est ni une capture complète ni l’image Stitch d’origine prétendument retrouvée.

## Parcours et préférence

Première entrée E06 par « Démo · Commencer » ou « Première connexion et cérémonie magique » → Rituel → traversée de 2 500 ms → Mon foyer magique → parcours natif existant. L’ouverture habituelle de l’application sur Traverse et les retours explicites au Foyer restent directs : l’introduction n’est pas imposée à chaque ouverture.

- « Passer l’introduction » navigue immédiatement, sans séquence imposée.
- « Ne plus afficher » persiste via `DobbyFamilyUI.meta/updateMeta`, clé locale `dobby.e06.ritual.v1`, dans le stockage natif existant ; aucun champ métier/synchronisé ni second stockage.
- Une introduction déjà vue/masquée et un membre explicitement configuré passent directement au Foyer. Une simple existence de membres ne masque pas le premier parcours fictif.
- Le Foyer et « Compte et paramètres » du profil permettent de réactiver la préférence et de revoir explicitement l’introduction. Aucun membre, résultat ni réponse n’est réinitialisé.
- Effets OFF ou réduction des animations : navigation immédiate. Son OFF : aucun audio ni vibration ; Son ON : WebAudio seulement après geste explicite et selon disponibilité du navigateur. Aucun autoplay au premier toucher.
- RAF, écouteurs, audio et délais sont nettoyés lors d’une sortie ou interruption. Aucun callback tardif ne ramène au Foyer après un retour arrière.

## Vérifications

[RED initial](evidence/e06-01/red.log) : composition absente. [RED de chevauchement](evidence/e06-01/dock-red.log) : la règle tardive du dock permanent dominait la règle de la scène ; spécificité corrigée uniquement pour le Rituel. Les tests vérifient affichage, hit-test et géométrie des deux actions secondaires.

[320 px](evidence/e06-01/source-320.log), [390/1440 px](evidence/e06-01/source-390-1440.log) : PASS, navigation réelle, préférence native/rechargement/réactivation/relecture, membre configuré, conservation des réponses, effets/réduction, Son OFF/ON et callbacks nettoyés. L’attente des retours SPA attend l’URL puis le DOM, sans masquer une ancienne vue. Les requêtes externes du bootstrap familial historique sont bloquées en source ; le bundle/hébergé exige zéro requête externe. [Trace initiale qualifiée](evidence/e06-01/source-legacy-network-first.log).

`e06-consolidation.cjs` avec `DOBBY_E06_JOURNEY_ONLY=1` : **PASS 320/390/1440**, création native fictive, reprise, rechargement, confirmations, identité finale et conservation du ledger. [Journal](evidence/e06-01/regression.log), [captures](evidence/e06-01/regression/). Aucun nouveau moteur, barème, writer natif ni questionnaire redessiné. La revue indépendante a reproduit deux erreurs : contexte audio restant actif après un rejet de métadonnées, puis navigation tardive après interruption d’une écriture de fin. Le contrôleur ferme ses ressources, invalide les tentatives périmées et permet le réessai ; `e06-ritual-errors.cjs` est PASS avec de vraies API WebAudio, injection limitée aux métadonnées locales et aucune modification des données métier. [RED/GREEN et états observés](evidence/e06-01/errors/).

La CI utilise le périmètre Rituel, ces erreurs et ce parcours ; la campagne historique reste accessible avec `DOBBY_FINAL=1` sans être relancée pour cette mission.

| Largeur | Rituel | Traversée | Foyer |
|---|---|---|---|
| 320 | [capture](evidence/e06-01/after/ritual-320.png) | [capture](evidence/e06-01/after/traversal-320.png) | [capture](evidence/e06-01/after/foyer-arrival-320.png) |
| 390 | [capture](evidence/e06-01/after/ritual-390.png) | [capture](evidence/e06-01/after/traversal-390.png) | [capture](evidence/e06-01/after/foyer-arrival-390.png) |
| 1440 | [capture](evidence/e06-01/after/ritual-1440.png) | [capture](evidence/e06-01/after/traversal-1440.png) | [capture](evidence/e06-01/after/foyer-arrival-1440.png) |

Les captures attendent le décodage réel des images et des fontes. Aucun compte réel, Supabase, SQL, autre aperçu ou application officielle modifié. Arrêt après recette de l’aperçu et livraison pour revue visuelle.

## Livraison et version réellement servie

- Code applicatif : `b1bfd43871be81fea67eb70b9ea3960c3ce13337`, [CI ciblée verte](https://github.com/PortenartCo/dobby-demo/actions/runs/42986826380). Les ajouts suivants concernent uniquement tests et preuves.
- Publication statique : `e24682d34f01c26c40da2399754749ced35f0bad`, parent `7b8ba5dec2c56852234133b544a56bde66cd96ff`. [Reçu de publication](evidence/e06-01/publication.json) : 26 fichiers du seul dossier autorisé modifiés, 18 autres entrées racine identiques.
- [Aperçu](https://portenartco.github.io/dobby-demo/essai-dobby-integrated-review/) · [Entrée directe du Rituel](https://portenartco.github.io/dobby-demo/essai-dobby-integrated-review/essai-stitch-v7/famille.html#onboarding-ritual). Le bandeau « Démo · Commencer » ouvre la même première entrée E06 ; une introduction déjà vue est passée, sauf relecture explicite depuis les paramètres.
- **274 fichiers HTTP identiques au bundle testé**, dont 269 fichiers applicatifs : [empreintes servies](evidence/e06-01/hosted-hashes.json), [manifeste source](evidence/e06-01/bundle-manifest.json). Les cinq endpoints protégés et huit branches sources sont inchangés.
- [Recette réelle hébergée](evidence/e06-01/hosted/execution.json) : Rituel 320/390/1440, erreurs 320, parcours E06 existant 320/390/1440, puis chemin continu Rituel → traversée → Foyer → identité → Maison → Patronus → identité finale à 390. [Captures du Rituel](evidence/e06-01/hosted/ritual/), [parcours complet](evidence/e06-01/hosted/journey/), [chaîne continue](evidence/e06-01/hosted/continuous/).
- La première extension du harnais continu contrôlait le Foyer dès le changement d’URL, alors que `ready` désigne le bootstrap déjà terminé. L’attente de l’action Foyer réellement visible précède désormais les assertions conservées ; reprise ciblée 390 PASS, [trace initiale](evidence/e06-01/hosted/continuous-initial-spa-wait.log). Aucun changement applicatif pour ce cas.

Le lancement CI final reprend le chemin continu depuis le Rituel aux trois largeurs, sans campagne historique des autres modules. Sa conclusion au SHA final est jointe à la remise pour conserver cet artefact immuable. Recette Chromium responsive ; Safari/iPhone physique non essayé. Le son est vérifié aux frontières réelles WebAudio, avec dégradation silencieuse lorsque le navigateur ne l’autorise pas.

[Fichiers de cette mission](evidence/e06-01/changed-files.txt). Aucun autre arbitrage du registre n’a changé : seule E06-01 passe à corrigé. Aucun compte réel, SQL, Supabase ou application officielle modifié ; aucun code applicatif fusionné dans main. **Arrêt pour revue visuelle utilisateur.**
