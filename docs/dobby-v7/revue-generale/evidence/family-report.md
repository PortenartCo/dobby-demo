# DOBBY V7 Famille — rapport F01–F10

Worktree `/workspace/dobby-v7-review`, départ `b327aa5`. Baseline persistée **avant modification** : `/workspace/dobby-family-baseline.md`, copie versionnée `docs/dobby-v7/revue-generale/famille/BASELINE.md`. Commit principal **b6031a1** (`feat(family): consolidate panels and child guardian profiles`). Aucun accès Supabase distant, aucune publication, aucun push/merge/déploiement dans ce lot.

| ID | Baseline | Statut final local | Fichiers / preuve / test | Réserve ou étape humaine |
|---|---|---|---|---|
| F01 | À_CORRIGER : plusieurs sections séparées | FAIT_TESTÉ_NON_DÉPLOYÉ | family.js + family.css : exactement deux details exclusifs nommés Membres du foyer / Événements & Préparatifs, résumé fermé. v7-family-review.cjs : exclusivité, illustration/titre préservés, six largeurs 320/390/768/1024/1440/1920, vrai wheel et absence débordement. | Captures locales fictives uniquement. |
| F02 | À_CORRIGER : bouton Contacts dans Salon | FAIT_TESTÉ_NON_DÉPLOYÉ | Aucune action Contacts dans Salon ; test navigateur parcourt Menu → Contacts via le composant Menu intégré par root. | Pas de recette publiée ici. |
| F03 | À_CORRIGER : préparatifs séparés | FAIT_TESTÉ_NON_DÉPLOYÉ | Calendrier natif intégré au deuxième panneau, modèles PREP-01 et listes eventId existants. prep-ui.cjs CRUD/copie indépendante/progression/rechargement/import Courses/retrait événement ; 33 tests unitaires PREP writer + sync préservent CAS/métadonnées/protocoles. | Aucun nouveau stockage ni identifiant parallèle. A/B réel non testé. |
| F04 | À_CORRIGER : mémos affichés au Salon | FAIT_TESTÉ_NON_DÉPLOYÉ | Contenu Salon retiré. family-register.js titre Notes du foyer et retour Menu, route memos existante. Test Menu → Notes ; fam-agenda-memos.cjs et 5 tests e09-memo-writer : CRUD, versions périmées, import idempotent, original local intact, rollback. | Données réelles et sync distante non inspectées. |
| F05 | À_CORRIGER : ajout combiné | FAIT_TESTÉ_NON_DÉPLOYÉ | Deux boutons et parcours distincts enfant/animal. Formulaires à catégorie fixe, brouillons séparés par catégorie, liens de reprise portent catégorie. fam-members + v7-family-review. | Nouveau profil familial, aucun compte Auth créé. |
| F06 | PARTIEL : natifs E06 existants | FAIT_TESTÉ_NON_DÉPLOYÉ | Identité/surnom/naissance/infos/avatar emoji ou portraits natifs, puis invitation depuis la fiche à Maison → Patronus. v7-family-review : choix manuel 4 Maisons/12 Patronus confirmés via DobbyCeremonies, même member_id et nombre de membres inchangé. Native member browser tests + E06 scoring/cérémonies/drafts : vrais questionnaires 6/5 et provenance confirmée. | Les créations réelles demeurent soumises aux droits serveurs déjà gated ; tests locaux ne prouvent pas l’installation RPC. |
| F07 | À_CORRIGER : mélange et magie/Runes visibles animal | FAIT_TESTÉ_NON_DÉPLOYÉ (interface/politique locale) | Formulaire nom/espèce/race facultative/naissance/avatar/notes ; breed traverse le writer natif et conserve extensions. Ni magie ni activité Runes ni lien grimoire de l’animal, même profil historique avec magie conservée. Politique native refuse canMagic pour animal, y compris accompagné par parent ; 4 tests V7 policy rouge→vert. | Protection des bénéficiaires de Runes par le lot Missions. Les anciennes données ne sont pas effacées. Contrôle backend non certifié. |
| F08 | BLOQUÉ_BACKEND : aucun parcours activable de rattachement tardif | ATTENTE_UTILISATEUR | Depuis fiche enfant, Donner accès à DOBBY désactivé avec motif serveur, gate child-account-link. Contrat serveur décrit invitation liée au member_id existant/acceptation atomique sans doublon ni promotion, préservation intégrale. Candidate historique bind_existing_member repérée mais insuffisante pour parcours complet. VERIFIER-PROFIL-EXISTANT.sql préparé en lecture seule et jamais exécuté. | Implémenter/revoir/installer manuellement l’API d’invitation ciblée et tester Auth+RLS+RPC+acceptation concurrente à deux comptes. Ne pas utiliser invitation générique créant un autre profil. |
| F09 | BLOQUÉ_BACKEND : contrôle serveur non vérifiable | ATTENTE_UTILISATEUR (frontend testé) | Politique native : enfant propre magie seulement, ni identité ni création même grants clientes trop larges ; animal sans magie ; parent démo tout registre courant sans membre extérieur. sharedReadOnly() reconnaît enfant explicite démo ou liaison canonique vérifiée concordante. Contrôles événements/notes/contacts/PREP désactivés, handlers et façades partagées refusent ; propre magie préservée. Nouveau test navigateur enfant agenda disabled + E.saveEvent refusé. | Parent réel reste borné par grants/ancienne API, autre parent pas déclaré opérationnel. Root gère gate transport, SQL candidats et contrôles multi modules. Il faut installation manuelle et recette serveur réelle parent/enfant/foyer étranger ; cette interface ne prouve aucune RLS. |
| F10 | Existant à préserver | FAIT_TESTÉ_NON_DÉPLOYÉ (local) | Recherche prénom/nom/surnom/catégorie, effacement, avatars existants, anniversaires (dates valides/legacy), membre disparu/stale draft et invitation réelle uniquement sous liaison+canInvite existante conservés. fam-members 320/390/1440 ; fam-detail native returns/read-only child ; aucune donnée fictive de production ajoutée. | Invitations réelles, identité et A/B distant non testés. |

