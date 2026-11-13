# DOBBY V7 — reprise des seules réserves techniques

Base de reprise : `main b77cb9d`, après code applicatif `7526b0c` et livraison `f157c47`. Source de cette mission : instruction utilisateur du 13 novembre 2026, fuseau Europe/Paris.

## Acquis conservés

Stitch 19/20 est clôturable : l’utilisateur a validé B (déconnexion, reconnexion, Cheminette et conservation Maison/Patronus). Cette recette ne sera ni redemandée ni remplacée par une simulation. Les deux comptes, leurs profils, le foyer et les données existantes restent conservés.

## Périmètre autorisé

- Courses C07 : disponibilité partagée et vérification exacte du schéma.
- Missions/Runes V3 : solde/répartition, cohérence, protocole et intégration à préparer à partir des sources serveur réelles.
- Droits Parent/Enfant et compte enfant évolutif : identité canonique, gardes clientes et contrat serveur, sans second profil.
- Dernière recette physique : micro réel et Safari/iPhone, distincte des simulations navigateur.

## Contraintes

Aucun accès au projet Supabase distant : pas de SQL, API, Auth, Storage, CLI ou migration par Codex. Toutes les interventions Supabase sont exécutées manuellement par l’utilisateur. La consultation de documentation publique ne contacte aucun projet personnel. Aucun ancien script Stitch `01`, `04`, `06` ou `11` ne sera rejoué. Aucun secret, token, profil, compte ou contenu familial n’est demandé dans le diagnostic. Les SQL déjà préparés sont réutilisés ; les nouvelles capacités non vérifiées restent fermées. Pas de réimplémentation des fonctionnalités intégrées.

## Séquence et critères de fin

Commencer par un seul diagnostic manuel ciblé, en lecture seule, donnant les structures, droits et définitions nécessaires. Tester son SQL exact dans PostgreSQL fictif sans réseau. Développer et tester les corrections indépendantes prouvées. Les définitions privées distantes absentes sont un blocage explicite à la migration complète et à son activation, pas un motif de réinitialisation. Livrer le paquet diagnostic, les preuves locales, le bilan par réserve et les seules actions manuelles indispensables. Ne pas recalculer le snapshot historique 50/4/6 de la première livraison sans validation complète de chaque critère.
