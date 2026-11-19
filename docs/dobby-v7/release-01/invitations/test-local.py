#!/usr/bin/env python3
"""Real HTTP on a disposable PostgreSQL/PostgREST fixture with no external network."""
import base64
import hashlib
import hmac
import http.client
import io
import json
from pathlib import Path
import subprocess
import time
import uuid

HERE = Path(__file__).resolve().parent
DOCS = HERE.parents[1]
FIXTURE = DOCS / "stitch19-20/supabase"
SOCLE = DOCS / "finalisation-socle/supabase"
PG = "postgres@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4"
REST = "postgrest/postgrest@sha256:c847127074bd26e1b8d3f7c0e6e01e5346f4b85dd34f5d699fd230af960827c0"
V2 = "0a8e1ed674bc4abdbfaca29435fa495b19b32df4"
SECRET = "release-01-invitations-fictional-fixture-only"
SUFFIX = uuid.uuid4().hex[:12]
DB = "dobby-invites-db-" + SUFFIX
API = "dobby-invites-http-" + SUFFIX
HELD = []

def docker(*args, data=None, check=True):
    return subprocess.run(["docker", "--host", "unix:///var/run/docker.sock", *args],
                          input=data, capture_output=True, check=check, timeout=40)

def sql(query, user="postgres", error=None):
    result = docker("exec", "-i", DB, "psql", "-XqAt", "-v", "ON_ERROR_STOP=1",
                    "-v", "VERBOSITY=verbose", "-d", "postgres", "-U", user,
                    data=query.encode(), check=False)
    if error:
        assert result.returncode and error in result.stderr.decode(), result.stderr.decode()
    else:
        assert result.returncode == 0, result.stderr.decode()
    return result.stdout.decode().strip()

def startup(name, *options):
    image = docker("image", "inspect", options[-1], "--format", "{{.Id}}").stdout.decode().strip()
    result = docker("run", "--detach", "--pull=never", "--name", name, *options[:-1], image)
    HELD.append((name, result.stdout.decode().strip()))

def ready(check):
    for _ in range(50):
        if check():
            return
        time.sleep(.1)
    raise AssertionError("Fixture non disponible")

def uid(number):
    return str(uuid.UUID(int=number, version=4))

def quote(value):
    return "'" + str(value).replace("'", "''") + "'"

def signed_jwt(actor):
    def encode(data):
        return base64.urlsafe_b64encode(data).rstrip(b"=")
    header = encode(b'{"alg":"HS256","typ":"JWT"}')
    claims = encode(json.dumps({"sub": uid(actor), "role": "authenticated"}).encode())
    message = header + b"." + claims
    return (message + b"." + encode(hmac.digest(SECRET.encode(), message, "sha256"))).decode()

class ResponseSocket:
    def __init__(self, data):
        self.data = data

    def makefile(self, *_):
        return io.BytesIO(self.data)

def rpc(name, body=None, actor=None, code=None, relation=None, status=403):
    payload = json.dumps(body or {}).encode()
    # Inside the new network-none PostgreSQL namespace, with no host ports.
    headers = [f"POST /rpc/{name} HTTP/1.1", "Host: 127.0.0.1:3000", "Connection: close",
               "Content-Type: application/json", f"Content-Length: {len(payload)}"]
    if actor:
        headers.append("Authorization: Bearer " + signed_jwt(actor))
    request = ("\r\n".join(headers) + "\r\n\r\n").encode() + payload
    result = docker("exec", "-i", DB, "bash", "-c",
                    "exec 3<>/dev/tcp/127.0.0.1/3000; cat >&3; cat <&3", data=request, check=False)
    if not result.stdout:
        raise ConnectionError("PostgREST local indisponible")
    response = http.client.HTTPResponse(ResponseSocket(result.stdout))
    response.begin()
    value = json.loads(response.read())
    if code:
        assert (response.status, value.get("code")) == (status, code), (name, response.status, value.get("code"))
        if relation:
            assert value.get("message") == f"permission denied for table {relation}", value.get("message")
    else:
        assert response.status == 200, (name, response.status, value.get("code"), value.get("message"))
    return value

