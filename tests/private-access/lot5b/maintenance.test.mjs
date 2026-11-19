import { before,after,test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDatabase } from './local-db.mjs';

let db;
const phase=process.env.DOBBY_LOT5B_PHASE||'candidate';
const historical=readFileSync(new URL('../../../supabase/migrations/20261117215619_dobby_private_access_tables_rpc.sql',import.meta.url),'utf8');
const start=historical.indexOf(" FOREACH r IN ARRAY ARRAY['dobby_v7_writer'");
const end=historical.indexOf(' END LOOP;',start)+' END LOOP;'.length;
const historicalRoleCheck='DO $roles$ DECLARE r text; BEGIN\n'+historical.slice(start,end)+'\nEND $roles$;';
const guard=()=>phase==='legacy'?historicalRoleCheck:readFileSync(new URL('../../../supabase/compatibility/lot5b/maintenance-roles.preflight.sql',import.meta.url),'utf8');
const closeOwn=`GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT FALSE,SET FALSE;`;
const foreign=(inherit=true,set=true)=>`SET ROLE fixture_grantor; GRANT dobby_missions_v2_writer TO postgres WITH ADMIN FALSE,INHERIT ${inherit},SET ${set}; RESET ROLE;`;
const snapshot=()=>db.run(`SELECT coalesce(jsonb_agg(jsonb_build_array(roleid,member,grantor,admin_option,inherit_option,set_option) ORDER BY roleid,member,grantor),'[]') FROM pg_auth_members;`);
function check(setup='',tail='',readonly=false){return db.raw(`BEGIN ${readonly?'READ ONLY':''}; ${setup} SET ROLE postgres; ${guard()} ${tail} ROLLBACK;`);}
function passes(result){assert.equal(result.status,0,result.stderr);return result.stdout.trim();}
function refuses(result){assert.notEqual(result.status,0,'An unsafe residual membership was accepted');assert.match(result.stderr,phase==='legacy'?/ERROR:  P0001\b/:/ERROR:  42501\b/,result.stderr);}
before(()=>{db=createDatabase();console.log('LOT5B_ROLE_RUNTIME '+db.version);});
after(()=>db?.close());

test('closed existing ADMIN grants permit a read-only preflight without changing memberships',()=>{
 const before=snapshot();passes(check('','',true));assert.equal(snapshot(),before);
});
test('missing closed ADMIN on the V7 writer refuses before any grant changes',()=>{
 const before=snapshot();refuses(check('REVOKE dobby_v7_writer FROM postgres;'));assert.equal(snapshot(),before);
});
test('a second active grant made by postgres can be closed without losing managed ADMIN',()=>{
 const result=check(`SET ROLE postgres; GRANT dobby_missions_v2_writer TO postgres WITH ADMIN FALSE,INHERIT TRUE,SET TRUE; RESET ROLE;`,closeOwn+`
 SELECT pg_has_role('postgres','dobby_missions_v2_writer','USAGE'),pg_has_role('postgres','dobby_missions_v2_writer','SET'),
 (SELECT count(*) FROM pg_auth_members WHERE roleid='dobby_missions_v2_writer'::regrole AND member='postgres'::regrole),
 EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='dobby_missions_v2_writer'::regrole AND member='postgres'::regrole AND admin_option AND NOT inherit_option AND NOT set_option);`);
 assert.equal(passes(result),'f|f|2|t');
});
test('a different grantor with active INHERIT and SET is refused before maintenance',()=>refuses(check(foreign())));
test('residual inherited privileges alone are refused',()=>refuses(check(foreign(true,false))));
test('residual SET authority alone is refused',()=>refuses(check(foreign(false,true))));
test('an indirect membership cannot survive the projected closing unnoticed',()=>{
 refuses(check(`CREATE ROLE fixture_bridge NOLOGIN; GRANT dobby_missions_v2_writer TO fixture_bridge WITH INHERIT TRUE,SET TRUE; GRANT fixture_bridge TO postgres WITH INHERIT TRUE,SET TRUE;`));
});
test('a browser membership in a closed writer is refused',()=>refuses(check('GRANT dobby_socle_writer TO authenticated;')));
test('a writer that can log in is refused',()=>refuses(check('ALTER ROLE dobby_v7_writer LOGIN;')));
test('the normal closing statements do not close a grant made by another grantor',()=>{
 const value=db.run(`BEGIN; ${foreign()} SET ROLE postgres; ${closeOwn}
 SELECT pg_has_role('postgres','dobby_missions_v2_writer','USAGE'),pg_has_role('postgres','dobby_missions_v2_writer','SET'); ROLLBACK;`);
 assert.equal(value,'t|t');
});
test('a refusal rolls back all fictional setup and leaves the original catalogue intact',()=>{
 const before=snapshot();refuses(check(foreign()));assert.equal(snapshot(),before);
});
