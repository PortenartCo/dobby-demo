# Derniers contrôles matériels — D02 et Safari/iPhone

Statut : **RECETTE MATÉRIELLE À EFFECTUER**. Aucun iPhone physique ou microphone réel n’est disponible dans l’environnement de développement. Les API vocales, pointeurs tactiles et géométries de clavier simulés ne remplacent pas ce contrôle. La recette B validée au commit `b77cb9d` est acquise et ne fait pas partie de cette liste.

## Ce qui est déjà automatisé

`v7-transversal.cjs` utilise le vrai DOM natif, le brouillon et le stockage avec API de reconnaissance simulée : maintien/relâchement, annulation, sortie du bouton, perte de focus, onglet masqué, navigation, démarrage/résultat tardifs, refus de permission, action clavier, halo avec effets OFF, envoi explicite, dock et six largeurs. `e02-voice-history.cjs` couvre aussi la variante `webkitSpeechRecognition`, l’annulation, le démarrage bloqué et la persistance native. Ces essais ne font aucune demande de permission ou requête Supabase réelle.

## Une seule séance sur matériel réel

Utiliser un profil déjà autorisé, l’URL HTTPS officielle et un message neutre tel que « Bonjour Dobby ». Ne recréer ni compte, ni foyer, ni profil ; ne tester aucune commande qui modifie une mission, un événement ou un achat. Noter simplement l’appareil, le navigateur et sa version, puis les résultats ci-dessous.

| Contrôle | Résultat exigé |
|---|---|
| Micro sur un navigateur compatible, avant tout appui | Aucune écoute spontanée ; texte utilisable. |
| Maintenir, parler, puis relâcher | Halo actif pendant l’appui ; arrêt au relâchement ; brouillon conservé ; aucun envoi automatique. |
| Relâcher avant d’accepter une permission, puis l’accepter | Aucun démarrage tardif sans nouvel appui. |
| Refuser la permission une fois | Message explicite ; pas d’écoute résiduelle ; saisie texte toujours disponible. |
| Pendant un appui, sortir du bouton ou changer d’application/onglet | Écoute arrêtée ; retour sans reprise automatique. |
| Safari/iPhone physique, clavier ouvert en portrait puis paysage | Champ et bouton Envoyer accessibles, dock utilisable, aucun élément recouvert par les safe areas, scroll vertical possible. |
| Safari sans API de reconnaissance disponible | Message de repli honnête et saisie texte/dictée système utilisable ; aucun faux succès vocal. |

Si le même iPhone propose la reconnaissance native, il suffit pour les deux familles de contrôles. Sinon, le contrôle micro demande un second navigateur compatible ; l’iPhone reste nécessaire pour le clavier et les safe areas. Une API absente n’est pas une panne à masquer. Aucun nouveau service vocal ni accès serveur n’est activé par ces essais.

## Retour minimal

```text
Appareil / navigateur / version :
Micro : OK / indisponible / anomalie (+ étape)
Permission tardive et refus : OK / anomalie (+ étape)
Clavier / dock / safe areas / portrait-paysage : OK / anomalie (+ étape)
```

Aucun mot de passe, contenu familial, jeton ou nouvelle recette B n’est nécessaire. Une anomalie matérielle se traite ensuite par un correctif ciblé ; elle ne justifie aucune réinstallation SQL.