def install(source, first_statement):
    # Replace only the catalog-fingerprint preflight, since this is a public
    # fictional fixture. Every installed operation and RPC body comes from source.
    preflight, separator, candidate = source.partition(first_statement)
    assert separator and "DO $preflight$" in preflight
    sql("BEGIN;\n" + separator + candidate)

def setup():
    startup(DB, "--network", "none", "--tmpfs", "/var/lib/postgresql/data:rw,size=256m",
            "-e", "POSTGRES_USER=fixture_admin", "-e", "POSTGRES_DB=postgres",
            "-e", "POSTGRES_PASSWORD=fixture-only-pg", PG)
    ready(lambda: docker("exec", DB, "pg_isready", "-h", "127.0.0.1", "-U",
                         "fixture_admin", "-d", "postgres", check=False).returncode == 0)
    sql("""
      CREATE ROLE postgres LOGIN NOSUPERUSER CREATEROLE BYPASSRLS;
      ALTER DATABASE postgres OWNER TO postgres;
      CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'fictional-rest-role';
    """, user="fixture_admin")
    roles, objects = (FIXTURE / "tests/catalog-fixture.sql").read_text().split("CREATE SCHEMA auth;", 1)
    sql(roles + """
      ALTER ROLE dobby_missions_v2_writer NOINHERIT;
      GRANT anon,authenticated TO authenticator;
      GRANT dobby_missions_v2_writer TO postgres WITH ADMIN TRUE, SET TRUE, INHERIT TRUE;
    """, user="fixture_admin")
    sql("CREATE SCHEMA auth;" + objects)
    # The legacy V2 writer's own source fills the private helpers omitted from
    # the catalog fixture. Keep the catalog stamp and unrelated roles as-is.
    v2 = subprocess.check_output(["git", "show", V2 + ":sql-proposals/dobby-shared-runes-v2.sql"],
                                 cwd=HERE, text=True)
    sql(v2)
    # PostgREST supplies request.jwt.claims; keep the Auth helper stand-in local.
    sql("""CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
    $$;""")
    sql((FIXTURE / "01-apply.sql").read_text())
    sql("GRANT dobby_v7_writer TO postgres WITH SET TRUE, INHERIT TRUE;", user="fixture_admin")
    # Model the published Auth fallback using the tracked repair's actor and stamp
    # replacement. The fixture lacks the platform grants and catalog fingerprints.
    sql("""
      ALTER FUNCTION dobby_v7_private.actor() OWNER TO postgres;
      CREATE OR REPLACE FUNCTION dobby_v7_private.actor() RETURNS uuid
      LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
      DECLARE u uuid:=coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
          nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
      BEGIN
        IF u IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Connexion requise'; END IF;
        RETURN u;
      END $$;
      GRANT EXECUTE ON FUNCTION dobby_v7_private.actor() TO dobby_v7_writer;
      DO $$
      BEGIN
        EXECUTE replace(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure),
          E'  ELSE\n    NEW.updated_by := auth.uid();',
          E'  ELSIF current_user=''dobby_v7_writer'' THEN\n    NEW.updated_by := dobby_v7_private.actor();\n  ELSE\n    NEW.updated_by := auth.uid();');
      END $$;
    """)
    install((SOCLE / "family/01-install-family.sql").read_text(), "CREATE ROLE dobby_socle_writer ")
    install((SOCLE / "missions/01-apply.sql").read_text(), "UPDATE dobby_socle_private.install_state ")
    sql("REVOKE dobby_v7_writer FROM postgres;", user="fixture_admin")
    assert sql("""SELECT NOT rolsuper AND NOT pg_has_role(current_user,'dobby_socle_writer','SET')
                  AND NOT pg_has_role(current_user,'dobby_socle_writer','USAGE')
                  FROM pg_roles WHERE rolname=current_user;""") == "t"
    startup(API, "--network", "container:" + DB,
            "-e", "PGRST_DB_URI=postgres://authenticator:fictional-rest-role@127.0.0.1:5432/postgres",
            "-e", "PGRST_DB_ANON_ROLE=anon", "-e", "PGRST_DB_SCHEMAS=public",
            "-e", "PGRST_JWT_SECRET=" + SECRET, REST)
    ready(lambda: docker("exec", DB, "bash", "-c", "true </dev/tcp/127.0.0.1/3000", check=False).returncode == 0)
    print("PostgreSQL " + sql("SHOW server_version;") + " · PostgREST réel dans le namespace sans réseau", flush=True)
    print("EMPREINTES_SOURCE_SANS_CR " + sql("""
      SELECT jsonb_object_agg(p.proname, md5(replace(p.prosrc,chr(13),'')))
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE (n.nspname='public' AND (p.proname ~ '^dobby_v7_(create|accept|preview|revoke).*invitation$'
          OR p.proname='dobby_v7_create_household'))
        OR (n.nspname='dobby_socle_private' AND p.proname IN ('create_invitation','accept_invitation','preview_invitation'));
    """), flush=True)

