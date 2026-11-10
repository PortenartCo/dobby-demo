# E02 — Parler à Dobby

Référence : `1329487d42439b3215f4c5aa228d1bd483ed9e94`. Parcours principal : `famille.html#chat`. Source principale : `design/stitch-53/dobby_conversation_avec_dobby_1/code.html`. Les HTML originaux et la V5 publiée restent inchangés.

## Interface E02.1

L'adaptateur conserve le hero, l'illustration, les bulles utilisateur/Dobby et la carte de confirmation du HTML Stitch 1. Le hero mesure 140 px ; le badge privé est en bas à droite. Titre conservé, accueil manuscrit, encart technique et suggestions supprimés. Aucun dialogue exemple n'est affiché. Messages à droite/gauche selon l'auteur ; aucun statut « Lu » fictif. Le fil s'ouvre sur ses derniers échanges.

La saisie reste au-dessus des cinq destinations E01, avec deux commandes de 44 × 44 px. `visualViewport` et les zones de sécurité ajustent sa position lorsque le clavier recouvre le viewport. Les tests de redimensionnement et de viewport visuel simulé ne remplacent pas un essai iPhone physique.

Le header, le profil natif et les préférences E01 restent communs. Sous-titre : « PARLER À DOBBY ». L'ambiance dorée bornée d'E01 est aussi disponible dans le chat ; le décor ancien du Salon est masqué dans cette vue pour éviter une double population. OFF et réduction des animations retirent les particules. Les autres destinations gardent leurs accès et le même état Son/Étoile. La variante `chat-2` reste une route secondaire compatible ; elle n'est pas la référence graphique d'E02.

## Interactions E02.2

`chat-engine.js` est une façade de lectures et de commandes déterministes, sans génération de faits ni LLM. Le point de réponse `reply` reste séparé de la présentation et des writers : une future IA devra conserver les mêmes contrôles d'autorisation, de confirmation et de résultat.

- Courses : « acheter du lait » ou « peux-tu ajouter du lait à la liste de courses ? ». Writer natif Cuisine `shop('addextra')` ; vérification de l'état **et du stockage natif** avant confirmation. Une erreur native de sauvegarde est capturée pendant l’appel, sans changer les fichiers V5. Les seuls champs en mémoire touchés par cette action sont alors recalés sur leurs valeurs persistées existantes, sans nouvelle écriture, pour éviter qu’un enregistrement ultérieur des préférences valide accidentellement une action échouée. Les doublons ne sont pas ajoutés. Un « ajoute » sans destination n'est pas transformé arbitrairement en course.
- Les questions sur les courses lisent la préparation ou la liste validée réellement active, avec le lien vers cette vue. Une liste déjà validée peut être rouverte par le gestionnaire natif `editshop` si sa copie exacte existe dans l'historique ; cet historique reste intact. Si cette conservation n'est pas vérifiable, l'action est bloquée avec accès aux courses. Il s'agit de la préparation des courses, pas d'une prétendue écriture dans le panier familial synchronisé.
- Repas du soir aujourd'hui/demain, missions ouvertes manuelles et automatiques, agenda partagé, équipements et documents : réponses sur les véritables registres et liens directs. Les autres dates sont renvoyées vers le planning. Les fiches médicales individuelles ne sont pas copiées dans la réponse Agenda.
- « Supprime la mission [intitulé exact] » : correspondance unique obligatoire, carte Stitch avec Valider/Annuler, vérification du compte/foyer et de l'intégralité de la fiche au moment de la validation. Le gestionnaire natif `fmsAction=delete` reste le writer. Seule sa confirmation native correspondant exactement à cette fiche est acquittée après Valider ; aucune confirmation globale n'est désactivée. Une fiche changée ou supprimée entre-temps n'est pas touchée.
- Les autres modifications, demandes ambiguës et services externes ne sont pas simulés. Dobby indique la limite. Aucun achat, diagnostic ou envoi externe.

