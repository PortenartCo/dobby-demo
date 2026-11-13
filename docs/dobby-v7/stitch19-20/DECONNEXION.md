# Déconnexion visible et dernière étape de recette

L'utilisateur a confirmé les cérémonies et la synchronisation des Courses dans
les deux sens entre les comptes A et B. La recette de reconnexion était bloquée
par l'absence d'une action de déconnexion visible dans l'interface V7.

L'icône de compte ouvre le Profil magique. Le bouton **Se déconnecter** apparaît
désormais en haut de cette page, y compris lorsque le compte n'a pas de liaison
locale vérifiée. Il appelle le mécanisme natif, retire la session et les droits
actifs, puis revient à l'accueil. Les données locales et les choix magiques sont
conservés. Les clics répétés partagent une seule opération ; une nouvelle session
survenue entre-temps empêche de présenter une fausse déconnexion réussie.

La navigation automatique liée au changement de compte est suspendue uniquement
pendant cette action, jusqu'à la fin du nettoyage natif. Les protections des
invitations et des parcours Auth concurrents restent actives.

Validation locale : 26 scénarios navigateur, six largeurs avec hauteur réduite,
et cinq contrôles indépendants dont deux refus/concurrences. La déconnexion et
la reconnexion réelles restent à vérifier après publication et rechargement forcé.
