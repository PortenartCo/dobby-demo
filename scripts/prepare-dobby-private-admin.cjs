/* Materialize selected upstream references outside this checkout. */
'use strict';

const { execFile } = require('node:child_process');
const { createHash } = require('node:crypto');
const { existsSync, realpathSync } = require('node:fs');
const { mkdir, writeFile } = require('node:fs/promises');
const { basename, dirname, join, relative, resolve, sep } = require('node:path');
const { parseArgs, promisify } = require('node:util');
const upstream = require('../docs/dobby-v7/mise-en-service/administration-privee-sources.json');

const execute = promisify(execFile);
const reference = 'PortenartCo/dobby-demo';

function outputDirectory(destination) {
  if (!destination) throw Error('Indiquez un nouveau dossier privé avec --output.');
  const checkout = realpathSync(join(__dirname, '..'));
  const absolute = resolve(destination);
  const output = join(realpathSync(dirname(absolute)), basename(absolute));
  const fromCheckout = relative(checkout, output);
  if (fromCheckout !== '..' && !fromCheckout.startsWith(`..${sep}`)) {
    throw Error('Le dossier de références doit être situé hors du dépôt.');
  }
  if (existsSync(output)) throw Error('Choisissez un dossier de sortie encore inexistant.');
  return output;
}

function pinnedSources() {
  if (upstream.schema !== 1 || upstream.repository !== reference) throw Error('Source d’administration inconnue.');
  const paths = new Set();
  const sources = [];
  for (const group of upstream.groups) {
    if (!/^[0-9a-f]{40}$/.test(group.commit)) throw Error('Commit source non immuable.');
    for (const file of group.files) {
      const parts = file.path.split('/');
      if (parts.some(part => !/^[A-Za-z0-9_.-]+$/.test(part) || part === '.' || part === '..') ||
          paths.has(file.path) || !/^[0-9a-f]{64}$/.test(file.sha256)) {
        throw Error(`Entrée de provenance invalide pour ${file.path}`);
      }
      paths.add(file.path);
      sources.push({
        pullRequest: group.pullRequest,
        commit: group.commit,
        path: `references/${file.path}`,
        url: `https://raw.githubusercontent.com/${reference}/${group.commit}/${file.path}`,
        sha256: file.sha256,
      });
    }
  }
  return sources;
}

async function download(source) {
  const { stdout } = await execute('curl', [
    '-q', '--fail', '--silent', '--show-error', '--proto', '=https', '--max-time', '30', source.url,
  ], { encoding: 'buffer', maxBuffer: 2 * 1024 * 1024 });
  const sha256 = createHash('sha256').update(stdout).digest('hex');
  if (sha256 !== source.sha256) throw Error(`L’empreinte SHA-256 diffère pour ${source.path}`);
  return { ...source, bytes: stdout.length, content: stdout };
}

async function main() {
  const { values } = parseArgs({ options: { output: { type: 'string' } } });
  const output = outputDirectory(values.output);
  const files = [];
  for (const source of pinnedSources()) files.push(await download(source));

  await mkdir(output, { mode: 0o700 });
  for (const file of files) {
    const target = join(output, file.path);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, file.content, { flag: 'wx', mode: 0o600 });
  }
  const manifest = {
    schema: upstream.schema,
    repository: reference,
    purpose: 'references-local-review-only',
    files: files.map(({ content, ...file }) => file),
  };
  await writeFile(join(output, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(`${files.length} fichiers vérifiés dans ${output}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