def op():
    return str(uuid.uuid4())

def create_args(child=None):
    args = {"p_operation_id": op(), "p_expires_in_hours": 24}
    if child:
        args["p_member_id"] = child
    return args

def accept_args(invitation):
    return {"p_operation_id": op(), "p_token": invitation["token"]}

def snapshot():
    tables = ("dobby_v7_private.invitations", "dobby_v7_private.operations", "dobby_v7_private.account_links",
              "dobby_v7_private.pending_profiles", "public.dobby_v2_memberships",
              "public.dobby_v2_households", "public.dobby_v2_modules", "auth.users")
    return [sql("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)), '[]') FROM " + table + " t;")
            for table in tables]

def acl():
    return json.loads(sql("""
      SELECT jsonb_agg(jsonb_build_array(grantee::regrole::text,grantor::regrole::text,
        privilege_type,is_grantable) ORDER BY grantee,grantor,privilege_type)
      FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
      WHERE c.oid='dobby_v7_private.invitations'::regclass;
    """))

def functions():
    return sql("""
      SELECT jsonb_agg(jsonb_build_array(p.oid, p.proowner, p.proacl::text, md5(pg_get_functiondef(p.oid))) ORDER BY p.oid)
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ('public','dobby_socle_private','dobby_v7_private','dobby_runes_private');
    """)

CREATE = "dobby_v7_create_invitation"
ACCEPT = "dobby_v7_accept_invitation"
CREATE_CHILD = "dobby_v7_create_child_invitation"
ACCEPT_CHILD = "dobby_v7_accept_child_invitation"
CONTEXT = "dobby_v7_context"
REVOKE = "dobby_v7_revoke_invitation"

def passed(message):
    print("PASS " + message, flush=True)

