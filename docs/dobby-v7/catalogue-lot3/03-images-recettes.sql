-- Proposition autonome. Exécuter uniquement après validation et sauvegarde.
-- Le writer Recettes existant reste seul propriétaire du contenu et de sa révision.
BEGIN;

GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE,SET TRUE;
GRANT CREATE ON SCHEMA dobby_socle_private,public TO dobby_socle_writer;

CREATE TABLE dobby_socle_private.recipe_media (
  household_id uuid NOT NULL REFERENCES public.dobby_v2_households(id),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  mime text NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  data bytea NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 10485760),
  PRIMARY KEY (household_id,sha256)
);
ALTER TABLE dobby_socle_private.recipe_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dobby_socle_private.recipe_media FROM PUBLIC, anon, authenticated;
ALTER TABLE dobby_socle_private.recipe_media OWNER TO dobby_socle_writer;

-- The private function owner can read the existing Recipes snapshot. The
-- authenticated policies and the native recipe write path stay unchanged.
CREATE POLICY dobby_recipe_media_snapshot_read ON public.dobby_v2_modules
  FOR SELECT TO dobby_socle_writer USING (module='recipes');

SET LOCAL ROLE dobby_socle_writer;

-- A parent uploads only immutable image bytes to their canonical household.
CREATE FUNCTION public.dobby_recipe_media_stage(p_household uuid,p_sha256 text,p_mime text,p_base64 text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bytes bytea;
BEGIN
  IF p_household IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Foyer requis'; END IF;
  PERFORM dobby_socle_private.parent_context(p_household);
  IF p_base64 IS NULL OR length(p_base64)>13981016 OR
     p_sha256 IS NULL OR p_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Image ou empreinte invalide';
  END IF;
  bytes:=decode(p_base64,'base64');
  IF octet_length(bytes) NOT BETWEEN 1 AND 10485760 OR encode(sha256(bytes),'hex')<>p_sha256 OR
     NOT coalesce(CASE p_mime
       WHEN 'image/png' THEN substring(bytes FROM 1 FOR 8)=decode('89504e470d0a1a0a','hex')
       WHEN 'image/jpeg' THEN substring(bytes FROM 1 FOR 3)=decode('ffd8ff','hex')
       WHEN 'image/webp' THEN substring(bytes FROM 1 FOR 4)=decode('52494646','hex') AND substring(bytes FROM 9 FOR 4)=decode('57454250','hex')
     END,false) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Type, taille ou empreinte de l’image invalide';
  END IF;
  INSERT INTO dobby_socle_private.recipe_media(household_id,sha256,mime,data)
    VALUES (p_household,p_sha256,p_mime,bytes) ON CONFLICT (household_id,sha256) DO NOTHING;
  RETURN true;
END $$;

CREATE FUNCTION public.dobby_recipe_media_missing(p_household uuid,p_hashes text[])
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_household IS NULL OR NOT coalesce(dobby_socle_private.is_parent(p_household),false) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Parent canonique du foyer requis';
  END IF;
  IF coalesce(cardinality(p_hashes),0)>40 OR EXISTS (
    SELECT 1 FROM unnest(p_hashes) h WHERE h IS NULL OR h !~ '^[0-9a-f]{64}$'
  ) THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Liste d’empreintes invalide'; END IF;
  RETURN ARRAY(SELECT h FROM unnest(p_hashes) h WHERE NOT EXISTS (
    SELECT 1 FROM dobby_socle_private.recipe_media m WHERE m.household_id=p_household AND m.sha256=h
  ));
END $$;

-- A staged image is never served until the existing Recipes CAS has committed
-- the exact key, digest and MIME association in that household's snapshot.
CREATE FUNCTION public.dobby_recipe_media_read(p_household uuid,p_sha256 text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE binding jsonb;
BEGIN
  IF p_household IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Foyer requis'; END IF;
  binding:=dobby_socle_private.actor_context(p_household,false);
  IF binding->>'phase' IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Membre canonique actif requis';
  END IF;
  RETURN (SELECT jsonb_build_object('type',m.mime,'base64',encode(m.data,'base64'))
    FROM dobby_socle_private.recipe_media m
    JOIN public.dobby_v2_modules r ON r.household_id=m.household_id AND r.module='recipes'
    WHERE m.household_id=p_household AND m.sha256=p_sha256
      AND EXISTS (SELECT 1 FROM jsonb_path_query(r.payload,'lax $.**') AS ref
        WHERE ref @> jsonb_build_object('key','recipe-media-'||m.sha256,'sha256',m.sha256,'type',m.mime)));
END $$;

REVOKE ALL ON FUNCTION public.dobby_recipe_media_stage(uuid,text,text,text),
  public.dobby_recipe_media_missing(uuid,text[]),public.dobby_recipe_media_read(uuid,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dobby_recipe_media_stage(uuid,text,text,text),
  public.dobby_recipe_media_missing(uuid,text[]),public.dobby_recipe_media_read(uuid,text) TO authenticated;

RESET ROLE;
REVOKE CREATE ON SCHEMA dobby_socle_private,public FROM dobby_socle_writer;
GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE,SET FALSE;

COMMIT;
