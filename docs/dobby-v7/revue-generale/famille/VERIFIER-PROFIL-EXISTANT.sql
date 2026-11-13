-- CANDIDAT EN LECTURE SEULE, NON EXÉCUTÉ PAR CODEX.
-- Après examen du schéma réel, remplacer uniquement les trois valeurs fictives
-- dans le seul projet personnel DOBBY. Aucun projet professionnel Portenart.
BEGIN TRANSACTION READ ONLY;
WITH input AS (
 SELECT '00000000-0000-0000-0000-000000000000'::uuid AS household_id,
        '00000000-0000-0000-0000-000000000000'::uuid AS target_user_id,
        'EXEMPLE-ID-ENFANT-A-REMPLACER'::text AS member_id
), profiles AS (
 SELECT e AS profile FROM public.dobby_v2_modules m CROSS JOIN input p,
 LATERAL jsonb_array_elements(coalesce(m.payload->'familyMembers','[]'::jsonb)) e
 WHERE m.household_id=p.household_id AND m.module='family' AND e->>'id'=p.member_id
)
SELECT
 (SELECT count(*) FROM profiles)=1 AS profil_existant_unique,
 (SELECT profile->>'memberCategory' FROM profiles)='child' AS categorie_enfant_sans_promotion,
 EXISTS(SELECT 1 FROM public.dobby_v2_memberships m,input p WHERE m.household_id=p.household_id AND m.user_id=p.target_user_id AND m.active) AS compte_cible_deja_membre_actif,
 NOT EXISTS(SELECT 1 FROM dobby_v7_private.account_links l,input p WHERE (l.household_id=p.household_id AND l.member_id=p.member_id) OR l.user_id=p.target_user_id) AS aucun_lien_concurrent;
-- Les quatre résultats doivent être TRUE pour l'ancienne candidate de liaison.
-- Ce contrôle ne crée ni invitation ciblée ni accès et ne certifie pas les RLS.
ROLLBACK;
