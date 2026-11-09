# Mission 2A — Famille, Agenda et Santé

Point de départ : `cb440793cc04079cd472a3cd1d8fcf3e14c1f84b`, PR #3 et branche existante `feat/dobby-stitch-53-source-backed-v7`. Exécution du lot demandé, sans réaudit Cuisine, sans modification de la V5 publiée, de SQL, de Supabase ni des comptes réels. Aucune fusion, aucun déploiement.

## Statuts et contrats effectifs

Les **sept HTML originaux sont utilisés dans l’interface active**. Deux sources sont déclarées `verified-functional` pour leur contrat principal ; cinq sont `verified-partial`, avec opérations natives utilisables et fonctions Stitch manquantes explicitement inactives. Ce bilan ne transforme pas les fonctionnalités médicales absentes en fonctionnalités simulées.

| Route dans `famille.html` | Source exacte | Statut et gestionnaire |
|---|---|---|
| `#members` | `dobby_membres_de_la_maisonn_e` | Fonctionnel : recherche, liste des membres existants, accès à leur fiche et à l’inscription ; identités natives `familyMembers` uniquement. Filtres par rôle inactifs. |
| `#member-edit?person=…` ou `?mode=new` | `dobby_ajouter_ou_modifier_un_membre` | Partiel : `v23MemberForm` pour création/modification du nom complet, date de naissance et icône. Pas de nom de famille séparé, rôle, photo ou notes de membre persistés. |
| `#agenda` | `dobby_agenda_almanach_du_foyer` | Fonctionnel : événements ordinaires, vues semaine/mois, date/personne, création/modification/suppression via `fpEventForm`, export ICS natif. Les échéances proviennent du collecteur existant. Apple Calendar bidirectionnel reste indisponible. |
| `#medical-edit?person=…&record=…&scope=local` ou `scope=shared` | `dobby_cr_er_ou_modifier_un_rendez_vous_m_dical` | Partiel : CRUD local `xHealthForm` et CRUD partagé volontaire `fhForm`, selon le périmètre explicite. Les deux sources de données restent distinctes. |
| `#health` | `dobby_carnet_de_sant_familial` | Partiel : carnet individuel sélectionné, références textuelles, rendez-vous présents/passés, notes, répertoire médical ; section distincte pour les rendez-vous explicitement partagés. Pas de moteur de cycles/vaccinations/antécédents cliniques. |
| `#health-person?person=…` | `dobby_carnet_de_sant_individuel` | Partiel : dossier du membre, consultation/modification/suppression des rendez-vous natifs et références, édition du membre. Groupe sanguin, constantes, vaccins, pièces jointes structurées et archivage non gérés. |
| `#health-history?person=…` | `dobby_historique_contacts_m_dicaux` | Partiel : historique réel des rendez-vous/notes ; contacts médicaux du répertoire du foyer, création/modification/suppression et appel si un numéro existe. Pas de liaison contact/patient, de messagerie ou de localisation de cabinet native. |

La liste complète des fonctions manquantes et les chemins de preuve sont dans `family-routes.json` et `route-manifest.json`. À l’issue du lot : **23 sources actives sur 53**, dont **5 partielles** ; **30 restent importées sans raccordement fonctionnel**. Le total initial de 16 inclut les quatre racines et le lot Cuisine déjà validé ; il n’a pas été réaudité.

## Données, identité et partage

`DobbyFamilyStitchEngine` est une façade vers l’unique iframe V5 déjà utilisé par V7. Les validations, confirmations, objets enregistrés, règles de suppression, writer `save()` et modules familiaux restent ceux du moteur. Aucun nouveau stockage ni nouvel objet « patient/occupant » n’est créé.

- `familyMembers` fournit les identifiants des personnes. Les sélecteurs, fiches et rendez-vous réutilisent ces identifiants. La protection native contre les doublons de noms reste active ; le renommage conserve l’ID et les liens médicaux locaux.
- `famHealth` reste individuel et local. Son formulaire conserve intitulé, date, professionnel, référence textuelle et note. Il ne gère pas l’heure ni le lieu. Aucune fiche locale n’est copiée dans `familyEvents` ou `sharedHealthVisits`.
- `sharedHealthVisits` conserve son mécanisme natif volontaire. Le formulaire indique ce périmètre ; il est accessible en écriture uniquement lorsque le module Famille est actif selon l’API native. Ses champs supplémentaires sont heure et lieu. Une fiche existante ne change pas de périmètre dans le sélecteur : aucune copie silencieuse entre les deux registres.
- `familyEvents` reste l’agenda ordinaire. Le collecteur existant peut également présenter un rendez-vous médical **déjà partagé volontairement**, sans le copier dans les événements ordinaires. Les fiches individuelles sont exclues.
- Le répertoire médical est une vue filtrée de `famContacts`, comme dans le moteur : ses contacts ne deviennent pas des personnes, ni des soignants associés automatiquement à un patient. Le répertoire complet reste accessible dans son module existant.
- Un ancien enregistrement sans rattachement unique est présenté comme fiche à réattribuer. Il n’engendre pas une nouvelle personne. L’utilisateur choisit explicitement une identité existante. Une personne encore liée à un rendez-vous partagé ne peut pas être supprimée depuis la nouvelle présentation avant réattribution/suppression de ce rendez-vous ; la protection native des fiches locales demeure active.

