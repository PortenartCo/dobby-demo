/* Autonomous static preview; only the generated directory is published on main. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output'),out=arg<0?path.join(repo,'essai-dobby-review'):path.resolve(process.argv[arg+1]),sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
fs.mkdirSync(out,{recursive:true});
const sha=data=>crypto.createHash('sha256').update(data).digest('hex'),records=[],csp="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; form-action 'none'; base-uri 'self'";
function copy(file){const rel=path.relative(repo,file).split(path.sep).join('/'),target=path.join(out,rel),raw=fs.readFileSync(file);let bytes=raw;
if(/\.html$/.test(file)){let text=raw.toString(),runtime=path.relative(path.dirname(target),path.join(out,'review-runtime.js')).split(path.sep).join('/');text=text.replace(/<link\b[^>]*href=["']https?:[^>]*>/gi,'');text=text.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${csp}"><script src="${runtime}"></script>`);bytes=Buffer.from(text);}
if(rel==='essai-stitch-v5-famille/family-v2.js')bytes=Buffer.from(raw.toString().replace('function openModal() {',"function openModal() {\n  if(window.DobbyReview){alert('Démonstration isolée : aucun compte familial réel. Les données restent dans cet aperçu.');return;}"));
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);records.push({path:rel,sourceSha256:sha(raw),sha256:sha(bytes),transformed:!bytes.equals(raw)});}
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','tests','.git'].includes(entry.name))continue;const file=path.join(dir,entry.name);entry.isDirectory()?walk(file):copy(file);}}
for(const dir of ['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets'])walk(path.join(repo,dir));
fs.copyFileSync(path.join(__dirname,'review/review-runtime.js'),path.join(out,'review-runtime.js'));
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./essai-stitch-v7/index.html#taverne"><title>DOBBY — Revue interactive</title></head><body><a href="./essai-stitch-v7/index.html#taverne">Ouvrir DOBBY en démonstration</a></body></html>\n');
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'review-manifest.json'),JSON.stringify({version:'E07.2',sourceSha,base:'010f3119cdf9c5cc4618f601333d6c96aa8dec51',entry:'essai-stitch-v7/index.html#taverne',storagePrefix:'dobby-review-e072|',realBackend:false,files:records.sort((a,b)=>a.path.localeCompare(b.path)),runtimeSha256:sha(fs.readFileSync(path.join(out,'review-runtime.js')))},null,2)+'\n');
console.log('REVIEW_BUILD',sourceSha,records.length+' files',out);
