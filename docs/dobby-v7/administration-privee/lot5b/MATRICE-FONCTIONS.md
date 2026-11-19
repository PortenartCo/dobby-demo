# Matrice des fonctions — preuves encore nécessaires

Les constats de présence/owner/SECURITY DEFINER ci-dessous proviennent de la consigne utilisateur. CODEX n’a exécuté aucune requête SQL hébergée. **21 divergences et 6 correspondances sont annoncées, mais leurs signatures individuelles et leurs corps ne sont pas transmis.** Il serait incorrect de choisir arbitrairement 21 lignes ou de qualifier les 6 autres comme compatibles.

Chaque ligne est donc explicitement **BLOQUÉE pour sa qualification de corps**. Les empreintes ci-dessous restent les références publiées, sans remplacement. Le détail des ACL et des définitions complètes est dans [RECONCILIATION.json](RECONCILIATION.json).

| # | Signature / composant | Corps MD5 de référence | Qualification et impact à vérifier |
| --- | --- | --- | --- |
| 1 | `public.dobby_v7_context()` · V7 | `ba0c44890d06743a2331c885a9739265` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant lecture/contexte/capacité. |
| 2 | `public.dobby_v7_update_profile(jsonb,bigint)` · V7 | `c4915597121f2b1ea01bf2058987481a` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 3 | `public.dobby_v7_create_household(text,uuid)` · V7 | `05c28a810c14312cd1e85cf308ad9991` | **BLOQUÉ** : appartenance aux 21 inconnue ; Droit de création consommé une fois. |
| 4 | `public.dobby_v7_create_invitation(integer,uuid)` · V7 | `7284d04d29735fc60b64593001729cc7` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 5 | `public.dobby_v7_preview_invitation(text)` · V7 | `3bec3bf1ddfde81709d7df7c56dad70a` | **BLOQUÉ** : appartenance aux 21 inconnue ; Réponse neutre hors admission active. |
| 6 | `public.dobby_v7_accept_invitation(text,uuid)` · V7 | `6048f22e8ddf0bf9bb504f10330f269d` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 7 | `public.dobby_v7_revoke_invitation(uuid)` · V7 | `aafacb8a5114e64a764aa2008025c6b9` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 8 | `public.dobby_v7_bind_existing_member(uuid,text,uuid)` · V7 | `a7cfc3b4f1f8f90d15fa68beccb4194c` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 9 | `public.dobby_v7_update_magic(text,jsonb,bigint,uuid)` · V7 | `c16ddf78c573ffda347191c26ceb988c` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 10 | `public.dobby_v7_update_member(text,jsonb,bigint,uuid)` · V7 | `319689a81c90aa39a7c78cec26d1c3ec` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 11 | `public.dobby_v7_create_child_invitation(text,integer,uuid)` · V7 | `3caf902bd54a142dc2d9e7694bd013b0` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 12 | `public.dobby_v7_preview_child_invitation(text)` · V7 | `1ffbe92562691d9d79411a94220fe70d` | **BLOQUÉ** : appartenance aux 21 inconnue ; Réponse neutre hors admission active. |
| 13 | `public.dobby_v7_accept_child_invitation(text,uuid)` · V7 | `dc4a507ef23545435fb1f565e362b984` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 14 | `public.dobby_v7_family_capabilities()` · V7 | `00ffdfdc9ec3b1babb6b0914ab09a188` | **BLOQUÉ** : appartenance aux 21 inconnue ; Drapeaux sans payload privé. |
| 15 | `public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)` · Missions | `8be638a0e9119929db3ea34545d8880a` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 16 | `public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)` · Missions | `1e12a5646770f5f04ffcaa8eeb9f5b35` | **BLOQUÉ** : appartenance aux 21 inconnue ; Alias fermé, aucun nouveau EXECUTE. |
| 17 | `public.dobby_missions_v2_capabilities(uuid)` · Missions | `7319035ed773aad8af54eb6c2d7f7a9a` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant lecture/contexte/capacité. |
| 18 | `public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)` · Missions | `e60f95219aabe2f2ca2ed4346922d6ec` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |
| 19 | `public.dobby_missions_v3_capabilities(uuid)` · Missions | `c6d9fc0c0b62c8963ac35758a93bba6d` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant lecture/contexte/capacité. |
| 20 | `public.dobby_sync_stamper()` · Triggers | `327272bd4b60d1c869558b1f4bd584fd` | **BLOQUÉ** : appartenance aux 21 inconnue ; Trigger natif, garde BEFORE STATEMENT séparée. |
| 21 | `public.dobby_v2_grocery_stamp()` · Triggers | `612358e1c4bd661055818c36fb1479bd` | **BLOQUÉ** : appartenance aux 21 inconnue ; Trigger natif, garde BEFORE STATEMENT séparée. |
| 22 | `public.dobby_v2_modules_stamp()` · Triggers | `5b486d3c6cdef63a32074abb1ceb9e75` | **BLOQUÉ** : appartenance aux 21 inconnue ; Trigger natif, garde BEFORE STATEMENT séparée. |
| 23 | `dobby_socle_private.actor_context(uuid,boolean)` · Socle familial | `d48e72bb46e5864d2bb39bde451da3dc` | **BLOQUÉ** : appartenance aux 21 inconnue ; Identité canonique et ordre des verrous. |
| 24 | `dobby_socle_private.is_parent(uuid)` · Socle familial | `38dc1537cf6c738321f205db9e27f571` | **BLOQUÉ** : appartenance aux 21 inconnue ; Refus inactif sans élargir le foyer. |
| 25 | `dobby_socle_private.can_read(uuid)` · Socle familial | `05141408bf4ae637b333a2e6a5aafcd2` | **BLOQUÉ** : appartenance aux 21 inconnue ; Refus inactif sans élargir le foyer. |
| 26 | `dobby_socle_private.legacy_unlinked()` · Socle familial | `0ba1cda9f3427d826d9673eec01605c8` | **BLOQUÉ** : appartenance aux 21 inconnue ; Refus inactif sans élargir le foyer. |
| 27 | `dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)` · V7 | `c28920c783b07efe39287d6c6fefabfd` | **BLOQUÉ** : appartenance aux 21 inconnue ; Garde avant writer, verrous et replay. |

