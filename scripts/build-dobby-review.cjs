/* Autonomous static preview; only the generated directory is published on main. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const profileArg=process.argv.indexOf('--profile'),profile=profileArg>=0?process.argv[profileArg+1]:'',corrected=profile==='integrated-e03-e06',integrated=corrected||profile==='integrated';
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output'),out=arg<0?path.join(repo,corrected?'essai-dobby-e03-e06-review-20261111-corrected':integrated?'essai-dobby-integrated-review':'essai-dobby-review'):path.resolve(process.argv[arg+1]),sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
fs.mkdirSync(out,{recursive:true});
const sha=data=>crypto.createHash('sha256').update(data).digest('hex'),records=[],csp="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; form-action 'none'; base-uri 'self'";
function copy(file){const rel=path.relative(repo,file).split(path.sep).join('/'),target=path.join(out,rel),raw=fs.readFileSync(file);let bytes=raw;
if(/\.html$/.test(file)){let text=raw.toString(),runtime=path.relative(path.dirname(target),path.join(out,'review-runtime.js')).split(path.sep).join('/'),config=path.relative(path.dirname(target),path.join(out,'review-config.js')).split(path.sep).join('/');text=text.replace(/<link\b[^>]*href=["']https?:[^>]*>/gi,'');text=text.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${csp}">${integrated?`<script src="${config}"></script>`:''}<script src="${runtime}"></script>`);bytes=Buffer.from(text);}
if(rel==='essai-stitch-v5-famille/family-v2.js')bytes=Buffer.from(raw.toString().replace('function openModal() {',"function openModal() {\n  if(window.DobbyReview){alert('Démonstration isolée : aucun compte familial réel. Les données restent dans cet aperçu.');return;}"));
if(integrated&&rel==='essai-stitch-v5-famille/family-profile.js'){
 const source=raw.toString(),marker='const linkedMember=()=>null;';if(!source.includes(marker))throw Error('Verified profile association stub changed; review required.');
 bytes=Buffer.from(source.replace(marker,"const linkedMember=members=>window.DobbyReview?.demoMemberId?(members||[]).find(member=>member.id===window.DobbyReview.demoMemberId)||null:null;"));
}
if(integrated&&rel==='essai-stitch-v5-famille/family-v2.js'){
 let source=bytes.toString();for(const marker of ['async function login(form) {','async function signIn(email,password){']){if(!source.includes(marker))throw Error('Native login facade changed; review required.');source=source.replace(marker,marker+"\n if(window.DobbyReview)throw Error('Connexion réelle désactivée dans cet aperçu fictif.');");}bytes=Buffer.from(source);
}
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);records.push({path:rel,sourceSha256:sha(raw),sha256:sha(bytes),transformed:!bytes.equals(raw)});}
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','tests','.git'].includes(entry.name))continue;const file=path.join(dir,entry.name);entry.isDirectory()?walk(file):copy(file);}}
for(const dir of ['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets'])walk(path.join(repo,dir));
fs.copyFileSync(path.join(__dirname,'review/review-runtime.js'),path.join(out,'review-runtime.js'));
if(integrated){
 let config=fs.readFileSync(path.join(__dirname,'review/integrated-config.js'),'utf8');
 // The old review's seed and data stay unchanged. This revision receives its
 // own realm, so a past OFF choice is neither inherited nor silently erased.
 if(corrected)config+='\nwindow.DobbyReviewConfig=Object.freeze({...window.DobbyReviewConfig,storagePrefix:"dobby-review-e03-e06-20261111|",label:"Revue E03–E06",info:"Aperçu fictif des correctifs E03–E06, séparé des revues précédentes. Missions, récurrences, récompenses personnalisées et annulations de runes sont testables localement. Les compensations partagées demandent une adaptation serveur distincte ; aucun compte ni partage réel n’est activé. Questionnaires et résultats utilisent les moteurs natifs. Les autres rubriques conservent leur état de revue antérieur. Publication et validation humaine restent à effectuer."});\n';
 fs.writeFileSync(path.join(out,'review-config.js'),config);
}
const entry=integrated?'essai-stitch-v7/traverse.html':'essai-stitch-v7/index.html#taverne';
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./${entry}"><title>DOBBY — Revue interactive</title></head><body><a href="./${entry}">Ouvrir DOBBY en démonstration</a></body></html>\n`);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'review-manifest.json'),JSON.stringify({version:integrated?'E01-E08':'E07.2',sourceSha,base:corrected?'66a1395bb95ff7b9a7e2d1b981f5a8773070c03e':integrated?'e0e88a06485018f5e94eb4aeae886cacbf41c67b':'010f3119cdf9c5cc4618f601333d6c96aa8dec51',...(corrected?{reviewScope:'E03-E06-20261111',sourceReferences:{e06:'73861879625615c358cf4de181189a9f5acbdff6',e01e05:'e2a8e1d830d76b5e2bcccf40bbe46c6eb88a8a7d'},sourceDirty:!!execFileSync('git',['status','--porcelain','--untracked-files=normal','--','essai-stitch-v7','essai-stitch-v5-famille','scripts/build-dobby-review.cjs','scripts/review'],{cwd:repo,encoding:'utf8'}).trim()}:{}),entry,storagePrefix:corrected?'dobby-review-e03-e06-20261111|':integrated?'dobby-review-integrated-v1|':'dobby-review-e072|',realBackend:false,demoMemberAssociation:integrated?'explicit-fictional-persona-only':'unavailable',configSha256:integrated?sha(fs.readFileSync(path.join(out,'review-config.js'))):null,files:records.sort((a,b)=>a.path.localeCompare(b.path)),runtimeSha256:sha(fs.readFileSync(path.join(out,'review-runtime.js')))},null,2)+'\n');
console.log('REVIEW_BUILD',sourceSha,records.length+' files',out);
