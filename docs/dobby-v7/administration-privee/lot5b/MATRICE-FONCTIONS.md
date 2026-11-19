# Matrice du catalogue — finalisation du 19 novembre 2026

La qualification hébergée ci-dessous est **rapportée par ChatGPT via l’utilisateur**. CODEX n’a lu aucun corps privé et n’a effectué aucun appel Supabase pendant cette finalisation. Les tests CODEX portent sur la liste fermée d’approbation et le catalogue local publié.

**21 différences textuelles qualifiées comme équivalentes lexicalement**, avec commentaires/espaces/casse des identifiants non délimités ignorés et littéraux préservés par la comparaison rapportée. Aucun normaliseur ni assouplissement de comparaison n’est exécuté par le précontrôle : les deux MD5 doivent appartenir à une même paire explicitement reconnue.

| # | Signature / composant | MD5 corps hébergé fourni | MD5 définition hébergée fournie | Qualification |
| --- | --- | --- | --- | --- |
| 1 | `public.dobby_v7_context()` · V7 | Non fourni individuellement | Non fourni | Corps identique rapporté ; paire de référence seule reconnue |
| 2 | `public.dobby_v7_update_profile(jsonb,bigint)` · V7 | `34be4ec3886d86b4f50227c55f9c18d1` | `e9cd180c42b172de4bb6e3087d35d2e0` | Différence textuelle ; équivalence lexicale rapportée |
| 3 | `public.dobby_v7_create_household(text,uuid)` · V7 | `54228b41c9101243098de608e9c36fba` | `4b92f7429be05ecae44e03965793958c` | Différence textuelle ; équivalence lexicale rapportée |
| 4 | `public.dobby_v7_create_invitation(integer,uuid)` · V7 | Non fourni individuellement | Non fourni | Corps identique rapporté ; paire de référence seule reconnue |
| 5 | `public.dobby_v7_preview_invitation(text)` · V7 | Non fourni individuellement | Non fourni | Corps identique rapporté ; paire de référence seule reconnue |
| 6 | `public.dobby_v7_accept_invitation(text,uuid)` · V7 | Non fourni individuellement | Non fourni | Corps identique rapporté ; paire de référence seule reconnue |
| 7 | `public.dobby_v7_revoke_invitation(uuid)` · V7 | `6ef6ac479b3683ecc8e72effd9def686` | `176afdf0ffb1f495aa35712f1a79917b` | Différence textuelle ; équivalence lexicale rapportée |
| 8 | `public.dobby_v7_bind_existing_member(uuid,text,uuid)` · V7 | `f4516255573304a3e845d267288c02e4` | `f5122d579f0e00142d3fa9aedb504467` | Différence textuelle ; équivalence lexicale rapportée |
| 9 | `public.dobby_v7_update_magic(text,jsonb,bigint,uuid)` · V7 | `4adbf459e416a3c237d94d7a3c97b998` | `5511f41b0a217af72a129b0bcbe406b3` | Différence textuelle ; équivalence lexicale rapportée |
| 10 | `public.dobby_v7_update_member(text,jsonb,bigint,uuid)` · V7 | `bc5480cd38c04443320a044df2c40505` | `dcee241ca6a37d9342ccdde37534250a` | Différence textuelle ; équivalence lexicale rapportée |
| 11 | `public.dobby_v7_create_child_invitation(text,integer,uuid)` · V7 | `f23e8a78d027398c648f5079c0b7e1d9` | `8e137a6adc0606f964b29922835e90f5` | Différence textuelle ; équivalence lexicale rapportée |
| 12 | `public.dobby_v7_preview_child_invitation(text)` · V7 | Non fourni individuellement | Non fourni | Corps identique rapporté ; paire de référence seule reconnue |
| 13 | `public.dobby_v7_accept_child_invitation(text,uuid)` · V7 | Non fourni individuellement | Non fourni | Corps identique rapporté ; paire de référence seule reconnue |
| 14 | `public.dobby_v7_family_capabilities()` · V7 | `009915f94fb69d9eca749f76d6d798cc` | `c8946b6cc1cd45c79221fef852d18d67` | Différence textuelle ; équivalence lexicale rapportée |
| 15 | `public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)` · Missions | `c19d7250d6d1c0170746f190cc37a91f` | `183463fe1a9ed008d109495eb125fb00` | Différence textuelle ; équivalence lexicale rapportée |
| 16 | `public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)` · Missions | `fc8629bb62607cda0d0e1fb70d76606e` | `b4d3770d04a83a20472497cbc54d6d0b` | Différence textuelle ; équivalence lexicale rapportée |
| 17 | `public.dobby_missions_v2_capabilities(uuid)` · Missions | `dcc7672defff4a40edaa41d345bff93b` | `7ae3285e2ad55c7b6fe6274600fc4964` | Différence textuelle ; équivalence lexicale rapportée |
| 18 | `public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)` · Missions | `e08b19bb97d0b56dece38ccb45f13e4a` | `b08e3e6608c570db021dea360413e793` | Différence textuelle ; équivalence lexicale rapportée |
| 19 | `public.dobby_missions_v3_capabilities(uuid)` · Missions | `02c7e27105c537f69479c71b452b9e8c` | `aabcc749a98abc42b7edd0b4e68b18b7` | Différence textuelle ; équivalence lexicale rapportée |
| 20 | `public.dobby_sync_stamper()` · Triggers | `fa45e3e11adc285d0aea62d8d8ece43b` | `e26ca6808eb54035f23c083ca87b53b7` | Différence textuelle ; équivalence lexicale rapportée ; exception ACL bornée ci-dessous |
| 21 | `public.dobby_v2_grocery_stamp()` · Triggers | `ed50edec2a5405ffc2695b80ddd676f4` | `ee36503542de1162beba0eed99ac4874` | Différence textuelle ; équivalence lexicale rapportée |
| 22 | `public.dobby_v2_modules_stamp()` · Triggers | `797d1c401fd7794e9b11346b583a00e0` | `af31219b7511ffc379184c68d5b4744a` | Différence textuelle ; équivalence lexicale rapportée avec correction explicite du harnais Lot 2A |
| 23 | `dobby_socle_private.actor_context(uuid,boolean)` · Socle familial | `61404767b69ee7d011abca3b12b6a33c` | `637e061b764e9dce6b692bb646870c36` | Différence textuelle ; équivalence lexicale rapportée |
| 24 | `dobby_socle_private.is_parent(uuid)` · Socle familial | `c8ffd486d81385ea26bc087b53602c95` | `62e96e71a893d394948bac85c11ca35a` | Différence textuelle ; équivalence lexicale rapportée |
| 25 | `dobby_socle_private.can_read(uuid)` · Socle familial | `b281e880ccfabd6c6a9d8e2ceb442202` | `1ce26b3479aea7e992d2047cecb0006b` | Différence textuelle ; équivalence lexicale rapportée |
| 26 | `dobby_socle_private.legacy_unlinked()` · Socle familial | `93e44c5b1ec3ace5a6fa4cb0be835d6c` | `e6228c783c43d534aae7df7406f210aa` | Différence textuelle ; équivalence lexicale rapportée |
| 27 | `dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)` · V7 | `02f2de08010befdde4d85ce88e13b689` | `16d06586efdbfe90e4b61986c37468a4` | Différence textuelle ; équivalence lexicale rapportée |

