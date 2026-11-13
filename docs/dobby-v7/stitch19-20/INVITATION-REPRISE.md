# Reprendre un foyer après une acceptation enregistrée

La création du foyer, l'invitation et le rattachement du second compte ont été
confirmés par l'utilisateur et le diagnostic en lecture seule : deux comptes
actifs dans le même foyer, deux profils distincts, un propriétaire et un membre,
aucun profil en attente ni erreur SQL. La
[preuve agrégée](supabase/evidence/live-user-invitation-resume-20261113.json)
ne contient aucun identifiant personnel ni jeton.

L'acceptation est enregistrée avant la vérification et l'adoption locale du foyer.
Si cette seconde étape échoue, le lien peut rester mémorisé dans le navigateur.
Sa nouvelle vérification ne confirme plus l'invitation, et l'écran conservait
ce parcours sans action pour reprendre le foyer déjà lié.

L'écran d'invitation indisponible propose maintenant de vérifier l'accès au foyer.
Cette action rafraîchit le contexte sans rejouer l'acceptation. La reprise exige
la même identité, une liaison active et l'adoption native vérifiée. Le lien
mémorisé est retiré par une opération atomique qui préserve tout autre jeton ou
compte enregistré entre-temps. Les cérémonies ou la Cheminette reprennent ensuite
selon l'état réel du profil.

Les invitations valides conservent leur confirmation explicite. Les protections
des données locales restent actives ; les refus locaux connus affichent une
référence fixe sans reprendre les messages du serveur. La cause initiale du refus
local du compte B reste à établir.

Le SQL14 est uniquement un diagnostic. Aucun reset, nouvelle invitation ou
modification de base supplémentaire n'est nécessaire pour ce correctif.
La reprise du compte B, la synchronisation des Courses et la reconnexion réelle
restent à confirmer dans les navigateurs.
