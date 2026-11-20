# Comptes enfants DOBBY V7

Cette branche part de la PR #50 à `d5e1e4aff6e6c435abbbbe1fdf06d2a15e70a3df`. Le parcours utilise Supabase Auth et la fiche canonique du registre Famille. L’invitation peut être émise depuis cette fiche par un parent autorisé. Elle relie un compte à adresse e-mail distincte au `member_id` existant. La confirmation et la récupération restent celles d’Auth. La suspension désactive l’appartenance, sans supprimer la fiche, sa liaison ou son historique.

## Matrice de permissions

| Espace | Lecture enfant | Action permise |
| --- | --- | --- |
| Accueil et agenda | Missions propres, repas et événements autorisés | Aucune écriture |
| Missions | Propres attributions, échéances et participations | Réalisation propre ou déclaration à valider par un parent selon la mission |
| Runes et récompenses | Propres runes, grade, objectifs et récompenses. Le contenu d’une récompense mystère reste masqué | Aucune règle, aucun bonus, aucune validation ou correction |
| Taverne, Grimoire et Courses | Repas, recettes et liste partagés | Étapes et minuteries tactiles de la recette en cours. Aucune modification de planning, recette, stock ni courses |
| Famille | Présentation permise des membres et événements autorisés | Aucune édition d’un membre, document, contact ou événement |
| Profil et magie | Sa présentation, Maison, Patronus et avatar | Sa Maison et son Patronus uniquement |
| Santé | Rendez-vous et consignes explicitement partagés avec cet enfant par le socle Santé | Aucune mutation, aucun document ou élément clinique privé |
| Parler à Dobby | Accès refusé, y compris par URL, historique, micro et commandes | Aucune |
| Archives, contrats, documents privés et administration | Accès refusé | Aucune |
| Autre foyer | Accès refusé | Aucune |
| Compte suspendu | Données du foyer indisponibles | Déconnexion et récupération Auth restent disponibles |

## Confidentialité Santé

Sur #50, l’iframe V5 conserve les anciennes entrées Santé dans ses données locales et les façades Famille et Cuisine V7 les recopiaient dans leurs résultats. Le carnet et l’agenda appliquaient leurs propres contrôles. La fuite confirmée concernait la projection applicative et pouvait se reproduire après un changement de compte. Le contrôle Chromium vérifie les deux façades avant et après le changement, ainsi que la conservation de l’historique au repos. Le test utilise une navigation de document neuf pour constater la connexion effective avant de vérifier les données.

La projection du cache enfant est tenue en mémoire. Au changement de session, les données et vues liées au compte sont écartées, y compris les conversations et la synthèse vocale. Les anciennes données locales déjà enregistrées sur le navigateur sont conservées. L’accès aux outils de développement du navigateur permet de lire son stockage historique local.

## Recette reproductible

Les commandes ci-dessous utilisent des services et identités fictifs. Le client public conserve `childAccountsAvailable: false`. Le test change cette valeur uniquement dans le navigateur de recette et n’ouvre que les portes de la base jetable. Le protocole enfant côté serveur doit en outre être attesté. [Contrats et restrictions SQL](README-SQL.md)

```sh
npm ci --ignore-scripts --prefix essai-stitch-v7/tests
python3 -u docs/dobby-v7/comptes-enfants/tests/run-local.py
python3 -u docs/dobby-v7/comptes-enfants/tests/onboarding-local.py --evidence /tmp/dobby-enfants-auth
docker pull supabase/storage-api:v1.89.12@sha256:8526956cb462e9f7d392e9848ec77133b2769982ed614e9753cc687e8e4339a6
python3 docs/dobby-v7/sante-essentielle/test-postgres.py --storage
```

La recette Chromium utilise 320, 390 et 1440 px. La CI joint les captures des essais locaux. Aucune migration hébergée ni activation publique n’est incluse.
