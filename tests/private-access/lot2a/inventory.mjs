import { createHash } from 'node:crypto';
import { run } from '../local-db.mjs';
import { sources, paths, candidate } from './catalog.mjs';
export const manifest=()=>[...candidate().split('INSERT INTO access_2a_manifest VALUES')[1].split(';')[0].matchAll(/\('([^']+)','([^']+)'\)/g)].map(x=>({signature:x[1],kind:x[2]}));
export function routines() {
 return JSON.parse(run(`SELECT coalesce(jsonb_agg(jsonb_build_object(
 'signature',n.nspname||'.'||p.oid::regprocedure::text,'schema',n.nspname,'name',p.proname,
 'arguments',pg_get_function_identity_arguments(p.oid),'owner',pg_get_userbyid(p.proowner),
 'securityDefiner',p.prosecdef,'language',l.lanname,'volatility',p.provolatile,'configuration',p.proconfig,
 'anon',has_schema_privilege('anon',n.oid,'USAGE') AND has_function_privilege('anon',p.oid,'EXECUTE'),
 'authenticated',has_schema_privilege('authenticated',n.oid,'USAGE') AND has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'bodyMD5',md5(p.prosrc),'definitionMD5',md5(pg_get_functiondef(p.oid)),
 'acl',p.proacl::text) ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),'[]')
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname IN ('public','dobby_v7_private','dobby_socle_private','dobby_runes_private','dobby_access_legacy','dobby_access_private')
 AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e');`)).map(r=>({...r,signature:r.signature.replace(r.schema+'.'+r.schema+'.',r.schema+'.')}));
}
export const policies=()=>JSON.parse(run(`SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY schemaname,tablename,policyname),'[]') FROM pg_policies p WHERE schemaname IN ('public','dobby_v7_private','dobby_socle_private','dobby_runes_private');`));
export const tables=()=>JSON.parse(run(`SELECT jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,
 'anonSelect',has_any_column_privilege('anon',c.oid,'SELECT'),'authenticatedSelect',has_any_column_privilege('authenticated',c.oid,'SELECT')) ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','dobby_v7_private','dobby_socle_private','dobby_runes_private','dobby_access_legacy') AND c.relkind IN ('r','p','v','m','f');`));
export function inventory(before) {
 return {scope:'LOCAL FICTIONAL SQL; no hosted catalog, HTTP/JWT or physical Storage verification',
 sources:Object.entries(paths).map(([k,path])=>({path,sha256:createHash('sha256').update(sources[k]).digest('hex')})),
 manifest:manifest(),missingDefinitions:[...sources.missions.matchAll(/\('dobby_runes_private\.([^']+)'\s*,\s*'[a-f0-9]+'\)/g)].map(x=>'dobby_runes_private.'+x[1]),
 before,after:{routines:routines(),tables:tables(),policies:policies()}};
}
