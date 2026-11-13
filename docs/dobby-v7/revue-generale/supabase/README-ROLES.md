# Rôles familiaux : candidat restrictif partiel, pas un installateur F09

**ATTENTE_UTILISATEUR pour la vérification serveur ; aucune exécution distante.** La recette réelle finale du compte B et la mission Stitch sont closes. Ne rejouer aucun ancien installateur `01`, rattachement `04`, remise à zéro `06` ou correctif `11`.

La seule collecte initiale à envisager est le [diagnostic regroupé du catalogue](../../reserves-techniques/serveur/00-diagnostic-regroupe.sql), selon son README. L'ancien `roles-00-preflight.sql` est retiré pour éviter une seconde collecte. Ni ce diagnostic ni les tests ci-dessous ne constituent une validation des droits réels Parent/Enfant.

## Ce que protège le candidat

`roles-01-apply.sql` ajoute **neuf policies restrictives `TO authenticated`**, sans modifier les policies permissives existantes ni les lignes : INSERT/UPDATE/DELETE de `dobby_v2_modules`, `dobby_v2_grocery` et du bucket `dobby-family-files` dans `storage.objects`. Les lectures et les autres buckets restent sous leurs règles existantes.

Le parent doit être résolu par `dobby_v7_context()` : protocole V7 connu, phase active, foyer exact, identifiant de membre cohérent avec son profil canonique, catégorie `parent` et permission `canEdit=true`. Aucun rôle n'est tiré d'un nom, d'un âge, de l'ordre des profils ou de `user_metadata` fourni par un client. Le helper ajouté est `SECURITY INVOKER`, sans chemin de recherche implicite, exécutable par `authenticated` et pas par PUBLIC/anon.

Le script s'arrête si le contexte serveur n'est pas détenu par un rôle technique fermé, si `authenticated` est privilégié ou peut prendre ce rôle, si les trois tables n'ont pas RLS activée ou sont possédées par un rôle accessible au client, si le type foyer diffère du catalogue UUID connu, ou si un objet de ce candidat existe déjà. Une erreur annule la transaction. Il ne remplace jamais un objet existant pour « faire passer » l'installation.

`roles-02-verify.sql` vérifie la **table, la commande, le rôle, la nature restrictive et les expressions exactes** de chaque policy, puis le corps/volatilité/langage/search_path/ACL/absence de SECURITY DEFINER du helper et les prérequis RLS/client. Son résultat JSON doit avoir `passed=true`, mais indique toujours `completeF09=false`. L'ancien simple comptage de neuf noms acceptait à tort une policy restrictive `USING(true)` : ce faux positif est couvert par une régression. Les comparaisons conservent strictement le contenu des littéraux : `dobby- family-files` n'est jamais assimilé à `dobby-family-files`, et une clé JSON modifiée dans le helper est refusée. Un écart de décompilation/format est un refus à examiner, jamais une raison de supprimer globalement les espaces.

## Ce que le candidat ne protège pas

- Une policy `TO authenticated` ne s'applique pas automatiquement à une RPC exécutée sous un **autre rôle** `SECURITY DEFINER`. Même un writer `NOBYPASSRLS` peut disposer de ses propres policies. Les vrais guards privés de Missions manquent dans les sources historiques ; aucun stub local ne peut les remplacer dans une preuve de sécurité.
- Le writer V7 connu refuse de modifier un autre parent lié, ainsi qu'un enfant déjà lié, même dans le même foyer. Le garde de snapshot protège ces profils. Cela ne réalise donc pas encore la gestion complète du foyer demandée à un parent.
- La modification de **sa propre Maison/son propre Patronus** par un enfant dispose déjà d'un contrat V7. La seconde exception enfant, **valider une mission autorisée**, demande le protocole serveur contrôlé de complétion/participants et ses gardes. Les écritures directes générales doivent rester interdites ; ce candidat ne fournit pas cette RPC et n'active aucun gate.
- L'ancien endpoint `dobby_sync_grocery_items`, d'autres tables/RPC, les opérations techniques Storage et les rôles privilégiés ne sont pas couverts par ces neuf policies. Les corps, dépendances, ACL et rôles effectifs doivent être rapprochés du diagnostic unique.
- La confidentialité réelle du bucket, les types/tailles autorisés, les liens signés, les opérations du service Storage et la recette Auth réelle ne sont pas prouvés par un test de `storage.objects`. Le diagnostic initial reste limité au catalogue et ne lit pas `storage.buckets`.

Le [bilan F09](../../reserves-techniques/DROITS-SERVEUR.md) distingue ces lacunes sources des inconnues de production. **Ne pas considérer `roles-01-apply.sql` comme la prochaine action à exécuter** : tant que les vrais guards privés et accès privilégiés n'ont pas été examinés, le candidat reste une préparation partielle à revoir, pas une fermeture F09.

## Validation locale reproductible

```sh
python3 docs/dobby-v7/revue-generale/supabase/tests/run-role-guard-local.py
```

Le test exige l'image locale existante `postgres:17.7`, interdit le téléchargement, crée son propre conteneur éphémère avec `--network=none`, aucun port publié et uniquement des données fictives, puis le supprime. Aucun paramètre d'URL de base distante n'est accepté. Le contexte fixture lit une table de liaisons protégée, pas un JSON de catégorie choisi par le client.

Les tests couvrent parents/enfants/animaux/contexte absent ou révoqué, permission parent retirée, usurpation `user_metadata`, INSERT/UPDATE/DELETE des trois cibles, foyer différent et déplacement/root Storage, faux positifs de vérification, rollback conservant les lignes et prérequis refusés sans installation partielle. Ils reproduisent aussi **une limite attendue** : une RPC fictive volontairement non protégée sous un writer distinct passe à travers les policies `authenticated`. Ce résultat interdit de prétendre certifier l'ensemble F09. Aucun guard Missions réel n'est remplacé ni simulé comme opérationnel.

## Intervention manuelle future, minimale

1. Conserver uniquement les métadonnées du diagnostic unique ; signaler explicitement toute définition inaccessible. Aucun nom, compte, token, contenu de profil ou fichier n'est nécessaire.
2. Examiner les guards privés réels, le graphe des writers, leurs ACL/rôles/RLS et les politiques Storage. Préparer ensuite seulement un delta ciblé, avec empreintes des définitions attendues, tests locaux sur ce catalogue et retour arrière. Ne pas rejouer les anciens installateurs ni élargir un rôle pour contourner un refus.
3. Une éventuelle pose de ce seul candidat direct exige d'abord cet examen ; appliquer sa transaction puis son vérificateur exact sans neutraliser les protections. Cela ne débloque ni l'exception Missions enfant ni la gestion d'un autre parent. La validation réelle Parent/Enfant/autre foyer reste distincte et nécessaire avant toute activation.
4. `roles-03-rollback.sql` retire uniquement les neuf policies et le helper de ce candidat, sans supprimer de données. **Ce retrait réouvre les droits antérieurs** ; il ne corrige pas un défaut serveur et doit laisser les nouveaux parcours enfants désactivés.
