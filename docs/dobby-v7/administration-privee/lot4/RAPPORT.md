# Lot 4 — console Administration DOBBY

Base obligatoire PR #31 : `3c850d5e2235aedbafbbdc0d1e4fb9e9f358956c`. Dépendances #30/#29/#28 ; issue #19 et conception/plan au commit documentaire `440cc2394c2dd5e9865a9b71fcd17b43e351f034`, lus sans fusion de leur branche.

Développement et recette sur des comptes fictifs locaux uniquement. Ce dossier ne constitue pas une autorisation de déploiement.

## Comportement livré

La véritable page V7 conserve son header, ses six destinations du dock, ses polices et son ambiance magique. Une entrée distincte du Menu apparaît après une vérification propriétaire par l'Edge du Lot 3. Les URL directes suivent le même contrôle serveur.

Les cinq vues permettent de consulter les comptes et leurs admissions, inviter un nouveau foyer, traiter les demandes Parent/Enfant, suspendre/réactiver et lire le journal des décisions. Comptes, demandes et historique sont paginés. Les projections contiennent les seules métadonnées prévues au contrat ; aucun accès aux contenus privés des autres familles n'est ajouté.

Chaque mutation demande une confirmation de sa cible et de ses conséquences, transmet sa révision CAS et un identifiant d'opération, et n'est jamais renvoyée automatiquement après une réponse perdue. Décision enregistrée, livraison confirmée/incertaine, admission consommée et statut réellement confirmé restent distincts. Une cible disparue d'une page ne peut pas être remplacée silencieusement par un autre compte.

Depuis Famille, le Parent transmet une demande nominative au RPC du Lot 3. Aucun lien libre ni compte Auth n'est créé par cette demande. Une nouvelle intention après une réponse confirmée reçoit un nouvel identifiant ; une reprise explicite d'une réponse incertaine garde le sien. Les profils sans compte Auth restent possibles. L'adulte complète son profil et choisit son portrait avant l'acceptation atomique. Le profil enfant existant est conservé ; la livraison/liaison enfant demeure bloquée par les gates de production.

L'inscription publique libre disparaît de l'interface de production. Connexion, récupération, callbacks et admission explicite sont conservés ; les réglages Auth hébergés ne sont pas modifiés.

## Autorisations, sessions et données locales

Le transport natif est borné aux sept commandes publiques existantes du Lot 3, sans jeton exporté à la console ni clé serveur navigateur. Chaque appel Edge vérifie Auth et le propriétaire côté serveur ; un rôle familial ou une identité locale ne suffit pas. La console suit l’utilisateur Auth et la génération de session, indépendamment de l’adoption initiale ou de la revalidation de son foyer. Les gardes métier, Storage et admission restent liées au foyer. Un changement de compte ou de génération retire la preuve propriétaire ; une revalidation familiale de la même session ne masque plus la console. Un refus d'administration d'un Parent ordinaire ne retire pas ses droits familiaux valides.

Une suspension/refus de session ferme l'autorisation volatile et invalide les réponses en vol. Les données et intentions locales durables ne sont pas supprimées. Les envois sont retenus après révocation, y compris après une réactivation et une nouvelle connexion ; seule la reprise explicite sous session active vérifiée peut vider la file. Les signaux entre onglets ne transportent aucun bearer et ne permettent pas d'adopter automatiquement un autre compte.

## Preuves

Le code applicatif est sauvegardé au commit `2b2d849d8982b66a123d00655d828c3a2a5f9342`. Les empreintes et commandes de recette sont consignées dans `RESULTATS.json`. Les essais avec réponses de composants fictives sont distingués de ceux utilisant réellement GoTrue, PostgreSQL, PostgREST, Mailpit et le handler Edge locaux.

