# État du code et dépendances serveur

Analyse ciblée du `main` `b77cb9d`, sans rejeu de campagne ni accès Supabase distant. Aucun changement produit n'est activé par ces constats.

## Missions M06/M07/M08

Les calculs et dialogues locaux V3 existent déjà : ne pas créer un deuxième moteur. Le transport partagé de `essai-stitch-v5-famille/family-modules.js` reste V2 ; son garde-fou refuse allocations, ledger V3 et attribution multiple/toute famille avant l'appel réseau. Le seul capability check actuel annonce le protocole V2.

Une évolution coordonnée devra ajouter un transport d'intentions V3, une persistance d'opérations distincte et des reçus qui comparent les allocations. Les comparaisons historiques d'événements dans `family-modules.js` et `family-missions.js` ne comparent pas les allocations : élargir seulement le gate V2 serait incorrect. Les enfants n'enverront jamais un snapshot de crédit modifiable.

Le writer V2 public connu utilise appartenance verrouillée, verrou consultatif `dobby-missions-v2:`, ligne Missions et reçus ; les helpers privés réellement installés restent à recevoir. Le futur V3 doit coordonner cet ordre de verrouillage et les modifications du registre familial. Le contrat existant précise le total unique, le partage déterministe, l'idempotence par opération et l'annulation append-only ; aucun crédit historique ne peut être recalculé ou effacé.

## Identité, Parent/Enfant et rattachement S10/F08/F09

Le profil canonique est `familyMembers[*].id` **TEXT**, relié au compte par `account_links` et une appartenance active. La catégorie protégée `memberCategory` fait autorité ; ni `owner/member`, ni l'âge ou les métadonnées Auth ne la remplacent.

Le code SQL de référence limite actuellement la gestion au propriétaire et protège les autres profils liés. L'invité adulte a une catégorie Parent mais une appartenance `member` : il ne dispose donc pas encore de toute la gestion demandée. Il faudra adapter ensemble contexte, invitations, RPC de modification, garde du registre et policies. Les restrictions `TO authenticated` du lot provisoire ne contrôlent pas à elles seules un RPC `SECURITY DEFINER` exécuté par un writer fermé.

Autre écart constaté dans le SQL de référence : `update_magic` inclut l'animal dans les dépendants possibles, malgré son blocage dans l'interface. La correction serveur doit explicitement refuser les animaux. Un enfant lié reste limité à sa propre Maison/son Patronus et à une validation Missions V3 éligible, sans édition de son identité ou des données partagées.

L'invitation générique crée un profil. La liaison existante exige déjà une appartenance active : aucune des deux ne réalise F08. Le parcours ciblé devra conserver le même ID et toutes ses données, vérifier le parent et la cible, consommer atomiquement l'invitation et refuser les collisions/rejeux étrangers. Le bouton demeure désactivé avant recette serveur réelle.

La réparation Stitch 11 a adapté `actor()` et **`public.dobby_v2_modules_stamp()`**, pas le trigger Courses. Ne pas restaurer un ancien corps de fixture. Les writers existants sont fermés : `CREATEROLE` et propriété de schéma ne suffisent pas à garantir remplacement ou restitution de leur propriété. La migration et son rollback doivent être fondés sur les droits réels reçus au checkpoint B.

## Courses C07

Le lot additif existant reste la base : présence et compatibilité réelles à examiner avant toute installation. `at_home_quantity` doit préserver `.001`, sans achat implicite ni contrainte empêchant les anciens PATCH de quantité. L'installation existante ne répare ni grants, ni RLS, ni trigger ; la vérification de métadonnées ne certifie pas leur comportement. La recette des Courses ordinaires déjà réussie ne valide pas cette nouvelle colonne.

Si le contrat complet est déjà compatible, ne rien réinstaller. Sinon préparer seulement les modifications nécessaires, puis vérifier révision/CAS, imports, disponibilité partagée, ancien client et refus Enfant/inter-foyers. Ne pas confondre erreur réseau ou refus de permission avec colonne absente.

## Travail indépendant achevé au checkpoint B

- [Matrice exacte des dix réserves](MATRICE-RESERVES.md), avec preuve réelle de reconnexion B conservée.
- [Diagnostic manuel regroupé](supabase/README.md), testé localement et revu indépendamment.
- [Recettes Auth restantes et iPhone/Safari](RECETTE-AUTH-MICRO.md), sans répétition du nominal acquis.
- [Examen du stockage](STOCKAGE-ET-CHANGEMENT-COMPTE.md) : conservation de la garde ; une suppression du marqueur local ne permet pas une bascule sûre.

**BLOQUÉ :** SQL exact V3/F08/F09 et décision d'installation C07, en attente du catalogue réel. Ce checkpoint n'installe ni n'active ces fonctions. Aucun succès serveur n'est inventé pour franchir cette dépendance.