def test():
    home = uid(20)
    sql(f"""
      INSERT INTO auth.users(id) VALUES {','.join('(' + quote(uid(i)) + ')' for i in range(1, 10))};
      INSERT INTO public.dobby_v2_households(id,name) VALUES ('{home}','TEST Foyer');
      INSERT INTO public.dobby_v2_memberships(household_id,user_id,role)
        VALUES ('{home}','{uid(1)}','owner'), ('{home}','{uid(2)}','member');
      INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES
        ('{home}','family','{{"familyMembers":[{{"id":"parent-a","memberCategory":"parent","name":"TEST A"}},
          {{"id":"parent-b","memberCategory":"parent","name":"TEST B"}},
          {{"id":"child-used","memberCategory":"child","name":"TEST Enfant"}},
          {{"id":"child-pending","memberCategory":"child","name":"TEST Enfant en attente"}},
          {{"id":"child-new","memberCategory":"child","name":"TEST Enfant nouveau"}}]}}');
      INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id)
        VALUES ('{uid(1)}','{home}','parent-a'), ('{uid(2)}','{home}','parent-b');
    """, user="fixture_admin")
    for actor in (3, 5, 7, 8):
        profile = {"p_profile": {"firstName": "TEST Candidat", "avatarId": "portrait-1"}}
        assert rpc("dobby_v7_update_profile", profile, actor)["phase"] == "household"
    old_create = create_args()
    old_create_child = create_args("child-used")
    used_adult = rpc(CREATE, old_create, 1)
    used_child = rpc(CREATE_CHILD, old_create_child, 1)
    old_accept = accept_args(used_adult)
    old_accept_child = accept_args(used_child)
    assert rpc(ACCEPT, old_accept, 3)["phase"] == "active"
    assert rpc(ACCEPT_CHILD, old_accept_child, 4)["memberId"] == "child-used"
    pending_adult = rpc(CREATE, create_args(), 2)
    pending_child = rpc(CREATE_CHILD, create_args("child-pending"), 2)
    baseline_acl = acl()
    baseline_functions = functions()
    before = snapshot()
    close = (HERE / "01-fermer.sql").read_text()
    rollback = (HERE / "02-restaurer.sql").read_text()
    sql(close, error="Invitation valide en attente")
    assert acl() == baseline_acl and snapshot() == before
    passed("Les quatre RPC fonctionnent avant fermeture. Une invitation valide bloque le script sans effets.")

    expiry = "WHERE id IN (" + ",".join(quote(inv["invitationId"]) for inv in (pending_adult, pending_child)) + ");"
    sql("UPDATE dobby_v7_private.invitations SET expires_at=now()-interval '1 day' " + expiry)
    sql("GRANT UPDATE (accepted_at) ON dobby_v7_private.invitations TO dobby_socle_writer;")
    sql(close, error="Grant de colonne direct inattendu")
    assert acl() == baseline_acl
    assert sql("""SELECT has_column_privilege('dobby_socle_writer', 'dobby_v7_private.invitations',
                'accepted_at', 'UPDATE');""") == "t"
    sql("REVOKE UPDATE (accepted_at) ON dobby_v7_private.invitations FROM dobby_socle_writer;")
    sql("""CREATE ROLE fixture_inherited_grant NOLOGIN;
           GRANT fixture_inherited_grant TO dobby_socle_writer WITH INHERIT TRUE, SET FALSE;""",
        user="fixture_admin")
    sql("GRANT UPDATE (accepted_at) ON dobby_v7_private.invitations TO fixture_inherited_grant;")
    with_inherited_acl = acl()
    sql(close, error="ACL effective inattendue")
    assert acl() == with_inherited_acl
    sql("REVOKE UPDATE (accepted_at) ON dobby_v7_private.invitations FROM fixture_inherited_grant;")
    sql("REVOKE fixture_inherited_grant FROM dobby_socle_writer; DROP ROLE fixture_inherited_grant;",
        user="fixture_admin")
    passed("Droits UPDATE de colonne direct et hérité refusés sans perte des droits d'origine.")
    sql(close)
    assert acl() == [row for row in baseline_acl if not (row[0] == "dobby_socle_writer" and row[2] in ("INSERT", "UPDATE"))]
    assert functions() == baseline_functions
    # Restore future expiration only as fixture owner to exercise the strongest
    # negative case. The guarded cutover itself always rejects pending invitations.
    sql("UPDATE dobby_v7_private.invitations SET expires_at=now()+interval '1 day' " + expiry)
    before = snapshot()
    new_adult = create_args()
    new_child = create_args("child-new")
    pending_accept = accept_args(pending_adult)
    pending_accept_child = accept_args(pending_child)
    for name, args, actor in ((CREATE, new_adult, 1), (CREATE_CHILD, new_child, 2),
                              (ACCEPT, pending_accept, 5), (ACCEPT_CHILD, pending_accept_child, 6),
                              (REVOKE, {"p_invitation_id": pending_adult["invitationId"]}, 1)):
        rpc(name, args, actor, code="42501", relation="invitations")
        assert snapshot() == before, name
    passed("4/4 mutations HTTP refusées (403/42501 sur invitations), sans écriture connexe. Révocation individuelle aussi refusée.")

    for name, prior, actor, invitation in ((CREATE, old_create, 1, used_adult),
                                           (CREATE_CHILD, old_create_child, 1, used_child)):
        replay = rpc(name, prior, actor)
        assert replay["replayed"] and replay["token"] == invitation["token"]
    for name, prior, actor in ((ACCEPT, old_accept, 3), (ACCEPT_CHILD, old_accept_child, 4)):
        assert rpc(name, prior, actor)["replayed"]
        rpc(name, {**prior, "p_operation_id": op()}, actor, code="42501", relation="invitations")
    assert snapshot() == before
    passed("Rejeux avec reçu historique encore lisibles, aucune écriture. Nouveau reçu à partir d’un jeton consommé refusé.")

    for name, invitation in (("dobby_v7_preview_invitation", pending_adult),
                             ("dobby_v7_preview_child_invitation", pending_child)):
        assert rpc(name, {"p_token": invitation["token"]})["status"] == "valid"
    assert snapshot() == before
    passed("Les deux prévisualisations publiques restent lisibles sur un lien de test non expiré.")

    for actor, member_id in ((1, "parent-a"), (2, "parent-b")):
        context = rpc(CONTEXT, actor=actor)
        assert context["phase"] == "active" and context["householdId"] == home and context["memberId"] == member_id
        assert rpc("dobby_missions_v2_capabilities", {"p_household_id": home}, actor)["protocol"] == 2
    assert rpc(CONTEXT, actor=5)["phase"] == "household"
    assert rpc(CONTEXT, actor=6)["phase"] == "profile"
    rpc("dobby_v7_bind_existing_member", {"p_user_id": uid(5), "p_member_id": "child-pending",
                                         "p_operation_id": op()}, 1, code="42501")
    assert snapshot() == before
    result = rpc("dobby_missions_v2_write", {"p_household_id": home, "p_expected_revision": 0,
                 "p_operation_id": op(), "p_payload": {"manualMissions": [], "autoTasks": [],
                 "runeCredits": [], "runeRequests": [], "runeLedgerVersion": 2}}, 2)
    assert result["module"]["revision"] == 1
    after = snapshot()
    assert before[:6] == after[:6]
    passed("Contexte A/B, refus du rattachement V7 historique et écriture réelle Missions V2 conservés.")

    separate = rpc("dobby_v7_create_household", {"p_name": "TEST Foyer indépendant", "p_operation_id": op()}, 7)
    assert separate["phase"] == "active" and separate["householdId"] != home
    assert rpc(CONTEXT, actor=1)["householdId"] == home
    passed("Limite confirmée : un compte Auth préexistant non lié peut créer son propre foyer, sans rejoindre A/B.")

    before = snapshot()
    sql(rollback)
    assert acl() == baseline_acl and functions() == baseline_functions and snapshot() == before
    assert rpc(CREATE, new_adult, 1)["replayed"] is False
    assert rpc(CREATE_CHILD, new_child, 2)["replayed"] is False
    assert rpc(ACCEPT, pending_accept, 5)["phase"] == "active"
    assert rpc(ACCEPT_CHILD, pending_accept_child, 6)["memberId"] == "child-pending"
    assert rpc(REVOKE, {"p_invitation_id": pending_adult["invitationId"]}, 1)["revoked"]
    passed("Rollback ACL exact, sans écriture sur les données. Les quatre mutations et la révocation refonctionnent.")

if __name__ == "__main__":
    try:
        setup()
        test()
    finally:
        for _, container_id in reversed(HELD):
            docker("rm", "--force", "--volumes", container_id, check=False)
