#!/usr/bin/env node
/* update/refresh-and-push.mjs — one-shot live data refresh for بسته‌یاب
 *
 * WHAT IT DOES
 *   1. Clones the GitHub repo (main) into a throwaway temp dir — your working
 *      copy and its uncommitted changes are never touched.
 *   2. Runs the live adapters (node update/fetch-providers.mjs) inside the
 *      clone. Run this from inside Iran and the geo-blocked providers
 *      (mci shop / my.mci.ir portal / irancell / rightel) refresh for real.
 *   3. Audits every changed file against HEAD and validates it. A push
 *      happens only if the audit passes.
 *   4. Commits "data: refresh <date>" and pushes to origin/main — never
 *      force-pushes, never touches anything outside src/data/providers.
 *
 * MCI PORTAL PHONE (my.mci.ir)
 *   The my.mci.ir catalog API needs no login — only a ?phoneNumber= query
 *   parameter (the portal personalizes the catalog by line). That number is
 *   personal data, so it lives in update/my.mci.txt NEXT TO THIS SCRIPT in
 *   your working copy (one line, e.g. 09123456789; # comments allowed).
 *   The file is gitignored, is NOT in the temp clone, and this script passes
 *   it to the adapter via the MCI_PHONE env var — an already-set MCI_PHONE
 *   wins. The number is never printed (only a masked hint) and never lands
 *   in any committed file. Skip the file and the mci portal part simply
 *   keeps its previous capture (stale-keep).
 *
 * USAGE
 *   node update/refresh-and-push.mjs                 # full live refresh + push
 *   node update/refresh-and-push.mjs --only rightel  # single provider
 *   node update/refresh-and-push.mjs --dry-run       # everything except push
 *   node update/refresh-and-push.mjs --force         # override soft guards
 *   node update/refresh-and-push.mjs --with-build    # npm ci + next build before push
 *
 * FLAGS
 *   --dry-run      do the full run (clone/update/audit/commit) but stop
 *                  before pushing; prints what would be pushed.
 *   --force        overrides the *soft* guards only (see below). Never
 *                  overrides a hard failure.
 *   --only <id>    samantel | aptel | mci | mci-modem | irancell | rightel |
 *                  rightel-tdlte | tci | asiatech
 *   --with-build   run `npm ci` + `npm run build` in the clone and require a
 *                  green build before pushing (slow; off by default because
 *                  the JSON validators below already cover the data).
 *   --remote <url> default https://github.com/M-Zoghi/baste-yab.git
 *
 * GUARDS
 *   Hard (always abort, --force cannot override):
 *     - changed file is not valid JSON, or a package is missing id/title/
 *       kind/gb/days/price, or non-positive gb/days/price, duplicate ids
 *     - fetchedAt went backwards or stayed the same while the file changed
 *     - the update touched anything outside src/data/providers/*.json
 *       (new files, deletions, code changes — nothing but data may move)
 *     - clone/push transport errors
 *   Soft (abort by default, --force overrides — use only after reading why):
 *     - package count dropped >25% and >3 vs HEAD (catalog collapse / API
 *       shape change), or fewer than 3 packages survived
 *     - source downgraded api → html (e.g. mci shop unreachable and the
 *       adapter regressed to the 30-pack marketing page)
 *     - some adapters failed while others changed files (partial run)
 *
 * EXIT CODES
 *   0 success (pushed, or nothing needed doing)
 *   1 safeguard abort — read the log, fix the cause, or consciously --force
 *   2 environment/transport error (git missing, clone/push failed, …)
 *
 * NOTES
 *   - Requires git + node on PATH (same as the rest of the repo). npm is
 *     only needed with --with-build.
 *   - Temp dir: one fresh dir per run under os.tmpdir(); deleted on exit.
 *     A crashed run may leave one behind — safe to delete any
 *     baste-yab-refresh-* dir in %TEMP% / /tmp.
 *   - fetch-providers.mjs always exits 0 (even with failed adapters), so
 *     this script never trusts its exit code — it parses its output and
 *     audits the working tree itself.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/* ─── constants ─────────────────────────────────────────────────────── */

