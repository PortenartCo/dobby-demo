/* Autonomous static preview; only the generated directory is published on main. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const profileArg=process.argv.indexOf('--profile'),profile=profileArg>=0?process.argv[profileArg+1]:'e072',integrated=profile==='integrated',e073=profile==='e073',e074=profile==='e074',configured=integrated||e073||e074;
if(!['e072','integrated','e073','e074'].includes(profile))throw Error('Unknown review profile: '+profile);
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output'),out=arg<0?path.join(repo,e074?'essai-dobby-e07-consolidation-review-20261111':e073?'essai-dobby-e07-review-20261111':integrated?'essai-dobby-integrated-review':'essai-dobby-review'):path.resolve(process.argv[arg+1]),sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const sourceDirtyPaths=e074?execFileSync('git',['status','--porcelain','--','essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets','scripts/build-dobby-review.cjs','scripts/review'],{cwd:repo,encoding:'utf8'}).split('\n').filter(line=>line.trim()).map(line=>line.slice(3)).filter(file=>!file.includes('/tests/')):[];
if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
fs.mkdirSync(out,{recursive:true});
const sha=data=>crypto.createHash('sha256').update(data).digest('hex'),records=[],csp="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; form-action 'none'; base-uri 'self'";
// Old Stitch CDN references in the invisible engine must not trigger external
// loads in the E07.3 demo. Source files remain intact and transformed hashes
// identify this generic, non-photographic fallback in the generated copy.
const missingArt='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#2c1c18"/><text x="160" y="104" text-anchor="middle" fill="#d4c4b1" font-size="14">Illustration non disponible</text></svg>');
function copy(file){const rel=path.relative(repo,file).split(path.sep).join('/'),target=path.join(out,rel),raw=fs.readFileSync(file);let bytes=raw;
if(/\.html$/.test(file)){let text=raw.toString(),runtime=path.relative(path.dirname(target),path.join(out,'review-runtime.js')).split(path.sep).join('/'),config=path.relative(path.dirname(target),path.join(out,'review-config.js')).split(path.sep).join('/');text=text.replace(/<link\b[^>]*href=["']https?:[^>]*>/gi,'');text=text.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${csp}">${configured?`<script src="${config}"></script>`:''}<script src="${runtime}"></script>`);bytes=Buffer.from(text);}
if(rel==='essai-stitch-v5-famille/family-v2.js')bytes=Buffer.from(raw.toString().replace('function openModal() {',"function openModal() {\n  if(window.DobbyReview){alert('Démonstration isolée : aucun compte familial réel. Les données restent dans cet aperçu.');return;}"));
if(configured&&rel==='essai-stitch-v5-famille/family-profile.js'){
 const source=raw.toString(),marker='const linkedMember=()=>null;';if(!source.includes(marker))throw Error('Verified profile association stub changed; review required.');
 bytes=Buffer.from(source.replace(marker,"const linkedMember=members=>window.DobbyReview?.demoMemberId?(members||[]).find(member=>member.id===window.DobbyReview.demoMemberId)||null:null;"));
}
if(configured&&rel==='essai-stitch-v5-famille/family-v2.js'){
 let source=bytes.toString();for(const marker of ['async function login(form) {','async function signIn(email,password){']){if(!source.includes(marker))throw Error('Native login facade changed; review required.');source=source.replace(marker,marker+"\n if(window.DobbyReview)throw Error('Connexion réelle désactivée dans cet aperçu fictif.');");}bytes=Buffer.from(source);
}
if((e073||e074)&&/\.(html|js)$/.test(file))bytes=Buffer.from(bytes.toString().replace(/https:\/\/lh3\.googleusercontent\.com\/aida-public\/[^\s"'<>`)\\]+/g,missingArt));
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);records.push({path:rel,sourceSha256:sha(raw),sha256:sha(bytes),transformed:!bytes.equals(raw)});}
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','tests','.git'].includes(entry.name))continue;const file=path.join(dir,entry.name);entry.isDirectory()?walk(file):copy(file);}}
for(const dir of ['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets'])walk(path.join(repo,dir));
fs.copyFileSync(path.join(__dirname,'review/review-runtime.js'),path.join(out,'review-runtime.js'));
if(configured)fs.copyFileSync(path.join(__dirname,e074?'review/e074-config.js':e073?'review/e073-config.js':'review/integrated-config.js'),path.join(out,'review-config.js'));
const entry=integrated?'essai-stitch-v7/traverse.html':'essai-stitch-v7/index.html#taverne';
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./${entry}"><title>DOBBY — Revue interactive</title></head><body><a href="./${entry}">Ouvrir DOBBY en démonstration</a></body></html>\n`);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'review-manifest.json'),JSON.stringify({...(e074?{sourceState:sourceDirtyPaths.length?'working-tree':'committed',sourceDirtyPaths}:{}),version:e074?'E07.4':e073?'E07.3':integrated?'E01-E08':'E07.2',sourceSha,base:e074?'c121027e53b335800d1559a39481c774a137a3fa':e073?'66a1395bb95ff7b9a7e2d1b981f5a8773070c03e':integrated?'e0e88a06485018f5e94eb4aeae886cacbf41c67b':'010f3119cdf9c5cc4618f601333d6c96aa8dec51',entry,storagePrefix:e074?'dobby-review-e074-20261111|':e073?'dobby-review-e073-20261111|':integrated?'dobby-review-integrated-v1|':'dobby-review-e072|',realBackend:false,demoMemberAssociation:configured?'explicit-fictional-persona-only':'unavailable',configSha256:configured?sha(fs.readFileSync(path.join(out,'review-config.js'))):null,files:records.sort((a,b)=>a.path.localeCompare(b.path)),runtimeSha256:sha(fs.readFileSync(path.join(out,'review-runtime.js'))),externalStitchMedia:(e073||e074)?'generic-inert-fallback-in-generated-copy-only':undefined},null,2)+'\n');
console.log('REVIEW_BUILD',sourceSha,records.length+' files',out);
