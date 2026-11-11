# Runes V2 — pilote isolé du 11 novembre 2026

Branche : `feat/dobby-runes-v2-pilot-20261111`.
Base exacte : `0a8e1ed674bc4abdbfaca29435fa495b19b32df4` ; client auparavant testé : `3ceb14bbf76c7534f6862a7cb1921c894ea3f325`.
Worktree indépendant : `/workspace/dobby-runes-v2-pilot`.
Rapport du protocole : [SHARED-RUNES-V2.md](SHARED-RUNES-V2.md).

## Code et configuration

Le builder `scripts/build-dobby-runes-pilot.cjs` reprend les trois arborescences du builder de revue existant (281 fichiers). Le runtime fictif n'est pas utilisé : aucun seed, profil fictif, préfixe de stockage, reset, backend ou writer supplémentaire. Le formulaire natif « Connexion / configuration » reste accessible depuis les quatre pages principales. Il peut retrouver la clé publique du pilote Sync V2 déjà présente sur l'appareil, ou accepter une clé `sb_publishable_…` fournie dans ce formulaire.

Le projet personnel `pqcdkrwljgvgagzwrcmg` est déjà fixé dans `family-v2.js`. La CSP autorise uniquement ce projet et l'origine locale pour les connexions. Aucune clé, session, identité réelle ou mot de passe n'est embarqué dans le dossier publié. Les clés secrètes et JWT anciens sont refusés par le formulaire natif existant. Le connecteur Supabase a refusé les deux lectures de métadonnées (URL et clés publiques) pour ce projet : aucune configuration distante n'a donc été récupérée. Une configuration présente sur le navigateur de l'utilisateur reste nécessaire ; elle n'a pas été vérifiée ici.

Les sources applicatives restent identiques à la référence. Deux copies générées comportent des gardes tracées dans `pilot-manifest.json` :

- `family-modules.js` : refus de tout fallback Missions V1, y compris après un changement de contexte pendant un `await`. Activation, récupération et résolution ne remplacent pas les données locales lorsque les capacités V2 sont absentes. La synchronisation saute Missions sans arrêter les autres modules. La capacité n'est jamais simulée ni persistée comme autorité.
- `family-missions.js` : les nouvelles actions du pilote utilisent la file native de demandes, même hors connexion. Les runes confirmées existantes restent intactes ; aucune conversion ni réinitialisation du stockage.

Les interfaces natives utilisent les clés originales `dobby-v5-familial-preview-20261108` et `dobby-v5-household-preview-v2`. L'URL est distincte ; le stockage natif d'un navigateur sur la même origine reste volontairement partagé afin de conserver configuration et opérations. Un profil navigateur distinct est requis pour chacun des deux comptes familiaux.

E07.4 n'est ni repris ni modifié : ce pilote reste sur sa base Runes explicitement demandée. Aucun SQL, Supabase, compte réel, export logique ou autre worktree n'a été modifié.

## Vérifications locales

- 137 tests natifs/offline/conflits : PASS.
- 11 tests E06 de scoring, identité, brouillons et synchronisation : PASS.
- 23 tests du client gardé : capacités 404/401/403/malformées, frais/V1, activation individuelle/groupée, récupération, conflits, persistance de l'opération exacte, changement d'authentification pendant les lectures et l'activation, continuité des autres modules. Le chemin V2 reste le RPC natif, vérifié sur fixture (+10 / 0 / 10), sans fallback si le writer manque.
- 6 tests de packaging (sous-tests compris) : 281 hashes source/résultat, provenance, ancrages obligatoires, CSP, absence de credentials et runtime fictif, reproductibilité et refus d'écrasement.
- Navigateur : quatre pages principales, menu et connexion native aux largeurs 320, 390 et 1440, sans débordement, erreur JavaScript ou ressource locale manquante. Action réelle du handler natif, nouvelle récompense en attente et rechargement, conservation du ledger, de la file, de l'opération durable et des sentinelles d'anciens aperçus. Absence de clé et refus d’une clé secrète vérifiés sur fixture. Authentification et RPC entièrement interceptés par des fixtures HTTP : **zéro requête à Supabase réel**.
- Couverture de la matrice de revue antérieure : PASS, sans la modifier.

Les captures utilisent exclusivement des fixtures `TEST` dans un navigateur jetable. [Preuve navigateur locale](evidence/runes-v2-pilot/local/browser-verification.json).

| Largeur | Accueil | Missions | Famille | Connexion native |
|---|---|---|---|---|
| 320 | [capture](evidence/runes-v2-pilot/local/accueil-320.png) | [capture](evidence/runes-v2-pilot/local/missions-320.png) | [capture](evidence/runes-v2-pilot/local/famille-320.png) | [capture](evidence/runes-v2-pilot/local/connexion-320.png) |
| 390 | [capture](evidence/runes-v2-pilot/local/accueil-390.png) | [capture](evidence/runes-v2-pilot/local/missions-390.png) | [capture](evidence/runes-v2-pilot/local/famille-390.png) | [capture](evidence/runes-v2-pilot/local/connexion-390.png) |
| 1440 | [capture](evidence/runes-v2-pilot/local/accueil-1440.png) | [capture](evidence/runes-v2-pilot/local/missions-1440.png) | [capture](evidence/runes-v2-pilot/local/famille-1440.png) | [capture](evidence/runes-v2-pilot/local/connexion-1440.png) |

Captures Taverne également conservées dans le même dossier.

## CI, publication et limites

Publication prévue exclusivement sous `essai-dobby-runes-v2-pilot-20261111/`, par ajout d'un dossier statique sur `main`, sans fusion applicative et sans remplacement des aperçus existants. Les SHA, liens CI et preuves HTTP seront ajoutés après vérification.

Le workflow Stitch existant comporte un mode pilote ciblé : une empreinte de l'arbre applicatif doit rester identique à `3ceb14b`, sinon l'exécution est refusée. Ce mode teste le packaging et le client généré ; la campagne historique reste disponible avec `DOBBY_FINAL=1`. Les workflows Sync et PostgreSQL existants restent inchangés.

**Non validé :** disponibilité réelle des RPC, connexion avec les identités familiales, droits RLS/JWT réels, migrations, reçus serveur hébergés et synchronisation croisée entre les deux comptes. Après migration séparée, recharger chaque navigateur pour renouveler la sonde V2 ; utiliser deux profils distincts, puis réaliser la recette familiale. La présente mission ne lance aucune migration et ne déclare pas le partage réel opérationnel.
