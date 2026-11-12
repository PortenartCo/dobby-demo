-- OPTIONNEL : premier propriétaire historique, sélection HUMAINE explicite.
-- Exécuter sous le même rôle d'installation que 01-apply.sql, jamais côté client.
-- Projet familial seulement. Remplacer les TROIS NULL; aucune déduction par nom.
-- UUID du compte : Authentication > Users. ID TEXTE natif : familyMembers[].id.
-- Aucun profil, foyer, rôle ou contenu de module n'est modifié.
BEGIN;
SET LOCAL lock_timeout='5s';
SELECT dobby_v7_private.link_existing_owner(
  NULL::uuid, -- compte Auth réellement identifié
  NULL::uuid, -- foyer réellement identifié
  NULL::text  -- ID TEXTE exact du profil natif existant
);
COMMIT;