const DEFAULT_REMOTE = 'https://github.com/M-Zoghi/baste-yab.git';
const BRANCH = 'main';
const DATA_PREFIX = 'src/data/providers/';
const KNOWN_ONLY = new Set([
  'samantel', 'aptel', 'mci', 'mci-modem', 'irancell', 'rightel', 'rightel-tdlte', 'tci', 'asiatech',
]);
const TIME = {
  clone: 180_000,
  fetch: 300_000,
  npm: 600_000,
  build: 600_000,
  push: 120_000,
  probe: 30_000,
};

/* ─── tiny console helpers (plain ASCII — works everywhere) ─────────── */

const say = (tag, msg) => console.log(`${tag} ${msg}`);
const ok = (msg) => say('[ok]  ', msg);
const step = (msg) => say('[..]  ', msg);
const warn = (msg) => say('[warn]', msg);
const bad = (msg) => say('[ABORT]', msg);
const die = (code, msg) => { bad(msg); process.exit(code); };

/* ─── arg parsing (strict: unknown flag = typo = stop) ──────────────── */

function parseArgs(argv) {
  const o = { dryRun: false, force: false, withBuild: false, only: null, remote: DEFAULT_REMOTE };
  for (let i = 0; i < argv.length;) {
    const a = argv[i];
    if (a === '--dry-run') { o.dryRun = true; i += 1; }
    else if (a === '--force') { o.force = true; i += 1; }
    else if (a === '--with-build') { o.withBuild = true; i += 1; }
    else if (a === '--only') {
      if (!argv[i + 1]) die(2, `--only needs a value (${[...KNOWN_ONLY].join(' | ')})`);
      o.only = argv[i + 1]; i += 2;
    } else if (a === '--remote') {
      if (!argv[i + 1]) die(2, '--remote needs a URL');
      o.remote = argv[i + 1]; i += 2;
    } else {
      die(2, `unknown flag: ${a} (allowed: --dry-run --force --with-build --only <id> --remote <url>)`);
    }
  }
  if (o.only !== null && !KNOWN_ONLY.has(o.only)) {
    die(2, `--only ${o.only}: unknown provider id (${[...KNOWN_ONLY].join(' | ')})`);
  }
  if (!o.remote) die(2, 'empty --remote');
  return o;
}

/* ─── subprocess helpers ────────────────────────────────────────────── */
/* git and node are spawned without a shell (safe arg passing on Windows).
   npm is a .cmd on Windows — only it gets shell:true, with simple flags. */

function sh(file, args, { cwd, timeoutMs, shell = false }) {
  const r = spawnSync(file, args, { cwd, timeout: timeoutMs, encoding: 'utf8', shell, maxBuffer: 32 * 1024 * 1024 });
  if (r.error) {
    const m = r.error.code === 'ENOENT'
      ? `${file} not found on PATH`
      : `${file}: ${r.error.message}`;
    return { status: 1, error: m, stdout: r.stdout || '', stderr: m };
  }
  return r;
}

function git(args, { cwd, timeoutMs = 60_000 }) {
  return sh('git', args, { cwd, timeoutMs, shell: false });
}

function gitText(args, { cwd, timeoutMs = 60_000 }) {
  const r = git(args, { cwd, timeoutMs });
  if (r.status !== 0) {
    return { ok: false, text: (r.stderr || r.stdout || '').trim() };
  }
  return { ok: true, text: (r.stdout || '').trim() };
}

/* porcelain output must NOT be trimmed: its first line can start with a
   meaningful space (" M path" = unstaged modify). Trim would eat it. */
function gitRaw(args, { cwd, timeoutMs = 60_000 }) {
  const r = git(args, { cwd, timeoutMs });
  if (r.status !== 0) return { ok: false, text: (r.stderr || r.stdout || '').trim() };
  return { ok: true, text: r.stdout || '' };
}

const npm = (args, cwd, timeoutMs) =>
  sh('npm', args, { cwd, timeoutMs, shell: process.platform === 'win32' });

const runNode = (script, args, cwd, timeoutMs) =>
  sh(process.execPath, [script, ...args], { cwd, timeoutMs, shell: false });

const iso = () => new Date().toISOString().slice(0, 10);

/* ─── per-file validation ───────────────────────────────────────────── */
/* Every issue is { level: 'fatal' | 'guard', msg }. fatal: never push.
   guard: not pushed unless --force. */

