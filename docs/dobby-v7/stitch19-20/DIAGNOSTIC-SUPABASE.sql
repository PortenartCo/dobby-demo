-- DOBBY familial uniquement : exécuter manuellement dans le SQL Editor du projet
-- dobby-family-sync (référence attendue pqcdkrwljgvgagzwrcmg).
-- Lecture seule des catalogues ; aucune donnée de compte, jeton ou ligne métier.
-- Copier la cellule JSON « diagnostic » complète dans le retour à Codex.
with relations as (
  select c.oid, n.nspname as schema_name, c.relname as table_name,
         c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p')
    and (c.relname ilike '%dobby%' or c.relname ilike '%invitation%'
         or c.relname ilike '%household%' or c.relname ilike '%membership%')
), relation_details as (
  select r.schema_name, r.table_name, r.rls_enabled, r.rls_forced,
    (select jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid,a.atttypmod),
      'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin,d.adrelid)
    ) order by a.attnum)
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped) as columns,
    (select jsonb_agg(jsonb_build_object('name', c.conname,
      'definition', pg_get_constraintdef(c.oid,true)) order by c.conname)
      from pg_constraint c where c.conrelid=r.oid) as constraints,
    (select jsonb_agg(jsonb_build_object('name',p.policyname,'roles',p.roles,
      'command',p.cmd,'using',p.qual,'with_check',p.with_check) order by p.policyname)
      from pg_policies p where p.schemaname=r.schema_name and p.tablename=r.table_name) as policies,
    (select jsonb_agg(jsonb_build_object('grantee',g.grantee,'privilege',g.privilege_type)
      order by g.grantee,g.privilege_type) from information_schema.role_table_grants g
      where g.table_schema=r.schema_name and g.table_name=r.table_name
      and g.grantee in ('anon','authenticated','service_role','PUBLIC')) as grants,
    (select jsonb_agg(jsonb_build_object('name',t.tgname,
      'definition',pg_get_triggerdef(t.oid,true)) order by t.tgname)
      from pg_trigger t where t.tgrelid=r.oid and not t.tgisinternal) as triggers
  from relations r
), functions as (
  select p.oid, n.nspname as schema_name, p.proname as name,
         pg_get_function_identity_arguments(p.oid) as arguments,
         pg_get_function_result(p.oid) as returns,
         p.prosecdef as security_definer, p.proconfig as settings,
         pg_get_functiondef(p.oid) as definition,
         p.proacl::text as privileges
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind='f'
    and (p.proname ilike '%dobby%' or p.proname ilike '%invitation%'
         or p.proname ilike '%household%' or p.proname ilike '%membership%')
)
select jsonb_pretty(jsonb_build_object(
  'diagnostic_version',1,
  'database_version',current_setting('server_version'),
  'tables',coalesce((select jsonb_agg(to_jsonb(r) order by r.table_name) from relation_details r),'[]'::jsonb),
  'functions',coalesce((select jsonb_agg(to_jsonb(f)-'oid' order by f.name,f.arguments) from functions f),'[]'::jsonb),
  'extensions',coalesce((select jsonb_agg(extname order by extname) from pg_extension),'[]'::jsonb)
)) as diagnostic;