### Compatibilités et validations

Le formulaire V5 local contient un champ caché nommé `id`. Les écouteurs historiques fondés sur `form.id` se trouvent masqués par ce champ, et l’ancien enregistrement omet `personId`. L’adaptateur réutilise l’enregistrement natif, puis rétablit **uniquement** l’identifiant canonique et le nom du membre explicitement choisi sur la fiche concernée, via le même `save()`. Il ne réécrit pas le moteur et ne réattribue pas les autres fiches. Les tests couvrent création, modification, renommage, réattribution et anciennes fiches sans identifiant.

Les rejets natifs silencieux (nom ou intitulé composé d’espaces) ne donnent pas un faux succès de sauvegarde. Les liens vers une fiche supprimée reviennent à un registre utilisable ; un ancien lien ne recrée pas l’objet. Les nouvelles inscriptions gardent leur mode après recharge. Les formulaires visibles conservent leurs saisies lors du passage dans la gestion du compte ; les rafraîchissements de fond évitent d’écraser un formulaire en cours.

## Fidélité aux sources et écarts

`build-family.cjs` dérive les sept templates dans `templates/family/` et conserve leurs empreintes SHA-256. Les classes, cadres, cartes, formulaires et illustrations viennent des originaux ; leurs scripts de démonstration sont remplacés par les raccordements natifs. Les formulaires d’événement ordinaire et de contact utilisent les champs du formulaire natif dans un cadre Stitch : ces formulaires complets ne figurent pas parmi les sept sources fournies, et restent accessibles sans panneau V5 visible.

- 26 URL d’images figurent dans les sept sources. 24 fournissent des images valides. **Deux URL de héros** (agenda et cabinet médical, ce dernier commun aux trois carnets) redirigent vers une réponse non image. Elles sont remplacées par l’illustration originale disponible du Salon, avec provenance et source du remplacement dans `assets/family/provenance.json`. Cette substitution apparaît aussi dans les références rendues ; une comparaison exacte de ces héros attend les fichiers accessibles.
- Les portraits fictifs ne représentent pas les membres/soignants du foyer. Les cartes de personnes affichent leur icône native ; les contacts affichent leurs données réelles. Les cadres Stitch sont conservés.
- Aucun nom, professionnel, date, rendez-vous, compte-rendu, groupe sanguin ou état vaccinal de démonstration ne sert de donnée du foyer. Les promesses de chiffrement/absence de transfert non démontrées par le moteur sont neutralisées.
- Les sections deviennent plus courtes quand les données ou le gestionnaire métier sont absents ; l’absence de registre d’antécédents n’est pas présentée comme absence d’antécédents. Les actions absentes restent inactives, avec explication. Les badges et comptes utilisent les collections natives.
- Les espacements des en-têtes, barres d’action et champs sont adaptés à 320/390 px ; les animations respectent `prefers-reduced-motion`. Les écrans non traités peuvent conserver le pont V5, les opérations principales des sept pages utilisent la présentation Stitch.

## Preuves et commandes

Les captures utilisent uniquement des profils Chromium éphémères et des données préfixées `TEST`, ou des marqueurs privés de contrôle. Aucun compte réel n’est utilisé. L’API familiale est simulée en mémoire et toutes les requêtes externes sont bloquées/interceptées.

- `tests/family.cjs` : parcours membre → fiche → édition, doublons, création/modification/suppression médicale locale, absence de copie familiale, événements ordinaires et ICS, contacts, suppressions annulées, persistance, recherche vide, retour depuis le compte et menus, à 320/390 px.
- `tests/family-edge.cjs` : lien supprimé, fiche orpheline et ancienne identité, nom/intitulé vide rejeté sans faux succès, retour/avance navigateur.
- `tests/family-shared.cjs` : vrai client familial et module natif contre une API simulée : activation volontaire, rendez-vous partagé, identités uniques et cas Foyer, persistance hors ligne, conflit et résolution natifs. Les assertions examinent toutes les écritures du module : aucun `famHealth` ni marqueur privé ne figure dans les payloads.
- `tests/family-visual.cjs` : **28 captures comparatives** (7 sources × 2 largeurs × référence/intégré) et **14 états vides** ; empreintes originales, identité de la source, absence des données fictives identifiées, H1 unique, contrôles dans le viewport et absence d’exception JS. Les états partagé/hors ligne/conflit ajoutent **6 captures**.
- Les **54 régressions communes** et les quatre racines à 320/390 px sont vérifiées parce que le pont et le branchement du générateur ont changé. Les parcours Cuisine ne sont pas réaudités ; leurs scripts existants sont conservés dans la CI finale pour couvrir ce changement partagé.

Depuis la racine, lancer un serveur HTTP sur `127.0.0.1:8765`, puis :

```sh
npm ci --ignore-scripts --prefix essai-stitch-v7/tests
node essai-stitch-v7/build-source.cjs
CHROMIUM_PATH=/usr/bin/chromium npm run test:family --prefix essai-stitch-v7/tests
node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node essai-stitch-v7/tests/smoke.cjs
```

Les index des captures, contrôles détaillés et compte rendu final de vérification sont livrés dans `evidence/family-2a/`. Les fonctions médicales non disponibles et les deux illustrations inaccessibles constituent les limites restantes ; aucun écran importé seulement n’est compté comme actif.