function validateDataFile(rel, oldRaw, newRaw) {
  const issues = [];
  let neu = null;
  let old = null;

  try { neu = JSON.parse(newRaw); }
  catch (e) {
    return { issues: [{ level: 'fatal', msg: `${rel}: new file is not valid JSON (${e.message})` }], neu: null, old: null };
  }

  if (oldRaw !== null) {
    try { old = JSON.parse(oldRaw); }
    catch { issues.push({ level: 'fatal', msg: `${rel}: HEAD version is not valid JSON — refusing to proceed` }); old = null; }
  }

  const at = (d) => (d && d.source && d.source.fetchedAt) || null;

  /* hard: shape */
  if (!neu || typeof neu !== 'object') { issues.push({ level: 'fatal', msg: `${rel}: top level is not an object` }); return { issues, neu, old }; }
  if (!Array.isArray(neu.packages) || neu.packages.length === 0) {
    issues.push({ level: 'fatal', msg: `${rel}: packages missing or empty` });
  }
  if (!Array.isArray(neu.excluded)) issues.push({ level: 'fatal', msg: `${rel}: excluded is not an array` });
  if (!neu.source || typeof neu.source !== 'object') issues.push({ level: 'fatal', msg: `${rel}: source missing` });
  else {
    if (neu.source.kind !== 'api' && neu.source.kind !== 'html') {
      issues.push({ level: 'fatal', msg: `${rel}: source.kind "${neu.source.kind}" is neither api nor html` });
    }
    if (!neu.source.fetchedAt || !Date.parse(neu.source.fetchedAt)) {
      issues.push({ level: 'fatal', msg: `${rel}: source.fetchedAt missing or unparseable` });
    }
  }
  if (!neu.prices || neu.prices.unit !== 'toman') {
    issues.push({ level: 'fatal', msg: `${rel}: prices.unit is not "toman"` });
  }

  /* hard: per-package sanity + duplicate ids */
  const ids = new Set();
  if (Array.isArray(neu.packages)) {
    neu.packages.forEach((p, i) => {
      const w = `${rel}: package #${i} (${p && p.id ? p.id : '?'})`;
      if (!p || typeof p !== 'object') { issues.push({ level: 'fatal', msg: `${w}: not an object` }); return; }
      if (typeof p.id !== 'string' || !p.id) { issues.push({ level: 'fatal', msg: `${w}: id missing` }); return; }
      if (ids.has(p.id)) issues.push({ level: 'fatal', msg: `${rel}: duplicate id "${p.id}"` });
      ids.add(p.id);
      if (typeof p.title !== 'string' || !p.title.trim()) issues.push({ level: 'fatal', msg: `${w}: title missing` });
      if (typeof p.kind !== 'string' || !p.kind.trim()) issues.push({ level: 'fatal', msg: `${w}: kind missing` });
      if (typeof p.gb !== 'number' || !(p.gb > 0)) issues.push({ level: 'fatal', msg: `${w}: gb=${p.gb} not a positive number` });
      if (typeof p.days !== 'number' || !(p.days > 0)) issues.push({ level: 'fatal', msg: `${w}: days=${p.days} not a positive number` });
      if (typeof p.price !== 'number' || !(p.price > 0)) issues.push({ level: 'fatal', msg: `${w}: price=${p.price} not a positive number` });
    });
  }

  /* hard: fetchedAt must move forward on a changed file */
  const oldAt = at(old);
  const newAt = at(neu);
  if (old && oldAt && newAt) {
    if (Date.parse(newAt) <= Date.parse(oldAt)) {
      issues.push({
        level: 'fatal',
        msg: `${rel}: fetchedAt ${newAt} is not newer than HEAD's ${oldAt} — a changed file must carry a fresher capture`,
      });
    }
  }

  /* soft: catalog collapse */
  if (old && Array.isArray(old.packages) && Array.isArray(neu.packages)) {
    const oc = old.packages.length;
    const nc = neu.packages.length;
    if (oc > 0 && nc < oc * 0.75 && oc - nc > 3) {
      issues.push({
        level: 'guard',
        msg: `${rel}: package count dropped ${oc} → ${nc} (−${oc - nc}, ${Math.round((1 - nc / oc) * 100)}%) — looks like an API shape change or a fallback regression, not a real catalog shrink`,
      });
    }
    if (nc < 3 && oc >= 3) {
      issues.push({ level: 'guard', msg: `${rel}: only ${nc} packages survived (was ${oc})` });
    }
  }

  /* soft: source downgrade */
  if (old && old.source && old.source.kind === 'api' && neu.source && neu.source.kind === 'html') {
    issues.push({
      level: 'guard',
      msg: `${rel}: source downgraded api → html (richer live API replaced by a weaker page scrape) — e.g. mci shop unreachable and the adapter fell back to the marketing page`,
    });
  }

  return { issues, neu, old };
}