Le ton reste concis, serviable et à la troisième personne ; les réponses concernant la santé restent sobres. Les confirmations suivent le résultat réel. Les erreurs de sauvegarde du fil sont distinguées du résultat métier pour éviter une nouvelle exécution involontaire.

## Voix E02.3

`SpeechRecognition` ou `webkitSpeechRecognition` est détectée à l'exécution. L'état « Dobby écoute… » apparaît uniquement après `onstart`. Transcription intermédiaire visible ; résultat final valide envoyé une fois. Arrêt, annulation, refus, silence, microphone indisponible, erreur réseau et échec de démarrage sont traités. Annulation, changement d'identité, navigation et masquage de page invalident les callbacks tardifs. Un callback ancien ne peut pas arrêter une nouvelle session.

Sans API, la page explique la limitation et propose la dictée du clavier iPhone ; JavaScript ne prétend pas déclencher cette dictée. Le service de reconnaissance dépend du navigateur et peut nécessiter le réseau ; aucun service payant ou API de DOBBY n'est ajouté.

Synthèse par `speechSynthesis`, voix française effectivement disponible, pitch 1,14 et débit 1,02. Pas de promesse d'imitation d'une voix de film. Une demande vocale déclenche une lecture seulement si Son est ON ; une demande écrite reste écrite. Pour une action sensible vocale, Dobby lit d’abord la demande de confirmation, puis le résultat après l’exécution réelle (ou son annulation). Réécoute et interruption sont disponibles. Son OFF interrompt la lecture, sans être réactivé par le chat. Voix absente ou lecture bloquée par Safari : état explicite et réponse écrite conservée.

## Historique E02.4 et point de contrôle obligatoire

L'examen porte sur le code et le SQL **versionnés**, sans consultation de données ni opérations de production :

- `index.html` V5 : `v2ChatHistory` sans identifiant d'auteur ; writer limité à 24 messages, vue limitée à 14.
- `family-modules.js` : seules les listes de clés des six modules sont partagées ; `v2ChatHistory` n'en fait pas partie.
- `sql-proposals/dobby-v2-modules.sql` : autorisation par appartenance au foyer, pas de registre privé de conversations par auteur. Ce modèle n'autorise donc pas une synchronisation privée du chat.

**Synchronisation individuelle multi-appareils bloquée.** Aucune table, migration, RLS ou synchronisation parallèle n'est créée ou appliquée. La page affiche cette indisponibilité.

Le correctif local minimal utilise exclusivement le magasin `meta` IndexedDB natif, via `DobbyFamilyUI.meta/putMeta`, avec un identifiant `v7-private-chat:<userId authentifié>`, une version et un propriétaire vérifiés à la lecture. Aucun nouveau magasin, base, localStorage, framework ou moteur de synchronisation. L'identité provient de `getContext()`, pas d'un membre du foyer ni d'un nom libre. Les messages, brouillons et confirmations sont séparés lors des changements de compte ; les callbacks et écritures en cours sont contrôlés. Les observateurs sont rétablis après reprise de page en cache.

Le fil connecté est conservé sans limite arbitraire à 14/24 messages, après navigation/rechargement sur cet appareil ; l'auteur peut supprimer un échange avec confirmation. Le mode sans identité reste temporaire, en mémoire de l'onglet, perdu au rechargement. Aucun ancien message sans auteur n'est migré, effacé, présenté ou attribué silencieusement. Les métadonnées malformées bloquent la lecture/écriture plutôt que d'être remplacées.

Cette isolation est celle de l'interface et de l'identité applicative sur l'appareil ; le stockage local natif n'est pas chiffré et n'assure pas une protection contre une personne ayant accès au profil navigateur ou contre un script de même origine. Aucun chiffrement ni RLS distant n'est revendiqué. Les sauvegardes natives du foyer ne sont pas étendues à ce fil.

### Modification distante proposée, non exécutée

