-- DOBBY personnel : UNE exécution MANUELLE, diagnostic uniquement.
-- Aucun install/repair, appel RPC, profil, compte Auth, jeton ou secret lu.
-- Sources = code enregistré dans pg_catalog, jamais exécution de ce code.
-- Une erreur de permission doit rester une erreur : aucun EXCEPTION/catch.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
SET LOCAL search_path = pg_catalog;
SET LOCAL jit = off;

WITH RECURSIVE
relation_names(schema_name, object_name) AS (VALUES
 ('public','dobby_v2_grocery'), ('public','dobby_v2_modules'),
 ('public','dobby_v2_memberships'), ('public','dobby_v2_households'),
 ('public','dobby_sync_grocery_items'), ('public','dobby_sync_members'),
 ('dobby_v7_private','account_links'), ('dobby_v7_private','invitations'),
 ('dobby_v7_private','operations'), ('dobby_v7_private','pending_profiles'),
 ('dobby_runes_private','operations'), ('storage','objects')
),
relations AS MATERIALIZED (
 SELECT c.*, n.nspname AS schema_name
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname,c.relname) IN (SELECT * FROM relation_names)
    OR (n.nspname='dobby_runes_private' AND c.relkind IN ('r','p'))
),
triggers AS MATERIALIZED (
 SELECT t.* FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid
 WHERE NOT t.tgisinternal
),
policies AS MATERIALIZED (
 SELECT p.* FROM pg_policy p JOIN relations r ON r.oid=p.polrelid
),
-- Only these two DOBBY private services can contribute source definitions.
-- public helpers enter through DOBBY entry points, triggers, policies or edges.
candidate_functions AS MATERIALIZED (
 SELECT p.*, n.nspname AS schema_name FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE p.prokind IN ('f','p')
   AND n.nspname IN ('public','dobby_runes_private','dobby_v7_private')
),
text_calls AS MATERIALIZED (
 SELECT p.oid AS caller, m[1] AS schema_name, m[2] AS function_name
 FROM candidate_functions p CROSS JOIN LATERAL regexp_matches(
   replace(p.prosrc,'"',''),
   '\m([a-zA-Z_][a-zA-Z_0-9]*)[[:space:]]*\.[[:space:]]*([a-zA-Z_][a-zA-Z_0-9]*)[[:space:]]*\(', 'g') m
),
edges AS MATERIALIZED (
 SELECT d.objid AS caller,d.refobjid AS callee,'pg_depend'::text AS mechanism
 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.refclassid='pg_proc'::regclass
 UNION
 SELECT t.caller,p.oid,'qualified_source_call' FROM text_calls t
 JOIN pg_proc p ON p.proname=t.function_name
 JOIN pg_namespace n ON n.oid=p.pronamespace AND n.nspname=t.schema_name
 WHERE p.prokind IN ('f','p')
),
seeds AS (
 SELECT p.oid FROM candidate_functions p WHERE
   p.schema_name='dobby_runes_private'
   OR (p.schema_name='public' AND (p.proname LIKE 'dobby\_missions\_v2\_%' ESCAPE '\'
      OR p.proname LIKE 'dobby\_missions\_v3\_%' ESCAPE '\'
      OR p.proname LIKE 'dobby\_v2\_%' ESCAPE '\'
      OR p.proname LIKE 'dobby\_v7\_%' ESCAPE '\'))
   OR (p.schema_name='dobby_v7_private' AND p.proname IN
      ('actor','lock_actor','owner_context','operation','receipt','digest','members',
       'validate_profile','patch_profile','add_pending_member','assert_snapshot','guard_family'))
 UNION SELECT tgfoid FROM triggers
 UNION SELECT d.refobjid FROM pg_depend d JOIN policies p ON p.oid=d.objid
   WHERE d.classid='pg_policy'::regclass AND d.refclassid='pg_proc'::regclass
),
reachable(oid) AS (
 SELECT p.oid FROM seeds s JOIN candidate_functions p ON p.oid=s.oid
 UNION
 SELECT p.oid FROM reachable r JOIN edges e ON e.caller=r.oid
 JOIN candidate_functions p ON p.oid=e.callee
),
functions AS MATERIALIZED (
 SELECT p.* FROM candidate_functions p JOIN reachable r ON r.oid=p.oid
),
role_names(role_name) AS (VALUES
 ('anon'),('authenticated'),('service_role'),('dobby_missions_v2_writer'),
 ('dobby_missions_v3_writer'),('dobby_v7_writer'),('dobby_v7_installer_tmp')
),
schema_names(schema_name) AS (VALUES
 ('public'),('dobby_runes_private'),('dobby_v7_private'),('auth'),('storage')
),
acl_role_ids(oid) AS (
 SELECT a.grantee FROM relations r CROSS JOIN LATERAL aclexplode(r.relacl) a
 UNION SELECT a.grantor FROM relations r CROSS JOIN LATERAL aclexplode(r.relacl) a
 UNION SELECT a.grantee FROM pg_attribute c JOIN relations r ON r.oid=c.attrelid CROSS JOIN LATERAL aclexplode(c.attacl) a
 UNION SELECT a.grantor FROM pg_attribute c JOIN relations r ON r.oid=c.attrelid CROSS JOIN LATERAL aclexplode(c.attacl) a
 UNION SELECT a.grantee FROM functions f CROSS JOIN LATERAL aclexplode(f.proacl) a
 UNION SELECT a.grantor FROM functions f CROSS JOIN LATERAL aclexplode(f.proacl) a
 UNION SELECT a.grantee FROM pg_proc f JOIN triggers t ON t.tgfoid=f.oid CROSS JOIN LATERAL aclexplode(f.proacl) a
 UNION SELECT a.grantor FROM pg_proc f JOIN triggers t ON t.tgfoid=f.oid CROSS JOIN LATERAL aclexplode(f.proacl) a
 UNION SELECT a.grantee FROM pg_namespace n JOIN schema_names s ON s.schema_name=n.nspname CROSS JOIN LATERAL aclexplode(n.nspacl) a
 UNION SELECT a.grantor FROM pg_namespace n JOIN schema_names s ON s.schema_name=n.nspname CROSS JOIN LATERAL aclexplode(n.nspacl) a
 UNION SELECT a.grantee FROM sequences s CROSS JOIN LATERAL aclexplode(s.relacl) a
 UNION SELECT a.grantor FROM sequences s CROSS JOIN LATERAL aclexplode(s.relacl) a
),
role_seeds(oid) AS (
 SELECT oid FROM pg_roles WHERE rolname IN (SELECT role_name FROM role_names)
 UNION SELECT relowner FROM relations UNION SELECT proowner FROM functions
 UNION SELECT p.proowner FROM pg_proc p JOIN triggers t ON t.tgfoid=p.oid
 UNION SELECT n.nspowner FROM pg_namespace n JOIN schema_names s ON s.schema_name=n.nspname
 UNION SELECT oid FROM acl_role_ids WHERE oid<>0
 UNION SELECT unnest(polroles) FROM policies
),
-- Both directions, to a fixed point: no indirect grantee/member is silently lost.
role_closure(oid) AS (
 SELECT oid FROM role_seeds WHERE oid<>0
 UNION
 SELECT CASE WHEN m.roleid=r.oid THEN m.member ELSE m.roleid END
 FROM role_closure r JOIN pg_auth_members m ON m.roleid=r.oid OR m.member=r.oid
),
roles AS MATERIALIZED (
 SELECT r.oid,r.rolname,r.rolcanlogin,r.rolsuper,r.rolbypassrls,r.rolinherit,
   r.rolcreaterole,r.rolcreatedb,r.rolreplication
 FROM pg_roles r WHERE r.oid IN (SELECT oid FROM role_closure) OR r.rolname=current_user
),
expected_functions(schema_name,function_name) AS (VALUES
 ('public','dobby_missions_v2_write'),('public','dobby_missions_v2_capabilities'),
 ('public','dobby_missions_v3_write'),('public','dobby_missions_v3_capabilities'),
 ('public','dobby_v2_modules_stamp'),('public','dobby_v2_grocery_stamp'),
 ('public','dobby_v7_context'),('public','dobby_v7_create_invitation'),
 ('public','dobby_v7_accept_invitation'),('public','dobby_v7_bind_existing_member'),
 ('public','dobby_v7_update_member'),('public','dobby_v7_update_magic'),
 ('public','dobby_v7_create_child_invitation'),('public','dobby_v7_accept_child_invitation'),
 ('public','dobby_v7_invite_existing_member'),
 ('dobby_runes_private','guard_missions'),('dobby_runes_private','assert_payload'),
 ('dobby_runes_private','assert_ledger'),('dobby_runes_private','same_award'),
 ('dobby_runes_private','event_key'),('dobby_runes_private','request_user_id'),
 ('dobby_runes_private','lock_active_membership'),
 ('dobby_v7_private','actor'),('dobby_v7_private','guard_family'),
 ('dobby_v7_private','assert_snapshot')
),
sequences AS MATERIALIZED (
 SELECT DISTINCT s.*,n.nspname AS schema_name FROM pg_class s
 JOIN pg_namespace n ON n.oid=s.relnamespace
 WHERE s.relkind='S' AND (n.nspname='dobby_runes_private' OR EXISTS (
   SELECT FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=s.oid
     AND d.refclassid='pg_class'::regclass AND d.refobjid IN (SELECT oid FROM relations)
 ) OR EXISTS (
   SELECT FROM pg_depend d JOIN pg_attrdef a ON a.oid=d.objid
   WHERE d.classid='pg_attrdef'::regclass AND d.refclassid='pg_class'::regclass
     AND d.refobjid=s.oid AND a.adrelid IN (SELECT oid FROM relations)
 ))
)
SELECT jsonb_build_object(
 'diagnostic','dobby-v7-reserves-serveur-v1',
 'safety',jsonb_build_object('transactionReadOnly',current_setting('transaction_read_only'),
   'isolation',current_setting('transaction_isolation'),
   'statementTimeout',current_setting('statement_timeout'),'lockTimeout',current_setting('lock_timeout'),
   'jit',current_setting('jit'),
   'idleTransactionTimeout',current_setting('idle_in_transaction_session_timeout'),
   'businessRowsRead',false,'businessFunctionsCalled',false,'permissionErrorsSuppressed',false),
 'serverVersion',current_setting('server_version'),
 'executionRole',current_user,
 'roleClosure',jsonb_build_object('scope','Rôles connus, propriétaires, ACL/politiques ciblées et fermeture transitive des appartenances dans les deux sens.',
   'unresolvedRoleOids',coalesce((SELECT jsonb_agg(c.oid ORDER BY c.oid) FROM role_closure c LEFT JOIN pg_roles r ON r.oid=c.oid WHERE r.oid IS NULL),'[]'::jsonb)),
 'limits',jsonb_build_array(
   'Catalogue seulement : ne certifie pas les données, les buckets, les droits métier ni un parcours réel.',
   'Dépendances : pg_depend et appels qualifiés dans les sources ; SQL dynamique/appels non qualifiés à examiner dans les corps.',
   'Les noms child/existing-member attendus sont indicatifs ; toutes les RPC publiques DOBBY V7 présentes figurent dans functions.',
   'Aucune migration V3 ni invitation ciblée déclarée installée ou opérationnelle par ce diagnostic.'),
 'groceryAvailability',jsonb_build_object(
   'columnState',CASE
     WHEN NOT EXISTS(SELECT FROM relations WHERE schema_name='public' AND relname='dobby_v2_grocery') THEN 'table_absente'
     WHEN NOT EXISTS(SELECT FROM pg_attribute a JOIN relations r ON r.oid=a.attrelid
       WHERE r.schema_name='public' AND r.relname='dobby_v2_grocery' AND a.attname='at_home_quantity' AND NOT a.attisdropped) THEN 'colonne_absente'
     WHEN EXISTS(SELECT FROM pg_attribute a JOIN relations r ON r.oid=a.attrelid
       LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
       WHERE r.schema_name='public' AND r.relname='dobby_v2_grocery' AND a.attname='at_home_quantity'
         AND NOT a.attisdropped AND a.atttypid='numeric'::regtype AND a.atttypmod=-1 AND a.attnotnull
         AND coalesce(pg_get_expr(d.adbin,d.adrelid),'') ~ '^\(?0\)?(::numeric)?$') THEN 'compatible'
     ELSE 'incompatible' END,
   'rangeState',CASE
     WHEN NOT EXISTS(SELECT FROM pg_constraint x JOIN relations r ON r.oid=x.conrelid
       WHERE r.schema_name='public' AND r.relname='dobby_v2_grocery' AND x.conname='dobby_v2_grocery_at_home_quantity_range') THEN 'absente'
     WHEN EXISTS(SELECT FROM pg_constraint x JOIN relations r ON r.oid=x.conrelid
       WHERE r.schema_name='public' AND r.relname='dobby_v2_grocery' AND x.conname='dobby_v2_grocery_at_home_quantity_range'
         AND x.contype='c' AND x.convalidated AND pg_get_expr(x.conbin,x.conrelid)=
          '((at_home_quantity >= (0)::numeric) AND (at_home_quantity <= (999999)::numeric))') THEN 'canonique_validee'
     ELSE 'incompatible_ou_non_validee' END,
   'meaning','Contrat de métadonnées seulement : examiner les droits, RLS et corps des triggers ; aucun test métier/CAS exécuté.'),
 'presence',jsonb_build_object(
   'relations',(SELECT jsonb_agg(jsonb_build_object('schema',e.schema_name,'name',e.object_name,
       'present',EXISTS(SELECT FROM relations r WHERE r.schema_name=e.schema_name AND r.relname=e.object_name))
       ORDER BY e.schema_name,e.object_name) FROM relation_names e),
   'functions',(SELECT jsonb_agg(jsonb_build_object('schema',e.schema_name,'name',e.function_name,
       'present',EXISTS(SELECT FROM functions p WHERE p.schema_name=e.schema_name AND p.proname=e.function_name))
       ORDER BY e.schema_name,e.function_name) FROM expected_functions e),
   'roles',(SELECT jsonb_agg(jsonb_build_object('name',e.role_name,'present',EXISTS(
       SELECT FROM roles r WHERE r.rolname=e.role_name)) ORDER BY e.role_name) FROM role_names e)),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',e.schema_name,'present',n.oid IS NOT NULL,
   'owner',pg_get_userbyid(n.nspowner),'acl',n.nspacl,
   'effectivePrivileges',coalesce((SELECT jsonb_agg(jsonb_build_object('role',r.rolname,
     'usage',has_schema_privilege(r.oid,n.oid,'USAGE'),'create',has_schema_privilege(r.oid,n.oid,'CREATE'))
     ORDER BY r.rolname) FROM roles r WHERE n.oid IS NOT NULL),'[]'::jsonb)) ORDER BY e.schema_name)
   FROM schema_names e LEFT JOIN pg_namespace n ON n.nspname=e.schema_name),
 'relations',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'schema',c.schema_name,'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
   'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'acl',c.relacl,
   'aclExpanded',coalesce((SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC'
       ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),
       'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type)
     FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a),'[]'::jsonb),
   'effectivePrivileges',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,
     'select',has_table_privilege(r.oid,c.oid,'SELECT'),'insert',has_table_privilege(r.oid,c.oid,'INSERT'),
     'update',has_table_privilege(r.oid,c.oid,'UPDATE'),'delete',has_table_privilege(r.oid,c.oid,'DELETE'),
     'truncate',has_table_privilege(r.oid,c.oid,'TRUNCATE'),'trigger',has_table_privilege(r.oid,c.oid,'TRIGGER'))
     ORDER BY r.rolname) FROM roles r),
   'columns',coalesce((SELECT jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,
     'type',format_type(a.atttypid,a.atttypmod),'typeSchema',(SELECT n.nspname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.oid=a.atttypid),
     'typeModifier',a.atttypmod,'notNull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
     'default',pg_get_expr(d.adbin,d.adrelid),'acl',a.attacl,
     'effectivePrivileges',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,
       'select',has_column_privilege(r.oid,c.oid,a.attnum,'SELECT'),
       'insert',has_column_privilege(r.oid,c.oid,a.attnum,'INSERT'),
       'update',has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE')) ORDER BY r.rolname) FROM roles r)
   ) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
   WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'[]'::jsonb),
   'constraints',coalesce((SELECT jsonb_agg(jsonb_build_object('name',x.conname,'type',x.contype,
     'validated',x.convalidated,'deferrable',x.condeferrable,'initiallyDeferred',x.condeferred,
     'definition',pg_get_constraintdef(x.oid,false),'checkExpression',pg_get_expr(x.conbin,x.conrelid))
     ORDER BY x.conname) FROM pg_constraint x WHERE x.conrelid=c.oid),'[]'::jsonb),
   'indexes',coalesce((SELECT jsonb_agg(jsonb_build_object('name',i.relname,'unique',x.indisunique,
     'primary',x.indisprimary,'valid',x.indisvalid,'ready',x.indisready,
     'definition',pg_get_indexdef(x.indexrelid)) ORDER BY i.relname)
     FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid WHERE x.indrelid=c.oid),'[]'::jsonb)
 ) ORDER BY c.schema_name,c.relname) FROM relations c),'[]'::jsonb),
 'policies',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',r.schema_name,'table',r.relname,
   'name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,
   'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY x) FROM unnest(p.polroles) x),
   'using',pg_get_expr(p.polqual,p.polrelid),'withCheck',pg_get_expr(p.polwithcheck,p.polrelid))
   ORDER BY r.schema_name,r.relname,p.polname) FROM policies p JOIN relations r ON r.oid=p.polrelid),'[]'::jsonb),
 'triggers',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',r.schema_name,'table',r.relname,
   'name',t.tgname,'enabled',t.tgenabled,'typeBits',t.tgtype,
   'definition',pg_get_triggerdef(t.oid,false),'functionSchema',n.nspname,'functionName',p.proname,
   'functionArguments',pg_get_function_identity_arguments(p.oid),
   'functionOwner',pg_get_userbyid(p.proowner),'functionSecurityDefiner',p.prosecdef,
   'functionSettings',p.proconfig,'functionAcl',p.proacl,
   'sourceIncluded',p.oid IN (SELECT oid FROM functions)) ORDER BY r.schema_name,r.relname,t.tgname)
   FROM triggers t JOIN relations r ON r.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid
   JOIN pg_namespace n ON n.oid=p.pronamespace),'[]'::jsonb),
 'functions',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',p.schema_name,'name',p.proname,
   'arguments',pg_get_function_arguments(p.oid),'identityArguments',pg_get_function_identity_arguments(p.oid),
   'returns',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),
   'language',(SELECT lanname FROM pg_language WHERE oid=p.prolang),'kind',p.prokind,
   'securityDefiner',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'parallel',p.proparallel,
   'settings',p.proconfig,'acl',p.proacl,
   'publicExecute',EXISTS(SELECT FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'),
   'aclExpanded',coalesce((SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC'
     ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,
     'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type)
     FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb),
   'effectiveExecute',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,
      'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) ORDER BY r.rolname) FROM roles r),
   'dynamicSqlDetected',p.prosrc ~* '\mEXECUTE\M',
   'definitionMd5',md5(pg_get_functiondef(p.oid)),'definition',pg_get_functiondef(p.oid)
 ) ORDER BY p.schema_name,p.proname,pg_get_function_identity_arguments(p.oid)) FROM functions p),'[]'::jsonb),
 'functionDependencies',coalesce((SELECT jsonb_agg(jsonb_build_object('callerSchema',f.schema_name,'caller',f.proname,
   'callerArguments',pg_get_function_identity_arguments(f.oid),'calleeSchema',n.nspname,'callee',p.proname,
   'calleeArguments',pg_get_function_identity_arguments(p.oid),'mechanism',e.mechanism,
   'sourceIncluded',p.oid IN (SELECT oid FROM functions)) ORDER BY f.schema_name,f.proname,e.callee,e.mechanism)
   FROM edges e JOIN functions f ON f.oid=e.caller JOIN pg_proc p ON p.oid=e.callee
   JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema')),'[]'::jsonb),
 'unresolvedQualifiedCalls',coalesce((SELECT jsonb_agg(jsonb_build_object('callerSchema',f.schema_name,'caller',f.proname,
   'schema',t.schema_name,'name',t.function_name) ORDER BY f.schema_name,f.proname,t.schema_name,t.function_name)
   FROM (SELECT DISTINCT * FROM text_calls) t JOIN functions f ON f.oid=t.caller
   WHERE t.schema_name NOT IN ('pg_catalog','information_schema')
     AND NOT EXISTS(SELECT FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=t.schema_name AND p.proname=t.function_name)
     AND NOT EXISTS(SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.schema_name AND c.relname=t.function_name)),'[]'::jsonb),
 'roles',coalesce((SELECT jsonb_agg(jsonb_build_object('name',r.rolname,'login',r.rolcanlogin,
   'superuser',r.rolsuper,'bypassRls',r.rolbypassrls,'inherit',r.rolinherit,'createRole',r.rolcreaterole,
   'createDatabase',r.rolcreatedb,'replication',r.rolreplication) ORDER BY r.rolname) FROM roles r),'[]'::jsonb),
 'roleMemberships',coalesce((SELECT jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),
   'member',pg_get_userbyid(m.member),'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
   'inherit',m.inherit_option,'set',m.set_option) ORDER BY m.roleid,m.member,m.grantor)
   FROM pg_auth_members m WHERE m.roleid IN (SELECT oid FROM role_closure) OR m.member IN (SELECT oid FROM role_closure)),'[]'::jsonb),
 'sequences',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',s.schema_name,'name',s.relname,
   'owner',pg_get_userbyid(s.relowner),'acl',s.relacl,
   'effectivePrivileges',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,
      'usage',has_sequence_privilege(r.oid,s.oid,'USAGE'),'select',has_sequence_privilege(r.oid,s.oid,'SELECT'),
      'update',has_sequence_privilege(r.oid,s.oid,'UPDATE')) ORDER BY r.rolname) FROM roles r))
   ORDER BY s.schema_name,s.relname) FROM sequences s),'[]'::jsonb)
) AS diagnostic_serveur;
ROLLBACK;
