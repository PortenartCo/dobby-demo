# Lot 3 — plan d'exécution locale

**But :** circuit nominatif d'approbation, invitation et consommation, backend et callbacks, éprouvé sur Auth local.
**Spécification :** mission Lot 3, issue #19 et documents PR #27 au commit `440cc2394c2dd5e9865a9b71fcd17b43e351f034` ; ils sont lus sans fusion.
**Architecture :** RPC à identité serveur et double contrôle propriétaire Edge/DB. Client élevé isolé pour Auth uniquement. Ledger durable de livraison avant effet Auth ; reprise explicite des résultats incertains. Consommation atomique de l'admission et du rattachement/profil/autorisation. Callbacks token_hash confirmés explicitement, mode admission borné avant adoption familiale. Transport natif Storage existant inchangé.
**Technologies :** TypeScript/fetch Edge, PostgreSQL, GoTrue/PostgREST/SMTP local réel, modules JavaScript V7 existants et Node 24.

## Contraintes

Aucun Supabase hébergé, e-mail réel, compte réel, ancienne migration modifiée, déploiement, fusion, Lot 4 ou activation de gates familiales de production. Ne pas donner de contenu familial à l'administration. Garder les limites Lot 2B explicites. Tests causaux uniquement ; pas de campagne Storage répétée.

## Étapes

- [x] Vérifier base/instructions, créer l'isolation, lire les références et sauvegarder ce checkpoint.
- [x] Contrats fermés, tests initiaux en échec, composition des fixtures avec les vrais schémas Auth locaux.
- [x] API Edge et helpers, migration additive/rollback conservateur, demande/approbation/livraison/consommation transactionnelle, suspension/réactivation et refus des anciens créateurs libres.
- [x] Callbacks token_hash et chemin admission borné, conservation PKCE/connexion/récupération ; tests ciblés des modules affectés.
- [x] Preuves réelles GoTrue/SMTP/PostgREST : signup ouvert/fermé, invitation et compte existant, autre navigateur, scénarios T03/T04/T12/T13 et défaillances de saga.
- [x] Revue indépendante, contrôle confidentialité, résultats PASS/FAIL/BLOCKED, sauvegarde et PR brouillon empilée sur #30.

## Interfaces et revue

La définition détaillée et versionnée est dans CONTRAT.md. Commandes fermées du propriétaire et RPC utilisateur séparées ; jamais un UUID d'acteur fourni par le client. Vérifier les replays après suspension, les générations, la confirmation d'adresse actuelle, le demandeur devenu inactif, l'ordre des verrous et l'absence d'autorisation provisoire commitée. Les gates enfant restent fermées en production ; une ouverture exclusivement dans la fixture ne vaut pas recette hébergée.

Livraison locale : PR brouillon [#31](https://github.com/PortenartCo/dobby-demo/pull/31). Les résultats actuels et limites sont dans RAPPORT.md/RESULTATS.json ; le checkpoint initial reste un historique.
