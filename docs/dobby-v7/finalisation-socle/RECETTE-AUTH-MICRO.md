# DOBBY V7 — recette Auth restante et micro réel

Document de préparation du 13 novembre 2026, depuis `main` `b77cb9de100a864c8aace8fb9e07053220ccd23a`. **Aucune étape ci-dessous n'est déclarée réussie avant son résultat réel.** Voir la [matrice des dix réserves](MATRICE-RESERVES.md) pour la distinction entre code, tests locaux, publication et recette utilisateur.

## Acquis à conserver

Le [complément de livraison](../REVUE-GENERALE-LIVRAISON.md#complément-de-recette-réelle--compte-b-13-novembre-2026) consigne la validation utilisateur : création du foyer, deux comptes liés à deux profils distincts, invitation consommée, Maison/Patronus et Courses synchronisées dans les deux sens. **La déconnexion finale de B, son retour à l'accès, sa reconnexion par la Cheminette et la conservation de Maison/Patronus sont aussi validés.** Il ne reste pas à répéter ce scénario nominal.

Les deux comptes et le foyer existants sont conservés. Aucun reset, recréation de ces comptes, script Stitch 01/04/06/11 ni réutilisation de l'invitation acceptée n'est nécessaire. Le contournement de `FOYER-LOCAL-AUTRE` par une session vierge n'a pas validé un changement de foyer dans un ancien stockage : conserver cet ancien navigateur et ses données hors ligne, sans effacement automatique.

Point d'entrée unique : **`https://portenartco.github.io/dobby-demo/`**. Site URL et Redirect URL exacte à cette racine, inscription et confirmation e-mail active sont déjà confirmés. Ne refaire aucun réglage Dashboard sans anomalie constatée ; [valeurs et parcours de référence](../stitch19-20/supabase/DASHBOARD.md).

## S03/S04 — seuls cas restant à recetter

Employer des sessions de navigateur indépendantes et, pour les nouveaux e-mails ou l'autre foyer, **des comptes de recette dédiés explicitement autorisés**. Ne pas transformer les deux profils familiaux actuels pour ces essais. Un compte adulte B qui fonctionne ne constitue pas une preuve des droits enfant F09. Les refus doivent être contrôlés côté serveur avant activation des nouvelles capacités.

| Cas non encore validé | Action de recette | Résultat attendu / preuve minimale |
|---|---|---|
| **Nouvel e-mail et confirmation** — S03 | Dans une session vierge, s'inscrire sans invitation avec une adresse de recette accessible ; vérifier l'état avant confirmation, puis ouvrir le lien reçu. Compléter profil et nouveau foyer seulement dans ce périmètre de recette. | Retour à la racine officielle ; état d'attente honnête tant que la confirmation manque ; après confirmation, parcours du nouveau compte, sans accès à un foyer existant ni profil fictif. Noter réception, redirection et première étape atteinte. |
| **Refus d'inscription/confirmation** — S03 | Vérifier une confirmation de mot de passe différente, puis un lien de confirmation expiré ou déjà inutilisable, dans le périmètre de recette. | Erreur explicite, aucune création de foyer ou connexion présentée comme réussie à tort ; possibilité de reprendre l'accès. Le comportement de confidentialité d'une adresse déjà inscrite ne doit pas divulguer son existence. |
| **Récupération du mot de passe** — S03 | Sur un compte de recette, « Mot de passe oublié » → e-mail → lien → nouveau mot de passe → connexion. Vérifier ensuite un lien expiré/réutilisé. | Racine officielle, formulaire de nouveau mot de passe avant le retour au parcours normal ; bon compte et même profil/foyer. L'ancien mot de passe n'ouvre plus une nouvelle connexion ; un lien invalide ne donne aucun accès supplémentaire. Ne pas consigner les mots de passe ou URL reçues. |
| **Invitation expirée** — S04 | Créer une invitation de recette à durée limitée par le mécanisme existant ; attendre son expiration, puis l'ouvrir dans une autre session. | État expiré distinct ; aucune appartenance ni personne supplémentaire, aucun accès au foyer. Ne pas modifier l'horloge de production ou les tables pour accélérer l'essai. |
| **Invitation révoquée** — S04 | Révoquer une invitation de recette encore inutilisée, puis ouvrir son lien dans une autre session. | Invitation refusée ; aucune appartenance ni personne ajoutée. La révocation ne doit pas retirer un membre déjà admis par une autre invitation. |
| **Acceptation concurrente / réponse perdue** — S04 | Sur une invitation et un compte de recette non encore liés, lancer deux acceptations concurrentes ; reprendre après une réponse perdue en réutilisant l'opération prévue par le client. | Une seule consommation effective, une appartenance et un profil ; reprise sur le contexte actif du même compte. Un autre compte ne peut consommer le lien après succès. La démonstration exige une preuve serveur agrégée, pas seulement deux écrans identiques. |
| **Compte d'un autre foyer / accès croisé** — S03/S04 | Avec un autre foyer de recette autorisé, essayer l'invitation et les accès directs à des ressources du foyer cible ; contrôler compte/foyer/profil affichés après retour Auth. | Refus sans migration implicite du compte, sans profil dupliqué et sans lecture/écriture du foyer étranger. Conserver les appartenances des deux foyers. La recette RPC/RLS complète S10/F09 reste une étape distincte, après installation adaptée. |

Pour chaque cas : noter **réussi / échec / non exécuté**, appareil/navigateur, étape atteinte, message et référence affichés, puis nombre agrégé de profils/appartenances avant/après si nécessaire. Ne pas transmettre d'adresse, identifiant personnel, mot de passe, contenu familial, lien de récupération ou jeton d'invitation. Les résultats techniques sensibles restent hors des preuves publiques. Aucun cas non exécuté ne clôt S03 ou S04.

## D02 — iPhone physique et Safari

**Durée cible : quelques minutes.** Utiliser l'iPhone réel, Safari et la racine HTTPS officielle ; noter modèle, version iOS/Safari et date. Ouvrir Dobby dans un foyer accessible. Employer un message inoffensif ; ne pas dicter de données privées. Les tests Chromium et API vocales simulées ne remplacent aucune étape.

1. **Autorisation et appui.** Maintenir « Parler à Dobby », autoriser le microphone si demandé, puis dire « Test micro ». Vérifier l'indication d'écoute et un brouillon visible. Rien ne doit être envoyé automatiquement.
2. **Relâchement.** Lever le doigt et continuer à parler : l'état d'écoute s'arrête, l'indicateur de capture iOS cesse après le délai propre au système et le brouillon ne continue pas à recevoir de mots. L'envoi reste soumis au bouton « Envoyer ».
3. **Interruptions.** Recommencer en glissant le doigt hors du bouton, puis en changeant d'onglet ou en mettant Safari en arrière-plan. À chaque fois l'écoute cesse et ne redémarre pas au retour ; le brouillon reste récupérable.
4. **Permission tardive/refusée.** Si Safari permet de redemander le droit, relâcher pendant la demande puis autoriser : aucune écoute ne doit démarrer durablement après relâchement. Refuser ensuite le droit via les réglages du site disponibles dans cette version de Safari : erreur compréhensible, brouillon conservé, saisie texte utilisable. Restaurer le choix de permission voulu après l'essai.
5. **Annulation et saisie.** Vérifier « Annuler le texte dicté » : le texte présent avant la dictée est restauré, aucun message envoyé. Ouvrir le clavier, passer portrait/paysage et faire défiler : champ, action d'envoi et dock restent atteignables, sans zone bloquée. Envoyer seulement le message de test voulu.

Si Safari n'expose pas la reconnaissance vocale utilisable, le message de repli vers la dictée du clavier ou la saisie est attendu. Tester alors le clavier et l'envoi explicite ; classer **« repli réel validé ; reconnaissance du bouton indisponible/non validée sur cet appareil »**, jamais « micro natif validé ». Une permission refusée ou une panne du service vocal n'est pas un succès d'écoute.

Retour minimal : appareil/version, cinq étapes avec résultat, premier message d'erreur exact éventuel, état de l'indicateur micro après relâchement/retour. D02 reste partiel tant que le cycle réel sur Safari compatible n'est pas confirmé ; un défaut reproductible déclenche seulement les tests ciblés du composant vocal.
