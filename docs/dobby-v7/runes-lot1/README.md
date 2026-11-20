# DOBBY V7 — Fondations Runes, lot 1

Références de décision et de mise en service [#37](https://github.com/PortenartCo/dobby-demo/issues/37) et [#35](https://github.com/PortenartCo/dobby-demo/issues/35). Base `main` à `424ae01815b7392dff1b3e5da9c51f4a734b4140`.

## Périmètre et reprise de la PR #36

Le moteur gère déjà 10, 25 et 50 Runes, le montant entier personnalisé, le crédit figé lors de la validation et les 12 grades. Le lot réutilise ces règles, le module partagé `missions`, les intentions, le verrou, le CAS, le reçu et la file d'attente du writer V3. Les anciens gains et annulations gardent leurs montants et leurs identifiants.

Le correctif ciblé de [#36](https://github.com/PortenartCo/dobby-demo/pull/36) rétablit la complétion et la réouverture V2 à responsable unique, avec une capacité V2 reconnue et un parent vérifié. Les quatre zones communes à rapprocher lors de l'intégration sont le probe natif dans `family-v2.js`, le signal de capacité dans `family-modules.js`, l'action native dans `family-missions.js` et le dialogue dans `tools-register.js`. Aucune fermeture d'inscription, d'invitation ou de création de foyer n'entre dans ce lot.

## Registre et interface

- [Cœur Runes](../../../essai-stitch-v5-famille/family-runes-core.mjs) et [transport natif](../../../essai-stitch-v5-famille/family-mission-intents.mjs). Un bonus positif appartient à un enfant du foyer. Une correction vise une attribution active et son bénéficiaire et fixe le montant exact attendu, éventuellement zéro. Elle conserve l'original, son lien, le montant précédent, le nouveau montant, le motif, l'auteur canonique et la date serveur. Une correction peut être rectifiée à son tour en se référant à l'attribution d'origine et au dernier montant connu.
- [Module Missions](../../../essai-stitch-v5-famille/family-modules.js). Les deux nouvelles intentions empruntent l'UUID durable et la révision affichée. Une réponse ambiguë garde le même corps en attente. Le reçu doit confirmer l'écriture correspondante dans le journal. Un conflit de révision n'écrase aucune attribution.
- [Journal et commandes parentales](../../../essai-stitch-v7/member-avatar.js). Depuis le Grimoire personnel, un parent vérifié dont le partage Missions est actif peut accorder un bonus à un enfant et corriger une attribution. Une confirmation serveur est nécessaire avant d'afficher le nouveau total. En lecture, les 12 grades utilisent le même capital corrigé que le futur calcul de seuil.
- Si une ancienne mission est rouverte, son crédit d'origine est compensé selon la règle existante. L'ajustement attaché à ce crédit devient sans effet sur le capital et reste visible dans le journal. Une nouvelle complétion utilise le montant courant et son nouveau cycle.
- Les deux commandes sont réservées au parent côté SQL. Le rattachement canonique, la politique de lecture du foyer, les ACL et l'interdiction des écritures directes sont hérités du socle. Avec le lot 1, un enfant peut uniquement compléter sa mission à responsable unique. Les anciennes allocations parentales sont conservées pour les missions existantes.

## Migration à examiner, non exécutée sur Supabase hébergé

Une seule migration pour ce lot, [01-etendre-registre-v3.sql](01-etendre-registre-v3.sql). Elle suppose le [socle Famille](../finalisation-socle/supabase/family/01-install-family.sql) et le [writer Missions V3](../finalisation-socle/supabase/missions/01-apply.sql) à leurs définitions attendues. Le précontrôle vérifie définitions, propriétaires et droits des fonctions modifiées, garde Missions et RLS forcée sur les reçus. La transaction ne convertit aucune ligne et ne modifie aucune politique. Le client exige la capacité exacte du lot et les flags de vérification du socle déjà en place. L'installation du SQL laisse ces flags à leur valeur existante.

En cas de retour conservateur après des crédits du lot 1, suspendre l'écriture en utilisant les dispositions existantes et garder la lecture avec un client compatible. Les versions précédentes ne savent pas interpréter les nouveaux événements. Conserver le registre et les reçus, sans réinstaller l'ancien writer sur ces données.

## Vérification

- La provenance PREP-01 retire uniquement les différences exactes du lot sur les six sources historiquement vérifiées avant de vérifier les empreintes originales. Les manifestes précédents restent figés et les modifications étrangères restent refusées.
- 451 tests natifs réussis avec `node --test essai-stitch-v5-famille/tests/*.test.mjs essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs`.
- 8 groupes de contrôles réussis sous PostgreSQL 17.11 avec rôles fictifs et `python3 docs/dobby-v7/runes-lot1/test-postgres.py`. Ce test demande le commit V2 `04c58d9ebaf84374820a5e6a727c45dfa4ee3527` et Docker local. Les installateurs antérieurs sont préparés avec une fixture publique et leurs précontrôles privés de catalogue ne sont pas rejoués. Le précontrôle de la migration de ce lot est exécuté intégralement. Les profils parents, la création du foyer, l'invitation et le lien utilisent les vraies fonctions SQL à partir d'identités Auth fictives.
- Parcours navigateur du journal et des commandes à 320, 390 et 1440 px, historique et dialogue Missions existants, inscription et invitation par fixtures. Le canari Missions V2 à responsable unique contrôle les reçus après réponse perdue et la lecture sur un second compte fictif. Aucune authentification HTTP ou donnée hébergée n'est utilisée.

## Dépendances des lots suivants

Le lot 2 doit faire évoluer le crédit d'une occurrence vers des participations indépendantes par enfant et traiter validation, échéance, expiration et régularisation. L'événement confirmé et son bénéficiaire doivent rester stables pour les corrections. La répartition familiale historique n'est pas le futur modèle de crédit intégral par enfant.

Le lot 3 devra employer le capital net du registre comme source de la décision de seuil transactionnelle, sans second solde. Une baisse sous un seuil non confirmé reverrouille le même objectif. Une récompense déjà confirmée conserve son historique. La confidentialité des récompenses surprise, la confirmation unique et les alertes persistantes restent à réaliser et à tester. La recette Auth réelle des deux nouveaux comptes et la décision GO restent suivies dans #35.
