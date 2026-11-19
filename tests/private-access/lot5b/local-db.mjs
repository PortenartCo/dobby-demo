// Permission/catalogue fixture only. No business-function or hosted-data model.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

export const image='postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4';
const environment=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('DOCKER_')));
export function createDatabase(){
 const name='dobby-lot5b-permissions-'+process.pid+'-'+randomBytes(5).toString('hex');
 let owned=false;
 const docker=(args,input)=>spawnSync('docker',['--host','unix:///var/run/docker.sock',...args],{input,encoding:'utf8',env:environment,timeout:10000,maxBuffer:2*1024*1024});
 const must=result=>{assert.equal(result.status,0,result.stderr||result.error?.message);return result.stdout.trim();};
 const raw=sql=>docker(['exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-U','lot5b_fixture_root','-d','lot5b'],sql);
 const run=sql=>must(raw(sql));
 function close(){if(owned){must(docker(['rm','-f',name]));owned=false;}}
 try{
  must(docker(['run','--pull=never','--rm','-d','--name',name,'--label','dobby.private-access-test=lot5b',
   '--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_USER=lot5b_fixture_root',
   '-e','POSTGRES_DB=lot5b','-e','POSTGRES_HOST_AUTH_METHOD=trust',image]));owned=true;
  const until=Date.now()+45000;let ready=false;
  while(Date.now()<until){
   if(docker(['exec',name,'cat','/proc/1/comm']).stdout?.trim()==='postgres'&&raw('SELECT 1;').status===0){ready=true;break;}
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);
  }
  assert.ok(ready,'Owned PostgreSQL fixture did not start: '+docker(['logs',name]).stderr);
  const info=JSON.parse(must(docker(['inspect',name])))[0];
  assert.equal(info.HostConfig.NetworkMode,'none');
  assert.ok(!info.HostConfig.PortBindings||Object.keys(info.HostConfig.PortBindings).length===0);
  assert.ok(!info.Mounts.some(mount=>mount.Type==='bind'));
  run(`CREATE ROLE postgres NOSUPERUSER NOINHERIT CREATEROLE NOBYPASSRLS;
   CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
   CREATE ROLE fixture_grantor NOLOGIN CREATEROLE;
   CREATE ROLE dobby_v7_writer NOLOGIN NOINHERIT NOBYPASSRLS;
   CREATE ROLE dobby_socle_writer NOLOGIN NOINHERIT NOBYPASSRLS;
   CREATE ROLE dobby_missions_v2_writer NOLOGIN NOINHERIT NOBYPASSRLS;
   CREATE ROLE dobby_access_writer NOLOGIN NOINHERIT NOBYPASSRLS;
   GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer
    TO postgres WITH ADMIN TRUE, INHERIT FALSE, SET FALSE;
   GRANT dobby_missions_v2_writer TO fixture_grantor WITH ADMIN TRUE, INHERIT FALSE, SET TRUE;`);
  return {raw,run,close,version:run('SHOW server_version;'),name,image};
 }catch(error){close();throw error;}
}