/* human-readable one-liner about what moved in a file (for the log + commit body) */
function describeChange(rel, old, neu) {
  const oc = old && Array.isArray(old.packages) ? old.packages.length : 0;
  const nc = neu && Array.isArray(neu.packages) ? neu.packages.length : 0;
  const oAt = old && old.source ? (old.source.fetchedAt || '?').slice(0, 10) : '—';
  const nAt = neu && neu.source ? (neu.source.fetchedAt || '?').slice(0, 10) : '—';
  return `${rel}: ${oc}→${nc} packs, kind ${old?.source?.kind ?? '—'}→${neu?.source?.kind ?? '—'}, fetchedAt ${oAt}→${nAt}`;
}

/* price/volume/duration moves vs HEAD, by id — for eyeballing before it ships */
function diffPackages(old, neu) {
  const out = { added: [], removed: [], changed: [] };
  if (!old || !neu) return out;
  const om = new Map((old.packages || []).map((p) => [p.id, p]));
  const seen = new Set();
  for (const p of neu.packages || []) {
    seen.add(p.id);
    const o = om.get(p.id);
    if (!o) { out.added.push(p.id); continue; }
    if (o.price !== p.price || o.gb !== p.gb || o.days !== p.days) {
      out.changed.push(`${p.id}: ${o.price}→${p.price} toman` + (o.gb !== p.gb ? `, gb ${o.gb}→${p.gb}` : '') + (o.days !== p.days ? `, days ${o.days}→${p.days}` : ''));
    }
  }
  for (const p of old.packages || []) if (!seen.has(p.id)) out.removed.push(p.id);
  return out;
}

/* ─── main ───────────────────────────────────────────────────────────── */

const opts = parseArgs(process.argv.slice(2));
const mode = opts.dryRun ? ' (dry-run)' : '';
let tmp = null;

