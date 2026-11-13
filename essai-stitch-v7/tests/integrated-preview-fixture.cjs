/* Ephemeral output for the historical integrated browser regression. */
const fs=require('node:fs'),path=require('node:path');
function withIntegratedPreview({repo,origin,build,test}){
 const temporary=fs.mkdtempSync(path.join(repo,'.dobby-ci-integrated-'));
 const output=path.join(temporary,'bundle');
 const cleanup=()=>fs.rmSync(temporary,{recursive:true,force:true});
 // ci.cjs exits immediately on a failed child. The exit listener covers that
 // path; finally covers normal completion and thrown build/test failures.
 process.once('exit',cleanup);
 try{
  build(output);
  const relative=path.relative(repo,output).split(path.sep).join('/');
  return test(new URL(relative+'/',origin.replace(/\/+$/,'')+'/').href);
 }finally{process.removeListener('exit',cleanup);cleanup();}
}
module.exports={withIntegratedPreview};