| Vérification | Résultat observé | Portée |
| --- | --- | --- |
| Vraie V7, GoTrue/PostgREST/Mailpit et handler Edge | **14 groupes PASS**, **16 captures**, 4 largeurs | [Résultats HTTP/navigateur](../../evidence/lot-4/browser/results.json) et [entrées directes](../../evidence/lot-4/browser/direct-entry-run.log) ; 23 empreintes identiques avant/après, aucune interception Playwright, zéro requête hébergée |
| États responsive complets | **5 états × 4 largeurs PASS**, **24 captures** | [Matrice](../../evidence/lot-4/responsive-states/INDEX.md) : vide, 27 demandes/pagination, confirmation, réseau et changement Auth réel ; 17 empreintes inchangées |
| Clients et transports natifs | **216/216 PASS**, aucun ignoré | [Journal](preuves/native-client.log), contrôleurs, VM du véritable driver et callbacks causaux |
| Console | **23/23 PASS**, avec **5 cas ciblés** de session/démarrage | [Composants](preuves/admin-ui.log) et [régression du démarrage direct](preuves/admin-ui-focus.log), Chromium avec réponses explicites de composants fictives |
| Contrats d’intégration affectés | **10/10 PASS** | [Journal](preuves/integration-causal.log), garde de foyer et séparation native des données |
| Parcours d’accès V7 | **4 largeurs PASS** ; **32 scénarios de courses PASS**, puis **2 ciblés** après correction d’une nouvelle intention | [Présentation](preuves/access-ui.log), [courses](preuves/access-races.log) et [observation des deux cas ciblés](preuves/member-request-observation.json), demandes/connexion/récupération sous fixtures UI |
| Profils et membres | **320/390/1440 PASS** | [Journal](preuves/members.log), profils locaux, catégories, portraits, permissions, anniversaires |
| Entrée publique et récupération | **2 cas ciblés PASS** | [Journal](preuves/root-entry.log), absence d’inscription libre et récupération conservée |
| Documents partagés | **320/390 PASS** | [Journal](preuves/documents-sync.log), HTTP fictif, refus puis nouvelle connexion et reprise explicite |
| Header, dock et préférences | **390/1440 PASS** | [E01 existant](preuves/e01.log), six destinations, navigation et mouvement réduit |
| Provenance des sources protégées | **15/15 PASS**, aucun ignoré | [Journal](preuves/provenance.log), inversions exactes et refus des octets/parents non revus ; anciens manifests gelés conservés |
| Reproductibilité des sources | **73 artefacts identiques** | [Journal](preuves/source-derivation.log), génération dans une copie temporaire ; aucune différence |

