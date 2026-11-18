# Revue finale — Lot 3

Revue indépendante statique, en lecture seule, des fichiers suivis/non suivis et de la spécification. Le réviseur n'a exécuté aucun test ni appelé de service. Quatre constats importants, aucun constat critique ; les preuves de correction proviennent des exécutions de développement, pas d'une seconde revue.

| Constat | Correction et preuve |
|---|---|
| Une approbation sans UUID lié pouvait traverser la suspension/réactivation de sa cible. | `approved_at` immuable représente la vraie décision. Enregistrement/acceptation refusent une décision antérieure à la borne et une génération connue différente. Contre-épreuve SQL puis scénario HTTP avec livraison interrompue : ancien droit refusé, décision neuve acceptée. |
| Les demandes sans UUID n'avaient pas de vraie pagination. | `requestsCursor`/`nextRequestsCursor` indépendants du curseur des comptes, ordre stable, y compris demandes terminales. Cas N+1 SQL et validation Edge observés RED puis GREEN. |
| Une invitation enfant expirée occupait encore l'index d'unicité historique. | Les liens encore valides bloquent la livraison avant Auth. Les expirés sont révoqués sous verrou et conservés ; remplacement et consommation réellement testés sans modifier profil/magie/crédits/révisions. |
| Un callback B depuis un navigateur connecté à A pouvait perdre sa session bornée par reload. | Refus explicite avant `/verify` et sans perdre le hash ; instruction de rouvrir le mail dans un profil distinct. État/session/cache A intacts, même hash B ensuite utilisé dans un vrai contexte Chromium neuf. |

Autres échecs corrigés avant la livraison : syntaxe initiale SQL et montage du harnais, reprise OTP d'un compte invité non confirmé avec signup fermé, privilège REVOKE du rollback, finalisation de la réactivation dans une seconde transaction, reprise d'une tentative orpheline et CAS de rejeu. Les contre-épreuves retenues sont dans `preuves/` ; le premier passage métier 10/13 est conservé et distingué du dernier 16/16.

Décisions de périmètre : le catalogue existant est composé avec les vraies tables GoTrue sans rejouer une ancienne installation ; ses défauts sont rejoués avec les seules régressions causales. La console Lot 4, l'hébergement, les identités/courriels réels, l'ouverture des gates enfant et une nouvelle campagne Storage sont exclus. Les garde-fous des anciennes migrations restent en place.

Aucun point mineur différé dans le périmètre livré. Les limites de niveau de preuve, les horloges fictives et les prérequis hébergés figurent dans RAPPORT.md/REPRISE.md.
