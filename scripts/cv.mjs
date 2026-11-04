// CV upload ↔ the repo's `cv` release (why the PDF stays out of git: src/config/cv.mjs).
//   node scripts/cv.mjs ensure   before dev / cms / build: keep cvDir out of git, and download
//                                the published CV if this machine doesn't have it yet.
//   node scripts/cv.mjs publish  from publish.cmd: make the release hold exactly the admin's
//                                current CV under its dated name. Exit 2 = it changed.
//   node scripts/cv.mjs redeploy from publish.cmd when only the CV changed (no push to deploy).
// Needs the GitHub CLI for publish only (winget install --id GitHub.cli, then gh auth login).
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, statSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readSingleton } from './lib/singleton.mjs';
import { cvDir, cvRelease, cvName, cvSource } from '../src/config/cv.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { repo, tag } = cvRelease;
const settings = readSingleton('site') ?? {};
const source = cvSource(settings.cvUrl);
const name = cvName(settings.cvMonth ?? '');

const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const gh = (...args) => run('gh', [...args, '--repo', repo]);

function excludeFromGit() {
  let file;
  try {
    file = resolve(ROOT, run('git', ['rev-parse', '--git-path', 'info/exclude']).trim());
  } catch {
    return; // not a git checkout
  }
  const line = `/${cvDir}/`;
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (current.split(/\r?\n/).includes(line)) return;
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${current && !current.endsWith('\n') ? '\n' : ''}${line}\n`);
  console.log(`[cv] added ${line} to ${file}`);
}

async function download(assetName) {
  const res = await fetch(`https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(assetName)}`);
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

async function ensure() {
  excludeFromGit();
  if (!source) return;
  const file = resolve(ROOT, source);
  if (existsSync(file)) return;
  const pdf = await download(name);
  if (!pdf) {
    throw new Error(`the admin has a CV set but ${source} is missing here, and ${name} isn't on the ${tag} release of ${repo}. ` +
      `Upload the CV again in the admin (Site settings), or clear the CV field.`);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, pdf);
  console.log(`[cv] downloaded ${name} → ${source}`);
}

function releaseAssets() {
  try {
    return JSON.parse(gh('release', 'view', tag, '--json', 'assets')).assets;
  } catch (e) {
    if (!/release not found/i.test(String(e.stderr))) throw e;
    return null;
  }
}

async function publish() {
  excludeFromGit();
  try {
    run('gh', ['--version']);
  } catch {
    throw new Error('the GitHub CLI is missing. Install it (winget install --id GitHub.cli), run gh auth login once, then publish again.');
  }
  let assets = releaseAssets();
  let changed = false;

  if (source) {
    const file = resolve(ROOT, source);
    if (!existsSync(file)) throw new Error(`the admin has a CV set but ${source} is missing. Upload it again in the admin.`);
    const local = readFileSync(file);
    const published = assets?.find((a) => a.name === name);
    const same = published && (await download(name))?.equals(local);
    if (!same) {
      // a stale copy on another machine must not overwrite a newer upload
      if (published && statSync(file).mtime < new Date(published.updatedAt)) {
        throw new Error(`${source} on this machine is older than the published ${name}. ` +
          `Delete ${source} to pull the published one, or upload the new CV in the admin again.`);
      }
      if (!assets) {
        gh('release', 'create', tag, '--title', 'CV', '--latest=false',
          '--notes', 'Holds only the current CV, which the site publishes. Managed by scripts/cv.mjs.');
        assets = [];
      }
      const dir = mkdtempSync(join(tmpdir(), 'cv-'));
      try {
        copyFileSync(file, join(dir, name));
        gh('release', 'upload', tag, join(dir, name), '--clobber');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
      console.log(`[cv] published ${name}`);
      changed = true;
    }
  }

  for (const old of (assets ?? []).filter((a) => !source || a.name !== name)) {
    gh('release', 'delete-asset', tag, old.name, '--yes');
    console.log(`[cv] deleted ${old.name} from the ${tag} release`);
    changed = true;
  }
  return changed;
}

const cmd = process.argv[2];
try {
  if (cmd === 'ensure') await ensure();
  else if (cmd === 'publish') process.exitCode = (await publish()) ? 2 : 0;
  else if (cmd === 'redeploy') gh('workflow', 'run', 'deploy.yml', '--ref', 'main');
  else throw new Error('usage: node scripts/cv.mjs ensure|publish|redeploy');
} catch (e) {
  console.error(`[cv] ${e.message}${e.stderr ? `\n${e.stderr}` : ''}`);
  process.exitCode = 1;
}