Les workflows du commit de validation `b84718f41fbdf64e9c7857629047a79b794fd9f8`, dont les sources applicatives sont identiques à `2b2d849d8982b66a123d00655d828c3a2a5f9342`, sont reliés dans [le relevé CI](preuves/ci-source.json) : [Sync](https://github.com/PortenartCo/dobby-demo/actions/runs/44395206183) et [V7](https://github.com/PortenartCo/dobby-demo/actions/runs/44395206145). Tous ces workflows sont terminés avec succès, dont PREP-01 sur la PR. Les vérifications V7 comprennent aussi les archives et réserves locales existantes.

La provenance ajoute seulement une couche de test réversible : quatre amendements Lot 4 et la dépendance Core déjà présente dans la base PR #31 sont ramenés à leurs empreintes historiques exactes. Les huit manifests antérieurs et le code Core de la base ne sont pas modifiés.

Aucun résultat des lots précédents n'est présenté comme un nouveau résultat Lot 4. Les campagnes complètes PostgreSQL/Auth/Storage n'ont pas été rejouées ; aucun SQL serveur de ces lots n'est modifié.

## Scénarios fonctionnels réellement observés

| Référence | Observation locale dans la vraie V7 | Limite |
| --- | --- | --- |
| T03 | Demande familiale, approbation via confirmation, message Mailpit réel, callback dans un autre navigateur, profil/portrait adulte puis admission atomique dans H2 | Aucun destinataire réel ni certification de la configuration Auth hébergée |
| T05 | Suspension et réactivation par la console ; ancienne session refusée ; nouvelle connexion réelle nécessaire | La campagne HTTP Storage du Lot 2B n’est pas rejouée ; les anciens liens signés restent une réserve |
| T10 | Connexion des deux comptes fictifs existants avec leurs UUID conservés | Ne constitue pas une inspection des comptes de production A/B |
| T11 | Deux vrais onglets partageant le stockage ; événements naturels ; deux réponses tardives refusées ; données A inchangées ; file B retenue après reconnexion, puis une seule ligne envoyée par reprise explicite | Les copies déjà présentes localement ne sont pas prétendues effacées |
| T12 | Edge anonyme 401, Parent non propriétaire 403 sans perte de ses droits familiaux, faux propriétaire local inopérant, projection sans données privées d’autres foyers | Aucun accès serveur supplémentaire accordé au propriétaire global |

L’essai de livraison incertaine injecte une perte d’enregistrement côté transport local après une véritable tentative SMTP : l’interface n’annonce aucun envoi confirmé et ne réessaie pas automatiquement. La demande Enfant puis son refus conservent les payloads canoniques, révisions, magie et crédits ; le gate reste fermé.

## Aperçu isolé et captures

L'aperçu utilise les pages V7 complètes et les vrais services locaux avec des profils strictement fictifs. Son serveur se limite au loopback, sert uniquement les ressources autorisées et impose `connect-src 'self'`. Le remplacement de l'URL native et de la configuration publiable est réalisé dans les réponses du serveur de test ; les sources de configuration de production restent inchangées. Les secrets de service et de signature ne sont pas envoyés au navigateur.

Démarrage reproductible depuis la racine, avec Node 24, Docker et Chromium disponibles :

```sh
node tests/private-access/lot4/preview-server.mjs
```

Ouvrir `http://127.0.0.1:3214/__fixture`. Les liens permettent de choisir le propriétaire H1, un Parent H2 ou un compte non approuvé, avec stockages distincts. Les adresses des demandes/invitations doivent être fictives en `.invalid` ; les messages restent dans Mailpit local. L'aperçu ne représente pas une application de production. Il dure tant que son processus local et ses conteneurs de test restent actifs.

Les [40 captures](../../evidence/lot-4/INDEX.md) réunissent le passage principal et la matrice complémentaire. Les [16 captures du passage principal](../../evidence/lot-4/browser/INDEX.md) couvrent les largeurs 320, 390, 768 et 1440 px, les cinq vues dès une URL directe, l’entrée propriétaire, la confirmation, les listes, les erreurs et la conservation des envois après suspension. Les [contrôles de l’aperçu](../../evidence/lot-4/browser/preview-checks.json) incluent les changements de profil, les refus HTTP et l’isolation réseau.

## Limites et conditions avant déploiement

- Aucun accès Supabase hébergé, migration distante, compte réel, e-mail externe, fusion ou publication applicative n'a été effectué.
- Aucun changement des migrations des Lots 1/2A/2B/3, des gates enfants publiées ou des effets saisonniers. Aucune ouverture de Missions V3.
- Les droits effectifs de lecture sur `auth.sessions` sous RLS et les permissions Auth gérées ne sont pas certifiés pour l'hébergement. Les seuls grants SELECT ne suffisent pas nécessairement ; une installation réelle doit vérifier les gardes minimales et les permissions d'identité du Lot 3.
- Les anciens liens de téléchargement et jetons d'upload Storage signés peuvent rester utilisables après suspension. Leur extinction/invalidation et les éventuels caches doivent être traités avant ouverture ; ce lot n'annonce pas leur révocation.
- Les comptes A/B conservés sont représentés par des équivalents fictifs pour la recette locale ; aucun compte de production n'a été consulté ou modifié.
- Un déploiement ultérieur exige une validation distincte du paquet exact, de l'Edge, des origines/retours Auth, du SMTP, des gardes et de la procédure de récupération du propriétaire. La fermeture des inscriptions Auth hébergées reste une opération séparée après recette du circuit complet.