## Tests exécutés

- **TDD** : `v7-family-policy.test.mjs` 4 échecs attendus avant changements, puis 4 passes ; `v7-family-review.cjs` échec initial 0 accordéon/2, puis passage ; ajout F09 enfant agenda échouait avant garde, puis passe.
- `node --test essai-stitch-v5-famille/tests/family-member-policy.test.mjs essai-stitch-v5-famille/tests/v7-family-policy.test.mjs` : **15/15 passes**.
- `DOBBY_TEST_ORIGIN=http://127.0.0.1:8863 node --test essai-stitch-v5-famille/tests/family-member-policy.test.cjs` : **2/2 passes** (vrais handlers natifs, identités fictives, toutes requêtes externes bloquées).
- `node essai-stitch-v7/tests/v7-family-review.cjs` : **passe**, création enfant/animal, choix magiques natifs, Menu Contacts/Notes, lecture seule enfant, 6 largeurs.
- `fam-members.cjs`, `fam-detail.cjs`, `fam-agenda-memos.cjs` : **passes à 320/390/1440**, attentes anciennes mises à jour pour dock à six entrées et dernière architecture utilisateur.
- `fam-agenda-month.cjs` : **passe**, mois/années/bissextile/clamp fin de mois.
- `prep-ui.cjs` : **passe à 320/390/1440**, entrée actualisée sous accordéon Événements & Préparatifs.
- `family-review-effects.cjs` : **passe à 320/390/1440** sur 13 vues, ON/OFF persistance/son/animations, préférence reduce-motion.
- E06 scoring + cérémonies + drafts, PREP writer/sync et memo writer : **50/50 passes** en campagne ciblée.
- `git diff --check` sur fichiers possédés : passe.

Les tests historiques de gel de hash Famille/transverse rencontrent les modifications intentionnelles d’autres lots et du nouveau wrapper de garde memo ; root coordonne leur révision ciblée. Ils ne constituent pas une régression fonctionnelle constatée. La campagne transverse complète et le déploiement sont du ressort du parent de mission.

## Preuves

Captures et JSON locaux dans `/workspace/dobby-family-evidence/` : `v7/family-{320,390,768,1024,1440,1920}.png`, `members/`, `detail/`, `agenda-memos/`, `prep/`, `effects/`. Tous personnages fictifs, requêtes externes interrompues avant envoi. Aucune capture n’est une preuve serveur ou publiée. La roulette Chromium est testée ; aucun véritable appareil iPhone, clavier iOS/toucher matériel ou compte Supabase réel n’a été testé.

## Actions manuelles uniques

1. **F08** : suivre `docs/dobby-v7/revue-generale/famille/CONTRAT-SERVEUR.md`, revue du catalogue réel puis invitation liée au profil existant et recette Auth/acceptation sans nouveau membre. Le bouton reste désactivé.
2. **F09** : installer et vérifier manuellement le contrat complet des permissions au niveau serveur selon le lot central root ; tester parent A / enfant A / foyer B en requêtes directes et concurrence ; n’activer aucune fonction dépendante avant réussite. Aucun SQL de ce lot n’a été exécuté.

Complément final : commit **8cca15d** actualise la fixture A/B au contrat V7 parent tout foyer (et refuse un membre extérieur) ; `fam-integration-build.test.cjs` **3/3 passes**. Les captures V7 sont prises après retour en haut, après assertion de scroll réel.