Avant de lever le blocage, valider un périmètre de persistance **par utilisateur authentifié**, distinct du payload familial, en réutilisant le transport natif autorisé. Le contrat doit imposer un propriétaire immuable correspondant à `auth.uid()` pour lecture, création, mise à jour et suppression ; l'appartenance au même foyer ne doit donner aucun droit sur le fil d'autrui. Prévoir révision/conflits et suppression propagée, puis tests négatifs A/B même foyer et foyers distincts, compte déconnecté, changement de session pendant une opération et conservation hors ligne. Aucun export ou envoi de l'historique ancien sans attribution prouvée. La conception exacte et toute migration nécessitent une autorisation distincte ; aucun endpoint ni table supposés existants n'est utilisé ici.

## Recette et preuves

[Captures source/runtime et résultats ciblés](evidence/e02/README.md). Chromium automatisé à 320/390/1440 px. Les tests vocaux simulent uniquement les API matérielles du navigateur ; actions métier et stockage IndexedDB restent réels dans des profils éphémères. Les identités de test simulent la sortie de l'API d'identité native ; elles ne constituent pas une validation de règles serveur inexistantes.

Safari iOS, permissions réelles du microphone, reconnaissance et voix disponibles sur un iPhone, clavier physique, batterie et lecture après verrouillage restent à vérifier sur appareil réel. Recette E02 initiale : aucun compte réel utilisé, aucune fusion, aucun déploiement. La publication isolée autorisée par la mission suivante est décrite ci-dessous.

## Corrections finales et publication d'essai E02

Nouvelle mission autorisée à partir de `859171a4f749960d714155f42242c04a88466b69` : publication statique d'un répertoire E02 isolé sur la branche GitHub Pages existante, sans fusion de la PR #3.

- `safeLink()` valide les quatre fichiers internes (`index.html`, `famille.html`, `missions.html`, `traverse.html`) par rapport au répertoire actif de `location.href`. Les fragments et paramètres, y compris leurs formes seules sur la page courante, suivent la résolution URL native. Domaines externes, identifiants intégrés et autres chemins restent refusés. Aucun routeur ajouté.
- Sans destination Courses explicite, les achats formulés avec un objet indéfini « un/une… », ainsi que les intentions de billet ou d'abonnement, demandent une précision et ne déclenchent aucune écriture métier. Les formes courantes « acheter du lait » et « ajoute du chocolat à la liste de courses » sont conservées ; « ajoute un billet de train à la liste de courses » reste possible. Le garde-fou est déterministe, fondé sur cette formulation et ces deux types d'intention, sans classification IA ni catalogue artificiel de produits.
- `tests/e02-edge.cjs` exerce la politique de liens via les ancres réellement rendues, en développement et au préfixe d'essai. Il compare l'état natif et sa représentation persistée pour les demandes ambiguës. Les confirmations d'écriture native restent couvertes.

GitHub Pages est configuré en mode `legacy`, branche `main`, chemin `/`. E01 est une copie statique du dossier V7 dans `essai-e01-preview`. La publication E02 reprend cette opération sous `essai-e02-preview` ; le moteur V5 et les ressources V6 partagés existent déjà et leurs arbres Git sont identiques à ceux attendus par la PR. Le commit de publication `0708d643d099999713e1538eb5043097ac591e6b` ajoute exclusivement le nouveau répertoire ; tous les anciens arbres/fichiers de la racine sont identiques au parent `637619aeda03326435e2397d4b95eee0efb3494d`. Aucune infrastructure ou workflow de publication permanent ajouté.

Point d'entrée publié et vérifié : `https://portenartco.github.io/dobby-demo/essai-e02-preview/famille.html#chat`. `index.html` reste la Taverne pour conserver les liens natifs du parcours ; aucun nouveau mécanisme de redirection. La recette réelle est PASS : ajout TEST natif persisté, clarifications sans mutation, liens Courses/Missions/Agenda, cinq destinations et retour Dobby vérifiés. Les ressources applicatives servies correspondent au SHA validé `6c667cebc5f786e5c99c64b8d20008638891c849`. Les SHA, captures et contrôles E01/V5 sont consignés dans [la fiche de publication](../dobby-e02-publication/RECEIPT.md). Les limites d'historique individuel et de validation Safari iOS physique décrites plus haut restent inchangées.