Les 27 propriétaires, SECURITY DEFINER, langages, volatilités, configurations et arguments sont conformes selon la preuve rapportée. Les références et paires complètes sont dans [RECONCILIATION.json](RECONCILIATION.json) et la [liste d’approbation](../../../../supabase/compatibility/lot5b/approved-catalogue.json). Pour les six sans nouvelle ligne serveur, aucune empreinte de définition hébergée n’est inventée : une différence supplémentaire serait refusée.

## Stamper : ACL qualifiée

`public.dobby_sync_stamper()` reste SECURITY INVOKER, retourne `trigger` et possède une attache selon la lecture rapportée. Son EXECUTE pour anon/authenticated diffère de la fixture fermée. Le précontrôle reconnaît uniquement les deux ACL exactes : owner seul, ou owner + EXECUTE direct sans délégation pour ces deux rôles. PUBLIC, grant option, service_role et tout autre ajout sont refusés. L’attache active est exigée. Aucun ACL ni trigger n’est modifié par la variante.

Le test physique sur la définition publique montre qu’un appel SQL direct échoue et que la révocation directe optionnelle ne casse pas les écritures via le trigger déjà attaché. Une révocation ciblée peut donc être proposée comme durcissement facultatif après contrôle de l’ACL réelle ; elle n’est pas nécessaire à l’équivalence métier et n’est pas appliquée. EXECUTE intervient notamment à la création d’un trigger : ne pas garantir les futurs installers tiers sans revue.

## Douze références Missions

Les 12 correspondances suivantes sont rapportées par ChatGPT ; les MD5 proviennent du manifeste public `missions/01-apply.sql`. Les définitions privées n’ont pas été obtenues ou inventées et restent absentes de la fixture complète. La candidate vérifie ces définitions avant toute écriture, sans rejouer l’installateur natif.

| Signature | MD5 pg_get_functiondef approuvé |
| --- | --- |
| `dobby_runes_private.assert_event(jsonb,boolean)` | `143d7eee03b39cd641adc44d5463c98b` |
| `dobby_runes_private.assert_ledger(jsonb)` | `97ca8fc4f7a90da7ab9424d8061eb9c7` |
| `dobby_runes_private.assert_mission(jsonb)` | `a1a81757d2fa0083204a79ecd9f50388` |
| `dobby_runes_private.assert_payload(jsonb)` | `fd72b697c15961425a22da79c4495d1a` |
| `dobby_runes_private.event_key(jsonb)` | `546b184d13d15d74814a2e4a1eee09c1` |
| `dobby_runes_private.has_native_text(text)` | `339a898b0c8c47fcb6f2ef0fd168dbb6` |
| `dobby_runes_private.lock_active_membership(uuid)` | `fbf50ad8e900c6ca1f360038a8abce37` |
| `dobby_runes_private.request_user_id()` | `d6c6cd4743fa2d32d6994d2bf382679c` |
| `dobby_runes_private.safe_integer(jsonb,text)` | `0b7cf60ae2d30086d30bf036eae0e8f5` |
| `dobby_runes_private.same_award(jsonb,jsonb)` | `e43e606d434d8b1e15fe330d83741f42` |
| `dobby_runes_private.utf16_length(text)` | `e2570931d23e3fdbffe397c971df9a31` |
| `dobby_runes_private.valid_date(text)` | `1b25324883b40c6d4e62c15c7a565a58` |

Aucune incompatibilité métier démontrée par ces 21 différences. La recette intégrale Missions et les droits gérés Auth/Storage demeurent distincts et non démontrés.
