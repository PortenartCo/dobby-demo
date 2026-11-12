/* Opt-in reuse of the completed historical campaign; current reset/global checks always rerun. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const WORKFLOW='.github/workflows/dobby-stitch-v7.yml',BRANCH='feat/dobby-v7-global-review-20261112',STEP='Functional Stitch roots and source fidelity';
const ALLOWED=new Set([WORKFLOW,'scripts/check-dobby-review-reuse.cjs','scripts/review/global-demo.js','essai-stitch-v7/tests/global-reset.cjs','scripts/build-dobby-global-review.cjs','essai-stitch-v7/tests/global-build.test.cjs','essai-stitch-v7/tests/global-browser.cjs']);
const allowed=file=>ALLOWED.has(file)||file.startsWith('docs/dobby-v7/');
function assertAllowedChanges(changes){
 const rejected=changes.filter(change=>!allowed(change.path));
 if(rejected.length)throw Error('Historical reuse rejected: changes outside the reset boundary: '+rejected.map(change=>change.path).join(', '));
}
function git(cwd,args){
 try{return execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});}
 catch{throw Error('Git verification failed: '+args[0]);}
}
async function verifyHistoricalReuse({runId,repository,currentSha,refName,token,apiUrl='https://api.github.com',cwd=process.cwd(),fetchImpl=fetch}){
 const proof={version:1,mode:'rejected',verifiedAt:new Date().toISOString(),repository,currentSha,refName,requestedRun:runId};
 try{
  if(!/^[1-9]\d*$/.test(runId)||!Number.isSafeInteger(Number(runId)))throw Error('historical_run must be a positive GitHub Actions run ID.');
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository||''))throw Error('A valid GitHub repository is required.');
  if(!/^[a-f0-9]{40}$/.test(currentSha||''))throw Error('A full current commit SHA is required.');
  if(refName!==BRANCH)throw Error('Historical reuse is restricted to the complete global-review campaign branch.');
  if(!token)throw Error('A read-only GitHub Actions token is required.');
  if(git(cwd,['rev-parse','HEAD']).trim()!==currentSha)throw Error('Checked-out HEAD differs from the current workflow SHA.');
  git(cwd,['diff','--quiet']);git(cwd,['diff','--cached','--quiet']);
  const repoPath=repository.split('/').map(encodeURIComponent).join('/');
  async function read(endpoint){
   let response;
   try{response=await fetchImpl(apiUrl.replace(/\/$/,'')+'/repos/'+repoPath+endpoint,{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'}});}
   catch{throw Error('Cannot read the GitHub Actions API.');}
   if(!response.ok)throw Error('GitHub Actions API request failed (HTTP '+response.status+').');
   return response.json();
  }
  const run=await read('/actions/runs/'+runId),baselineSha=run.head_sha;
  if(run.id!==Number(runId)||run.status!=='completed')throw Error('The baseline run must be completed.');
  if(run.repository?.full_name!==repository||run.head_repository?.full_name!==repository)throw Error('The baseline must use this repository, without a fork source.');
  if(run.path!==WORKFLOW||run.head_branch!==BRANCH||!['push','workflow_dispatch'].includes(run.event))throw Error('The baseline did not execute this branch’s complete historical workflow.');
  if(!/^[a-f0-9]{40}$/.test(baselineSha||''))throw Error('The baseline run has no valid immutable head SHA.');
  proof.baseline={runId:Number(runId),sha:baselineSha,url:run.html_url,workflow:run.path,branch:run.head_branch,event:run.event,attempt:run.run_attempt};
  let historical;
  for(let page=1;page<=20;page++){
   const data=await read('/actions/runs/'+runId+'/jobs?filter=latest&per_page=100&page='+page);
   if(!Array.isArray(data.jobs))throw Error('The baseline jobs response is invalid.');
   historical=data.jobs.find(job=>job.name==='source-backed-browser'&&job.status==='completed'&&job.head_sha===baselineSha&&job.steps?.some(step=>step.name===STEP&&step.status==='completed'&&step.conclusion==='success'));
   if(historical||data.jobs.length<100)break;
  }
  if(!historical)throw Error('No completed, successful historical source-fidelity step exists at the baseline SHA.');
  const step=historical.steps.find(item=>item.name===STEP&&item.status==='completed'&&item.conclusion==='success');
  proof.baseline.job={id:historical.id,url:historical.html_url,conclusion:historical.conclusion};
  proof.baseline.step={name:step.name,number:step.number,conclusion:step.conclusion,completedAt:step.completed_at};
  // Fetch the API-verified SHA itself; no branch-tip approximation is accepted.
  git(cwd,['fetch','--no-tags','--no-recurse-submodules','origin',baselineSha]);
  if(git(cwd,['rev-parse',baselineSha+'^{commit}']).trim()!==baselineSha)throw Error('The exact baseline commit could not be verified.');
  git(cwd,['merge-base','--is-ancestor',baselineSha,currentSha]);
  // Disable rename detection so both sides of a move must satisfy the boundary.
  const fields=git(cwd,['diff','--name-status','--no-renames','-z',baselineSha,currentSha,'--']).split('\0');fields.pop();
  if(fields.length%2)throw Error('Cannot parse the complete baseline diff.');
  proof.changes=[];for(let i=0;i<fields.length;i+=2)proof.changes.push({status:fields[i],path:fields[i+1]});
  assertAllowedChanges(proof.changes);
  proof.mode='historical-reused';proof.reusedStep=STEP;proof.reusedCheckpoints=62;proof.currentChecks='All remaining native, static, build, global browser, history and reset checks must run.';
  return proof;
 }catch(error){error.proof=proof;throw error;}
}
function writeProof(file,proof){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(proof,null,2)+'\n');}
async function runFromEnvironment(env=process.env){
 const runId=(env.DOBBY_HISTORICAL_RUN||'').trim(),evidence=env.DOBBY_REUSE_EVIDENCE||'docs/dobby-v7/evidence/global-review-20261112/historical-reuse.json';
 try{
  const proof=runId?await verifyHistoricalReuse({runId,repository:env.GITHUB_REPOSITORY,currentSha:env.GITHUB_SHA,refName:env.GITHUB_REF_NAME,token:env.GITHUB_TOKEN,apiUrl:env.GITHUB_API_URL}):{version:1,mode:'full-campaign',currentSha:env.GITHUB_SHA||git(process.cwd(),['rev-parse','HEAD']).trim(),verifiedAt:new Date().toISOString()};
  writeProof(evidence,proof);
  const reusable=proof.mode==='historical-reused';
  if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,'reusable='+reusable+'\n'+(reusable?'baseline_sha='+proof.baseline.sha+'\nbaseline_run='+proof.baseline.runId+'\n':''));
  if(env.GITHUB_STEP_SUMMARY)fs.appendFileSync(env.GITHUB_STEP_SUMMARY,reusable?'Historical campaign reused from [run '+proof.baseline.runId+']('+proof.baseline.url+') at `'+proof.baseline.sha+'`. Current commit: `'+proof.currentSha+'`. Only the historical step is reused; all other checks rerun. Verified changed paths:\n\n'+proof.changes.map(change=>'- `'+change.status+' '+change.path+'`').join('\n')+'\n':'Historical validation: the complete campaign will run.\n');
  console.log(reusable?'HISTORICAL_REUSE_VERIFIED '+proof.baseline.runId+' '+proof.baseline.sha+' '+proof.changes.length+' allowed paths':'HISTORICAL_FULL_CAMPAIGN_REQUIRED');
  return proof;
 }catch(error){
  writeProof(evidence,{...(error.proof||{}),mode:'rejected',error:error.message});
  if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,'reusable=false\n');
  console.error(error.message+' Run without historical_run to request the complete campaign.');
  throw error;
 }
}
module.exports={assertAllowedChanges,verifyHistoricalReuse,runFromEnvironment};
if(require.main===module)runFromEnvironment().catch(()=>{process.exitCode=1;});