## Écart EXECUTE du stamper

La référence locale de `public.dobby_sync_stamper()` donne `anon=false`, `authenticated=false`, owner `postgres`, SECURITY INVOKER. La consigne rapporte un écart des droits effectifs ; l’ACL décomposée, les héritages, le type de retour et les triggers réellement attachés restent à lire. **Ne pas révoquer/accorder EXECUTE à l’aveugle.** Si le retour reste `trigger`, un appel SQL/RPC ordinaire n’est pas l’exécution d’un trigger ; cela ne rend pas son corps inoffensif lorsqu’il est déclenché par une écriture. Vérifier la garde de statement, le RLS natif et les éventuels accès privilégiés.

## Douze dépendances Missions retrouvées selon la consigne

Présence hébergée rapportée, définition non disponible dans cette session. Aucun stub ajouté ni corps inventé ; le graphe métier autorisé complet reste BLOQUÉ.

- `dobby_runes_private.assert_event(jsonb,boolean)`
- `dobby_runes_private.assert_ledger(jsonb)`
- `dobby_runes_private.assert_mission(jsonb)`
- `dobby_runes_private.assert_payload(jsonb)`
- `dobby_runes_private.event_key(jsonb)`
- `dobby_runes_private.has_native_text(text)`
- `dobby_runes_private.lock_active_membership(uuid)`
- `dobby_runes_private.request_user_id()`
- `dobby_runes_private.safe_integer(jsonb,text)`
- `dobby_runes_private.same_award(jsonb,jsonb)`
- `dobby_runes_private.utf16_length(text)`
- `dobby_runes_private.valid_date(text)`

Après obtention légitime des éléments : comparer corps et définition entière, attributs, defaults, search_path, owners et ACL ; classer chaque écart en normalisation/correction métier/sécurité/permission ou incompatibilité. Reprendre la définition effectivement approuvée dans une fixture **privée** avant d’ajuster un manifeste de compatibility. Un simple changement de MD5 ne constitue jamais une réconciliation.
