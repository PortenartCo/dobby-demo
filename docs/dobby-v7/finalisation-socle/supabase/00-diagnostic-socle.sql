-- DOBBY V7 — CHECKPOINT B : un seul diagnostic, une seule cellule JSON.
-- Exécution MANUELLE dans le SQL Editor du SEUL projet dobby-family-sync.
-- Aucune valeur à remplacer. Aucun projet professionnel Portenart.
-- Strictement lecture seule : uniquement pg_catalog, jamais de table métier.
-- Aucun appel RPC métier, aucune simulation JWT, aucun SET ROLE, aucun GRANT.
-- Aucune installation, migration, remise à zéro ou suppression de donnée.
-- Ne pas exécuter les anciens scripts Stitch 01/04/06/11 pour ce diagnostic.
--
-- ATTENTION : la cellule contient les corps des fonctions techniques privées.
-- La conserver/transmettre dans cette conversation privée, jamais en Git,
-- commentaire de PR, issue, log public ou capture publiée. Vérifier l'absence
-- de littéral secret inattendu avant transmission ; ne jamais envoyer de clé,
-- mot de passe, jeton d'invitation ou donnée familiale.
-- Le catalogue ne prouve pas une recette Auth/RLS/RPC réelle.
-- Sources : préflights existants Missions, Rôles, Famille et Courses.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT pg_catalog.jsonb_pretty(pg_catalog.jsonb_build_object(
  'diagnostic', 'dobby-v7-family-core-checkpoint-b-v1',
  'scope', 'personal-family-project-only',
  'databaseVersion', pg_catalog.current_setting('server_version'),
  'transactionReadOnly', pg_catalog.current_setting('transaction_read_only'),
  'applicationRowsRead', false,
  'noMigrationPerformed', true,
  'confidentialTechnicalOutput', true,
  'realAuthRlsRpcOrBrowserVerified', false,
  'shoppingCatalog', (
WITH target AS (
  SELECT c.oid, c.relkind, c.relowner, c.relrowsecurity, c.relforcerowsecurity,
         c.relacl, n.oid AS namespace_oid
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'dobby_v2_grocery'
), columns AS (
  SELECT a.attnum, a.attname, a.atttypid, a.atttypmod, a.attnotnull,
         a.attidentity, a.attgenerated, a.attacl,
         pg_catalog.format_type(a.atttypid, a.atttypmod) AS exact_type,
         pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_expression
  FROM target t
  JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid
  LEFT JOIN pg_catalog.pg_attrdef d
    ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attnum > 0 AND NOT a.attisdropped
), inspected_roles AS (
  SELECT r.oid, r.rolname, r.rolsuper, r.rolbypassrls
  FROM pg_catalog.pg_roles r
  WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
)
SELECT jsonb_build_object(
  'diagnostic', 'dobby-socle-c07-catalog-v1',
  'readOnly', true,
  'applicationRowsRead', false,
  'technicalConfidential', true,
  'tablePresent', EXISTS (SELECT FROM target),
  'table', (SELECT jsonb_build_object(
    'kind', t.relkind, 'owner', pg_catalog.pg_get_userbyid(t.relowner),
    'rlsEnabled', t.relrowsecurity, 'rlsForced', t.relforcerowsecurity
  ) FROM target t),
  'columns', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'name', a.attname, 'exactType', a.exact_type,
    'typeOid', a.atttypid, 'typeModifier', a.atttypmod,
    'notNull', a.attnotnull, 'defaultExpression', a.default_expression,
    'identity', a.attidentity, 'generated', a.attgenerated
  ) ORDER BY a.attnum) FROM columns a), '[]'::jsonb),
  'constraints', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'name', c.conname, 'type', c.contype, 'validated', c.convalidated,
    'deferrable', c.condeferrable, 'initiallyDeferred', c.condeferred,
    'definition', pg_catalog.pg_get_constraintdef(c.oid, true)
  ) ORDER BY c.conname)
    FROM pg_catalog.pg_constraint c JOIN target t ON t.oid = c.conrelid), '[]'::jsonb),
  'indexes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'name', ic.relname, 'valid', i.indisvalid, 'ready', i.indisready,
    'unique', i.indisunique, 'definition', pg_catalog.pg_get_indexdef(i.indexrelid)
  ) ORDER BY ic.relname)
    FROM pg_catalog.pg_index i JOIN target t ON t.oid = i.indrelid
    JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid), '[]'::jsonb),
  'triggers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'name', g.tgname, 'enabled', g.tgenabled, 'typeFlags', g.tgtype,
    'definition', pg_catalog.pg_get_triggerdef(g.oid, true),
    'function', p.oid::regprocedure::text,
    'functionOwner', pg_catalog.pg_get_userbyid(p.proowner),
    'securityDefiner', p.prosecdef, 'configuration', p.proconfig,
    'definitionMd5', md5(pg_catalog.pg_get_functiondef(p.oid)),
    'functionDefinition', pg_catalog.pg_get_functiondef(p.oid)
  ) ORDER BY g.tgname)
    FROM pg_catalog.pg_trigger g JOIN target t ON t.oid = g.tgrelid
    JOIN pg_catalog.pg_proc p ON p.oid = g.tgfoid
    WHERE NOT g.tgisinternal), '[]'::jsonb),
  'policies', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'name', p.policyname, 'permissive', p.permissive,
    'roles', p.roles, 'command', p.cmd,
    'usingExpression', p.qual, 'checkExpression', p.with_check
  ) ORDER BY p.policyname)
    FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'dobby_v2_grocery'), '[]'::jsonb),
  'tableGrants', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'grantee', CASE WHEN x.grantee = 0 THEN 'PUBLIC'
      ELSE pg_catalog.pg_get_userbyid(x.grantee) END,
    'grantor', pg_catalog.pg_get_userbyid(x.grantor),
    'privilege', x.privilege_type, 'grantable', x.is_grantable
  ) ORDER BY x.grantee, x.privilege_type)
    FROM target t CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(t.relacl, pg_catalog.acldefault('r', t.relowner))) x), '[]'::jsonb),
  'explicitColumnGrants', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'column', a.attname,
    'grantee', CASE WHEN x.grantee = 0 THEN 'PUBLIC'
      ELSE pg_catalog.pg_get_userbyid(x.grantee) END,
    'privilege', x.privilege_type, 'grantable', x.is_grantable
  ) ORDER BY a.attnum, x.grantee, x.privilege_type)
    FROM columns a CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) x), '[]'::jsonb),
  'effectiveAccess', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'role', r.rolname, 'superuser', r.rolsuper, 'bypassRls', r.rolbypassrls,
    'schemaUsage', pg_catalog.has_schema_privilege(r.oid, t.namespace_oid, 'USAGE'),
    'tableSelect', pg_catalog.has_table_privilege(r.oid, t.oid, 'SELECT'),
    'tableInsert', pg_catalog.has_table_privilege(r.oid, t.oid, 'INSERT'),
    'tableUpdate', pg_catalog.has_table_privilege(r.oid, t.oid, 'UPDATE'),
    'tableDelete', pg_catalog.has_table_privilege(r.oid, t.oid, 'DELETE'),
    'columns', (SELECT jsonb_agg(jsonb_build_object(
      'name', a.attname,
      'select', pg_catalog.has_column_privilege(r.oid, t.oid, a.attnum, 'SELECT'),
      'insert', pg_catalog.has_column_privilege(r.oid, t.oid, a.attnum, 'INSERT'),
      'update', pg_catalog.has_column_privilege(r.oid, t.oid, a.attnum, 'UPDATE')
    ) ORDER BY a.attnum) FROM columns a)
  ) ORDER BY r.rolname) FROM target t CROSS JOIN inspected_roles r), '[]'::jsonb),
  'limits', jsonb_build_array(
    'Catalog evidence only: no claim of installed C07 contract, trigger behavior or real authorization.',
    'RLS must enforce canonical parent/child permissions; authenticated grants do not distinguish categories.',
    'Do not run 01-install when the existing column and complete contract already conform.',
    'Do not publish raw definitions or catalog results in the public repository.'
  )
) AS shopping_catalog_diagnostic
  )::jsonb,
  'missionsCatalog', (
WITH RECURSIVE
selected_functions(oid) AS (
  SELECT p.oid
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE p.prokind='f'
    AND (n.nspname='dobby_runes_private'
      OR (n.nspname='public'
        AND (p.proname IN ('dobby_missions_v2_write',
          'dobby_missions_v2_capabilities','dobby_v2_modules_stamp')
          OR p.proname LIKE 'dobby_missions_v3_%')))
  UNION
  SELECT d.refobjid
  FROM selected_functions s
  JOIN pg_catalog.pg_depend d
    ON d.classid='pg_catalog.pg_proc'::pg_catalog.regclass
    AND d.objid=s.oid
    AND d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass
  JOIN pg_catalog.pg_proc p ON p.oid=d.refobjid AND p.prokind='f'
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('dobby_runes_private','public')
),
selected_tables AS (
  SELECT c.oid,c.relname,c.relnamespace,c.relowner,c.relrowsecurity,
    c.relforcerowsecurity,c.relacl,n.nspname
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind IN ('r','p') AND (
    (n.nspname='public' AND c.relname IN
      ('dobby_v2_modules','dobby_v2_memberships'))
    OR (n.nspname='dobby_runes_private' AND c.relname='operations'))
),
selected_roles AS (
  SELECT r.* FROM pg_catalog.pg_roles r
  WHERE r.rolname IN ('dobby_missions_v2_writer','dobby_missions_v3_writer',
    'dobby_v7_writer','authenticated','anon')
)
SELECT pg_catalog.jsonb_pretty(pg_catalog.jsonb_build_object(
  'check','dobby-socle-missions-catalog-v1',
  'scope','personal-family-project-only',
  'readOnly',true,
  'dataRowsRead',false,
  'databaseVersion',pg_catalog.current_setting('server_version'),
  'runtimeAndRealRecipeVerified',false,
  'frontendV3GateMustRemainClosed',true,
  'tables',COALESCE((SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'schema',t.nspname,'name',t.relname,
      'owner',pg_catalog.pg_get_userbyid(t.relowner),
      'rls',t.relrowsecurity,'forced',t.relforcerowsecurity,
      'acl',t.relacl,
      'columns',(SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('name',a.attname,
          'type',pg_catalog.format_type(a.atttypid,a.atttypmod),
          'notNull',a.attnotnull,
          'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid))
          ORDER BY a.attnum)
        FROM pg_catalog.pg_attribute a
        LEFT JOIN pg_catalog.pg_attrdef d
          ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped),
      'constraints',(SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('name',c.conname,'type',c.contype,
          'validated',c.convalidated,'deferrable',c.condeferrable,
          'initiallyDeferred',c.condeferred,
          'definition',pg_catalog.pg_get_constraintdef(c.oid,true))
        ORDER BY c.conname)
        FROM pg_catalog.pg_constraint c WHERE c.conrelid=t.oid),
      'indexes',(SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('definition',
          pg_catalog.pg_get_indexdef(i.indexrelid),
          'valid',i.indisvalid,'ready',i.indisready)
        ORDER BY i.indexrelid::pg_catalog.regclass::text)
        FROM pg_catalog.pg_index i WHERE i.indrelid=t.oid))
    ORDER BY t.nspname,t.relname) FROM selected_tables t),'[]'::jsonb),
  'policies',COALESCE((SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('schema',t.nspname,'table',t.relname,
      'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
      'roles',(SELECT pg_catalog.jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(x) END ORDER BY x)
        FROM pg_catalog.unnest(p.polroles) x),
      'using',pg_catalog.pg_get_expr(p.polqual,p.polrelid),
      'withCheck',pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid))
    ORDER BY t.nspname,t.relname,p.polname)
    FROM selected_tables t JOIN pg_catalog.pg_policy p ON p.polrelid=t.oid),
    '[]'::jsonb),
  'triggers',COALESCE((SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('schema',t.nspname,'table',t.relname,
      'name',g.tgname,'enabled',g.tgenabled,
      'function',g.tgfoid::pg_catalog.regprocedure::text,
      'definition',pg_catalog.pg_get_triggerdef(g.oid,true))
    ORDER BY t.nspname,t.relname,g.tgname)
    FROM selected_tables t JOIN pg_catalog.pg_trigger g ON g.tgrelid=t.oid
    WHERE NOT g.tgisinternal),'[]'::jsonb),
  'functions',COALESCE((SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('schema',n.nspname,'name',p.proname,
      'identity',p.oid::pg_catalog.regprocedure::text,
      'arguments',pg_catalog.pg_get_function_identity_arguments(p.oid),
      'returns',pg_catalog.pg_get_function_result(p.oid),
      'language',l.lanname,'owner',pg_catalog.pg_get_userbyid(p.proowner),
      'securityDefiner',p.prosecdef,'volatility',p.provolatile,
      'strict',p.proisstrict,'leakproof',p.proleakproof,
      'settings',p.proconfig,'acl',p.proacl,
      'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)))
    ORDER BY n.nspname,p.proname,p.oid)
    FROM selected_functions s JOIN pg_catalog.pg_proc p ON p.oid=s.oid
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid=p.prolang),'[]'::jsonb),
  'declaredFunctionDependencies',COALESCE((SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('source',s.oid::pg_catalog.regprocedure::text,
      'dependencyType',d.deptype,
      'target',pg_catalog.pg_describe_object(
        d.refclassid,d.refobjid,d.refobjsubid))
      ORDER BY s.oid,d.refclassid,d.refobjid,d.refobjsubid)
    FROM selected_functions s JOIN pg_catalog.pg_depend d
      ON d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid=s.oid),
    '[]'::jsonb),
  'dependencyLimit','pg_depend ne suit pas tous les appels PL/pgSQL ou SQL dynamique : examiner aussi les corps techniques privés.',
  'technicalRoles',COALESCE((SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('name',r.rolname,'login',r.rolcanlogin,
      'superuser',r.rolsuper,'bypassRls',r.rolbypassrls,
      'inherit',r.rolinherit,'createRole',r.rolcreaterole,
      'createDatabase',r.rolcreatedb,
      'incomingMembershipCount',(SELECT count(*) FROM pg_catalog.pg_auth_members a
        WHERE a.roleid=r.oid),
      'outgoingMembershipCount',(SELECT count(*) FROM pg_catalog.pg_auth_members a
        WHERE a.member=r.oid)) ORDER BY r.rolname)
    FROM selected_roles r),'[]'::jsonb),
  'effectiveSchemaUsage',COALESCE((SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('role',r.rolname,'schema',n.nspname,
      'usage',pg_catalog.has_schema_privilege(r.oid,n.oid,'USAGE'),
      'create',pg_catalog.has_schema_privilege(r.oid,n.oid,'CREATE'))
    ORDER BY r.rolname,n.nspname)
    FROM selected_roles r CROSS JOIN pg_catalog.pg_namespace n
    WHERE n.nspname IN ('public','auth','dobby_runes_private','dobby_v7_private')),
    '[]'::jsonb),
  'effectiveFunctionExecute',COALESCE((SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('role',r.rolname,
      'function',s.oid::pg_catalog.regprocedure::text,
      'execute',pg_catalog.has_function_privilege(r.oid,s.oid,'EXECUTE'))
    ORDER BY r.rolname,s.oid)
    FROM selected_roles r CROSS JOIN selected_functions s),'[]'::jsonb),
  'callerMigrationCapabilities',pg_catalog.jsonb_build_object(
    'superuser',(SELECT r.rolsuper FROM pg_catalog.pg_roles r
      WHERE r.rolname=current_user),
    'createRoles',(SELECT r.rolcreaterole FROM pg_catalog.pg_roles r
      WHERE r.rolname=current_user),
    'canSetWriterRoles',(SELECT pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('role',r.rolname,
        'set',pg_catalog.pg_has_role(current_user,r.oid,'SET'),
        'usage',pg_catalog.pg_has_role(current_user,r.oid,'USAGE'))
        ORDER BY r.rolname)
      FROM selected_roles r WHERE r.rolname LIKE 'dobby_%_writer'))
)) AS missions_catalog
  )::jsonb,
  'familyRolesCatalog', (
WITH RECURSIVE
target_relations AS (
  SELECT c.oid, n.nspname, c.relname, c.relkind, c.relowner,
    c.relrowsecurity, c.relforcerowsecurity, c.relacl
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE (n.nspname='public' AND c.relname LIKE 'dobby\_%' ESCAPE '\')
     OR n.nspname='dobby_v7_private'
     OR (n.nspname='storage' AND c.relname='objects')
),
function_seeds AS (
  SELECT p.oid
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE p.prokind='f' AND (
       n.nspname='dobby_v7_private'
    OR (n.nspname='public' AND p.proname LIKE 'dobby\_%' ESCAPE '\')
    OR p.proowner IN (SELECT oid FROM pg_catalog.pg_roles WHERE rolname IN ('dobby_v7_writer','dobby_missions_v2_writer'))
    OR p.oid IN (SELECT t.tgfoid FROM pg_catalog.pg_trigger t JOIN target_relations r ON r.oid=t.tgrelid WHERE NOT t.tgisinternal)
    OR p.oid IN (
      SELECT d.refobjid FROM pg_catalog.pg_depend d
      JOIN pg_catalog.pg_policy q ON d.classid='pg_catalog.pg_policy'::regclass AND q.oid=d.objid
      JOIN target_relations r ON r.oid=q.polrelid
      WHERE d.refclassid='pg_catalog.pg_proc'::regclass
    )
  )
),
function_closure(oid) AS (
  SELECT oid FROM function_seeds
  UNION
  SELECT d.refobjid FROM function_closure f
  JOIN pg_catalog.pg_depend d ON d.classid='pg_catalog.pg_proc'::regclass AND d.objid=f.oid
  JOIN pg_catalog.pg_proc p ON p.oid=d.refobjid AND p.prokind='f'
  WHERE d.refclassid='pg_catalog.pg_proc'::regclass
),
functions AS (
  SELECT p.*, n.nspname,
    EXISTS (SELECT 1 FROM pg_catalog.pg_depend d WHERE d.classid='pg_catalog.pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') AS extension_owned
  FROM function_closure f
  JOIN pg_catalog.pg_proc p ON p.oid=f.oid
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
),
role_targets AS (
  SELECT oid, rolname, rolcanlogin, rolsuper, rolinherit, rolcreaterole,
    rolcreatedb, rolreplication, rolbypassrls
  FROM pg_catalog.pg_roles
  WHERE rolname IN (current_user,session_user,'anon','authenticated','service_role','postgres','supabase_admin','pg_database_owner')
    OR rolname LIKE 'dobby\_%' ESCAPE '\'
    OR oid IN (SELECT relowner FROM target_relations UNION SELECT proowner FROM functions)
),
schema_targets AS (
  SELECT oid,nspname,nspowner,nspacl FROM pg_catalog.pg_namespace
  WHERE nspname IN ('public','auth','storage','dobby_v7_private','dobby_runes_private')
),
caller AS (
  SELECT oid,rolsuper,rolcreaterole FROM pg_catalog.pg_roles WHERE rolname=current_user
)
SELECT jsonb_build_object(
  'diagnostic','dobby-family-roles-catalogue-v1',
  'readOnly',true,
  'scope','personal-family-project-only',
  'databaseVersion',current_setting('server_version'),
  'caller',jsonb_build_object('role',current_user,'sessionRole',session_user,
    'superuser',(SELECT rolsuper FROM caller),'createRole',(SELECT rolcreaterole FROM caller)),
  'identityContract',jsonb_build_object(
    'authAccount','auth.users.id UUID; JWT sub, not user_metadata',
    'canonicalLink','dobby_v7_private.account_links: user_id -> (household_id,member_id TEXT)',
    'canonicalProfile','public.dobby_v2_modules module=family payload.familyMembers[*]',
    'roleCategory','explicit memberCategory; never infer from birthdate or membership owner/member',
    'targetedChildInvitation','not certified; generic accept creates a new member and cannot be reused'),
  'roles',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'name',r.rolname,'canLogin',r.rolcanlogin,'superuser',r.rolsuper,'inherit',r.rolinherit,
    'createRole',r.rolcreaterole,'createDb',r.rolcreatedb,'replication',r.rolreplication,'bypassRls',r.rolbypassrls,
    'callerIsRole',r.oid=(SELECT oid FROM caller),
    'callerMember',pg_catalog.pg_has_role(current_user,r.oid,'MEMBER'),
    'callerInheritsNow',pg_catalog.pg_has_role(current_user,r.oid,'USAGE'),
    'callerCanSet',pg_catalog.pg_has_role(current_user,r.oid,'SET'),
    'callerAdminOption',pg_catalog.pg_has_role(current_user,r.oid,'USAGE WITH ADMIN OPTION')) ORDER BY r.rolname) FROM role_targets r),'[]'::jsonb),
  'roleMembershipEdges',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'role',pg_catalog.pg_get_userbyid(m.roleid),'member',pg_catalog.pg_get_userbyid(m.member),
    'grantor',pg_catalog.pg_get_userbyid(m.grantor),'admin',m.admin_option,
    'inherit',m.inherit_option,'set',m.set_option) ORDER BY m.roleid,m.member,m.grantor)
    FROM pg_catalog.pg_auth_members m WHERE m.roleid IN (SELECT oid FROM role_targets) OR m.member IN (SELECT oid FROM role_targets)),'[]'::jsonb),
  'schemas',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'schema',s.nspname,'owner',pg_catalog.pg_get_userbyid(s.nspowner),
    'callerOwns',s.nspowner=(SELECT oid FROM caller),
    'callerInheritsOwner',pg_catalog.pg_has_role(current_user,s.nspowner,'USAGE'),
    'callerCanSetOwner',pg_catalog.pg_has_role(current_user,s.nspowner,'SET'),
    'callerUsage',pg_catalog.has_schema_privilege(current_user,s.oid,'USAGE'),
    'callerCreate',pg_catalog.has_schema_privilege(current_user,s.oid,'CREATE'),
    'callerUsageGrantOption',pg_catalog.has_schema_privilege(current_user,s.oid,'USAGE WITH GRANT OPTION'),
    'callerCreateGrantOption',pg_catalog.has_schema_privilege(current_user,s.oid,'CREATE WITH GRANT OPTION'),
    'acl',coalesce((SELECT jsonb_agg(jsonb_build_object('grantor',pg_catalog.pg_get_userbyid(a.grantor),
      'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END,
      'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type)
      FROM pg_catalog.aclexplode(coalesce(s.nspacl,pg_catalog.acldefault('n',s.nspowner))) a),'[]'::jsonb),
    'effectiveRoles',coalesce((SELECT jsonb_agg(jsonb_build_object('role',r.rolname,
      'usage',pg_catalog.has_schema_privilege(r.oid,s.oid,'USAGE'),
      'create',pg_catalog.has_schema_privilege(r.oid,s.oid,'CREATE')) ORDER BY r.rolname) FROM role_targets r),'[]'::jsonb)
    ) ORDER BY s.nspname) FROM schema_targets s),'[]'::jsonb),
  'relations',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'relation',format('%I.%I',r.nspname,r.relname),'kind',r.relkind,
    'owner',pg_catalog.pg_get_userbyid(r.relowner),'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,
    'callerOwns',r.relowner=(SELECT oid FROM caller),
    'callerInheritsOwner',pg_catalog.pg_has_role(current_user,r.relowner,'USAGE'),
    'callerCanSetOwner',pg_catalog.pg_has_role(current_user,r.relowner,'SET'),
    'columns',coalesce((SELECT jsonb_agg(jsonb_build_object('name',a.attname,
      'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,
      'default',pg_catalog.pg_get_expr(ad.adbin,ad.adrelid),'acl',a.attacl::text) ORDER BY a.attnum)
      FROM pg_catalog.pg_attribute a LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
      WHERE a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped),'[]'::jsonb),
    'acl',coalesce((SELECT jsonb_agg(jsonb_build_object('grantor',pg_catalog.pg_get_userbyid(a.grantor),
      'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END,
      'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type)
      FROM pg_catalog.aclexplode(coalesce(r.relacl,pg_catalog.acldefault('r',r.relowner))) a),'[]'::jsonb),
    'effectiveRoles',coalesce((SELECT jsonb_agg(jsonb_build_object('role',x.rolname,
      'select',pg_catalog.has_table_privilege(x.oid,r.oid,'SELECT'),
      'insert',pg_catalog.has_table_privilege(x.oid,r.oid,'INSERT'),
      'update',pg_catalog.has_table_privilege(x.oid,r.oid,'UPDATE'),
      'delete',pg_catalog.has_table_privilege(x.oid,r.oid,'DELETE'),
      'callerCanGrantUpdate',pg_catalog.has_table_privilege(current_user,r.oid,'UPDATE WITH GRANT OPTION')) ORDER BY x.rolname) FROM role_targets x),'[]'::jsonb)
    ) ORDER BY r.nspname,r.relname) FROM target_relations r WHERE r.relkind IN ('r','p','v','m','f')),'[]'::jsonb),
  'constraints',coalesce((SELECT jsonb_agg(jsonb_build_object('name',c.conname,
    'relation',c.conrelid::regclass::text,'referencedRelation',CASE WHEN c.confrelid<>0 THEN c.confrelid::regclass::text ELSE NULL END,
    'type',c.contype,'validated',c.convalidated,'deferrable',c.condeferrable,
    'initiallyDeferred',c.condeferred,'definition',pg_catalog.pg_get_constraintdef(c.oid,true)) ORDER BY c.conrelid,c.conname)
    FROM pg_catalog.pg_constraint c WHERE c.conrelid IN (SELECT oid FROM target_relations) OR c.confrelid IN (SELECT oid FROM target_relations)),'[]'::jsonb),
  'indexes',coalesce((SELECT jsonb_agg(jsonb_build_object('relation',i.indrelid::regclass::text,
    'name',i.indexrelid::regclass::text,'valid',i.indisvalid,'ready',i.indisready,'unique',i.indisunique,
    'definition',pg_catalog.pg_get_indexdef(i.indexrelid)) ORDER BY i.indrelid,i.indexrelid)
    FROM pg_catalog.pg_index i WHERE i.indrelid IN (SELECT oid FROM target_relations)),'[]'::jsonb),
  'policies',coalesce((SELECT jsonb_agg(jsonb_build_object('relation',q.polrelid::regclass::text,
    'name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
    'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(x) END ORDER BY x) FROM unnest(q.polroles) x),
    'using',pg_catalog.pg_get_expr(q.polqual,q.polrelid),
    'withCheck',pg_catalog.pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polrelid,q.polname)
    FROM pg_catalog.pg_policy q WHERE q.polrelid IN (SELECT oid FROM target_relations)),'[]'::jsonb),
  'triggers',coalesce((SELECT jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
    'name',t.tgname,'function',t.tgfoid::regprocedure::text,'internal',t.tgisinternal,
    'enabled',t.tgenabled,'definition',pg_catalog.pg_get_triggerdef(t.oid,true)) ORDER BY t.tgrelid,t.tgname)
    FROM pg_catalog.pg_trigger t WHERE t.tgrelid IN (SELECT oid FROM target_relations) AND NOT t.tgisinternal),'[]'::jsonb),
  'functions',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'signature',f.oid::regprocedure::text,'schema',f.nspname,'owner',pg_catalog.pg_get_userbyid(f.proowner),
    'securityDefiner',f.prosecdef,'volatility',f.provolatile,'parallel',f.proparallel,
    'strict',f.proisstrict,'leakproof',f.proleakproof,'configuration',f.proconfig,
    'language',(SELECT lanname FROM pg_catalog.pg_language WHERE oid=f.prolang),
    'returnType',pg_catalog.pg_get_function_result(f.oid),'arguments',pg_catalog.pg_get_function_arguments(f.oid),
    'extensionOwned',f.extension_owned,'definitionMd5',md5(pg_catalog.pg_get_functiondef(f.oid)),
    'callerOwns',f.proowner=(SELECT oid FROM caller),
    'callerInheritsOwner',pg_catalog.pg_has_role(current_user,f.proowner,'USAGE'),
    'callerCanSetOwner',pg_catalog.pg_has_role(current_user,f.proowner,'SET'),
    'callerExecuteGrantOption',pg_catalog.has_function_privilege(current_user,f.oid,'EXECUTE WITH GRANT OPTION'),
    'acl',coalesce((SELECT jsonb_agg(jsonb_build_object('grantor',pg_catalog.pg_get_userbyid(a.grantor),
      'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END,
      'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type)
      FROM pg_catalog.aclexplode(coalesce(f.proacl,pg_catalog.acldefault('f',f.proowner))) a),'[]'::jsonb),
    'effectiveRoles',coalesce((SELECT jsonb_agg(jsonb_build_object('role',r.rolname,
      'execute',pg_catalog.has_function_privilege(r.oid,f.oid,'EXECUTE')) ORDER BY r.rolname) FROM role_targets r),'[]'::jsonb)
    ) ORDER BY f.nspname,f.proname,f.oid) FROM functions f),'[]'::jsonb),
  'functionDependencies',coalesce((SELECT jsonb_agg(jsonb_build_object('kind',d.deptype,
    'object',pg_catalog.pg_describe_object(d.classid,d.objid,d.objsubid),
    'dependsOn',pg_catalog.pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid))
    ORDER BY d.classid,d.objid,d.refclassid,d.refobjid,d.deptype)
    FROM pg_catalog.pg_depend d WHERE
      (d.classid='pg_catalog.pg_proc'::regclass AND d.objid IN (SELECT oid FROM functions))
      OR (d.refclassid='pg_catalog.pg_proc'::regclass AND d.refobjid IN (SELECT oid FROM functions))),'[]'::jsonb),
  'declaredDependencyLimit','pg_depend does not fully track PL/pgSQL text/dynamic SQL references; inspect confidential function definitions before DROP RESTRICT or replacement.',
  'maintenanceLimit','Metadata only. CREATEROLE does not prove ADMIN/SET on an existing closed writer. Schema ownership may permit DROP RESTRICT; it does not alone permit CREATE OR REPLACE or restoration of ownership to the writer.',
  'dataRowsRead',false,
  'realAuthRlsRpcOrBrowserVerified',false
) AS family_roles_catalogue
  )::jsonb,
  'missionsFunctionSourcesConfidential', (
WITH RECURSIVE selected_functions(oid) AS (
  SELECT p.oid FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE p.prokind='f'
    AND (n.nspname='dobby_runes_private'
      OR (n.nspname='public' AND (p.proname IN (
        'dobby_missions_v2_write','dobby_missions_v2_capabilities',
        'dobby_v2_modules_stamp') OR p.proname LIKE 'dobby_missions_v3_%')))
  UNION
  SELECT d.refobjid FROM selected_functions s
  JOIN pg_catalog.pg_depend d
    ON d.classid='pg_catalog.pg_proc'::pg_catalog.regclass
    AND d.objid=s.oid AND d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass
  JOIN pg_catalog.pg_proc p ON p.oid=d.refobjid AND p.prokind='f'
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('dobby_runes_private','public')
)
SELECT pg_catalog.jsonb_pretty(pg_catalog.jsonb_build_object(
  'check','dobby-socle-missions-private-definitions-v1',
  'readOnly',true,'confidentialTechnicalOutput',true,'dataRowsRead',false,
  'handling','PRIVE UNIQUEMENT : contrôler les littéraux inattendus ; aucun résultat brut au dépôt public.',
  'functions',COALESCE((SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('identity',s.oid::pg_catalog.regprocedure::text,
      'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(s.oid)),
      'definition',pg_catalog.pg_get_functiondef(s.oid))
    ORDER BY s.oid::pg_catalog.regprocedure::text)
    FROM selected_functions s),'[]'::jsonb)
)) AS missions_private_definitions
  )::jsonb,
  'familyFunctionSourcesConfidential', (
WITH RECURSIVE
target_relations AS (
  SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE (n.nspname='public' AND c.relname LIKE 'dobby\_%' ESCAPE '\')
    OR n.nspname='dobby_v7_private' OR (n.nspname='storage' AND c.relname='objects')
),
seeds AS (
  SELECT p.oid FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE p.prokind='f' AND (n.nspname='dobby_v7_private'
    OR (n.nspname='public' AND p.proname LIKE 'dobby\_%' ESCAPE '\')
    OR p.proowner IN (SELECT oid FROM pg_catalog.pg_roles WHERE rolname IN ('dobby_v7_writer','dobby_missions_v2_writer'))
    OR p.oid IN (SELECT tgfoid FROM pg_catalog.pg_trigger WHERE tgrelid IN (SELECT oid FROM target_relations) AND NOT tgisinternal)
    OR p.oid IN (SELECT d.refobjid FROM pg_catalog.pg_depend d JOIN pg_catalog.pg_policy q
      ON d.classid='pg_catalog.pg_policy'::regclass AND q.oid=d.objid
      WHERE q.polrelid IN (SELECT oid FROM target_relations) AND d.refclassid='pg_catalog.pg_proc'::regclass))
),
closure(oid) AS (
  SELECT oid FROM seeds UNION SELECT d.refobjid FROM closure f
  JOIN pg_catalog.pg_depend d ON d.classid='pg_catalog.pg_proc'::regclass AND d.objid=f.oid
  JOIN pg_catalog.pg_proc p ON p.oid=d.refobjid AND p.prokind='f'
  WHERE d.refclassid='pg_catalog.pg_proc'::regclass
)
SELECT jsonb_build_object('diagnostic','dobby-family-function-sources-private-v1',
  'readOnly',true,'confidentialTechnicalDefinitions',true,'neverCommitRawResult',true,
  'functions',coalesce(jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
    'definitionMd5',md5(pg_catalog.pg_get_functiondef(p.oid)),
    'definition',pg_catalog.pg_get_functiondef(p.oid)) ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb),
  'dataRowsRead',false,'realAuthRlsRpcOrBrowserVerified',false)
  AS family_function_sources_confidential
FROM closure f JOIN pg_catalog.pg_proc p ON p.oid=f.oid
JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema','auth','storage','extensions')
  AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d WHERE d.classid='pg_catalog.pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
  )::jsonb
)) AS socle_diagnostic;
ROLLBACK;