try {
  /* [1/7] preflight */
  step(`[1/7] preflight${mode}`);
  const g = gitText(['--version'], { cwd: process.cwd(), timeoutMs: 10_000 });
  if (!g.ok) die(2, `git is not usable: ${g.text}`);
  const who = gitText(['config', '--get', 'user.email'], { cwd: process.cwd(), timeoutMs: 10_000 });
  if (!who.ok || !who.text) die(2, 'git identity missing — set it once: git config --global user.name "Your Name" && git config --global user.email "you@example.com"');
  ok(`git ready (${g.text.split('\n')[0]}) · identity ${who.text}`);

  /* MCI portal phone: pass update/my.mci.txt (next to this script, gitignored,
     absent from the temp clone) to the adapter via MCI_PHONE. The number is
     personal data — masked in the log, never in any committed file. */
  const phoneFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'my.mci.txt');
  if (process.env.MCI_PHONE && /\d/.test(process.env.MCI_PHONE)) {
    ok('MCI portal phone: MCI_PHONE env is set (value not printed)');
  } else if (existsSync(phoneFile)) {
    const num = readFileSync(phoneFile, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.replace(/#.*$/, '').trim())
      .find((l) => /^(?:\+98|0098|98|0)?9\d{9}$/.test(l.replace(/[\s-]/g, '')));
    if (num) {
      process.env.MCI_PHONE = num;
      ok(`MCI portal phone: loaded from update/my.mci.txt (masked: ${num.trim().slice(0, 4)}…${num.trim().slice(-2)})`);
    } else {
      warn('update/my.mci.txt exists but holds no 09xxxxxxxxx number — the my.mci.ir portal part will keep its previous capture');
    }
  } else {
    warn('no update/my.mci.txt next to this script and no MCI_PHONE env — the my.mci.ir portal part will keep its previous capture (shop/irancell/rightel still refresh)');
  }

  /* [2/7] clone */
  step(`[2/7] cloning ${opts.remote} (branch ${BRANCH}) into a temp dir`);
  tmp = mkdtempSync(path.join(tmpdir(), 'baste-yab-refresh-'));
  const cl = git(['clone', '--quiet', '--branch', BRANCH, opts.remote, tmp], { cwd: tmpdir(), timeoutMs: TIME.clone });
  if (cl.status !== 0) die(2, `clone failed:\n${(cl.stderr || cl.stdout || '').trim()}`);
  const head = gitText(['rev-parse', 'HEAD'], { cwd: tmp, timeoutMs: 10_000 });
  if (!head.ok) die(2, 'clone produced no HEAD?');
  const dirty = gitText(['status', '--porcelain'], { cwd: tmp, timeoutMs: 10_000 });
  if (!dirty.ok || dirty.text) die(2, 'fresh clone is not clean — remote is in a weird state, not touching it');
  ok(`cloned at ${head.text.slice(0, 9)} (clean tree)`);

  /* [3/7] run the live adapters */
  step(`[3/7] running live adapters (node update/fetch-providers.mjs${opts.only ? ` --only ${opts.only}` : ''})`);
  const fetchArgs = opts.only ? ['--only', opts.only] : [];
  const fr = runNode('update/fetch-providers.mjs', fetchArgs, tmp, TIME.fetch);
  if (fr.status !== 0) die(2, `fetch-providers crashed (this should not happen — it exits 0 even on adapter failure):\n${(fr.stderr || fr.stdout || '').trim()}`);
  for (const line of (fr.stdout || '').split('\n')) if (line.trim()) console.log(`      ${line}`);
  const failedAdapters = [...(fr.stdout || '').matchAll(/^✗ (\S+): (.+)$/gm)].map((m) => `${m[1]} (${m[2]})`);
  if (failedAdapters.length) warn(`adapters reported failure: ${failedAdapters.join('; ')}`);
  else ok('all adapters reported success');

  /* [4/7] audit the working tree — nothing but src/data/providers/*.json may move */
  step('[4/7] auditing changes vs HEAD');
  const st = gitRaw(['status', '--porcelain'], { cwd: tmp, timeoutMs: 10_000 });
  if (!st.ok) die(2, `git status failed: ${st.text}`);
  const changed = [];   // rel paths of modified data files
  const trouble = [];   // fatal audit complaints
  for (const line of st.text.split('\n')) {
    if (!line) continue;
    const x = line[0]; const y = line[1];
    let p = line.slice(3);
    if (p.startsWith('"')) p = JSON.parse(p); // quotepath safety
    if (p.startsWith(DATA_PREFIX)) {
      if (x === ' ' && (y === 'M')) {
        if (p.endsWith('.json')) changed.push(p);
        else trouble.push(`${p}: only .json files are expected under ${DATA_PREFIX}`);
      } else if (x === '?' && y === '?') trouble.push(`${p}: new file appeared — adapters never create files`);
      else if (y === 'D' || x === 'D') trouble.push(`${p}: file deleted — adapters never delete files`);
      else trouble.push(`${p}: unexpected git status "${x}${y}"`);
    } else if (x === '?' && y === '?') {
      trouble.push(`${p}: untracked file outside the data dir — the update step touched something unexpected`);
    } else {
      trouble.push(`${p}: modification outside src/data/providers — the update step touched code or docs`);
    }
  }
  if (trouble.length) {
    for (const t of trouble) bad(t);
    die(1, 'tree audit failed — the update moved things it must never move. Not pushing.');
  }
  if (changed.length === 0) {
    if (failedAdapters.length) {
      warn('nothing changed — unreachable adapters kept their existing captures (stale-keep).');
      ok('nothing to do. No commit, no push.');
    } else {
      ok('nothing to do — data already fresh. No commit, no push.');
    }
    process.exit(0);
  }
  ok(`${changed.length} data file(s) changed: ${changed.join(', ')}`);

  /* [5/7] validate each changed file */
  step('[5/7] validating changed files');
  const allIssues = [];
  const perFile = [];
  for (const rel of changed) {
    const oldRes = gitText(['show', `HEAD:${rel}`], { cwd: tmp, timeoutMs: 10_000 });
    if (!oldRes.ok) die(2, `git show HEAD:${rel} failed: ${oldRes.text}`);
    const newRaw = readFileSync(path.join(tmp, rel), 'utf8');
    const { issues, neu: parsed, old: parsedOld } = validateDataFile(rel, oldRes.text, newRaw);
    allIssues.push(...issues);
    perFile.push({ rel, parsed, parsedOld });
    for (const d of diffPackages(parsedOld, parsed).changed.slice(0, 6)) console.log(`      ${rel} ${d}`);
  }
  const fatal = allIssues.filter((i) => i.level === 'fatal');
  const guards = allIssues.filter((i) => i.level === 'guard');
  for (const i of fatal) bad(i.msg);
  for (const i of guards) warn(i.msg);
  if (fatal.length) die(1, 'hard validation failed — this data never gets pushed, not even with --force.');
  if (guards.length && !opts.force) {
    die(1, `soft guard(s) tripped (${guards.length}). Inspect the warnings above.\nIf the change is genuinely intended, rerun with --force.`);
  }
  if (guards.length && opts.force) warn('--force given: overriding the soft guard(s) above.');
  ok('validation passed.');

  /* [6/7] optional build, then commit */
  if (opts.withBuild) {
    step('[6/7] npm ci');
    const ci = npm(['ci', '--no-audit', '--no-fund'], tmp, TIME.npm);
    if (ci.status !== 0) die(2, `npm ci failed:\n${(ci.stderr || ci.stdout || '').trim().slice(-2000)}`);
    step('[6/7] npm run build');
    const bl = npm(['run', 'build'], tmp, TIME.build);
    if (bl.status !== 0) die(2, `build failed — not pushing:\n${(bl.stderr || bl.stdout || '').trim().slice(-2000)}`);
    ok('build green.');
  } else {
    step('[6/7] committing');
  }
  const addRes = git(['add', '--', DATA_PREFIX], { cwd: tmp, timeoutMs: 30_000 });
  if (addRes.status !== 0) die(2, `git add failed: ${(addRes.stderr || '').trim()}`);
  const body = perFile.map((f) => describeChange(f.rel, f.parsedOld, f.parsed)).join('\n');
  const cm = git(['commit', '--quiet', '-m', `data: refresh ${iso()}`, '-m', body], { cwd: tmp, timeoutMs: 30_000 });
  if (cm.status !== 0) die(2, `git commit failed: ${(cm.stderr || '').trim()}`);
  const sha = gitText(['rev-parse', 'HEAD'], { cwd: tmp, timeoutMs: 10_000 });
  ok(`committed ${sha.text.slice(0, 9)}: data: refresh ${iso()}`);
  for (const b of body.split('\n')) console.log(`      ${b}`);

  /* [7/7] push + verify */
  if (opts.dryRun) {
    say('[done]', `dry-run complete — would push ${sha.text.slice(0, 9)} to ${opts.remote} ${BRANCH}. Temp clone discarded.`);
    process.exit(0);
  }
  step(`[7/7] pushing to ${opts.remote} ${BRANCH}`);
  const pu = git(['push', 'origin', BRANCH], { cwd: tmp, timeoutMs: TIME.push });
  if (pu.status !== 0) {
    const t = (pu.stderr || pu.stdout || '').trim();
    if (/non-fast-forward|fetch first|rejected/.test(t)) {
      die(2, `push rejected — ${BRANCH} moved on ${opts.remote} since the clone (someone else pushed).\nJust rerun this script; it always starts from a fresh clone. Never force-push.`);
    }
    die(2, `push failed:\n${t}`);
  }
  const lr = gitText(['ls-remote', opts.remote, `refs/heads/${BRANCH}`], { cwd: tmp, timeoutMs: TIME.probe });
  if (!lr.ok || !lr.text.startsWith(sha.text)) {
    die(2, `push verification failed — remote ${BRANCH} does not point at ${sha.text.slice(0, 9)}.\nls-remote: ${lr.text || lr.ok ? lr.text : 'failed'}`);
  }
  ok(`pushed ${sha.text.slice(0, 9)} → ${opts.remote} ${BRANCH} (verified via ls-remote)`);
  say('[done]', `data: refresh ${iso()} is live on ${BRANCH}. GitHub Pages will redeploy it.`);
} catch (e) {
  bad(`unexpected error: ${e && e.stack ? e.stack : e}`);
  process.exitCode = 2;
} finally {
  if (tmp) {
    try { rmSync(tmp, { recursive: true, force: true }); }
    catch { warn(`could not delete temp dir ${tmp} — remove it manually later.`); }
  }
}
