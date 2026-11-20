-- Diagnostic facultatif des images de recettes, à exécuter sur une
-- base autorisée après installation, avec le rôle propriétaire de la table.
-- Les références historiques présentes dans le snapshot sont comptées.
SELECT m.household_id,
       count(*) AS images,
       sum(octet_length(m.data)) AS octets_webp,
       count(*) FILTER (WHERE NOT r.referenced) AS images_preparees,
       coalesce(sum(octet_length(m.data)) FILTER (WHERE NOT r.referenced),0) AS octets_prepares
FROM dobby_socle_private.recipe_media m
CROSS JOIN LATERAL (
  SELECT EXISTS (
    SELECT 1 FROM public.dobby_v2_modules snapshot,
         jsonb_path_query(snapshot.payload,'lax $.**') ref
    WHERE snapshot.household_id=m.household_id AND snapshot.module='recipes'
      AND ref @> jsonb_build_object('key','recipe-media-'||m.sha256,'sha256',m.sha256,'type',m.mime)
  ) AS referenced
) r
GROUP BY m.household_id
ORDER BY octets_webp DESC;
