"""Load the actual native Family routines into the disposable Santé catalog."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOCLE = (HERE.parent / 'finalisation-socle/supabase/family/01-install-family.sql').read_text()
STITCH = (HERE.parent / 'stitch19-20/supabase/01-apply.sql').read_text()


def native_function(source, signature):
    start = source.index(f'CREATE FUNCTION {signature}(')
    end = source.index('$$;', start) + 3
    return source[start:end]


def install_family_fixture(sql):
    sql('''
      CREATE ROLE dobby_v7_writer NOLOGIN NOSUPERUSER NOBYPASSRLS;
      ALTER TABLE public.dobby_v2_modules ALTER COLUMN revision SET DEFAULT 1;
      ALTER TABLE public.dobby_v2_households ADD COLUMN name text NOT NULL DEFAULT 'TEST';
      ALTER TABLE dobby_socle_private.install_state ADD COLUMN family_api_enabled boolean NOT NULL DEFAULT true;
      CREATE TABLE dobby_v7_private.operations (
        actor_id uuid NOT NULL, operation_id uuid NOT NULL, kind text NOT NULL,
        request_digest bytea NOT NULL, result jsonb NOT NULL, PRIMARY KEY (actor_id, operation_id)
      );
      CREATE TABLE dobby_v7_private.install_secret (singleton boolean PRIMARY KEY, secret bytea NOT NULL);
      INSERT INTO dobby_v7_private.install_secret VALUES(true, sha256(convert_to('TEST fixture only', 'UTF8')));
      CREATE TABLE dobby_v7_private.invitations (
        id uuid PRIMARY KEY, household_id uuid NOT NULL, created_by uuid NOT NULL, token_hash bytea UNIQUE,
        expires_at timestamptz NOT NULL, revoked_at timestamptz, accepted_by uuid, accepted_at timestamptz,
        target_member_id text, invitation_kind text NOT NULL DEFAULT 'member'
      );
      ALTER TABLE dobby_v7_private.account_links ADD UNIQUE (household_id, member_id);
      DROP FUNCTION dobby_socle_private.members(jsonb);
    ''')
    definitions = []
    for schema, owner, source, methods in (
        ('dobby_v7_private', 'dobby_v7_writer', STITCH, (
            'members', 'validate_profile', 'patch_profile', 'add_pending_member',
            'lock_actor', 'digest', 'operation', 'receipt',
        )),
        ('dobby_socle_private', 'dobby_socle_writer', SOCLE, (
            'members', 'validate_profile', 'patch_profile', 'add_pending_member',
            'lock_actor', 'digest', 'operation', 'receipt', 'invitation_token', 'actor_context',
            'is_parent', 'parent_context', 'assert_child_api_enabled',
            'create_invitation', 'preview_invitation', 'accept_invitation', 'can_read', 'legacy_unlinked',
        )),
        ('dobby_v7_private', 'dobby_socle_writer', SOCLE, ('assert_snapshot', 'guard_family')),
        ('public', 'dobby_v7_writer', STITCH, ('dobby_v7_create_household',)),
        ('public', 'dobby_socle_writer', SOCLE, (
            'dobby_v7_context', 'dobby_v7_create_invitation', 'dobby_v7_accept_invitation',
            'dobby_v7_create_child_invitation', 'dobby_v7_preview_child_invitation', 'dobby_v7_accept_child_invitation',
        )),
    ):
        for name in methods:
            function = native_function(source, f'{schema}.{name}')
            # The Health fixture may already hold some resolver functions.
            function = function.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 1)
            definitions.extend((
                function,
                f'ALTER FUNCTION {schema}.{name} OWNER TO {owner};',
                f'REVOKE ALL ON FUNCTION {schema}.{name} FROM PUBLIC, anon, authenticated, service_role;',
            ))
    sql('\n'.join(definitions))
    sql('''
      GRANT USAGE ON SCHEMA dobby_v7_private TO authenticated, dobby_v7_writer;
      GRANT USAGE ON SCHEMA dobby_socle_private TO authenticated;
      GRANT EXECUTE ON FUNCTION dobby_v7_private.actor() TO dobby_v7_writer, dobby_socle_writer;
      GRANT EXECUTE ON FUNCTION dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb) TO authenticated;
      GRANT EXECUTE ON FUNCTION dobby_v7_private.guard_family() TO authenticated;
      GRANT EXECUTE ON FUNCTION dobby_socle_private.is_parent(uuid), dobby_socle_private.can_read(uuid),
        dobby_socle_private.legacy_unlinked() TO authenticated;
      GRANT EXECUTE ON FUNCTION public.dobby_v7_context() TO authenticated, dobby_v7_writer;
      GRANT EXECUTE ON FUNCTION public.dobby_v7_create_household(text,uuid), public.dobby_v7_create_invitation(integer,uuid),
        public.dobby_v7_accept_invitation(text,uuid), public.dobby_v7_create_child_invitation(text,integer,uuid),
        public.dobby_v7_preview_child_invitation(text), public.dobby_v7_accept_child_invitation(text,uuid) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.dobby_v7_preview_child_invitation(text) TO anon;
      GRANT SELECT, INSERT, UPDATE ON public.dobby_v2_modules TO dobby_v7_writer, dobby_socle_writer, authenticated;
      GRANT SELECT, INSERT ON public.dobby_v2_households TO dobby_v7_writer;
      GRANT SELECT ON public.dobby_v2_households TO dobby_socle_writer;
      GRANT SELECT, INSERT, UPDATE ON public.dobby_v2_memberships TO dobby_v7_writer, dobby_socle_writer;
      GRANT SELECT, INSERT, DELETE ON dobby_v7_private.pending_profiles TO dobby_v7_writer, dobby_socle_writer;
      GRANT UPDATE (profile) ON dobby_v7_private.pending_profiles TO dobby_v7_writer, dobby_socle_writer;
      GRANT SELECT, INSERT ON dobby_v7_private.account_links, dobby_v7_private.operations TO dobby_v7_writer, dobby_socle_writer;
      GRANT SELECT, INSERT, UPDATE ON dobby_v7_private.invitations TO dobby_socle_writer;
      GRANT SELECT ON dobby_v7_private.install_secret TO dobby_socle_writer;
      GRANT UPDATE (singleton) ON dobby_socle_private.install_state TO dobby_socle_writer;
      CREATE POLICY fixture_stitch_modules ON public.dobby_v2_modules TO dobby_v7_writer USING (module = 'family');
      CREATE POLICY fixture_adopted_modules ON public.dobby_v2_modules TO authenticated
        USING (household_id::text = public.dobby_v7_context()->>'householdId');
      CREATE TRIGGER dobby_v7_family_guard BEFORE INSERT OR UPDATE OR DELETE ON public.dobby_v2_modules
        FOR EACH ROW EXECUTE FUNCTION dobby_v7_private.guard_family();
    ''')
